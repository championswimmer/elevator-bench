import { Elevator, type Direction } from './Elevator';
import { Floor, type FloorRequest } from './Floor';

export class Building {
  totalFloors: number;
  totalElevators: number;
  floors: Floor[];
  elevators: Elevator[];
  pendingRequests: FloorRequest[];
  private tickInterval: number | null = null;
  private onUpdate: (() => void) | null = null;

  // Timing constants (ms)
  static readonly FLOOR_TRAVEL_TIME = 600;
  static readonly DOOR_OPEN_TIME = 1200;
  static readonly TICK_INTERVAL = 100;

  constructor(totalFloors: number = 10, totalElevators: number = 4) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.pendingRequests = [];

    for (let i = 0; i < totalFloors; i++) {
      this.floors.push(new Floor(i, totalFloors));
    }

    for (let i = 0; i < totalElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
  }

  setUpdateCallback(callback: () => void): void {
    this.onUpdate = callback;
  }

  private triggerUpdate(): void {
    if (this.onUpdate) this.onUpdate();
  }

  /**
   * Request elevator from a floor (hall call)
   */
  requestFromFloor(floorNum: number, direction: 'up' | 'down'): void {
    const floor = this.floors[floorNum];
    if (!floor) return;

    if (direction === 'up' && !floor.requestUp()) return;
    if (direction === 'down' && !floor.requestDown()) return;

    // Try to find the best elevator
    const assigned = this.assignElevator(floorNum, direction);

    if (!assigned) {
      // Queue the request
      this.pendingRequests.push({
        floor: floorNum,
        direction,
        timestamp: Date.now()
      });
    }

    this.triggerUpdate();
  }

  /**
   * Select a floor from inside an elevator (car call)
   */
  selectFloorInElevator(elevatorId: number, floorNum: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator || floorNum < 0 || floorNum >= this.totalFloors) return;
    if (floorNum === elevator.currentFloor && !elevator.moving) return;

    elevator.addDestination(floorNum);

    if (elevator.direction === 'idle') {
      elevator.direction = floorNum > elevator.currentFloor ? 'up' : 'down';
      this.startElevatorMovement(elevator);
    }

