import { createCombatUnit, isDefeated, simulateBK } from './combat';
import type { CombatUnit } from './combat';
import type { BattleConfig, BattleLogEntry, SimulationResult, Unit, UnitResult } from './types';

interface SingleBattleResult {
  winner: 'army_a' | 'army_b' | 'draw';
  bk_count: number;
  army_a_remaining: Map<string, number>;
  army_b_remaining: Map<string, number>;
  logs: BattleLogEntry[];
}

/** Create matchups between armies based on movement priority */
function createMatchups(armyA: CombatUnit[], armyB: CombatUnit[]): [CombatUnit, CombatUnit][] {
  const pairs: [CombatUnit, CombatUnit][] = [];

  // Sort by movement priority (lower = faster, picks target first)
  const sortedA = [...armyA].sort((a, b) => a.unit.movement_priority - b.unit.movement_priority);
  const sortedB = [...armyB].sort((a, b) => a.unit.movement_priority - b.unit.movement_priority);

  const usedB = new Set<number>();

  for (const unitA of sortedA) {
    // Find best available opponent (closest movement priority)
    let bestIdx = -1;
    let bestPriority = Infinity;

    for (let i = 0; i < sortedB.length; i++) {
      if (usedB.has(i)) continue;
      if (sortedB[i].count <= 0) continue;
      const diff = Math.abs(unitA.unit.movement_priority - sortedB[i].unit.movement_priority);
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

  // Remaining B units with no match fight the strongest A unit
  for (let i = 0; i < sortedB.length; i++) {
    if (!usedB.has(i) && sortedB[i].count > 0) {
      const strongestA = sortedA.reduce((best, u) =>
        u.count > best.count ? u : best, sortedA[0]);
      if (strongestA.count > 0) {
        pairs.push([strongestA, sortedB[i]]);
      }
    }
  }

  return pairs;
}

function isArmyDefeated(army: CombatUnit[]): boolean {
  return army.every(u => isDefeated(u));
}

function simulateSingleBattle(
  unitsA: Unit[],
  unitsB: Unit[],
  config: BattleConfig
): SingleBattleResult {
  const armyA = unitsA.map(createCombatUnit);
  const armyB = unitsB.map(createCombatUnit);
  const allLogs: BattleLogEntry[] = [];
  let bk = 0;

  while (!isArmyDefeated(armyA) && !isArmyDefeated(armyB) && bk < config.maxBK) {
    bk++;

    const matchups = createMatchups(
      armyA.filter(u => !isDefeated(u)),
      armyB.filter(u => !isDefeated(u))
    );

    for (const [unitA, unitB] of matchups) {
      if (isDefeated(unitA) || isDefeated(unitB)) continue;
      const result = simulateBK(unitA, unitB, bk, config);
      allLogs.push(...result.logs);
    }

    // Reassign units that defeated their opponent
    // (handled by next iteration's matchup creation)
  }

  const aDefeated = isArmyDefeated(armyA);
  const bDefeated = isArmyDefeated(armyB);

  let winner: 'army_a' | 'army_b' | 'draw';
  if (aDefeated && bDefeated) winner = 'draw';
  else if (bDefeated) winner = 'army_a';
  else if (aDefeated) winner = 'army_b';
  else winner = 'draw'; // timeout

  const army_a_remaining = new Map<string, number>();
  for (const u of armyA) {
    army_a_remaining.set(u.unit.id, Math.max(0, u.count));
  }
  const army_b_remaining = new Map<string, number>();
  for (const u of armyB) {
    army_b_remaining.set(u.unit.id, Math.max(0, u.count));
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

  // Track remaining counts per unit
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

  // Key factors analysis
  const keyFactors: string[] = [];
  if (wins.army_a > wins.army_b * 2) {
    keyFactors.push('Spojenci mají výraznou převahu v simulacích.');
  }
  if (wins.army_b > wins.army_a * 2) {
    keyFactors.push('Nepřátelé mají výraznou převahu v simulacích.');
  }

  // Find most impactful units
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
