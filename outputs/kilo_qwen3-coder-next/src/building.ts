import { Elevator, ElevatorDirection } from './elevator';
import { Floor, RequestDirection } from './floor';

export interface BuildingConfig {
  totalFloors: number;
  numElevators: number;
  elevatorSpeed: number;
}

export class Building {
  public totalFloors: number;
  public numElevators: number;
  public floors: Floor[];
  public elevators: Elevator[];
  public config: BuildingConfig;
  public requestQueue: Array<{ floor: number; direction: RequestDirection }>;

  constructor(config: BuildingConfig) {
    this.config = config;
    this.totalFloors = config.totalFloors;
    this.numElevators = config.numElevators;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];

    // Initialize floors
    for (let i = 0; i < this.totalFloors; i++) {
      this.floors.push(new Floor(i, this.totalFloors));
    }

    // Initialize elevators
    for (let i = 0; i < this.numElevators; i++) {
      this.elevators.push(new Elevator(i, this.totalFloors, config.elevatorSpeed));
    }
  }

  public requestElevator(floor: number, direction: RequestDirection): void {
    // Check if any elevator can serve this request immediately
    let bestElevator: Elevator | null = null;
    let minDistance = Infinity;

    for (const elevator of this.elevators) {
      if (elevator.direction === 'idle') {
        const distance = Math.abs(elevator.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      } else if (elevator.direction === direction) {
        // Elevator is moving in the same direction
        if (direction === 'up' && elevator.currentFloor <= floor) {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        } else if (direction === 'down' && elevator.currentFloor >= floor) {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }
    }

    if (bestElevator) {
      bestElevator.requestFloor(floor);
    } else {
      // Queue the request
      this.requestQueue.push({ floor, direction });
    }

    // Update floor button state
    const floorObj = this.floors[floor];
    if (direction === 'up') {
      floorObj.pressUpButton();
    } else {
      floorObj.pressDownButton();
    }
  }

  public selectDestination(elevatorId: number, floor: number): void {
    const elevator = this.elevators[elevatorId];
    if (elevator) {
      elevator.requestFloor(floor);
    }
  }

  public step(): void {
    // Process all elevators
    for (const elevator of this.elevators) {
      elevator.step();
    }

    // Check for completed floor requests and update buttons
    for (const floor of this.floors) {
      const hasUpRequest = this.elevators.some(e => 
        e.destinationFloors.has(floor.floorNumber) && e.direction === 'up'
      );
      const hasDownRequest = this.elevators.some(e => 
        e.destinationFloors.has(floor.floorNumber) && e.direction === 'down'
      );

      if (!hasUpRequest && !hasDownRequest) {
        floor.resetButtons();
      }
    }

    // Process queued requests
    this.processQueue();
  }

  private processQueue(): void {
    // Try to assign queued requests to idle elevators
    for (let i = this.requestQueue.length - 1; i >= 0; i--) {
      const { floor, direction } = this.requestQueue[i];
      let assigned = false;

      // Find an idle elevator closest to the request
      let bestElevator: Elevator | null = null;
      let minDistance = Infinity;

      for (const elevator of this.elevators) {
        if (elevator.direction === 'idle') {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }

      if (bestElevator) {
        bestElevator.requestFloor(floor);
        this.requestQueue.splice(i, 1);
        assigned = true;
      }

      if (assigned) {
        // Update floor button state
        const floorObj = this.floors[floor];
        if (direction === 'up') {
          floorObj.pressUpButton();
        } else {
          floorObj.pressDownButton();
        }
      }
    }
  }

  public getElevatorState(id: number): any {
    const elevator = this.elevators[id];
    if (!elevator) return null;
    return {
      id: elevator.id,
      currentFloor: elevator.currentFloor,
      direction: elevator.direction,
      destinationFloors: Array.from(elevator.destinationFloors),
      isIdle: elevator.isIdle,
      isMoving: elevator.isMoving,
      targetFloor: elevator.targetFloor
    };
  }

  public getFloorState(floorNumber: number): any {
    const floor = this.floors[floorNumber];
    if (!floor) return null;
    return {
      floorNumber: floor.floorNumber,
      upButtonPressed: floor.upButtonPressed,
      downButtonPressed: floor.downButtonPressed
    };
  }
}
