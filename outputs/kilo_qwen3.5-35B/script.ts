// Elevator Simulator - TypeScript Implementation

// Configuration constants
const CONFIG = {
    FLOORS: 10,
    ELEVATORS: 4,
    MOVEMENT_SPEED_MS: 500,
};

// Direction enum
enum Direction {
    IDLE = 'IDLE',
    UP = 'UP',
    DOWN = 'DOWN',
}

// Floor request interface
interface FloorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

// Elevator state interface
interface ElevatorState {
    currentFloor: number;
    direction: Direction;
    destinationFloors: Set<number>;
    isMoving: boolean;
}

// Floor class representing a single floor in the building
class Floor {
    public number: number;
    public upButton: HTMLElement | null = null;
    public downButton: HTMLElement | null = null;
    public upRequest: FloorRequest | null = null;
    public downRequest: FloorRequest | null = null;

    constructor(number: number) {
        this.number = number;
    }

    hasUpRequest(): boolean {
        return this.upRequest !== null;
    }

    hasDownRequest(): boolean {
        return this.downRequest !== null;
    }

    clearUpRequest(): void {
        this.upRequest = null;
        if (this.upButton) {
            this.upButton.classList.remove('active');
        }
    }

    clearDownRequest(): void {
        this.downRequest = null;
        if (this.downButton) {
            this.downButton.classList.remove('active');
        }
    }
}

// Elevator class representing an elevator in the building
class Elevator {
    public id: number;
    public state: ElevatorState;
    public element: HTMLElement | null = null;
    public floorButtons: Map<number, HTMLElement> = new Map();
    public requestQueue: FloorRequest[] = [];

    constructor(id: number) {
        this.id = id;
        this.state = {
            currentFloor: 0,
            direction: Direction.IDLE,
            destinationFloors: new Set(),
            isMoving: false,
        };
    }

    updatePosition(): void {
        if (this.element) {
            const floorHeight = 70; // Approximate height per floor including gaps
            const offset = 10; // Padding
            const topPosition = offset + this.state.currentFloor * floorHeight;
            this.element.style.top = `${topPosition}px`;
        }
    }

    addDestination(floor: number): void {
        if (!this.state.destinationFloors.has(floor)) {
            this.state.destinationFloors.add(floor);
            this.updateDestinationDisplay();
        }
    }

    removeDestination(floor: number): void {
        this.state.destinationFloors.delete(floor);
        this.updateDestinationDisplay();
    }

    updateDestinationDisplay(): void {
        if (this.element) {
            const destElement = this.element.querySelector('.elevator-destination');
            if (destElement) {
                if (this.state.destinationFloors.size > 0) {
                    destElement.textContent = Array.from(this.state.destinationFloors)
                        .sort((a, b) => a - b)
                        .join(', ');
                } else {
                    destElement.textContent = '';
                }
            }
        }
    }

    setMoving(moving: boolean): void {
        this.state.isMoving = moving;
        if (this.element) {
            if (moving) {
                this.element.classList.remove('elevator-idle');
                this.element.classList.add('elevator-moving');
            } else {
                this.element.classList.remove('elevator-moving');
                this.element.classList.add('elevator-idle');
            }
        }
    }

    moveToFloor(floor: number): Promise<void> {
        return new Promise((resolve) => {
            const startFloor = this.state.currentFloor;
            const direction = floor > startFloor ? Direction.UP : Direction.DOWN;
            this.state.direction = direction;
            this.setMoving(true);

            let currentFloor = startFloor;
            const step = direction === Direction.UP ? 1 : -1;

            const interval = setInterval(() => {
                currentFloor += step;
                this.state.currentFloor = currentFloor;
                this.updatePosition();

                if (currentFloor === floor) {
                    clearInterval(interval);
                    this.state.direction = Direction.IDLE;
                    this.setMoving(false);
                    resolve();
                }
            }, CONFIG.MOVEMENT_SPEED_MS);
        });
    }

