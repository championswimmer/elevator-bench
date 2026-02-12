import {
    Direction,
    ElevatorState,
    NUM_FLOORS,
    FLOOR_HEIGHT,
    DOOR_OPEN_TIME,
    DOOR_CLOSE_TIME,
    FLOOR_TRAVEL_TIME
} from './types';

export class Elevator {
    id: number;
    currentFloor: number;
    direction: Direction;
    state: ElevatorState;
    targetFloors: Set<number>;
    private element: HTMLElement | null = null;
    private panelElement: HTMLElement | null = null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.direction = Direction.None;
        this.state = ElevatorState.Idle;
        this.targetFloors = new Set();
    }

    setElement(element: HTMLElement): void {
        this.element = element;
    }

    setPanelElement(element: HTMLElement): void {
        this.panelElement = element;
    }

    isIdle(): boolean {
        return this.state === ElevatorState.Idle && this.targetFloors.size === 0;
    }

    addTargetFloor(floor: number): void {
        this.targetFloors.add(floor);
    }

    hasTargetFloor(floor: number): boolean {
        return this.targetFloors.has(floor);
    }

    private updatePosition(): void {
        if (this.element) {
            const bottom = this.currentFloor * FLOOR_HEIGHT;
            this.element.style.bottom = `${bottom}px`;
        }
    }

    private updatePanelDisplay(): void {
        if (!this.panelElement) return;
        
        const buttons = this.panelElement.querySelectorAll('.panel-btn');
        buttons.forEach(btn => {
            const floor = parseInt(btn.getAttribute('data-floor') || '0');
            if (this.targetFloors.has(floor)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    async openDoors(): Promise<void> {
        if (!this.element) return;
        
        this.state = ElevatorState.DoorsOpen;
        this.element.classList.add('open');
        await this.delay(DOOR_OPEN_TIME);
    }

    async closeDoors(): Promise<void> {
        if (!this.element) return;
        
        this.element.classList.remove('open');
        await this.delay(DOOR_CLOSE_TIME);
    }

    async moveToFloor(targetFloor: number): Promise<void> {
        if (this.currentFloor === targetFloor) return;
        
        this.state = ElevatorState.Moving;
        this.direction = targetFloor > this.currentFloor ? Direction.Up : Direction.Down;
        
        const step = this.direction === Direction.Up ? 1 : -1;
        
        while (this.currentFloor !== targetFloor) {
            this.currentFloor += step;
            this.updatePosition();
            await this.delay(FLOOR_TRAVEL_TIME);
        }
        
        this.targetFloors.delete(targetFloor);
        this.updatePanelDisplay();
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getNextTargetFloor(): number | null {
        if (this.targetFloors.size === 0) return null;
        
        const targets = Array.from(this.targetFloors);
        
        if (this.direction === Direction.Up) {
            const upwardTargets = targets.filter(f => f > this.currentFloor);
            if (upwardTargets.length > 0) {
                return Math.min(...upwardTargets);
            }
            return Math.max(...targets);
        } else if (this.direction === Direction.Down) {
            const downwardTargets = targets.filter(f => f < this.currentFloor);
            if (downwardTargets.length > 0) {
                return Math.max(...downwardTargets);
            }
            return Math.min(...targets);
        }
        
        const closest = targets.reduce((prev, curr) => 
            Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev
        );
        return closest;
    }

    canServeRequest(floor: number, direction: Direction): boolean {
        if (this.isIdle()) return true;
        
        if (direction === Direction.Up && this.direction === Direction.Up) {
            return floor >= this.currentFloor;
        }
        
        if (direction === Direction.Down && this.direction === Direction.Down) {
            return floor <= this.currentFloor;
        }
        
        return false;
    }

    getDistanceTo(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }
}
