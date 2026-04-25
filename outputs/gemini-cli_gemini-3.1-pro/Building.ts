import { Floor } from './Floor.ts';
import { Elevator } from './Elevator.ts';

export class Building {
    floors: Floor[] = [];
    elevators: Elevator[] = [];
    numFloors: number;
    numElevators: number;
    pendingRequests: { floor: number, direction: 'UP' | 'DOWN' }[] = [];
    
    constructor(numFloors: number = 10, numElevators: number = 4) {
        this.numFloors = numFloors;
        this.numElevators = numElevators;
    }

    init(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const buildingDiv = document.createElement('div');
        buildingDiv.className = 'building';
        buildingDiv.style.height = `${this.numFloors * 100}px`;

        for (let i = this.numFloors - 1; i >= 0; i--) {
            const floor = new Floor(i, this);
            this.floors[i] = floor;
            buildingDiv.appendChild(floor.getElement());
        }

        const shaftsContainer = document.createElement('div');
        shaftsContainer.className = 'shafts-container';
        
        for (let i = 0; i < this.numElevators; i++) {
            const shaft = document.createElement('div');
            shaft.className = 'shaft';
            const elevator = new Elevator(i, this);
            this.elevators.push(elevator);
            shaft.appendChild(elevator.getElement());
            shaftsContainer.appendChild(shaft);
        }

        buildingDiv.appendChild(shaftsContainer);
        container.appendChild(buildingDiv);

        setInterval(() => this.processPendingRequests(), 500);
    }
    
    requestElevator(floorNum: number, direction: 'UP' | 'DOWN') {
        const bestElevator = this.findBestElevator(floorNum, direction);
        if (bestElevator) {
            bestElevator.addStop(floorNum);
        } else {
            const exists = this.pendingRequests.some(r => r.floor === floorNum && r.direction === direction);
            if (!exists) {
                this.pendingRequests.push({ floor: floorNum, direction });
            }
        }
    }

    processPendingRequests() {
        if (this.pendingRequests.length === 0) return;
        
        const remainingRequests: { floor: number, direction: 'UP' | 'DOWN' }[] = [];
        for (const req of this.pendingRequests) {
            const bestElevator = this.findBestElevator(req.floor, req.direction);
            if (bestElevator) {
                bestElevator.addStop(req.floor);
            } else {
                remainingRequests.push(req);
            }
        }
        this.pendingRequests = remainingRequests;
    }

    findBestElevator(floorNum: number, direction: 'UP' | 'DOWN'): Elevator | null {
        let bestElevator: Elevator | null = null;
        let minDistance = Infinity;

        for (const elevator of this.elevators) {
            if (elevator.state === 'IDLE') {
                const dist = Math.abs(elevator.currentFloor - floorNum);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestElevator = elevator;
                }
            } else if (elevator.direction === direction) {
                if (direction === 'UP' && elevator.currentFloor <= floorNum) {
                    const dist = floorNum - elevator.currentFloor;
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestElevator = elevator;
                    }
                } else if (direction === 'DOWN' && elevator.currentFloor >= floorNum) {
                    const dist = elevator.currentFloor - floorNum;
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestElevator = elevator;
                    }
                }
            }
        }
        
        return bestElevator;
    }

    clearFloorRequest(floorNum: number, direction: 'UP' | 'DOWN') {
        const floor = this.floors[floorNum];
        if (floor) {
            floor.clearRequest('BOTH');
        }
        this.pendingRequests = this.pendingRequests.filter(r => r.floor !== floorNum);
    }
}