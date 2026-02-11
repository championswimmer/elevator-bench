import { Elevator, Direction } from './Elevator';
import { Floor } from './Floor';

interface FloorRequest {
    floor: number;
    direction: Direction;
}

interface QueuedRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

export class Building {
    public floors: Floor[];
    public elevators: Elevator[];
    public numFloors: number;
    public numElevators: number;
    private floorRequests: Map<number, Set<Direction>>;
    private requestQueue: QueuedRequest[];
    private isProcessing: boolean;

    constructor(numFloors: number = 10, numElevators: number = 4) {
        this.numFloors = numFloors;
        this.numElevators = numElevators;
        this.floors = [];
        this.elevators = [];
        this.floorRequests = new Map();
        this.requestQueue = [];
        this.isProcessing = false;
    }

    public initialize(): void {
        for (let i = 0; i < this.numFloors; i++) {
            const floor = new Floor(i, this.numFloors);
            this.floors.push(floor);
        }

        for (let i = 0; i < this.numElevators; i++) {
            const elevator = new Elevator(i);
            this.elevators.push(elevator);
        }

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        window.addEventListener('floorRequest', ((e: CustomEvent) => {
            const { floor, direction } = e.detail as FloorRequest;
            this.handleFloorRequest(floor, direction);
        }) as EventListener);

        window.addEventListener('elevatorRequest', ((e: CustomEvent) => {
            const { elevatorId, floor } = e.detail;
            const elevator = this.elevators[elevatorId];
            if (elevator && elevator.currentFloor !== floor) {
                this.processElevatorTargets(elevator);
            }
        }) as EventListener);
    }

    private handleFloorRequest(floor: number, direction: Direction): void {
        const floorObj = this.floors[floor];
        floorObj.setActive(direction, true);

        if (!this.floorRequests.has(floor)) {
            this.floorRequests.set(floor, new Set());
        }
        this.floorRequests.get(floor)!.add(direction);

        const elevator = this.findBestElevator(floor, direction);
        
        if (elevator) {
            elevator.addTarget(floor);
            if (elevator.isIdle) {
                const dir: Direction = floor > elevator.currentFloor ? 'up' : 'down';
                elevator.setDirection(dir);
                this.animateElevator(elevator, floor);
            }
        } else {
            this.requestQueue.push({ floor, direction, timestamp: Date.now() });
            this.processQueue();
        }
    }

    private findBestElevator(requestFloor: number, direction: Direction): Elevator | null {
        let bestElevator: Elevator | null = null;
        let bestDistance = Infinity;

        for (const elevator of this.elevators) {
            if (elevator.isIdle) {
                const distance = Math.abs(elevator.currentFloor - requestFloor);
                
                let isGoodDirection = false;
                if (direction === 'up' && elevator.currentFloor <= requestFloor) {
                    isGoodDirection = true;
                } else if (direction === 'down' && elevator.currentFloor >= requestFloor) {
                    isGoodDirection = true;
                }

                if (isGoodDirection) {
                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestElevator = elevator;
                    }
                } else if (bestDistance === Infinity && distance < bestDistance) {
                    bestDistance = distance;
                    bestElevator = elevator;
                }
            }
        }

        if (!bestElevator) {
            for (const elevator of this.elevators) {
                const distance = Math.abs(elevator.currentFloor - requestFloor);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestElevator = elevator;
                }
            }
        }

        return bestElevator;
    }

    private processQueue(): void {
        if (this.isProcessing || this.requestQueue.length === 0) return;
        
        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue[0];
            const elevator = this.findBestElevator(request.floor, request.direction);
            
            if (elevator) {
                this.requestQueue.shift();
                elevator.addTarget(request.floor);
                
                if (elevator.isIdle) {
                    const dir: Direction = request.floor > elevator.currentFloor ? 'up' : 'down';
                    elevator.setDirection(dir);
                    this.animateElevator(elevator, request.floor);
                }
            } else {
                break;
            }
        }

        this.isProcessing = false;
    }

    private animateElevator(elevator: Elevator, targetFloor: number): void {
        const moveStep = () => {
            if (elevator.currentFloor === targetFloor) {
                elevator.removeTarget(targetFloor);
                this.floors[targetFloor].setActive('up', false);
                this.floors[targetFloor].setActive('down', false);
                this.floorRequests.delete(targetFloor);
                elevator.clearFloorButton(targetFloor);

                if (elevator.targetFloors.length > 0) {
                    this.processElevatorTargets(elevator);
                } else {
                    elevator.setDirection('idle');
                    elevator.state = 'idle';
                    this.processQueue();
                }
                return;
            }

            if (elevator.currentFloor < targetFloor) {
                elevator.currentFloor++;
                elevator.setDirection('up');
            } else {
                elevator.currentFloor--;
                elevator.setDirection('down');
            }

            elevator.updatePosition(this.numFloors);
            
            if (elevator.currentFloor === targetFloor) {
                elevator.removeTarget(targetFloor);
                this.floors[targetFloor].setActive('up', false);
                this.floors[targetFloor].setActive('down', false);
                this.floorRequests.delete(targetFloor);
                elevator.clearFloorButton(targetFloor);
            }

            if (elevator.targetFloors.length > 0) {
                const nextTarget = elevator.getNextTarget();
                if (nextTarget !== null && nextTarget !== targetFloor) {
                    setTimeout(moveStep, 300);
                } else if (elevator.targetFloors.length > 0) {
                    this.processElevatorTargets(elevator);
                } else {
                    elevator.setDirection('idle');
                    elevator.state = 'idle';
                    this.processQueue();
                }
            } else {
                elevator.setDirection('idle');
                elevator.state = 'idle';
                this.processQueue();
            }
        };

        setTimeout(moveStep, 300);
    }

    private processElevatorTargets(elevator: Elevator): void {
        if (elevator.targetFloors.length === 0) {
            elevator.setDirection('idle');
            elevator.state = 'idle';
            this.processQueue();
            return;
        }

        const target = elevator.getNextTarget();
        if (target === null) return;

        if (elevator.currentFloor < target) {
            elevator.setDirection('up');
        } else if (elevator.currentFloor > target) {
            elevator.setDirection('down');
        }

        this.animateElevator(elevator, target);
    }

    public render(): void {
        const floorsContainer = document.getElementById('floors-container');
        const elevatorsContainer = document.getElementById('elevators-container');
        
        if (!floorsContainer || !elevatorsContainer) {
            console.error('Required DOM elements not found');
            return;
        }

        floorsContainer.innerHTML = '';
        elevatorsContainer.innerHTML = '';

        this.floors.forEach(floor => floor.render(floorsContainer));
        this.elevators.forEach(elevator => elevator.render(this.numFloors, elevatorsContainer));
    }
}
