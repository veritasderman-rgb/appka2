import { createCombatUnit, isDefeated, isRangedUnit, simulateBK, simulateRangedAttack } from './combat';
import type { CombatUnit, SpellModifiers } from './combat';
import type { BattleConfig, BattleLogEntry, BKSnapshot, SimulationResult, Unit, UnitResult } from './types';
import {
  type SpellCombatState,
  type ActiveBuff,
  type ActiveCC,
  initSpellState,
  castSpellInBK,
  getBuffModifiers,
  getCCDisableFraction,
  tickBuffs,
  tickCCs,
} from './spellCombat';

interface UnitStats {
  morale_failures: number;
  morale_checks: number;
  critical_hits: number;
  critical_misses: number;
}

interface SingleBattleResult {
  winner: 'army_a' | 'army_b' | 'draw';
  bk_count: number;
  army_a_remaining: Map<string, number>;
  army_b_remaining: Map<string, number>;
  army_a_stats: Map<string, UnitStats>;
  army_b_stats: Map<string, UnitStats>;
  logs: BattleLogEntry[];
  snapshots: BKSnapshot[];
}

/** Spell-aware wrapper for a combat unit */
interface CombatUnitWithSpells {
  combat: CombatUnit;
  spellState?: SpellCombatState;
  buffs: ActiveBuff[];
  ccs: ActiveCC[];
}

