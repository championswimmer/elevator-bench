// Configuration
const CONFIG = {
    TOTAL_FLOORS: 10,
    TOTAL_ELEVATORS: 4,
    MOVE_SPEED: 800, // ms per floor
    DOOR_OPEN_TIME: 1000, // ms
};

// Direction enum
enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    IDLE = 'IDLE',
}

// Elevator class
class Elevator {
    id: number;
    currentFloor: number = 0;
    direction: Direction = Direction.IDLE;
    destinationQueue: Set<number> = new Set();
    isMoving: boolean = false;
    isDoorOpen: boolean = false;

    constructor(id: number) {
        this.id = id;
    }

    addDestination(floor: number): void {
        this.destinationQueue.add(floor);
        this.updateDirection();
    }

    removeDestination(floor: number): void {
        this.destinationQueue.delete(floor);
    }

    private updateDirection(): void {
        if (this.destinationQueue.size === 0) {
            this.direction = Direction.IDLE;
            return;
        }

        const minFloor = Math.min(...Array.from(this.destinationQueue));
        const maxFloor = Math.max(...Array.from(this.destinationQueue));

        if (this.direction === Direction.IDLE) {
            this.direction = this.currentFloor <= minFloor ? Direction.UP : Direction.DOWN;
        }

        // If moving up and reached the top destination, reverse
        if (this.direction === Direction.UP && this.currentFloor === maxFloor) {
            this.direction = Direction.DOWN;
        }

        // If moving down and reached the bottom destination, reverse
        if (this.direction === Direction.DOWN && this.currentFloor === minFloor) {
            this.direction = Direction.UP;
        }
    }

    getNextFloor(): number | null {
        if (this.destinationQueue.size === 0) return null;

        const destinations = Array.from(this.destinationQueue);

        if (this.direction === Direction.UP) {
            const nextFloor = destinations.find(f => f > this.currentFloor);
            return nextFloor !== undefined ? nextFloor : Math.min(...destinations);
        } else {
            const nextFloor = destinations.find(f => f < this.currentFloor);
            return nextFloor !== undefined ? nextFloor : Math.max(...destinations);
        }
    }

    hasDestination(floor: number): boolean {
        return this.destinationQueue.has(floor);
    }

    getState(): string {
        if (this.isDoorOpen) return 'DOOR OPEN';
        if (this.isMoving) return `MOVING ${this.direction}`;
        return 'IDLE';
    }
}

// Floor class
class Floor {
    floorNumber: number;
    upButtonActive: boolean = false;
    downButtonActive: boolean = false;
    waitingUp: number = 0;
    waitingDown: number = 0;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
    }

    pressUpButton(): void {
        if (this.floorNumber < CONFIG.TOTAL_FLOORS - 1) {
            this.upButtonActive = true;
            this.waitingUp++;
        }
    }

    pressDownButton(): void {
        if (this.floorNumber > 0) {
            this.downButtonActive = true;
            this.waitingDown++;
        }
    }

    clearUpButton(): void {
        this.upButtonActive = false;
        this.waitingUp = Math.max(0, this.waitingUp - 1);
    }

    clearDownButton(): void {
        this.downButtonActive = false;
        this.waitingDown = Math.max(0, this.waitingDown - 1);
    }
}

// Building/Simulator class
class Building {
    elevators: Elevator[] = [];
    floors: Floor[] = [];
    requestQueue: Array<{ floor: number; direction: Direction }> = [];
    requestsServed: number = 0;
    moveInterval: NodeJS.Timeout | null = null;

    constructor(totalFloors: number = CONFIG.TOTAL_FLOORS, totalElevators: number = CONFIG.TOTAL_ELEVATORS) {
        // Initialize elevators
        for (let i = 0; i < totalElevators; i++) {
            this.elevators.push(new Elevator(i));
        }

        // Initialize floors
        for (let i = 0; i < totalFloors; i++) {
            this.floors.push(new Floor(i, totalFloors));
        }
    }

    requestElevator(floorNumber: number, direction: Direction): void {
        const floor = this.floors[floorNumber];

        if (direction === Direction.UP) {
            floor.pressUpButton();
        } else {
            floor.pressDownButton();
        }

        this.requestQueue.push({ floor: floorNumber, direction });
        this.assignElevators();
    }

