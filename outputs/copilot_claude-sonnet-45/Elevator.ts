export enum ElevatorDirection {
  IDLE = "IDLE",
  UP = "UP",
  DOWN = "DOWN"
}

export enum ElevatorState {
  IDLE = "IDLE",
  MOVING = "MOVING",
  STOPPED = "STOPPED"
}

export class Elevator {
  id: number;
  currentFloor: number;
  direction: ElevatorDirection;
  state: ElevatorState;
  destinationFloors: Set<number>;
  private element: HTMLElement | null = null;

  constructor(id: number, startFloor: number = 0) {
    this.id = id;
    this.currentFloor = startFloor;
    this.direction = ElevatorDirection.IDLE;
    this.state = ElevatorState.IDLE;
    this.destinationFloors = new Set<number>();
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  addDestination(floor: number): void {
    this.destinationFloors.add(floor);
  }

  removeDestination(floor: number): void {
    this.destinationFloors.delete(floor);
  }

  hasDestinations(): boolean {
    return this.destinationFloors.size > 0;
  }

  getNextDestination(): number | null {
    if (this.destinationFloors.size === 0) return null;

    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);

    if (this.direction === ElevatorDirection.UP) {
      // Find the closest floor above or at current floor
      const upDestinations = destinations.filter(f => f >= this.currentFloor);
      if (upDestinations.length > 0) {
        return upDestinations[0];
      }
      // If no floors above, change direction
      return destinations[destinations.length - 1];
    } else if (this.direction === ElevatorDirection.DOWN) {
      // Find the closest floor below or at current floor
      const downDestinations = destinations.filter(f => f <= this.currentFloor).reverse();
      if (downDestinations.length > 0) {
        return downDestinations[0];
      }
      // If no floors below, change direction
      return destinations[0];
    } else {
      // IDLE - go to closest floor
      return destinations.reduce((prev, curr) =>
        Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev
      );
    }
  }

  shouldChangeDirection(): boolean {
    if (this.destinationFloors.size === 0) return true;

    const destinations = Array.from(this.destinationFloors);

    if (this.direction === ElevatorDirection.UP) {
      return !destinations.some(f => f > this.currentFloor);
    } else if (this.direction === ElevatorDirection.DOWN) {
      return !destinations.some(f => f < this.currentFloor);
    }

    return false;
  }

  updateDirection(): void {
    if (this.destinationFloors.size === 0) {
      this.direction = ElevatorDirection.IDLE;
      return;
    }

    const nextFloor = this.getNextDestination();
    if (nextFloor === null) {
      this.direction = ElevatorDirection.IDLE;
    } else if (nextFloor > this.currentFloor) {
      this.direction = ElevatorDirection.UP;
    } else if (nextFloor < this.currentFloor) {
      this.direction = ElevatorDirection.DOWN;
    } else {
      // At destination, check if there are more destinations
      if (this.shouldChangeDirection()) {
        // Check remaining destinations
        const destinations = Array.from(this.destinationFloors);
        const hasAbove = destinations.some(f => f > this.currentFloor);
        const hasBelow = destinations.some(f => f < this.currentFloor);

        if (hasAbove && !hasBelow) {
          this.direction = ElevatorDirection.UP;
        } else if (hasBelow && !hasAbove) {
          this.direction = ElevatorDirection.DOWN;
        }
      }
    }
  }

  moveToNextFloor(): void {
    if (this.direction === ElevatorDirection.UP) {
      this.currentFloor++;
    } else if (this.direction === ElevatorDirection.DOWN) {
      this.currentFloor--;
    }
    this.updateVisualPosition();
  }

  updateVisualPosition(): void {
    if (this.element) {
      this.element.style.bottom = `${this.currentFloor * 80 + 10}px`;
      this.element.setAttribute('data-floor', this.currentFloor.toString());
    }
  }

  updateVisualState(): void {
    if (this.element) {
      this.element.setAttribute('data-state', this.state);
      this.element.setAttribute('data-direction', this.direction);
      
      const directionIndicator = this.element.querySelector('.elevator-direction');
      if (directionIndicator) {
        if (this.direction === ElevatorDirection.UP) {
          directionIndicator.textContent = '↑';
        } else if (this.direction === ElevatorDirection.DOWN) {
          directionIndicator.textContent = '↓';
        } else {
          directionIndicator.textContent = '•';
        }
      }

      const floorDisplay = this.element.querySelector('.elevator-floor');
      if (floorDisplay) {
        floorDisplay.textContent = this.currentFloor.toString();
      }
    }
  }
}