/** Create matchups between armies based on movement priority */
function createMatchups(
  armyA: CombatUnitWithSpells[],
  armyB: CombatUnitWithSpells[]
): [CombatUnitWithSpells, CombatUnitWithSpells][] {
  const pairs: [CombatUnitWithSpells, CombatUnitWithSpells][] = [];

  const sortedA = [...armyA].sort((a, b) => a.combat.unit.movement_priority - b.combat.unit.movement_priority);
  const sortedB = [...armyB].sort((a, b) => a.combat.unit.movement_priority - b.combat.unit.movement_priority);

  const usedB = new Set<number>();

  for (const unitA of sortedA) {
    let bestIdx = -1;
    let bestPriority = Infinity;

    for (let i = 0; i < sortedB.length; i++) {
      if (usedB.has(i)) continue;
      if (sortedB[i].combat.count <= 0) continue;
      const diff = Math.abs(unitA.combat.unit.movement_priority - sortedB[i].combat.unit.movement_priority);
      if (diff < bestPriority) {
        bestPriority = diff;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      pairs.push([unitA, sortedB[bestIdx]]);
      usedB.add(bestIdx);
    }
  }

  for (let i = 0; i < sortedB.length; i++) {
    if (!usedB.has(i) && sortedB[i].combat.count > 0) {
      const strongestA = sortedA.reduce((best, u) =>
        u.combat.count > best.combat.count ? u : best, sortedA[0]);
      if (strongestA.combat.count > 0) {
        pairs.push([strongestA, sortedB[i]]);
      }
    }
  }

  return pairs;
}

function isArmyDefeated(army: CombatUnitWithSpells[]): boolean {
  return army.every(u => isDefeated(u.combat));
}


/** Extract enabled spell IDs from a unit (uses ArmyUnit.spells if available) */
function getEnabledSpellIds(unit: Unit): string[] {
  // The unit may have a 'spells' field from ArmyUnit
  const armyUnit = unit as Unit & { spells?: Array<{ spellId: string; enabled: boolean }> };
  if (!armyUnit.spells) return [];
  return armyUnit.spells.filter(s => s.enabled).map(s => s.spellId);
}

function simulateSingleBattle(
  unitsA: Unit[],
  unitsB: Unit[],
  config: BattleConfig
): SingleBattleResult {
  const aIsDefender = config.attackerSide !== 'army_a';
  const bIsDefender = config.attackerSide !== 'army_b';

  const armyA: CombatUnitWithSpells[] = unitsA.map(u => {
    const combat = createCombatUnit(u, aIsDefender, config.commanderBonuses);
    const enabledIds = getEnabledSpellIds(u);
    return {
      combat,
      spellState: enabledIds.length > 0 ? initSpellState(combat, enabledIds) : undefined,
      buffs: [],
      ccs: [],
    };
  });
  const armyB: CombatUnitWithSpells[] = unitsB.map(u => {
    const combat = createCombatUnit(u, bIsDefender, config.commanderBonuses);
    const enabledIds = getEnabledSpellIds(u);
    return {
      combat,
      spellState: enabledIds.length > 0 ? initSpellState(combat, enabledIds) : undefined,
      buffs: [],
      ccs: [],
    };
  });

  const allLogs: BattleLogEntry[] = [];
  const snapshots: BKSnapshot[] = [];
  let bk = 0;

  while (!isArmyDefeated(armyA) && !isArmyDefeated(armyB) && bk < config.maxBK) {
    bk++;

    // Capture unit counts before this BK
    const countsBefore = new Map<string, number>();
    for (const u of armyA) countsBefore.set(u.combat.unit.id, u.combat.count);
    for (const u of armyB) countsBefore.set(u.combat.unit.id, u.combat.count);
    const bkLogsStart = allLogs.length;

    // === SPELL PHASE ===
    // Each magical unit casts one spell targeting a random alive enemy unit
    const aliveA = armyA.filter(u => !isDefeated(u.combat));
    const aliveB = armyB.filter(u => !isDefeated(u.combat));

    // Army A casters cast
    for (const unitA of aliveA) {
      if (!unitA.spellState || aliveB.length === 0) continue;
      // Pick a random enemy target
      const target = aliveB[Math.floor(Math.random() * aliveB.length)];
      const result = castSpellInBK(unitA.combat, unitA.spellState, target.combat, bk);
      if (!result) continue;

      allLogs.push(result.log);

      // Apply spell effects
      if (result.kills > 0) {
        const actualKills = Math.min(result.kills, target.combat.count);
        target.combat.count -= actualKills;
        target.combat.total_losses += actualKills;
      }
      if (result.soldiersRestored > 0) {
        unitA.combat.count += result.soldiersRestored;
        unitA.combat.total_losses -= result.soldiersRestored;
      }
      if (result.buff) {
        unitA.buffs.push(result.buff);
      }
      if (result.cc) {
        target.ccs.push(result.cc);
      }
    }

    // Army B casters cast
    for (const unitB of aliveB) {
      if (!unitB.spellState || aliveA.length === 0) continue;
      const target = aliveA[Math.floor(Math.random() * aliveA.length)];
      const result = castSpellInBK(unitB.combat, unitB.spellState, target.combat, bk);
      if (!result) continue;

      allLogs.push(result.log);

      if (result.kills > 0) {
        const actualKills = Math.min(result.kills, target.combat.count);
        target.combat.count -= actualKills;
        target.combat.total_losses += actualKills;
      }
      if (result.soldiersRestored > 0) {
        unitB.combat.count += result.soldiersRestored;
        unitB.combat.total_losses -= result.soldiersRestored;
      }
      if (result.buff) {
        unitB.buffs.push(result.buff);
      }
      if (result.cc) {
        target.ccs.push(result.cc);
      }
    }

    // === RANGED PHASE (BK 1 and 2 only) ===
    // Ranged units with ammo fire before melee engagement
    if (bk <= 2) {
      const rangedA = armyA.filter(u => !isDefeated(u.combat) && isRangedUnit(u.combat));
      const rangedB = armyB.filter(u => !isDefeated(u.combat) && isRangedUnit(u.combat));
      const aliveMeleeB = armyB.filter(u => !isDefeated(u.combat));
      const aliveMeleeA = armyA.filter(u => !isDefeated(u.combat));

      for (const shooter of rangedA) {
        if (aliveMeleeB.length === 0) break;
        const target = aliveMeleeB[Math.floor(Math.random() * aliveMeleeB.length)];
        const attacksPerBK = shooter.combat.unit.attacks_per_bk ?? 1;
        for (let shot = 0; shot < attacksPerBK; shot++) {
          if (target.combat.count <= 0) break;
          const result = simulateRangedAttack(shooter.combat, target.combat, bk, config);
          allLogs.push(result.log);
          target.combat.count -= result.kills;
          target.combat.total_losses += result.kills;
        }
        if (shooter.combat.ammo_remaining !== undefined) {
          shooter.combat.ammo_remaining = Math.max(0, shooter.combat.ammo_remaining - 1);
        }
      }

      for (const shooter of rangedB) {
        if (aliveMeleeA.length === 0) break;
        const target = aliveMeleeA[Math.floor(Math.random() * aliveMeleeA.length)];
        const attacksPerBK = shooter.combat.unit.attacks_per_bk ?? 1;
        for (let shot = 0; shot < attacksPerBK; shot++) {
          if (target.combat.count <= 0) break;
          const result = simulateRangedAttack(shooter.combat, target.combat, bk, config);
          allLogs.push(result.log);
          target.combat.count -= result.kills;
          target.combat.total_losses += result.kills;
        }
        if (shooter.combat.ammo_remaining !== undefined) {
          shooter.combat.ammo_remaining = Math.max(0, shooter.combat.ammo_remaining - 1);
        }
      }
    }

    // === MELEE PHASE ===
    // In BK 1-2, ranged units are busy in the ranged phase — exclude them from melee
    const meleeFilter = (u: CombatUnitWithSpells) =>
      !isDefeated(u.combat) && (bk > 2 || !isRangedUnit(u.combat));

    const matchups = createMatchups(
      armyA.filter(meleeFilter),
      armyB.filter(meleeFilter)
    );

    for (const [wA, wB] of matchups) {
      if (isDefeated(wA.combat) || isDefeated(wB.combat)) continue;

      // Compute spell modifiers for this matchup
      const aMods: SpellModifiers = {
        ...getBuffModifiers(wA.buffs),
        disabledFraction: getCCDisableFraction(wA.ccs),
      };
      const bMods: SpellModifiers = {
        ...getBuffModifiers(wB.buffs),
        disabledFraction: getCCDisableFraction(wB.ccs),
      };

      const result = simulateBK(wA.combat, wB.combat, bk, config, aMods, bMods);
      allLogs.push(...result.logs);
    }

    // === TICK BUFFS/CCS ===
    for (const u of [...armyA, ...armyB]) {
      u.buffs = tickBuffs(u.buffs);
      u.ccs = tickCCs(u.ccs);
    }

    // Capture snapshot for this BK
    const unitStates = [
      ...armyA.map(u => ({
        name: u.combat.unit.name,
        side: 'army_a' as const,
        count_before: countsBefore.get(u.combat.unit.id) ?? u.combat.count,
        count_after: Math.max(0, u.combat.count),
      })),
      ...armyB.map(u => ({
        name: u.combat.unit.name,
        side: 'army_b' as const,
        count_before: countsBefore.get(u.combat.unit.id) ?? u.combat.count,
        count_after: Math.max(0, u.combat.count),
      })),
    ];
    snapshots.push({ bk, events: allLogs.slice(bkLogsStart), unit_states: unitStates });
  }

  const aDefeated = isArmyDefeated(armyA);
  const bDefeated = isArmyDefeated(armyB);

  let winner: 'army_a' | 'army_b' | 'draw';
  if (aDefeated && bDefeated) winner = 'draw';
  else if (bDefeated) winner = 'army_a';
  else if (aDefeated) winner = 'army_b';
  else winner = 'draw';

  const army_a_remaining = new Map<string, number>();
  const army_a_stats = new Map<string, UnitStats>();
  for (const u of armyA) {
    army_a_remaining.set(u.combat.unit.id, Math.max(0, u.combat.count));
    army_a_stats.set(u.combat.unit.id, {
      morale_failures: u.combat.morale_failures,
      morale_checks: u.combat.morale_checks,
      critical_hits: u.combat.critical_hits,
      critical_misses: u.combat.critical_misses,
    });
  }
  const army_b_remaining = new Map<string, number>();
  const army_b_stats = new Map<string, UnitStats>();
  for (const u of armyB) {
    army_b_remaining.set(u.combat.unit.id, Math.max(0, u.combat.count));
    army_b_stats.set(u.combat.unit.id, {
      morale_failures: u.combat.morale_failures,
      morale_checks: u.combat.morale_checks,
      critical_hits: u.combat.critical_hits,
      critical_misses: u.combat.critical_misses,
    });
  }

  return { winner, bk_count: bk, army_a_remaining, army_b_remaining, army_a_stats, army_b_stats, logs: allLogs, snapshots };
}

export function runSimulation(
  unitsA: Unit[],
  unitsB: Unit[],
  config: BattleConfig,
  onProgress?: (percent: number) => void
): SimulationResult {
  const results: SingleBattleResult[] = [];

  for (let i = 0; i < config.iterations; i++) {
    results.push(simulateSingleBattle(unitsA, unitsB, config));
    if (onProgress && i % 10 === 0) {
      onProgress(Math.round((i / config.iterations) * 100));
    }
  }
  if (onProgress) onProgress(100);

  // Aggregate
  const wins = { army_a: 0, army_b: 0, draw: 0 };
  let totalBK = 0;
  const bkDist: number[] = new Array(config.maxBK + 1).fill(0);

  const aRemaining: Map<string, number[]> = new Map();
  const bRemaining: Map<string, number[]> = new Map();
  const aUnitStats: Map<string, UnitStats[]> = new Map();
  const bUnitStats: Map<string, UnitStats[]> = new Map();
  const allBKs: number[] = [];

  for (const u of unitsA) {
    aRemaining.set(u.id, []);
    aUnitStats.set(u.id, []);
  }
  for (const u of unitsB) {
    bRemaining.set(u.id, []);
    bUnitStats.set(u.id, []);
  }

  for (const r of results) {
    wins[r.winner]++;
    totalBK += r.bk_count;
    allBKs.push(r.bk_count);
    bkDist[Math.min(r.bk_count, config.maxBK)]++;

    for (const [id, remaining] of r.army_a_remaining) {
      aRemaining.get(id)?.push(remaining);
    }
    for (const [id, remaining] of r.army_b_remaining) {
      bRemaining.get(id)?.push(remaining);
    }
    for (const [id, stats] of r.army_a_stats) {
      aUnitStats.get(id)?.push(stats);
    }
    for (const [id, stats] of r.army_b_stats) {
      bUnitStats.get(id)?.push(stats);
    }
  }

  const n = config.iterations;

  function buildUnitResults(units: Unit[], remaining: Map<string, number[]>, unitStats: Map<string, UnitStats[]>): UnitResult[] {
    return units.map(u => {
      const counts = remaining.get(u.id) || [];
      const stats = unitStats.get(u.id) || [];
      const avg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
      const best = counts.length > 0 ? Math.max(...counts) : 0;
      const worst = counts.length > 0 ? Math.min(...counts) : 0;
      const times_destroyed = counts.filter(c => c === 0).length;
      const avg_morale_failures = stats.length > 0 ? stats.reduce((s, st) => s + st.morale_failures, 0) / stats.length : 0;
      const avg_morale_checks = stats.length > 0 ? stats.reduce((s, st) => s + st.morale_checks, 0) / stats.length : 0;
      const total_checks = stats.reduce((s, st) => s + st.morale_checks, 0);
      const total_failures = stats.reduce((s, st) => s + st.morale_failures, 0);
      const avg_critical_hits = stats.length > 0 ? stats.reduce((s, st) => s + st.critical_hits, 0) / stats.length : 0;
      const avg_critical_misses = stats.length > 0 ? stats.reduce((s, st) => s + st.critical_misses, 0) / stats.length : 0;
      return {
        name: u.name,
        original: u.count,
        avg_remaining: Math.round(avg),
        avg_dead: u.count - Math.round(avg),
        best_remaining: best,
        worst_remaining: worst,
        times_destroyed,
        destruction_rate: counts.length > 0 ? Math.round((times_destroyed / counts.length) * 100) : 0,
        avg_morale_failures: Math.round(avg_morale_failures * 10) / 10,
        avg_morale_checks: Math.round(avg_morale_checks * 10) / 10,
        morale_failure_rate: total_checks > 0 ? Math.round((total_failures / total_checks) * 100) : 0,
        avg_critical_hits: Math.round(avg_critical_hits * 10) / 10,
        avg_critical_misses: Math.round(avg_critical_misses * 10) / 10,
      };
    });
  }

  const aUnitResults = buildUnitResults(unitsA, aRemaining, aUnitStats);
  const bUnitResults = buildUnitResults(unitsB, bRemaining, bUnitStats);

  const aTotalOriginal = unitsA.reduce((s, u) => s + u.count, 0);
  const bTotalOriginal = unitsB.reduce((s, u) => s + u.count, 0);
  const aTotalLosses = aUnitResults.reduce((s, r) => s + r.avg_dead, 0);
  const bTotalLosses = bUnitResults.reduce((s, r) => s + r.avg_dead, 0);

  const keyFactors: string[] = [];
  if (wins.army_a > wins.army_b * 2) {
    keyFactors.push('Spojenci mají výraznou převahu v simulacích.');
  }
  if (wins.army_b > wins.army_a * 2) {
    keyFactors.push('Nepřátelé mají výraznou převahu v simulacích.');
  }

  const sortedByImpact = [...aUnitResults, ...bUnitResults]
    .sort((a, b) => (b.original - b.avg_remaining) - (a.original - a.avg_remaining));
  if (sortedByImpact.length > 0) {
    keyFactors.push(`Nejvíce ztrát utrpěla jednotka "${sortedByImpact[0].name}" (průměrně ${sortedByImpact[0].avg_dead} mrtvých).`);
  }

  const avgDuration = totalBK / n;
  const minBK = allBKs.length > 0 ? Math.min(...allBKs) : 0;
  const maxBK = allBKs.length > 0 ? Math.max(...allBKs) : 0;
  const varianceBK = allBKs.length > 0
    ? allBKs.reduce((s, v) => s + (v - avgDuration) ** 2, 0) / allBKs.length
    : 0;
  const stddevBK = Math.round(Math.sqrt(varianceBK) * 10) / 10;

  if (avgDuration <= 5) {
    keyFactors.push('Bitvy jsou rozhodovány rychle (do 5 BK).');
  } else if (avgDuration >= 15) {
    keyFactors.push('Bitvy jsou zdlouhavé a vyčerpávající (15+ BK).');
  }

  const simulationResult: SimulationResult = {
    total_simulations: n,
    wins,
    probability: {
      army_a_win: Math.round((wins.army_a / n) * 100),
      army_b_win: Math.round((wins.army_b / n) * 100),
      draw: Math.round((wins.draw / n) * 100),
    },
    avg_duration_bk: Math.round(avgDuration * 10) / 10,
    avg_losses: {
      army_a: {
        total_soldiers: aTotalLosses,
        percent: aTotalOriginal > 0 ? Math.round((aTotalLosses / aTotalOriginal) * 100) : 0,
        by_unit: aUnitResults,
      },
      army_b: {
        total_soldiers: bTotalLosses,
        percent: bTotalOriginal > 0 ? Math.round((bTotalLosses / bTotalOriginal) * 100) : 0,
        by_unit: bUnitResults,
      },
    },
    bk_distribution: bkDist,
    key_factors: keyFactors,
    min_duration_bk: minBK,
    max_duration_bk: maxBK,
    stddev_duration_bk: stddevBK,
  };

  if (n === 1 && results.length === 1) {
    simulationResult.detailed_log = {
      winner: results[0].winner,
      bk_count: results[0].bk_count,
      snapshots: results[0].snapshots,
    };
  }

  return simulationResult;
}
