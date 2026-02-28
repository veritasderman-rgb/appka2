import { createCombatUnit, isDefeated, simulateBK } from './combat';
import type { CombatUnit, SpellModifiers } from './combat';
import type { BattleConfig, BattleLogEntry, SimulationResult, Unit, UnitResult } from './types';
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

interface SingleBattleResult {
  winner: 'army_a' | 'army_b' | 'draw';
  bk_count: number;
  army_a_remaining: Map<string, number>;
  army_b_remaining: Map<string, number>;
  logs: BattleLogEntry[];
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
    const combat = createCombatUnit(u, aIsDefender);
    const enabledIds = getEnabledSpellIds(u);
    return {
      combat,
      spellState: enabledIds.length > 0 ? initSpellState(combat, enabledIds) : undefined,
      buffs: [],
      ccs: [],
    };
  });
  const armyB: CombatUnitWithSpells[] = unitsB.map(u => {
    const combat = createCombatUnit(u, bIsDefender);
    const enabledIds = getEnabledSpellIds(u);
    return {
      combat,
      spellState: enabledIds.length > 0 ? initSpellState(combat, enabledIds) : undefined,
      buffs: [],
      ccs: [],
    };
  });

  const allLogs: BattleLogEntry[] = [];
  let bk = 0;

  while (!isArmyDefeated(armyA) && !isArmyDefeated(armyB) && bk < config.maxBK) {
    bk++;

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

    // === MELEE PHASE ===
    const matchups = createMatchups(
      armyA.filter(u => !isDefeated(u.combat)),
      armyB.filter(u => !isDefeated(u.combat))
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
  }

  const aDefeated = isArmyDefeated(armyA);
  const bDefeated = isArmyDefeated(armyB);

  let winner: 'army_a' | 'army_b' | 'draw';
  if (aDefeated && bDefeated) winner = 'draw';
  else if (bDefeated) winner = 'army_a';
  else if (aDefeated) winner = 'army_b';
  else winner = 'draw';

  const army_a_remaining = new Map<string, number>();
  for (const u of armyA) {
    army_a_remaining.set(u.combat.unit.id, Math.max(0, u.combat.count));
  }
  const army_b_remaining = new Map<string, number>();
  for (const u of armyB) {
    army_b_remaining.set(u.combat.unit.id, Math.max(0, u.combat.count));
  }

  return { winner, bk_count: bk, army_a_remaining, army_b_remaining, logs: allLogs };
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

  for (const u of unitsA) {
    aRemaining.set(u.id, []);
  }
  for (const u of unitsB) {
    bRemaining.set(u.id, []);
  }

  for (const r of results) {
    wins[r.winner]++;
    totalBK += r.bk_count;
    bkDist[Math.min(r.bk_count, config.maxBK)]++;

    for (const [id, remaining] of r.army_a_remaining) {
      aRemaining.get(id)?.push(remaining);
    }
    for (const [id, remaining] of r.army_b_remaining) {
      bRemaining.get(id)?.push(remaining);
    }
  }

  const n = config.iterations;

  function buildUnitResults(units: Unit[], remaining: Map<string, number[]>): UnitResult[] {
    return units.map(u => {
      const counts = remaining.get(u.id) || [];
      const avg = counts.length > 0 ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
      const best = counts.length > 0 ? Math.max(...counts) : 0;
      const worst = counts.length > 0 ? Math.min(...counts) : 0;
      return {
        name: u.name,
        original: u.count,
        avg_remaining: Math.round(avg),
        avg_dead: u.count - Math.round(avg),
        best_remaining: best,
        worst_remaining: worst,
      };
    });
  }

  const aUnitResults = buildUnitResults(unitsA, aRemaining);
  const bUnitResults = buildUnitResults(unitsB, bRemaining);

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
  if (avgDuration <= 5) {
    keyFactors.push('Bitvy jsou rozhodovány rychle (do 5 BK).');
  } else if (avgDuration >= 15) {
    keyFactors.push('Bitvy jsou zdlouhavé a vyčerpávající (15+ BK).');
  }

  return {
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
  };
}
