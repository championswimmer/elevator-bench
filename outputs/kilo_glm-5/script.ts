import { Building } from './Building';
import { Elevator } from './Elevator';
import { Direction, ElevatorState, NUM_FLOORS, NUM_ELEVATORS, FLOOR_HEIGHT, FloorRequest } from './types';

class ElevatorSimulator {
    private building: Building;
    private floorsContainer: HTMLElement;
    private elevatorsContainer: HTMLElement;
    private statusContainer: HTMLElement;
    private elevatorPanels: Map<number, HTMLElement>;
    private openPanelId: number | null = null;

    constructor() {
        this.building = new Building();
        this.floorsContainer = document.getElementById('floors-container')!;
        this.elevatorsContainer = document.getElementById('elevators-container')!;
        this.statusContainer = document.createElement('div');
        this.statusContainer.className = 'status-bar';
        this.elevatorPanels = new Map();
        
        this.building.setOnFloorRequest(this.handleFloorRequest.bind(this));
    }

    init(): void {
        this.renderFloors();
        this.renderElevators();
        this.renderElevatorPanels();
        this.renderStatusBar();
        document.body.appendChild(this.statusContainer);
        
        this.startSimulation();
    }

    private renderFloors(): void {
        for (let i = NUM_FLOORS - 1; i >= 0; i--) {
            const floorEl = document.createElement('div');
            floorEl.className = 'floor';
            floorEl.setAttribute('data-floor', i.toString());
            
            const floorNumber = document.createElement('div');
            floorNumber.className = 'floor-number';
            floorNumber.textContent = i.toString();
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'floor-buttons';
            
            if (i < NUM_FLOORS - 1) {
                const upBtn = document.createElement('button');
                upBtn.className = 'floor-btn up';
                upBtn.textContent = '▲';
                upBtn.setAttribute('data-floor', i.toString());
                upBtn.setAttribute('data-direction', 'up');
                upBtn.addEventListener('click', () => {
                    this.building.requestElevator(i, Direction.Up);
                });
                buttonsContainer.appendChild(upBtn);
                this.building.floors[i].setUpButtonElement(upBtn);
            }
            
            if (i > 0) {
                const downBtn = document.createElement('button');
                downBtn.className = 'floor-btn down';
                downBtn.textContent = '▼';
                downBtn.setAttribute('data-floor', i.toString());
                downBtn.setAttribute('data-direction', 'down');
                downBtn.addEventListener('click', () => {
                    this.building.requestElevator(i, Direction.Down);
                });
                buttonsContainer.appendChild(downBtn);
                this.building.floors[i].setDownButtonElement(downBtn);
            }
            
            const shaftArea = document.createElement('div');
            shaftArea.className = 'shaft-area';
            
            for (let j = 0; j < NUM_ELEVATORS; j++) {
                const shaft = document.createElement('div');
                shaft.className = 'elevator-shaft';
                shaft.setAttribute('data-elevator', j.toString());
                shaft.setAttribute('data-floor', i.toString());
                shaftArea.appendChild(shaft);
            }
            
            floorEl.appendChild(floorNumber);
            floorEl.appendChild(buttonsContainer);
            floorEl.appendChild(shaftArea);
            this.floorsContainer.appendChild(floorEl);
        }
    }

