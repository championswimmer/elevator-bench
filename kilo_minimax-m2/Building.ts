import { Elevator, ElevatorDirection, ElevatorRequest, ElevatorStatus } from './Elevator';
import { Floor } from './Floor';

export interface BuildingConfig {
    floors: number;
    elevators: number;
    animationSpeed: number;
}

export class Building {
    public config: BuildingConfig;
    public elevators: Elevator[];
    public floors: Floor[];
    public isRunning: boolean;
    public elevatorRequests: ElevatorRequest[];
    public onLogMessage?: (message: string, type?: 'info' | 'success' | 'error' | 'request' | 'elevator') => void;
    public onStatusUpdate?: () => void;
    
    private requestQueue: ElevatorRequest[];
    private assignmentInterval: number | null;

    constructor(config: BuildingConfig) {
        this.config = config;
        this.elevators = [];
        this.floors = [];
        this.isRunning = false;
        this.elevatorRequests = [];
        this.requestQueue = [];
        this.assignmentInterval = null;
    }

    /**
     * Initialize building with elevators and floors
     */
    public initialize(): void {
        this.createElevators();
        this.createFloors();
        this.setupFloorCallbacks();
        this.log('Building initialized successfully', 'success');
    }

    /**
     * Create elevator instances
     */
    private createElevators(): void {
        for (let i = 0; i < this.config.elevators; i++) {
            const elevator = new Elevator(i, 0, this.config.animationSpeed);
            this.setupElevatorCallbacks(elevator);
            this.elevators.push(elevator);
        }
        this.log(`Created ${this.config.elevators} elevators`, 'info');
    }

    /**
     * Create floor instances
     */
    private createFloors(): void {
        for (let i = 0; i < this.config.floors; i++) {
            const floor = new Floor(i, this.config.floors);
            this.floors.push(floor);
        }
        this.log(`Created ${this.config.floors} floors`, 'info');
    }

    /**
     * Setup elevator event callbacks
     */
    private setupElevatorCallbacks(elevator: Elevator): void {
        elevator.onStatusChange = (elev) => {
            this.log(`Elevator ${elev.id}: Status changed to ${elev.status}`, 'elevator');
            if (this.onStatusUpdate) {
                this.onStatusUpdate();
            }
        };

        elevator.onFloorChange = (elev, floor) => {
            this.log(`Elevator ${elev.id}: Moved to floor ${floor}`, 'elevator');
            this.checkElevatorArrival(elev, floor);
        };
    }

    /**
     * Setup floor event callbacks
     */
    private setupFloorCallbacks(): void {
        this.floors.forEach(floor => {
            floor.onRequest = (request) => {
                this.handleFloorRequest(request);
            };
        });
    }

