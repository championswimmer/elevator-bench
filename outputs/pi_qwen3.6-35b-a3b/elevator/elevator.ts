import { ELEVATOR_SPEED_FLOORS_PER_SEC, MIN_FLOOR, MAX_FLOOR } from './config.js';

export type ElevatorState = 'idle' | 'moving' | 'door-open';

export type DestinationRequest = {
  floor: number;
  passengerCount: number;
};

export class Elevator {
  public id: number;
  public currentFloor: number;
  public state: ElevatorState;
  public direction: 'up' | 'down' | 'none';
  public destinations: DestinationRequest[];
  public capacity: number;
  public passengers: number;

  private speed: number;
  private progress: number; // fractional progress toward next floor
  private nextTargetFloor: number;
  private doorTimer: number;
  private _onUpdate?: (elevator: Elevator) => void;

  constructor(id: number, startFloor: number = MIN_FLOOR) {
    this.id = id;
    this.currentFloor = startFloor;
    this.state = 'idle';
    this.direction = 'none';
    this.destinations = [];
    this.capacity = 8;
    this.passengers = 0;
    this.speed = ELEVATOR_SPEED_FLOORS_PER_SEC;
    this.progress = 0;
    this.nextTargetFloor = startFloor;
    this.doorTimer = 0;
  }

  setOnUpdate(callback: (elevator: Elevator) => void): void {
    this._onUpdate = callback;
  }

  /** Assign this elevator a floor request from a hall call */
  assignHallCall(floor: number, direction: 'up' | 'down'): void {
    this.direction = direction;
    this.state = 'moving';
    // Add to destinations if not already there
    if (!this.destinations.find(d => d.floor === floor)) {
      this.destinations.push({ floor, passengerCount: 0 });
    }
    this._notify();
  }

  /** Assign a passenger destination inside the elevator */
  addDestination(floor: number): boolean {
    if (this.passengers >= this.capacity) return false;
    if (this.currentFloor === floor) return false;
    if (this.destinations.find(d => d.floor === floor)) return true;
    this.destinations.push({ floor, passengerCount: 0 });
    // If idle, start moving
    if (this.state === 'idle') {
      this.state = 'moving';
      this.direction = floor > this.currentFloor ? 'up' : 'down';
    }
    this._notify();
    return true;
  }

  removeDestination(floor: number): void {
    this.destinations = this.destinations.filter(d => d.floor !== floor);
    if (this.destinations.length === 0 && this.state !== 'door-open') {
      this.state = 'idle';
      this.direction = 'none';
    }
    this._notify();
  }

  /** Check if this elevator should stop at the given floor */
  shouldStopAt(floor: number): boolean {
    if (this.state === 'idle') return false;
    // Hall call: direction matches and we're approaching this floor
    const hallCallMatch =
      (this.direction === 'up' && floor >= this.currentFloor) ||
      (this.direction === 'down' && floor <= this.currentFloor);
    if (hallCallMatch && this.destinations.find(d => d.floor === floor)) return true;
    // Internal: any destination
    return this.destinations.some(d => d.floor === floor);
  }

  /** Tick the elevator simulation */
  tick(deltaTime: number): void {
    if (this.state === 'idle' || this.state === 'door-open') return;

    if (this.state === 'moving') {
      // Determine target
      if (this.direction === 'up') {
        const pending = this.destinations.filter(d => d.floor >= this.currentFloor);
        if (pending.length > 0) {
          this.nextTargetFloor = Math.min(...pending.map(d => d.floor));
        } else {
          this.direction = 'down';
          this._notify();
          return;
        }
      } else {
        const pending = this.destinations.filter(d => d.floor <= this.currentFloor);
        if (pending.length > 0) {
          this.nextTargetFloor = Math.max(...pending.map(d => d.floor));
        } else {
          this.direction = 'up';
          this._notify();
          return;
        }
      }

      const dist = this.nextTargetFloor - this.currentFloor;
      const travelTime = Math.abs(dist) / this.speed;
      const step = (deltaTime / travelTime) * dist;

      this.progress += step;

      // Check if we've reached the target
      if ((dist > 0 && this.progress >= dist) || (dist < 0 && this.progress <= dist)) {
        this.currentFloor = this.nextTargetFloor;
        this.progress = 0;

        // Door open at destination
        this.state = 'door-open';
        this.doorTimer = 1.5; // seconds
        this._notify();
      }
    }

    // Door open timer
    if (this.state === 'door-open') {
      this.doorTimer -= deltaTime;
      if (this.doorTimer <= 0) {
        // Check if there are more destinations in current direction
        this._checkMoreDestinations();
      }
    }
  }

  private _checkMoreDestinations(): void {
    // Find next destination in current direction
    let nextFloor: number | null = null;
    if (this.direction === 'up') {
      const pending = this.destinations.filter(d => d.floor > this.currentFloor);
      if (pending.length > 0) nextFloor = Math.min(...pending.map(d => d.floor));
    } else if (this.direction === 'down') {
      const pending = this.destinations.filter(d => d.floor < this.currentFloor);
      if (pending.length > 0) nextFloor = Math.max(...pending.map(d => d.floor));
    }

    if (nextFloor !== null) {
      this.state = 'moving';
      this.progress = 0;
    } else {
      // Check if we need to reverse direction (sweep all floors)
      const remaining = this.destinations.filter(d => d.floor !== this.currentFloor);
      if (remaining.length > 0) {
        this.direction = this.direction === 'up' ? 'down' : 'up';
        this.state = 'moving';
        this.progress = 0;
      } else {
        this.state = 'idle';
        this.direction = 'none';
        this.destinations = [];
      }
    }
    this._notify();
  }

  getProgressToNext(): number {
    if (this.state !== 'moving') return 0;
    const dist = this.nextTargetFloor - this.currentFloor;
    if (dist === 0) return 1;
    return Math.min(1, Math.abs(this.progress) / Math.abs(dist));
  }

  private _notify(): void {
    this._onUpdate?.(this);
  }
}
