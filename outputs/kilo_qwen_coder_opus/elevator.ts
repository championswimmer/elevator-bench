import { Direction, RequestType } from './types';

export interface ElevatorState {
    id: number;
    currentFloor: number;
    direction: Direction | null;
    status: 'idle' | 'moving' | 'door_open';
    internalRequests: Set<number>;
    isMoving: boolean;
}

export class Elevator {
    private id: number;
    private currentFloor: number;
    private direction: Direction | null;
    private status: 'idle' | 'moving' | 'door_open';
    private internalRequests: Set<number>;
    private isMoving: boolean;
    private moveDuration: number;
    private doorOpenDuration: number;
    
    // Callbacks
    private onStateChange?: (elevator: Elevator) => void;
    private onMovementStart?: (elevator: Elevator, targetFloor: number) => void;
    private onMovementComplete?: (elevator: Elevator) => void;
    
    constructor(
        id: number,
        options: {
            moveDuration?: number;
            doorOpenDuration?: number;
        } = {}
    ) {
        this.id = id;
        this.currentFloor = 0; // Start at ground floor
        this.direction = null;
        this.status = 'idle';
        this.internalRequests = new Set();
        this.isMoving = false;
        this.moveDuration = options.moveDuration || 500;
        this.doorOpenDuration = options.doorOpenDuration || 300;
    }
    
    // Getters
    getId(): number {
        return this.id;
    }
    
    getCurrentFloor(): number {
        return this.currentFloor;
    }
    
    getDirection(): Direction | null {
        return this.direction;
    }
    
    getStatus(): 'idle' | 'moving' | 'door_open' {
        return this.status;
    }
    
    getInternalRequests(): number[] {
        return Array.from(this.internalRequests).sort((a, b) => a - b);
    }
    
    isIdle(): boolean {
        return this.status === 'idle' && !this.isMoving;
    }
    
    isBusy(): boolean {
        return this.status !== 'idle' || this.isMoving || this.internalRequests.size > 0;
    }
    
    // Set callbacks
    setStateChangeCallback(callback: (elevator: Elevator) => void): void {
        this.onStateChange = callback;
    }
    
    setMovementStartCallback(callback: (elevator: Elevator, targetFloor: number) => void): void {
        this.onMovementStart = callback;
    }
    
    setMovementCompleteCallback(callback: (elevator: Elevator) => void): void {
        this.onMovementComplete = callback;
    }
    
    // Add internal request (button press inside elevator)
    addInternalRequest(floor: number): boolean {
        if (floor === this.currentFloor) {
            return false;
        }
        if (this.internalRequests.has(floor)) {
            return false;
        }
        
        this.internalRequests.add(floor);
        this.notifyStateChange();
        return true;
    }
    
    // Remove internal request
    removeInternalRequest(floor: number): void {
        this.internalRequests.delete(floor);
    }
    
    // Clear all internal requests
    clearInternalRequests(): void {
        this.internalRequests.clear();
    }
    
    // Check if has request for a specific floor
    hasRequestForFloor(floor: number): boolean {
        return this.internalRequests.has(floor);
    }
    
    // Get next floor to visit based on current direction
    getNextFloor(totalFloors: number): number | null {
        if (this.internalRequests.size === 0) {
            return null;
        }
        
        const requests = this.internalRequests;
        
        if (this.direction === Direction.UP) {
            // Find highest floor above current floor
            let nextFloor = null;
            for (const floor of requests) {
                if (floor > this.currentFloor) {
                    if (nextFloor === null || floor < nextFloor) {
                        nextFloor = floor;
                    }
                }
            }
            
            // If no floors above, go to highest floor below
            if (nextFloor === null) {
                this.direction = Direction.DOWN;
                nextFloor = Math.max(...requests);
            }
            return nextFloor;
        } else if (this.direction === Direction.DOWN) {
            // Find lowest floor below current floor
            let nextFloor = null;
            for (const floor of requests) {
                if (floor < this.currentFloor) {
                    if (nextFloor === null || floor > nextFloor) {
                        nextFloor = floor;
                    }
                }
            }
            
            // If no floors below, go to lowest floor above
            if (nextFloor === null) {
                this.direction = Direction.UP;
                nextFloor = Math.min(...requests);
            }
            return nextFloor;
        } else {
            // No direction set - determine based on requests
            const floorsAbove = Array.from(requests).filter(f => f > this.currentFloor);
            const floorsBelow = Array.from(requests).filter(f => f < this.currentFloor);
            
            if (floorsAbove.length > 0) {
                this.direction = Direction.UP;
                return Math.min(...floorsAbove);
            } else if (floorsBelow.length > 0) {
                this.direction = Direction.DOWN;
                return Math.max(...floorsBelow);
            }
            return null;
        }
    }
    
    // Move to a floor (returns Promise that resolves when movement is complete)
    async moveToFloor(targetFloor: number): Promise<void> {
        if (targetFloor === this.currentFloor) {
            return;
        }
        
        this.isMoving = true;
        this.status = 'moving';
        this.direction = targetFloor > this.currentFloor ? Direction.UP : Direction.DOWN;
        
        this.notifyStateChange();
        this.onMovementStart?.(this, targetFloor);
        
        // Calculate movement time based on distance
        const distance = Math.abs(targetFloor - this.currentFloor);
        const moveTime = distance * this.moveDuration;
        
        // Wait for movement to complete
        await new Promise(resolve => setTimeout(resolve, moveTime));
        
        this.currentFloor = targetFloor;
        this.isMoving = false;
        this.notifyStateChange();
        this.onMovementComplete?.(this);
    }
    
    // Open doors
    async openDoors(): Promise<void> {
        this.status = 'door_open';
        this.notifyStateChange();
        await new Promise(resolve => setTimeout(resolve, this.doorOpenDuration));
    }
    
    // Close doors and process next request
    async closeDoorsAndContinue(totalFloors: number): Promise<void> {
        this.status = this.internalRequests.size > 0 ? 'moving' : 'idle';
        
        // Process requests
        while (this.internalRequests.size > 0) {
            const nextFloor = this.getNextFloor(totalFloors);
            if (nextFloor === null) break;
            
            await this.moveToFloor(nextFloor);
            await this.openDoors();
            this.removeInternalRequest(nextFloor);
        }
        
        // Reset direction if idle
        if (this.internalRequests.size === 0) {
            this.direction = null;
            this.status = 'idle';
        }
        
        this.notifyStateChange();
    }
    
    // Get distance from a floor
    getDistanceFromFloor(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }
    
    // Check if elevator can serve a request efficiently
    canServeRequest(floor: number, direction: Direction): boolean {
        if (this.isIdle()) {
            return true;
        }
        
        // If moving in same direction as request
        if (this.direction === direction) {
            // Check if request is in the direction of travel
            if (direction === Direction.UP && floor >= this.currentFloor) {
                return true;
            }
            if (direction === Direction.DOWN && floor <= this.currentFloor) {
                return true;
            }
        }
        
        return false;
    }
    
    // Get state as object
    getState(): ElevatorState {
        return {
            id: this.id,
            currentFloor: this.currentFloor,
            direction: this.direction,
            status: this.status,
            internalRequests: new Set(this.internalRequests),
            isMoving: this.isMoving
        };
    }
    
    private notifyStateChange(): void {
        this.onStateChange?.(this);
    }
}
