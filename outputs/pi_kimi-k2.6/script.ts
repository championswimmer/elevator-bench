import { Building } from './building';
import type { ElevatorDirection } from './elevator';

class SimulatorUI {
    private building: Building;
    private buildingEl: HTMLElement;
    private elevatorPanelsEl: HTMLElement;
    private floorCountInput: HTMLInputElement;
    private elevatorCountInput: HTMLInputElement;
    private animationFrameId: number | null = null;
    private lastTime: number = 0;

    constructor() {
        this.buildingEl = document.getElementById('building')!;
        this.elevatorPanelsEl = document.getElementById('elevatorPanels')!;
        this.floorCountInput = document.getElementById('floorCount') as HTMLInputElement;
        this.elevatorCountInput = document.getElementById('elevatorCount') as HTMLInputElement;

        const numFloors = parseInt(this.floorCountInput.value) || 10;
        const numElevators = parseInt(this.elevatorCountInput.value) || 4;

        this.building = new Building(numFloors, numElevators);
        this.building.setOnStateChange(() => this.render());

        this.setupEventListeners();
        this.render();
        this.startSimulation();
    }

    private setupEventListeners() {
        document.getElementById('resetBtn')!.addEventListener('click', () => {
            const numFloors = parseInt(this.floorCountInput.value) || 10;
            const numElevators = parseInt(this.elevatorCountInput.value) || 4;
            this.building.reset(numFloors, numElevators);
        });
    }

    private startSimulation() {
        this.lastTime = performance.now();
        const loop = (now: number) => {
            const deltaTime = now - this.lastTime;
            this.lastTime = now;
            this.building.update(deltaTime);
            this.animationFrameId = requestAnimationFrame(loop);
        };
        this.animationFrameId = requestAnimationFrame(loop);
    }

    private render() {
        this.renderBuilding();
        this.renderElevatorPanels();
    }

    private renderBuilding() {
        const numFloors = this.building.floors.length;
        const numElevators = this.building.elevators.length;

        // Only rebuild if structure changed
        const currentFloors = this.buildingEl.querySelectorAll('.floor').length;
        const currentShafts = this.buildingEl.querySelector('.shafts')?.querySelectorAll('.shaft').length || 0;

        if (currentFloors !== numFloors || currentShafts !== numElevators) {
            this.buildingEl.innerHTML = '';

            for (let i = numFloors - 1; i >= 0; i--) {
                const floorEl = document.createElement('div');
                floorEl.className = 'floor';
                floorEl.dataset.floor = String(i);

                const labelEl = document.createElement('div');
                labelEl.className = 'floor-label';
                labelEl.textContent = String(i);
                floorEl.appendChild(labelEl);

                const buttonsEl = document.createElement('div');
                buttonsEl.className = 'floor-buttons';

                const floor = this.building.floors[i];

                if (floor.hasUpButton) {
                    const upBtn = document.createElement('button');
                    upBtn.className = 'floor-btn up';
                    upBtn.dataset.floor = String(i);
                    upBtn.dataset.direction = 'up';
                    upBtn.addEventListener('click', () => {
                        this.building.requestElevator(i, 'up');
                    });
                    buttonsEl.appendChild(upBtn);
                }

                if (floor.hasDownButton) {
                    const downBtn = document.createElement('button');
                    downBtn.className = 'floor-btn down';
                    downBtn.dataset.floor = String(i);
                    downBtn.dataset.direction = 'down';
                    downBtn.addEventListener('click', () => {
                        this.building.requestElevator(i, 'down');
                    });
                    buttonsEl.appendChild(downBtn);
                }

                floorEl.appendChild(buttonsEl);

                const shaftsEl = document.createElement('div');
                shaftsEl.className = 'shafts';

                for (let e = 0; e < numElevators; e++) {
                    const shaftEl = document.createElement('div');
                    shaftEl.className = 'shaft';
                    shaftEl.dataset.shaft = String(e);

                    const shaftLabel = document.createElement('div');
                    shaftLabel.className = 'shaft-label';
                    shaftLabel.textContent = String(e);
                    shaftEl.appendChild(shaftLabel);

                    shaftsEl.appendChild(shaftEl);
                }

                floorEl.appendChild(shaftsEl);
                this.buildingEl.appendChild(floorEl);
            }
        }

        // Update floor button states
        for (const floor of this.building.floors) {
            const floorEl = this.buildingEl.querySelector(`.floor[data-floor="${floor.floorNumber}"]`);
            if (!floorEl) continue;

            const upBtn = floorEl.querySelector('.floor-btn.up') as HTMLElement;
            const downBtn = floorEl.querySelector('.floor-btn.down') as HTMLElement;

            if (upBtn) {
                upBtn.classList.toggle('active', floor.upPressed);
            }
            if (downBtn) {
                downBtn.classList.toggle('active', floor.downPressed);
            }
        }

        // Update elevator positions and states
        const floorHeight = 70; // matches CSS height
        for (const elevator of this.building.elevators) {
            let elevatorEl = this.buildingEl.querySelector(`.elevator[data-elevator="${elevator.id}"]`) as HTMLElement;

            if (!elevatorEl) {
                elevatorEl = document.createElement('div');
                elevatorEl.className = 'elevator';
                elevatorEl.dataset.elevator = String(elevator.id);
                elevatorEl.textContent = String(elevator.id);

                const shaft = this.buildingEl.querySelector(`.shaft[data-shaft="${elevator.id}"]`);
                if (shaft) {
                    shaft.appendChild(elevatorEl);
                }
            }

            // Position elevator
            const bottom = elevator.currentFloor * floorHeight;
            elevatorEl.style.bottom = `${bottom}px`;

            // Update state class
            elevatorEl.className = 'elevator';
            if (elevator.state === 'door_open') {
                elevatorEl.classList.add('door-open');
            } else if (elevator.state === 'moving') {
                elevatorEl.classList.add(elevator.direction === 'up' ? 'moving-up' : 'moving-down');
            } else {
                elevatorEl.classList.add('idle');
            }
        }
    }

