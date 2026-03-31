export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    IDLE = 'IDLE'
}

export class Elevator {
    id: number;
    currentFloor: number = 0;
    direction: Direction = Direction.IDLE;
    targetFloors: Set<number> = new Set();
    element: HTMLElement;
    doorState: 'OPEN' | 'CLOSED' = 'CLOSED';

    constructor(id: number) {
        this.id = id;
        this.element = document.createElement('div');
        this.element.className = 'elevator';
        this.element.id = `elevator-${id}`;
        this.element.innerHTML = `<div class="elevator-doors"></div><div class="elevator-label">${id}</div>`;
        this.updatePosition();
    }

    addRequest(floor: number) {
        this.targetFloors.add(floor);
        this.updateDirection();
    }

    updateDirection() {
        if (this.direction === Direction.IDLE && this.targetFloors.size > 0) {
            const targets = Array.from(this.targetFloors);
            const nextFloor = targets[0]; // Simple approach
            this.direction = nextFloor > this.currentFloor ? Direction.UP : Direction.DOWN;
        }
    }

    updatePosition() {
        this.element.style.bottom = `${this.currentFloor * 100}px`;
        this.element.style.left = `${this.id * 80 + 100}px`;
    }

    step() {
        if (this.doorState === 'OPEN') return; // Wait for doors to close

        if (this.targetFloors.size === 0) {
            this.direction = Direction.IDLE;
            return;
        }

        if (this.targetFloors.has(this.currentFloor)) {
            this.targetFloors.delete(this.currentFloor);
            this.openDoors();
            this.updateDirection(); // Re-evaluate direction after servicing
            return;
        }

        let hasHigher = false;
        let hasLower = false;
        for (const f of this.targetFloors) {
            if (f > this.currentFloor) hasHigher = true;
            if (f < this.currentFloor) hasLower = true;
        }

        if (this.direction === Direction.UP) {
            if (hasHigher) {
                this.currentFloor++;
            } else if (hasLower) {
                this.direction = Direction.DOWN;
                this.currentFloor--;
            } else {
                this.direction = Direction.IDLE;
            }
        } else if (this.direction === Direction.DOWN) {
            if (hasLower) {
                this.currentFloor--;
            } else if (hasHigher) {
                this.direction = Direction.UP;
                this.currentFloor++;
            } else {
                this.direction = Direction.IDLE;
            }
        }

        this.updatePosition();
    }

    openDoors() {
        this.doorState = 'OPEN';
        this.element.classList.add('open');
        setTimeout(() => {
            this.element.classList.remove('open');
            this.doorState = 'CLOSED';
            this.updateDirection();
        }, 1000);
    }
}
