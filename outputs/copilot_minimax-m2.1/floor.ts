export enum FloorButtonType {
    UP = 'up',
    DOWN = 'down'
}

export class Floor {
    floorNumber: number;
    upButton: HTMLButtonElement | null;
    downButton: HTMLButtonElement | null;
    upPressed: boolean;
    downPressed: boolean;
    element: HTMLElement | null;

    constructor(floorNumber: number) {
        this.floorNumber = floorNumber;
        this.upButton = null;
        this.downButton = null;
        this.upPressed = false;
        this.downPressed = false;
        this.element = null;
    }

    hasRequest(): boolean {
        return this.upPressed || this.downPressed;
    }

    clearRequests(): void {
        this.upPressed = false;
        this.downPressed = false;
        this.updateButtonStates();
    }

    pressUp(): void {
        this.upPressed = true;
        this.updateButtonStates();
    }

    pressDown(): void {
        this.downPressed = true;
        this.updateButtonStates();
    }

    releaseUp(): void {
        this.upPressed = false;
        this.updateButtonStates();
    }

    releaseDown(): void {
        this.downPressed = false;
        this.updateButtonStates();
    }

    updateButtonStates(): void {
        if (this.upButton) {
            if (this.upPressed) {
                this.upButton.classList.add('active');
            } else {
                this.upButton.classList.remove('active');
            }
        }

        if (this.downButton) {
            if (this.downPressed) {
                this.downButton.classList.add('active');
            } else {
                this.downButton.classList.remove('active');
            }
        }

        if (this.element) {
            if (this.hasRequest()) {
                this.element.classList.add('requested');
            } else {
                this.element.classList.remove('requested');
            }
        }
    }

    render(container: HTMLElement, totalFloors: number): void {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${this.floorNumber}`;

        const floorNumberDiv = document.createElement('div');
        floorNumberDiv.className = 'floor-number';
        floorNumberDiv.textContent = this.floorNumber.toString();
        floorDiv.appendChild(floorNumberDiv);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'floor-buttons';

        // Add up button for all floors except the top floor
        if (this.floorNumber < totalFloors - 1) {
            const upBtn = document.createElement('button');
            upBtn.className = 'floor-buttons button up';
            upBtn.textContent = '↑ Up';
            upBtn.addEventListener('click', () => {
                this.pressUp();
            });
            this.upButton = upBtn;
            buttonsDiv.appendChild(upBtn);
        }

        // Add down button for all floors except the bottom floor
        if (this.floorNumber > 0) {
            const downBtn = document.createElement('button');
            downBtn.className = 'floor-buttons button down';
            downBtn.textContent = '↓ Down';
            downBtn.addEventListener('click', () => {
                this.pressDown();
            });
            this.downButton = downBtn;
            buttonsDiv.appendChild(downBtn);
        }

        floorDiv.appendChild(buttonsDiv);

        // Create placeholders for elevators
        const shaftsContainer = document.createElement('div');
        shaftsContainer.id = `shafts-container`;
        shaftsContainer.style.display = 'flex';
        shaftsContainer.style.flex = '1';
        shaftsContainer.style.gap = '10px';
        shaftsContainer.style.justifyContent = 'space-around';
        shaftsContainer.style.flexWrap = 'wrap';
        floorDiv.appendChild(shaftsContainer);

        this.element = floorDiv;
        container.appendChild(floorDiv);
    }

    reset(): void {
        this.upPressed = false;
        this.downPressed = false;
        this.updateButtonStates();
    }
}
