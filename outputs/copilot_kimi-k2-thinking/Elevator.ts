import { Direction, ElevatorState, FloorRequest, CONFIG } from './types';

export class Elevator {
    id: number;
    currentFloor: number;
    targetFloor: number;
    direction: Direction;
    state: ElevatorState;
    destinationRequests: Set<number>;
    floorRequests: FloorRequest[];
    isMoving: boolean;
    element: HTMLElement | null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloor = 0;
        this.direction = Direction.IDLE;
        this.state = ElevatorState.IDLE;
        this.destinationRequests = new Set();
        this.floorRequests = [];
        this.isMoving = false;
        this.element = null;
    }

    requestFloor(floor: number): void {
        if (floor === this.currentFloor && this.state === ElevatorState.IDLE) {
            this.state = ElevatorState.LOADING;
            setTimeout(() => {
                this.state = ElevatorState.IDLE;
                this.updateDisplay();
            }, CONFIG.LOADING_TIME);
            return;
        }

        this.destinationRequests.add(floor);
        this.processRequests();
    }

    requestPickup(request: FloorRequest): void {
        // Only add if elevator can service this request based on direction
        if (this.canServiceRequest(request)) {
            this.floorRequests.push(request);
            this.processRequests();
        }
    }

    canServiceRequest(request: FloorRequest): boolean {
        if (this.state === ElevatorState.IDLE) {
            return true;
        }

        // Check if elevator is moving in the same direction and will pass this floor
        if (this.direction === Direction.UP && request.direction === Direction.UP) {
            return request.floor > this.currentFloor;
        }

        if (this.direction === Direction.DOWN && request.direction === Direction.DOWN) {
            return request.floor < this.currentFloor;
        }

        return false;
    }

    processRequests(): void {
        if (this.isMoving || this.state === ElevatorState.LOADING) {
            return;
        }

        // Process destination requests first
        if (this.destinationRequests.size > 0) {
            const nextDestination = this.getNextDestination();
            if (nextDestination !== null) {
                this.moveToFloor(nextDestination);
                return;
            }
        }

        // Process floor requests
        if (this.floorRequests.length > 0) {
            const nextRequest = this.getNextFloorRequest();
            if (nextRequest) {
                this.moveToFloor(nextRequest.floor);
                // Remove the processed request
                this.floorRequests = this.floorRequests.filter(req => 
                    !(req.floor === nextRequest.floor && req.direction === nextRequest.direction)
                );
            }
        }
    }

    getNextDestination(): number | null {
        if (this.destinationRequests.size === 0) return null;

        const destinations = Array.from(this.destinationRequests);
        
        if (this.direction === Direction.IDLE) {
            // Find closest destination
            return destinations.reduce((closest, floor) => {
                const currentDist = Math.abs(floor - this.currentFloor);
                const closestDist = Math.abs(closest - this.currentFloor);
                return currentDist < closestDist ? floor : closest;
            });
        }

        // Continue in current direction
        const floorsInDirection = destinations.filter(floor => {
            if (this.direction === Direction.UP) return floor > this.currentFloor;
            if (this.direction === Direction.DOWN) return floor < this.currentFloor;
            return false;
        });

        if (floorsInDirection.length > 0) {
            return this.direction === Direction.UP 
                ? Math.min(...floorsInDirection)
                : Math.max(...floorsInDirection);
        }

        // No more floors in current direction, change direction
        this.direction = this.direction === Direction.UP ? Direction.DOWN : Direction.UP;
        return this.getNextDestination();
    }

    getNextFloorRequest(): FloorRequest | null {
        if (this.floorRequests.length === 0) return null;

        // Find requests that can be serviced in current direction
        const validRequests = this.floorRequests.filter(req => {
            if (this.direction === Direction.IDLE) return true;
            if (this.direction === Direction.UP) return req.floor > this.currentFloor;
            if (this.direction === Direction.DOWN) return req.floor < this.currentFloor;
            return false;
        });

        if (validRequests.length > 0) {
            // Find closest request
            return validRequests.reduce((closest, req) => {
                const currentDist = Math.abs(req.floor - this.currentFloor);
                const closestDist = Math.abs(closest.floor - this.currentFloor);
                return currentDist < closestDist ? req : closest;
            });
        }

        return null;
    }

    moveToFloor(targetFloor: number): void {
        if (this.currentFloor === targetFloor) {
            this.destinationRequests.delete(targetFloor);
            this.state = ElevatorState.LOADING;
            this.updateDisplay();
            
            setTimeout(() => {
                this.state = ElevatorState.IDLE;
                this.isMoving = false;
                this.updateDisplay();
                this.processRequests();
            }, CONFIG.LOADING_TIME);
            return;
        }

        this.isMoving = true;
        this.targetFloor = targetFloor;
        this.direction = targetFloor > this.currentFloor ? Direction.UP : Direction.DOWN;
        this.state = ElevatorState.MOVING;

        const distance = Math.abs(targetFloor - this.currentFloor);
        const travelTime = distance * CONFIG.ELEVATOR_SPEED;

        this.updateDisplay();
        this.animateMovement(targetFloor, travelTime);

        setTimeout(() => {
            this.currentFloor = targetFloor;
            this.destinationRequests.delete(targetFloor);
            this.state = ElevatorState.LOADING;
            this.updateDisplay();

            setTimeout(() => {
                this.state = ElevatorState.IDLE;
                this.isMoving = false;
                this.updateDisplay();
                this.processRequests();
            }, CONFIG.LOADING_TIME);
        }, travelTime);
    }

    animateMovement(targetFloor: number, duration: number): void {
        if (!this.element) return;

        const targetPosition = (CONFIG.FLOOR_COUNT - 1 - targetFloor) * CONFIG.FLOOR_HEIGHT;
        this.element.style.transition = `bottom ${duration}ms ease-in-out`;
        this.element.style.bottom = `${targetPosition}px`;
    }

    updateDisplay(): void {
        if (!this.element) return;

        const floorDisplay = this.element.querySelector('.floor-display');
        const statusDisplay = this.element.querySelector('.status');

        if (floorDisplay) {
            floorDisplay.textContent = `${this.currentFloor}`;
        }

        if (statusDisplay) {
            const statusText = this.state === ElevatorState.MOVING ? 
                `${this.direction === Direction.UP ? '↑' : '↓'}` : 
                this.state === ElevatorState.LOADING ? '○' : '';
            statusDisplay.textContent = statusText;
        }

        // Update direction indicator
        const directionIndicator = this.element.querySelector('.direction-indicator');
        if (directionIndicator) {
            directionIndicator.textContent = this.direction === Direction.UP ? '↑' : 
                                           this.direction === Direction.DOWN ? '↓' : '';
        }
    }

    setElement(element: HTMLElement): void {
        this.element = element;
        this.updateDisplay();
    }

    getDistanceToFloor(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }

    isAvailableForRequest(): boolean {
        return this.state === ElevatorState.IDLE || 
               (this.state === ElevatorState.MOVING && this.floorRequests.length < 3);
    }
}