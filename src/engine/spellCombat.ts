/**
 * Spell combat engine: handles spell casting during battle simulation.
 *
 * Each BK, magical units cast their most powerful available spell first,
 * using up spell slots from highest to lowest level.
 */

import type { CombatUnit } from './combat';
import type { BattleLogEntry } from './types';
import {
  type SpellDefinition,
  type CasterClass,
  getSpellById,
  getSlotsForCaster,
  getCasterClassForUnitType,
  snapCasterLevel,
  sortSpellsByCombatPriority,
} from '../data/spells';

export interface SpellCombatState {
  /** Remaining spell slots by level */
  slots: Record<number, number>;
  /** Enabled spell IDs for this battle (user-toggled) */
  enabledSpellIds: string[];
  /** Caster class */
  casterClass: CasterClass;
  /** Already cast spell IDs (consumed) */
  castSpells: string[];
}

/** Active buff applied by a spell */
export interface ActiveBuff {
  spellId: string;
  acBonus: number;
  thac0Bonus: number;
  remainingBK: number;
  /** Fraction of the unit covered by this buff (0-1), based on caster count vs target count */
  buffFraction: number;
}

/** Active CC / debuff applied to a unit by enemy spell */
export interface ActiveCC {
  spellId: string;
  disableFraction: number;
  remainingBK: number;
  /** THAC0 penalty from debuff (positive = worse attack) */
  debuffThac0?: number;
  /** AC penalty from debuff (positive = worse defense) */
  debuffAC?: number;
}

/** Initialize spell combat state for a combat unit */
export function initSpellState(
  unit: CombatUnit,
  enabledSpellIds?: string[]
): SpellCombatState | undefined {
  const cc = getCasterClassForUnitType(unit.unit.type);
  if (!cc) return undefined;

  const level = unit.unit.commander?.level ?? 6;
  const snapped = snapCasterLevel(level);
  const slots = getSlotsForCaster(cc, snapped);

  return {
    slots,
    enabledSpellIds: enabledSpellIds ?? [],
    casterClass: cc,
    castSpells: [],
  };
}

/** Pick the best spell to cast this BK */
function pickSpell(state: SpellCombatState): { spell: SpellDefinition; slotLevel: number } | null {
  // Get all enabled spells, sorted by combat priority (depends on caster class)
  const candidates = state.enabledSpellIds
    .map(id => getSpellById(id))
    .filter((s): s is SpellDefinition => s != null && s.combat.type !== 'utility');

  const sorted = sortSpellsByCombatPriority(candidates, state.casterClass);

  for (const spell of sorted) {
    // Find the lowest available slot that can cast this spell (slot >= spell level)
    for (let lvl = spell.level; lvl <= 6; lvl++) {
      if ((state.slots[lvl] ?? 0) > 0) {
        return { spell, slotLevel: lvl };
      }
    }
  }

  return null;
}

export interface SpellCastResult {
  spell: SpellDefinition;
  damageDealt: number;
  kills: number;
  healAmount: number;
  soldiersRestored: number;
  buff?: ActiveBuff;
  cc?: ActiveCC;
  log: BattleLogEntry;
}

/**
 * How many times each individual mage's spell multiplies based on specialisation.
 *
 * MG  (Mágové)              — 1× count  (každý mág sešle 1 kouzlo)
 * BM  (Bitevní mágové)      — 2× count  (trénovaní pro válku, dvojnásobný výstup)
 * SP  (Specializovaní BM)   — 3× count  (elitní bojová magie)
 * DR / KN / ostatní         — 1× count
 */
function spellCastingMultiplier(unitType: string): number {
  if (unitType === 'BM') return 2;
  if (unitType === 'SP') return 3;
  return 1;
}

/**
 * Cast a spell during a BK. Returns the result or null if no spell was cast.
 *
 * @param caster - The casting combat unit
 * @param spellState - Mutable spell state for the caster
 * @param target - The enemy combat unit (for damage/CC/debuff)
 * @param bk - Current battle round number
 * @param allies - Friendly combat units (for buff/heal targeting)
 */
