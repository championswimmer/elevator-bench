export enum Direction {
    UP = 'up',
    DOWN = 'down',
    IDLE = 'idle'
}

export enum ElevatorState {
    IDLE = 'idle',
    MOVING = 'moving',
    LOADING = 'loading'
}

export interface FloorRequest {
    floor: number;
    direction: Direction;
}

export const CONFIG = {
    FLOOR_COUNT: 10,
    ELEVATOR_COUNT: 4,
    FLOOR_HEIGHT: 80, // pixels
    ELEVATOR_SPEED: 1000, // ms per floor
    LOADING_TIME: 2000, // ms
    PORT: 8623
};