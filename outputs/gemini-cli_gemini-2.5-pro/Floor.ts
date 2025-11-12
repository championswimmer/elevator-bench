export class Floor {
    public id: number;
    public element: HTMLElement;
    private upButton: HTMLButtonElement | null = null;
    private downButton: HTMLButtonElement | null = null;

    constructor(id: number, totalFloors: number, requestElevator: (floor: number, direction: 'up' | 'down') => void) {
        this.id = id;
        this.element = document.createElement('div');
        this.element.classList.add('floor');

        const floorLabel = document.createElement('div');
        floorLabel.classList.add('floor-label');
        floorLabel.innerText = `Floor ${id}`;
        this.element.appendChild(floorLabel);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('floor-buttons');

        if (id < totalFloors - 1) {
            this.upButton = this.createButton('Up', () => {
                requestElevator(this.id, 'up');
                this.upButton?.classList.add('active');
            });
            buttonsContainer.appendChild(this.upButton);
        }

        if (id > 0) {
            this.downButton = this.createButton('Down', () => {
                requestElevator(this.id, 'down');
                this.downButton?.classList.add('active');
            });
            buttonsContainer.appendChild(this.downButton);
        }
        this.element.appendChild(buttonsContainer);
    }

    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.classList.add('floor-button');
        button.innerText = text;
        button.addEventListener('click', onClick);
        return button;
    }

    clearButton(direction: 'up' | 'down') {
        if (direction === 'up') {
            this.upButton?.classList.remove('active');
        } else {
            this.downButton?.classList.remove('active');
        }
    }
}
