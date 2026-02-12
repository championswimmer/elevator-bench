import { Direction, NUM_FLOORS } from './types';

export class Floor {
    floorNumber: number;
    hasUpButton: boolean;
    hasDownButton: boolean;
    private upButtonElement: HTMLElement | null = null;
    private downButtonElement: HTMLElement | null = null;

    constructor(floorNumber: number) {
        this.floorNumber = floorNumber;
        this.hasUpButton = floorNumber < NUM_FLOORS - 1;
        this.hasDownButton = floorNumber > 0;
    }

    setUpButtonElement(element: HTMLElement): void {
        this.upButtonElement = element;
    }

    setDownButtonElement(element: HTMLElement): void {
        this.downButtonElement = element;
    }

    activateButton(direction: Direction): void {
        if (direction === Direction.Up && this.upButtonElement) {
            this.upButtonElement.classList.add('active');
        } else if (direction === Direction.Down && this.downButtonElement) {
            this.downButtonElement.classList.add('active');
        }
    }

    deactivateButton(direction: Direction): void {
        if (direction === Direction.Up && this.upButtonElement) {
            this.upButtonElement.classList.remove('active');
        } else if (direction === Direction.Down && this.downButtonElement) {
            this.downButtonElement.classList.remove('active');
        }
    }
}
