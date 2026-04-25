import type { ElevatorDirection } from './elevator';

export class Floor {
    floorNumber: number;
    upPressed: boolean;
    downPressed: boolean;
    hasUpButton: boolean;
    hasDownButton: boolean;
    private onStateChange: (() => void) | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.upPressed = false;
        this.downPressed = false;
        this.hasUpButton = floorNumber < totalFloors - 1;
        this.hasDownButton = floorNumber > 0;
        this.onStateChange = null;
    }

    setOnStateChange(callback: () => void) {
        this.onStateChange = callback;
    }

    private notifyChange() {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    pressButton(direction: ElevatorDirection): boolean {
        if (direction === 'up' && this.hasUpButton && !this.upPressed) {
            this.upPressed = true;
            this.notifyChange();
            return true;
        }
        if (direction === 'down' && this.hasDownButton && !this.downPressed) {
            this.downPressed = true;
            this.notifyChange();
            return true;
        }
        return false;
    }

    clearButton(direction: ElevatorDirection) {
        if (direction === 'up') {
            this.upPressed = false;
        } else if (direction === 'down') {
            this.downPressed = false;
        }
        this.notifyChange();
    }

    reset() {
        this.upPressed = false;
        this.downPressed = false;
        this.notifyChange();
    }
}
