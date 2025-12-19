import { Building } from './Building';
import { Direction } from './Floor';
import { DEFAULT_FLOORS, DEFAULT_ELEVATORS, FLOOR_HEIGHT } from './constants';
import { Elevator } from './Elevator';

class ElevatorSimulator {
    private building: Building;
    private floorElements: HTMLElement[] = [];
    private elevatorElements: HTMLElement[] = [];

    constructor() {
        this.building = new Building(DEFAULT_FLOORS, DEFAULT_ELEVATORS, this.onFloorReached.bind(this));
        this.initUI();
        this.startUpdateLoop();
    }

    private initUI() {
        const app = document.getElementById('app');
        if (!app) return;

        const buildingContainer = document.createElement('div');
        buildingContainer.className = 'building';
        buildingContainer.style.height = `${DEFAULT_FLOORS * FLOOR_HEIGHT}px`;

        // Create floors
        for (let i = DEFAULT_FLOORS - 1; i >= 0; i--) {
            const floorDiv = document.createElement('div');
            floorDiv.className = 'floor';
            floorDiv.style.height = `${FLOOR_HEIGHT}px`;
            floorDiv.innerHTML = `
                <div class="floor-label">Floor ${i}</div>
                <div class="floor-buttons">
                    ${i < DEFAULT_FLOORS - 1 ? `<button class="up-btn" data-floor="${i}">UP</button>` : ''}
                    ${i > 0 ? `<button class="down-btn" data-floor="${i}">DOWN</button>` : ''}
                </div>
            `;
            buildingContainer.appendChild(floorDiv);
            this.floorElements[i] = floorDiv;
        }

        // Create elevators
        const elevatorShaft = document.createElement('div');
        elevatorShaft.className = 'elevator-shaft';
        for (let i = 0; i < DEFAULT_ELEVATORS; i++) {
            const elevatorDiv = document.createElement('div');
            elevatorDiv.className = 'elevator';
            elevatorDiv.id = `elevator-${i}`;
            elevatorDiv.style.left = `${60 + i * 60}px`;
            elevatorDiv.style.bottom = '0px';
            
            // Internal buttons
            const internalButtons = document.createElement('div');
            internalButtons.className = 'internal-buttons';
            for (let j = 0; j < DEFAULT_FLOORS; j++) {
                const btn = document.createElement('button');
                btn.innerText = j.toString();
                btn.onclick = () => this.building.elevators[i].addRequest(j);
                internalButtons.appendChild(btn);
            }
            elevatorDiv.appendChild(internalButtons);

            elevatorShaft.appendChild(elevatorDiv);
            this.elevatorElements[i] = elevatorDiv;
        }
        buildingContainer.appendChild(elevatorShaft);
        app.appendChild(buildingContainer);

        // Event listeners for floor buttons
        app.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('up-btn')) {
                const floor = parseInt(target.getAttribute('data-floor')!);
                this.building.requestElevator(floor, Direction.UP);
            } else if (target.classList.contains('down-btn')) {
                const floor = parseInt(target.getAttribute('data-floor')!);
                this.building.requestElevator(floor, Direction.DOWN);
            }
        });
    }

    private onFloorReached(elevator: Elevator, floor: number) {
        console.log(`Elevator ${elevator.id} reached floor ${floor}`);
        this.building.floors[floor].deactivateButton(elevator.direction);
        this.building.processQueue();
    }

    private startUpdateLoop() {
        const update = () => {
            this.updateUI();
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }

    private updateUI() {
        // Update elevator positions
        this.building.elevators.forEach((elevator, i) => {
            const el = this.elevatorElements[i];
            const targetBottom = elevator.currentFloor * FLOOR_HEIGHT;
            el.style.bottom = `${targetBottom}px`;
            el.setAttribute('data-direction', elevator.direction);
            
            // Highlight active internal buttons
            const buttons = el.querySelectorAll('.internal-buttons button');
            buttons.forEach((btn, idx) => {
                if (elevator.targetFloors.has(idx)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });

        // Update floor button states
        this.building.floors.forEach((floor, i) => {
            const floorDiv = this.floorElements[i];
            const upBtn = floorDiv.querySelector('.up-btn');
            const downBtn = floorDiv.querySelector('.down-btn');

            if (upBtn) {
                if (floor.upButtonActive) upBtn.classList.add('active');
                else upBtn.classList.remove('active');
            }
            if (downBtn) {
                if (floor.downButtonActive) downBtn.classList.add('active');
                else downBtn.classList.remove('active');
            }
        });
    }
}

new ElevatorSimulator();