    private assignElevators(): void {
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue[0];
            const elevator = this.findBestElevator(request.floor, request.direction);

            if (elevator) {
                elevator.addDestination(request.floor);
                this.requestQueue.shift();
            } else {
                break; // No available elevator
            }
        }
    }

    private findBestElevator(floor: number, direction: Direction): Elevator | null {
        // First, find idle elevators on the same floor
        const idleOnFloor = this.elevators.filter(e => e.direction === Direction.IDLE && e.currentFloor === floor);
        if (idleOnFloor.length > 0) {
            return idleOnFloor[0];
        }

        // Find idle elevators, closest first
        const idleElevators = this.elevators.filter(e => e.direction === Direction.IDLE);
        if (idleElevators.length > 0) {
            idleElevators.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
            return idleElevators[0];
        }

        // Find elevator moving in the same direction and hasn't passed the floor
        const movingInDirection = this.elevators.filter(e => e.direction === direction);
        if (direction === Direction.UP) {
            const candidates = movingInDirection.filter(e => e.currentFloor <= floor);
            if (candidates.length > 0) {
                candidates.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
                return candidates[0];
            }
        } else {
            const candidates = movingInDirection.filter(e => e.currentFloor >= floor);
            if (candidates.length > 0) {
                candidates.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
                return candidates[0];
            }
        }

        // Any moving elevator
        const movingElevators = this.elevators.filter(e => e.direction !== Direction.IDLE);
        if (movingElevators.length > 0) {
            movingElevators.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
            return movingElevators[0];
        }

        return null;
    }

    private moveElevators(): void {
        for (const elevator of this.elevators) {
            if (elevator.isDoorOpen) {
                continue; // Door is open, don't move
            }

            const nextFloor = elevator.getNextFloor();

            if (nextFloor === null) {
                elevator.direction = Direction.IDLE;
                elevator.isMoving = false;
                continue;
            }

            if (elevator.currentFloor === nextFloor) {
                // Arrived at destination
                elevator.isMoving = false;
                this.handleElevatorArrival(elevator);
            } else {
                // Move towards destination
                elevator.isMoving = true;
                if (elevator.currentFloor < nextFloor) {
                    elevator.currentFloor++;
                } else {
                    elevator.currentFloor--;
                }
            }
        }
    }

    private handleElevatorArrival(elevator: Elevator): void {
        const floor = this.floors[elevator.currentFloor];
        elevator.removeDestination(elevator.currentFloor);

        // Clear floor buttons if applicable
        if (elevator.direction === Direction.UP && elevator.currentFloor < CONFIG.TOTAL_FLOORS - 1) {
            floor.clearUpButton();
        } else if (elevator.direction === Direction.DOWN && elevator.currentFloor > 0) {
            floor.clearDownButton();
        }

        // Open door
        elevator.isDoorOpen = true;
        this.requestsServed++;

        // Close door after delay
        setTimeout(() => {
            elevator.isDoorOpen = false;
            if (elevator.destinationQueue.size === 0) {
                elevator.direction = Direction.IDLE;
            }
            this.assignElevators();
        }, CONFIG.DOOR_OPEN_TIME);
    }

    start(): void {
        if (this.moveInterval) clearInterval(this.moveInterval);
        this.moveInterval = setInterval(() => this.moveElevators(), CONFIG.MOVE_SPEED);
    }

    stop(): void {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    getStats() {
        return {
            totalFloors: this.floors.length,
            totalElevators: this.elevators.length,
            requestsServed: this.requestsServed,
            queueLength: this.requestQueue.length,
        };
    }
}

// UI Controller
class SimulatorUI {
    building: Building;

    constructor(building: Building) {
        this.building = building;
        this.render();
        this.attachEventListeners();
    }

    render(): void {
        this.renderElevators();
        this.renderFloors();
        this.updateStats();
        setTimeout(() => this.updateStats(), 100); // Update stats frequently
    }

    renderElevators(): void {
        const container = document.getElementById('elevators-container');
        if (!container) return;

        container.innerHTML = '';

        for (const elevator of this.building.elevators) {
            const elevatorDiv = document.createElement('div');
            elevatorDiv.className = 'elevator';
            elevatorDiv.id = `elevator-${elevator.id}`;

            const head = document.createElement('div');
            head.className = 'elevator-head';
            head.textContent = `Elevator ${elevator.id}`;

            const display = document.createElement('div');
            display.className = 'elevator-display';
            display.textContent = elevator.currentFloor.toString();
            display.id = `elevator-display-${elevator.id}`;

            const status = document.createElement('div');
            status.className = 'elevator-status';
            status.textContent = elevator.getState();
            status.id = `elevator-status-${elevator.id}`;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'elevator-buttons';

            for (let floor = 0; floor < CONFIG.TOTAL_FLOORS; floor++) {
                const btn = document.createElement('button');
                btn.className = 'floor-btn';
                btn.textContent = floor.toString();
                btn.id = `btn-elevator-${elevator.id}-floor-${floor}`;

                btn.addEventListener('click', () => {
                    elevator.addDestination(floor);
                    this.building.assignElevators();
                });

                buttonsDiv.appendChild(btn);
            }

            elevatorDiv.appendChild(head);
            elevatorDiv.appendChild(display);
            elevatorDiv.appendChild(status);
            elevatorDiv.appendChild(buttonsDiv);
            container.appendChild(elevatorDiv);
        }
    }

