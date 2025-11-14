export class Floor {
    floorNumber: number;
    element: HTMLElement;

    constructor(floorNumber: number, totalFloors: number, requestElevator: (floor: number, direction: 'up' | 'down') => void) {
        this.floorNumber = floorNumber;
        this.element = document.createElement('div');
        this.element.classList.add('floor');
        this.element.id = `floor-${floorNumber}`;

        let buttons = '';
        if (floorNumber < totalFloors - 1) {
            buttons += `<button class="up-btn">Up</button>`;
        }
        if (floorNumber > 0) {
            buttons += `<button class="down-btn">Down</button>`;
        }

        this.element.innerHTML = `
            <div class="floor-label">Floor ${floorNumber}</div>
            <div class="floor-buttons">
                ${buttons}
            </div>
        `;

        const upButton = this.element.querySelector('.up-btn');
        if (upButton) {
            upButton.addEventListener('click', () => requestElevator(this.floorNumber, 'up'));
        }

        const downButton = this.element.querySelector('.down-btn');
        if (downButton) {
            downButton.addEventListener('click', () => requestElevator(this.floorNumber, 'down'));
        }
    }
}
