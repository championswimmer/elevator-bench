import { Elevator, Direction, ElevatorState } from './Elevator';
import { Floor } from './Floor';

export interface FloorRequest {
    floor: number;
    direction: Direction;
}

export class Building {
    totalFloors: number;
    totalElevators: number;
    elevators: Elevator[];
    floors: Floor[];
    requestQueue: FloorRequest[];
    isRunning: boolean;

    constructor(totalFloors: number, totalElevators: number) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        this.elevators = [];
        this.floors = [];
        this.requestQueue = [];
        this.isRunning = false;
        
        this.initializeElevators();
        this.initializeFloors();
    }

    private initializeElevators(): void {
        for (let i = 0; i < this.totalElevators; i++) {
            const elevator = new Elevator(i, this.totalFloors);
            this.elevators.push(elevator);
        }
    }

    private initializeFloors(): void {
        for (let i = 0; i < this.totalFloors; i++) {
            const floor = new Floor(i, this.totalFloors, (floorNumber, direction) => {
                this.handleFloorRequest(floorNumber, direction);
            });
            this.floors.push(floor);
        }
    }

    handleFloorRequest(floorNumber: number, direction: Direction): void {
        if (!this.isRunning) {
            return;
        }

        const request: FloorRequest = { floor: floorNumber, direction };
        
        const availableElevator = this.findBestElevator(request);
        
        if (availableElevator) {
            availableElevator.addFloorRequest(floorNumber, direction);
        } else {
            this.requestQueue.push(request);
        }
    }

    private findBestElevator(request: FloorRequest): Elevator | null {
        const idleElevators = this.elevators.filter(e => e.isIdle());
        
        if (idleElevators.length === 0) {
            return null;
        }

        let bestElevator: Elevator | null = null;
        let minDistance = Infinity;
        
        for (const elevator of idleElevators) {
            const distance = elevator.getDistanceToFloor(request.floor);
            if (distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        }
        
        return bestElevator;
    }

    processQueue(): void {
        if (this.requestQueue.length === 0) {
            return;
        }

        const request = this.requestQueue[0];
        const availableElevator = this.findBestElevator(request);
        
        if (availableElevator) {
            this.requestQueue.shift();
            availableElevator.addFloorRequest(request.floor, request.direction);
        }
    }

    start(): void {
        this.isRunning = true;
    }

    stop(): void {
        this.isRunning = false;
    }

    reset(): void {
        this.isRunning = false;
        this.requestQueue = [];
        
        for (const elevator of this.elevators) {
            elevator.currentFloor = 0;
            elevator.state = ElevatorState.IDLE;
            elevator.direction = Direction.NONE;
            elevator.destinationFloors.clear();
            elevator.floorRequests.clear();
            elevator.updatePosition();
            elevator.updateState();
        }
    }

    getActiveRequestsCount(): number {
        let count = this.requestQueue.length;
        
        for (const elevator of this.elevators) {
            count += elevator.destinationFloors.size;
        }
        
        return count;
    }

    renderFloors(container: HTMLElement): void {
        container.innerHTML = '';
        
        for (const floor of this.floors) {
            container.appendChild(floor.element);
        }
    }

    renderElevators(container: HTMLElement): void {
        container.innerHTML = '';
        
        for (let i = 0; i < this.elevators.length; i++) {
            const elevator = this.elevators[i];
            elevator.element.style.left = `${i * 50}px`;
            container.appendChild(elevator.element);
        }
    }
}