// Constants
const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;

// Enums
enum ElevatorDirection {
    UP = "UP",
    DOWN = "DOWN",
    IDLE = "IDLE"
}

enum ElevatorState {
    IDLE = "IDLE",
    MOVING = "MOVING",
    DOOR_OPENING = "DOOR_OPENING",
    DOOR_OPEN = "DOOR_OPEN",
    DOOR_CLOSING = "DOOR_CLOSING"
}

// Types
type FloorRequest = {
    floor: number;
    direction: ElevatorDirection;
};

type ElevatorRequest = {
    floor: number;
};

// Elevator class
class Elevator {
    id: number;
    currentFloor: number;
    state: ElevatorState;
    direction: ElevatorDirection;
    floorRequests: Set<number>;
    destinationRequests: Set<number>;
    doorOpen: boolean;
    movingToFloor: number | null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0; // All elevators start at ground floor
        this.state = ElevatorState.IDLE;
        this.direction = ElevatorDirection.IDLE;
        this.floorRequests = new Set();
        this.destinationRequests = new Set();
        this.doorOpen = false;
        this.movingToFloor = null;
    }

    addFloorRequest(floor: number, direction: ElevatorDirection) {
        this.floorRequests.add(floor);
        // Update direction based on request
        if (this.direction === ElevatorDirection.IDLE) {
            this.direction = floor > this.currentFloor ? ElevatorDirection.UP : ElevatorDirection.DOWN;
        }
    }

    addDestinationRequest(floor: number) {
        this.destinationRequests.add(floor);
        // Update direction based on request
        if (this.direction === ElevatorDirection.IDLE) {
            this.direction = floor > this.currentFloor ? ElevatorDirection.UP : ElevatorDirection.DOWN;
        }
    }

    getNextFloor(): number | null {
        if (this.direction === ElevatorDirection.UP) {
            // Find the next highest floor with a request
            const allRequests = [...this.floorRequests, ...this.destinationRequests].filter(floor => floor > this.currentFloor);
            if (allRequests.length > 0) {
                return Math.min(...allRequests);
            }
        } else if (this.direction === ElevatorDirection.DOWN) {
            // Find the next lowest floor with a request
            const allRequests = [...this.floorRequests, ...this.destinationRequests].filter(floor => floor < this.currentFloor);
            if (allRequests.length > 0) {
                return Math.max(...allRequests);
            }
        }
        return null;
    }

    move() {
        if (this.state !== ElevatorState.MOVING) return;

        if (this.movingToFloor === null) {
            this.movingToFloor = this.getNextFloor();
            if (this.movingToFloor === null) {
                this.state = ElevatorState.IDLE;
                this.direction = ElevatorDirection.IDLE;
                return;
            }
        }

        // Move one floor at a time
        if (this.currentFloor < this.movingToFloor) {
            this.currentFloor++;
            this.direction = ElevatorDirection.UP;
        } else if (this.currentFloor > this.movingToFloor) {
            this.currentFloor--;
            this.direction = ElevatorDirection.DOWN;
        }

        // Check if we've reached the destination
        if (this.currentFloor === this.movingToFloor) {
            this.state = ElevatorState.DOOR_OPENING;
            this.floorRequests.delete(this.currentFloor);
            this.destinationRequests.delete(this.currentFloor);
            this.movingToFloor = null;
        }
    }

    openDoor() {
        this.doorOpen = true;
        this.state = ElevatorState.DOOR_OPEN;
    }

    closeDoor() {
        this.doorOpen = false;
        this.state = ElevatorState.IDLE;
        
        // Check if there are more requests
        const nextFloor = this.getNextFloor();
        if (nextFloor !== null) {
            this.state = ElevatorState.MOVING;
            this.movingToFloor = nextFloor;
        } else {
            this.direction = ElevatorDirection.IDLE;
        }
    }

    isIdle(): boolean {
        return this.state === ElevatorState.IDLE;
    }

    isMoving(): boolean {
        return this.state === ElevatorState.MOVING;
    }

    isAtFloor(floor: number): boolean {
        return this.currentFloor === floor;
    }

    isGoingUp(): boolean {
        return this.direction === ElevatorDirection.UP;
    }

    isGoingDown(): boolean {
        return this.direction === ElevatorDirection.DOWN;
    }
}

