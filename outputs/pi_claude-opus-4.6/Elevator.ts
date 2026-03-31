export type Direction = 'up' | 'down' | 'idle';

export class Elevator {
  id: number;
  currentFloor: number;
  direction: Direction;
  destinationFloors: Set<number>;
  moving: boolean;
  doorOpen: boolean;

  constructor(id: number) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = 'idle';
    this.destinationFloors = new Set<number>();
    this.moving = false;
    this.doorOpen = false;
  }

  addDestination(floor: number): void {
    if (floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
    }
  }

  removeDestination(floor: number): void {
    this.destinationFloors.delete(floor);
  }

  hasDestination(floor: number): boolean {
    return this.destinationFloors.has(floor);
  }

  get isIdle(): boolean {
    return this.direction === 'idle' && this.destinationFloors.size === 0 && !this.moving;
  }

  /**
   * Get the next floor to visit based on current direction.
   * Elevator should not change direction until all requests in current direction are fulfilled.
   */
  getNextFloor(totalFloors: number): number | null {
    if (this.destinationFloors.size === 0) return null;

    const floors = Array.from(this.destinationFloors).sort((a, b) => a - b);

    if (this.direction === 'up') {
      // Get floors above current position
      const floorsAbove = floors.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0]; // nearest floor above
      }
      // No more floors above, switch direction
      const floorsBelow = floors.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        this.direction = 'down';
        return floorsBelow[floorsBelow.length - 1]; // nearest floor below (highest of below)
      }
    } else if (this.direction === 'down') {
      // Get floors below current position
      const floorsBelow = floors.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1]; // nearest floor below
      }
      // No more floors below, switch direction
      const floorsAbove = floors.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        this.direction = 'up';
        return floorsAbove[0]; // nearest floor above (lowest of above)
      }
    } else {
      // idle - pick the closest floor
      let closest = floors[0];
      let minDist = Math.abs(floors[0] - this.currentFloor);
      for (const f of floors) {
        const dist = Math.abs(f - this.currentFloor);
        if (dist < minDist) {
          minDist = dist;
          closest = f;
        }
      }
      this.direction = closest > this.currentFloor ? 'up' : 'down';
      return closest;
    }

    return null;
  }

  /**
   * Calculate distance to a floor considering current direction
   */
  distanceTo(floor: number, totalFloors: number): number {
    if (this.isIdle) {
      return Math.abs(this.currentFloor - floor);
    }

    // If elevator is moving in same direction as request
    if (this.direction === 'up' && floor >= this.currentFloor) {
      return floor - this.currentFloor;
    }
    if (this.direction === 'down' && floor <= this.currentFloor) {
      return this.currentFloor - floor;
    }

    // Elevator moving away - it needs to complete its run first
    if (this.direction === 'up') {
      const maxDest = Math.max(...Array.from(this.destinationFloors), this.currentFloor);
      return (maxDest - this.currentFloor) + (maxDest - floor);
    }
    if (this.direction === 'down') {
      const minDest = Math.min(...Array.from(this.destinationFloors), this.currentFloor);
      return (this.currentFloor - minDest) + (floor - minDest);
    }

    return Math.abs(this.currentFloor - floor);
  }
}
