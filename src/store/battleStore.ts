import { create } from 'zustand';
import type { BattleStore } from './types';
import { createNavigationSlice } from './slices/navigationSlice';
import { createArmySlice } from './slices/armySlice';
import { createCustomUnitsSlice } from './slices/customUnitsSlice';
import { createSimulationSlice } from './slices/simulationSlice';

// Re-export types that components depend on
export type { ArmyUnit, UnitSpellState } from './slices/armySlice';
export type { Screen } from './slices/navigationSlice';

export const useBattleStore = create<BattleStore>()((...a) => ({
  ...createNavigationSlice(...a),
  ...createArmySlice(...a),
  ...createCustomUnitsSlice(...a),
  ...createSimulationSlice(...a),
}));