    private renderElevators(): void {
        const shafts = this.floorsContainer.querySelectorAll('.elevator-shaft');
        
        this.building.elevators.forEach((elevator, index) => {
            const elevatorEl = document.createElement('div');
            elevatorEl.className = 'elevator';
            elevatorEl.id = `elevator-${index}`;
            elevatorEl.style.bottom = '0px';
            
            const panel = document.createElement('div');
            panel.className = 'elevator-panel';
            panel.textContent = '0';
            
            const doors = document.createElement('div');
            doors.className = 'elevator-doors';
            
            const leftDoor = document.createElement('div');
            leftDoor.className = 'door left';
            
            const rightDoor = document.createElement('div');
            rightDoor.className = 'door right';
            
            doors.appendChild(leftDoor);
            doors.appendChild(rightDoor);
            
            const elevatorId = document.createElement('div');
            elevatorId.className = 'elevator-id';
            elevatorId.textContent = `E${index}`;
            
            elevatorEl.appendChild(panel);
            elevatorEl.appendChild(doors);
            elevatorEl.appendChild(elevatorId);
            
            elevatorEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleElevatorPanel(index);
            });
            
            elevator.setElement(elevatorEl);
            
            const floorIndex = NUM_FLOORS - 1;
            const shaftIndex = floorIndex * NUM_ELEVATORS + index;
            shafts[shaftIndex].appendChild(elevatorEl);
        });
    }

    private renderElevatorPanels(): void {
        this.building.elevators.forEach((elevator, index) => {
            const panel = document.createElement('div');
            panel.className = 'elevator-panel-inner';
            panel.id = `panel-${index}`;
            
            const title = document.createElement('div');
            title.className = 'panel-title';
            title.textContent = `Elevator ${index} - Floor ${elevator.currentFloor}`;
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-panel';
            closeBtn.textContent = '✕';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllPanels();
            });
            
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'panel-buttons';
            
            for (let i = 0; i < NUM_FLOORS; i++) {
                const btn = document.createElement('button');
                btn.className = 'panel-btn';
                btn.textContent = i.toString();
                btn.setAttribute('data-floor', i.toString());
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectFloor(index, i);
                });
                buttonsContainer.appendChild(btn);
            }
            
            panel.appendChild(closeBtn);
            panel.appendChild(title);
            panel.appendChild(buttonsContainer);
            
            document.body.appendChild(panel);
            this.elevatorPanels.set(index, panel);
            elevator.setPanelElement(panel);
        });
        
        document.addEventListener('click', () => {
            this.closeAllPanels();
        });
    }

    private renderStatusBar(): void {
        this.building.elevators.forEach(elevator => {
            const status = document.createElement('div');
            status.className = 'elevator-status';
            status.id = `status-${elevator.id}`;
            
            const id = document.createElement('div');
            id.className = 'id';
            id.textContent = `Elevator ${elevator.id}`;
            
            const floor = document.createElement('div');
            floor.className = 'floor';
            floor.textContent = elevator.currentFloor.toString();
            
            const state = document.createElement('div');
            state.className = 'state';
            state.textContent = elevator.state;
            
            const direction = document.createElement('div');
            direction.className = `direction ${elevator.direction}`;
            direction.textContent = this.getDirectionSymbol(elevator.direction);
            
            status.appendChild(id);
            status.appendChild(floor);
            status.appendChild(state);
            status.appendChild(direction);
            
            this.statusContainer.appendChild(status);
        });
    }

    private getDirectionSymbol(direction: Direction): string {
        switch (direction) {
            case Direction.Up: return '▲';
            case Direction.Down: return '▼';
            default: return '—';
        }
    }

    private toggleElevatorPanel(elevatorId: number): void {
        if (this.openPanelId === elevatorId) {
            this.closeAllPanels();
        } else {
            this.closeAllPanels();
            const panel = this.elevatorPanels.get(elevatorId);
            if (panel) {
                panel.classList.add('visible');
                this.positionPanel(panel, elevatorId);
                this.openPanelId = elevatorId;
            }
        }
    }

    private positionPanel(panel: HTMLElement, elevatorId: number): void {
        const elevatorEl = document.getElementById(`elevator-${elevatorId}`);
        if (!elevatorEl) return;
        
        const rect = elevatorEl.getBoundingClientRect();
        panel.style.left = `${rect.right + 20}px`;
        panel.style.top = `${rect.top}px`;
    }

    private closeAllPanels(): void {
        this.elevatorPanels.forEach(panel => {
            panel.classList.remove('visible');
        });
        this.openPanelId = null;
    }

    private selectFloor(elevatorId: number, floor: number): void {
        const elevator = this.building.elevators[elevatorId];
        elevator.addTargetFloor(floor);
        elevator.updatePanelDisplay;
    }

    private handleFloorRequest(request: FloorRequest): void {
        const elevator = this.building.findBestElevator(request);
        
        if (elevator) {
            elevator.addTargetFloor(request.floor);
        } else {
            this.building.addPendingRequest(request);
        }
    }

    private startSimulation(): void {
        this.simulationLoop();
    }

    private async simulationLoop(): Promise<void> {
        while (true) {
            await this.processElevators();
            await this.delay(100);
        }
    }

    private async processElevators(): Promise<void> {
        const busyElevators: Promise<void>[] = [];
        
        for (const elevator of this.building.elevators) {
            if (elevator.isIdle() && this.building.hasPendingRequests()) {
                const request = this.building.getNextPendingRequest();
                if (request) {
                    const bestElevator = this.building.findBestElevator(request);
                    if (bestElevator) {
                        bestElevator.addTargetFloor(request.floor);
                    } else {
                        elevator.addTargetFloor(request.floor);
                    }
                }
            }
            
            if (elevator.targetFloors.size > 0 && elevator.state !== ElevatorState.Moving) {
                busyElevators.push(this.processElevator(elevator));
            }
        }
        
        if (busyElevators.length > 0) {
            await Promise.all(busyElevators);
        }
    }

    private async processElevator(elevator: Elevator): Promise<void> {
        while (elevator.targetFloors.size > 0) {
            const nextFloor = elevator.getNextTargetFloor();
            if (nextFloor === null) break;
            
            if (elevator.currentFloor !== nextFloor) {
                await elevator.closeDoors();
                await elevator.moveToFloor(nextFloor);
            }
            
            this.building.deactivateFloorButton(elevator.currentFloor, elevator.direction);
            
            await elevator.openDoors();
            await this.delay(2000);
            await elevator.closeDoors();
            
            this.updateStatusBar(elevator);
        }
        
        elevator.state = ElevatorState.Idle;
        elevator.direction = Direction.None;
        this.updateStatusBar(elevator);
    }

    private updateStatusBar(elevator: Elevator): void {
        const status = document.getElementById(`status-${elevator.id}`);
        if (!status) return;
        
        const floor = status.querySelector('.floor');
        const state = status.querySelector('.state');
        const direction = status.querySelector('.direction');
        
        if (floor) floor.textContent = elevator.currentFloor.toString();
        if (state) state.textContent = elevator.state;
        if (direction) {
            direction.className = `direction ${elevator.direction}`;
            direction.textContent = this.getDirectionSymbol(elevator.direction);
        }
        
        const elevatorEl = document.getElementById(`elevator-${elevator.id}`);
        if (elevatorEl) {
            const panel = elevatorEl.querySelector('.elevator-panel');
            if (panel) panel.textContent = elevator.currentFloor.toString();
        }
        
        const panelEl = this.elevatorPanels.get(elevator.id);
        if (panelEl) {
            const title = panelEl.querySelector('.panel-title');
            if (title) title.textContent = `Elevator ${elevator.id} - Floor ${elevator.currentFloor}`;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const simulator = new ElevatorSimulator();
simulator.init();
