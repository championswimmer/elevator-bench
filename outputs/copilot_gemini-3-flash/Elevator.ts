import { Direction } from './Floor';
import { ELEVATOR_SPEED } from './constants';

export class Elevator {
    public id: number;
    public currentFloor: number = 0;
    public targetFloors: Set<number> = new Set();
    public direction: Direction = Direction.IDLE;
    public isMoving: boolean = false;
    public onFloorReached: (elevator: Elevator, floor: number) => void;

    constructor(id: number, onFloorReached: (elevator: Elevator, floor: number) => void) {
        this.id = id;
        this.onFloorReached = onFloorReached;
    }

    public addRequest(floor: number) {
        this.targetFloors.add(floor);
        if (!this.isMoving) {
            this.processNextRequest();
        }
    }

    private async processNextRequest() {
        if (this.targetFloors.size === 0) {
            this.direction = Direction.IDLE;
            this.isMoving = false;
            return;
        }

        this.isMoving = true;
        const nextFloor = this.getNextFloor();

        if (nextFloor === null) {
            this.direction = Direction.IDLE;
            this.isMoving = false;
            return;
        }

        if (nextFloor > this.currentFloor) {
            this.direction = Direction.UP;
        } else if (nextFloor < this.currentFloor) {
            this.direction = Direction.DOWN;
        } else {
            // Already at the floor
            this.targetFloors.delete(this.currentFloor);
            this.onFloorReached(this, this.currentFloor);
            setTimeout(() => this.processNextRequest(), 2000); // Wait at floor
            return;
        }

        await this.moveToFloor(nextFloor);
    }

    private getNextFloor(): number | null {
        const targets = Array.from(this.targetFloors).sort((a, b) => a - b);
        
        if (this.direction === Direction.UP) {
            const above = targets.filter(f => f >= this.currentFloor);
            if (above.length > 0) return above[0];
            const below = targets.filter(f => f < this.currentFloor);
            if (below.length > 0) return below[below.length - 1];
        } else if (this.direction === Direction.DOWN) {
            const below = targets.filter(f => f <= this.currentFloor);
            if (below.length > 0) return below[below.length - 1];
            const above = targets.filter(f => f > this.currentFloor);
            if (above.length > 0) return above[0];
        } else {
            // Idle, pick closest
            let closest = targets[0];
            let minDiff = Math.abs(targets[0] - this.currentFloor);
            for (const f of targets) {
                const diff = Math.abs(f - this.currentFloor);
                if (diff < minDiff) {
                    minDiff = diff;
                    closest = f;
                }
            }
            return closest;
        }
        return null;
    }

    private async moveToFloor(targetFloor: number) {
        const step = targetFloor > this.currentFloor ? 1 : -1;
        
        while (this.currentFloor !== targetFloor) {
            await new Promise(resolve => setTimeout(resolve, ELEVATOR_SPEED));
            this.currentFloor += step;
            
            if (this.targetFloors.has(this.currentFloor)) {
                this.targetFloors.delete(this.currentFloor);
                this.onFloorReached(this, this.currentFloor);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait at floor
                // Re-evaluate next floor in case a new request came in
                const next = this.getNextFloor();
                if (next === null) break;
                if (next !== targetFloor) {
                    targetFloor = next;
                }
            }
        }
        
        this.processNextRequest();
    }
}
