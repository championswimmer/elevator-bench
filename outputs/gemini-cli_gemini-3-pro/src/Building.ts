import { CONFIG } from './Config';
import { Floor } from './Floor';
import { Elevator } from './Elevator';

export class Building {
    private floors: Floor[] = [];
    private elevators: Elevator[] = [];
    private container: HTMLElement;

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container ${containerId} not found`);
        this.container = el;

        this.init();
    }

    private init() {
        this.container.innerHTML = '';
        this.container.className = 'building';
        
        // 1. Create Floors Column
        const floorsCol = document.createElement('div');
        floorsCol.className = 'floors-control-column';
        
        for (let i = 0; i < CONFIG.FLOOR_COUNT; i++) {
            const floor = new Floor(i, this.handleFloorRequest.bind(this));
            this.floors.push(floor);
            floorsCol.appendChild(floor.getElement());
        }
        
        this.container.appendChild(floorsCol);

        // 2. Create Shafts
        const shaftsContainer = document.createElement('div');
        shaftsContainer.className = 'shafts-container';
        // Set height explicitly to contain elevators correctly
        shaftsContainer.style.height = `${CONFIG.FLOOR_COUNT * CONFIG.FLOOR_HEIGHT}px`;

        for (let i = 0; i < CONFIG.ELEVATOR_COUNT; i++) {
            const shaft = document.createElement('div');
            shaft.className = 'elevator-shaft';
            shaft.style.height = '100%';

            // Add guide lines
            for (let f = 1; f < CONFIG.FLOOR_COUNT; f++) {
                 const line = document.createElement('div');
                 line.className = 'shaft-floor-guide';
                 line.style.bottom = `${f * CONFIG.FLOOR_HEIGHT}px`;
                 shaft.appendChild(line);
            }

            const elevator = new Elevator(i, this.updateSystemState.bind(this));
            this.elevators.push(elevator);
            shaft.appendChild(elevator.getElement());
            
            shaftsContainer.appendChild(shaft);
        }

        this.container.appendChild(shaftsContainer);

        // 3. Create Control Panels Container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        
        this.elevators.forEach(e => {
            controlsContainer.appendChild(e.getControlPanel());
        });

        this.container.appendChild(controlsContainer);

        // Listen for arrivals to clear buttons
        window.addEventListener('elevatorArrived', (e: any) => {
            const { floor, direction } = e.detail;
            this.floors[floor].setButtonActive('UP', false); // Clear both for simplicity or specific? 
            // In real elevators, if going up, it clears up.
            // The current elevator logic might have direction 'IDLE' if it was the last stop.
            // Let's just clear all for that floor for now or be smart.
            // If elevator direction was UP, clear UP.
            
            // Improvement: Elevator sends its current intended direction.
            // If IDLE, it probably cleared the request it came for.
            // Since we don't strictly track "which request caused this move" in Elevator class (it just has a set of stops),
            // we will aggressively clear the buttons corresponding to the direction the elevator is currently set to continue, 
            // OR if it is idle (finished), we clear the buttons that match the arrival.
            
            // Simplified: Clear both buttons on that floor. 
            // A more advanced sim would only clear the relevant direction.
            // Let's try to do it right.
            
            if (direction === 'UP') {
                 this.floors[floor].setButtonActive('UP', false);
            } else if (direction === 'DOWN') {
                 this.floors[floor].setButtonActive('DOWN', false);
            } else {
                // It arrived and became IDLE (served the last request).
                // We don't know if it was an UP or DOWN request originally without storing more state.
                // But typically it stops at a floor. We can assume it clears the button for the direction it came FROM?
                // Or just clear both to be safe visually.
                this.floors[floor].setButtonActive('UP', false);
                this.floors[floor].setButtonActive('DOWN', false);
            }
        });
    }

    private handleFloorRequest(floorIndex: number, direction: 'UP' | 'DOWN') {
        console.log(`Request at Floor ${floorIndex} going ${direction}`);
        
        // 1. Check if any elevator is already at this floor and IDLE or moving in right direction?
        // (Skipped optimization: if elevator is already there with doors open)

        // 2. Find best candidate
        const candidate = this.findBestElevator(floorIndex, direction);
        
        if (candidate) {
            console.log(`Assigned Elevator ${candidate.id}`);
            candidate.addRequest(floorIndex);
        } else {
            // All busy and moving away?
            // Actually findBestElevator should always return *someone*, even if they are busy.
            // We just pick the "least bad" option.
            // Ideally: Closest IDLE > Closest Moving Towards > Closest Moving Away (will circle back)
            
            // Simple fallback: Pick random or round robin if logic fails?
            // My logic below covers these cases.
        }
    }

    private findBestElevator(targetFloor: number, direction: 'UP' | 'DOWN'): Elevator | null {
        // Filter elevators
        const idle = this.elevators.filter(e => e.isIdle());
        const movingTowards = this.elevators.filter(e => {
            if (e.isIdle()) return false;
            if (e.direction === direction) {
                // Moving in same direction.
                // If UP, elevator must be below target.
                // If DOWN, elevator must be above target.
                if (direction === 'UP' && e.currentFloor <= targetFloor) return true;
                if (direction === 'DOWN' && e.currentFloor >= targetFloor) return true;
            }
            return false;
        });
        
        // 1. Priority: Closest IDLE
        if (idle.length > 0) {
            return idle.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
        }

        // 2. Priority: Closest Moving Towards (on the way)
        if (movingTowards.length > 0) {
             return movingTowards.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
        }

        // 3. Fallback: Just pick the one that will finish its current run closest? 
        // Or simply the closest physical one regardless of state (it will eventually queue it).
        // This might result in long waits if that elevator has a long queue.
        // Let's just pick the closest one physically for now to ensure a response.
        return this.elevators.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
    }

    private updateSystemState() {
        // Can be used for global monitoring
    }
}
