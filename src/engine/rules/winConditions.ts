/**
 * Podmínky vítězství — referenční modul.
 *
 * Jednotka je poražena pokud platí jedno z:
 * - count <= 0 (zničena)
 * - morale_failures >= 2 (zlomená morálka)
 * - fatigue_state === 'collapsed' (zhroucena únavou)
 *
 * Armáda je poražena pokud jsou poraženy VŠECHNY její jednotky.
 */
import type { CombatUnit } from '../combat';
import { isDefeated as isUnitDefeated } from '../combat';

export { isUnitDefeated as isDefeated };

/** Vrátí true pokud jsou všechny jednotky armády poraženy */
export function isArmyDefeated(army: CombatUnit[]): boolean {
  return army.every(u => isUnitDefeated(u));
}

/**
 * Zkontroluje výsledek bitvy po BK.
 * @returns 'army_a' | 'army_b' | 'draw' | null (pokud bitva pokračuje)
 */
export function checkVictory(
  armyA: CombatUnit[],
  armyB: CombatUnit[],
  bk: number,
  maxBK: number,
): 'army_a' | 'army_b' | 'draw' | null {
  const aDefeated = isArmyDefeated(armyA);
  const bDefeated = isArmyDefeated(armyB);

  if (aDefeated && bDefeated) return 'draw';
  if (aDefeated) return 'army_b';
  if (bDefeated) return 'army_a';
  if (bk >= maxBK) return 'draw';
  return null;
}
