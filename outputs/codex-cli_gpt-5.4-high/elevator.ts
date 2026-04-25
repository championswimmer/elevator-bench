import type {
  Direction,
  ElevatorSnapshot,
  ElevatorStepResult,
  TravelDirection,
} from "./types";

export class Elevator {
  readonly id: number;
  currentFloor = 0;
  direction: Direction = "idle";

  private doorOpenTicks = 0;
  private readonly upStops = new Set<number>();
  private readonly downStops = new Set<number>();

  constructor(id: number) {
    this.id = id;
  }

  get isIdle(): boolean {
    return this.direction === "idle" && !this.doorOpen && !this.hasQueuedStops();
  }

  get doorOpen(): boolean {
    return this.doorOpenTicks > 0;
  }

  get pendingStops(): number[] {
    return [...new Set([...this.getOrderedStops("up"), ...this.getOrderedStops("down")])];
  }

  requestStop(targetFloor: number, preferredDirection?: TravelDirection): void {
    if (targetFloor === this.currentFloor) {
      if (preferredDirection === "down") {
        this.downStops.add(targetFloor);
      } else {
        this.upStops.add(targetFloor);
      }
      return;
    }

    if (targetFloor > this.currentFloor) {
      this.upStops.add(targetFloor);
      return;
    }

    this.downStops.add(targetFloor);
  }

  canServeOnCurrentPath(floor: number, direction: TravelDirection): boolean {
    if (this.direction !== direction) {
      return false;
    }

    if (direction === "up") {
      return floor >= this.currentFloor;
    }

    return floor <= this.currentFloor;
  }

  distanceToFloor(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  step(totalFloors: number): ElevatorStepResult {
    const events: string[] = [];

    if (this.doorOpenTicks > 0) {
      this.doorOpenTicks -= 1;
      if (this.doorOpenTicks === 0) {
        events.push(`Elevator ${this.id} doors closed at floor ${this.currentFloor}.`);
      }
      return {
        events,
        servicedDirections: [],
        stoppedAtFloor: null,
      };
    }

    const servicedHere = this.collectServicedDirectionsAtCurrentFloor();
    if (servicedHere.length > 0) {
      this.openDoorsAtCurrentFloor();
      events.push(
        `Elevator ${this.id} served floor ${this.currentFloor} for ${servicedHere.join(" & ")} traffic.`,
      );
      this.refreshDirection();
      return {
        events,
        servicedDirections: servicedHere,
        stoppedAtFloor: this.currentFloor,
      };
    }

    if (this.direction === "idle") {
      this.direction = this.pickNextDirection();
      if (this.direction === "idle") {
        return {
          events,
          servicedDirections: [],
          stoppedAtFloor: null,
        };
      }
    }

    if (!this.hasStopsInDirection(this.direction)) {
      this.direction = this.reverseOrIdle();
      if (this.direction === "idle") {
        return {
          events,
          servicedDirections: [],
          stoppedAtFloor: null,
        };
      }
    }

    const nextFloor =
      this.direction === "up" ? this.currentFloor + 1 : this.currentFloor - 1;

    if (nextFloor < 0 || nextFloor >= totalFloors) {
      this.direction = this.reverseOrIdle();
      return {
        events,
        servicedDirections: [],
        stoppedAtFloor: null,
      };
    }

    this.currentFloor = nextFloor;
    events.push(`Elevator ${this.id} moved ${this.direction} to floor ${this.currentFloor}.`);

    const servicedAfterMove = this.collectServicedDirectionsAtCurrentFloor();
    if (servicedAfterMove.length > 0) {
      this.openDoorsAtCurrentFloor();
      events.push(
        `Elevator ${this.id} served floor ${this.currentFloor} for ${servicedAfterMove.join(
          " & ",
        )} traffic.`,
      );
      this.refreshDirection();
      return {
        events,
        servicedDirections: servicedAfterMove,
        stoppedAtFloor: this.currentFloor,
      };
    }

    this.refreshDirection();
    return {
      events,
      servicedDirections: [],
      stoppedAtFloor: null,
    };
  }

  snapshot(): ElevatorSnapshot {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      doorOpen: this.doorOpen,
      upStops: this.getOrderedStops("up"),
      downStops: this.getOrderedStops("down"),
    };
  }

  private hasQueuedStops(): boolean {
    return this.upStops.size > 0 || this.downStops.size > 0;
  }

  private getOrderedStops(direction: TravelDirection): number[] {
    const source = direction === "up" ? this.upStops : this.downStops;
    const ordered = [...source];
    ordered.sort((a, b) => (direction === "up" ? a - b : b - a));
    return ordered;
  }

  private hasStopsInDirection(direction: Direction): boolean {
    if (direction === "idle") {
      return false;
    }

    if (direction === "up") {
      return [...this.upStops].some((stop) => stop >= this.currentFloor);
    }

    return [...this.downStops].some((stop) => stop <= this.currentFloor);
  }

  private collectServicedDirectionsAtCurrentFloor(): TravelDirection[] {
    const serviced: TravelDirection[] = [];

    if (this.upStops.has(this.currentFloor)) {
      serviced.push("up");
      this.upStops.delete(this.currentFloor);
    }

    if (this.downStops.has(this.currentFloor)) {
      serviced.push("down");
      this.downStops.delete(this.currentFloor);
    }

    return serviced;
  }

  private openDoorsAtCurrentFloor(): void {
    this.doorOpenTicks = 1;
  }

  private pickNextDirection(): Direction {
    const nearestUp = this.getNearestStopDistance("up");
    const nearestDown = this.getNearestStopDistance("down");

    if (nearestUp === null && nearestDown === null) {
      return "idle";
    }

    if (nearestDown === null) {
      return "up";
    }

    if (nearestUp === null) {
      return "down";
    }

    return nearestUp <= nearestDown ? "up" : "down";
  }

  private getNearestStopDistance(direction: TravelDirection): number | null {
    const stops = this.getOrderedStops(direction);
    if (stops.length === 0) {
      return null;
    }

    return Math.min(...stops.map((stop) => Math.abs(stop - this.currentFloor)));
  }

  private reverseOrIdle(): Direction {
    if (this.direction === "up" && this.downStops.size > 0) {
      return "down";
    }

    if (this.direction === "down" && this.upStops.size > 0) {
      return "up";
    }

    return this.pickNextDirection();
  }

  private refreshDirection(): void {
    if (this.direction === "up" && this.hasStopsInDirection("up")) {
      return;
    }

    if (this.direction === "down" && this.hasStopsInDirection("down")) {
      return;
    }

    this.direction = this.reverseOrIdle();
  }
}
