import { Building } from './Building';
import { Direction } from './types';

class ElevatorSimulator {
    private building: Building;

    constructor() {
        this.building = new Building();
        this.initializeEventListeners();
        this.building.start();
    }

    private initializeEventListeners(): void {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupBuilding();
                this.setupEventListeners();
            });
        } else {
            this.setupBuilding();
            this.setupEventListeners();
        }
    }

    private setupBuilding(): void {
        const buildingElement = document.querySelector('.building') as HTMLElement;
        const floorsContainer = document.getElementById('floors-container') as HTMLElement;
        const elevatorShafts = document.getElementById('elevator-shafts') as HTMLElement;

        if (buildingElement && floorsContainer && elevatorShafts) {
            this.building.setElements(buildingElement, floorsContainer, elevatorShafts);
        }
    }

    private setupEventListeners(): void {
        // Floor up/down button listeners
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            
            if (target.classList.contains('up-btn')) {
                const floorNumber = parseInt(target.dataset.floor || '0');
                this.building.requestElevator(floorNumber, Direction.UP);
            }
            
            if (target.classList.contains('down-btn')) {
                const floorNumber = parseInt(target.dataset.floor || '0');
                this.building.requestElevator(floorNumber, Direction.DOWN);
            }
        });

        // Elevator floor button listeners (event delegation)
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            
            if (target.classList.contains('floor-btn')) {
                const floorNumber = parseInt(target.dataset.floor || '0');
                const elevatorElement = target.closest('.elevator') as HTMLElement;
                
                if (elevatorElement) {
                    const elevatorId = parseInt(elevatorElement.id.split('-')[1]);
                    const elevator = this.building.elevators[elevatorId];
                    
                    if (elevator) {
                        elevator.requestFloor(floorNumber);
                        // Visual feedback
                        target.classList.add('pressed');
                        setTimeout(() => target.classList.remove('pressed'), 200);
                    }
                }
            }
        });

        // Reset button listener
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.building.reset();
            });
        }
    }
}

// Initialize the simulator
const simulator = new ElevatorSimulator();