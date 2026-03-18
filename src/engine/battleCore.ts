/**
 * Sdílené jádro boje — re-exportuje klíčové funkce z combat.ts.
 *
 * Tento modul slouží jako stabilní veřejné API herního enginu.
 * Jak simulation.ts, tak hexBattle.ts by měly importovat z battleCore.ts
 * místo přímého importu z combat.ts.
 *
 * Aktuální stav: re-exportuje z combat.ts (plná extrakce v Task 18).
 */

// Core interfaces
export type { CombatUnit, ClashResult, RangedAttackResult, SpellModifiers } from './combat';

// Unit creation & state
export { createCombatUnit, isDefeated } from './combat';

// Combat resolution
export { simulateBK, simulateRangedAttack, simulateFlybyAttack } from './combat';

// Unit type helpers
export {
  isFlyingUnit,
  isAerialRanged,
  isFlybyUnit,
  isRangedUnit,
  unitCanTargetFlying,
  getCommanderBonuses,
} from './combat';

// Win conditions (domain module)
export { isArmyDefeated, checkVictory } from './rules/winConditions';
