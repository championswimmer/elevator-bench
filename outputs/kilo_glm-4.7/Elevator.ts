/**
 * Represents an elevator in the building.
 * All elevators start idle at floor 0.
 */
export class Elevator {
  /** The unique identifier for the elevator. */
  id: number;
  /** The current floor the elevator is at. */
  currentFloor: number;
  /** The current direction of movement. */
  direction: 'up' | 'down' | 'idle';
  /** The set of destination floors. */
  destinationFloors: Set<number>;
  /** The current state of the elevator. */
  state: 'idle' | 'moving' | 'doors_open';

  /**
   * Creates a new Elevator instance.
   * @param id The elevator ID.
   */
  constructor(id: number) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = 'idle';
    this.destinationFloors = new Set<number>();
    this.state = 'idle';
  }

  /**
   * Moves the elevator to the specified floor.
   * @param floor The target floor.
   */
  moveToFloor(floor: number): void {
    this.addDestination(floor);
  }

  /**
   * Adds a destination floor to the elevator's queue.
   * @param floor The floor to add.
   */
  addDestination(floor: number): void {
    this.destinationFloors.add(floor);
    if (this.state === 'idle') {
      this.state = 'moving';
      this.direction = floor > this.currentFloor ? 'up' : 'down';
    }
  }

  /**
   * Removes a destination floor from the elevator's queue.
   * @param floor The floor to remove.
   */
  removeDestination(floor: number): void {
    this.destinationFloors.delete(floor);
    if (this.destinationFloors.size === 0) {
      this.state = 'idle';
      this.direction = 'idle';
    }
  }

  /**
   * Gets the next destination floor based on current direction.
   * @returns The next destination floor or null if none.
   */
  getNextDestination(): number | null {
    if (this.direction === 'up') {
      const candidates = Array.from(this.destinationFloors).filter(f => f > this.currentFloor);
      return candidates.length > 0 ? Math.min(...candidates) : null;
    } else if (this.direction === 'down') {
      const candidates = Array.from(this.destinationFloors).filter(f => f < this.currentFloor);
      return candidates.length > 0 ? Math.max(...candidates) : null;
    }
    return null;
  }

  /**
   * Checks if the elevator should stop at the given floor.
   * @param floor The floor to check.
   * @returns True if the elevator should stop at the floor.
   */
  shouldStopAtFloor(floor: number): boolean {
    return this.destinationFloors.has(floor);
  }

  /**
   * Updates the elevator's position for animation.
   * Moves towards the next destination at a constant speed.
   */
  updatePosition(): void {
    if (this.state === 'moving') {
      const next = this.getNextDestination();
      if (next !== null) {
        const speed = 0.1; // Assuming 10 updates per second for smooth animation
        if (next > this.currentFloor) {
          this.currentFloor = Math.min(this.currentFloor + speed, next);
          if (this.currentFloor >= next) {
            this.currentFloor = next;
            this.state = 'doors_open';
          }
        } else if (next < this.currentFloor) {
          this.currentFloor = Math.max(this.currentFloor - speed, next);
          if (this.currentFloor <= next) {
            this.currentFloor = next;
            this.state = 'doors_open';
          }
        }
      } else {
        // No more destinations in current direction, check opposite
        const oppositeDirection = this.direction === 'up' ? 'down' : 'up';
        const candidates = Array.from(this.destinationFloors).filter(f =>
          oppositeDirection === 'up' ? f > this.currentFloor : f < this.currentFloor
        );
        if (candidates.length > 0) {
          this.direction = oppositeDirection;
        } else {
          this.state = 'idle';
          this.direction = 'idle';
        }
      }
    }
  }
}