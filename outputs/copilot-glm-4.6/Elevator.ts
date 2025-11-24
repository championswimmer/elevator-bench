export enum ElevatorState {
    IDLE = 'idle',
    MOVING_UP = 'moving-up',
    MOVING_DOWN = 'moving-down',
    DOORS_OPEN = 'doors-open'
}

export enum Direction {
    UP = 'up',
    DOWN = 'down',
    NONE = 'none'
}

export class Elevator {
    id: number;
    currentFloor: number;
    state: ElevatorState;
    direction: Direction;
    destinationFloors: Set<number>;
    floorRequests: Map<number, Direction>;
    element!: HTMLElement;
    panelElement!: HTMLElement;
    floorButtons: Map<number, HTMLElement>;

    constructor(id: number, totalFloors: number) {
        this.id = id;
        this.currentFloor = 0;
        this.state = ElevatorState.IDLE;
        this.direction = Direction.NONE;
        this.destinationFloors = new Set<number>();
        this.floorRequests = new Map<number, Direction>();
        this.floorButtons = new Map<number, HTMLElement>();
        
        this.createElement();
        this.createPanel(totalFloors);
    }

    private createElement(): void {
        this.element = document.createElement('div');
        this.element.className = 'elevator idle';
        this.element.id = `elevator-${this.id}`;
        this.element.innerHTML = `<span>E${this.id}</span>`;
        this.updatePosition();
    }

    private createPanel(totalFloors: number): void {
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'elevator-panel';
        
        for (let floor = 0; floor < totalFloors; floor++) {
            const button = document.createElement('button');
            button.className = 'elevator-floor-button';
            button.textContent = `F${floor}`;
            button.dataset.floor = floor.toString();
            button.dataset.elevatorId = this.id.toString();
            
            button.addEventListener('click', () => {
                this.requestFloor(floor);
            });
            
            this.floorButtons.set(floor, button);
            this.panelElement.appendChild(button);
        }
        
        this.element.appendChild(this.panelElement);
    }

    requestFloor(floor: number): void {
        if (floor === this.currentFloor && this.state === ElevatorState.DOORS_OPEN) {
            return;
        }
        
        this.destinationFloors.add(floor);
        this.updateFloorButton(floor, true);
        
        if (this.state === ElevatorState.IDLE) {
            this.startMoving();
        }
    }

    addFloorRequest(floor: number, direction: Direction): void {
        this.floorRequests.set(floor, direction);
        this.requestFloor(floor);
    }

    private startMoving(): void {
        if (this.destinationFloors.size === 0) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.NONE;
            this.updateState();
            return;
        }

        const nextFloor = this.getNextFloor();
        if (nextFloor === undefined) {
            this.state = ElevatorState.IDLE;
            this.direction = Direction.NONE;
            this.updateState();
            return;
        }

        if (nextFloor > this.currentFloor) {
            this.direction = Direction.UP;
            this.state = ElevatorState.MOVING_UP;
        } else if (nextFloor < this.currentFloor) {
            this.direction = Direction.DOWN;
            this.state = ElevatorState.MOVING_DOWN;
        } else {
            this.arriveAtFloor();
            return;
        }

        this.updateState();
        this.moveToFloor(nextFloor);
    }

    private getNextFloor(): number | undefined {
        if (this.destinationFloors.size === 0) {
            return undefined;
        }

        let candidates: number[] = [];
        
        if (this.direction === Direction.UP) {
            candidates = Array.from(this.destinationFloors).filter(floor => floor > this.currentFloor);
            if (candidates.length === 0) {
                candidates = Array.from(this.destinationFloors).filter(floor => floor < this.currentFloor);
            }
        } else if (this.direction === Direction.DOWN) {
            candidates = Array.from(this.destinationFloors).filter(floor => floor < this.currentFloor);
            if (candidates.length === 0) {
                candidates = Array.from(this.destinationFloors).filter(floor => floor > this.currentFloor);
            }
        } else {
            candidates = Array.from(this.destinationFloors);
        }

        if (candidates.length === 0) {
            return undefined;
        }

        if (this.direction === Direction.UP) {
            return Math.min(...candidates);
        } else if (this.direction === Direction.DOWN) {
            return Math.max(...candidates);
        } else {
            return candidates.reduce((closest, floor) => {
                return Math.abs(floor - this.currentFloor) < Math.abs(closest - this.currentFloor) ? floor : closest;
            });
        }
    }

    private moveToFloor(targetFloor: number): void {
        const moveDuration = Math.abs(targetFloor - this.currentFloor) * 1000;
        
        setTimeout(() => {
            this.currentFloor = targetFloor;
            this.updatePosition();
            this.arriveAtFloor();
        }, moveDuration);
    }

    private arriveAtFloor(): void {
        this.state = ElevatorState.DOORS_OPEN;
        this.updateState();
        
        this.destinationFloors.delete(this.currentFloor);
        this.floorRequests.delete(this.currentFloor);
        this.updateFloorButton(this.currentFloor, false);
        
        setTimeout(() => {
            this.startMoving();
        }, 2000);
    }

    updatePosition(): void {
        const floorHeight = 60;
        this.element.style.bottom = `${this.currentFloor * floorHeight + 5}px`;
    }

    updateState(): void {
        this.element.className = `elevator ${this.state}`;
    }

    private updateFloorButton(floor: number, isActive: boolean): void {
        const button = this.floorButtons.get(floor);
        if (button) {
            if (isActive) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }

    isIdle(): boolean {
        return this.state === ElevatorState.IDLE;
    }

    canHandleRequest(floor: number, direction: Direction): boolean {
        if (!this.isIdle()) {
            return false;
        }
        
        return true;
    }

    getDistanceToFloor(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }
}