import { Elevator, Direction } from './elevator.js';
import { Floor } from './floor.js';

export class Building {
    totalFloors: number;
    totalElevators: number;
    floors: Floor[];
    elevators: Elevator[];
    requestQueue: Array<{ floor: number; direction: Direction }>;
    isSimulationRunning: boolean;
    simulationInterval: number | null;
    totalRequests: number;

    constructor(totalFloors: number = 10, totalElevators: number = 4) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        this.floors = [];
        this.elevators = [];
        this.requestQueue = [];
        this.isSimulationRunning = false;
        this.simulationInterval = null;
        this.totalRequests = 0;
    }

    initialize(): void {
        // Create floors
        for (let i = 0; i < this.totalFloors; i++) {
            this.floors.push(new Floor(i));
        }

        // Create elevators
        for (let i = 0; i < this.totalElevators; i++) {
            this.elevators.push(new Elevator(i));
        }
    }

    render(container: HTMLElement): void {
        container.innerHTML = '';

        // Render floors in reverse order (top floor first)
        for (let i = this.totalFloors - 1; i >= 0; i--) {
            this.floors[i].render(container, this.totalFloors);
        }

        // Get all shafts containers and render elevators in each
        const floorDivs = container.querySelectorAll('.floor');
        floorDivs.forEach((floorDiv, floorIndex) => {
            const shaftsContainer = floorDiv.querySelector('#shafts-container');
            if (shaftsContainer) {
                shaftsContainer.innerHTML = '';
                this.elevators.forEach(elevator => {
                    // Create a mini shaft for each elevator
                    const miniShaft = document.createElement('div');
                    miniShaft.className = 'elevator-shaft';
                    miniShaft.style.flex = '1';
                    miniShaft.style.minWidth = '80px';
                    miniShaft.style.maxWidth = '120px';
                    miniShaft.style.height = '50px';

                    const elevatorDiv = document.createElement('div');
                    elevatorDiv.className = 'elevator status-idle';
                    elevatorDiv.style.top = '0';
                    elevatorDiv.id = `elevator-${elevator.id}-floor-${floorIndex}`;

                    const elevatorNumber = document.createElement('div');
                    elevatorNumber.className = 'elevator-number';
                    elevatorNumber.textContent = `E${elevator.id}`;
                    elevatorNumber.style.fontSize = '10px';
                    elevatorNumber.style.padding = '2px 5px';

                    elevatorDiv.appendChild(elevatorNumber);
                    miniShaft.appendChild(elevatorDiv);
                    shaftsContainer.appendChild(miniShaft);
                });
            }
        });
    }

    requestElevator(floor: number, direction: Direction): void {
        this.totalRequests++;
        this.updateRequestDisplay();

        // Find the best elevator to respond
        const elevator = this.findBestElevator(floor, direction);

        if (elevator) {
            elevator.addTargetFloor(floor);
            this.clearFloorRequest(floor);
        } else {
            // Add to queue if all elevators are busy
            this.requestQueue.push({ floor, direction });
        }
    }

    findBestElevator(floor: number, direction: Direction): Elevator | null {
        const idleElevators = this.elevators.filter(e => !e.isMoving);

        if (idleElevators.length > 0) {
            // Find the closest idle elevator
            let closestElevator = idleElevators[0];
            let minDistance = Math.abs(closestElevator.currentFloor - floor);

            for (const elevator of idleElevators) {
                const distance = Math.abs(elevator.currentFloor - floor);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestElevator = elevator;
                }
            }

            return closestElevator;
        }

        // All elevators are busy, return null
        return null;
    }

    clearFloorRequest(floor: number): void {
        const floorObj = this.floors[floor];
        if (floorObj) {
            floorObj.clearRequests();
        }
    }

    processQueue(): void {
        if (this.requestQueue.length === 0) return;

        const pendingRequests = [...this.requestQueue];
        this.requestQueue = [];

        for (const request of pendingRequests) {
            const elevator = this.findBestElevator(request.floor, request.direction);
            if (elevator) {
                elevator.addTargetFloor(request.floor);
            } else {
                this.requestQueue.push(request);
            }
        }
    }

    moveElevators(): void {
        for (const elevator of this.elevators) {
            if (elevator.isMoving && elevator.direction !== Direction.IDLE) {
                const nextTarget = elevator.getNextTarget();

                if (nextTarget !== null) {
                    const currentFloor = elevator.currentFloor;

                    if (elevator.direction === Direction.UP && currentFloor < nextTarget) {
                        elevator.moveOneFloor();
                    } else if (elevator.direction === Direction.DOWN && currentFloor > nextTarget) {
                        elevator.moveOneFloor();
                    }

                    // Check if we've reached a target floor
                    if (elevator.targetFloors.has(elevator.currentFloor)) {
                        elevator.removeTargetFloor(elevator.currentFloor);
                        elevator.openDoors();

                        // Close doors after a delay
                        setTimeout(() => {
                            elevator.closeDoors();
                        }, 1000);
                    }
                }
            }
        }

        this.processQueue();
    }

    updateDisplays(): void {
        for (const elevator of this.elevators) {
            elevator.updateDisplay();
        }

        for (const floor of this.floors) {
            floor.updateButtonStates();
        }
    }

    updateRequestDisplay(): void {
        const requestElement = document.getElementById('totalRequests');
        if (requestElement) {
            requestElement.textContent = this.totalRequests.toString();
        }
    }

    startSimulation(): void {
        if (this.isSimulationRunning) return;

        this.isSimulationRunning = true;
        const statusElement = document.getElementById('simulationStatus');
        if (statusElement) {
            statusElement.textContent = 'Running';
        }

        this.simulationInterval = window.setInterval(() => {
            this.moveElevators();
            this.updateDisplays();
        }, 1000) as unknown as number;
    }

    stopSimulation(): void {
        if (!this.isSimulationRunning) return;

        this.isSimulationRunning = false;
        const statusElement = document.getElementById('simulationStatus');
        if (statusElement) {
            statusElement.textContent = 'Stopped';
        }

        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    reset(): void {
        this.stopSimulation();

        for (const elevator of this.elevators) {
            elevator.reset();
        }

        for (const floor of this.floors) {
            floor.reset();
        }

        this.requestQueue = [];
        this.totalRequests = 0;

        this.updateRequestDisplay();
        this.updateDisplays();

        const statusElement = document.getElementById('simulationStatus');
        if (statusElement) {
            statusElement.textContent = 'Idle';
        }
    }
}
