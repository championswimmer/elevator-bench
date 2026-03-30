interface ElevatorRequest {
    floor: number;
    direction: 'up' | 'down' | null;
}

class Elevator {
    id: number;
    currentFloor: number;
    targetFloor: number | null;
    direction: 'up' | 'down' | null;
    requests: number[];
    isMoving: boolean;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloor = null;
        this.direction = null;
        this.requests = [];
        this.isMoving = false;
    }

    addRequest(floor: number): void {
        if (!this.requests.includes(floor)) {
            this.requests.push(floor);
        }
    }

    getNextTarget(): number | null {
        if (this.requests.length === 0) {
            return null;
        }

        if (this.direction === null) {
            return this.requests[0];
        }

        if (this.direction === 'up') {
            const upRequests = this.requests.filter(f => f > this.currentFloor);
            if (upRequests.length > 0) {
                return Math.min(...upRequests);
            }
            const downRequests = this.requests.filter(f => f < this.currentFloor);
            if (downRequests.length > 0) {
                return Math.max(...downRequests);
            }
            return this.requests[0];
        }

        const downRequests = this.requests.filter(f => f < this.currentFloor);
        if (downRequests.length > 0) {
            return Math.max(...downRequests);
        }
        const upRequests = this.requests.filter(f => f > this.currentFloor);
        if (upRequests.length > 0) {
            return Math.min(...upRequests);
        }
        return this.requests[0];
    }

    moveToFloor(targetFloor: number): void {
        if (targetFloor > this.currentFloor) {
            this.direction = 'up';
        } else if (targetFloor < this.currentFloor) {
            this.direction = 'down';
        }
    }
}

class Floor {
    floorNumber: number;
    upButtonPressed: boolean;
    downButtonPressed: boolean;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.upButtonPressed = false;
        this.downButtonPressed = false;
    }

    canHaveUpButton(totalFloors: number): boolean {
        return this.floorNumber < totalFloors - 1;
    }

    canHaveDownButton(): boolean {
        return this.floorNumber > 0;
    }
}

class Building {
    floors: Floor[];
    elevators: Elevator[];
    totalFloors: number;
    totalElevators: number;
    requestQueue: ElevatorRequest[];

