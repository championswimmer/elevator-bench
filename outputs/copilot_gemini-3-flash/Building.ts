import { Elevator } from './Elevator';
import { Floor, Direction } from './Floor';

export class Building {
    public floors: Floor[];
    public elevators: Elevator[];
    private requestQueue: { floor: number, direction: Direction }[] = [];

    constructor(numFloors: number, numElevators: number, onFloorReached: (elevator: Elevator, floor: number) => void) {
        this.floors = Array.from({ length: numFloors }, (_, i) => new Floor(i));
        this.elevators = Array.from({ length: numElevators }, (_, i) => new Elevator(i, onFloorReached));
    }

    public requestElevator(floor: number, direction: Direction) {
        const floorObj = this.floors[floor];
        if (direction === Direction.UP && floorObj.upButtonActive) return;
        if (direction === Direction.DOWN && floorObj.downButtonActive) return;

        floorObj.activateButton(direction);

        const bestElevator = this.findBestElevator(floor, direction);
        if (bestElevator) {
            bestElevator.addRequest(floor);
        } else {
            this.requestQueue.push({ floor, direction });
        }
    }

    private findBestElevator(floor: number, direction: Direction): Elevator | null {
        let bestElevator: Elevator | null = null;
        let minDistance = Infinity;

        for (const elevator of this.elevators) {
            const distance = Math.abs(elevator.currentFloor - floor);

            // Case 1: Elevator is idle
            if (elevator.direction === Direction.IDLE) {
                if (distance < minDistance) {
                    minDistance = distance;
                    bestElevator = elevator;
                }
            }
            // Case 2: Elevator is moving in the same direction and hasn't passed the floor
            else if (elevator.direction === direction) {
                if (direction === Direction.UP && elevator.currentFloor <= floor) {
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestElevator = elevator;
                    }
                } else if (direction === Direction.DOWN && elevator.currentFloor >= floor) {
                    if (distance < minDistance) {
                        minDistance = distance;
                        bestElevator = elevator;
                    }
                }
            }
        }

        return bestElevator;
    }

    public processQueue() {
        if (this.requestQueue.length === 0) return;

        const remainingQueue: { floor: number, direction: Direction }[] = [];
        for (const request of this.requestQueue) {
            const bestElevator = this.findBestElevator(request.floor, request.direction);
            if (bestElevator) {
                bestElevator.addRequest(request.floor);
            } else {
                remainingQueue.push(request);
            }
        }
        this.requestQueue = remainingQueue;
    }
}
