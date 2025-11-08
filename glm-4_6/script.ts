// Configuration constants
const FLOORS_COUNT = 10;
const ELEVATORS_COUNT = 4;
const FLOOR_HEIGHT = 62; // pixels
const ELEVATOR_MOVE_SPEED = 1000; // milliseconds per floor

// Types and interfaces
type Direction = 'up' | 'down' | 'idle';
interface FloorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

interface ElevatorState {
    id: number;
    currentFloor: number;
    destinationFloor: number;
    direction: Direction;
    isMoving: boolean;
    requests: number[];
    isIdle: boolean;
}

class ElevatorSimulator {
    private elevators: ElevatorState[] = [];
    private floorRequests: FloorRequest[] = [];
    private queuedRequests: FloorRequest[] = [];
    private animationFrames: Map<number, number> = new Map();

    constructor() {
        this.initializeElevators();
        this.initializeDOM();
        this.bindEvents();
        this.startSimulation();
    }

    private initializeElevators(): void {
        for (let i = 0; i < ELEVATORS_COUNT; i++) {
            this.elevators.push({
                id: i,
                currentFloor: 0,
                destinationFloor: 0,
                direction: 'idle',
                isMoving: false,
                requests: [],
                isIdle: true
            });
        }
    }

    private initializeDOM(): void {
        const floorsContainer = document.querySelector('.floors-container') as HTMLElement;
        const elevatorsContainer = document.querySelector('.elevators-container') as HTMLElement;

        // Create floors
        for (let floor = FLOORS_COUNT - 1; floor >= 0; floor--) {
            const floorElement = document.createElement('div');
            floorElement.className = 'floor';
            floorElement.id = `floor-${floor}`;
            
            const floorNumber = document.createElement('div');
            floorNumber.className = 'floor-number';
            floorNumber.textContent = floor.toString();
            
            const floorButtons = document.createElement('div');
            floorButtons.className = 'floor-buttons';
            
            // Add up button (except for top floor)
            if (floor < FLOORS_COUNT - 1) {
                const upButton = document.createElement('button');
                upButton.className = 'floor-button up';
                upButton.textContent = '↑';
                upButton.dataset.floor = floor.toString();
                upButton.dataset.direction = 'up';
                floorButtons.appendChild(upButton);
            }
            
            // Add down button (except for bottom floor)
            if (floor > 0) {
                const downButton = document.createElement('button');
                downButton.className = 'floor-button down';
                downButton.textContent = '↓';
                downButton.dataset.floor = floor.toString();
                downButton.dataset.direction = 'down';
                floorButtons.appendChild(downButton);
            }
            
            floorElement.appendChild(floorNumber);
            floorElement.appendChild(floorButtons);
            floorsContainer.appendChild(floorElement);
        }

        // Create elevators
        for (let i = 0; i < ELEVATORS_COUNT; i++) {
            const shaft = document.createElement('div');
            shaft.className = 'elevator-shaft';
            shaft.id = `shaft-${i}`;
            
            const elevator = document.createElement('div');
            elevator.className = 'elevator idle';
            elevator.id = `elevator-${i}`;
            elevator.textContent = `E${i}`;
            elevator.style.bottom = '10px';
            
            const status = document.createElement('div');
            status.className = 'elevator-status';
            status.id = `status-${i}`;
            status.textContent = 'Floor 0';
            
            const panel = document.createElement('div');
            panel.className = 'elevator-panel';
            panel.id = `panel-${i}`;
            
            const panelTitle = document.createElement('h3');
            panelTitle.textContent = `Elevator ${i}`;
            
            const floorButtons = document.createElement('div');
            floorButtons.className = 'elevator-floor-buttons';
            
            for (let floor = 0; floor < FLOORS_COUNT; floor++) {
                const button = document.createElement('button');
                button.className = 'elevator-floor-button';
                button.textContent = floor.toString();
                button.dataset.elevator = i.toString();
                button.dataset.floor = floor.toString();
                floorButtons.appendChild(button);
            }
            
            panel.appendChild(panelTitle);
            panel.appendChild(floorButtons);
            
            elevator.appendChild(status);
            shaft.appendChild(elevator);
            shaft.appendChild(panel);
            elevatorsContainer.appendChild(shaft);
        }
    }