export function castSpellInBK(
  caster: CombatUnit,
  spellState: SpellCombatState,
  target: CombatUnit,
  bk: number,
  allies?: CombatUnit[],
): SpellCastResult | null {
  if (caster.count <= 0) return null;

  const pick = pickSpell(spellState);
  if (!pick) return null;

  const { spell, slotLevel } = pick;

  // Consume the slot
  spellState.slots[slotLevel]--;

  const combat = spell.combat;
  let damageDealt = 0;
  let kills = 0;
  let healAmount = 0;
  let soldiersRestored = 0;
  let buff: ActiveBuff | undefined;
  let cc: ActiveCC | undefined;

  const classMult = spellCastingMultiplier(caster.unit.type);
  /** Number of persons affected by this casting */
  const affectedPersons = caster.count * classMult;

  switch (combat.type) {
    case 'damage': {
      const baseDmg = combat.avgDamage ?? 0;
      // Upcast bonus: +15% per slot level above base
      const upcastMult = 1 + (slotLevel - spell.level) * 0.15;
      // Each mage contributes their spell; BM casts 2×, SP casts 3× per mage
      damageDealt = Math.round(baseDmg * upcastMult * caster.count * classMult);
      kills = Math.min(Math.floor(damageDealt / target.unit.hp_per_soldier), target.count);
      break;
    }
    case 'debuff': {
      // Hybrid spell: deals damage AND applies a debuff (penalty) on the target
      const baseDmg = combat.avgDamage ?? 0;
      const upcastMult = 1 + (slotLevel - spell.level) * 0.15;
      damageDealt = Math.round(baseDmg * upcastMult * caster.count * classMult);
      kills = Math.min(Math.floor(damageDealt / target.unit.hp_per_soldier), target.count);

      // Scale debuff with caster count vs target count
      const debuffCoverage = Math.min(1, affectedPersons / Math.max(1, target.count));
      cc = {
        spellId: spell.id,
        disableFraction: 0,
        remainingBK: combat.durationBK ?? 1,
        debuffThac0: combat.thac0Bonus ? Math.round(combat.thac0Bonus * debuffCoverage * 10) / 10 : undefined,
        debuffAC: combat.acBonus ? Math.round(-(combat.acBonus) * debuffCoverage * 10) / 10 : undefined,
      };
      break;
    }
    case 'heal': {
      const baseHeal = combat.avgHeal ?? 0;
      // Pick best heal target: ally with highest loss percentage
      const healTarget = pickHealTarget(caster, allies);
      // Each healer contributes; same class multiplier applies
      healAmount = Math.round(baseHeal * caster.count * classMult);
      // Restore soldiers: healAmount / hp_per_soldier of the target
      const targetHps = healTarget.unit.hp_per_soldier > 0 ? healTarget.unit.hp_per_soldier : 1;
      soldiersRestored = Math.min(
        Math.floor(healAmount / targetHps),
        healTarget.total_losses
      );
      soldiersRestored = Math.max(0, soldiersRestored);
      break;
    }
    case 'buff': {
      // Pick best buff target: nearest ally by movement_priority
      const buffTarget = pickBuffTarget(caster, allies);
      // Scale buff with caster count vs target unit count
      const buffFrac = Math.min(1, affectedPersons / Math.max(1, buffTarget.count));
      buff = {
        spellId: spell.id,
        acBonus: combat.acBonus ?? 0,
        thac0Bonus: combat.thac0Bonus ?? 0,
        remainingBK: combat.durationBK ?? 1,
        buffFraction: buffFrac,
      };
      break;
    }
    case 'cc': {
      // Scale disable fraction with caster count vs target count
      const coverageFraction = Math.min(1, affectedPersons / Math.max(1, target.count));
      const scaledDisable = (combat.disableFraction ?? 0.1) * coverageFraction;
      cc = {
        spellId: spell.id,
        disableFraction: scaledDisable,
        remainingBK: combat.durationBK ?? 1,
      };
      break;
    }
  }

  // Determine the actual target for logging
  const isAllySpell = combat.type === 'heal' || combat.type === 'buff';
  let logTarget: string;
  if (combat.type === 'heal') {
    const healTarget = pickHealTarget(caster, allies);
    logTarget = healTarget.unit.name;
  } else if (combat.type === 'buff') {
    const buffTarget = pickBuffTarget(caster, allies);
    logTarget = buffTarget.unit.name;
  } else {
    logTarget = target.unit.name;
  }

  const log: BattleLogEntry = {
    bk,
    attacker: `${caster.unit.name} [${spell.name}]`,
    defender: logTarget,
    roll: 0,
    needed: 0,
    hit: combat.type !== 'utility',
    damage: damageDealt,
    kills,
    spellEffect: isAllySpell
      ? (combat.type === 'heal' ? `heal:${soldiersRestored}` : `buff:${buff?.buffFraction.toFixed(2)}`)
      : (cc ? `cc:${cc.disableFraction.toFixed(2)}${cc.debuffThac0 ? `,thac0:+${cc.debuffThac0}` : ''}` : undefined),
  };

  return { spell, damageDealt, kills, healAmount, soldiersRestored, buff, cc, log };
}

