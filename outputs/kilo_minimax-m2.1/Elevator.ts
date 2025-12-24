import { Floor } from './Floor';

/**
 * Elevator state enum
 */
export enum ElevatorState {
    IDLE = 'idle',
    MOVING_UP = 'moving_up',
    MOVING_DOWN = 'moving_down'
}

/**
 * Request type enum
 */
export enum RequestType {
    FLOOR_REQUEST = 'floor_request',
    UP_REQUEST = 'up_request',
    DOWN_REQUEST = 'down_request'
}

/**
 * Elevator class representing an elevator car
 */
export class Elevator {
    private elevatorId: number;
    private currentFloor: number;
    private targetFloors: Set<number> = new Set();
    private state: ElevatorState = ElevatorState.IDLE;
    private isBusy: boolean = false;
    private direction: number = 0; // 1 for up, -1 for down, 0 for idle

    constructor(elevatorId: number, startFloor: number = 0) {
        this.elevatorId = elevatorId;
        this.currentFloor = startFloor;
    }

    /**
     * Get elevator ID
     */
    getElevatorId(): number {
        return this.elevatorId;
    }

    /**
     * Get current floor
     */
    getCurrentFloor(): number {
        return this.currentFloor;
    }

    /**
     * Set current floor
     */
    setCurrentFloor(floor: number): void {
        this.currentFloor = floor;
    }

    /**
     * Get elevator state
     */
    getState(): ElevatorState {
        return this.state;
    }

    /**
     * Set elevator state
     */
    setState(state: ElevatorState): void {
        this.state = state;
    }

    /**
     * Get direction (1=up, -1=down, 0=idle)
     */
    getDirection(): number {
        return this.direction;
    }

    /**
     * Set direction
     */
    setDirection(direction: number): void {
        this.direction = direction;
    }

    /**
     * Check if elevator is busy
     */
    isElevatorBusy(): boolean {
        return this.isBusy;
    }

    /**
     * Set busy state
     */
    setBusy(busy: boolean): void {
        this.isBusy = busy;
    }

    /**
     * Add a target floor to visit
     */
    addTargetFloor(floor: number): void {
        this.targetFloors.add(floor);
        if (!this.isBusy) {
            this.isBusy = true;
        }
    }

    /**
     * Remove a target floor
     */
    removeTargetFloor(floor: number): void {
        this.targetFloors.delete(floor);
        if (this.targetFloors.size === 0) {
            this.isBusy = false;
            this.state = ElevatorState.IDLE;
            this.direction = 0;
        }
    }

    /**
     * Get all target floors
     */
    getTargetFloors(): Set<number> {
        return this.targetFloors;
    }

    /**
     * Check if elevator should stop at a floor
     */
    shouldStopAt(floor: number): boolean {
        return this.targetFloors.has(floor);
    }

    /**
     * Get next target floor based on current direction
     */
    getNextTargetFloor(): number | null {
        if (this.targetFloors.size === 0) return null;

        const targets = Array.from(this.targetFloors).sort((a, b) => a - b);

        if (this.direction === 1) {
            // Moving up - find closest floor above current
            for (const floor of targets) {
                if (floor >= this.currentFloor) {
                    return floor;
                }
            }
            return targets[0]; // Return lowest if no floor above
        } else if (this.direction === -1) {
            // Moving down - find closest floor below current
            for (let i = targets.length - 1; i >= 0; i--) {
                if (targets[i] <= this.currentFloor) {
                    return targets[i];
                }
            }
            return targets[targets.length - 1]; // Return highest if no floor below
        }

        return targets[0];
    }

    /**
     * Calculate distance to a target floor
     */
    getDistanceToFloor(floor: number): number {
        return Math.abs(floor - this.currentFloor);
    }

    /**
     * Check if elevator is going in the requested direction
     */
    isGoingInDirection(requestedFloor: number): boolean {
        if (this.direction === 0) return true;
        if (requestedFloor > this.currentFloor && this.direction === 1) return true;
        if (requestedFloor < this.currentFloor && this.direction === -1) return true;
        return false;
    }

    /**
     * Reset elevator to initial state
     */
    reset(): void {
        this.targetFloors.clear();
        this.currentFloor = 0;
        this.state = ElevatorState.IDLE;
        this.isBusy = false;
        this.direction = 0;
    }

    /**
     * Get status display string
     */
    getStatusString(): string {
        switch (this.state) {
            case ElevatorState.IDLE:
                return 'Idle';
            case ElevatorState.MOVING_UP:
                return 'Moving Up';
            case ElevatorState.MOVING_DOWN:
                return 'Moving Down';
            default:
                return 'Unknown';
        }
    }
}
