export enum ElevatorDirection {
    UP = 'up',
    DOWN = 'down',
    IDLE = 'idle'
}

export enum ElevatorStatus {
    IDLE = 'idle',
    MOVING = 'moving',
    BUSY = 'busy',
    EMERGENCY = 'emergency'
}

export interface ElevatorRequest {
    floor: number;
    direction: ElevatorDirection;
    timestamp: number;
}

export class Elevator {
    public id: number;
    public currentFloor: number;
    public direction: ElevatorDirection;
    public status: ElevatorStatus;
    public targetFloors: Set<number>;
    public destinationQueue: number[];
    public onStatusChange?: (elevator: Elevator) => void;
    public onFloorChange?: (elevator: Elevator, floor: number) => void;
    
    private requestQueue: ElevatorRequest[];
    private isMoving: boolean;
    private animationSpeed: number;

    constructor(id: number, initialFloor: number = 0, animationSpeed: number = 500) {
        this.id = id;
        this.currentFloor = initialFloor;
        this.direction = ElevatorDirection.IDLE;
        this.status = ElevatorStatus.IDLE;
        this.targetFloors = new Set<number>();
        this.destinationQueue = [];
        this.requestQueue = [];
        this.isMoving = false;
        this.animationSpeed = animationSpeed;
    }

    /**
     * Add a floor request to the elevator
     */
    public addRequest(request: ElevatorRequest): void {
        // Avoid duplicate requests
        if (!this.requestQueue.find(r => r.floor === request.floor && r.direction === request.direction)) {
            this.requestQueue.push(request);
            this.sortRequests();
            this.updateStatus();
        }
    }

    /**
     * Sort requests based on elevator direction and current position
     */
    private sortRequests(): void {
        if (this.requestQueue.length <= 1) return;

        const currentPos = this.currentFloor;
        const goingUp = this.direction === ElevatorDirection.UP;
        const goingDown = this.direction === ElevatorDirection.DOWN;

        // First, separate requests by direction
        const upRequests = this.requestQueue.filter(r => r.direction === ElevatorDirection.UP);
        const downRequests = this.requestQueue.filter(r => r.direction === ElevatorDirection.DOWN);

        this.requestQueue = [];

        if (goingUp || this.direction === ElevatorDirection.IDLE) {
            // Prioritize requests in the current direction
            const sameDirectionUp = upRequests.filter(r => r.floor >= currentPos);
            const oppositeDirectionUp = upRequests.filter(r => r.floor < currentPos);
            const otherDirectionUp = goingUp ? downRequests : [...downRequests, ...upRequests.filter(r => r.floor < currentPos)];

            this.requestQueue.push(
                ...sameDirectionUp.sort((a, b) => a.floor - b.floor),
                ...oppositeDirectionUp.sort((a, b) => b.floor - a.floor),
                ...otherDirectionUp.sort((a, b) => b.floor - a.floor)
            );
        } else if (goingDown) {
            const sameDirectionDown = downRequests.filter(r => r.floor <= currentPos);
            const oppositeDirectionDown = downRequests.filter(r => r.floor > currentPos);
            const otherDirectionDown = [...upRequests, ...downRequests.filter(r => r.floor > currentPos)];

            this.requestQueue.push(
                ...sameDirectionDown.sort((a, b) => b.floor - a.floor),
                ...oppositeDirectionDown.sort((a, b) => a.floor - b.floor),
                ...otherDirectionDown.sort((a, b) => a.floor - b.floor)
            );
        }
    }

    /**
     * Start processing the next request
     */
    public processNextRequest(): Promise<void> {
        if (this.requestQueue.length === 0 || this.isMoving) {
            return Promise.resolve();
        }

        const request = this.requestQueue.shift()!;
        this.isMoving = true;
        this.status = ElevatorStatus.MOVING;
        
        if (this.onStatusChange) {
            this.onStatusChange(this);
        }

        // Determine direction
        if (request.floor > this.currentFloor) {
            this.direction = ElevatorDirection.UP;
        } else if (request.floor < this.currentFloor) {
            this.direction = ElevatorDirection.DOWN;
        }

        return this.moveToFloor(request.floor).then(() => {
            this.isMoving = false;
            this.targetFloors.delete(request.floor);
            
            // Check if there are more requests in the same direction
            if (this.shouldContinueDirection()) {
                this.processNextRequest();
            } else {
                this.direction = ElevatorDirection.IDLE;
                this.status = ElevatorStatus.IDLE;
                if (this.onStatusChange) {
                    this.onStatusChange(this);
                }
            }
        });
    }

