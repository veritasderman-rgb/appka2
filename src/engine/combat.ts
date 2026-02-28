import { d20, rollDamage, rollDie } from './dice';
import type { BattleConfig, BattleLogEntry, Terrain, Unit } from './types';
import { TERRAIN_MODIFIERS } from './types';

export interface CombatUnit {
  unit: Unit;
  count: number;
  fatigue_remaining: number;
  morale_failures: number;
  morale_checks: number;
  total_losses: number;
  fatigue_state: 'fresh' | 'tired' | 'exhausted' | 'collapsed';
  critical_hits: number;
  critical_misses: number;
  /** true if this unit belongs to the defending army (gets terrain bonuses) */
  isBattleDefender: boolean;
}

export function createCombatUnit(unit: Unit, isBattleDefender: boolean = false): CombatUnit {
  return {
    unit: { ...unit, max_count: Math.max(unit.count, unit.max_count) },
    count: unit.count,
    fatigue_remaining: unit.fatigue,
    morale_failures: 0,
    morale_checks: 0,
    total_losses: 0,
    fatigue_state: 'fresh',
    critical_hits: 0,
    critical_misses: 0,
    isBattleDefender,
  };
}

function getFatiguePenalty(state: CombatUnit['fatigue_state']): number {
  switch (state) {
    case 'fresh': return 0;
    case 'tired': return 2;
    case 'exhausted': return 5;
    case 'collapsed': return 10;
  }
}

function getEffectiveCount(unit: CombatUnit, bk: number, largeBattle: boolean): number {
  if (unit.count <= 0) return 0;

  if (bk === 1) {
    // First attack in first BK: max 100 soldiers engage per side
    return Math.min(unit.count, 100);
  }

  if (largeBattle && unit.unit.max_count > 10000) {
    // Large battle gradual engagement
    if (bk === 2) return Math.min(unit.count, Math.floor(unit.unit.max_count * 0.25));
    if (bk === 3) return Math.min(unit.count, Math.floor(unit.unit.max_count * 0.5));
    if (bk === 4) return Math.min(unit.count, Math.floor(unit.unit.max_count * 0.75));
  } else if (bk === 2) {
    // Standard: 50% engagement in BK 2's second attack
    return Math.min(unit.count, Math.floor(unit.unit.max_count * 0.5));
  }

  return unit.count;
}

function getTerrainACBonus(terrain: Terrain, isDefender: boolean): number {
  if (isDefender) return TERRAIN_MODIFIERS[terrain].ac_bonus;
  return 0;
}

function getTerrainTHAC0Penalty(terrain: Terrain): number {
  return TERRAIN_MODIFIERS[terrain].thac0_penalty;
}

export interface ClashResult {
  logs: BattleLogEntry[];
  attackerLosses: number;
  defenderLosses: number;
}

/**
 * Simulate one BK (battle round = 10 combat rounds) between two units.
 * Each side attacks once (or twice based on initiative).
 */
/** External modifiers from spells (buffs/CC) applied during a BK */
export interface SpellModifiers {
  /** AC modifier for this unit (negative = better defense) */
  acMod: number;
  /** THAC0 modifier for this unit (negative = better attack) */
  thac0Mod: number;
  /** Fraction of unit disabled by enemy CC (0-1) */
  disabledFraction: number;
}

const NO_MODS: SpellModifiers = { acMod: 0, thac0Mod: 0, disabledFraction: 0 };

export function simulateBK(
  attacker: CombatUnit,
  defender: CombatUnit,
  bk: number,
  config: BattleConfig,
  attackerMods: SpellModifiers = NO_MODS,
  defenderMods: SpellModifiers = NO_MODS,
): ClashResult {
  const logs: BattleLogEntry[] = [];
  let attackerLosses = 0;
  let defenderLosses = 0;

  if (attacker.count <= 0 || defender.count <= 0) {
    return { logs, attackerLosses, defenderLosses };
  }

  // Initiative roll
  const iniA = d20() + attacker.unit.initiative;
  const iniB = d20() + defender.unit.initiative;

  const first = iniA >= iniB ? attacker : defender;
  const second = iniA >= iniB ? defender : attacker;
  const firstMods = iniA >= iniB ? attackerMods : defenderMods;
  const secondMods = iniA >= iniB ? defenderMods : attackerMods;

  // First side attacks
  const result1 = resolveAttack(first, second, bk, config, true, firstMods, secondMods);
  logs.push(...result1.logs);

  // Apply losses to second before they attack back
  second.count -= result1.kills;
  second.total_losses += result1.kills;
  if (iniA >= iniB) {
    defenderLosses += result1.kills;
  } else {
    attackerLosses += result1.kills;
  }

  // Second side attacks (if still alive)
  if (second.count > 0) {
    const result2 = resolveAttack(second, first, bk, config, false, secondMods, firstMods);
    logs.push(...result2.logs);

    first.count -= result2.kills;
    first.total_losses += result2.kills;
    if (iniA >= iniB) {
      attackerLosses += result2.kills;
    } else {
      defenderLosses += result2.kills;
    }
  }

  // Morale checks
  checkMorale(attacker, bk, logs);
  checkMorale(defender, bk, logs);

  // Fatigue
  updateFatigue(attacker);
  updateFatigue(defender);

  return { logs, attackerLosses, defenderLosses };
}

