import { Elevator } from './elevator';
import { Floor } from './floor';
import { Direction, BuildingConfig, DEFAULT_CONFIG, ExternalRequest } from './types';

export class Building {
    private config: BuildingConfig;
    private floors: Map<number, Floor>;
    private elevators: Map<number, Elevator>;
    private pendingRequests: ExternalRequest[];
    private isProcessing: boolean;
    
    // Callbacks
    private onElevatorStateChange?: (elevatorId: number, state: any) => void;
    private onElevatorMovement?: (elevatorId: number, fromFloor: number, toFloor: number) => void;
    private onRequestAssigned?: (request: ExternalRequest, elevatorId: number) => void;
    private onRequestCompleted?: (request: ExternalRequest) => void;
    private onQueueUpdate?: (requests: ExternalRequest[]) => void;
    
    constructor(config: Partial<BuildingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.floors = new Map();
        this.elevators = new Map();
        this.pendingRequests = [];
        this.isProcessing = false;
        
        this.initializeFloors();
        this.initializeElevators();
    }
    
    // Initialize all floors
    private initializeFloors(): void {
        for (let i = 0; i < this.config.totalFloors; i++) {
            const isGroundFloor = i === 0;
            const isTopFloor = i === this.config.totalFloors - 1;
            
            const floor = new Floor(i, isGroundFloor, isTopFloor);
            
            // Set up callbacks for floor button presses
            floor.setUpRequestCallback(() => this.handleExternalRequest(i, Direction.UP));
            floor.setDownRequestCallback(() => this.handleExternalRequest(i, Direction.DOWN));
            
            this.floors.set(i, floor);
        }
    }
    
    // Initialize all elevators
    private initializeElevators(): void {
        for (let i = 0; i < this.config.totalElevators; i++) {
            const elevator = new Elevator(i, {
                moveDuration: this.config.moveDuration,
                doorOpenDuration: this.config.doorOpenDuration
            });
            
            // Set up callbacks
            elevator.setStateChangeCallback((elev) => {
                this.onElevatorStateChange?.(elev.getId(), elev.getState());
            });
            
            elevator.setMovementStartCallback((elev, targetFloor) => {
                this.onElevatorMovement?.(elev.getId(), elev.getCurrentFloor(), targetFloor);
                // Start processing elevator movement
                this.processElevatorMovement(elev);
            });
            
            this.elevators.set(i, elevator);
        }
    }
    
    // Set callbacks
    setElevatorStateChangeCallback(callback: (elevatorId: number, state: any) => void): void {
        this.onElevatorStateChange = callback;
    }
    
    setElevatorMovementCallback(callback: (elevatorId: number, fromFloor: number, toFloor: number) => void): void {
        this.onElevatorMovement = callback;
    }
    
    setRequestAssignedCallback(callback: (request: ExternalRequest, elevatorId: number) => void): void {
        this.onRequestAssigned = callback;
    }
    
    setRequestCompletedCallback(callback: (request: ExternalRequest) => void): void {
        this.onRequestCompleted = callback;
    }
    
    setQueueUpdateCallback(callback: (requests: ExternalRequest[]) => void): void {
        this.onQueueUpdate = callback;
    }
    
    // Handle external request from floor button
    private handleExternalRequest(floor: number, direction: Direction): void {
        const request: ExternalRequest = {
            floor,
            direction,
            timestamp: Date.now(),
            assignedElevatorId: null
        };
        
        // Add to pending requests
        this.pendingRequests.push(request);
        
        // Try to assign to an elevator
        this.assignRequestToElevator(request);
        
        this.onQueueUpdate?.(this.pendingRequests);
    }
    
    // Assign a request to the best available elevator
    private assignRequestToElevator(request: ExternalRequest): void {
        // Find the best elevator for this request
        const bestElevator = this.findBestElevator(request);
        
        if (bestElevator) {
            request.assignedElevatorId = bestElevator.getId();
            
            // Add the floor to the elevator's internal requests
            bestElevator.addInternalRequest(request.floor);
            
            this.onRequestAssigned?.(request, bestElevator.getId());
        }
    }
    
