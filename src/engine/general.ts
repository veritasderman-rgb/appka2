/**
 * General AI — assigns attack vectors for one army against an opposing army.
 *
 * Strategy (mirrors real battle logic):
 *   - Strong units → hunt down the weakest opponents (efficient kills)
 *   - Weak units   → gang up together on the strongest opponent (overwhelm)
 */

import { avgDamage } from './dice';

export interface AttackVector {
  /** instanceId of the attacking unit */
  attackerId: string;
  /** instanceId of the target unit */
  targetId: string;
}

interface UnitForAssignment {
  instanceId: string;
  count: number;
  dmg: string;
  thac0: number;
  hp_per_soldier: number;
}

/**
 * Combat strength estimate combining offense and staying power.
 * Avoids using AC of opponents since this is done before matchup.
 */
function computeStrength(u: UnitForAssignment): number {
  const dmg = avgDamage(u.dmg);
  // Simplified hit rate against a "neutral" AC 0 target
  const hitRate = Math.max(0.05, Math.min(0.95, (21 - u.thac0) / 20));
  const offensePerSoldier = dmg * hitRate;
  // Total offense × sqrt(total HP) balances raw damage with survivability
  const totalHP = u.count * u.hp_per_soldier;
  return u.count * offensePerSoldier * Math.sqrt(Math.max(1, totalHP));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Assign attack vectors from `side` against `opponents`.
 *
 * Phase 1 — strong side units each target the weakest available opponent.
 * Phase 2 — weak side units all converge on the single strongest opponent.
 */
export function assignAttackVectors(
  side: UnitForAssignment[],
  opponents: UnitForAssignment[],
): AttackVector[] {
  if (side.length === 0 || opponents.length === 0) return [];

  const sideStrengths = side.map(u => ({ id: u.instanceId, s: computeStrength(u) }));
  const oppStrengths = opponents.map(u => ({ id: u.instanceId, s: computeStrength(u) }));

  const med = median(sideStrengths.map(u => u.s));

  // Sort opponents weakest → strongest (for strong units to pick off in order)
  const sortedOppsAsc = [...oppStrengths].sort((a, b) => a.s - b.s);
  // Strongest opponent for weak units to gang up on
  const strongestOpp = oppStrengths.reduce((best, u) => (u.s > best.s ? u : best), oppStrengths[0]);

  const vectors: AttackVector[] = [];
  const usedOpponents = new Set<string>();
  let weakOppIdx = 0;

  // Phase 1: above-median units → pick weakest uncontested opponent
  for (const unit of sideStrengths.filter(u => u.s >= med)) {
    while (weakOppIdx < sortedOppsAsc.length && usedOpponents.has(sortedOppsAsc[weakOppIdx].id)) {
      weakOppIdx++;
    }
    if (weakOppIdx < sortedOppsAsc.length) {
      vectors.push({ attackerId: unit.id, targetId: sortedOppsAsc[weakOppIdx].id });
      usedOpponents.add(sortedOppsAsc[weakOppIdx].id);
      weakOppIdx++;
    } else {
      // All opponents already have a dedicated attacker — pile on the weakest
      vectors.push({ attackerId: unit.id, targetId: sortedOppsAsc[0].id });
    }
  }

  // Phase 2: below-median units → concentrate on the strongest opponent
  for (const unit of sideStrengths.filter(u => u.s < med)) {
    vectors.push({ attackerId: unit.id, targetId: strongestOpp.id });
  }

  return vectors;
}