    this.triggerUpdate();
  }

  /**
   * Find and assign the best elevator for a floor request
   */
  private assignElevator(floor: number, direction: 'up' | 'down'): boolean {
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      // Score: prefer idle elevators, then same-direction, then closest
      let score: number;

      if (elevator.isIdle) {
        score = Math.abs(elevator.currentFloor - floor);
      } else if (
        (elevator.direction === 'up' && direction === 'up' && elevator.currentFloor <= floor) ||
        (elevator.direction === 'down' && direction === 'down' && elevator.currentFloor >= floor)
      ) {
        // Same direction and can pick up on the way
        score = Math.abs(elevator.currentFloor - floor) + 0.5; // slight penalty vs idle
      } else {
        // Different direction or passed the floor
        score = elevator.distanceTo(floor, this.totalFloors) + this.totalFloors;
      }

      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }

    if (bestElevator) {
      bestElevator.addDestination(floor);
      if (bestElevator.direction === 'idle') {
        bestElevator.direction = floor > bestElevator.currentFloor ? 'up' : 
                                  floor < bestElevator.currentFloor ? 'down' : 'idle';
        if (bestElevator.direction !== 'idle') {
          this.startElevatorMovement(bestElevator);
        }
      }
      return true;
    }

    return false;
  }

  /**
   * Start the movement loop for an elevator
   */
  private startElevatorMovement(elevator: Elevator): void {
    if (elevator.moving) return;

    const moveStep = () => {
      const nextFloor = elevator.getNextFloor(this.totalFloors);

      if (nextFloor === null) {
        elevator.direction = 'idle';
        elevator.moving = false;
        this.processPendingRequests();
        this.triggerUpdate();
        return;
      }

      elevator.moving = true;
      const direction = nextFloor > elevator.currentFloor ? 1 : -1;
      elevator.direction = direction > 0 ? 'up' : 'down';

      const moveOneFloor = () => {
        elevator.currentFloor += direction;
        this.triggerUpdate();

        // Check if we should stop at this floor
        if (this.shouldStopAtFloor(elevator, elevator.currentFloor)) {
          this.arriveAtFloor(elevator, elevator.currentFloor);
          // After door animation, continue
          setTimeout(() => {
            elevator.doorOpen = false;
            this.triggerUpdate();
            // Check for more destinations
            const next = elevator.getNextFloor(this.totalFloors);
            if (next !== null) {
              setTimeout(moveStep, 200);
            } else {
              elevator.direction = 'idle';
              elevator.moving = false;
              this.processPendingRequests();
              this.triggerUpdate();
            }
          }, Building.DOOR_OPEN_TIME);
        } else if (elevator.currentFloor !== nextFloor) {
          // Keep moving
          setTimeout(moveOneFloor, Building.FLOOR_TRAVEL_TIME);
        } else {
          // Reached target - shouldn't normally get here due to shouldStopAtFloor
          this.arriveAtFloor(elevator, elevator.currentFloor);
          setTimeout(() => {
            elevator.doorOpen = false;
            this.triggerUpdate();
            const next = elevator.getNextFloor(this.totalFloors);
            if (next !== null) {
              setTimeout(moveStep, 200);
            } else {
              elevator.direction = 'idle';
              elevator.moving = false;
              this.processPendingRequests();
              this.triggerUpdate();
            }
          }, Building.DOOR_OPEN_TIME);
        }
      };

      setTimeout(moveOneFloor, Building.FLOOR_TRAVEL_TIME);
    };

    moveStep();
  }

  /**
   * Check if elevator should stop at a floor (destination or matching hall call)
   */
  private shouldStopAtFloor(elevator: Elevator, floor: number): boolean {
    // Direct destination
    if (elevator.hasDestination(floor)) return true;

    // Hall call in same direction
    const floorObj = this.floors[floor];
    if (elevator.direction === 'up' && floorObj.upRequested) return true;
    if (elevator.direction === 'down' && floorObj.downRequested) return true;

    // At top or bottom, pick up opposite direction
    if (floor === this.totalFloors - 1 && floorObj.downRequested) return true;
    if (floor === 0 && floorObj.upRequested) return true;

    return false;
  }

  /**
   * Handle elevator arriving at a floor
   */
  private arriveAtFloor(elevator: Elevator, floor: number): void {
    elevator.doorOpen = true;
    elevator.removeDestination(floor);

    const floorObj = this.floors[floor];

    // Clear matching hall calls
    if (elevator.direction === 'up' || floor === 0) {
      if (floorObj.upRequested) {
        floorObj.clearUp();
        this.removePendingRequest(floor, 'up');
      }
    }
    if (elevator.direction === 'down' || floor === this.totalFloors - 1) {
      if (floorObj.downRequested) {
        floorObj.clearDown();
        this.removePendingRequest(floor, 'down');
      }
    }

    this.triggerUpdate();
  }

  /**
   * Remove a pending request
   */
  private removePendingRequest(floor: number, direction: 'up' | 'down'): void {
    this.pendingRequests = this.pendingRequests.filter(
      r => !(r.floor === floor && r.direction === direction)
    );
  }

  /**
   * Process queued requests when an elevator becomes idle
   */
  private processPendingRequests(): void {
    const remaining: FloorRequest[] = [];

    for (const request of this.pendingRequests) {
      const floor = this.floors[request.floor];
      const isStillActive = request.direction === 'up' ? floor.upRequested : floor.downRequested;

      if (isStillActive) {
        const assigned = this.assignElevator(request.floor, request.direction);
        if (!assigned) {
          remaining.push(request);
        }
      }
    }

    this.pendingRequests = remaining;
  }
}
