import { Floor } from './Floor';
import { Elevator } from './Elevator';

/** Number of floors in the building (0-9). */
export const NUM_FLOORS = 10;
/** Number of elevators in the building (0-3). */
export const NUM_ELEVATORS = 4;
/** Elevator speed in floors per second for animation. */
export const ELEVATOR_SPEED = 1;

/**
 * Represents the building with floors and elevators.
 */
export class Building {
  /** Array of floors in the building. */
  floors: Floor[];
  /** Array of elevators in the building. */
  elevators: Elevator[];
  /** Queue of elevator requests. */
  requestQueue: Array<{ floor: number; direction: 'up' | 'down' }>;

  /**
   * Creates a new Building instance.
   */
  constructor() {
    this.floors = Array.from({ length: NUM_FLOORS }, (_, i) => new Floor(i));
    this.elevators = Array.from({ length: NUM_ELEVATORS }, (_, i) => new Elevator(i));
    this.requestQueue = [];
  }

  /**
   * Requests an elevator from the specified floor in the given direction.
   * @param floor The floor number.
   * @param direction The direction of travel.
   */
  requestElevator(floor: number, direction: 'up' | 'down'): void {
    this.requestQueue.push({ floor, direction });
  }

  /**
   * Assigns the closest idle elevator to the request.
   * @param floor The requested floor.
   * @param direction The requested direction.
   * @returns The assigned elevator or null if none available.
   */
  assignElevatorToRequest(floor: number, direction: 'up' | 'down'): Elevator | null {
    const elevator = this.findClosestIdleElevator(floor, direction);
    if (elevator) {
      elevator.addDestination(floor);
      return elevator;
    }
    return null;
  }

  /**
   * Finds the closest idle elevator to the specified floor.
   * @param floor The floor number.
   * @param direction The direction (for future extension).
   * @returns The closest idle elevator or null if none.
   */
  findClosestIdleElevator(floor: number, direction: 'up' | 'down'): Elevator | null {
    const idleElevators = this.elevators.filter(e => e.state === 'idle');
    if (idleElevators.length === 0) return null;

    let closest = idleElevators[0];
    let minDistance = Math.abs(closest.currentFloor - floor);

    for (const elevator of idleElevators) {
      const distance = Math.abs(elevator.currentFloor - floor);
      if (distance < minDistance) {
        minDistance = distance;
        closest = elevator;
      }
    }

    return closest;
  }

  /**
   * Processes the request queue, assigning elevators to pending requests.
   */
  processQueue(): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    for (const request of queue) {
      const assigned = this.assignElevatorToRequest(request.floor, request.direction);
      if (!assigned) {
        // Re-queue if no elevator available
        this.requestQueue.push(request);
      }
    }
  }

  /**
   * Main update loop: processes queue and updates elevator positions.
   */
  update(): void {
    this.processQueue();
    for (const elevator of this.elevators) {
      elevator.updatePosition();
    }
  }
}