export type Direction = 'up' | 'down' | 'idle';
export type ElevatorState = 'moving' | 'idle' | 'doors_open';

export class Elevator {
  id: number;
  currentFloor: number;
  destinationFloors: Set<number>;
  direction: Direction;
  state: ElevatorState;
  element: HTMLElement | null;

  constructor(id: number) {
    this.id = id;
    this.currentFloor = 0;
    this.destinationFloors = new Set();
    this.direction = 'idle';
    this.state = 'idle';
    this.element = null;
  }

  addDestination(floor: number): void {
    if (floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
    }
  }

  getNextDestination(): number | null {
    if (this.destinationFloors.size === 0) {
      return null;
    }

    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);

    if (this.direction === 'up') {
      // Find floors above current floor
      const floorsAbove = destinations.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
      // If no floors above, go to highest floor below
      const floorsBelow = destinations.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
    } else if (this.direction === 'down') {
      // Find floors below current floor
      const floorsBelow = destinations.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
      // If no floors below, go to lowest floor above
      const floorsAbove = destinations.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
    } else {
      // Idle - pick closest floor
      return destinations.reduce((closest, floor) => {
        return Math.abs(floor - this.currentFloor) < Math.abs(closest - this.currentFloor)
          ? floor
          : closest;
      });
    }

    return null;
  }

  move(): void {
    const nextDestination = this.getNextDestination();

    if (nextDestination === null) {
      this.direction = 'idle';
      this.state = 'idle';
      return;
    }

    if (nextDestination > this.currentFloor) {
      this.direction = 'up';
      this.currentFloor++;
    } else if (nextDestination < this.currentFloor) {
      this.direction = 'down';
      this.currentFloor--;
    }

    this.state = 'moving';

    // Check if we've reached a destination
    if (this.destinationFloors.has(this.currentFloor)) {
      this.destinationFloors.delete(this.currentFloor);
      this.state = 'doors_open';

      // If no more destinations in current direction, become idle
      if (this.destinationFloors.size === 0) {
        this.direction = 'idle';
      } else {
        // Check if we need to change direction
        const destinations = Array.from(this.destinationFloors);
        const hasFloorsAbove = destinations.some(f => f > this.currentFloor);
        const hasFloorsBelow = destinations.some(f => f < this.currentFloor);

        if (this.direction === 'up' && !hasFloorsAbove) {
          this.direction = 'down';
        } else if (this.direction === 'down' && !hasFloorsBelow) {
          this.direction = 'up';
        }
      }
    }
  }

  updatePosition(): void {
    if (this.element) {
      const floorHeight = 80; // pixels per floor
      const bottomPosition = this.currentFloor * floorHeight;
      this.element.style.bottom = `${bottomPosition}px`;
    }
  }

  isIdle(): boolean {
    return this.state === 'idle' && this.destinationFloors.size === 0;
  }

  isTravelingToward(floor: number, direction: Direction): boolean {
    if (this.isIdle()) return false;

    if (direction === 'up' && this.direction === 'up' && this.currentFloor <= floor) {
      return true;
    }
    if (direction === 'down' && this.direction === 'down' && this.currentFloor >= floor) {
      return true;
    }
    return false;
  }

  getDistanceToFloor(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }
}
