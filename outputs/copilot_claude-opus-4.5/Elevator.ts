// Elevator direction enum
export enum Direction {
  IDLE = 'IDLE',
  UP = 'UP',
  DOWN = 'DOWN'
}

// Elevator state enum
export enum ElevatorState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  DOORS_OPEN = 'DOORS_OPEN'
}

export class Elevator {
  public id: number;
  public currentFloor: number;
  public direction: Direction;
  public state: ElevatorState;
  public destinationFloors: Set<number>;
  public element: HTMLElement | null = null;

  constructor(id: number) {
    this.id = id;
    this.currentFloor = 0; // Start at ground floor
    this.direction = Direction.IDLE;
    this.state = ElevatorState.IDLE;
    this.destinationFloors = new Set<number>();
  }

  // Add a destination floor to the elevator
  addDestination(floor: number): void {
    this.destinationFloors.add(floor);
    if (this.state === ElevatorState.IDLE) {
      this.updateDirection();
    }
  }

  // Remove a destination floor (when reached)
  removeDestination(floor: number): void {
    this.destinationFloors.delete(floor);
  }

  // Check if the elevator has a specific destination
  hasDestination(floor: number): boolean {
    return this.destinationFloors.has(floor);
  }

  // Get the next floor the elevator should move to
  getNextFloor(): number | null {
    if (this.destinationFloors.size === 0) {
      return null;
    }

    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);
    
    if (this.direction === Direction.UP) {
      // Find floors above current floor
      const floorsAbove = destinations.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0]; // Return closest floor above
      }
      // No more floors above, check below
      const floorsBelow = destinations.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1]; // Return closest floor below
      }
    } else if (this.direction === Direction.DOWN) {
      // Find floors below current floor
      const floorsBelow = destinations.filter(f => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1]; // Return closest floor below
      }
      // No more floors below, check above
      const floorsAbove = destinations.filter(f => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0]; // Return closest floor above
      }
    } else {
      // IDLE - go to nearest floor
      let nearestFloor = destinations[0];
      let minDistance = Math.abs(this.currentFloor - nearestFloor);
      for (const floor of destinations) {
        const distance = Math.abs(this.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          nearestFloor = floor;
        }
      }
      return nearestFloor;
    }

    return null;
  }

  // Update the direction based on destinations
  updateDirection(): void {
    const nextFloor = this.getNextFloor();
    if (nextFloor === null) {
      this.direction = Direction.IDLE;
      this.state = ElevatorState.IDLE;
    } else if (nextFloor > this.currentFloor) {
      this.direction = Direction.UP;
    } else if (nextFloor < this.currentFloor) {
      this.direction = Direction.DOWN;
    } else {
      // We're at the destination
      this.direction = Direction.IDLE;
    }
  }

  // Check if elevator is moving in the direction of a floor
  isMovingTowards(floor: number): boolean {
    if (this.direction === Direction.UP && floor >= this.currentFloor) {
      return true;
    }
    if (this.direction === Direction.DOWN && floor <= this.currentFloor) {
      return true;
    }
    return false;
  }

  // Calculate distance to a floor
  distanceTo(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  // Check if elevator is idle
  isIdle(): boolean {
    return this.state === ElevatorState.IDLE && this.direction === Direction.IDLE;
  }

  // Move elevator one floor in current direction
  moveOneFloor(): void {
    if (this.direction === Direction.UP) {
      this.currentFloor++;
    } else if (this.direction === Direction.DOWN) {
      this.currentFloor--;
    }
    this.updateElement();
  }

  // Update the DOM element position
  updateElement(): void {
    if (this.element) {
      // Each floor is 60px, elevator is 50px, so offset by 5px to center
      const bottomOffset = this.currentFloor * 60 + 5;
      this.element.style.bottom = `${bottomOffset}px`;
      this.element.setAttribute('data-floor', this.currentFloor.toString());
    }
  }

  // Set the DOM element for this elevator
  setElement(element: HTMLElement): void {
    this.element = element;
    this.updateElement();
  }

  // Open doors
  openDoors(): void {
    this.state = ElevatorState.DOORS_OPEN;
    if (this.element) {
      this.element.classList.add('doors-open');
    }
  }

  // Close doors
  closeDoors(): void {
    this.state = this.destinationFloors.size > 0 ? ElevatorState.MOVING : ElevatorState.IDLE;
    if (this.element) {
      this.element.classList.remove('doors-open');
    }
  }
}
