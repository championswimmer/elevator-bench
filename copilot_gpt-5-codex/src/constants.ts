import type { BuildingOptions } from './types.ts';

export const DEFAULT_BUILDING_OPTIONS: BuildingOptions = {
  totalFloors: 10,
  elevatorCount: 4,
  secondsPerFloor: 1.2,
  doorHoldSeconds: 1.4,
  floorHeight: 72,
  pendingRequestInterval: 500,
};
