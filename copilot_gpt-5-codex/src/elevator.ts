import type { Direction, ElevatorState, TravelDirection } from './types.ts';

export interface ElevatorConfig {
  id: number;
  totalFloors: number;
  floorHeight: number;
  secondsPerFloor: number;
  doorHoldSeconds: number;
  shaftContainer: HTMLElement;
  panelContainer: HTMLElement;
  onIdle: (elevator: Elevator) => void;
  onArrival: (floor: number, elevator: Elevator, direction: TravelDirection) => void;
}

export class Elevator {
  private readonly shaftElement: HTMLDivElement;
  private readonly carElement: HTMLDivElement;
  private readonly panelElement: HTMLDivElement;
  private readonly statusElement: HTMLParagraphElement;
  private readonly buttonGrid: HTMLDivElement;
  private readonly floorButtons = new Map<number, HTMLButtonElement>();

  private readonly upQueue: number[] = [];
  private readonly downQueue: number[] = [];

  private status: ElevatorState['status'] = 'idle';
  private direction: Direction = 'idle';
  private currentTarget: number | null = null;
  private currentFloor = 0;
  private doorTimer: number | null = null;
  private lastTravelDirection: TravelDirection = 'up';

  constructor(private readonly config: ElevatorConfig) {
    this.shaftElement = document.createElement('div');
    this.shaftElement.className = 'elevator-shaft';

    this.carElement = document.createElement('div');
    this.carElement.className = 'elevator-car';
    this.carElement.textContent = `#${config.id}`;
    this.shaftElement.appendChild(this.carElement);
    this.config.shaftContainer.appendChild(this.shaftElement);

    this.panelElement = document.createElement('div');
    this.panelElement.className = 'elevator-panel';

    const heading = document.createElement('h3');
    heading.textContent = `Elevator ${config.id}`;
    this.panelElement.appendChild(heading);

    this.statusElement = document.createElement('p');
    this.statusElement.className = 'panel-status';
    this.panelElement.appendChild(this.statusElement);

    this.buttonGrid = document.createElement('div');
    this.buttonGrid.className = 'floor-button-grid';
    this.panelElement.appendChild(this.buttonGrid);

    this.config.panelContainer.appendChild(this.panelElement);

    this.initialiseButtons();
    this.updateCarPosition(0, false);
    this.updateStatusText();
  }

