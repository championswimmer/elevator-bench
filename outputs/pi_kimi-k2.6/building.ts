import { Elevator, type ElevatorDirection } from './elevator';
import { Floor } from './floor';

interface QueuedRequest {
    floor: number;
    direction: ElevatorDirection;
}

export class Building {
    floors: Floor[];
    elevators: Elevator[];
    requestQueue: QueuedRequest[];
    private onStateChange: (() => void) | null;

    constructor(numFloors: number, numElevators: number) {
        this.floors = [];
        this.elevators = [];
        this.requestQueue = [];
        this.onStateChange = null;

        for (let i = 0; i < numFloors; i++) {
            this.floors.push(new Floor(i, numFloors));
        }

        for (let i = 0; i < numElevators; i++) {
            this.elevators.push(new Elevator(i));
        }
    }

    setOnStateChange(callback: () => void) {
        this.onStateChange = callback;
        for (const floor of this.floors) {
            floor.setOnStateChange(() => this.notifyChange());
        }
        for (const elevator of this.elevators) {
            elevator.setOnStateChange(() => this.notifyChange());
        }
    }

    private notifyChange() {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    requestElevator(floor: number, direction: ElevatorDirection): boolean {
        if (floor < 0 || floor >= this.floors.length) {
            return false;
        }

        const floorObj = this.floors[floor];
        if (!floorObj.pressButton(direction)) {
            return false;
        }

        // Try to assign to best elevator
        const assigned = this.assignToBestElevator(floor, direction);

        if (!assigned) {
            // Queue the request
            this.requestQueue.push({ floor, direction });
            this.notifyChange();
        }

        return true;
    }

    private assignToBestElevator(floor: number, direction: ElevatorDirection): boolean {
        // Find the best elevator: closest idle elevator traveling in the direction of request
        let bestElevator: Elevator | null = null;
        let bestScore = Infinity;

        for (const elevator of this.elevators) {
            if (elevator.canAcceptRequest(floor, direction)) {
                const distance = elevator.getDistanceTo(floor);
                // Prefer idle elevators, then closer ones
                const score = elevator.state === 'idle' ? distance : distance + 100;
                if (score < bestScore) {
                    bestScore = score;
                    bestElevator = elevator;
                }
            }
        }

        if (bestElevator) {
            bestElevator.addDestination(floor);
            return true;
        }

        return false;
    }

    selectDestination(elevatorId: number, floor: number): boolean {
        if (elevatorId < 0 || elevatorId >= this.elevators.length) {
            return false;
        }
        if (floor < 0 || floor >= this.floors.length) {
            return false;
        }

        const elevator = this.elevators[elevatorId];
        return elevator.addDestination(floor);
    }

    update(deltaTime: number) {
        // Update all elevators
        for (const elevator of this.elevators) {
            const prevFloor = elevator.currentFloor;
            elevator.update(deltaTime);

            // If elevator stopped at a floor with doors open, clear the floor button
            if (elevator.state === 'door_open' && prevFloor !== elevator.currentFloor) {
                // This shouldn't happen in same update, but handle it
            }
            if (elevator.state === 'door_open') {
                const floor = this.floors[elevator.currentFloor];
                if (elevator.direction === 'up' || (elevator.direction === 'idle' && floor.upPressed)) {
                    floor.clearButton('up');
                }
                if (elevator.direction === 'down' || (elevator.direction === 'idle' && floor.downPressed)) {
                    floor.clearButton('down');
                }
                // Also clear the opposite direction if this was a destination stop
                if (elevator.destinations.size === 0 || !elevator.destinations.has(elevator.currentFloor)) {
                    floor.clearButton('up');
                    floor.clearButton('down');
                }
            }
        }

        // Process queued requests
        this.processQueue();
    }

    private processQueue() {
        const remaining: QueuedRequest[] = [];

        for (const request of this.requestQueue) {
            const assigned = this.assignToBestElevator(request.floor, request.direction);
            if (!assigned) {
                remaining.push(request);
            }
        }

        if (remaining.length !== this.requestQueue.length) {
            this.requestQueue = remaining;
            this.notifyChange();
        }
    }

    reset(numFloors: number, numElevators: number) {
        this.floors = [];
        this.elevators = [];
        this.requestQueue = [];

        for (let i = 0; i < numFloors; i++) {
            const floor = new Floor(i, numFloors);
            floor.setOnStateChange(() => this.notifyChange());
            this.floors.push(floor);
        }

        for (let i = 0; i < numElevators; i++) {
            const elevator = new Elevator(i);
            elevator.setOnStateChange(() => this.notifyChange());
            this.elevators.push(elevator);
        }

        this.notifyChange();
    }
}