    constructor(totalFloors: number, totalElevators: number) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        this.floors = Array.from({ length: totalFloors }, (_, i) => new Floor(i, totalFloors));
        this.elevators = Array.from({ length: totalElevators }, (_, i) => new Elevator(i));
        this.requestQueue = [];
    }

    requestElevator(floorNumber: number, direction: 'up' | 'down'): void {
        const idleElevator = this.findClosestIdleElevator(floorNumber, direction);

        if (idleElevator) {
            idleElevator.addRequest(floorNumber);
            idleElevator.moveToFloor(floorNumber);
            this.startElevatorMovement(idleElevator);
        } else {
            const availableElevator = this.elevators.find(e => e.requests.length > 0);
            if (availableElevator) {
                availableElevator.addRequest(floorNumber);
            } else {
                this.requestQueue.push({ floor: floorNumber, direction });
            }
        }
    }

    findClosestIdleElevator(floorNumber: number, direction: 'up' | 'down'): Elevator | null {
        const idle = this.elevators.filter(e => !e.isMoving && e.requests.length === 0);

        if (idle.length === 0) return null;

        let bestElevator = idle[0];
        let bestDistance = Math.abs(bestElevator.currentFloor - floorNumber);

        for (const elevator of idle) {
            const distance = Math.abs(elevator.currentFloor - floorNumber);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestElevator = elevator;
            }
        }

        return bestElevator;
    }

    startElevatorMovement(elevator: Elevator): void {
        if (elevator.isMoving) return;

        const nextTarget = elevator.getNextTarget();
        if (nextTarget === null) {
            elevator.direction = null;
            return;
        }

        elevator.targetFloor = nextTarget;
        elevator.isMoving = true;

        const interval = setInterval(() => {
            if (elevator.targetFloor === null) {
                clearInterval(interval);
                return;
            }

            if (elevator.currentFloor < elevator.targetFloor) {
                elevator.currentFloor++;
            } else if (elevator.currentFloor > elevator.targetFloor) {
                elevator.currentFloor--;
            } else {
                elevator.requests = elevator.requests.filter(f => f !== elevator.currentFloor);

                if (elevator.requests.length > 0) {
                    const next = elevator.getNextTarget();
                    if (next !== null) {
                        elevator.targetFloor = next;
                        this.render();
                        return;
                    }
                }

                elevator.isMoving = false;
                elevator.direction = null;
                elevator.targetFloor = null;

                if (this.requestQueue.length > 0) {
                    const req = this.requestQueue.shift();
                    if (req) {
                        elevator.addRequest(req.floor);
                        elevator.moveToFloor(req.floor);
                        this.startElevatorMovement(elevator);
                    }
                }

                clearInterval(interval);
                this.render();
                return;
            }

            this.render();
        }, 500);
    }

    selectFloorInElevator(elevatorId: number, floorNumber: number): void {
        const elevator = this.elevators[elevatorId];
        if (elevator) {
            elevator.addRequest(floorNumber);
            if (!elevator.isMoving) {
                elevator.moveToFloor(floorNumber);
                this.startElevatorMovement(elevator);
            }
        }
    }

    render(): void {
        this.renderFloors();
        this.renderElevators();
        this.renderElevatorStates();
    }

    renderFloors(): void {
        const panel = document.getElementById('floorsPanel');
        if (!panel) return;

        panel.innerHTML = '';
        for (let i = this.totalFloors - 1; i >= 0; i--) {
            const floor = this.floors[i];
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';

            const labelDiv = document.createElement('div');
            labelDiv.className = 'floor-label';
            labelDiv.textContent = `Floor ${floor.floorNumber}`;

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'floor-buttons';

            if (floor.canHaveUpButton(this.totalFloors)) {
                const upBtn = document.createElement('button');
                upBtn.className = `floor-button ${floor.upButtonPressed ? 'active' : ''}`;
                upBtn.textContent = '↑';
                upBtn.onclick = () => {
                    floor.upButtonPressed = !floor.upButtonPressed;
                    this.requestElevator(floor.floorNumber, 'up');
                    this.render();
                };
                buttonsDiv.appendChild(upBtn);
            }

            if (floor.canHaveDownButton()) {
                const downBtn = document.createElement('button');
                downBtn.className = `floor-button ${floor.downButtonPressed ? 'active' : ''}`;
                downBtn.textContent = '↓';
                downBtn.onclick = () => {
                    floor.downButtonPressed = !floor.downButtonPressed;
                    this.requestElevator(floor.floorNumber, 'down');
                    this.render();
                };
                buttonsDiv.appendChild(downBtn);
            }

            floorDiv.appendChild(labelDiv);
            floorDiv.appendChild(buttonsDiv);
            panel.appendChild(floorDiv);
        }
    }

    renderElevators(): void {
        const container = document.getElementById('elevatorsContainer');
        if (!container) return;

        container.innerHTML = '';
        const shaftHeight = 500;
        const floorHeight = shaftHeight / this.totalFloors;

        for (const elevator of this.elevators) {
            const elevDiv = document.createElement('div');
            elevDiv.className = 'elevator';
            elevDiv.style.top = `${(this.totalFloors - 1 - elevator.currentFloor) * floorHeight}px`;

            const info = document.createElement('div');
            info.className = 'elevator-info';
            info.innerHTML = `
                <div class="elevator-id">E${elevator.id}</div>
                <div class="elevator-floor">F${elevator.currentFloor}</div>
            `;

            elevDiv.appendChild(info);
            container.appendChild(elevDiv);
        }

        this.renderElevatorButtons();
    }

    renderElevatorButtons(): void {
        const container = document.getElementById('elevatorButtonsContainer');
        if (!container) return;

        container.innerHTML = '';

        for (const elevator of this.elevators) {
            const group = document.createElement('div');
            group.className = 'elevator-button-group';

            const label = document.createElement('div');
            label.className = 'elevator-label';
            label.textContent = `Elevator ${elevator.id}`;
            group.appendChild(label);

            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'floor-selection-buttons';

            for (let i = 0; i < this.totalFloors; i++) {
                const btn = document.createElement('button');
                btn.className = `floor-selection-btn ${elevator.requests.includes(i) ? 'active' : ''}`;
                btn.textContent = i;
                btn.onclick = () => {
                    this.selectFloorInElevator(elevator.id, i);
                    this.render();
                };
                buttonsDiv.appendChild(btn);
            }

            group.appendChild(buttonsDiv);
            container.appendChild(group);
        }
    }

    renderElevatorStates(): void {
        const container = document.getElementById('elevatorStates');
        if (!container) return;

        container.innerHTML = '';

        for (const elevator of this.elevators) {
            const stateDiv = document.createElement('div');
            stateDiv.className = 'elevator-state';

            const direction = elevator.direction ? (elevator.direction === 'up' ? '↑' : '↓') : '—';
            const status = elevator.isMoving ? 'Moving' : 'Idle';

            stateDiv.innerHTML = `
                <div class="elevator-state-id">Elevator ${elevator.id}</div>
                <div class="elevator-state-info">
                    Floor: ${elevator.currentFloor} | Direction: ${direction} | Status: ${status}
                    ${elevator.requests.length > 0 ? `<br>Queue: ${elevator.requests.join(', ')}` : ''}
                </div>
            `;

            container.appendChild(stateDiv);
        }
    }
}

export { Building, Elevator, Floor };
