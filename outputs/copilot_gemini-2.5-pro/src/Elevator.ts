export type Direction = 'up' | 'down' | 'idle';

export class Elevator {
    id: number;
    currentFloor: number;
    direction: Direction;
    requests: number[];
    isMoving: boolean;
    element: HTMLElement;

    constructor(id: number, totalFloors: number) {
        this.id = id;
        this.currentFloor = 0;
        this.direction = 'idle';
        this.requests = [];
        this.isMoving = false;

        this.element = document.createElement('div');
        this.element.classList.add('elevator');
        this.element.id = `elevator-${id}`;
        this.element.innerHTML = `
            <div class="elevator-buttons">
                ${Array.from({ length: totalFloors }, (_, i) => `<button data-floor="${i}">${i}</button>`).join('')}
            </div>
        `;
        this.element.addEventListener('click', () => {
            this.element.classList.toggle('selected');
        });
    }

    moveTo(floor: number) {
        this.isMoving = true;
        this.direction = floor > this.currentFloor ? 'up' : 'down';
        this.element.style.bottom = `${floor * 100}px`;
        setTimeout(() => {
            this.currentFloor = floor;
            this.isMoving = false;
            const index = this.requests.indexOf(floor);
            if (index > -1) {
                this.requests.splice(index, 1);
            }
            if (this.requests.length === 0) {
                this.direction = 'idle';
            }
        }, 500);
    }

    addRequest(floor: number) {
        if (!this.requests.includes(floor)) {
            this.requests.push(floor);
            if (this.direction === 'up') {
                this.requests.sort((a, b) => a - b);
            } else if (this.direction === 'down') {
                this.requests.sort((a, b) => b - a);
            }
        }
    }
}
