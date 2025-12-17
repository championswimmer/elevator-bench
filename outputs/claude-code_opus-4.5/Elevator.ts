import { Direction, ElevatorState, CONFIG } from './types';

export class Elevator {
  public id: number;
  public currentFloor: number;
  public direction: Direction;
  public state: ElevatorState;
  public destinationFloors: Set<number>;
  private element: HTMLElement | null = null;
  private floorButtonElements: Map<number, HTMLElement> = new Map();

  constructor(id: number) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = Direction.IDLE;
    this.state = ElevatorState.IDLE;
    this.destinationFloors = new Set();
  }

  setElement(element: HTMLElement): void {
    this.element = element;
  }

  setFloorButtonElement(floor: number, element: HTMLElement): void {
    this.floorButtonElements.set(floor, element);
  }

  addDestination(floor: number): void {
    if (floor >= 0 && floor < CONFIG.NUM_FLOORS && floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
      this.updateFloorButtonState(floor, true);
    }
  }

  removeDestination(floor: number): void {
    this.destinationFloors.delete(floor);
    this.updateFloorButtonState(floor, false);
  }

  private updateFloorButtonState(floor: number, active: boolean): void {
    const button = this.floorButtonElements.get(floor);
    if (button) {
      if (active) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
  }

  hasDestinations(): boolean {
    return this.destinationFloors.size > 0;
  }

  getNextDestination(): number | null {
    if (!this.hasDestinations()) return null;

    const floors = Array.from(this.destinationFloors);

    if (this.direction === Direction.UP) {
      // Get floors above current floor, sorted ascending
      const floorsAbove = floors.filter(f => f > this.currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0) return floorsAbove[0];

      // No more floors above, check below
      const floorsBelow = floors.filter(f => f < this.currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0) return floorsBelow[0];
    } else if (this.direction === Direction.DOWN) {
      // Get floors below current floor, sorted descending
      const floorsBelow = floors.filter(f => f < this.currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0) return floorsBelow[0];

      // No more floors below, check above
      const floorsAbove = floors.filter(f => f > this.currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0) return floorsAbove[0];
    } else {
      // IDLE - go to closest floor
      floors.sort((a, b) => Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor));
      return floors[0];
    }

    return null;
  }

  updateDirection(): void {
    const nextDest = this.getNextDestination();
    if (nextDest === null) {
      this.direction = Direction.IDLE;
    } else if (nextDest > this.currentFloor) {
      this.direction = Direction.UP;
    } else if (nextDest < this.currentFloor) {
      this.direction = Direction.DOWN;
    }
  }

  isIdle(): boolean {
    return this.state === ElevatorState.IDLE && this.direction === Direction.IDLE;
  }

  distanceToFloor(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  canServeRequest(floor: number, requestDirection: Direction): boolean {
    // If idle, can serve any request
    if (this.isIdle()) return true;

    // If moving, check if the floor is on the way
    if (this.direction === Direction.UP) {
      // Can serve if floor is above and request is UP, or floor is above current
      if (floor >= this.currentFloor && requestDirection === Direction.UP) return true;
    } else if (this.direction === Direction.DOWN) {
      // Can serve if floor is below and request is DOWN, or floor is below current
      if (floor <= this.currentFloor && requestDirection === Direction.DOWN) return true;
    }

    return false;
  }

  updateVisualPosition(): void {
    if (this.element) {
      const bottomPosition = this.currentFloor * 80; // 80px per floor
      this.element.style.bottom = `${bottomPosition}px`;
    }
  }

  updateStateDisplay(): void {
    if (this.element) {
      const stateIndicator = this.element.querySelector('.elevator-state');
      if (stateIndicator) {
        let symbol = '●';
        if (this.direction === Direction.UP) symbol = '▲';
        else if (this.direction === Direction.DOWN) symbol = '▼';
        stateIndicator.textContent = symbol;
      }

      const floorDisplay = this.element.querySelector('.elevator-floor');
      if (floorDisplay) {
        floorDisplay.textContent = this.currentFloor.toString();
      }

      // Update elevator visual state
      this.element.classList.remove('idle', 'moving', 'doors-open');
      if (this.state === ElevatorState.IDLE) {
        this.element.classList.add('idle');
      } else if (this.state === ElevatorState.MOVING) {
        this.element.classList.add('moving');
      } else if (this.state === ElevatorState.DOORS_OPEN) {
        this.element.classList.add('doors-open');
      }
    }
  }
}
