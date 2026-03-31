import { Elevator, Direction } from './Elevator.ts';

export class Building {
    numFloors: number;
    numElevators: number;
    elevators: Elevator[] = [];
    requestQueue: { floor: number, direction: Direction }[] = [];

    constructor(numFloors: number = 10, numElevators: number = 4) {
        this.numFloors = numFloors;
        this.numElevators = numElevators;

        const shaftContainer = document.getElementById('shaft-container');
        if (shaftContainer) {
            for (let i = 0; i < numElevators; i++) {
                const el = new Elevator(i);
                this.elevators.push(el);
                shaftContainer.appendChild(el.element);
            }
        }

        this.renderFloors();
        this.renderInsideButtons();

        setInterval(() => this.step(), 1000); // 1 second per step
    }

    renderFloors() {
        const floorsContainer = document.getElementById('floors-container');
        if (!floorsContainer) return;

        for (let i = this.numFloors - 1; i >= 0; i--) {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';
            floorDiv.style.bottom = `${i * 100}px`;

            const label = document.createElement('div');
            label.className = 'floor-label';
            label.innerText = `Floor ${i}`;
            floorDiv.appendChild(label);

            const buttons = document.createElement('div');
            buttons.className = 'floor-buttons';
            
            if (i < this.numFloors - 1) {
                const upBtn = document.createElement('button');
                upBtn.innerText = '▲';
                upBtn.onclick = () => this.requestElevator(i, Direction.UP);
                buttons.appendChild(upBtn);
            }
            if (i > 0) {
                const downBtn = document.createElement('button');
                downBtn.innerText = '▼';
                downBtn.onclick = () => this.requestElevator(i, Direction.DOWN);
                buttons.appendChild(downBtn);
            }
            floorDiv.appendChild(buttons);

            floorsContainer.appendChild(floorDiv);
        }
    }

    renderInsideButtons() {
        const panel = document.getElementById('inside-panel');
        if (!panel) return;
        
        for (let i = 0; i < this.numElevators; i++) {
            const elPanel = document.createElement('div');
            elPanel.className = 'elevator-panel';
            elPanel.innerHTML = `<h4>Elevator ${i}</h4>`;
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'elevator-buttons-grid';
            for (let f = this.numFloors - 1; f >= 0; f--) {
                const btn = document.createElement('button');
                btn.innerText = `${f}`;
                btn.onclick = () => this.elevators[i].addRequest(f);
                buttonsDiv.appendChild(btn);
            }
            elPanel.appendChild(buttonsDiv);
            panel.appendChild(elPanel);
        }
    }

    requestElevator(floor: number, direction: Direction) {
        // Assign to best elevator or queue
        const bestElevator = this.findBestElevator(floor, direction);
        if (bestElevator) {
            bestElevator.addRequest(floor);
        } else {
            this.requestQueue.push({ floor, direction });
        }
    }

    findBestElevator(floor: number, direction: Direction): Elevator | null {
        let best: Elevator | null = null;
        let minDistance = Infinity;

        for (const el of this.elevators) {
            const dist = Math.abs(el.currentFloor - floor);
            
            if (el.direction === Direction.IDLE) {
                if (dist < minDistance) {
                    minDistance = dist;
                    best = el;
                }
            } else if (el.direction === direction) {
                if (direction === Direction.UP && el.currentFloor <= floor) {
                    if (dist < minDistance) {
                        minDistance = dist;
                        best = el;
                    }
                } else if (direction === Direction.DOWN && el.currentFloor >= floor) {
                    if (dist < minDistance) {
                        minDistance = dist;
                        best = el;
                    }
                }
            }
        }
        return best; // If null, all are busy and moving away
    }

    step() {
        for (const el of this.elevators) {
            el.step();
        }

        // Process queue
        if (this.requestQueue.length > 0) {
            const remainingQueue = [];
            for (const req of this.requestQueue) {
                const best = this.findBestElevator(req.floor, req.direction);
                if (best) {
                    best.addRequest(req.floor);
                } else {
                    remainingQueue.push(req);
                }
            }
            this.requestQueue = remainingQueue;
        }
    }
}
