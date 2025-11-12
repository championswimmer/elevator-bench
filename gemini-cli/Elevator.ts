export type Direction = 'up' | 'down' | 'idle';

export class Elevator {
    public id: number;
    public currentFloor: number;
    public direction: Direction;
    public destinationQueue: number[];
    public element: HTMLElement;
    private panelElement: HTMLElement;
    private floorButtons: Map<number, HTMLButtonElement>;

    constructor(id: number, totalFloors: number) {
        this.id = id;
        this.currentFloor = 0;
        this.direction = 'idle';
        this.destinationQueue = [];
        this.floorButtons = new Map();

        // Create elevator element
        this.element = document.createElement('div');
        this.element.classList.add('elevator');
        this.element.innerHTML = `<div class="elevator-info">E${id} [${this.currentFloor}]</div>`;

        // Create elevator panel
        this.panelElement = this.createPanel(totalFloors);
        this.element.appendChild(this.panelElement);
    }

    private createPanel(totalFloors: number): HTMLElement {
        const panel = document.createElement('div');
        panel.classList.add('elevator-panel');

        const title = document.createElement('h4');
        title.innerText = `Elevator ${this.id}`;
        panel.appendChild(title);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.classList.add('elevator-panel-buttons');

        for (let i = totalFloors - 1; i >= 0; i--) {
            const button = document.createElement('button');
            button.classList.add('elevator-button');
            button.innerText = `${i}`;
            button.addEventListener('click', () => this.addDestination(i));
            buttonsContainer.appendChild(button);
            this.floorButtons.set(i, button);
        }

        panel.appendChild(buttonsContainer);
        return panel;
    }

    addDestination(floor: number) {
        if (this.destinationQueue.includes(floor)) {
            return;
        }

        this.destinationQueue.push(floor);
        this.floorButtons.get(floor)?.classList.add('active');

        // Sort the queue based on the current direction
        if (this.direction === 'up') {
            this.destinationQueue.sort((a, b) => a - b);
        } else if (this.direction === 'down') {
            this.destinationQueue.sort((a, b) => b - a);
        }

        if (this.isIdle()) {
            this.updateDirection();
        }
    }

    moveTo(floor: number) {
        this.currentFloor = floor;
        this.element.style.transform = `translateY(-${floor * 100}px)`;
        this.element.querySelector('.elevator-info')!.innerHTML = `E${this.id} [${this.currentFloor}]`;
    }

    update() {
        if (this.isIdle()) {
            this.updateDirection();
            return;
        }

        // Handle arrival
        while (this.destinationQueue.length > 0 && this.destinationQueue[0] === this.currentFloor) {
            this.destinationQueue.shift();
            this.floorButtons.get(this.currentFloor)?.classList.remove('active');
        }

        // After handling stops, if the queue is empty, become idle
        if (this.destinationQueue.length === 0) {
            this.direction = 'idle';
            return;
        }
        
        this.updateDirection();

        // If there are still destinations, move the elevator
        if (this.destinationQueue.length > 0) {
            if (this.currentFloor < this.destinationQueue[0]) {
                this.moveTo(this.currentFloor + 1);
            } else if (this.currentFloor > this.destinationQueue[0]) {
                this.moveTo(this.currentFloor - 1);
            }
        }
    }

    updateDirection() {
        if (this.destinationQueue.length === 0) {
            this.direction = 'idle';
            return;
        }

        // If idle, decide direction based on first request
        if (this.direction === 'idle') {
            if (this.destinationQueue[0] > this.currentFloor) {
                this.direction = 'up';
            } else {
                this.direction = 'down';
            }
        }

        // Sort the queue based on the current direction
        if (this.direction === 'up') {
            this.destinationQueue.sort((a, b) => a - b);
        } else if (this.direction === 'down') {
            this.destinationQueue.sort((a, b) => b - a);
        }

        // If the current direction has no more stops, switch direction
        const stopsInCurrentDir = this.destinationQueue.filter(floor => {
            return this.direction === 'up' ? floor > this.currentFloor : floor < this.currentFloor;
        });

        if (stopsInCurrentDir.length === 0) {
            this.direction = this.direction === 'up' ? 'down' : 'up';
            // Re-sort the queue for the new direction
            if (this.direction === 'up') {
                this.destinationQueue.sort((a, b) => a - b);
            } else if (this.direction === 'down') {
                this.destinationQueue.sort((a, b) => b - a);
            }
        }
    }

    isIdle(): boolean {
        return this.direction === 'idle' && this.destinationQueue.length === 0;
    }
}