    // Find the best elevator for a request
    private findBestElevator(request: ExternalRequest): Elevator | null {
        let bestElevator: Elevator | null = null;
        let bestScore = Infinity;
        
        for (const elevator of this.elevators.values()) {
            const score = this.calculateElevatorScore(elevator, request);
            
            if (score < bestScore) {
                bestScore = score;
                bestElevator = elevator;
            }
        }
        
        return bestElevator;
    }
    
    // Calculate a score for how well an elevator can serve a request
    // Lower score is better
    private calculateElevatorScore(elevator: Elevator, request: ExternalRequest): number {
        const elevatorFloor = elevator.getCurrentFloor();
        const requestFloor = request.floor;
        const requestDirection = request.direction;
        const elevatorDirection = elevator.getDirection();
        
        // Base score is distance
        let score = Math.abs(elevatorFloor - requestFloor);
        
        // If elevator is idle, just use distance
        if (elevator.isIdle()) {
            return score;
        }
        
        // If elevator is moving in the same direction as the request
        if (elevatorDirection === requestDirection) {
            // Check if request is in the direction of travel
            if (requestDirection === Direction.UP && requestFloor >= elevatorFloor) {
                // Request is ahead in direction of travel - good!
                return score * 0.5;
            } else if (requestDirection === Direction.DOWN && requestFloor <= elevatorFloor) {
                // Request is ahead in direction of travel - good!
                return score * 0.5;
            }
        }
        
        // If elevator is moving away from request, penalize
        if (requestDirection === Direction.UP && elevatorDirection === Direction.DOWN) {
            score *= 2;
        } else if (requestDirection === Direction.DOWN && elevatorDirection === Direction.UP) {
            score *= 2;
        }
        
        return score;
    }
    
    // Process elevator movement
    private async processElevatorMovement(elevator: Elevator): Promise<void> {
        const totalFloors = this.config.totalFloors;
        
        while (true) {
            const nextFloor = elevator.getNextFloor(totalFloors);
            
            if (nextFloor === null) {
                // No more requests, go idle
                elevator.clearInternalRequests();
                break;
            }
            
            // Move to next floor
            await elevator.moveToFloor(nextFloor);
            
            // Open doors
            await elevator.openDoors();
            
            // Clear the request
            elevator.removeInternalRequest(nextFloor);
            
            // Clear the corresponding floor button
            this.clearFloorRequest(nextFloor, 
                nextFloor > elevator.getCurrentFloor() ? Direction.UP : Direction.DOWN
            );
            
            // Check if we should change direction
            const remainingRequests = elevator.getInternalRequests();
            if (remainingRequests.length === 0) {
                break;
            }
        }
        
        // Update pending requests
        this.updatePendingRequests();
    }
    
    // Clear floor button request
    private clearFloorRequest(floor: number, direction: Direction): void {
        const floorObj = this.floors.get(floor);
        if (floorObj) {
            if (direction === Direction.UP) {
                floorObj.clearUpRequest();
            } else {
                floorObj.clearDownRequest();
            }
        }
    }
    
    // Update pending requests list
    private updatePendingRequests(): void {
        // Remove completed requests
        this.pendingRequests = this.pendingRequests.filter(req => {
            const floorObj = this.floors.get(req.floor);
            if (!floorObj) return false;
            
            const stillActive = req.direction === Direction.UP 
                ? floorObj.isUpRequestActive() 
                : floorObj.isDownRequestActive();
            
            if (!stillActive) {
                this.onRequestCompleted?.(req);
            }
            
            return stillActive;
        });
        
        this.onQueueUpdate?.(this.pendingRequests);
    }
    
    // Getters
    getFloors(): Map<number, Floor> {
        return this.floors;
    }
    
    getElevators(): Map<number, Elevator> {
        return this.elevators;
    }
    
    getConfig(): BuildingConfig {
        return this.config;
    }
    
    getPendingRequests(): ExternalRequest[] {
        return [...this.pendingRequests];
    }
    
    // Add internal request from elevator button
    addInternalRequest(elevatorId: number, floor: number): boolean {
        const elevator = this.elevators.get(elevatorId);
        if (elevator) {
            return elevator.addInternalRequest(floor);
        }
        return false;
    }
    
    // Get floor by number
    getFloor(floorNumber: number): Floor | undefined {
        return this.floors.get(floorNumber);
    }
    
    // Get elevator by id
    getElevator(elevatorId: number): Elevator | undefined {
        return this.elevators.get(elevatorId);
    }
}
