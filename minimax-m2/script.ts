// Constants
const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;
const ELEVATOR_SPEED = 2000; // milliseconds per floor

// Type definitions
type Direction = 'up' | 'down' | 'idle';
type ElevatorState = 'idle' | 'moving' | 'doors_open';

interface FloorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

interface ElevatorRequest {
    elevatorId: number;
    floor: number;
    timestamp: number;
}

class Elevator {
    public id: number;
    public currentFloor: number;
    public targetFloor: number;
    public state: ElevatorState;
    public direction: Direction;
    public requests: number[]; // floors to visit
    public isMoving: boolean;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloor = 0;
        this.state = 'idle';
        this.direction = 'idle';
        this.requests = [];
        this.isMoving = false;
    }

    public addRequest(floor: number): void {
        if (!this.requests.includes(floor)) {
            this.requests.push(floor);
            this.requests.sort((a, b) => {
                if (this.direction === 'up') {
                    return a - b;
                } else if (this.direction === 'down') {
                    return b - a;
                } else {
                    return Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor);
                }
            });
        }
    }

    public canAcceptRequest(floor: number): boolean {
        if (this.state === 'idle') return true;
        if (this.state === 'moving') {
            if (this.direction === 'up' && floor >= this.currentFloor) return true;
            if (this.direction === 'down' && floor <= this.currentFloor) return true;
        }
        return false;
    }

    public processNextRequest(): void {
        if (this.requests.length === 0) {
            this.state = 'idle';
            this.direction = 'idle';
            this.isMoving = false;
            return;
        }

        const nextFloor = this.requests[0];
        this.targetFloor = nextFloor;
        this.state = 'moving';
        this.isMoving = true;

        if (nextFloor > this.currentFloor) {
            this.direction = 'up';
        } else if (nextFloor < this.currentFloor) {
            this.direction = 'down';
        }

        this.moveToFloor(nextFloor);
    }

    private async moveToFloor(floor: number): Promise<void> {
        const floorsToMove = Math.abs(floor - this.currentFloor);
        const totalTime = floorsToMove * (ELEVATOR_SPEED / floorsToMove);
        
        this.log(`Elevator ${this.id} moving from floor ${this.currentFloor} to floor ${floor}`);

        // Animate movement
        const stepTime = totalTime / floorsToMove;
        for (let i = 1; i <= floorsToMove; i++) {
            await new Promise(resolve => setTimeout(resolve, stepTime));
            if (this.direction === 'up') {
                this.currentFloor++;
            } else {
                this.currentFloor--;
            }
            this.updateDisplay();
        }

        // Arrive at floor
        this.requests.shift(); // Remove the completed request
        this.state = 'doors_open';
        this.updateDisplay();
        this.log(`Elevator ${this.id} arrived at floor ${this.currentFloor}`);

        // Open doors simulation (brief pause)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Process next request if any
        this.state = 'moving';
        if (this.requests.length > 0) {
            setTimeout(() => this.processNextRequest(), 500);
        } else {
            this.state = 'idle';
            this.direction = 'idle';
            this.isMoving = false;
            this.log(`Elevator ${this.id} is now idle`);
        }
        this.updateDisplay();
    }

    public updateDisplay(): void {
        const elevatorElement = document.querySelector(`.elevator-${this.id}`);
        if (elevatorElement) {
            const display = elevatorElement.querySelector('.elevator-display');
            if (display) {
                display.textContent = `Floor: ${this.currentFloor}`;
            }
        }
    }

    private log(message: string): void {
        StatusLogger.log(`[Elevator ${this.id}] ${message}`);
    }
}

class ElevatorSystem {
    public elevators: Elevator[];
    private requestQueue: FloorRequest[];
    private floorRequests: Map<number, Set<Direction>>;

    constructor() {
        this.elevators = [];
        this.requestQueue = [];
        this.floorRequests = new Map();

        // Initialize elevators
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }

