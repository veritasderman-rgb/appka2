/**
 * Hex Battle Engine
 *
 * Runs a single deterministic battle on a hex grid.
 * Each BK:
 *   1. General assigns attack vectors for both sides
 *   2. Movement phase — each unit advances toward its assigned target
 *   3. Combat phase  — adjacent (distance ≤ 1) pairs fight using the existing simulateBK engine
 *
 * A BK snapshot is recorded after each round for step-by-step visualisation.
 */

import { createCombatUnit, simulateBK, isDefeated } from './combat';
import type { CombatUnit } from './combat';
import type { BattleConfig } from './types';
import type { ArmyUnit } from '../store/battleStore';
import { hexDistance, moveToward, COLS, ROWS, type HexCoord } from './hexGrid';
import { assignAttackVectors, type AttackVector } from './general';

// -------------------------------------------------------------------
// Public types
// -------------------------------------------------------------------

export interface SnapshotUnit {
  instanceId: string;
  unitName: string;
  unitType: string;
  side: 'a' | 'b';
  pos: HexCoord;
  alive: boolean;
  count: number;
  maxCount: number;
  fatigueState: CombatUnit['fatigue_state'];
  moraleFailures: number;
}

export interface Engagement {
  attackerInstanceId: string;
  defenderInstanceId: string;
  attackerLosses: number;
  defenderLosses: number;
}

export interface HexBKSnapshot {
  bk: number;
  units: SnapshotUnit[];
  /** Attack vectors chosen by side A's general this BK */
  vectorsA: AttackVector[];
  /** Attack vectors chosen by side B's general this BK */
  vectorsB: AttackVector[];
  engagements: Engagement[];
}

export interface HexBattleResult {
  winner: 'a' | 'b' | 'draw';
  bkCount: number;
  /** BK 0 = initial deployment, BK 1..N = after each round */
  snapshots: HexBKSnapshot[];
}

// -------------------------------------------------------------------
// Internal state
// -------------------------------------------------------------------

