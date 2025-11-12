import { DEFAULT_BUILDING_OPTIONS } from './constants.ts';
import { Elevator } from './elevator.ts';
import { Floor } from './floor.ts';
import type {
  BuildingOptions,
  FloorRequest,
  TravelDirection,
} from './types.ts';

export class Building {
  private readonly options: BuildingOptions;
  private readonly floors: Floor[] = [];
  private readonly elevators: Elevator[] = [];
  private readonly pendingRequests: FloorRequest[] = [];

  private readonly floorsColumn: HTMLDivElement;
  private readonly shaftArea: HTMLDivElement;
  private readonly panelArea: HTMLDivElement;
  private readonly pendingIndicator: HTMLSpanElement;

  private dispatchTimer: number | null = null;

  constructor(private readonly root: HTMLElement, options?: Partial<BuildingOptions>) {
    this.options = { ...DEFAULT_BUILDING_OPTIONS, ...options };

    this.root.classList.add('simulator-grid');
  this.root.style.setProperty('--floor-height', `${this.options.floorHeight}px`);
  this.root.style.setProperty('--floor-count', String(this.options.totalFloors));

    const visualArea = document.createElement('div');
    visualArea.className = 'visual-area';

    this.floorsColumn = document.createElement('div');
    this.floorsColumn.className = 'floors-column';
    visualArea.appendChild(this.floorsColumn);

    this.shaftArea = document.createElement('div');
    this.shaftArea.className = 'shaft-area';
    visualArea.appendChild(this.shaftArea);

    this.panelArea = document.createElement('div');
    this.panelArea.className = 'panels-column';

    const pendingWrap = document.createElement('div');
    pendingWrap.className = 'pending-summary';
    const pendingLabel = document.createElement('span');
    pendingLabel.textContent = 'Waiting requests:';
    this.pendingIndicator = document.createElement('span');
    this.pendingIndicator.className = 'pending-count';
    this.pendingIndicator.textContent = '0';
    pendingWrap.append(pendingLabel, this.pendingIndicator);
    this.panelArea.appendChild(pendingWrap);

    this.root.append(visualArea, this.panelArea);

    this.bootstrapFloors();
    this.bootstrapElevators();
    this.updatePendingCount();

    this.dispatchTimer = window.setInterval(() => {
      this.dispatchRequests();
    }, this.options.pendingRequestInterval);
  }

  requestElevator(floor: number, direction: TravelDirection): void {
    if (this.hasOpenRequest(floor, direction)) {
      return;
    }

    const request: FloorRequest = {
      floor,
      direction,
      timestamp: Date.now(),
      status: 'waiting',
    };

    this.pendingRequests.push(request);
    this.dispatchRequests();
    this.updatePendingCount();
  }

  private bootstrapFloors(): void {
    for (let floor = this.options.totalFloors - 1; floor >= 0; floor -= 1) {
      const floorInstance = new Floor({
        floorNumber: floor,
        totalFloors: this.options.totalFloors,
        container: this.floorsColumn,
        onRequest: (direction) => this.requestElevator(floor, direction),
      });
      this.floors[floor] = floorInstance;
    }
  }

  private bootstrapElevators(): void {
    for (let id = 0; id < this.options.elevatorCount; id += 1) {
      const elevator = new Elevator({
        id,
        totalFloors: this.options.totalFloors,
        floorHeight: this.options.floorHeight,
        secondsPerFloor: this.options.secondsPerFloor,
        doorHoldSeconds: this.options.doorHoldSeconds,
        shaftContainer: this.shaftArea,
        panelContainer: this.panelArea,
        onIdle: (instance) => this.handleElevatorIdle(instance),
        onArrival: (floor, instance, direction) =>
          this.handleElevatorArrival(instance, floor, direction),
      });

      this.elevators.push(elevator);
    }
  }

  private handleElevatorIdle(_elevator: Elevator): void {
    this.dispatchRequests();
  }

  private handleElevatorArrival(
    elevator: Elevator,
    floor: number,
    direction: TravelDirection,
  ): void {
    const match = this.pendingRequests.find(
      (request) =>
        request.floor === floor &&
        request.direction === direction &&
        request.status === 'assigned' &&
        request.assignedTo === elevator.id,
    );

    if (match) {
      match.status = 'served';
      this.floors[floor]?.markPending(direction, false);
      this.cleanupRequests();
    }

    this.updatePendingCount();
  }

  private dispatchRequests(): void {
    for (const request of this.pendingRequests) {
      if (request.status !== 'waiting') continue;

      const elevator = this.pickElevator(request.floor, request.direction);
      if (!elevator) {
        continue;
      }

      request.status = 'assigned';
      request.assignedTo = elevator.id;
      elevator.requestPickup(request.floor, request.direction);
    }

    this.updatePendingCount();
  }

  private pickElevator(
    floor: number,
    direction: TravelDirection,
  ): Elevator | undefined {
    const moving = this.elevators
      .filter((elevator) => elevator.isMovingTowards(floor, direction))
      .sort((a, b) => a.distanceToFloor(floor) - b.distanceToFloor(floor));
    if (moving.length > 0) {
      return moving[0];
    }

    const idle = this.elevators
      .filter((elevator) => elevator.isIdle())
      .sort((a, b) => {
        const floorDelta = a.distanceToFloor(floor) - b.distanceToFloor(floor);
        return floorDelta === 0 ? a.id - b.id : floorDelta;
      });

    return idle[0];
  }

  private hasOpenRequest(floor: number, direction: TravelDirection): boolean {
    return this.pendingRequests.some(
      (request) =>
        request.floor === floor &&
        request.direction === direction &&
        request.status !== 'served',
    );
  }

  private cleanupRequests(): void {
    if (this.pendingRequests.length === 0) return;

    const remaining = this.pendingRequests.filter(
      (request) => request.status !== 'served',
    );

    this.pendingRequests.splice(0, this.pendingRequests.length, ...remaining);
  }

  private updatePendingCount(): void {
    const waiting = this.pendingRequests.filter(
      (request) => request.status === 'waiting',
    ).length;
    this.pendingIndicator.textContent = String(waiting);
  }

  dispose(): void {
    if (this.dispatchTimer !== null) {
      window.clearInterval(this.dispatchTimer);
      this.dispatchTimer = null;
    }
  }
}