/**
 * Pick the best ally target for a heal spell.
 * Returns the ally with the highest loss percentage (most wounded).
 * Falls back to the caster if no wounded allies.
 */
function pickHealTarget(caster: CombatUnit, allies?: CombatUnit[]): CombatUnit {
  if (!allies || allies.length === 0) return caster;

  let bestTarget = caster;
  let bestLossPercent = caster.unit.max_count > 0 ? caster.total_losses / caster.unit.max_count : 0;

  for (const ally of allies) {
    if (ally.count <= 0 || ally.total_losses <= 0) continue;
    const lossPct = ally.unit.max_count > 0 ? ally.total_losses / ally.unit.max_count : 0;
    if (lossPct > bestLossPercent) {
      bestLossPercent = lossPct;
      bestTarget = ally;
    }
  }

  return bestTarget;
}

/**
 * Pick the best ally target for a buff spell.
 * Returns the nearest ally by movement_priority (closest to caster).
 * Falls back to the caster.
 */
function pickBuffTarget(caster: CombatUnit, allies?: CombatUnit[]): CombatUnit {
  if (!allies || allies.length === 0) return caster;

  let bestTarget = caster;
  let bestDiff = Infinity;

  for (const ally of allies) {
    if (ally.count <= 0) continue;
    const diff = Math.abs(ally.unit.movement_priority - caster.unit.movement_priority);
    // Prefer non-self allies that are closest in movement priority
    // but exclude the caster itself (they're already in the list)
    if (diff < bestDiff || (diff === bestDiff && ally !== caster)) {
      bestDiff = diff;
      bestTarget = ally;
    }
  }

  return bestTarget;
}

/**
 * Apply active buffs to a combat unit's effective stats.
 * Returns the total AC and THAC0 modifiers from active buffs, scaled by buffFraction.
 */
export function getBuffModifiers(buffs: ActiveBuff[]): { acMod: number; thac0Mod: number } {
  let acMod = 0;
  let thac0Mod = 0;
  for (const b of buffs) {
    // Scale buff effect by the fraction of the unit actually covered
    acMod += b.acBonus * b.buffFraction;
    thac0Mod += b.thac0Bonus * b.buffFraction;
  }
  return { acMod: Math.round(acMod * 10) / 10, thac0Mod: Math.round(thac0Mod * 10) / 10 };
}

/**
 * Get the fraction of a unit disabled by active CC effects.
 */
export function getCCDisableFraction(ccs: ActiveCC[]): number {
  let total = 0;
  for (const cc of ccs) {
    total += cc.disableFraction;
  }
  return Math.min(total, 0.8); // Cap at 80% disabled
}

/**
 * Get debuff modifiers (THAC0/AC penalties) from active CC/debuff effects on a unit.
 */
export function getDebuffModifiers(ccs: ActiveCC[]): { thac0Penalty: number; acPenalty: number } {
  let thac0Penalty = 0;
  let acPenalty = 0;
  for (const cc of ccs) {
    if (cc.debuffThac0) thac0Penalty += cc.debuffThac0;
    if (cc.debuffAC) acPenalty += cc.debuffAC;
  }
  return { thac0Penalty, acPenalty };
}

/** Tick down buff/CC durations. Returns only those still active. */
export function tickBuffs(buffs: ActiveBuff[]): ActiveBuff[] {
  return buffs
    .map(b => ({ ...b, remainingBK: b.remainingBK - 1 }))
    .filter(b => b.remainingBK > 0);
}

export function tickCCs(ccs: ActiveCC[]): ActiveCC[] {
  return ccs
    .map(c => ({ ...c, remainingBK: c.remainingBK - 1 }))
    .filter(c => c.remainingBK > 0);
}
