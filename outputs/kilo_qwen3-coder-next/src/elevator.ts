export type ElevatorDirection = 'idle' | 'up' | 'down';

export interface ElevatorState {
  id: number;
  currentFloor: number;
  direction: ElevatorDirection;
  destinationFloors: Set<number>;
  isIdle: boolean;
  isMoving: boolean;
}

export class Elevator {
  public id: number;
  public currentFloor: number;
  public direction: ElevatorDirection;
  public destinationFloors: Set<number>;
  public isIdle: boolean;
  public isMoving: boolean;
  public targetFloor: number | null;

  private maxFloors: number;
  private speed: number; // floors per tick

  constructor(id: number, maxFloors: number, speed: number = 0.5) {
    this.id = id;
    this.maxFloors = maxFloors;
    this.speed = speed;
    this.currentFloor = 0;
    this.direction = 'idle';
    this.destinationFloors = new Set<number>();
    this.isIdle = true;
    this.isMoving = false;
    this.targetFloor = null;
  }

  public requestFloor(floor: number): void {
    this.destinationFloors.add(floor);
    this.updateDirection();
  }

  public updateDirection(): void {
    if (this.destinationFloors.size === 0) {
      this.direction = 'idle';
      this.isIdle = true;
      this.isMoving = false;
      this.targetFloor = null;
      return;
    }

    this.isIdle = false;

    // Find closest destination
    let closestFloor: number | null = null;
    let minDistance = Infinity;

    for (const floor of this.destinationFloors) {
      const distance = Math.abs(floor - this.currentFloor);
      if (distance < minDistance) {
        minDistance = distance;
        closestFloor = floor;
      }
    }

    if (closestFloor !== null) {
      this.targetFloor = closestFloor;
      if (closestFloor > this.currentFloor) {
        this.direction = 'up';
      } else if (closestFloor < this.currentFloor) {
        this.direction = 'down';
      } else {
        this.direction = 'idle';
      }
      this.isMoving = this.direction !== 'idle';
    }
  }

  public step(): boolean {
    if (!this.isMoving || this.targetFloor === null) {
      return false;
    }

    const prevFloor = this.currentFloor;

    if (this.direction === 'up') {
      this.currentFloor += this.speed;
      if (this.currentFloor >= this.targetFloor) {
        this.currentFloor = this.targetFloor;
        this.direction = 'idle';
        this.isMoving = false;
        this.destinationFloors.delete(this.targetFloor);
        this.updateDirection();
      }
    } else if (this.direction === 'down') {
      this.currentFloor -= this.speed;
      if (this.currentFloor <= this.targetFloor) {
        this.currentFloor = this.targetFloor;
        this.direction = 'idle';
        this.isMoving = false;
        this.destinationFloors.delete(this.targetFloor);
        this.updateDirection();
      }
    }

    return this.currentFloor !== prevFloor;
  }

  public getProgress(): number {
    if (this.targetFloor === null || !this.isMoving) {
      return 0;
    }

    const distanceToTarget = Math.abs(this.targetFloor - this.currentFloor);
    const totalDistance = Math.abs(this.targetFloor - (this.currentFloor - (this.direction === 'up' ? this.speed : -this.speed)));

    if (totalDistance === 0) return 1;
    return Math.min(1, 1 - (distanceToTarget / totalDistance));
  }

  public getNormalizedPosition(): number {
    // Returns 0 for bottom floor, 1 for top floor
    return this.currentFloor / (this.maxFloors - 1);
  }

  public getFloor(): number {
    return Math.round(this.currentFloor);
  }

  public canServeRequest(floor: number, requestedDirection: 'up' | 'down'): boolean {
    if (this.direction === 'idle') {
      return true;
    }

    if (requestedDirection === 'up') {
      return this.direction === 'up' && floor >= this.currentFloor;
    } else {
      return this.direction === 'down' && floor <= this.currentFloor;
    }
  }

  public isDirectionValid(floor: number): boolean {
    if (this.direction === 'idle') {
      return true;
    }

    if (this.direction === 'up') {
      return floor >= this.currentFloor;
    } else {
      return floor <= this.currentFloor;
    }
  }
}
