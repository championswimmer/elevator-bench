export enum Direction {
  Down = -1,
  Idle = 0,
  Up = 1,
}

export enum ElevatorState {
  Idle = "IDLE",
  Moving = "MOVING",
  Loading = "LOADING",
}

export interface FloorRequest {
  floor: number;
  direction: Direction;
}
