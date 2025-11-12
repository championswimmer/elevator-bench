import { ElevatorDirection, Request, Passenger } from './Types';

export class Elevator {
  id: number;
  currentFloor: number;
  targetFloor: number;
  direction: ElevatorDirection;
  isMoving: boolean;
  isIdle: boolean;
  requests: Request[];
  passengers: Passenger[];
  private speed: number;
  private floorHeight: number;
  private position: number;

  constructor(id: number, startingFloor: number = 1) {
    this.id = id;
    this.currentFloor = startingFloor;
    this.targetFloor = startingFloor;
    this.direction = 'idle';
    this.isMoving = false;
    this.isIdle = true;
    this.requests = [];
    this.passengers = [];
    this.speed = 2; // floors per second
    this.floorHeight = 100; // pixels per floor
    this.position = startingFloor * this.floorHeight;
  }

  move(): void {
    if (!this.isMoving || this.direction === 'idle') {
      return;
    }

    const targetPosition = this.targetFloor * this.floorHeight;
    const currentPosition = this.position;

    if (Math.abs(targetPosition - currentPosition) < 1) {
      this.stop();
      return;
    }

    const moveDirection = this.direction === 'up' ? 1 : -1;
    this.position += moveDirection * this.speed * 2; // 2 is frame rate multiplier

    // Update current floor based on position
    const newFloor = Math.round(this.position / this.floorHeight);
    if (newFloor !== this.currentFloor) {
      this.currentFloor = newFloor;
    }
  }

  stop(): void {
    this.isMoving = false;
    this.isIdle = true;
    this.direction = 'idle';
    this.position = this.targetFloor * this.floorHeight;
    this.currentFloor = this.targetFloor;
    
    // Remove completed requests
    this.requests = this.requests.filter(request => request.floor !== this.currentFloor);
    
    // Remove passengers who have reached their destination
    this.passengers = this.passengers.filter(passenger => passenger.targetFloor !== this.currentFloor);
  }

  addRequest(floor: number, direction: ElevatorDirection): void {
    const existingRequest = this.requests.find(req => req.floor === floor && req.direction === direction);
    if (!existingRequest) {
      this.requests.push({
        floor,
        direction,
        timestamp: Date.now()
      });
      
      // Sort requests by direction and floor
      this.sortRequests();
    }
  }

  private sortRequests(): void {
    this.requests.sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction === this.direction ? -1 : 1;
      }
      if (this.direction === 'up') {
        return a.floor - b.floor;
      } else {
        return b.floor - a.floor;
      }
    });
  }

  processRequests(): void {
    if (this.requests.length === 0) {
      this.isMoving = false;
      this.isIdle = true;
      this.direction = 'idle';
      return;
    }

    const nextRequest = this.requests[0];
    
    if (nextRequest.floor === this.currentFloor) {
      // Current floor request, stop to pick up
      this.stop();
      return;
    }

    // Set direction and target
    this.direction = nextRequest.floor > this.currentFloor ? 'up' : 'down';
    this.targetFloor = nextRequest.floor;
    this.isMoving = true;
    this.isIdle = false;
  }

  getDistanceToFloor(floor: number): number {
    return Math.abs(floor - this.currentFloor);
  }

  canServeRequest(floor: number, direction: ElevatorDirection): boolean {
    if (this.isIdle) {
      return true;
    }

    // Check if elevator is moving in the same direction as request
    if (this.direction === direction) {
      // Check if request is ahead of current position
      if (direction === 'up' && floor >= this.currentFloor) {
        return true;
      }
      if (direction === 'down' && floor <= this.currentFloor) {
        return true;
      }
    }

    return false;
  }

  addPassenger(passenger: Passenger): void {
    this.passengers.push(passenger);
  }

  getPosition(): number {
    return this.position;
  }

  getState() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      direction: this.direction,
      isMoving: this.isMoving,
      isIdle: this.isIdle,
      requests: [...this.requests],
      passengers: [...this.passengers]
    };
  }
}