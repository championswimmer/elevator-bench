import { Elevator, Direction } from './Elevator';
import { Floor } from './Floor';

export class Building {
    floors: Floor[];
    elevators: Elevator[];
    requestQueue: { floor: number, direction: Direction }[];
    totalFloors: number;
    numberOfElevators: number;

    constructor(totalFloors: number, numberOfElevators: number) {
        this.totalFloors = totalFloors;
        this.numberOfElevators = numberOfElevators;
        this.floors = [];
        this.elevators = [];
        this.requestQueue = [];

        this.initialize();
    }

    initialize() {
        const buildingElement = document.getElementById('building')!;
        const floorsContainer = document.createElement('div');
        floorsContainer.classList.add('floors');
        buildingElement.appendChild(floorsContainer);

        for (let i = this.totalFloors - 1; i >= 0; i--) {
            const floor = new Floor(i, this.totalFloors, this.requestElevator.bind(this));
            this.floors.push(floor);
            floorsContainer.appendChild(floor.element);
        }

        for (let i = 0; i < this.numberOfElevators; i++) {
            const elevator = new Elevator(i, this.totalFloors);
            this.elevators.push(elevator);
            const elevatorShaft = document.createElement('div');
            elevatorShaft.classList.add('elevator-shaft');
            elevatorShaft.appendChild(elevator.element);
            buildingElement.appendChild(elevatorShaft);

            const elevatorButtons = elevator.element.querySelectorAll('.elevator-buttons button');
            elevatorButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const floor = parseInt((e.target as HTMLElement).dataset.floor!);
                    this.requestElevatorFromInside(elevator.id, floor);
                });
            });
        }

        setInterval(() => this.processQueue(), 1000);
    }

    requestElevator(floor: number, direction: Direction) {
        this.requestQueue.push({ floor, direction });
    }
    
    requestElevatorFromInside(elevatorId: number, floor: number) {
        const elevator = this.elevators[elevatorId];
        elevator.addRequest(floor);
    }

    processQueue() {
        if (this.requestQueue.length === 0) {
            this.elevators.forEach(elevator => {
                if (!elevator.isMoving && elevator.requests.length > 0) {
                    const nextRequest = elevator.requests[0];
                    elevator.moveTo(nextRequest);
                }
            });
            return;
        }

        const { floor, direction } = this.requestQueue.shift()!;
        const bestElevator = this.findBestElevator(floor, direction);

        if (bestElevator) {
            bestElevator.addRequest(floor);
        } else {
            this.requestQueue.push({ floor, direction }); // Re-queue if no elevator is available
        }
    }

    findBestElevator(floor: number, direction: Direction): Elevator | null {
        let bestElevator: Elevator | null = null;
        let minDistance = Infinity;

        // Find idle elevators
        for (const elevator of this.elevators) {
            if (elevator.direction === 'idle') {
                const distance = Math.abs(elevator.currentFloor - floor);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestElevator = elevator;
                }
            }
        }

        if (bestElevator) {
            return bestElevator;
        }

        // Find elevators moving in the same direction
        for (const elevator of this.elevators) {
            if (elevator.direction === direction) {
                if (direction === 'up' && elevator.currentFloor <= floor) {
                    const distance = floor - elevator.currentFloor;
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestElevator = elevator;
                    }
                } else if (direction === 'down' && elevator.currentFloor >= floor) {
                    const distance = elevator.currentFloor - floor;
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestElevator = elevator;
                    }
                }
            }
        }

        return bestElevator;
    }
}
