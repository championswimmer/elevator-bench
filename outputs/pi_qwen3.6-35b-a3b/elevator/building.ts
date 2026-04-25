import { TOTAL_FLOORS, NUM_ELEVATORS, MIN_FLOOR, MAX_FLOOR } from './config.js';
import { Floor, FloorRequest } from './floor.js';
import { Elevator } from './elevator.js';

export class Building {
  public floors: Floor[] = [];
  public elevators: Elevator[] = [];
  public hallCallQueue: Array<{ floor: number; direction: 'up' | 'down' }> = [];

  constructor() {
    // Create floors
    for (let i = 0; i < TOTAL_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
    // Create elevators all at ground floor
    for (let i = 0; i < NUM_ELEVATORS; i++) {
      const elevator = new Elevator(i, MIN_FLOOR);
      this.elevators.push(elevator);
    }
  }

  /** Request an elevator from a floor (hall call) */
  requestElevator(floor: number, direction: 'up' | 'down'): void {
    const req = direction === 'up'
      ? this.floors[floor].requestUp()
      : this.floors[floor].requestDown();

    // Try to dispatch immediately to an idle elevator
    const dispatched = this._dispatchHallCall(floor, direction);
    if (!dispatched) {
      // Queue the request
      this.hallCallQueue.push({ floor, direction });
    }
  }

  /** Dispatch a hall call to the best elevator */
  dispatchHallCall(floor: number, direction: 'up' | 'down'): boolean {
    const dispatched = this._dispatchHallCall(floor, direction);
    if (!dispatched) {
      this.hallCallQueue.push({ floor, direction });
    }
    return dispatched;
  }

  private _dispatchHallCall(floor: number, direction: 'up' | 'down'): boolean {
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      let score = 0;

      if (elevator.state === 'idle') {
        // Priority: closest idle elevator
        const dist = Math.abs(elevator.currentFloor - floor);
        // Bonus if facing the right direction
        const dirBonus = (direction === 'up' && elevator.currentFloor <= floor) ||
                         (direction === 'down' && elevator.currentFloor >= floor) ? -10 : 10;
        score = dist + dirBonus;
      } else if (elevator.state === 'moving' && elevator.direction !== 'none') {
        // Already moving in the requested direction and heading toward the floor
        const headingToFloor =
          (direction === 'up' && elevator.direction === 'up' && elevator.currentFloor <= floor) ||
          (direction === 'down' && elevator.direction === 'down' && elevator.currentFloor >= floor);

        if (headingToFloor) {
          const dist = Math.abs(elevator.currentFloor - floor);
          score = dist + 5; // slight penalty vs idle
        } else {
          continue; // Don't assign elevators moving away
        }
      } else {
        continue; // Busy in wrong state
      }

      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }

    if (bestElevator) {
      bestElevator.assignHallCall(floor, direction);
      return true;
    }
    return false;
  }

  /** Check if any queued hall calls can now be dispatched */
  processQueue(): void {
    const remaining: typeof this.hallCallQueue = [];
    for (const req of this.hallCallQueue) {
      if (!this._dispatchHallCall(req.floor, req.direction)) {
        remaining.push(req);
      }
    }
    this.hallCallQueue = remaining;
  }

  /** Handle passenger getting off at a floor */
  passengerOff(elevator: Elevator, floor: number): void {
    elevator.removeDestination(floor);
    elevator.passengers = Math.max(0, elevator.passengers - 1);
  }

  /** Handle passenger getting on at a floor */
  passengerOn(elevator: Elevator): void {
    elevator.passengers = Math.min(elevator.capacity, elevator.passengers + 1);
  }

  /** Tick all elevators */
  tick(deltaTime: number): void {
    for (const elevator of this.elevators) {
      elevator.tick(deltaTime);
    }
    this.processQueue();
  }
}
