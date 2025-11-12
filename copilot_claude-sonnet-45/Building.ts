import { Elevator, ElevatorDirection, ElevatorState } from './Elevator.js';
import { Floor, RequestDirection } from './Floor.js';

export interface ElevatorRequest {
  floor: number;
  direction: RequestDirection;
}

export interface Config {
  totalFloors: number;
  totalElevators: number;
  floorTravelTime: number; // milliseconds per floor
  doorOpenTime: number; // milliseconds doors stay open
}

export class Building {
  config: Config;
  floors: Floor[];
  elevators: Elevator[];
  requestQueue: ElevatorRequest[];
  private animationIntervalId: number | null = null;

  constructor(config: Config) {
    this.config = config;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];

    // Initialize floors
    for (let i = 0; i < config.totalFloors; i++) {
      this.floors.push(new Floor(i, config.totalFloors));
    }

    // Initialize elevators (all start at floor 0)
    for (let i = 0; i < config.totalElevators; i++) {
      this.elevators.push(new Elevator(i, 0));
    }
  }

  requestElevator(floor: number, direction: RequestDirection): void {
    const floorObj = this.floors[floor];
    
    if (direction === RequestDirection.UP) {
      if (floorObj.upButtonPressed) return; // Already requested
      floorObj.pressUpButton();
    } else {
      if (floorObj.downButtonPressed) return; // Already requested
      floorObj.pressDownButton();
    }

    // Try to assign to an elevator immediately
    const elevator = this.findBestElevator(floor, direction);
    if (elevator) {
      this.assignElevatorToRequest(elevator, floor, direction);
    } else {
      // Queue the request
      this.requestQueue.push({ floor, direction });
    }
  }

  selectFloor(elevatorId: number, floor: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator) return;

    elevator.addDestination(floor);
    this.updateElevatorButtonVisuals(elevatorId);

    if (elevator.state === ElevatorState.IDLE) {
      elevator.updateDirection();
      this.startElevatorMovement(elevator);
    }
  }

  findBestElevator(floor: number, direction: RequestDirection): Elevator | null {
    // Priority 1: Idle elevators
    const idleElevators = this.elevators.filter(e => e.state === ElevatorState.IDLE);
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, curr) =>
        Math.abs(curr.currentFloor - floor) < Math.abs(closest.currentFloor - floor) ? curr : closest
      );
    }

    // Priority 2: Moving elevators going in the same direction and can pick up
    const suitableElevators = this.elevators.filter(e => {
      if (e.state !== ElevatorState.MOVING) return false;

      if (direction === RequestDirection.UP && e.direction === ElevatorDirection.UP) {
        return e.currentFloor <= floor;
      } else if (direction === RequestDirection.DOWN && e.direction === ElevatorDirection.DOWN) {
        return e.currentFloor >= floor;
      }
      return false;
    });

    if (suitableElevators.length > 0) {
      return suitableElevators.reduce((closest, curr) =>
        Math.abs(curr.currentFloor - floor) < Math.abs(closest.currentFloor - floor) ? curr : closest
      );
    }

    // No suitable elevator found
    return null;
  }

  assignElevatorToRequest(elevator: Elevator, floor: number, direction: RequestDirection): void {
    elevator.addDestination(floor);
    
    if (elevator.state === ElevatorState.IDLE) {
      elevator.updateDirection();
      this.startElevatorMovement(elevator);
    }
  }

  startElevatorMovement(elevator: Elevator): void {
    if (elevator.state === ElevatorState.MOVING) return;

    elevator.state = ElevatorState.MOVING;
    elevator.updateVisualState();
    this.moveElevator(elevator);
  }

  async moveElevator(elevator: Elevator): Promise<void> {
    while (elevator.hasDestinations()) {
      const nextFloor = elevator.getNextDestination();
      
      if (nextFloor === null) break;

      // Move towards the next floor
      while (elevator.currentFloor !== nextFloor) {
        await this.sleep(this.config.floorTravelTime);
        elevator.moveToNextFloor();
      }

      // Arrived at floor
      elevator.state = ElevatorState.STOPPED;
      elevator.updateVisualState();

      // Clear the destination
      elevator.removeDestination(nextFloor);
      this.updateElevatorButtonVisuals(elevator.id);

      // Clear floor button if it matches the direction
      const floor = this.floors[nextFloor];
      if (elevator.direction === ElevatorDirection.UP && floor.upButtonPressed) {
        floor.clearUpButton();
      } else if (elevator.direction === ElevatorDirection.DOWN && floor.downButtonPressed) {
        floor.clearDownButton();
      } else if (elevator.direction === ElevatorDirection.IDLE) {
        // Clear both buttons if elevator was idle
        if (floor.upButtonPressed) floor.clearUpButton();
        if (floor.downButtonPressed) floor.clearDownButton();
      }

      // Wait for doors to open/close
      await this.sleep(this.config.doorOpenTime);

      // Update direction for next move
      elevator.updateDirection();

      // Check if we should continue moving
      if (elevator.hasDestinations()) {
        elevator.state = ElevatorState.MOVING;
        elevator.updateVisualState();
      }
    }

    // No more destinations
    elevator.state = ElevatorState.IDLE;
    elevator.direction = ElevatorDirection.IDLE;
    elevator.updateVisualState();

    // Process queued requests
    this.processQueue();
  }

  processQueue(): void {
    if (this.requestQueue.length === 0) return;

    const processedIndices: number[] = [];

    for (let i = 0; i < this.requestQueue.length; i++) {
      const request = this.requestQueue[i];
      const elevator = this.findBestElevator(request.floor, request.direction);

      if (elevator) {
        this.assignElevatorToRequest(elevator, request.floor, request.direction);
        processedIndices.push(i);
      }
    }

    // Remove processed requests
    this.requestQueue = this.requestQueue.filter((_, index) => !processedIndices.includes(index));
  }

  updateElevatorButtonVisuals(elevatorId: number): void {
    const elevator = this.elevators[elevatorId];
    const panel = document.querySelector(`#elevator-${elevatorId}-panel`);
    
    if (panel) {
      const buttons = panel.querySelectorAll('.floor-button');
      buttons.forEach((button) => {
        const floor = parseInt(button.getAttribute('data-floor') || '0');
        if (elevator.destinationFloors.has(floor)) {
          button.classList.add('selected');
        } else {
          button.classList.remove('selected');
        }
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus(): string {
    let status = 'Elevator Status:\n';
    this.elevators.forEach(e => {
      status += `Elevator ${e.id}: Floor ${e.currentFloor}, ${e.direction}, ${e.state}\n`;
    });
    return status;
  }
}
