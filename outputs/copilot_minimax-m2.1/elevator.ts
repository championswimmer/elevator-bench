export enum Direction {
    IDLE = 'idle',
    UP = 'up',
    DOWN = 'down'
}

export class Elevator {
    id: number;
    currentFloor: number;
    targetFloors: Set<number>;
    direction: Direction;
    isMoving: boolean;
    doorOpen: boolean;
    element: HTMLElement | null;
    doorElement: HTMLElement | null;
    directionElement: HTMLElement | null;
    floorIndicatorElement: HTMLElement | null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloors = new Set();
        this.direction = Direction.IDLE;
        this.isMoving = false;
        this.doorOpen = false;
        this.element = null;
        this.doorElement = null;
        this.directionElement = null;
        this.floorIndicatorElement = null;
    }

    addTargetFloor(floor: number): void {
        if (floor !== this.currentFloor) {
            this.targetFloors.add(floor);
            this.updateDirection();
        }
    }

    removeTargetFloor(floor: number): void {
        this.targetFloors.delete(floor);
        this.updateDirection();
    }

    hasTargetFloor(floor: number): boolean {
        return this.targetFloors.has(floor);
    }

    updateDirection(): void {
        if (this.targetFloors.size === 0) {
            this.direction = Direction.IDLE;
            this.isMoving = false;
            return;
        }

        const minTarget = Math.min(...this.targetFloors);
        const maxTarget = Math.max(...this.targetFloors);

        if (this.direction === Direction.IDLE) {
            if (this.currentFloor < minTarget) {
                this.direction = Direction.UP;
            } else if (this.currentFloor > maxTarget) {
                this.direction = Direction.DOWN;
            } else {
                // Current floor is within target range, determine direction based on closest request
                const upDistance = maxTarget - this.currentFloor;
                const downDistance = this.currentFloor - minTarget;
                this.direction = upDistance >= downDistance ? Direction.UP : Direction.DOWN;
            }
        }

        this.isMoving = this.targetFloors.size > 0;
    }

    getNextTarget(): number | null {
        if (this.targetFloors.size === 0) return null;

        const targets = Array.from(this.targetFloors).sort((a, b) => a - b);

        if (this.direction === Direction.UP) {
            const upTargets = targets.filter(f => f >= this.currentFloor);
            return upTargets.length > 0 ? Math.min(...upTargets) : targets[targets.length - 1];
        } else {
            const downTargets = targets.filter(f => f <= this.currentFloor);
            return downTargets.length > 0 ? Math.max(...downTargets) : targets[0];
        }
    }

    moveOneFloor(): boolean {
        if (!this.isMoving) return false;

        if (this.direction === Direction.UP) {
            this.currentFloor++;
        } else if (this.direction === Direction.DOWN) {
            this.currentFloor--;
        }

        this.targetFloors.delete(this.currentFloor);
        this.updateDirection();

        return true;
    }

    openDoors(): void {
        this.doorOpen = true;
        if (this.element) {
            this.element.classList.add('open');
        }
    }

    closeDoors(): void {
        this.doorOpen = false;
        if (this.element) {
            this.element.classList.remove('open');
        }
    }

    render(container: HTMLElement, totalFloors: number): void {
        const shaft = document.createElement('div');
        shaft.className = 'elevator-shaft';
        shaft.id = `shaft-${this.id}`;

        const elevator = document.createElement('div');
        elevator.className = 'elevator status-idle';
        elevator.id = `elevator-${this.id}`;
        elevator.style.top = '0px';

        this.element = elevator;
        this.doorElement = elevator;

        const content = document.createElement('div');
        content.className = 'elevator-content';

        this.floorIndicatorElement = document.createElement('div');
        this.floorIndicatorElement.className = 'elevator-number';
        this.floorIndicatorElement.textContent = `E${this.id}`;

        const buttons = document.createElement('div');
        buttons.className = 'elevator-buttons';

        for (let i = 0; i < totalFloors; i++) {
            const btn = document.createElement('button');
            btn.className = 'elevator-btn';
            btn.textContent = i.toString();
            btn.dataset.floor = i.toString();
            btn.addEventListener('click', () => {
                this.addTargetFloor(i);
            });
            buttons.appendChild(btn);
        }

        this.directionElement = document.createElement('div');
        this.directionElement.className = 'elevator-direction';
        this.directionElement.textContent = 'IDLE';

        content.appendChild(this.floorIndicatorElement);
        content.appendChild(buttons);
        content.appendChild(this.directionElement);
        elevator.appendChild(content);
        shaft.appendChild(elevator);
        container.appendChild(shaft);
    }

    updateDisplay(): void {
        if (!this.element || !this.directionElement) return;

        // Update position
        const shaftHeight = this.element.parentElement?.clientHeight || 60;
        this.element.style.top = '0px';

        // Update status class
        this.element.classList.remove('status-idle', 'status-moving-up', 'status-moving-down');
        if (this.direction === Direction.IDLE) {
            this.element.classList.add('status-idle');
        } else if (this.direction === Direction.UP) {
            this.element.classList.add('status-moving-up');
        } else {
            this.element.classList.add('status-moving-down');
        }

        // Update direction indicator
        let directionText = 'IDLE';
        if (this.direction === Direction.UP) directionText = '↑ UP';
        else if (this.direction === Direction.DOWN) directionText = '↓ DOWN';
        this.directionElement.textContent = directionText;

        // Update floor button states
        const buttons = this.element.querySelectorAll('.elevator-btn');
        buttons.forEach(btn => {
            const floor = parseInt(btn.dataset.floor || '0');
            if (this.targetFloors.has(floor)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    reset(): void {
        this.currentFloor = 0;
        this.targetFloors.clear();
        this.direction = Direction.IDLE;
        this.isMoving = false;
        this.doorOpen = false;
    }
}