interface AttackResult {
  logs: BattleLogEntry[];
  kills: number;
}

function resolveAttack(
  atk: CombatUnit,
  def: CombatUnit,
  bk: number,
  config: BattleConfig,
  isFirstAttack: boolean,
  atkMods: SpellModifiers = NO_MODS,
  defMods: SpellModifiers = NO_MODS,
): AttackResult {
  const logs: BattleLogEntry[] = [];
  if (atk.count <= 0 || def.count <= 0) return { logs, kills: 0 };

  let effectiveCount = getEffectiveCount(atk, isFirstAttack ? bk : bk, config.largeBattle);
  // Reduce effective count by CC disable fraction
  if (atkMods.disabledFraction > 0) {
    effectiveCount = Math.max(1, Math.floor(effectiveCount * (1 - atkMods.disabledFraction)));
  }
  if (effectiveCount <= 0) return { logs, kills: 0 };

  const fatiguePenalty = getFatiguePenalty(atk.fatigue_state);
  // Terrain THAC0 penalty applies to units of the attacking army
  const terrainTHAC0 = !atk.isBattleDefender ? getTerrainTHAC0Penalty(config.terrain) : 0;
  // Terrain AC bonus applies to units of the defending army
  const terrainAC = getTerrainACBonus(config.terrain, def.isBattleDefender);

  // Effective THAC0 (higher = worse for attacker) + spell buff to attacker's THAC0
  const effectiveThac0 = atk.unit.thac0 + fatiguePenalty + terrainTHAC0 + atkMods.thac0Mod;
  // Effective AC (lower = better for defender) + spell buff to defender's AC
  const effectiveAC = def.unit.ac - terrainAC + defMods.acMod;

  // Need to roll: THAC0 - AC
  const needed = effectiveThac0 - effectiveAC;

  // Roll attack
  const roll = d20();
  let hit = false;
  let totalDamage = 0;
  let critical: 'hit' | 'miss' | undefined;

  if (roll === 1) {
    // Critical miss
    critical = 'miss';
    hit = false;
    atk.critical_misses++;
  } else if (roll === 20) {
    // Critical hit
    critical = 'hit';
    hit = true;
    atk.critical_hits++;
    const critMult = rollDie(4);
    const baseDmg = rollDamage(atk.unit.dmg);
    const multiplier = critMult === 1 ? 8 : critMult;
    totalDamage = baseDmg * multiplier * effectiveCount;
  } else {
    hit = roll >= needed;
    if (hit) {
      totalDamage = rollDamage(atk.unit.dmg) * effectiveCount;
    }
  }

  // Apply fatigue damage penalty
  if (fatiguePenalty > 0 && totalDamage > 0) {
    totalDamage = Math.max(1, totalDamage - fatiguePenalty * effectiveCount);
  }

  const kills = hit ? Math.floor(totalDamage / def.unit.hp_per_soldier) : 0;

  logs.push({
    bk,
    attacker: atk.unit.name,
    defender: def.unit.name,
    roll,
    needed,
    hit,
    damage: totalDamage,
    kills: Math.min(kills, def.count),
    critical,
    fatigue_state: atk.fatigue_state,
  });

  return { logs, kills: Math.min(kills, def.count) };
}

function checkMorale(unit: CombatUnit, bk: number, logs: BattleLogEntry[]) {
  if (unit.count <= 0) return;

  const lossPercent = unit.total_losses / unit.unit.max_count;
  const bkLossPercent = unit.total_losses / unit.unit.max_count; // simplified

  // Check morale if >25% lost in this context or >50% total
  const needsCheck = lossPercent > 0.25 || bkLossPercent > 0.5;
  if (!needsCheck) return;

  const fatiguePenalty = getFatiguePenalty(unit.fatigue_state);
  const effectiveMorale = Math.max(1, unit.unit.morale - fatiguePenalty);
  const roll = d20();
  const passed = roll <= effectiveMorale;

  unit.morale_checks++;
  if (!passed) {
    unit.morale_failures++;
  }

  logs.push({
    bk,
    attacker: unit.unit.name,
    defender: '',
    roll,
    needed: effectiveMorale,
    hit: false,
    damage: 0,
    kills: 0,
    morale_check: { rolled: roll, needed: effectiveMorale, passed },
  });
}

function updateFatigue(unit: CombatUnit) {
  if (unit.fatigue_remaining > 0) {
    unit.fatigue_remaining--;
  }

  if (unit.fatigue_remaining > 0) {
    unit.fatigue_state = 'fresh';
  } else {
    const overFatigue = -unit.fatigue_remaining;
    const fatigueHalf = Math.floor(unit.unit.fatigue / 2);
    const fatigueThird = Math.floor(unit.unit.fatigue / 3);

    if (overFatigue >= fatigueHalf + fatigueThird) {
      unit.fatigue_state = 'collapsed';
    } else if (overFatigue >= fatigueHalf) {
      unit.fatigue_state = 'exhausted';
    } else {
      unit.fatigue_state = 'tired';
    }
  }
}

/** Check if a combat unit is out of action */
export function isDefeated(unit: CombatUnit): boolean {
  return unit.count <= 0 || unit.morale_failures >= 2 || unit.fatigue_state === 'collapsed';
}
