import { Floor } from './Floor';
import { Elevator, ElevatorState, RequestType } from './Elevator';

/**
 * Building configuration constants
 */
export const TOTAL_FLOORS = 10; // floors 0-9
export const TOTAL_ELEVATORS = 4; // elevators 0-3
export const ELEVATOR_MOVE_TIME = 500; // ms per floor movement

/**
 * Request interface for the queue
 */
export interface ElevatorRequest {
    floor: number;
    requestType: RequestType;
    timestamp: number;
    elevatorId?: number;
}

/**
 * Building class managing all floors and elevators
 */
export class Building {
    private floors: Floor[] = [];
    private elevators: Elevator[] = [];
    private requestQueue: ElevatorRequest[] = [];
    private isProcessingQueue: boolean = false;

    constructor() {
        // Initialize floors (0-9)
        for (let i = 0; i < TOTAL_FLOORS; i++) {
            this.floors.push(new Floor(i));
        }

        // Initialize elevators
        for (let i = 0; i < TOTAL_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i, 0));
        }
    }

    /**
     * Get all floors
     */
    getFloors(): Floor[] {
        return this.floors;
    }

    /**
     * Get floor by number
     */
    getFloor(floorNumber: number): Floor | undefined {
        return this.floors[floorNumber];
    }

    /**
     * Get all elevators
     */
    getElevators(): Elevator[] {
        return this.elevators;
    }

    /**
     * Get elevator by ID
     */
    getElevator(elevatorId: number): Elevator | undefined {
        return this.elevators[elevatorId];
    }

    /**
     * Get total number of floors
     */
    getTotalFloors(): number {
        return TOTAL_FLOORS;
    }

    /**
     * Get total number of elevators
     */
     getTotalElevators(): number {
        return TOTAL_ELEVATORS;
    }

    /**
     * Get elevator move time per floor
     */
    getElevatorMoveTime(): number {
        return ELEVATOR_MOVE_TIME;
    }

    /**
     * Find the best elevator for a request
     */
    findBestElevator(request: ElevatorRequest): Elevator | null {
        let bestElevator: Elevator | null = null;
        let bestScore = Infinity;

        for (const elevator of this.elevators) {
            let score = 0;

            // If elevator is idle, prioritize it
            if (elevator.getState() === ElevatorState.IDLE) {
                score = elevator.getDistanceToFloor(request.floor);
            }
            // If elevator is going in the right direction
            else if (elevator.isGoingInDirection(request.floor)) {
                score = elevator.getDistanceToFloor(request.floor) * 0.5; // Prefer same direction
            }
            // If elevator is going opposite direction
            else {
                score = elevator.getDistanceToFloor(request.floor) * 2; // Penalize opposite direction
            }

            // Add some randomization to avoid always picking the same elevator
            score += Math.random() * 2;

            if (score < bestScore) {
                bestScore = score;
                bestElevator = elevator;
            }
        }

        return bestElevator;
    }

    /**
     * Add a floor request
     */
    addFloorRequest(floor: number, requestType: RequestType): void {
        const request: ElevatorRequest = {
            floor,
            requestType,
            timestamp: Date.now()
        };

        // Check if request already exists
        const existingRequest = this.requestQueue.find(
            r => r.floor === floor && r.requestType === requestType
        );

        if (!existingRequest) {
            this.requestQueue.push(request);
            this.processQueue();
        }
    }

    /**
     * Process the request queue
     */
    private processQueue(): void {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        // Sort queue by timestamp (first come, first served)
        this.requestQueue.sort((a, b) => a.timestamp - b.timestamp);

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue[0];
            const bestElevator = this.findBestElevator(request);

            if (bestElevator) {
                // Assign request to elevator
                request.elevatorId = bestElevator.getElevatorId();
                bestElevator.addTargetFloor(request.floor);

                // Remove from queue
                this.requestQueue.shift();
            } else {
                break; // No available elevator
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Handle elevator arrival at a floor
     */
    handleElevatorArrival(elevatorId: number, floor: number): void {
        const elevator = this.getElevator(elevatorId);
        if (!elevator) return;

        // Remove floor from targets
        elevator.removeTargetFloor(floor);

        // Update floor button states
        const floorObj = this.getFloor(floor);
        if (floorObj) {
            floorObj.resetButtons();
        }

        // If elevator still has targets, continue moving
        if (elevator.getTargetFloors().size > 0) {
            const nextTarget = elevator.getNextTargetFloor();
            if (nextTarget !== null) {
                if (nextTarget > elevator.getCurrentFloor()) {
                    elevator.setState(ElevatorState.MOVING_UP);
                    elevator.setDirection(1);
                } else if (nextTarget < elevator.getCurrentFloor()) {
                    elevator.setState(ElevatorState.MOVING_DOWN);
                    elevator.setDirection(-1);
                }
            }
        } else {
            elevator.setState(ElevatorState.IDLE);
            elevator.setDirection(0);
        }

        // Process queue in case other requests are waiting
        this.processQueue();
    }

    /**
     * Get current request queue
     */
    getRequestQueue(): ElevatorRequest[] {
        return this.requestQueue;
    }

    /**
     * Reset the entire building
     */
    reset(): void {
        this.requestQueue = [];

        for (const elevator of this.elevators) {
            elevator.reset();
        }

        for (const floor of this.floors) {
            floor.resetButtons();
        }
    }

    /**
     * Get statistics
     */
    getStats(): { totalElevators: number; busyElevators: number; idleElevators: number; queuedRequests: number; totalFloors: number } {
        const busyElevators = this.elevators.filter(e => e.isElevatorBusy()).length;

        return {
            totalElevators: TOTAL_ELEVATORS,
            busyElevators,
            idleElevators: TOTAL_ELEVATORS - busyElevators,
            queuedRequests: this.requestQueue.length,
            totalFloors: TOTAL_FLOORS
        };
    }
}
