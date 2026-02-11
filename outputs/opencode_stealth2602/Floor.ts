export type ButtonDirection = 'up' | 'down' | 'both';

export class Floor {
    public floorNumber: number;
    public hasUpButton: boolean;
    public hasDownButton: boolean;
    public upActive: boolean;
    public downActive: boolean;
    private element: HTMLElement | null;
    private upButton: HTMLButtonElement | null;
    private downButton: HTMLButtonElement | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.hasUpButton = floorNumber < totalFloors - 1;
        this.hasDownButton = floorNumber > 0;
        this.upActive = false;
        this.downActive = false;
        this.element = null;
        this.upButton = null;
        this.downButton = null;
    }

    public setActive(direction: 'up' | 'down', active: boolean): void {
        if (direction === 'up' && this.hasUpButton) {
            this.upActive = active;
            this.updateButtonState();
        } else if (direction === 'down' && this.hasDownButton) {
            this.downActive = active;
            this.updateButtonState();
        }
    }

    private updateButtonState(): void {
        if (this.upButton) {
            if (this.upActive) {
                this.upButton.classList.add('active');
            } else {
                this.upButton.classList.remove('active');
            }
        }
        if (this.downButton) {
            if (this.downActive) {
                this.downButton.classList.add('active');
            } else {
                this.downButton.classList.remove('active');
            }
        }
    }

    public render(container: HTMLElement): void {
        const floor = document.createElement('div');
        floor.className = 'floor';
        
        const floorNumber = document.createElement('div');
        floorNumber.className = 'floor-number';
        floorNumber.textContent = String(this.floorNumber);
        
        const buttons = document.createElement('div');
        buttons.className = 'floor-buttons';
        
        if (this.hasUpButton) {
            this.upButton = document.createElement('button');
            this.upButton.className = 'floor-btn up';
            this.upButton.textContent = '▲';
            this.upButton.title = 'Call elevator up';
            this.upButton.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('floorRequest', { 
                    detail: { floor: this.floorNumber, direction: 'up' } 
                }));
            });
            buttons.appendChild(this.upButton);
        }
        
        if (this.hasDownButton) {
            this.downButton = document.createElement('button');
            this.downButton.className = 'floor-btn down';
            this.downButton.textContent = '▼';
            this.downButton.title = 'Call elevator down';
            this.downButton.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('floorRequest', { 
                    detail: { floor: this.floorNumber, direction: 'down' } 
                }));
            });
            buttons.appendChild(this.downButton);
        }
        
        floor.appendChild(buttons);
        floor.appendChild(floorNumber);
        container.appendChild(floor);
        
        this.element = floor;
    }
}
