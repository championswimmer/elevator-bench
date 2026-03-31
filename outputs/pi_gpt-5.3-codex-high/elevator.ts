export type Direction = "up" | "down" | "idle";

export interface ElevatorCallbacks {
  onStateChange?: (elevator: Elevator) => void;
  onStop?: (elevator: Elevator, floor: number) => void;
  onIdle?: (elevator: Elevator) => void;
  onQueueChange?: (elevator: Elevator, pendingFloors: number[]) => void;
}

export interface ElevatorConfig {
  id: number;
  floorCount: number;
  floorHeight: number;
  travelTimeMs: number;
  doorTimeMs: number;
  carElement: HTMLDivElement;
  callbacks?: ElevatorCallbacks;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class Elevator {
  public readonly id: number;

  private readonly floorCount: number;
  private readonly floorHeight: number;
  private readonly travelTimeMs: number;
  private readonly doorTimeMs: number;
  private readonly carElement: HTMLDivElement;
  private readonly callbacks: ElevatorCallbacks;

  private currentFloor = 0;
  private direction: Direction = "idle";
  private moving = false;
  private doorOpen = false;
  private processing = false;
  private pendingStops = new Set<number>();

  constructor(config: ElevatorConfig) {
    this.id = config.id;
    this.floorCount = config.floorCount;
    this.floorHeight = config.floorHeight;
    this.travelTimeMs = config.travelTimeMs;
    this.doorTimeMs = config.doorTimeMs;
    this.carElement = config.carElement;
    this.callbacks = config.callbacks ?? {};

    this.carElement.style.bottom = `${this.floorToBottom(0)}px`;
    this.emitState();
  }

  public getCurrentFloor(): number {
    return this.currentFloor;
  }

  public getDirection(): Direction {
    return this.direction;
  }

  public getPendingFloors(): number[] {
    return [...this.pendingStops].sort((a, b) => a - b);
  }

  public isIdle(): boolean {
    return !this.processing && !this.moving && !this.doorOpen && this.pendingStops.size === 0;
  }

  public distanceTo(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  public requestFloor(floor: number): void {
    if (floor < 0 || floor >= this.floorCount) return;

    if (floor === this.currentFloor && !this.moving) {
      if (!this.pendingStops.has(floor)) {
        this.pendingStops.add(floor);
        this.emitQueueChange();
      }
    } else {
      if (this.pendingStops.has(floor)) return;
      this.pendingStops.add(floor);
      this.emitQueueChange();
    }

    if (!this.processing) {
      void this.processLoop();
    }
  }

  private async processLoop(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.pendingStops.size > 0) {
      if (this.pendingStops.has(this.currentFloor)) {
        await this.stopAtCurrentFloor();
        continue;
      }

      this.updateDirection();

      if (this.direction === "idle") {
        break;
      }

      const step = this.direction === "up" ? 1 : -1;
      const nextFloor = Math.max(0, Math.min(this.floorCount - 1, this.currentFloor + step));

      if (nextFloor === this.currentFloor) {
        this.direction = this.direction === "up" ? "down" : "up";
        this.emitState();
        continue;
      }

      await this.moveToFloor(nextFloor);

      if (this.pendingStops.has(this.currentFloor)) {
        await this.stopAtCurrentFloor();
      }
    }

    this.direction = "idle";
    this.processing = false;
    this.emitState();
    this.callbacks.onIdle?.(this);
  }

  private updateDirection(): void {
    const pending = this.getPendingFloors();
    const hasAbove = pending.some((floor) => floor > this.currentFloor);
    const hasBelow = pending.some((floor) => floor < this.currentFloor);

    if (this.direction === "idle") {
      if (!hasAbove && !hasBelow) return;

      if (hasAbove && hasBelow) {
        const nearestAbove = Math.min(...pending.filter((floor) => floor > this.currentFloor)) - this.currentFloor;
        const nearestBelow = this.currentFloor - Math.max(...pending.filter((floor) => floor < this.currentFloor));
        this.direction = nearestAbove <= nearestBelow ? "up" : "down";
      } else {
        this.direction = hasAbove ? "up" : "down";
      }

      this.emitState();
      return;
    }

    if (this.direction === "up" && !hasAbove) {
      this.direction = hasBelow ? "down" : "idle";
      this.emitState();
      return;
    }

    if (this.direction === "down" && !hasBelow) {
      this.direction = hasAbove ? "up" : "idle";
      this.emitState();
    }
  }

  private async moveToFloor(targetFloor: number): Promise<void> {
    this.moving = true;
    this.emitState();

    this.carElement.style.transition = `bottom ${this.travelTimeMs}ms linear`;
    this.carElement.style.bottom = `${this.floorToBottom(targetFloor)}px`;

    await wait(this.travelTimeMs);

    this.currentFloor = targetFloor;
    this.moving = false;
    this.emitState();
  }

  private async stopAtCurrentFloor(): Promise<void> {
    this.pendingStops.delete(this.currentFloor);
    this.emitQueueChange();

    this.doorOpen = true;
    this.carElement.classList.add("door-open");
    this.emitState();

    this.callbacks.onStop?.(this, this.currentFloor);

    await wait(this.doorTimeMs);

    this.doorOpen = false;
    this.carElement.classList.remove("door-open");
    this.emitState();
  }

  private emitQueueChange(): void {
    this.callbacks.onQueueChange?.(this, this.getPendingFloors());
  }

  private emitState(): void {
    this.callbacks.onStateChange?.(this);
  }

  private floorToBottom(floor: number): number {
    return floor * this.floorHeight + 4;
  }
}