    async processRequests(building: Building): Promise<void> {
        while (true) {
            // Check if there are pending requests in the queue
            if (this.requestQueue.length > 0) {
                const nextRequest = this.requestQueue.shift();
                if (nextRequest) {
                    this.addDestination(nextRequest.floor);
                    await this.moveToFloor(nextRequest.floor);
                    this.removeDestination(nextRequest.floor);
                    this.state.currentFloor = nextRequest.floor;
                    this.updatePosition();
                }
                continue;
            }

            // Check for floor requests in current direction
            const requestInDirection = this.findRequestInDirection(building);
            if (requestInDirection) {
                this.addDestination(requestInDirection.floor);
                await this.moveToFloor(requestInDirection.floor);
                this.removeDestination(requestInDirection.floor);
                this.state.currentFloor = requestInDirection.floor;
                this.updatePosition();
                continue;
            }

            // Check for requests in opposite direction
            const requestInOppositeDirection = this.findRequestInOppositeDirection(building);
            if (requestInOppositeDirection) {
                this.addDestination(requestInOppositeDirection.floor);
                await this.moveToFloor(requestInOppositeDirection.floor);
                this.removeDestination(requestInOppositeDirection.floor);
                this.state.currentFloor = requestInOppositeDirection.floor;
                this.updatePosition();
                continue;
            }

            // No requests, go idle
            this.state.direction = Direction.IDLE;
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
    }

    private findRequestInDirection(building: Building): FloorRequest | null {
        const floors = building.floors;
        const currentFloor = this.state.currentFloor;

        if (this.state.direction === Direction.UP) {
            for (let i = currentFloor + 1; i < floors.length; i++) {
                if (floors[i].hasUpRequest()) {
                    return floors[i].upRequest!;
                }
                if (floors[i].hasDownRequest()) {
                    return floors[i].downRequest!;
                }
            }
        } else if (this.state.direction === Direction.DOWN) {
            for (let i = currentFloor - 1; i >= 0; i--) {
                if (floors[i].hasUpRequest()) {
                    return floors[i].upRequest!;
                }
                if (floors[i].hasDownRequest()) {
                    return floors[i].downRequest!;
                }
            }
        }

        return null;
    }

    private findRequestInOppositeDirection(building: Building): FloorRequest | null {
        const floors = building.floors;
        const currentFloor = this.state.currentFloor;

        if (this.state.direction === Direction.UP) {
            for (let i = currentFloor - 1; i >= 0; i--) {
                if (floors[i].hasDownRequest()) {
                    return floors[i].downRequest!;
                }
            }
        } else if (this.state.direction === Direction.DOWN) {
            for (let i = currentFloor + 1; i < floors.length; i++) {
                if (floors[i].hasUpRequest()) {
                    return floors[i].upRequest!;
                }
            }
        }

        return null;
    }
}

// Building class representing the entire building with floors and elevators
class Building {
    public floors: Floor[] = [];
    public elevators: Elevator[] = [];
    public buildingElement: HTMLElement | null = null;

    constructor(numFloors: number, numElevators: number) {
        this.createFloors(numFloors);
        this.createElevators(numElevators);
    }

    private createFloors(numFloors: number): void {
        for (let i = 0; i < numFloors; i++) {
            const floor = new Floor(i);
            this.floors.push(floor);
        }
    }

    private createElevators(numElevators: number): void {
        for (let i = 0; i < numElevators; i++) {
            const elevator = new Elevator(i);
            this.elevators.push(elevator);
        }
    }