        // Initialize floor request tracking
        for (let floor = 0; floor < NUM_FLOORS; floor++) {
            this.floorRequests.set(floor, new Set());
        }
    }

    public requestElevator(floor: number, direction: Direction): void {
        // Check if this request already exists
        const existingRequest = this.requestQueue.find(
            req => req.floor === floor && req.direction === direction
        );

        if (!existingRequest) {
            this.requestQueue.push({
                floor,
                direction,
                timestamp: Date.now()
            });

            this.floorRequests.get(floor)?.add(direction);
            this.updateFloorButtons();

            this.log(`Floor ${floor} requested elevator going ${direction}`);
            this.processRequestQueue();
        }
    }

    public requestElevatorFromInside(elevatorId: number, floor: number): void {
        const elevator = this.elevators[elevatorId];
        if (elevator && !elevator.isMoving) {
            elevator.addRequest(floor);
            this.log(`Elevator ${elevatorId} internal request to floor ${floor}`);
            elevator.processNextRequest();
        }
    }

    private processRequestQueue(): void {
        if (this.requestQueue.length === 0) return;

        // Find the most suitable elevator for the first request
        const request = this.requestQueue[0];
        const suitableElevator = this.findBestElevator(request);

        if (suitableElevator) {
            suitableElevator.addRequest(request.floor);
            this.log(`Assigned elevator ${suitableElevator.id} to floor ${request.floor} going ${request.direction}`);
            
            // Remove from queue
            this.requestQueue.shift();
            this.floorRequests.get(request.floor)?.delete(request.direction);
            
            if (this.floorRequests.get(request.floor)?.size === 0) {
                this.floorRequests.get(request.floor)?.clear();
            }
            
            this.updateFloorButtons();

            if (!suitableElevator.isMoving) {
                suitableElevator.processNextRequest();
            }
        } else {
            // No suitable elevator found, will try again later
            this.log('No suitable elevator found, request queued');
            setTimeout(() => this.processRequestQueue(), 1000);
        }
    }

    private findBestElevator(request: FloorRequest): Elevator | null {
        let bestElevator: Elevator | null = null;
        let bestDistance = Infinity;

        for (const elevator of this.elevators) {
            if (elevator.canAcceptRequest(request.floor)) {
                const distance = Math.abs(elevator.currentFloor - request.floor);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElevator = elevator;
                }
            }
        }

        return bestElevator;
    }

    private updateFloorButtons(): void {
        for (let floor = 0; floor < NUM_FLOORS; floor++) {
            const floorElement = document.querySelector(`.floor-${floor}`);
            if (floorElement) {
                const requests = this.floorRequests.get(floor);
                const upBtn = floorElement.querySelector('.up-btn');
                const downBtn = floorElement.querySelector('.down-btn');

                if (upBtn) {
                    if (requests?.has('up')) {
                        upBtn.classList.add('pressed');
                    } else {
                        upBtn.classList.remove('pressed');
                    }
                }

                if (downBtn) {
                    if (requests?.has('down')) {
                        downBtn.classList.add('pressed');
                    } else {
                        downBtn.classList.remove('pressed');
                    }
                }
            }
        }
    }

    private log(message: string): void {
        StatusLogger.log(message);
    }
}

class StatusLogger {
    private static statusElement: HTMLElement | null = null;

    public static init(): void {
        this.statusElement = document.getElementById('status-log');
    }

    public static log(message: string, isImportant: boolean = false): void {
        if (this.statusElement) {
            const entry = document.createElement('div');
            entry.className = `status-entry${isImportant ? ' important' : ''}`;
            entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
            
            this.statusElement.appendChild(entry);
            this.statusElement.scrollTop = this.statusElement.scrollHeight;

            // Keep only last 50 entries
            while (this.statusElement.children.length > 50) {
                this.statusElement.removeChild(this.statusElement.firstChild!);
            }
        }
    }
}

// Global elevator system instance
let elevatorSystem: ElevatorSystem;

// Initialize the system
function initializeElevatorSystem(): void {
    StatusLogger.init();
    elevatorSystem = new ElevatorSystem();
    
    // Update all elevator displays
    elevatorSystem.elevators.forEach(elevator => {
        elevator.updateDisplay();
    });

    StatusLogger.log('Elevator system initialized', true);
    StatusLogger.log(`System ready with ${NUM_ELEVATORS} elevators and ${NUM_FLOORS} floors`, true);
}

// Event Listeners
function setupEventListeners(): void {
    // Floor request buttons
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.classList.contains('up-btn') || target.classList.contains('down-btn')) {
            const floor = parseInt(target.dataset.floor!);
            const direction = target.dataset.direction as Direction;
            elevatorSystem.requestElevator(floor, direction);
        }

        // Elevator internal buttons
        if (target.classList.contains('elevator-btn')) {
            const elevatorId = parseInt(target.dataset.elevator!);
            const floor = parseInt(target.dataset.floor!);
            elevatorSystem.requestElevatorFromInside(elevatorId, floor);
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElevatorSystem();
    setupEventListeners();
});