    /**
     * Handle elevator request from a floor
     */
    public handleFloorRequest(request: ElevatorRequest): void {
        this.elevatorRequests.push(request);
        this.requestQueue.push(request);
        
        const directionText = request.direction === ElevatorDirection.UP ? 'UP' : 'DOWN';
        this.log(`Floor ${request.floor}: Elevator requested going ${directionText}`, 'request');
        
        this.attemptImmediateAssignment(request);
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate();
        }
    }

    /**
     * Try to immediately assign an available elevator
     */
    private attemptImmediateAssignment(request: ElevatorRequest): void {
        const availableElevator = this.findBestElevator(request);
        
        if (availableElevator) {
            this.assignElevatorToRequest(availableElevator, request);
        }
    }

    /**
     * Find the best elevator for a request using the optimization algorithm
     */
    private findBestElevator(request: ElevatorRequest): Elevator | null {
        // Filter elevators that can handle the request
        const suitableElevators = this.elevators.filter(elevator => 
            elevator.canHandleRequest(request.floor, request.direction)
        );

        if (suitableElevators.length === 0) {
            return null;
        }

        // Sort by priority:
        // 1. Idle elevators first
        // 2. Then by distance to request floor
        // 3. Then by request count (fewer requests first)
        
        const idleElevators = suitableElevators.filter(e => e.status === ElevatorStatus.IDLE);
        const busyElevators = suitableElevators.filter(e => e.status !== ElevatorStatus.IDLE);

        let candidateElevators = idleElevators.length > 0 ? idleElevators : suitableElevators;

        // Sort by distance to request floor
        candidateElevators.sort((a, b) => {
            const distanceA = a.getDistanceToFloor(request.floor);
            const distanceB = b.getDistanceToFloor(request.floor);
            return distanceA - distanceB;
        });

        // If multiple elevators have same distance, prefer one with fewer requests
        if (candidateElevators.length > 1) {
            const minDistance = candidateElevators[0].getDistanceToFloor(request.floor);
            const closestElevators = candidateElevators.filter(e => 
                e.getDistanceToFloor(request.floor) === minDistance
            );
            
            if (closestElevators.length > 1) {
                closestElevators.sort((a, b) => a.getRequestCount() - b.getRequestCount());
                candidateElevators = closestElevators;
            }
        }

        return candidateElevators[0] || null;
    }

    /**
     * Assign an elevator to handle a request
     */
    public assignElevatorToRequest(elevator: Elevator, request: ElevatorRequest): void {
        // Remove from global queue
        this.requestQueue = this.requestQueue.filter(r => 
            !(r.floor === request.floor && r.direction === request.direction)
        );

        // Add request to elevator
        elevator.addRequest(request);
        
        // Mark request as active in floor
        const floor = this.floors[request.floor];
        floor.assignElevator(request, elevator.id);
        
        // Start processing if elevator is idle
        if (elevator.status === ElevatorStatus.IDLE) {
            elevator.processNextRequest();
        }

        this.log(`Elevator ${elevator.id} assigned to floor ${request.floor} (${request.direction})`, 'success');
    }

    /**
     * Check if an elevator has arrived at a requested floor
     */
    private checkElevatorArrival(elevator: Elevator, floor: number): void {
        // Find requests for this floor that this elevator was assigned to
        const floorInstance = this.floors[floor];
        const activeRequests = floorInstance.getActiveRequests();
        
        activeRequests.forEach(requestInfo => {
            if (requestInfo.elevatorId === elevator.id) {
                // Elevator has arrived, remove the request
                const request: ElevatorRequest = {
                    floor,
                    direction: ElevatorDirection.UP, // Direction doesn't matter for arrival
                    timestamp: Date.now()
                };
                
                floorInstance.removeRequest(request);
                this.log(`Elevator ${elevator.id} arrived at floor ${floor}`, 'success');
                
                if (this.onStatusUpdate) {
                    this.onStatusUpdate();
                }
            }
        });
    }

    /**
     * Process pending requests in queue
     */
    public processRequestQueue(): void {
        if (this.requestQueue.length === 0) return;

        const requests = [...this.requestQueue];
        
        requests.forEach(request => {
            const availableElevator = this.findBestElevator(request);
            
            if (availableElevator) {
                this.assignElevatorToRequest(availableElevator, request);
            }
        });
    }

    /**
     * Start the building simulation
     */
    public start(): void {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.log('Building simulation started', 'success');
        
        // Start periodic request processing
        this.assignmentInterval = setInterval(() => {
            if (this.isRunning) {
                this.processRequestQueue();
            }
        }, 1000);
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate();
        }
    }

    /**
     * Stop the building simulation
     */
    public stop(): void {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        this.log('Building simulation stopped', 'info');
        
        if (this.assignmentInterval) {
            clearInterval(this.assignmentInterval);
            this.assignmentInterval = null;
        }
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate();
        }
    }

    /**
     * Reset the building to initial state
     */
    public reset(): void {
        this.stop();
        
        // Reset all elevators
        this.elevators.forEach(elevator => {
            elevator.currentFloor = 0;
            elevator.direction = ElevatorDirection.IDLE;
            elevator.status = ElevatorStatus.IDLE;
            elevator.reset();
        });
        
        // Reset all floors
        this.floors.forEach(floor => {
            floor.reset();
        });
        
        // Clear all queues
        this.elevatorRequests = [];
        this.requestQueue = [];
        
        this.log('Building reset to initial state', 'info');
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate();
        }
    }

    /**
     * Emergency stop all elevators
     */
    public emergencyStop(): void {
        this.elevators.forEach(elevator => {
            elevator.emergencyStop();
        });
        
        this.stop();
        this.log('Emergency stop activated - all elevators stopped', 'error');
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate();
        }
    }

    /**
     * Update building configuration
     */
    public updateConfig(newConfig: Partial<BuildingConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.log(`Configuration updated: ${JSON.stringify(this.config)}`, 'info');
    }

    /**
     * Get comprehensive building status
     */
    public getStatus(): {
        isRunning: boolean;
        config: BuildingConfig;
        elevatorCount: number;
        floorCount: number;
        pendingRequests: number;
        activeRequests: number;
        elevators: Array<{
            id: number;
            currentFloor: number;
            status: ElevatorStatus;
            direction: ElevatorDirection;
            requestCount: number;
        }>;
        floors: Array<{
            floorNumber: number;
            isActive: boolean;
            pendingRequests: number;
            activeRequests: number;
        }>;
    } {
        return {
            isRunning: this.isRunning,
            config: this.config,
            elevatorCount: this.elevators.length,
            floorCount: this.floors.length,
            pendingRequests: this.requestQueue.length,
            activeRequests: this.elevatorRequests.length - this.requestQueue.length,
            elevators: this.elevators.map(elev => elev.getInfo()),
            floors: this.floors.map(floor => floor.getInfo())
        };
    }

    /**
     * Log messages with different types
     */
    private log(message: string, type: 'info' | 'success' | 'error' | 'request' | 'elevator' = 'info'): void {
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        if (this.onLogMessage) {
            this.onLogMessage(message, type);
        }
    }

    /**
     * Cleanup resources
     */
    public destroy(): void {
        this.stop();
        this.elevators = [];
        this.floors = [];
        this.elevatorRequests = [];
        this.requestQueue = [];
    }
}