    render(): void {
        this.buildingElement = document.getElementById('building');
        if (!this.buildingElement) return;

        this.buildingElement.innerHTML = '';

        // Calculate elevator shaft height
        const floorHeight = 70;
        const totalHeight = this.floors.length * floorHeight + 20;

        // Create elevator shaft container
        const shaftContainer = document.createElement('div');
        shaftContainer.style.cssText = `
            position: relative;
            width: 80px;
            height: ${totalHeight}px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            margin: 0 10px;
        `;

        // Create elevators
        this.elevators.forEach((elevator) => {
            const elevatorElement = document.createElement('div');
            elevatorElement.className = 'elevator elevator-idle';
            elevatorElement.style.cssText = `
                width: 70px;
                height: 60px;
                background: linear-gradient(145deg, #4ecca3, #3db892);
                border-radius: 8px;
                position: absolute;
                left: 5px;
                top: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 3px;
                transition: top 0.5s ease;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                z-index: 10;
            `;

            const elevatorNumber = document.createElement('span');
            elevatorNumber.className = 'elevator-number';
            elevatorNumber.textContent = `E${elevator.id}`;

            const elevatorDestination = document.createElement('span');
            elevatorDestination.className = 'elevator-destination';
            elevatorDestination.textContent = '';

            elevatorElement.appendChild(elevatorNumber);
            elevatorElement.appendChild(elevatorDestination);

            shaftContainer.appendChild(elevatorElement);
            elevator.element = elevatorElement;
            elevator.updatePosition();
        });

        // Create floor rows
        this.floors.forEach((floor, index) => {
            const floorRow = document.createElement('div');
            floorRow.className = 'floor-row';
            floorRow.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                position: relative;
            `;

            const floorNumber = document.createElement('div');
            floorNumber.className = 'floor-number';
            floorNumber.textContent = String(floor.number);

            const floorButtons = document.createElement('div');
            floorButtons.className = 'floor-buttons';

            // Up button (not for top floor)
            if (index < this.floors.length - 1) {
                const upButton = document.createElement('button');
                upButton.className = 'floor-btn';
                upButton.textContent = '↑';
                upButton.title = 'Request elevator to go up';
                upButton.addEventListener('click', () => this.handleUpRequest(floor));
                floorButtons.appendChild(upButton);
                floor.upButton = upButton;
            }

            // Down button (not for ground floor)
            if (index > 0) {
                const downButton = document.createElement('button');
                downButton.className = 'floor-btn';
                downButton.textContent = '↓';
                downButton.title = 'Request elevator to go down';
                downButton.addEventListener('click', () => this.handleDownRequest(floor));
                floorButtons.appendChild(downButton);
                floor.downButton = downButton;
            }

            floorRow.appendChild(floorNumber);
            floorRow.appendChild(floorButtons);
            if (this.buildingElement) {
                this.buildingElement.appendChild(floorRow);
            }
        });

        if (this.buildingElement) {
            this.buildingElement.appendChild(shaftContainer);
        }
    }

    private handleUpRequest(floor: Floor): void {
        if (floor.hasUpRequest()) return;

        floor.upRequest = {
            floor: floor.number,
            direction: Direction.UP,
            timestamp: Date.now(),
        };

        if (floor.upButton) {
            floor.upButton.classList.add('active');
        }

        this.dispatchElevator(floor.number, Direction.UP);
    }

    private handleDownRequest(floor: Floor): void {
        if (floor.hasDownRequest()) return;

        floor.downRequest = {
            floor: floor.number,
            direction: Direction.DOWN,
            timestamp: Date.now(),
        };

        if (floor.downButton) {
            floor.downButton.classList.add('active');
        }

        this.dispatchElevator(floor.number, Direction.DOWN);
    }

    private dispatchElevator(floor: number, direction: Direction): void {
        // Find the best elevator to respond
        const bestElevator = this.findBestElevator(floor, direction);

        if (bestElevator) {
            bestElevator.requestQueue.push({
                floor,
                direction,
                timestamp: Date.now(),
            });
        }
    }

    private findBestElevator(floor: number, direction: Direction): Elevator | null {
        const idleElevators = this.elevators.filter(
            (e) => e.state.direction === Direction.IDLE
        );

        if (idleElevators.length > 0) {
            // Find closest idle elevator
            idleElevators.sort((a, b) => {
                const distA = Math.abs(a.state.currentFloor - floor);
                const distB = Math.abs(b.state.currentFloor - floor);
                return distA - distB;
            });
            return idleElevators[0];
        }

        // All elevators are busy, find the one that will be available soonest
        // and is traveling in the requested direction
        const elevatorsInDirection = this.elevators.filter(
            (e) => e.state.direction === direction
        );

        if (elevatorsInDirection.length > 0) {
            elevatorsInDirection.sort((a, b) => {
                const distA = Math.abs(a.state.currentFloor - floor);
                const distB = Math.abs(b.state.currentFloor - floor);
                return distA - distB;
            });
            return elevatorsInDirection[0];
        }

        // No elevator in direction, find closest elevator
        this.elevators.sort((a, b) => {
            const distA = Math.abs(a.state.currentFloor - floor);
            const distB = Math.abs(b.state.currentFloor - floor);
            return distA - distB;
        });
        return this.elevators[0];
    }

    startElevatorProcesses(): void {
        this.elevators.forEach((elevator) => {
            elevator.processRequests(this);
        });
    }

    reset(): void {
        // Reset all floors
        this.floors.forEach((floor) => {
            floor.clearUpRequest();
            floor.clearDownRequest();
        });

        // Reset all elevators
        this.elevators.forEach((elevator) => {
            elevator.state = {
                currentFloor: 0,
                direction: Direction.IDLE,
                destinationFloors: new Set(),
                isMoving: false,
            };
            elevator.requestQueue = [];
            elevator.updatePosition();
            elevator.setMoving(false);
            elevator.updateDestinationDisplay();
        });
    }
}

// Main application
class ElevatorSimulator {
    public building: Building | null = null;

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        this.building = new Building(CONFIG.FLOORS, CONFIG.ELEVATORS);
        this.building.render();
        this.building.startElevatorProcesses();

        // Setup reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.reset());
        }
    }

    private reset(): void {
        if (this.building) {
            this.building.reset();
        }
    }
}

// Start the simulator when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ElevatorSimulator();
});