// Elevator Simulator class
class ElevatorSimulator {
    elevators: Elevator[];
    floorRequests: FloorRequest[];
    animationId: number | null;

    constructor() {
        this.elevators = [];
        this.floorRequests = [];
        this.animationId = null;

        // Initialize elevators
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }

        this.initUI();
    }

    initUI() {
        this.renderFloors();
        this.renderElevators();
        this.renderElevatorStatus();
        this.attachEventListeners();
    }

    renderFloors() {
        const floorsContainer = document.querySelector('.floors') as HTMLElement;
        if (!floorsContainer) return;

        floorsContainer.innerHTML = '';
        
        // Create floors in reverse order (top to bottom)
        for (let i = NUM_FLOORS - 1; i >= 0; i--) {
            const floorElement = document.createElement('div');
            floorElement.className = 'floor';
            floorElement.innerHTML = `
                <div class="floor-number">Floor ${i}</div>
                <div class="floor-buttons">
                    ${i < NUM_FLOORS - 1 ? `<button class="floor-button up" data-floor="${i}">↑</button>` : ''}
                    ${i > 0 ? `<button class="floor-button down" data-floor="${i}">↓</button>` : ''}
                </div>
            `;
            floorsContainer.appendChild(floorElement);
        }
    }

    renderElevators() {
        const elevatorsContainer = document.querySelector('.elevators') as HTMLElement;
        if (!elevatorsContainer) return;

        elevatorsContainer.innerHTML = '';
        
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            const elevatorElement = document.createElement('div');
            elevatorElement.className = 'elevator';
            elevatorElement.innerHTML = `
                <div class="elevator-header">Elevator ${i}</div>
                <div class="elevator-content">
                    <div class="elevator-door" id="elevator-${i}-door">
                        ${this.elevators[i].doorOpen ? 'DOOR OPEN' : 'DOOR CLOSED'}
                    </div>
                </div>
                <div class="elevator-buttons">
                    ${Array.from({ length: NUM_FLOORS }, (_, j) => 
                        `<button class="elevator-button" data-elevator="${i}" data-floor="${j}">${j}</button>`
                    ).join('')}
                </div>
            `;
            elevatorsContainer.appendChild(elevatorElement);
        }
    }

    renderElevatorStatus() {
        const statusContainer = document.getElementById('elevator-status') as HTMLElement;
        if (!statusContainer) return;

        statusContainer.innerHTML = '';
        
        this.elevators.forEach(elevator => {
            const statusElement = document.createElement('div');
            statusElement.className = 'elevator-status-item';
            
            let directionClass = '';
            let directionText = '';
            
            switch (elevator.direction) {
                case ElevatorDirection.UP:
                    directionClass = 'moving-up';
                    directionText = 'Moving Up';
                    break;
                case ElevatorDirection.DOWN:
                    directionClass = 'moving-down';
                    directionText = 'Moving Down';
                    break;
                default:
                    directionClass = 'idle';
                    directionText = 'Idle';
            }
            
            statusElement.innerHTML = `
                <strong>Elevator ${elevator.id}:</strong> 
                <span class="${directionClass}">Floor ${elevator.currentFloor} - ${directionText}</span>
            `;
            statusContainer.appendChild(statusElement);
        });
    }

    attachEventListeners() {
        // Floor buttons
        document.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            
            // Floor request buttons
            if (target.classList.contains('floor-button')) {
                const floor = parseInt(target.getAttribute('data-floor') || '0');
                const direction = target.classList.contains('up') ? ElevatorDirection.UP : ElevatorDirection.DOWN;
                this.requestElevator(floor, direction);
                const button = target as HTMLButtonElement;
                button.disabled = true;
                setTimeout(() => {
                    button.disabled = false;
                }, 3000);
            }
            
            // Elevator destination buttons
            if (target.classList.contains('elevator-button')) {
                const elevatorId = parseInt(target.getAttribute('data-elevator') || '0');
                const floor = parseInt(target.getAttribute('data-floor') || '0');
                this.selectDestination(elevatorId, floor);
                target.classList.add('selected');
                const button = target as HTMLButtonElement;
                setTimeout(() => {
                    target.classList.remove('selected');
                }, 3000);
            }
        });
        
        // Control buttons
        document.getElementById('start-btn')?.addEventListener('click', () => {
            this.startSimulation();
        });
        
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.resetSimulation();
        });
    }

    findClosestElevator(floor: number, direction: ElevatorDirection): Elevator | null {
        let closestElevator: Elevator | null = null;
        let minDistance = Infinity;
        
        for (const elevator of this.elevators) {
            // Only consider idle elevators or elevators moving in the same direction
            if (elevator.isIdle() || 
                (direction === ElevatorDirection.UP && elevator.isGoingUp()) ||
                (direction === ElevatorDirection.DOWN && elevator.isGoingDown())) {
                
                const distance = Math.abs(elevator.currentFloor - floor);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestElevator = elevator;
                }
            }
        }
        
        return closestElevator;
    }

    requestElevator(floor: number, direction: ElevatorDirection) {
        const closestElevator = this.findClosestElevator(floor, direction);
        
        if (closestElevator) {
            closestElevator.addFloorRequest(floor, direction);
            if (closestElevator.isIdle()) {
                closestElevator.state = ElevatorState.MOVING;
            }
        } else {
            // Queue the request if no elevator is available
            this.floorRequests.push({ floor, direction });
        }
    }

    selectDestination(elevatorId: number, floor: number) {
        const elevator = this.elevators[elevatorId];
        elevator.addDestinationRequest(floor);
        
        if (elevator.isIdle()) {
            elevator.state = ElevatorState.MOVING;
        }
    }

    processQueuedRequests() {
        if (this.floorRequests.length > 0) {
            const request = this.floorRequests[0];
            const closestElevator = this.findClosestElevator(request.floor, request.direction);
            
            if (closestElevator) {
                closestElevator.addFloorRequest(request.floor, request.direction);
                if (closestElevator.isIdle()) {
                    closestElevator.state = ElevatorState.MOVING;
                }
                this.floorRequests.shift(); // Remove the processed request
            }
        }
    }

    update() {
        // Move elevators
        this.elevators.forEach(elevator => {
            if (elevator.isMoving()) {
                elevator.move();
            } else if (elevator.state === ElevatorState.DOOR_OPENING) {
                elevator.openDoor();
            } else if (elevator.state === ElevatorState.DOOR_OPEN) {
                // Keep door open for a while
                setTimeout(() => {
                    elevator.state = ElevatorState.DOOR_CLOSING;
                }, 2000);
            } else if (elevator.state === ElevatorState.DOOR_CLOSING) {
                elevator.closeDoor();
            }
        });
        
        // Process queued requests
        this.processQueuedRequests();
        
        // Update UI
        this.renderElevators();
        this.renderElevatorStatus();
    }

    startSimulation() {
        if (this.animationId) return; // Already running
        
        const animate = () => {
            this.update();
            this.animationId = requestAnimationFrame(animate);
        };
        
        this.animationId = requestAnimationFrame(animate);
    }

    stopSimulation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resetSimulation() {
        this.stopSimulation();
        
        // Reset elevators
        this.elevators = [];
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }
        
        // Clear requests
        this.floorRequests = [];
        
        // Re-render UI
        this.initUI();
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new ElevatorSimulator();
    (window as any).simulator = simulator; // For debugging purposes
});