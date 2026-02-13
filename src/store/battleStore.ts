import { create } from 'zustand';
import type { BattleConfig, SimulationResult, Unit } from '../engine/types';
import { DEFAULT_CONFIG } from '../engine/types';
import { runSimulation } from '../engine/simulation';

type Screen = 'builder' | 'results';

interface BattleState {
  screen: Screen;
  setScreen: (s: Screen) => void;

  armyA: Unit[];
  armyB: Unit[];
  addToArmyA: (unit: Unit) => void;
  addToArmyB: (unit: Unit) => void;
  removeFromArmyA: (id: string) => void;
  removeFromArmyB: (id: string) => void;
  updateUnitCount: (faction: 'alliance' | 'enemy', id: string, count: number) => void;
  clearArmyA: () => void;
  clearArmyB: () => void;

  config: BattleConfig;
  setConfig: (c: Partial<BattleConfig>) => void;

  result: SimulationResult | null;
  isSimulating: boolean;
  simulationProgress: number;

  runBattle: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
  screen: 'builder',
  setScreen: (s) => set({ screen: s }),

  armyA: [],
  armyB: [],

  addToArmyA: (unit) => {
    const { armyA } = get();
    if (armyA.find(u => u.id === unit.id)) return;
    set({ armyA: [...armyA, { ...unit }] });
  },
  addToArmyB: (unit) => {
    const { armyB } = get();
    if (armyB.find(u => u.id === unit.id)) return;
    set({ armyB: [...armyB, { ...unit }] });
  },
  removeFromArmyA: (id) => set(s => ({ armyA: s.armyA.filter(u => u.id !== id) })),
  removeFromArmyB: (id) => set(s => ({ armyB: s.armyB.filter(u => u.id !== id) })),

  updateUnitCount: (faction, id, count) => {
    if (faction === 'alliance') {
      set(s => ({
        armyA: s.armyA.map(u => u.id === id ? { ...u, count: Math.max(0, Math.min(count, u.max_count)) } : u),
      }));
    } else {
      set(s => ({
        armyB: s.armyB.map(u => u.id === id ? { ...u, count: Math.max(0, Math.min(count, u.max_count)) } : u),
      }));
    }
  },

  clearArmyA: () => set({ armyA: [] }),
  clearArmyB: () => set({ armyB: [] }),

  config: DEFAULT_CONFIG,
  setConfig: (c) => set(s => ({ config: { ...s.config, ...c } })),

  result: null,
  isSimulating: false,
  simulationProgress: 0,

  runBattle: () => {
    const { armyA, armyB, config } = get();
    if (armyA.length === 0 || armyB.length === 0) return;

    set({ isSimulating: true, simulationProgress: 0 });

    // Use setTimeout to not block UI
    setTimeout(() => {
      const result = runSimulation(armyA, armyB, config, (p) => {
        set({ simulationProgress: p });
      });
      set({ result, isSimulating: false, simulationProgress: 100, screen: 'results' });
    }, 50);
  },
}));
