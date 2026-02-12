export const NUM_FLOORS = 10;
export const NUM_ELEVATORS = 4;
export const FLOOR_HEIGHT = 80;
export const DOOR_OPEN_TIME = 1000;
export const DOOR_CLOSE_TIME = 500;
export const FLOOR_TRAVEL_TIME = 500;

export enum Direction {
    Up = 'up',
    Down = 'down',
    None = 'idle'
}

export enum ElevatorState {
    Idle = 'idle',
    Moving = 'moving',
    DoorsOpen = 'doors_open'
}

export interface FloorRequest {
    floor: number;
    direction: Direction;
}

export interface ElevatorRequest {
    elevatorId: number;
    targetFloor: number;
}
