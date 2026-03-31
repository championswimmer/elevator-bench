export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    IDLE = 'IDLE'
}

export class Elevator {
    id: number;
    currentFloor: number = 0;
    targetFloors: Set<number> = new Set();
    direction: Direction = Direction.IDLE;
    isMoving: boolean = false;

    constructor(id: number) {
        this.id = id;
    }

    addTarget(floor: number) {
        this.targetFloors.add(floor);
        this.updateDirection();
    }

    updateDirection() {
        if (this.targetFloors.size === 0) {
            this.direction = Direction.IDLE;
            return;
        }

        if (this.direction === Direction.IDLE) {
            const firstTarget = Array.from(this.targetFloors)[0];
            this.direction = firstTarget > this.currentFloor ? Direction.UP : Direction.DOWN;
        }
    }

    getNextFloor(): number | null {
        if (this.targetFloors.size === 0) return null;

        const targets = Array.from(this.targetFloors);
        if (this.direction === Direction.UP) {
            const above = targets.filter(f => f > this.currentFloor).sort((a, b) => a - b);
            return above.length > 0 ? above[0] : null;
        } else if (this.direction === Direction.DOWN) {
            const below = targets.filter(f => f < this.currentFloor).sort((a, b) => b - a);
            return below.length > 0 ? below[0] : null;
        }
        return null;
    }
}
