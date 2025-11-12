// Floor class to manage floor state and button handling
export class Floor {
    floorNumber: number;
    hasUpRequest: boolean;
    hasDownRequest: boolean;
    upButtonElement: HTMLButtonElement | null;
    downButtonElement: HTMLButtonElement | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.hasUpRequest = false;
        this.hasDownRequest = false;
        this.upButtonElement = null;
        this.downButtonElement = null;
        
        // Create button elements
        this.createButtonElements(totalFloors);
    }

    // Create button elements for the floor
    createButtonElements(totalFloors: number): void {
        try {
            // Create up button for all floors except top floor
            if (this.floorNumber < totalFloors - 1) {
                this.upButtonElement = document.createElement('button');
                this.upButtonElement.className = 'elevator-button up';
                this.upButtonElement.textContent = '↑';
                this.upButtonElement.addEventListener('click', () => {
                    this.requestElevator('up');
                });
            }

            // Create down button for all floors except ground floor
            if (this.floorNumber > 0) {
                this.downButtonElement = document.createElement('button');
                this.downButtonElement.className = 'elevator-button down';
                this.downButtonElement.textContent = '↓';
                this.downButtonElement.addEventListener('click', () => {
                    this.requestElevator('down');
                });
            }
        } catch (error) {
            console.error(`Error creating button elements for floor ${this.floorNumber}:`, error);
            throw new Error(`Failed to create button elements for floor ${this.floorNumber}`);
        }
    }

    // Request an elevator in a specific direction
    requestElevator(direction: 'up' | 'down'): void {
        // Set the request flag
        if (direction === 'up') {
            this.hasUpRequest = true;
        } else {
            this.hasDownRequest = true;
        }

        // Update button appearance to show active state
        const button = direction === 'up' ? this.upButtonElement : this.downButtonElement;
        if (button) {
            button.classList.add('active');
            button.disabled = true;
        }

        // Dispatch event to building to handle elevator request
        const event = new CustomEvent('elevatorRequested', {
            detail: {
                floor: this.floorNumber,
                direction: direction
            }
        });
        document.dispatchEvent(event);
    }

    // Reset request state
    resetRequest(direction: 'up' | 'down'): void {
        if (direction === 'up') {
            this.hasUpRequest = false;
        } else {
            this.hasDownRequest = false;
        }

        // Re-enable button and remove active state
        const button = direction === 'up' ? this.upButtonElement : this.downButtonElement;
        if (button) {
            button.disabled = false;
            button.classList.remove('active');
        }
    }

    // Get button container element
    getButtonContainer(): HTMLDivElement {
        const container = document.createElement('div');
        container.className = 'button-container';
        
        if (this.upButtonElement) {
            container.appendChild(this.upButtonElement);
        }
        
        if (this.downButtonElement) {
            container.appendChild(this.downButtonElement);
        }
        
        return container;
    }
}