// Direction enum for elevator movement
export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN'
}

// Request type enum
export enum RequestType {
    EXTERNAL = 'EXTERNAL',  // Request from floor button
    INTERNAL = 'INTERNAL'   // Request from inside elevator
}

// External request interface (from floor buttons)
export interface ExternalRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
    assignedElevatorId: number | null;
}

// Internal request interface (from inside elevator)
export interface InternalRequest {
    elevatorId: number;
    floor: number;
    timestamp: number;
}

// Elevator status enum
export enum ElevatorStatus {
    IDLE = 'idle',
    MOVING = 'moving',
    DOOR_OPEN = 'door_open'
}

// Building configuration interface
export interface BuildingConfig {
    totalFloors: number;
    totalElevators: number;
    moveDuration: number;  // milliseconds per floor
    doorOpenDuration: number;  // milliseconds doors stay open
}

// Default configuration
export const DEFAULT_CONFIG: BuildingConfig = {
    totalFloors: 10,
    totalElevators: 4,
    moveDuration: 500,
    doorOpenDuration: 300
};
