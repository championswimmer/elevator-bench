import { Direction, ElevatorState } from "./types.ts";

export interface ElevatorOptions {
  id: number;
  totalFloors: number;
  doorHoldMs: number;
  floorHeightPx: number;
  carElement: HTMLElement;
  statusElement: HTMLElement;
  panelButtons: HTMLButtonElement[];
  onIdle: (elevator: Elevator) => void;
  onArrive?: (elevator: Elevator, floor: number) => void;
}

export class Elevator {
  public readonly id: number;
  public currentFloor = 0;
  public direction = Direction.Idle;
  public state = ElevatorState.Idle;

  private readonly doorHoldMs: number;
  private readonly totalFloors: number;
  private readonly floorHeightPx: number;
  private readonly carElement: HTMLElement;
  private readonly statusElement: HTMLElement;
  private readonly panelButtons: HTMLButtonElement[];
  private readonly onIdle: (elevator: Elevator) => void;
  private readonly onArrive?: (elevator: Elevator, floor: number) => void;
  private upQueue: number[] = [];
  private downQueue: number[] = [];
  private doorHoldUntil = 0;
  private activeStops = new Set<number>();

  constructor(options: ElevatorOptions) {
    this.id = options.id;
    this.totalFloors = options.totalFloors;
    this.doorHoldMs = options.doorHoldMs;
    this.floorHeightPx = options.floorHeightPx;
    this.carElement = options.carElement;
    this.statusElement = options.statusElement;
    this.panelButtons = options.panelButtons;
    this.onIdle = options.onIdle;
    this.onArrive = options.onArrive;

    this.panelButtons.forEach((button, floor) => {
      button.addEventListener("click", () => {
        this.addStop(floor);
      });
    });

    this.updateCarPosition();
    this.updateStatus();
  }

  public tick(now: number) {
    if (this.state === ElevatorState.Loading) {
      if (now >= this.doorHoldUntil) {
        this.state = ElevatorState.Idle;
        this.selectDirection();
        if (this.direction === Direction.Idle) {
          this.notifyIdle();
        }
      } else {
        return;
      }
    }

    this.selectDirection();

    const target = this.peekNextStop();
    if (target === undefined) {
      this.state = ElevatorState.Idle;
      this.direction = Direction.Idle;
      this.updateStatus();
      return;
    }

    if (this.currentFloor === target) {
      this.handleArrival(now, target);
      return;
    }

    this.state = ElevatorState.Moving;
    this.currentFloor += this.direction === Direction.Up ? 1 : -1;
    this.updateCarPosition();

    if (this.currentFloor === target) {
      this.handleArrival(now, target);
    } else {
      this.updateStatus();
    }
  }

  public addStop(floor: number) {
    if (floor < 0 || floor >= this.totalFloors) return;
    if (floor === this.currentFloor && this.direction === Direction.Idle) {
      this.handleImmediateArrival(performance.now(), floor);
      return;
    }

    if (this.direction === Direction.Up) {
      this.enqueueRelative(floor, floor >= this.currentFloor);
    } else if (this.direction === Direction.Down) {
      this.enqueueRelative(floor, floor > this.currentFloor);
    } else {
      this.enqueueRelative(floor, floor >= this.currentFloor);
    }

    this.updatePanelIndicators();
  }

  public hasPendingStops() {
    return this.upQueue.length > 0 || this.downQueue.length > 0;
  }

  public canServe(floor: number, direction: Direction) {
    if (this.direction === Direction.Idle) {
      return true;
    }

    if (this.direction !== direction) {
      return false;
    }

    if (direction === Direction.Up) {
      return floor >= this.currentFloor;
    }

    if (direction === Direction.Down) {
      return floor <= this.currentFloor;
    }

    return false;
  }

  public distanceToFloor(floor: number) {
    return Math.abs(this.currentFloor - floor);
  }

  private enqueueRelative(floor: number, goesUp: boolean) {
    if (floor === this.currentFloor) {
      return;
    }

    if (goesUp) {
      if (this.upQueue.includes(floor)) return;
      this.upQueue.push(floor);
      this.upQueue.sort((a, b) => a - b);
    } else {
      if (this.downQueue.includes(floor)) return;
      this.downQueue.push(floor);
      this.downQueue.sort((a, b) => b - a);
    }

    this.activeStops.add(floor);
  }

  private peekNextStop() {
    if (this.direction === Direction.Up) {
      return this.upQueue[0];
    }

    if (this.direction === Direction.Down) {
      return this.downQueue[0];
    }

    return undefined;
  }

  private selectDirection() {
    if (this.direction === Direction.Up && this.upQueue.length > 0) {
      return;
    }

    if (this.direction === Direction.Down && this.downQueue.length > 0) {
      return;
    }

    if (this.upQueue.length > 0) {
      this.direction = Direction.Up;
      return;
    }

    if (this.downQueue.length > 0) {
      this.direction = Direction.Down;
      return;
    }

    this.direction = Direction.Idle;
  }

  private handleArrival(now: number, floor: number) {
    if (this.direction === Direction.Up) {
      this.upQueue.shift();
    } else if (this.direction === Direction.Down) {
      this.downQueue.shift();
    }

    this.activeStops.delete(floor);
    this.updatePanelIndicators();

    this.state = ElevatorState.Loading;
    this.doorHoldUntil = now + this.doorHoldMs;
    this.updateCarPosition();
    this.updateStatus();

    if (this.onArrive) {
      this.onArrive(this, floor);
    }

    if (!this.hasPendingStops()) {
      this.direction = Direction.Idle;
      this.notifyIdle();
    }
  }

  private handleImmediateArrival(now: number, floor: number) {
    this.state = ElevatorState.Loading;
    this.doorHoldUntil = now + this.doorHoldMs;
    this.activeStops.delete(floor);
    this.updatePanelIndicators();
    this.updateStatus();
    if (this.onArrive) {
      this.onArrive(this, floor);
    }
    this.notifyIdle();
  }

  private notifyIdle() {
    this.onIdle(this);
  }

  private updateCarPosition() {
    this.carElement.style.setProperty("--current-floor", `${this.currentFloor}`);
    this.carElement.style.setProperty(
      "bottom",
      `${this.currentFloor * this.floorHeightPx}px`,
    );
    this.carElement.dataset.floor = `${this.currentFloor}`;
  }

  private updatePanelIndicators() {
    this.panelButtons.forEach((button, floor) => {
      if (this.activeStops.has(floor)) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  private updateStatus() {
    const directionText =
      this.direction === Direction.Up
        ? "↑"
        : this.direction === Direction.Down
        ? "↓"
        : "•";
    this.statusElement.textContent = `Floor ${this.currentFloor} ${directionText} ${this.state}`;
  }
}