    private renderElevatorPanels() {
        const numElevators = this.building.elevators.length;
        const numFloors = this.building.floors.length;

        const currentPanels = this.elevatorPanelsEl.querySelectorAll('.elevator-panel').length;

        if (currentPanels !== numElevators) {
            this.elevatorPanelsEl.innerHTML = '';

            for (let e = 0; e < numElevators; e++) {
                const panelEl = document.createElement('div');
                panelEl.className = 'elevator-panel';
                panelEl.dataset.panel = String(e);

                const headerEl = document.createElement('div');
                headerEl.className = 'elevator-panel-header';

                const titleEl = document.createElement('h3');
                titleEl.textContent = `Elevator ${e}`;
                headerEl.appendChild(titleEl);

                const statusEl = document.createElement('span');
                statusEl.className = 'elevator-status';
                statusEl.dataset.status = String(e);
                headerEl.appendChild(statusEl);

                panelEl.appendChild(headerEl);

                const infoEl = document.createElement('div');
                infoEl.className = 'elevator-info';
                infoEl.dataset.info = String(e);
                panelEl.appendChild(infoEl);

                const buttonsEl = document.createElement('div');
                buttonsEl.className = 'elevator-buttons';
                buttonsEl.dataset.buttons = String(e);

                for (let f = numFloors - 1; f >= 0; f--) {
                    const btn = document.createElement('button');
                    btn.className = 'elevator-btn';
                    btn.textContent = String(f);
                    btn.dataset.floor = String(f);
                    btn.addEventListener('click', () => {
                        this.building.selectDestination(e, f);
                    });
                    buttonsEl.appendChild(btn);
                }

                panelEl.appendChild(buttonsEl);

                const queueEl = document.createElement('div');
                queueEl.className = 'queue-info';
                queueEl.dataset.queue = String(e);
                panelEl.appendChild(queueEl);

                this.elevatorPanelsEl.appendChild(panelEl);
            }
        }

        // Update panel states
        for (const elevator of this.building.elevators) {
            const statusEl = this.elevatorPanelsEl.querySelector(`.elevator-status[data-status="${elevator.id}"]`) as HTMLElement;
            const infoEl = this.elevatorPanelsEl.querySelector(`.elevator-info[data-info="${elevator.id}"]`) as HTMLElement;
            const queueEl = this.elevatorPanelsEl.querySelector(`.queue-info[data-queue="${elevator.id}"]`) as HTMLElement;

            if (statusEl) {
                statusEl.className = 'elevator-status';
                if (elevator.state === 'door_open') {
                    statusEl.classList.add('door-open');
                    statusEl.textContent = 'Door Open';
                } else if (elevator.state === 'moving') {
                    statusEl.classList.add(elevator.direction === 'up' ? 'moving-up' : 'moving-down');
                    statusEl.textContent = elevator.direction === 'up' ? 'Moving Up' : 'Moving Down';
                } else {
                    statusEl.classList.add('idle');
                    statusEl.textContent = 'Idle';
                }
            }

            if (infoEl) {
                const dests = Array.from(elevator.destinations).sort((a, b) => a - b);
                infoEl.textContent = `Floor: ${elevator.currentFloor} | Dest: [${dests.join(', ')}]`;
            }

            if (queueEl) {
                const queued = this.building.requestQueue.filter(r => {
                    // Show requests that could be assigned to this elevator
                    return elevator.canAcceptRequest(r.floor, r.direction);
                });
                if (queued.length > 0) {
                    queueEl.textContent = `Queue: ${queued.map(r => `${r.floor}${r.direction === 'up' ? '▲' : '▼'}`).join(', ')}`;
                } else {
                    queueEl.textContent = '';
                }
            }

            // Update button active states
            const buttonsEl = this.elevatorPanelsEl.querySelector(`.elevator-buttons[data-buttons="${elevator.id}"]`);
            if (buttonsEl) {
                for (const btn of buttonsEl.querySelectorAll('.elevator-btn')) {
                    const floor = parseInt((btn as HTMLElement).dataset.floor!);
                    btn.classList.toggle('active', elevator.destinations.has(floor));
                }
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SimulatorUI();
});
