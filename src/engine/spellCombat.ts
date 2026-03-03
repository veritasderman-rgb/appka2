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
}

/** Active CC applied to a unit by enemy spell */
export interface ActiveCC {
  spellId: string;
  disableFraction: number;
  remainingBK: number;
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
  // Get all enabled spells, sorted by combat priority (highest level + damage first)
  const candidates = state.enabledSpellIds
    .map(id => getSpellById(id))
    .filter((s): s is SpellDefinition => s != null && s.combat.type !== 'utility');

  const sorted = sortSpellsByCombatPriority(candidates);

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
 * @param target - The enemy combat unit (for damage/CC)
 * @param bk - Current battle round number
 * @param activeBuffs - Buffs currently active on the caster (for reference)
 */
export function castSpellInBK(
  caster: CombatUnit,
  spellState: SpellCombatState,
  target: CombatUnit,
  bk: number,
): SpellCastResult | null {
  if (caster.count <= 0) return null;

  const pick = pickSpell(spellState);
  if (!pick) return null;

  const { spell, slotLevel } = pick;

  // Consume the slot
  spellState.slots[slotLevel]--;
  // Remove the spell from future casting (each spell can only be cast once per battle via its slot)
  // Actually, spells can be cast multiple times if you have multiple slots. We just consumed one slot.

  const combat = spell.combat;
  let damageDealt = 0;
  let kills = 0;
  let healAmount = 0;
  let soldiersRestored = 0;
  let buff: ActiveBuff | undefined;
  let cc: ActiveCC | undefined;

  const classMult = spellCastingMultiplier(caster.unit.type);

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
    case 'heal': {
      const baseHeal = combat.avgHeal ?? 0;
      // Each healer contributes; same class multiplier applies
      healAmount = Math.round(baseHeal * caster.count * classMult);
      // Restore soldiers: healAmount / hp_per_soldier
      const maxRestore = caster.unit.count - caster.count + caster.total_losses;
      soldiersRestored = Math.min(
        Math.floor(healAmount / caster.unit.hp_per_soldier),
        caster.total_losses
      );
      soldiersRestored = Math.max(0, Math.min(soldiersRestored, maxRestore));
      break;
    }
    case 'buff': {
      buff = {
        spellId: spell.id,
        acBonus: combat.acBonus ?? 0,
        thac0Bonus: combat.thac0Bonus ?? 0,
        remainingBK: combat.durationBK ?? 1,
      };
      break;
    }
    case 'cc': {
      cc = {
        spellId: spell.id,
        disableFraction: combat.disableFraction ?? 0.1,
        remainingBK: combat.durationBK ?? 1,
      };
      break;
    }
  }

  const log: BattleLogEntry = {
    bk,
    attacker: `${caster.unit.name} [${spell.name}]`,
    defender: combat.type === 'heal' ? caster.unit.name : target.unit.name,
    roll: 0,
    needed: 0,
    hit: combat.type !== 'utility',
    damage: damageDealt,
    kills,
  };

  return { spell, damageDealt, kills, healAmount, soldiersRestored, buff, cc, log };
}

/**
 * Apply active buffs to a combat unit's effective stats.
 * Returns the total AC and THAC0 modifiers from active buffs.
 */
export function getBuffModifiers(buffs: ActiveBuff[]): { acMod: number; thac0Mod: number } {
  let acMod = 0;
  let thac0Mod = 0;
  for (const b of buffs) {
    acMod += b.acBonus;
    thac0Mod += b.thac0Bonus;
  }
  return { acMod, thac0Mod };
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
