import { Direction } from './Elevator';

export class Floor {
    number: number;
    element!: HTMLElement;
    upButton!: HTMLElement;
    downButton!: HTMLElement;
    onRequest: (floor: number, direction: Direction) => void;

    constructor(floorNumber: number, totalFloors: number, onRequest: (floor: number, direction: Direction) => void) {
        this.number = floorNumber;
        this.onRequest = onRequest;
        
        this.createElement();
    }

    private createElement(): void {
        this.element = document.createElement('div');
        this.element.className = 'floor';
        this.element.id = `floor-${this.number}`;
        
        const floorNumber = document.createElement('div');
        floorNumber.className = 'floor-number';
        floorNumber.textContent = `F${this.number}`;
        
        const floorButtons = document.createElement('div');
        floorButtons.className = 'floor-buttons';
        
        if (this.number > 0) {
            this.upButton = document.createElement('button');
            this.upButton.className = 'floor-button up';
            this.upButton.textContent = '▲';
            this.upButton.addEventListener('click', () => {
                this.requestElevator(Direction.UP);
            });
            floorButtons.appendChild(this.upButton);
        }
        
        if (this.number < 9) {
            this.downButton = document.createElement('button');
            this.downButton.className = 'floor-button down';
            this.downButton.textContent = '▼';
            this.downButton.addEventListener('click', () => {
                this.requestElevator(Direction.DOWN);
            });
            floorButtons.appendChild(this.downButton);
        }
        
        this.element.appendChild(floorNumber);
        this.element.appendChild(floorButtons);
    }

    private requestElevator(direction: Direction): void {
        this.onRequest(this.number, direction);
        this.setButtonActive(direction, true);
    }

    setButtonActive(direction: Direction, isActive: boolean): void {
        if (direction === Direction.UP && this.upButton) {
            if (isActive) {
                this.upButton.classList.add('active');
            } else {
                this.upButton.classList.remove('active');
            }
        } else if (direction === Direction.DOWN && this.downButton) {
            if (isActive) {
                this.downButton.classList.add('active');
            } else {
                this.downButton.classList.remove('active');
            }
        }
    }
}