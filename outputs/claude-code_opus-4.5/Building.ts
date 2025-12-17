import { Elevator } from './Elevator';
import { Floor } from './Floor';
import { Direction, ElevatorState, FloorRequest, CONFIG } from './types';

export class Building {
  public elevators: Elevator[] = [];
  public floors: Floor[] = [];
  private pendingRequests: FloorRequest[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.initializeFloors();
    this.initializeElevators();
  }

  private initializeFloors(): void {
    for (let i = 0; i < CONFIG.NUM_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
  }

  private initializeElevators(): void {
    for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
  }

  requestElevator(floor: number, direction: Direction.UP | Direction.DOWN): void {
    const floorObj = this.floors[floor];

    // Don't add duplicate requests
    if (floorObj.isButtonActive(direction)) {
      return;
    }

    // Activate the button
    if (direction === Direction.UP) {
      floorObj.activateUpButton();
    } else {
      floorObj.activateDownButton();
    }

    // Find best elevator
    const bestElevator = this.findBestElevator(floor, direction);

    if (bestElevator) {
      bestElevator.addDestination(floor);
      this.processElevator(bestElevator);
    } else {
      // Queue the request
      this.pendingRequests.push({
        floor,
        direction,
        timestamp: Date.now()
      });
    }
  }

  selectFloorInElevator(elevatorId: number, targetFloor: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator) return;

    elevator.addDestination(targetFloor);
    this.processElevator(elevator);
  }

  private findBestElevator(floor: number, direction: Direction.UP | Direction.DOWN): Elevator | null {
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      // Skip elevators with doors open
      if (elevator.state === ElevatorState.DOORS_OPEN) continue;

      const distance = elevator.distanceToFloor(floor);

      if (elevator.isIdle()) {
        // Idle elevators are preferred, score by distance
        if (distance < bestScore) {
          bestScore = distance;
          bestElevator = elevator;
        }
      } else if (elevator.canServeRequest(floor, direction)) {
        // Moving elevator that can serve on the way
        // Add penalty to prefer idle elevators when close
        const score = distance + 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }
    }

    return bestElevator;
  }

  private async processElevator(elevator: Elevator): Promise<void> {
    // Prevent multiple concurrent processing of the same elevator
    if (elevator.state === ElevatorState.MOVING || elevator.state === ElevatorState.DOORS_OPEN) {
      return;
    }

    elevator.updateDirection();

    if (elevator.direction === Direction.IDLE) {
      elevator.state = ElevatorState.IDLE;
      elevator.updateStateDisplay();
      this.processPendingRequests();
      return;
    }

    const nextFloor = elevator.getNextDestination();
    if (nextFloor === null) {
      elevator.direction = Direction.IDLE;
      elevator.state = ElevatorState.IDLE;
      elevator.updateStateDisplay();
      this.processPendingRequests();
      return;
    }

    // Move to next floor
    await this.moveElevatorToFloor(elevator, nextFloor);
  }

  private async moveElevatorToFloor(elevator: Elevator, targetFloor: number): Promise<void> {
    elevator.state = ElevatorState.MOVING;
    elevator.updateDirection();
    elevator.updateStateDisplay();

    while (elevator.currentFloor !== targetFloor) {
      // Move one floor at a time
      await this.delay(CONFIG.FLOOR_TRAVEL_TIME);

      if (elevator.direction === Direction.UP) {
        elevator.currentFloor++;
      } else {
        elevator.currentFloor--;
      }

      elevator.updateVisualPosition();
      elevator.updateStateDisplay();

      // Check if we should stop at this floor
      if (elevator.destinationFloors.has(elevator.currentFloor)) {
        await this.stopAtFloor(elevator);
      }
    }

    // Final stop if we haven't stopped already
    if (elevator.destinationFloors.has(elevator.currentFloor)) {
      await this.stopAtFloor(elevator);
    }

    // Continue processing remaining destinations
    elevator.updateDirection();
    if (elevator.hasDestinations()) {
      await this.processElevator(elevator);
    } else {
      elevator.state = ElevatorState.IDLE;
      elevator.direction = Direction.IDLE;
      elevator.updateStateDisplay();
      this.processPendingRequests();
    }
  }

  private async stopAtFloor(elevator: Elevator): Promise<void> {
    elevator.state = ElevatorState.DOORS_OPEN;
    elevator.removeDestination(elevator.currentFloor);
    elevator.updateStateDisplay();

    // Deactivate floor buttons
    const floor = this.floors[elevator.currentFloor];
    if (elevator.direction === Direction.UP || elevator.direction === Direction.IDLE) {
      floor.deactivateUpButton();
    }
    if (elevator.direction === Direction.DOWN || elevator.direction === Direction.IDLE) {
      floor.deactivateDownButton();
    }

    // Wait for doors
    await this.delay(CONFIG.DOOR_OPEN_TIME);

    elevator.state = ElevatorState.MOVING;
    elevator.updateStateDisplay();
  }

  private processPendingRequests(): void {
    if (this.pendingRequests.length === 0) return;

    const remainingRequests: FloorRequest[] = [];

    for (const request of this.pendingRequests) {
      const bestElevator = this.findBestElevator(request.floor, request.direction);

      if (bestElevator) {
        bestElevator.addDestination(request.floor);
        this.processElevator(bestElevator);
      } else {
        remainingRequests.push(request);
      }
    }

    this.pendingRequests = remainingRequests;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
