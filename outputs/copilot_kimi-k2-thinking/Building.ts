import { Elevator } from './Elevator';
import { Floor } from './Floor';
import { Direction, ElevatorState, FloorRequest, CONFIG } from './types';

export class Building {
    floors: Floor[];
    elevators: Elevator[];
    queuedRequests: FloorRequest[];
    buildingElement: HTMLElement | null;
    floorsContainer: HTMLElement | null;
    elevatorShafts: HTMLElement | null;

    constructor() {
        this.floors = [];
        this.elevators = [];
        this.queuedRequests = [];
        this.buildingElement = null;
        this.floorsContainer = null;
        this.elevatorShafts = null;

        this.initializeBuilding();
    }

    private initializeBuilding(): void {
        // Create floors
        for (let i = 0; i < CONFIG.FLOOR_COUNT; i++) {
            this.floors.push(new Floor(i, CONFIG.FLOOR_COUNT));
        }

        // Create elevators
        for (let i = 0; i < CONFIG.ELEVATOR_COUNT; i++) {
            this.elevators.push(new Elevator(i));
        }
    }

    setElements(buildingElement: HTMLElement, floorsContainer: HTMLElement, elevatorShafts: HTMLElement): void {
        this.buildingElement = buildingElement;
        this.floorsContainer = floorsContainer;
        this.elevatorShafts = elevatorShafts;
        this.renderBuilding();
    }

    private renderBuilding(): void {
        if (!this.floorsContainer || !this.elevatorShafts) return;

        // Clear existing content
        this.floorsContainer.innerHTML = '';
        this.elevatorShafts.innerHTML = '';

        // Create elevator shafts
        for (let i = 0; i < CONFIG.ELEVATOR_COUNT; i++) {
            const shaft = document.createElement('div');
            shaft.className = 'elevator-shaft';
            shaft.style.height = `${CONFIG.FLOOR_COUNT * CONFIG.FLOOR_HEIGHT}px`;
            
            const elevator = this.elevators[i];
            const elevatorElement = this.createElevatorElement(i);
            shaft.appendChild(elevatorElement);
            elevator.setElement(elevatorElement);
            
            this.elevatorShafts.appendChild(shaft);
        }

        // Create floors (from top to bottom)
        for (let i = CONFIG.FLOOR_COUNT - 1; i >= 0; i--) {
            const floor = this.floors[i];
            const floorElement = this.createFloorElement(i);
            floor.setElement(floorElement);
            this.floorsContainer.appendChild(floorElement);
        }
    }

    private createElevatorElement(elevatorId: number): HTMLElement {
        const elevatorDiv = document.createElement('div');
        elevatorDiv.className = 'elevator';
        elevatorDiv.id = `elevator-${elevatorId}`;
        elevatorDiv.style.bottom = '0px';

        elevatorDiv.innerHTML = `
            <div class="elevator-info">
                <span class="elevator-id">${elevatorId}</span>
                <span class="floor-display">0</span>
                <span class="status"></span>
            </div>
            <div class="elevator-buttons">
                ${Array.from({length: CONFIG.FLOOR_COUNT}, (_, i) => 
                    `<button class="floor-btn" data-floor="${i}">${i}</button>`
                ).join('')}
            </div>
            <div class="direction-indicator"></div>
        `;

        return elevatorDiv;
    }

    private createFloorElement(floorNumber: number): HTMLElement {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${floorNumber}`;

        floorDiv.innerHTML = `
            <div class="floor-info">
                <span class="floor-number">Floor ${floorNumber}</span>
            </div>
            <div class="floor-controls">
                <button class="up-btn" data-floor="${floorNumber}">▲</button>
                <button class="down-btn" data-floor="${floorNumber}">▼</button>
            </div>
        `;

        return floorDiv;
    }

    requestElevator(floorNumber: number, direction: Direction): void {
        const request: FloorRequest = { floor: floorNumber, direction };
        
        // Try to find the best available elevator
        const availableElevator = this.findBestElevator(request);
        
        if (availableElevator) {
            availableElevator.requestPickup(request);
        } else {
            // Queue the request
            this.queuedRequests.push(request);
            this.updateStats();
        }
    }

    private findBestElevator(request: FloorRequest): Elevator | null {
        let bestElevator: Elevator | null = null;
        let bestScore = Infinity;

        for (const elevator of this.elevators) {
            if (elevator.canServiceRequest(request)) {
                const distance = elevator.getDistanceToFloor(request.floor);
                const queuePenalty = elevator.floorRequests.length * 2; // Penalty for busy elevators
                const score = distance + queuePenalty;

                if (score < bestScore) {
                    bestScore = score;
                    bestElevator = elevator;
                }
            }
        }

        return bestElevator;
    }

    processQueuedRequests(): void {
        if (this.queuedRequests.length === 0) return;

        const processedRequests: FloorRequest[] = [];

        for (const request of this.queuedRequests) {
            const elevator = this.findBestElevator(request);
            if (elevator) {
                elevator.requestPickup(request);
                processedRequests.push(request);
                
                // Clear the floor button
                const floor = this.floors[request.floor];
                floor.clearButton(request.direction);
            }
        }

        // Remove processed requests from queue
        this.queuedRequests = this.queuedRequests.filter(req => 
            !processedRequests.some(processed => 
                processed.floor === req.floor && processed.direction === req.direction
            )
        );

        this.updateStats();
    }

    updateStats(): void {
        const activeRequests = this.elevators.reduce((total, elevator) => 
            total + elevator.floorRequests.length + elevator.destinationRequests.size, 0
        );
        
        const activeRequestsEl = document.getElementById('active-requests');
        const queuedRequestsEl = document.getElementById('queued-requests');

        if (activeRequestsEl) activeRequestsEl.textContent = activeRequests.toString();
        if (queuedRequestsEl) queuedRequestsEl.textContent = this.queuedRequests.length.toString();
    }

    reset(): void {
        // Reset all elevators to ground floor
        this.elevators.forEach(elevator => {
            elevator.currentFloor = 0;
            elevator.targetFloor = 0;
            elevator.direction = Direction.IDLE;
            elevator.state = ElevatorState.IDLE;
            elevator.destinationRequests.clear();
            elevator.floorRequests = [];
            elevator.isMoving = false;
            elevator.updateDisplay();
        });

        // Clear all queued requests
        this.queuedRequests = [];

        // Clear all floor buttons
        this.floors.forEach(floor => {
            floor.clearButton(Direction.UP);
            floor.clearButton(Direction.DOWN);
        });

        this.updateStats();
    }

    start(): void {
        // Process queued requests periodically
        setInterval(() => {
            this.processQueuedRequests();
        }, 500);

        // Update stats periodically
        setInterval(() => {
            this.updateStats();
        }, 250);
    }
}