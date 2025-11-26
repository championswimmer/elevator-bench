export interface SimulatorConfig {
  floors: number;
  elevators: number;
  floorHeightPx: number;
  tickMs: number;
  doorHoldMs: number;
}

export const DEFAULT_CONFIG: SimulatorConfig = {
  floors: 10,
  elevators: 4,
  floorHeightPx: 64,
  tickMs: 800,
  doorHoldMs: 1200,
};