    /**
     * Move elevator to target floor
     */
    private moveToFloor(targetFloor: number): Promise<void> {
        return new Promise((resolve) => {
            const step = targetFloor > this.currentFloor ? 1 : -1;
            
            const animateStep = () => {
                if ((step > 0 && this.currentFloor >= targetFloor) || 
                    (step < 0 && this.currentFloor <= targetFloor)) {
                    // Arrived at destination
                    this.currentFloor = targetFloor;
                    if (this.onFloorChange) {
                        this.onFloorChange(this, this.currentFloor);
                    }
                    resolve();
                    return;
                }

                // Move one floor
                this.currentFloor += step;
                if (this.onFloorChange) {
                    this.onFloorChange(this, this.currentFloor);
                }

                setTimeout(animateStep, this.animationSpeed);
            };

            animateStep();
        });
    }

    /**
     * Determine if elevator should continue in current direction
     */
    private shouldContinueDirection(): boolean {
        if (this.requestQueue.length === 0) return false;

        if (this.direction === ElevatorDirection.UP) {
            return this.requestQueue.some(r => r.floor >= this.currentFloor);
        } else if (this.direction === ElevatorDirection.DOWN) {
            return this.requestQueue.some(r => r.floor <= this.currentFloor);
        }

        return false;
    }

    /**
     * Check if elevator is at a specific floor
     */
    public isAtFloor(floor: number): boolean {
        return this.currentFloor === floor;
    }

    /**
     * Get the nearest idle elevator distance
     */
    public getDistanceToFloor(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }

    /**
     * Check if elevator can handle a request in a given direction
     */
    public canHandleRequest(floor: number, direction: ElevatorDirection): boolean {
        if (this.status === ElevatorStatus.EMERGENCY) return false;

        if (this.status === ElevatorStatus.IDLE) return true;

        if (this.direction === direction) {
            if (direction === ElevatorDirection.UP && floor >= this.currentFloor) return true;
            if (direction === ElevatorDirection.DOWN && floor <= this.currentFloor) return true;
        }

        return false;
    }

    /**
     * Emergency stop
     */
    public emergencyStop(): void {
        this.status = ElevatorStatus.EMERGENCY;
        this.requestQueue = [];
        this.isMoving = false;
        if (this.onStatusChange) {
            this.onStatusChange(this);
        }
    }

    /**
     * Reset elevator to normal operation
     */
    public reset(): void {
        if (this.status === ElevatorStatus.EMERGENCY) {
            this.status = ElevatorStatus.IDLE;
            this.direction = ElevatorDirection.IDLE;
            this.isMoving = false;
            if (this.onStatusChange) {
                this.onStatusChange(this);
            }
        }
    }

    /**
     * Update elevator status
     */
    private updateStatus(): void {
        if (this.status === ElevatorStatus.EMERGENCY) return;

        if (this.isMoving || this.requestQueue.length > 0) {
            if (this.requestQueue.length > 0) {
                this.status = this.isMoving ? ElevatorStatus.MOVING : ElevatorStatus.BUSY;
            } else {
                this.status = ElevatorStatus.IDLE;
                this.direction = ElevatorDirection.IDLE;
            }
        } else {
            this.status = ElevatorStatus.IDLE;
            this.direction = ElevatorDirection.IDLE;
        }

        if (this.onStatusChange) {
            this.onStatusChange(this);
        }
    }

    /**
     * Get current request count
     */
    public getRequestCount(): number {
        return this.requestQueue.length;
    }

    /**
     * Get elevator info for display
     */
    public getInfo(): {
        id: number;
        currentFloor: number;
        status: ElevatorStatus;
        direction: ElevatorDirection;
        requestCount: number;
    } {
        return {
            id: this.id,
            currentFloor: this.currentFloor,
            status: this.status,
            direction: this.direction,
            requestCount: this.requestQueue.length
        };
    }
}