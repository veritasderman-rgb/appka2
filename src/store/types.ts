import type { NavigationSlice } from './slices/navigationSlice';
import type { ArmySlice } from './slices/armySlice';
import type { CustomUnitsSlice } from './slices/customUnitsSlice';
import type { SimulationSlice } from './slices/simulationSlice';

/** Full store type composed from all slices */
export type BattleStore = NavigationSlice & ArmySlice & CustomUnitsSlice & SimulationSlice;
