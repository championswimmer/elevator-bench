export type ElevatorDirection = 'up' | 'down' | 'idle';
export type ElevatorState = 'idle' | 'moving' | 'door_open';

export class Elevator {
    id: number;
    currentFloor: number;
    targetFloor: number | null;
    direction: ElevatorDirection;
    state: ElevatorState;
    destinations: Set<number>;
    doorOpenTimer: number;
    private readonly DOOR_OPEN_TIME = 2000; // ms
    private readonly MOVE_TIME = 1000; // ms per floor
    private lastMoveTime: number;
    private onStateChange: (() => void) | null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloor = null;
        this.direction = 'idle';
        this.state = 'idle';
        this.destinations = new Set();
        this.doorOpenTimer = 0;
        this.lastMoveTime = 0;
        this.onStateChange = null;
    }

    setOnStateChange(callback: () => void) {
        this.onStateChange = callback;
    }

    private notifyChange() {
        if (this.onStateChange) {
            this.onStateChange();
        }
    }

    addDestination(floor: number): boolean {
        if (floor === this.currentFloor && this.state === 'idle') {
            this.openDoors();
            return true;
        }
        if (!this.destinations.has(floor)) {
            this.destinations.add(floor);
            this.updateDirection();
            this.notifyChange();
            return true;
        }
        return false;
    }

    canAcceptRequest(floor: number, direction: ElevatorDirection): boolean {
        if (this.state === 'idle') {
            return true;
        }
        if (this.direction === 'up' && direction === 'up' && floor > this.currentFloor) {
            return true;
        }
        if (this.direction === 'down' && direction === 'down' && floor < this.currentFloor) {
            return true;
        }
        return false;
    }

    getDistanceTo(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }

    private updateDirection() {
        if (this.destinations.size === 0) {
            this.direction = 'idle';
            this.targetFloor = null;
            return;
        }

        const destinations = Array.from(this.destinations);

        if (this.direction === 'idle') {
            // Pick the closest destination
            let closest = destinations[0];
            let minDist = Math.abs(closest - this.currentFloor);
            for (const d of destinations) {
                const dist = Math.abs(d - this.currentFloor);
                if (dist < minDist) {
                    minDist = dist;
                    closest = d;
                }
            }
            this.targetFloor = closest;
            this.direction = this.targetFloor > this.currentFloor ? 'up' : 'down';
        } else if (this.direction === 'up') {
            // Find highest destination in current direction
            const upDests = destinations.filter(d => d > this.currentFloor);
            if (upDests.length > 0) {
                this.targetFloor = Math.min(...upDests);
            } else {
                // No more up destinations, switch direction
                const downDests = destinations.filter(d => d < this.currentFloor);
                if (downDests.length > 0) {
                    this.targetFloor = Math.max(...downDests);
                    this.direction = 'down';
                } else {
                    this.targetFloor = this.currentFloor;
                }
            }
        } else if (this.direction === 'down') {
            // Find lowest destination in current direction
            const downDests = destinations.filter(d => d < this.currentFloor);
            if (downDests.length > 0) {
                this.targetFloor = Math.max(...downDests);
            } else {
                // No more down destinations, switch direction
                const upDests = destinations.filter(d => d > this.currentFloor);
                if (upDests.length > 0) {
                    this.targetFloor = Math.min(...upDests);
                    this.direction = 'up';
                } else {
                    this.targetFloor = this.currentFloor;
                }
            }
        }
    }

    private openDoors() {
        this.state = 'door_open';
        this.doorOpenTimer = this.DOOR_OPEN_TIME;
        this.destinations.delete(this.currentFloor);
        this.notifyChange();
    }

    update(deltaTime: number) {
        if (this.state === 'door_open') {
            this.doorOpenTimer -= deltaTime;
            if (this.doorOpenTimer <= 0) {
                this.doorOpenTimer = 0;
                if (this.destinations.size > 0) {
                    this.state = 'moving';
                    this.updateDirection();
                } else {
                    this.state = 'idle';
                    this.direction = 'idle';
                    this.targetFloor = null;
                }
                this.notifyChange();
            }
            return;
        }

        if (this.state === 'moving' && this.targetFloor !== null) {
            const now = Date.now();
            if (now - this.lastMoveTime >= this.MOVE_TIME) {
                this.lastMoveTime = now;

                if (this.currentFloor < this.targetFloor) {
                    this.currentFloor++;
                } else if (this.currentFloor > this.targetFloor) {
                    this.currentFloor--;
                }

                if (this.destinations.has(this.currentFloor)) {
                    this.openDoors();
                } else {
                    this.updateDirection();
                    if (this.destinations.size === 0) {
                        this.state = 'idle';
                        this.direction = 'idle';
                        this.targetFloor = null;
                    }
                }
                this.notifyChange();
            }
        }
    }

    reset() {
        this.currentFloor = 0;
        this.targetFloor = null;
        this.direction = 'idle';
        this.state = 'idle';
        this.destinations.clear();
        this.doorOpenTimer = 0;
        this.lastMoveTime = 0;
        this.notifyChange();
    }
}