    private bindEvents(): void {
        // Floor button events
        document.querySelectorAll('.floor-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const floor = parseInt(target.dataset.floor!);
                const direction = target.dataset.direction as Direction;
                this.requestElevator(floor, direction);
            });
        });

        // Elevator panel button events
        document.querySelectorAll('.elevator-floor-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const elevatorId = parseInt(target.dataset.elevator!);
                const floor = parseInt(target.dataset.floor!);
                this.selectFloorInElevator(elevatorId, floor);
            });
        });

        // Control panel events
        document.getElementById('reset-btn')?.addEventListener('click', () => {
            this.resetSimulation();
        });

        document.getElementById('random-request-btn')?.addEventListener('click', () => {
            this.addRandomRequest();
        });

        // Show/hide elevator panels on click
        document.querySelectorAll('.elevator').forEach(elevator => {
            elevator.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const elevatorId = parseInt(target.id.replace('elevator-', ''));
                this.toggleElevatorPanel(elevatorId);
            });
        });
    }

    private toggleElevatorPanel(elevatorId: number): void {
        const panel = document.getElementById(`panel-${elevatorId}`) as HTMLElement;
        const isShowing = panel.classList.contains('show');
        
        // Hide all panels first
        document.querySelectorAll('.elevator-panel').forEach(p => {
            p.classList.remove('show');
        });
        
        // Show the clicked panel if it wasn't showing
        if (!isShowing) {
            panel.classList.add('show');
        }
    }

    private requestElevator(floor: number, direction: Direction): void {
        const request: FloorRequest = {
            floor,
            direction,
            timestamp: Date.now()
        };

        // Check if there's already a similar request
        const existingRequest = this.floorRequests.find(
            r => r.floor === floor && r.direction === direction
        );

        if (!existingRequest) {
            this.floorRequests.push(request);
            this.processRequest(request);
            this.updateStats();
        }
    }

    private selectFloorInElevator(elevatorId: number, floor: number): void {
        const elevator = this.elevators[elevatorId];
        
        // Don't add if it's the current floor
        if (floor === elevator.currentFloor) {
            return;
        }

        // Don't add if already in requests
        if (!elevator.requests.includes(floor)) {
            elevator.requests.push(floor);
            this.processElevatorRequests(elevatorId);
        }
    }

    private processRequest(request: FloorRequest): void {
        // Find the best elevator for this request
        const bestElevator = this.findBestElevator(request);
        
        if (bestElevator !== -1) {
            this.assignRequestToElevator(bestElevator, request);
        } else {
            // Queue the request if no elevator is available
            this.queuedRequests.push(request);
        }
    }

    private findBestElevator(request: FloorRequest): number {
        let bestElevator = -1;
        let bestScore = Infinity;

        for (let i = 0; i < this.elevators.length; i++) {
            const elevator = this.elevators[i];
            
            if (!elevator.isIdle && !elevator.isMoving) {
                continue;
            }

            const distance = Math.abs(elevator.currentFloor - request.floor);
            let score = distance;

            // Prefer idle elevators
            if (elevator.isIdle) {
                score -= 10;
            }

            // Check if elevator is moving in the right direction
            if (elevator.direction === request.direction) {
                if ((request.direction === 'up' && elevator.currentFloor <= request.floor) ||
                    (request.direction === 'down' && elevator.currentFloor >= request.floor)) {
                    score -= 5;
                }
            }

            if (score < bestScore) {
                bestScore = score;
                bestElevator = i;
            }
        }

        return bestElevator;
    }

    private assignRequestToElevator(elevatorId: number, request: FloorRequest): void {
        const elevator = this.elevators[elevatorId];
        
        if (elevator.isIdle) {
            elevator.destinationFloor = request.floor;
            elevator.direction = request.direction;
            elevator.isIdle = false;
            this.moveElevator(elevatorId);
        } else {
            // Add to elevator's request queue
            if (!elevator.requests.includes(request.floor)) {
                elevator.requests.push(request.floor);
            }
        }
    }

    private processElevatorRequests(elevatorId: number): void {
        const elevator = this.elevators[elevatorId];
        
        if (elevator.requests.length === 0) {
            return;
        }

        // Sort requests based on current direction
        if (elevator.direction === 'up') {
            elevator.requests.sort((a, b) => a - b);
        } else if (elevator.direction === 'down') {
            elevator.requests.sort((a, b) => b - a);
        }

        // Get the next destination
        const nextFloor = elevator.requests[0];
        elevator.destinationFloor = nextFloor;
        elevator.requests.shift();
        
        this.moveElevator(elevatorId);
    }

    private moveElevator(elevatorId: number): void {
        const elevator = this.elevators[elevatorId];
        const elevatorElement = document.getElementById(`elevator-${elevatorId}`) as HTMLElement;
        const statusElement = document.getElementById(`status-${elevatorId}`) as HTMLElement;
        
        if (elevator.currentFloor === elevator.destinationFloor) {
            this.arriveAtFloor(elevatorId);
            return;
        }

        elevator.isMoving = true;
        
        // Update direction
        if (elevator.destinationFloor > elevator.currentFloor) {
            elevator.direction = 'up';
            elevatorElement.className = 'elevator moving-up';
        } else if (elevator.destinationFloor < elevator.currentFloor) {
            elevator.direction = 'down';
            elevatorElement.className = 'elevator moving-down';
        }

        // Calculate animation
        const targetPosition = 10 + (elevator.destinationFloor * FLOOR_HEIGHT);
        const currentPosition = 10 + (elevator.currentFloor * FLOOR_HEIGHT);
        const distance = Math.abs(targetPosition - currentPosition);
        const duration = (distance / FLOOR_HEIGHT) * ELEVATOR_MOVE_SPEED;

        // Animate the elevator
        elevatorElement.style.transition = `bottom ${duration}ms ease-in-out`;
        elevatorElement.style.bottom = `${targetPosition}px`;
        
        // Update status
        const updateStatus = () => {
            const progress = (Date.now() - startTime) / duration;
            if (progress < 1) {
                const currentPos = currentPosition + (targetPosition - currentPosition) * progress;
                const currentFloor = Math.round((currentPos - 10) / FLOOR_HEIGHT);
                statusElement.textContent = `Floor ${currentFloor}`;
                requestAnimationFrame(updateStatus);
            } else {
                statusElement.textContent = `Floor ${elevator.destinationFloor}`;
            }
        };
        
        const startTime = Date.now();
        requestAnimationFrame(updateStatus);

        // Complete movement after animation
        setTimeout(() => {
            elevator.currentFloor = elevator.destinationFloor;
            this.arriveAtFloor(elevatorId);
        }, duration);
    }

    private arriveAtFloor(elevatorId: number): void {
        const elevator = this.elevators[elevatorId];
        const elevatorElement = document.getElementById(`elevator-${elevatorId}`) as HTMLElement;
        
        elevator.isMoving = false;
        
        // Remove floor requests for this floor
        this.floorRequests = this.floorRequests.filter(
            request => !(request.floor === elevator.currentFloor && 
                        (request.direction === elevator.direction || elevator.direction === 'idle'))
        );

        // Process next request or go idle
        if (elevator.requests.length > 0) {
            this.processElevatorRequests(elevatorId);
        } else {
            elevator.isIdle = true;
            elevator.direction = 'idle';
            elevatorElement.className = 'elevator idle';
            
            // Process queued requests
            this.processQueuedRequests();
        }

        this.updateStats();
        this.updateFloorButtons();
    }

    private processQueuedRequests(): void {
        if (this.queuedRequests.length === 0) {
            return;
        }

        const request = this.queuedRequests.shift()!;
        this.processRequest(request);
    }

    private updateStats(): void {
        document.getElementById('active-requests')!.textContent = this.floorRequests.length.toString();
        document.getElementById('queued-requests')!.textContent = this.queuedRequests.length.toString();
    }

    private updateFloorButtons(): void {
        document.querySelectorAll('.floor-button').forEach(button => {
            const buttonElement = button as HTMLElement;
            const floor = parseInt(buttonElement.dataset.floor!);
            const direction = buttonElement.dataset.direction as Direction;
            
            const hasRequest = this.floorRequests.some(
                request => request.floor === floor && request.direction === direction
            );
            
            if (hasRequest) {
                buttonElement.classList.add('active');
            } else {
                buttonElement.classList.remove('active');
            }
        });
    }

    private addRandomRequest(): void {
        const floor = Math.floor(Math.random() * FLOORS_COUNT);
        let direction: Direction;
        
        if (floor === 0) {
            direction = 'up';
        } else if (floor === FLOORS_COUNT - 1) {
            direction = 'down';
        } else {
            direction = Math.random() > 0.5 ? 'up' : 'down';
        }
        
        this.requestElevator(floor, direction);
    }

    private resetSimulation(): void {
        // Clear all requests
        this.floorRequests = [];
        this.queuedRequests = [];
        
        // Reset elevators
        for (let i = 0; i < this.elevators.length; i++) {
            const elevator = this.elevators[i];
            const elevatorElement = document.getElementById(`elevator-${i}`) as HTMLElement;
            const statusElement = document.getElementById(`status-${i}`) as HTMLElement;
            
            elevator.currentFloor = 0;
            elevator.destinationFloor = 0;
            elevator.direction = 'idle';
            elevator.isMoving = false;
            elevator.requests = [];
            elevator.isIdle = true;
            
            elevatorElement.className = 'elevator idle';
            elevatorElement.style.bottom = '10px';
            statusElement.textContent = 'Floor 0';
        }
        
        this.updateStats();
        this.updateFloorButtons();
    }

    private startSimulation(): void {
        this.updateStats();
        this.updateFloorButtons();
        
        // Start processing loop
        setInterval(() => {
            this.processQueuedRequests();
        }, 1000);
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ElevatorSimulator();
});