import { Elevator, Direction } from './Elevator.js';
import { Floor } from './Floor.js';

export interface PendingRequest {
  floor: number;
  direction: Direction;
}

export const NUM_FLOORS = 10;
export const NUM_ELEVATORS = 4;
export const MOVE_INTERVAL = 1000; // ms per floor

export class Building {
  floors: Floor[];
  elevators: Elevator[];
  pendingRequests: PendingRequest[];
  moveIntervalId: number | null;

  constructor() {
    this.floors = [];
    this.elevators = [];
    this.pendingRequests = [];
    this.moveIntervalId = null;

    // Initialize floors
    for (let i = 0; i < NUM_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }

    // Initialize elevators
    for (let i = 0; i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
  }

  requestElevator(floor: number, direction: Direction): void {
    // Mark the button as pressed
    if (direction === 'up') {
      this.floors[floor].pressUpButton();
    } else if (direction === 'down') {
      this.floors[floor].pressDownButton();
    }

    // Try to assign an elevator immediately
    const assigned = this.assignElevator(floor, direction);

    // If no elevator could be assigned, add to pending requests
    if (!assigned) {
      this.pendingRequests.push({ floor, direction });
    }
  }

  assignElevator(floor: number, direction: Direction): boolean {
    // 1. Check for idle elevators - find the closest one
    const idleElevators = this.elevators.filter(e => e.isIdle());
    if (idleElevators.length > 0) {
      const closestIdle = idleElevators.reduce((closest, elevator) => {
        return elevator.getDistanceToFloor(floor) < closest.getDistanceToFloor(floor)
          ? elevator
          : closest;
      });

      closestIdle.addDestination(floor);
      closestIdle.direction = direction;
      return true;
    }

    // 2. Check for elevators traveling in the same direction toward this floor
    const travelingElevators = this.elevators.filter(e =>
      e.isTravelingToward(floor, direction)
    );

    if (travelingElevators.length > 0) {
      const closestTraveling = travelingElevators.reduce((closest, elevator) => {
        return elevator.getDistanceToFloor(floor) < closest.getDistanceToFloor(floor)
          ? elevator
          : closest;
      });

      closestTraveling.addDestination(floor);
      return true;
    }

    // 3. No suitable elevator found
    return false;
  }

  selectFloorInElevator(elevatorId: number, floor: number): void {
    const elevator = this.elevators[elevatorId];
    elevator.addDestination(floor);
  }

  processPendingRequests(): void {
    const remainingRequests: PendingRequest[] = [];

    for (const request of this.pendingRequests) {
      const assigned = this.assignElevator(request.floor, request.direction);
      if (!assigned) {
        remainingRequests.push(request);
      }
    }

    this.pendingRequests = remainingRequests;
  }

  clearFloorButton(floor: number, direction: Direction): void {
    if (direction === 'up') {
      this.floors[floor].clearUpButton();
    } else if (direction === 'down') {
      this.floors[floor].clearDownButton();
    }
  }

  checkArrivals(): void {
    for (const elevator of this.elevators) {
      if (elevator.state === 'doors_open') {
        const floor = elevator.currentFloor;

        // Clear floor buttons if an elevator is going in that direction
        if (elevator.direction === 'up' || this.floors[floor].upButtonPressed) {
          this.clearFloorButton(floor, 'up');
        }
        if (elevator.direction === 'down' || this.floors[floor].downButtonPressed) {
          this.clearFloorButton(floor, 'down');
        }

        // Also clear if elevator is idle (it fulfilled a request)
        if (elevator.direction === 'idle') {
          this.clearFloorButton(floor, 'up');
          this.clearFloorButton(floor, 'down');
        }
      }
    }
  }

  startSimulation(): void {
    this.moveIntervalId = window.setInterval(() => {
      // Move all elevators
      for (const elevator of this.elevators) {
        elevator.move();
        elevator.updatePosition();
      }

      // Check for arrivals and clear buttons
      this.checkArrivals();

      // Process pending requests
      this.processPendingRequests();

      // Update UI
      this.updateElevatorDisplay();
    }, MOVE_INTERVAL);
  }

  stopSimulation(): void {
    if (this.moveIntervalId !== null) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
  }

  updateElevatorDisplay(): void {
    for (const elevator of this.elevators) {
      const elevatorElement = elevator.element;
      if (elevatorElement) {
        const floorDisplay = elevatorElement.querySelector('.elevator-floor');
        const statusDisplay = elevatorElement.querySelector('.elevator-status');
        const destinationsDisplay = elevatorElement.querySelector('.elevator-destinations');

        if (floorDisplay) {
          floorDisplay.textContent = `Floor ${elevator.currentFloor}`;
        }

        if (statusDisplay) {
          let status = '';
          if (elevator.state === 'idle') {
            status = 'Idle';
          } else if (elevator.state === 'doors_open') {
            status = 'Doors Open';
          } else if (elevator.direction === 'up') {
            status = '↑ Going Up';
          } else if (elevator.direction === 'down') {
            status = '↓ Going Down';
          }
          statusDisplay.textContent = status;
        }

        if (destinationsDisplay) {
          const destinations = Array.from(elevator.destinationFloors).sort((a, b) => a - b);
          destinationsDisplay.textContent = destinations.length > 0
            ? `→ ${destinations.join(', ')}`
            : 'No destinations';
        }
      }
    }
  }
}
