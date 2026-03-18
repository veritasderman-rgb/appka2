import type { StateCreator } from 'zustand';
import type { BattleConfig, SimulationResult } from '../../engine/types';
import { DEFAULT_CONFIG } from '../../engine/types';
import { runSimulation } from '../../engine/simulation';
import { runHexBattle } from '../../engine/hexBattle';
import type { HexBattleResult } from '../../engine/hexBattle';
import type { BattleStore } from '../types';

export interface SimulationSlice {
  config: BattleConfig;
  setConfig: (c: Partial<BattleConfig>) => void;

  result: SimulationResult | null;
  isSimulating: boolean;
  simulationProgress: number;

  hexResult: HexBattleResult | null;
  isHexSimulating: boolean;

  runBattle: () => void;
  runHexBattleAction: () => void;
}

export const createSimulationSlice: StateCreator<BattleStore, [], [], SimulationSlice> = (set, get) => ({
  config: DEFAULT_CONFIG,
  setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

  result: null,
  isSimulating: false,
  simulationProgress: 0,

  hexResult: null,
  isHexSimulating: false,

  runHexBattleAction: () => {
    const { armyA, armyB, config } = get();
    if (armyA.length === 0 || armyB.length === 0) return;
    set({ isHexSimulating: true });
    setTimeout(() => {
      const hexResult = runHexBattle(armyA, armyB, config);
      set({ hexResult, isHexSimulating: false, screen: 'hexmap' });
    }, 50);
  },

  runBattle: () => {
    const { armyA, armyB, config } = get();
    if (armyA.length === 0 || armyB.length === 0) return;

    set({ isSimulating: true, simulationProgress: 0 });

    setTimeout(() => {
      const result = runSimulation(armyA, armyB, config, (p) => {
        set({ simulationProgress: p });
      });
      set({ result, isSimulating: false, simulationProgress: 100, screen: 'results' });
    }, 50);
  },
});
