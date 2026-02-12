import { Elevator } from './Elevator';
import { Floor } from './Floor';
import { Direction, FloorRequest, NUM_FLOORS, NUM_ELEVATORS } from './types';

export class Building {
    elevators: Elevator[];
    floors: Floor[];
    private pendingRequests: FloorRequest[];
    private onFloorRequest: ((request: FloorRequest) => void) | null = null;

    constructor() {
        this.elevators = [];
        this.floors = [];
        this.pendingRequests = [];
        
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }
        
        for (let i = 0; i < NUM_FLOORS; i++) {
            this.floors.push(new Floor(i));
        }
    }

    setOnFloorRequest(callback: (request: FloorRequest) => void): void {
        this.onFloorRequest = callback;
    }

    requestElevator(floor: number, direction: Direction): void {
        const request: FloorRequest = { floor, direction };
        
        this.floors[floor].activateButton(direction);
        
        if (this.onFloorRequest) {
            this.onFloorRequest(request);
        }
    }

    findBestElevator(request: FloorRequest): Elevator | null {
        const { floor, direction } = request;
        
        const idleElevators = this.elevators.filter(e => e.isIdle());
        
        if (idleElevators.length > 0) {
            return idleElevators.reduce((closest, elevator) => {
                const currentDistance = closest.getDistanceTo(floor);
                const newDistance = elevator.getDistanceTo(floor);
                return newDistance < currentDistance ? elevator : closest;
            });
        }
        
        const matchingElevators = this.elevators.filter(e => 
            e.canServeRequest(floor, direction) && !e.hasTargetFloor(floor)
        );
        
        if (matchingElevators.length > 0) {
            return matchingElevators.reduce((closest, elevator) => {
                const currentDistance = closest.getDistanceTo(floor);
                const newDistance = elevator.getDistanceTo(floor);
                return newDistance < currentDistance ? elevator : closest;
            });
        }
        
        return null;
    }

    addPendingRequest(request: FloorRequest): void {
        this.pendingRequests.push(request);
    }

    getNextPendingRequest(): FloorRequest | undefined {
        return this.pendingRequests.shift();
    }

    hasPendingRequests(): boolean {
        return this.pendingRequests.length > 0;
    }

    deactivateFloorButton(floor: number, direction: Direction): void {
        this.floors[floor].deactivateButton(direction);
    }
}
