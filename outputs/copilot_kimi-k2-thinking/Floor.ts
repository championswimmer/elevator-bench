import { Direction, FloorRequest } from './types';

export class Floor {
    floorNumber: number;
    upButton: boolean;
    downButton: boolean;
    element: HTMLElement | null;
    upButtonElement: HTMLElement | null;
    downButtonElement: HTMLElement | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.upButton = false;
        this.downButton = false;
        this.element = null;
        this.upButtonElement = null;
        this.downButtonElement = null;

        // Top floor only has down button, bottom floor only has up button
        if (floorNumber === totalFloors - 1) {
            this.upButton = false;
            this.downButton = true;
        } else if (floorNumber === 0) {
            this.upButton = true;
            this.downButton = false;
        } else {
            this.upButton = true;
            this.downButton = true;
        }
    }

    setElement(element: HTMLElement): void {
        this.element = element;
        this.upButtonElement = element.querySelector('.up-btn');
        this.downButtonElement = element.querySelector('.down-btn');
        this.updateButtonStates();
    }

    pressUpButton(): FloorRequest | null {
        if (!this.upButton || !this.upButtonElement) return null;
        
        const request: FloorRequest = {
            floor: this.floorNumber,
            direction: Direction.UP
        };
        
        this.upButtonElement.classList.add('active');
        return request;
    }

    pressDownButton(): FloorRequest | null {
        if (!this.downButton || !this.downButtonElement) return null;
        
        const request: FloorRequest = {
            floor: this.floorNumber,
            direction: Direction.DOWN
        };
        
        this.downButtonElement.classList.add('active');
        return request;
    }

    clearButton(direction: Direction): void {
        if (direction === Direction.UP && this.upButtonElement) {
            this.upButtonElement.classList.remove('active');
        } else if (direction === Direction.DOWN && this.downButtonElement) {
            this.downButtonElement.classList.remove('active');
        }
    }

    updateButtonStates(): void {
        if (this.upButtonElement) {
            this.upButtonElement.style.display = this.upButton ? 'inline-block' : 'none';
        }
        if (this.downButtonElement) {
            this.downButtonElement.style.display = this.downButton ? 'inline-block' : 'none';
        }
    }
}