interface MapUnit {
  instanceId: string;
  unitName: string;
  unitType: string;
  side: 'a' | 'b';
  pos: HexCoord;
  alive: boolean;
  /** Persistent combat state (fatigue, morale track across BKs) */
  combat: CombatUnit;
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Number of tactical hexes a unit moves per BK.
 * Divisor=3 gives cavalry 4 hex/BK, medium infantry 3, heavy 2.
 * Both sides advancing → they close ~6-8 hex/BK → typical engagement in BK 2-3.
 */
const MOVEMENT_DIVISOR = 3;

function tacticalMove(movementHexes: number): number {
  return Math.max(1, Math.ceil(movementHexes / MOVEMENT_DIVISOR));
}

/** Place units in deployment columns starting from the nearest edge. */
function deployArmy(units: ArmyUnit[], side: 'a' | 'b'): HexCoord[] {
  const positions: HexCoord[] = [];
  let col = side === 'a' ? 0 : COLS - 1;
  let row = 0;
  for (let i = 0; i < units.length; i++) {
    positions.push({ col, row });
    row++;
    if (row >= ROWS) {
      row = 0;
      col += side === 'a' ? 1 : -1;
    }
  }
  return positions;
}

function snapshotOf(mapUnits: MapUnit[]): SnapshotUnit[] {
  return mapUnits.map(mu => ({
    instanceId: mu.instanceId,
    unitName: mu.unitName,
    unitType: mu.unitType,
    side: mu.side,
    pos: { ...mu.pos },
    alive: mu.alive,
    count: mu.combat.count,
    maxCount: mu.combat.unit.max_count,
    fatigueState: mu.combat.fatigue_state,
    moraleFailures: mu.combat.morale_failures,
  }));
}

function toAssignmentUnit(mu: MapUnit) {
  return {
    instanceId: mu.instanceId,
    count: mu.combat.count,
    dmg: mu.combat.unit.dmg,
    thac0: mu.combat.unit.thac0,
    hp_per_soldier: mu.combat.unit.hp_per_soldier,
  };
}

// -------------------------------------------------------------------
// Main function
// -------------------------------------------------------------------

export function runHexBattle(
  armyA: ArmyUnit[],
  armyB: ArmyUnit[],
  config: BattleConfig,
): HexBattleResult {
  const isDefenderA = config.attackerSide === 'army_b';
  const isDefenderB = config.attackerSide === 'army_a';

  const posA = deployArmy(armyA, 'a');
  const posB = deployArmy(armyB, 'b');

  const mapUnits: MapUnit[] = [
    ...armyA.map((u, i) => ({
      instanceId: u.instanceId,
      unitName: u.name,
      unitType: u.type,
      side: 'a' as const,
      pos: posA[i],
      alive: true,
      combat: createCombatUnit(u, isDefenderA, config.commanderBonuses),
    })),
    ...armyB.map((u, i) => ({
      instanceId: u.instanceId,
      unitName: u.name,
      unitType: u.type,
      side: 'b' as const,
      pos: posB[i],
      alive: true,
      combat: createCombatUnit(u, isDefenderB, config.commanderBonuses),
    })),
  ];

  const byId = new Map(mapUnits.map(mu => [mu.instanceId, mu]));
  const snapshots: HexBKSnapshot[] = [];

  // BK 0: initial deployment snapshot (no combat yet)
  snapshots.push({
    bk: 0,
    units: snapshotOf(mapUnits),
    vectorsA: [],
    vectorsB: [],
    engagements: [],
  });

  let bk = 0;

  while (bk < config.maxBK) {
    bk++;

    const aliveA = mapUnits.filter(mu => mu.side === 'a' && mu.alive);
    const aliveB = mapUnits.filter(mu => mu.side === 'b' && mu.alive);
    if (aliveA.length === 0 || aliveB.length === 0) break;

    // 1. General assigns attack vectors for both sides
    const vectorsA = assignAttackVectors(aliveA.map(toAssignmentUnit), aliveB.map(toAssignmentUnit));
    const vectorsB = assignAttackVectors(aliveB.map(toAssignmentUnit), aliveA.map(toAssignmentUnit));

    // 2. Movement phase
    for (const vec of vectorsA) {
      const unit = byId.get(vec.attackerId);
      const target = byId.get(vec.targetId);
      if (!unit?.alive || !target?.alive) continue;
      if (hexDistance(unit.pos, target.pos) <= 1) continue;
      unit.pos = moveToward(unit.pos, target.pos, tacticalMove(unit.combat.unit.movement_hexes));
    }
    for (const vec of vectorsB) {
      const unit = byId.get(vec.attackerId);
      const target = byId.get(vec.targetId);
      if (!unit?.alive || !target?.alive) continue;
      if (hexDistance(unit.pos, target.pos) <= 1) continue;
      unit.pos = moveToward(unit.pos, target.pos, tacticalMove(unit.combat.unit.movement_hexes));
    }

    // 3. Combat phase — each adjacent pair fights at most once per BK
    const engagements: Engagement[] = [];
    const foughtPairs = new Set<string>();

    for (const vec of vectorsA) {
      const unitA = byId.get(vec.attackerId);
      const unitB = byId.get(vec.targetId);
      if (!unitA?.alive || !unitB?.alive) continue;
      if (hexDistance(unitA.pos, unitB.pos) > 1) continue;

      const pairKey = [unitA.instanceId, unitB.instanceId].sort().join('|');
      if (foughtPairs.has(pairKey)) continue;
      foughtPairs.add(pairKey);

      const result = simulateBK(unitA.combat, unitB.combat, bk, config);
      engagements.push({
        attackerInstanceId: unitA.instanceId,
        defenderInstanceId: unitB.instanceId,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
      });

      if (isDefeated(unitA.combat)) unitA.alive = false;
      if (isDefeated(unitB.combat)) unitB.alive = false;
    }

    // Also check B vectors for any un-fought adjacent pairs
    for (const vec of vectorsB) {
      const unitB = byId.get(vec.attackerId);
      const unitA = byId.get(vec.targetId);
      if (!unitB?.alive || !unitA?.alive) continue;
      if (hexDistance(unitB.pos, unitA.pos) > 1) continue;

      const pairKey = [unitA.instanceId, unitB.instanceId].sort().join('|');
      if (foughtPairs.has(pairKey)) continue;
      foughtPairs.add(pairKey);

      // unitB is the attacker in this pair
      const result = simulateBK(unitB.combat, unitA.combat, bk, config);
      engagements.push({
        attackerInstanceId: unitB.instanceId,
        defenderInstanceId: unitA.instanceId,
        attackerLosses: result.attackerLosses,
        defenderLosses: result.defenderLosses,
      });

      if (isDefeated(unitB.combat)) unitB.alive = false;
      if (isDefeated(unitA.combat)) unitA.alive = false;
    }

    snapshots.push({
      bk,
      units: snapshotOf(mapUnits),
      vectorsA,
      vectorsB,
      engagements,
    });
  }

  // Determine winner
  const survivorsA = mapUnits.filter(mu => mu.side === 'a' && mu.alive).length;
  const survivorsB = mapUnits.filter(mu => mu.side === 'b' && mu.alive).length;

  let winner: 'a' | 'b' | 'draw';
  if (survivorsA === 0 && survivorsB === 0) winner = 'draw';
  else if (survivorsA === 0) winner = 'b';
  else if (survivorsB === 0) winner = 'a';
  else winner = 'draw';

  return { winner, bkCount: bk, snapshots };
}
