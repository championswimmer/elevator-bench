import { Elevator, Direction } from './Elevator.ts';
import { Floor } from './Floor.ts';

interface CallRequest {
    floor: number;
    direction: 'up' | 'down';
}

export class Building {
    private floors: Floor[] = [];
    private elevators: Elevator[] = [];
    private callQueue: CallRequest[] = [];

    constructor(
        private totalFloors: number,
        private numElevators: number,
        private buildingElement: HTMLElement
    ) {
        this.initialize();
    }

    private initialize() {
        const floorsContainer = document.createElement('div');
        floorsContainer.classList.add('floors-container');

        for (let i = this.totalFloors - 1; i >= 0; i--) {
            const floor = new Floor(i, this.totalFloors, this.requestElevator.bind(this));
            this.floors.push(floor);
            floorsContainer.appendChild(floor.element);
        }
        this.buildingElement.appendChild(floorsContainer);

        for (let i = 0; i < this.numElevators; i++) {
            const elevator = new Elevator(i, this.totalFloors);
            this.elevators.push(elevator);
            const shaft = document.createElement('div');
            shaft.classList.add('elevator-shaft');
            shaft.appendChild(elevator.element);
            this.buildingElement.appendChild(shaft);
        }

        setInterval(() => this.updateElevators(), 1000);
        setInterval(() => this.dispatchElevator(), 100);
    }

    public requestElevator(floor: number, direction: 'up' | 'down') {
        if (!this.callQueue.some(req => req.floor === floor && req.direction === direction)) {
            this.callQueue.push({ floor, direction });
        }
    }

    private dispatchElevator() {
        if (this.callQueue.length === 0) {
            return;
        }

        this.callQueue = this.callQueue.filter(request => {
            let bestElevator: Elevator | null = null;
            let bestScore = -1;

            for (const elevator of this.elevators) {
                let score = 0;
                const distance = Math.abs(elevator.currentFloor - request.floor);

                if (elevator.isIdle()) {
                    score = 100 - distance; // High score for idle, decreases with distance
                } else if (elevator.direction === request.direction) {
                    if ((request.direction === 'up' && elevator.currentFloor <= request.floor) ||
                        (request.direction === 'down' && elevator.currentFloor >= request.floor)) {
                        score = 50 - distance; // Score for moving towards the request
                    }
                }
                // Elevators moving away or in the wrong direction get a score of 0

                if (score > bestScore) {
                    bestScore = score;
                    bestElevator = elevator;
                }
            }

            if (bestElevator) {
                bestElevator.addDestination(request.floor);
                this.floors.find(f => f.id === request.floor)?.clearButton(request.direction);
                return false; // Remove from queue
            }
            return true; // Keep in queue
        });
    }

    private updateElevators() {
        this.elevators.forEach(elevator => elevator.update());
    }
}
