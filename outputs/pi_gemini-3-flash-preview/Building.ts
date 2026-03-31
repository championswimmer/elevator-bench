import { Elevator, Direction } from './Elevator.ts';

export const NUM_FLOORS = 10;
export const NUM_ELEVATORS = 4;

export class Building {
    elevators: Elevator[] = [];
    floorRequests: { floor: number; direction: Direction }[] = [];

    constructor() {
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }
    }

    requestElevator(floor: number, direction: Direction) {
        // Find the best elevator
        let bestElevator: Elevator | null = null;
        let minDistance = Infinity;

        for (const elevator of this.elevators) {
            const distance = Math.abs(elevator.currentFloor - floor);
            
            // Logic 1: Closest idle or travelling in direction
            const isIdle = elevator.direction === Direction.IDLE;
            const isGoingTowards = 
                (elevator.direction === Direction.UP && floor >= elevator.currentFloor) ||
                (elevator.direction === Direction.DOWN && floor <= elevator.currentFloor);

            if ((isIdle || isGoingTowards) && distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        }

        if (bestElevator) {
            bestElevator.addTarget(floor);
            this.updateElevatorStatus(bestElevator.id);
        } else {
            // Logic 2: Queue the request
            this.floorRequests.push({ floor, direction });
        }
    }

    updateElevatorStatus(id: number) {
        const elevator = this.elevators[id];
        if (elevator.isMoving) return;

        const nextTarget = elevator.getNextFloor();
        if (nextTarget !== null) {
            this.moveElevator(elevator, nextTarget);
        } else {
            // Check for queued floor requests if idle
            if (this.floorRequests.length > 0) {
                const request = this.floorRequests.shift()!;
                elevator.addTarget(request.floor);
                this.updateElevatorStatus(id);
            }
        }
    }

    async moveElevator(elevator: Elevator, targetFloor: number) {
        elevator.isMoving = true;
        
        // Custom event for animation
        const event = new CustomEvent('elevator-move', {
            detail: { id: elevator.id, floor: targetFloor }
        });
        window.dispatchEvent(event);

        // Simulation delay for travel time (e.g., 1s per floor)
        const floorsToTravel = Math.abs(elevator.currentFloor - targetFloor);
        await new Promise(resolve => setTimeout(resolve, floorsToTravel * 1000));

        elevator.currentFloor = targetFloor;
        elevator.targetFloors.delete(targetFloor);
        elevator.isMoving = false;
        
        // Update direction if all targets in current direction met
        elevator.updateDirection();
        
        // Process next target
        this.updateElevatorStatus(elevator.id);
        
        window.dispatchEvent(new CustomEvent('elevator-stopped', {
            detail: { id: elevator.id, floor: targetFloor }
        }));
    }
}
