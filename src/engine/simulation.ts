import { createCombatUnit, isDefeated, isRangedUnit, isFlyingUnit, isAerialRanged, isFlybyUnit, unitCanTargetFlying, simulateBK, simulateRangedAttack, simulateFlybyAttack } from './combat';
import type { CombatUnit, SpellModifiers } from './combat';
import type { ActiveEffectInfo, BattleConfig, BattleLogEntry, BKSnapshot, SimulationResult, Unit, UnitResult } from './types';
import { getSpellById } from '../data/spells';
import {
  type SpellCombatState,
  type SpellCastResult,
  type ActiveBuff,
  type ActiveCC,
  initSpellState,
  castSpellInBK,
  getBuffModifiers,
  getCCDisableFraction,
  getDebuffModifiers,
  tickBuffs,
  tickCCs,
} from './spellCombat';

interface UnitStats {
  morale_failures: number;
  morale_checks: number;
  critical_hits: number;
  critical_misses: number;
  spells_cast: number;
  spell_damage: number;
  spell_kills: number;
  spell_heals: number;
  /** targetName → total kills caused by spells on that target */
  spell_kills_by_target: Record<string, number>;
  /** spellName → times cast */
  spell_used: Record<string, number>;
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

interface SpellStats {
  spells_cast: number;
  spell_damage: number;
  spell_kills: number;
  spell_heals: number;
  spell_kills_by_target: Record<string, number>;
  spell_used: Record<string, number>;
}

/** Spell-aware wrapper for a combat unit */
interface CombatUnitWithSpells {
  combat: CombatUnit;
  spellState?: SpellCombatState;
  buffs: ActiveBuff[];
  ccs: ActiveCC[];
  spellStats: SpellStats;
}

/**
 * Check if unit A can engage unit B in melee.
 * Ground units cannot engage flying units unless they can target flying.
 */
function canMeleeEngage(a: CombatUnitWithSpells, b: CombatUnitWithSpells): boolean {
  // If target is flying and attacker can't reach flying → no engagement
  if (isFlyingUnit(b.combat) && !unitCanTargetFlying(a.combat.unit)) return false;
  if (isFlyingUnit(a.combat) && !unitCanTargetFlying(b.combat.unit)) return false;
  return true;
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
      // Check if these units can actually engage each other in melee
      if (!canMeleeEngage(unitA, sortedB[i])) continue;
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
      // Find a valid opponent that can engage
      const validA = sortedA.filter(u => u.combat.count > 0 && canMeleeEngage(u, sortedB[i]));
      if (validA.length > 0) {
        const strongestA = validA.reduce((best, u) =>
          u.combat.count > best.combat.count ? u : best, validA[0]);
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

/**
 * Apply spell cast result: damage to enemies, heals/buffs to appropriate allies.
 * Buff/heal target is determined by log.defender name (set in castSpellInBK).
 */
function applySpellResult(
  result: SpellCastResult,
  casterWrapper: CombatUnitWithSpells,
  targetWrapper: CombatUnitWithSpells,
  allyWrappers: CombatUnitWithSpells[],
): void {
  // Damage (from 'damage' or 'debuff' spells) → applied to enemy target
  if (result.kills > 0) {
    const actualKills = Math.min(result.kills, targetWrapper.combat.count);
    targetWrapper.combat.count -= actualKills;
    targetWrapper.combat.total_losses += actualKills;
  }

  // Heal → applied to the best ally (determined by log.defender name)
  if (result.soldiersRestored > 0) {
    const healTargetName = result.log.defender;
    const healTarget = allyWrappers.find(a => a.combat.unit.name === healTargetName) ?? casterWrapper;
    healTarget.combat.count += result.soldiersRestored;
    healTarget.combat.total_losses -= result.soldiersRestored;
  }

  // Buff → applied to the nearest ally (determined by log.defender name)
  if (result.buff) {
    const buffTargetName = result.log.defender;
    const buffTarget = allyWrappers.find(a => a.combat.unit.name === buffTargetName) ?? casterWrapper;
    buffTarget.buffs.push(result.buff);
  }

  // CC / Debuff → applied to enemy target
  if (result.cc) {
    targetWrapper.ccs.push(result.cc);
  }
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
      spellStats: { spells_cast: 0, spell_damage: 0, spell_kills: 0, spell_heals: 0, spell_kills_by_target: {}, spell_used: {} },
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
      spellStats: { spells_cast: 0, spell_damage: 0, spell_kills: 0, spell_heals: 0, spell_kills_by_target: {}, spell_used: {} },
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
    const allyCombatsA = aliveA.map(u => u.combat);
    for (const unitA of aliveA) {
      if (!unitA.spellState || aliveB.length === 0) continue;
      // Pick a random enemy target
      const target = aliveB[Math.floor(Math.random() * aliveB.length)];
      const result = castSpellInBK(unitA.combat, unitA.spellState, target.combat, bk, allyCombatsA);
      if (!result) continue;

      allLogs.push(result.log);
      applySpellResult(result, unitA, target, aliveA);
      unitA.spellStats.spells_cast++;
      unitA.spellStats.spell_damage += result.damageDealt;
      unitA.spellStats.spell_kills += result.kills;
      unitA.spellStats.spell_heals += result.soldiersRestored;
      if (result.kills > 0) {
        const tname = target.combat.unit.name;
        unitA.spellStats.spell_kills_by_target[tname] = (unitA.spellStats.spell_kills_by_target[tname] ?? 0) + result.kills;
      }
      const snameA = result.spell.name;
      unitA.spellStats.spell_used[snameA] = (unitA.spellStats.spell_used[snameA] ?? 0) + 1;
    }

    // Army B casters cast
    const allyCombatsB = aliveB.map(u => u.combat);
    for (const unitB of aliveB) {
      if (!unitB.spellState || aliveA.length === 0) continue;
      const target = aliveA[Math.floor(Math.random() * aliveA.length)];
      const result = castSpellInBK(unitB.combat, unitB.spellState, target.combat, bk, allyCombatsB);
      if (!result) continue;

      allLogs.push(result.log);
      applySpellResult(result, unitB, target, aliveB);
      unitB.spellStats.spells_cast++;
      unitB.spellStats.spell_damage += result.damageDealt;
      unitB.spellStats.spell_kills += result.kills;
      unitB.spellStats.spell_heals += result.soldiersRestored;
      if (result.kills > 0) {
        const tname = target.combat.unit.name;
        unitB.spellStats.spell_kills_by_target[tname] = (unitB.spellStats.spell_kills_by_target[tname] ?? 0) + result.kills;
      }
      const snameB = result.spell.name;
      unitB.spellStats.spell_used[snameB] = (unitB.spellStats.spell_used[snameB] ?? 0) + 1;
    }

    // === AERIAL RANGED PHASE (LL — Déšť střel, every BK) ===
    // LL units shoot from altitude every BK, not just BK 1-2
    {
      const aerialRangedA = armyA.filter(u => !isDefeated(u.combat) && isAerialRanged(u.combat));
      const aerialRangedB = armyB.filter(u => !isDefeated(u.combat) && isAerialRanged(u.combat));
      const aliveTargetsB = armyB.filter(u => !isDefeated(u.combat) && !isFlyingUnit(u.combat));
      const aliveTargetsA = armyA.filter(u => !isDefeated(u.combat) && !isFlyingUnit(u.combat));

      for (const shooter of aerialRangedA) {
        // Prefer ground targets, fall back to any alive enemy
        const targets = aliveTargetsB.length > 0 ? aliveTargetsB : armyB.filter(u => !isDefeated(u.combat));
        if (targets.length === 0) break;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const attacksPerBK = shooter.combat.unit.attacks_per_bk ?? 1;
        for (let shot = 0; shot < attacksPerBK; shot++) {
          if (target.combat.count <= 0) break;
          const result = simulateRangedAttack(shooter.combat, target.combat, bk, config);
          result.log.aerial = true;
          allLogs.push(result.log);
          target.combat.count -= result.kills;
          target.combat.total_losses += result.kills;
        }
        if (shooter.combat.ammo_remaining !== undefined) {
          shooter.combat.ammo_remaining = Math.max(0, shooter.combat.ammo_remaining - 1);
        }
      }

      for (const shooter of aerialRangedB) {
        const targets = aliveTargetsA.length > 0 ? aliveTargetsA : armyA.filter(u => !isDefeated(u.combat));
        if (targets.length === 0) break;
        const target = targets[Math.floor(Math.random() * targets.length)];
        const attacksPerBK = shooter.combat.unit.attacks_per_bk ?? 1;
        for (let shot = 0; shot < attacksPerBK; shot++) {
          if (target.combat.count <= 0) break;
          const result = simulateRangedAttack(shooter.combat, target.combat, bk, config);
          result.log.aerial = true;
          allLogs.push(result.log);
          target.combat.count -= result.kills;
          target.combat.total_losses += result.kills;
        }
        if (shooter.combat.ammo_remaining !== undefined) {
          shooter.combat.ammo_remaining = Math.max(0, shooter.combat.ammo_remaining - 1);
        }
      }
    }

    // === FLYBY PHASE (TL / dragons — Průlet/Nájezd) ===
    // Flyby units swoop in, strike once, no counterattack
    {
      const flybyA = armyA.filter(u => !isDefeated(u.combat) && isFlybyUnit(u.combat));
      const flybyB = armyB.filter(u => !isDefeated(u.combat) && isFlybyUnit(u.combat));

      for (const swooper of flybyA) {
        const targets = armyB.filter(u => !isDefeated(u.combat));
        if (targets.length === 0) break;
        // Prioritize low-morale or ranged targets
        const target = targets.sort((a, b) => {
          const aScore = (isRangedUnit(a.combat) ? -10 : 0) + a.combat.unit.morale;
          const bScore = (isRangedUnit(b.combat) ? -10 : 0) + b.combat.unit.morale;
          return aScore - bScore;
        })[0];

        const aMods: SpellModifiers = {
          acMod: getBuffModifiers(swooper.buffs).acMod + getDebuffModifiers(swooper.ccs).acPenalty,
          thac0Mod: getBuffModifiers(swooper.buffs).thac0Mod + getDebuffModifiers(swooper.ccs).thac0Penalty,
          disabledFraction: getCCDisableFraction(swooper.ccs),
        };
        const dMods: SpellModifiers = {
          acMod: getBuffModifiers(target.buffs).acMod + getDebuffModifiers(target.ccs).acPenalty,
          thac0Mod: 0, disabledFraction: 0,
        };

        const result = simulateFlybyAttack(swooper.combat, target.combat, bk, config, aMods, dMods);
        allLogs.push(result.log);
        target.combat.count -= result.kills;
        target.combat.total_losses += result.kills;
      }

      for (const swooper of flybyB) {
        const targets = armyA.filter(u => !isDefeated(u.combat));
        if (targets.length === 0) break;
        const target = targets.sort((a, b) => {
          const aScore = (isRangedUnit(a.combat) ? -10 : 0) + a.combat.unit.morale;
          const bScore = (isRangedUnit(b.combat) ? -10 : 0) + b.combat.unit.morale;
          return aScore - bScore;
        })[0];

        const aMods: SpellModifiers = {
          acMod: getBuffModifiers(swooper.buffs).acMod + getDebuffModifiers(swooper.ccs).acPenalty,
          thac0Mod: getBuffModifiers(swooper.buffs).thac0Mod + getDebuffModifiers(swooper.ccs).thac0Penalty,
          disabledFraction: getCCDisableFraction(swooper.ccs),
        };
        const dMods: SpellModifiers = {
          acMod: getBuffModifiers(target.buffs).acMod + getDebuffModifiers(target.ccs).acPenalty,
          thac0Mod: 0, disabledFraction: 0,
        };

        const result = simulateFlybyAttack(swooper.combat, target.combat, bk, config, aMods, dMods);
        allLogs.push(result.log);
        target.combat.count -= result.kills;
        target.combat.total_losses += result.kills;
      }
    }

    // === RANGED PHASE (BK 1 and 2 only) ===
    // Ground ranged units with ammo fire before melee engagement (excludes aerial ranged LL)
    if (bk <= 2) {
      const rangedA = armyA.filter(u => !isDefeated(u.combat) && isRangedUnit(u.combat) && !isAerialRanged(u.combat));
      const rangedB = armyB.filter(u => !isDefeated(u.combat) && isRangedUnit(u.combat) && !isAerialRanged(u.combat));
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
    // Exclude: ranged in BK 1-2, aerial ranged (LL — always shoots), flyby units (TL — own phase)
    const meleeFilter = (u: CombatUnitWithSpells) =>
      !isDefeated(u.combat) &&
      (bk > 2 || !isRangedUnit(u.combat)) &&
      !isAerialRanged(u.combat) &&
      !isFlybyUnit(u.combat);
    const matchups = createMatchups(
      armyA.filter(meleeFilter),
      armyB.filter(meleeFilter)
    );

    for (const [wA, wB] of matchups) {
      if (isDefeated(wA.combat) || isDefeated(wB.combat)) continue;

      // Compute spell modifiers for this matchup
      const aBuffs = getBuffModifiers(wA.buffs);
      const aDebuffs = getDebuffModifiers(wA.ccs);
      const bBuffs = getBuffModifiers(wB.buffs);
      const bDebuffs = getDebuffModifiers(wB.ccs);

      const aMods: SpellModifiers = {
        acMod: aBuffs.acMod + aDebuffs.acPenalty,
        thac0Mod: aBuffs.thac0Mod + aDebuffs.thac0Penalty,
        disabledFraction: getCCDisableFraction(wA.ccs),
      };
      const bMods: SpellModifiers = {
        acMod: bBuffs.acMod + bDebuffs.acPenalty,
        thac0Mod: bBuffs.thac0Mod + bDebuffs.thac0Penalty,
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

    // Capture snapshot for this BK (after tick, so remaining durations are post-tick)
    function buildActiveEffects(wrapper: CombatUnitWithSpells): ActiveEffectInfo[] {
      const effects: ActiveEffectInfo[] = [];
      for (const b of wrapper.buffs) {
        const spellDef = getSpellById(b.spellId);
        const name = spellDef?.name ?? b.spellId;
        const parts: string[] = [];
        if (b.acBonus) parts.push(`OČ ${b.acBonus}`);
        if (b.thac0Bonus) parts.push(`ÚT ${b.thac0Bonus}`);
        parts.push(`${Math.round(b.buffFraction * 100)}%`);
        effects.push({ spellName: name, type: 'buff', description: parts.join(', '), remainingBK: b.remainingBK });
      }
      for (const c of wrapper.ccs) {
        const spellDef = getSpellById(c.spellId);
        const name = spellDef?.name ?? c.spellId;
        if (c.disableFraction > 0) {
          effects.push({ spellName: name, type: 'cc', description: `${Math.round(c.disableFraction * 100)}% disabled`, remainingBK: c.remainingBK });
        }
        if (c.debuffThac0 || c.debuffAC) {
          const parts: string[] = [];
          if (c.debuffThac0) parts.push(`ÚT +${c.debuffThac0}`);
          if (c.debuffAC) parts.push(`OČ +${c.debuffAC}`);
          if (c.disableFraction === 0) {
            effects.push({ spellName: name, type: 'debuff', description: parts.join(', '), remainingBK: c.remainingBK });
          }
        }
      }
      return effects;
    }

    const unitStates = [
      ...armyA.map(u => ({
        name: u.combat.unit.name,
        side: 'army_a' as const,
        count_before: countsBefore.get(u.combat.unit.id) ?? u.combat.count,
        count_after: Math.max(0, u.combat.count),
        activeEffects: buildActiveEffects(u),
      })),
      ...armyB.map(u => ({
        name: u.combat.unit.name,
        side: 'army_b' as const,
        count_before: countsBefore.get(u.combat.unit.id) ?? u.combat.count,
        count_after: Math.max(0, u.combat.count),
        activeEffects: buildActiveEffects(u),
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
      ...u.spellStats,
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
      ...u.spellStats,
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
  const bkDist: number[] = (new Array(config.maxBK + 1) as number[]).fill(0);

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
      const avg_dead = u.count - Math.round(avg);
      const survival_percent = u.survival_percent ?? 0;
      const estimated_recovery = Math.round(avg_dead * (survival_percent / 100));
      const avg_spells_cast = stats.length > 0 ? stats.reduce((s, st) => s + st.spells_cast, 0) / stats.length : 0;
      const avg_spell_damage = stats.length > 0 ? stats.reduce((s, st) => s + st.spell_damage, 0) / stats.length : 0;
      const avg_spell_kills = stats.length > 0 ? stats.reduce((s, st) => s + st.spell_kills, 0) / stats.length : 0;
      const avg_spell_heals = stats.length > 0 ? stats.reduce((s, st) => s + st.spell_heals, 0) / stats.length : 0;

      return {
        name: u.name,
        original: u.count,
        avg_remaining: Math.round(avg),
        avg_dead,
        best_remaining: best,
        worst_remaining: worst,
        times_destroyed,
        destruction_rate: counts.length > 0 ? Math.round((times_destroyed / counts.length) * 100) : 0,
        avg_morale_failures: Math.round(avg_morale_failures * 10) / 10,
        avg_morale_checks: Math.round(avg_morale_checks * 10) / 10,
        morale_failure_rate: total_checks > 0 ? Math.round((total_failures / total_checks) * 100) : 0,
        avg_critical_hits: Math.round(avg_critical_hits * 10) / 10,
        avg_critical_misses: Math.round(avg_critical_misses * 10) / 10,
        survival_percent,
        estimated_recovery,
        avg_spells_cast: Math.round(avg_spells_cast * 10) / 10,
        avg_spell_damage: Math.round(avg_spell_damage),
        avg_spell_kills: Math.round(avg_spell_kills * 10) / 10,
        avg_spell_heals: Math.round(avg_spell_heals * 10) / 10,
      };
    });
  }

  const aUnitResults = buildUnitResults(unitsA, aRemaining, aUnitStats);
  const bUnitResults = buildUnitResults(unitsB, bRemaining, bUnitStats);

  const aTotalOriginal = unitsA.reduce((s, u) => s + u.count, 0);
  const bTotalOriginal = unitsB.reduce((s, u) => s + u.count, 0);
  const aTotalLosses = aUnitResults.reduce((s, r) => s + r.avg_dead, 0);
  const bTotalLosses = bUnitResults.reduce((s, r) => s + r.avg_dead, 0);

  const avgDuration = totalBK / n;
  const minBK = allBKs.length > 0 ? Math.min(...allBKs) : 0;
  const maxBK = allBKs.length > 0 ? Math.max(...allBKs) : 0;
  const varianceBK = allBKs.length > 0
    ? allBKs.reduce((s, v) => s + (v - avgDuration) ** 2, 0) / allBKs.length
    : 0;
  const stddevBK = Math.round(Math.sqrt(varianceBK) * 10) / 10;

  const keyFactors: string[] = [];

  // Overall outcome
  const aWinPct = Math.round((wins.army_a / n) * 100);
  const bWinPct = Math.round((wins.army_b / n) * 100);
  if (aWinPct >= 80) keyFactors.push(`Spojenci dominují — vítězí v ${aWinPct}% simulací. Výsledek bitvy je prakticky jistý.`);
  else if (bWinPct >= 80) keyFactors.push(`Nepřátelé dominují — vítězí v ${bWinPct}% simulací. Výsledek bitvy je prakticky jistý.`);
  else if (aWinPct > bWinPct) keyFactors.push(`Spojenci mají navrch (${aWinPct}% výher), ale výsledek není jistý.`);
  else if (bWinPct > aWinPct) keyFactors.push(`Nepřátelé mají navrch (${bWinPct}% výher), ale výsledek není jistý.`);
  else keyFactors.push(`Bitva je vyrovnaná — každá strana má podobnou šanci na vítězství.`);

  // Most casualties unit
  const sortedByImpact = [...aUnitResults, ...bUnitResults]
    .sort((a, b) => b.avg_dead - a.avg_dead);
  if (sortedByImpact.length > 0 && sortedByImpact[0].avg_dead > 0) {
    const u = sortedByImpact[0];
    keyFactors.push(`Největší ztráty: "${u.name}" průměrně ztrácí ${u.avg_dead} vojáků (${Math.round(u.avg_dead / u.original * 100)}% původní síly).`);
  }

  // Units with high destruction rate
  const fragileUnits = [...aUnitResults, ...bUnitResults].filter(u => u.destruction_rate >= 50);
  if (fragileUnits.length > 0) {
    const names = fragileUnits.map(u => `"${u.name}" (${u.destruction_rate}%)`).join(', ');
    keyFactors.push(`Jednotky s vysokou šancí zničení: ${names}.`);
  }

  // Morale issues
  const moraleProblems = [...aUnitResults, ...bUnitResults].filter(u => u.morale_failure_rate >= 40 && u.avg_morale_checks > 0);
  if (moraleProblems.length > 0) {
    const worst = moraleProblems.sort((a, b) => b.morale_failure_rate - a.morale_failure_rate)[0];
    keyFactors.push(`Morální problém: "${worst.name}" selhává v ${worst.morale_failure_rate}% hodů morálky — hrozí útěk.`);
  }

  // Battle duration
  if (avgDuration <= 3) {
    keyFactors.push(`Velmi rychlá bitva (průměr ${Math.round(avgDuration * 10) / 10} BK) — jeden úder rozhodne.`);
  } else if (avgDuration <= 6) {
    keyFactors.push(`Krátká bitva (průměr ${Math.round(avgDuration * 10) / 10} BK) — rychlé rozhodnutí.`);
  } else if (avgDuration >= 20) {
    keyFactors.push(`Vyčerpávající bitva (průměr ${Math.round(avgDuration * 10) / 10} BK) — únava může být rozhodující.`);
  }

  // High variance in duration
  if (stddevBK >= 5 && n >= 10) {
    keyFactors.push(`Velká variabilita délky bitev (±${stddevBK} BK) — výsledek závisí na náhodě.`);
  }

  // Aerial superiority analysis
  const aFlying = unitsA.filter(u => u.flying);
  const bFlying = unitsB.filter(u => u.flying);
  const aAntiAir = unitsA.filter(u => unitCanTargetFlying(u) && !u.flying);
  const bAntiAir = unitsB.filter(u => unitCanTargetFlying(u) && !u.flying);

  if (aFlying.length > 0 || bFlying.length > 0) {
    if (aFlying.length > 0 && bFlying.length === 0) {
      if (bAntiAir.length === 0) {
        keyFactors.push(`Spojenci mají vzdušnou nadvládu — nepřátelé nemají jednotky schopné zasáhnout letky.`);
      } else {
        keyFactors.push(`Spojenci mají ${aFlying.length} leteck${aFlying.length === 1 ? 'ou jednotku' : 'é jednotky'}, nepřátelé se brání ${bAntiAir.length} střeleck${bAntiAir.length === 1 ? 'ou' : 'ými'} jednotk${bAntiAir.length === 1 ? 'ou' : 'ami'}.`);
      }
    } else if (bFlying.length > 0 && aFlying.length === 0) {
      if (aAntiAir.length === 0) {
        keyFactors.push(`Nepřátelé mají vzdušnou nadvládu — Spojenci nemají jednotky schopné zasáhnout letky.`);
      } else {
        keyFactors.push(`Nepřátelé mají ${bFlying.length} leteck${bFlying.length === 1 ? 'ou jednotku' : 'é jednotky'}, Spojenci se brání ${aAntiAir.length} střeleck${aAntiAir.length === 1 ? 'ou' : 'ými'} jednotk${aAntiAir.length === 1 ? 'ou' : 'ami'}.`);
      }
    } else {
      keyFactors.push(`Vzdušný souboj: Spojenci ${aFlying.length} vs Nepřátelé ${bFlying.length} leteckých jednotek.`);
    }
  }

  // === MAGIC FACTORS ===
  function avgRecord(unitId: string, statsMap: Map<string, UnitStats[]>, field: 'spell_kills_by_target' | 'spell_used'): Record<string, number> {
    const stats = statsMap.get(unitId) ?? [];
    if (stats.length === 0) return {};
    const agg: Record<string, number> = {};
    for (const s of stats) {
      for (const [k, v] of Object.entries(s[field])) {
        agg[k] = (agg[k] ?? 0) + v;
      }
    }
    const runs = stats.length;
    return Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, Math.round(v / runs * 10) / 10]));
  }

  const addMagicKeyFactors = (
    units: Unit[],
    unitResults: UnitResult[],
    statsMap: Map<string, UnitStats[]>,
    sideName: string,
    enemyTotalDead: number,
  ) => {
    for (const u of units) {
      const ur = unitResults.find(r => r.name === u.name);
      if (!ur || ur.avg_spells_cast === 0) continue;

      const killsByTarget = avgRecord(u.id, statsMap, 'spell_kills_by_target');
      const spellUsed    = avgRecord(u.id, statsMap, 'spell_used');

      const topTarget = Object.entries(killsByTarget).sort((a, b) => b[1] - a[1])[0];
      const topSpells = Object.entries(spellUsed).sort((a, b) => b[1] - a[1]).slice(0, 2);

      const parts: string[] = [];

      if (topSpells.length > 0) {
        const list = topSpells.map(([name, avg]) => `„${name}" (${avg}×)`).join(', ');
        parts.push(`kouzla: ${list}`);
      }
      if (ur.avg_spell_kills > 0 && topTarget) {
        parts.push(`zničí průměrně ${ur.avg_spell_kills} vojáků, nejvíce z „${topTarget[0]}" (${topTarget[1]})`);
      } else if (ur.avg_spell_damage > 0 && ur.avg_spell_kills === 0) {
        parts.push(`způsobí ${ur.avg_spell_damage} HP poškození (bez přímých obětí)`);
      }
      if (ur.avg_spell_heals > 0) {
        parts.push(`léčí průměrně ${ur.avg_spell_heals} vojáků`);
      }

      if (parts.length > 0) {
        keyFactors.push(`🔮 [${sideName}] „${u.name}" — ${parts.join('; ')}.`);
      }
    }

    // Overall magic share of enemy casualties
    const magicKills = unitResults.filter(ur => ur.avg_spells_cast > 0).reduce((s, ur) => s + ur.avg_spell_kills, 0);
    if (magicKills > 0 && enemyTotalDead > 0) {
      const pct = Math.round(magicKills / enemyTotalDead * 100);
      if (pct >= 25) {
        keyFactors.push(`🔮 Magie ${sideName} tvoří ${pct}% nepřátelských ztrát — kouzla jsou klíčová pro výsledek.`);
      }
    }
  };

  const hasMagicA = aUnitResults.some(ur => ur.avg_spells_cast > 0);
  const hasMagicB = bUnitResults.some(ur => ur.avg_spells_cast > 0);
  if (hasMagicA) addMagicKeyFactors(unitsA, aUnitResults, aUnitStats, 'Spojenci', bTotalLosses);
  if (hasMagicB) addMagicKeyFactors(unitsB, bUnitResults, bUnitStats, 'Nepřátelé', aTotalLosses);

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