    renderFloors(): void {
        const container = document.getElementById('floors-container');
        if (!container) return;

        container.innerHTML = '';

        for (let i = this.building.floors.length - 1; i >= 0; i--) {
            const floor = this.building.floors[i];
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';

            const label = document.createElement('div');
            label.className = 'floor-label';
            label.textContent = `Floor ${floor.floorNumber}`;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'floor-buttons';

            if (floor.floorNumber < CONFIG.TOTAL_FLOORS - 1) {
                const upBtn = document.createElement('button');
                upBtn.className = 'request-btn up';
                upBtn.textContent = 'Up';
                upBtn.id = `btn-floor-${floor.floorNumber}-up`;
                upBtn.addEventListener('click', () => {
                    this.building.requestElevator(floor.floorNumber, Direction.UP);
                    this.updateFloorButtonState();
                });
                buttonsDiv.appendChild(upBtn);
            }

            if (floor.floorNumber > 0) {
                const downBtn = document.createElement('button');
                downBtn.className = 'request-btn down';
                downBtn.textContent = 'Down';
                downBtn.id = `btn-floor-${floor.floorNumber}-down`;
                downBtn.addEventListener('click', () => {
                    this.building.requestElevator(floor.floorNumber, Direction.DOWN);
                    this.updateFloorButtonState();
                });
                buttonsDiv.appendChild(downBtn);
            }

            floorDiv.appendChild(label);
            floorDiv.appendChild(buttonsDiv);
            container.appendChild(floorDiv);
        }
    }

    attachEventListeners(): void {
        // Continuous update of UI
        setInterval(() => {
            this.updateElevatorDisplays();
            this.updateFloorButtonState();
            this.updateStats();
        }, 100);
    }

    updateElevatorDisplays(): void {
        for (const elevator of this.building.elevators) {
            const display = document.getElementById(`elevator-display-${elevator.id}`);
            if (display) {
                display.textContent = elevator.currentFloor.toString();
            }

            const status = document.getElementById(`elevator-status-${elevator.id}`);
            if (status) {
                status.textContent = elevator.getState();
            }

            // Update button states
            for (let floor = 0; floor < CONFIG.TOTAL_FLOORS; floor++) {
                const btn = document.getElementById(`btn-elevator-${elevator.id}-floor-${floor}`);
                if (btn) {
                    btn.classList.remove('selected', 'completed');
                    if (elevator.currentFloor === floor && elevator.isDoorOpen) {
                        btn.classList.add('completed');
                    } else if (elevator.hasDestination(floor)) {
                        btn.classList.add('selected');
                    }
                }
            }
        }
    }

    updateFloorButtonState(): void {
        for (let i = 0; i < CONFIG.TOTAL_FLOORS; i++) {
            const floor = this.building.floors[i];

            const upBtn = document.getElementById(`btn-floor-${i}-up`);
            if (upBtn) {
                upBtn.classList.toggle('active', floor.upButtonActive);
            }

            const downBtn = document.getElementById(`btn-floor-${i}-down`);
            if (downBtn) {
                downBtn.classList.toggle('active', floor.downButtonActive);
            }
        }
    }

    updateStats(): void {
        const stats = this.building.getStats();
        document.getElementById('stat-floors')!.textContent = stats.totalFloors.toString();
        document.getElementById('stat-elevators')!.textContent = stats.totalElevators.toString();
        document.getElementById('stat-requests')!.textContent = stats.requestsServed.toString();
        document.getElementById('stat-queue')!.textContent = stats.queueLength.toString();
    }
}

// Initialize simulator
const building = new Building(CONFIG.TOTAL_FLOORS, CONFIG.TOTAL_ELEVATORS);
const ui = new SimulatorUI(building);

// Start the simulation
building.start();