  get id(): number {
    return this.config.id;
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  getDirection(): Direction {
    return this.direction;
  }

  isIdle(): boolean {
    return (
      this.status === 'idle' &&
      this.currentTarget === null &&
      this.upQueue.length === 0 &&
      this.downQueue.length === 0
    );
  }

  isMovingTowards(floor: number, direction: TravelDirection): boolean {
    if (this.status !== 'moving') return false;
    if (this.direction !== direction) return false;
    return direction === 'up'
      ? floor >= this.currentFloor
      : floor <= this.currentFloor;
  }

  distanceToFloor(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  requestPickup(floor: number, direction: TravelDirection): void {
    if (floor === this.currentFloor && this.isIdle()) {
      this.lastTravelDirection = direction;
      this.openDoors(direction);
      this.config.onArrival(floor, this, direction);
      return;
    }

    this.enqueueFloor(floor, direction);
    this.processQueues();
  }

  requestInternal(floor: number): void {
    const directionHint: TravelDirection = floor >= this.currentFloor ? 'up' : 'down';
    if (floor === this.currentFloor && this.status !== 'moving') {
      this.lastTravelDirection = directionHint;
      this.openDoors(directionHint);
      this.config.onArrival(floor, this, directionHint);
      return;
    }

    this.enqueueFloor(floor, directionHint);
    this.processQueues();
  }

  toState(): ElevatorState {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      status: this.status,
      upQueue: [...this.upQueue],
      downQueue: [...this.downQueue],
      target: this.currentTarget,
    };
  }

  private initialiseButtons(): void {
    for (let floor = this.config.totalFloors - 1; floor >= 0; floor -= 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'floor-button';
      button.textContent = String(floor);
      button.addEventListener('click', () => {
        this.markButtonActive(floor, true);
        this.requestInternal(floor);
      });
      this.buttonGrid.appendChild(button);
      this.floorButtons.set(floor, button);
    }
  }

  private enqueueFloor(floor: number, directionHint: TravelDirection): void {
    if (floor === this.currentFloor && this.status === 'moving') {
      this.queueForReverseDirection(floor);
      this.markButtonActive(floor, true);
      return;
    }

    if (floor > this.currentFloor) {
      if (!this.upQueue.includes(floor)) {
        this.upQueue.push(floor);
        this.upQueue.sort((a, b) => a - b);
      }
    } else if (floor < this.currentFloor) {
      if (!this.downQueue.includes(floor)) {
        this.downQueue.push(floor);
        this.downQueue.sort((a, b) => b - a);
      }
    } else {
      if (!this.upQueue.includes(floor) && !this.downQueue.includes(floor)) {
        if (directionHint === 'up') {
          this.upQueue.push(floor);
          this.upQueue.sort((a, b) => a - b);
        } else {
          this.downQueue.push(floor);
          this.downQueue.sort((a, b) => b - a);
        }
      }
    }

    this.markButtonActive(floor, true);
  }

  private queueForReverseDirection(floor: number): void {
    if (floor > this.currentFloor) {
      if (!this.upQueue.includes(floor)) {
        this.upQueue.push(floor);
        this.upQueue.sort((a, b) => a - b);
      }
    } else if (floor < this.currentFloor) {
      if (!this.downQueue.includes(floor)) {
        this.downQueue.push(floor);
        this.downQueue.sort((a, b) => b - a);
      }
    }
  }

  private processQueues(): void {
    if (this.status === 'moving' || this.status === 'door-open') return;

    if (this.direction === 'up') {
      if (this.upQueue.length > 0) {
        this.dispatchToFloor(this.upQueue.shift()!, 'up');
        return;
      }
      if (this.downQueue.length > 0) {
        this.direction = 'down';
        this.processQueues();
        return;
      }
    } else if (this.direction === 'down') {
      if (this.downQueue.length > 0) {
        this.dispatchToFloor(this.downQueue.shift()!, 'down');
        return;
      }
      if (this.upQueue.length > 0) {
        this.direction = 'up';
        this.processQueues();
        return;
      }
    } else {
      if (this.upQueue.length > 0) {
        this.direction = 'up';
        this.dispatchToFloor(this.upQueue.shift()!, 'up');
        return;
      }
      if (this.downQueue.length > 0) {
        this.direction = 'down';
        this.dispatchToFloor(this.downQueue.shift()!, 'down');
        return;
      }
    }

    this.direction = 'idle';
    this.status = 'idle';
    this.updateStatusText();
    this.config.onIdle(this);
  }

  private dispatchToFloor(target: number, direction: TravelDirection): void {
    if (target === this.currentFloor) {
      this.lastTravelDirection = direction;
      this.openDoors(direction);
      this.config.onArrival(target, this, direction);
      return;
    }

    this.currentTarget = target;
    this.lastTravelDirection = direction;
    this.direction = direction;
    this.status = 'moving';
    this.updateStatusText();

    const travelFloors = Math.abs(target - this.currentFloor);
    const durationSeconds = travelFloors * this.config.secondsPerFloor;
    this.carElement.style.transitionDuration = `${durationSeconds}s`;
    this.updateCarPosition(target, true);

    window.setTimeout(() => {
      this.handleArrival(target, direction);
    }, durationSeconds * 1000);
  }

  private handleArrival(floor: number, direction: TravelDirection): void {
    this.currentFloor = floor;
    this.currentTarget = null;
    this.status = 'door-open';
    this.direction = direction;
    this.updateStatusText();
    this.markButtonActive(floor, false);

    this.openDoors(direction);
    this.config.onArrival(floor, this, direction);
  }

  private openDoors(direction: TravelDirection): void {
    if (this.doorTimer !== null) {
      window.clearTimeout(this.doorTimer);
      this.doorTimer = null;
    }

    this.status = 'door-open';
    this.direction = direction;
    this.carElement.classList.add('door-open');
    this.updateStatusText();

    this.doorTimer = window.setTimeout(() => {
      this.closeDoors();
    }, this.config.doorHoldSeconds * 1000);
  }

  private closeDoors(): void {
    if (this.doorTimer !== null) {
      window.clearTimeout(this.doorTimer);
      this.doorTimer = null;
    }

    this.carElement.classList.remove('door-open');
    this.status = 'idle';
    this.updateStatusText();
    this.processQueues();
  }

  private updateCarPosition(floor: number, animated: boolean): void {
    if (!animated) {
      this.carElement.style.transitionDuration = '0s';
    }
    const bottomOffset = floor * this.config.floorHeight;
    this.carElement.style.bottom = `${bottomOffset}px`;
  }

  private markButtonActive(floor: number, active: boolean): void {
    const button = this.floorButtons.get(floor);
    if (!button) return;
    button.classList.toggle('active', active);
  }

  private updateStatusText(): void {
    let message = `Idle at floor ${this.currentFloor}`;

    if (this.status === 'moving' && this.currentTarget !== null) {
      message = `Moving ${this.direction} to ${this.currentTarget}`;
    } else if (this.status === 'door-open') {
      message = `Doors open at floor ${this.currentFloor}`;
    }

    this.statusElement.textContent = message;
  }
}
