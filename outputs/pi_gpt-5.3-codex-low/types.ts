export type Direction = -1 | 0 | 1;

export interface HallRequest {
  floor: number;
  direction: Direction;
}

export interface ElevatorSnapshot {
  id: number;
  currentFloor: number;
  direction: Direction;
  isMoving: boolean;
  targetsUp: number[];
  targetsDown: number[];
}
