// Types and enums for the Elevator Simulator

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  IDLE = 'idle'
}

export enum ElevatorState {
  IDLE = 'idle',
  MOVING = 'moving',
  DOORS_OPEN = 'doors_open'
}

export interface FloorRequest {
  floor: number;
  direction: Direction.UP | Direction.DOWN;
  timestamp: number;
}

export interface ElevatorRequest {
  targetFloor: number;
  timestamp: number;
}

export const CONFIG = {
  NUM_FLOORS: 10,
  NUM_ELEVATORS: 4,
  FLOOR_TRAVEL_TIME: 1000, // ms to travel one floor
  DOOR_OPEN_TIME: 2000,    // ms doors stay open
  ANIMATION_DURATION: 800   // ms for smooth animation
};
