// ─── Elevator State Types ────────────────────────────────────────────────────

export enum Direction {
  UP = 1,
  DOWN = -1,
  IDLE = 0,
}

export enum ElevatorStatus {
  IDLE = "idle",
  MOVING = "moving",
  DOORS_OPEN = "doors_open",
}

// ─── Elevator Class ──────────────────────────────────────────────────────────

export class Elevator {
  id: number;
  currentFloor: number;
  direction: Direction;
  status: ElevatorStatus;
  stops: Set<number>;

  /** Called whenever state changes (floor, direction, status, stops) */
  onUpdate: ((elevator: Elevator) => void) | null = null;

  private readonly numFloors: number;
  readonly moveTime: number; // ms per floor
  readonly doorTime: number; // ms doors stay open
  private running = false;

  constructor(
    id: number,
    numFloors: number,
    moveTime = 800,
    doorTime = 1500
  ) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = Direction.IDLE;
    this.status = ElevatorStatus.IDLE;
    this.stops = new Set();
    this.numFloors = numFloors;
    this.moveTime = moveTime;
    this.doorTime = doorTime;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** True when the elevator has no pending stops and is not running */
  isIdle(): boolean {
    return !this.running && this.stops.size === 0;
  }

  /**
   * Returns true if this elevator is currently travelling in `direction`
   * and will reach `floor` before changing direction.
   */
  willPass(floor: number, direction: Direction): boolean {
    if (!this.running || this.direction === Direction.IDLE) return false;
    if (this.direction !== direction) return false;
    if (direction === Direction.UP && floor > this.currentFloor) return true;
    if (direction === Direction.DOWN && floor < this.currentFloor) return true;
    return false;
  }

  /** Add a floor to this elevator's stop list. Starts the run loop if idle. */
  addStop(floor: number): void {
    if (floor < 0 || floor >= this.numFloors) return;
    this.stops.add(floor);
    if (!this.running) {
      this.run().catch(console.error);
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Core run loop:
   *   1. If currently at a queued stop → open doors & wait.
   *   2. If no more stops → exit.
   *   3. Determine which direction to move next (respect current direction;
   *      only reverse when no more stops remain in current direction).
   *   4. Advance one floor, notify, then sleep for moveTime.
   */
  private async run(): Promise<void> {
    this.running = true;

    while (true) {
      // ── Step 1: service this floor if it's a stop ──
      if (this.stops.has(this.currentFloor)) {
        this.stops.delete(this.currentFloor);
        this.status = ElevatorStatus.DOORS_OPEN;
        this.onUpdate?.(this);
        await this.sleep(this.doorTime);
      }

      // ── Step 2: done? ──
      if (this.stops.size === 0) break;

      // ── Step 3: determine direction ──
      const stopsArr = [...this.stops];
      const hasAbove = stopsArr.some((f) => f > this.currentFloor);
      const hasBelow = stopsArr.some((f) => f < this.currentFloor);

      if (this.direction === Direction.UP) {
        if (!hasAbove && hasBelow) this.direction = Direction.DOWN;
        // if both: keep going UP (SCAN algorithm)
      } else if (this.direction === Direction.DOWN) {
        if (!hasBelow && hasAbove) this.direction = Direction.UP;
      } else {
        // IDLE → pick direction towards closest stop
        if (hasAbove && hasBelow) {
          const nearestAbove = Math.min(...stopsArr.filter((f) => f > this.currentFloor));
          const nearestBelow = Math.max(...stopsArr.filter((f) => f < this.currentFloor));
          this.direction =
            nearestAbove - this.currentFloor <= this.currentFloor - nearestBelow
              ? Direction.UP
              : Direction.DOWN;
        } else if (hasAbove) {
          this.direction = Direction.UP;
        } else {
          this.direction = Direction.DOWN;
        }
      }

      // Safety guard (shouldn't happen if stops.size > 0)
      if ((this.direction as Direction) === Direction.IDLE) break;

      // ── Step 4: move one floor ──
      // Update internal state FIRST so the UI renders the destination position
      // and the CSS transition animates from the old position to the new one.
      this.currentFloor += this.direction as number;
      this.status = ElevatorStatus.MOVING;
      this.onUpdate?.(this);
      await this.sleep(this.moveTime);
    }

    // ── Wind down ──
    this.direction = Direction.IDLE;
    this.status = ElevatorStatus.IDLE;
    this.running = false;
    this.onUpdate?.(this);
  }
}
