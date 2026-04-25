import { Elevator, Direction, ElevatorStatus } from "./elevator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FloorRequest {
  floor: number;
  direction: Direction;
}

// ─── Building Class ───────────────────────────────────────────────────────────

export class Building {
  readonly numFloors: number;
  readonly numElevators: number;
  elevators: Elevator[];

  /** Requests waiting for an elevator to become available */
  pendingRequests: FloorRequest[] = [];

  /**
   * Tracks active (lit) call buttons so we don't dispatch duplicates.
   * Key format: `${floor}-${direction}` e.g. "5-1" or "5--1"
   */
  activeCallButtons: Set<string> = new Set();

  /** Called after any state change (for UI re-render) */
  onUpdate: (() => void) | null = null;

  /** Called with human-readable event descriptions (for the log panel) */
  onLog: ((msg: string) => void) | null = null;

  constructor(numFloors: number, numElevators: number) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    this.elevators = Array.from({ length: numElevators }, (_, i) => {
      const e = new Elevator(i, numFloors);
      e.onUpdate = (elevator) => this.handleElevatorUpdate(elevator);
      return e;
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Called when a passenger presses a hall (call) button on a floor.
   * Dispatches to the best available elevator or queues the request.
   */
  callElevator(floor: number, direction: Direction): void {
    const key = callKey(floor, direction);
    if (this.activeCallButtons.has(key)) return; // already pending

    const label = direction === Direction.UP ? "▲" : "▼";
    this.log(`Floor ${floor}: call button ${label} pressed`);

    this.activeCallButtons.add(key);
    const request: FloorRequest = { floor, direction };

    if (!this.tryAssign(request)) {
      this.pendingRequests.push(request);
      this.log(`Floor ${floor}: request queued — all elevators busy`);
    }

    this.onUpdate?.();
  }

  /**
   * Called when a passenger inside elevator `elevatorId` presses a
   * destination floor button.
   */
  pressFloorButton(elevatorId: number, floor: number): void {
    const elevator = this.elevators[elevatorId];
    if (elevator.stops.has(floor)) {
      this.log(`E${elevatorId}: floor ${floor} already queued`);
      return;
    }
    this.log(`E${elevatorId}: floor ${floor} selected (inside)`);
    elevator.addStop(floor);
    this.onUpdate?.();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  /**
   * Scoring rules (lower = better):
   *   • Idle elevator at distance D  →  score = D
   *   • Elevator passing through (same direction, floor ahead)  →  score = D + 0.5
   *   • All others → not eligible
   */
  private tryAssign(request: FloorRequest): boolean {
    const { floor, direction } = request;
    let best: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      let score: number | null = null;

      if (elevator.isIdle()) {
        score = Math.abs(elevator.currentFloor - floor);
      } else if (elevator.willPass(floor, direction)) {
        score = Math.abs(elevator.currentFloor - floor) + 0.5;
      }

      if (score !== null && score < bestScore) {
        bestScore = score;
        best = elevator;
      }
    }

    if (best) {
      this.log(`Assigned floor ${floor} request to E${best.id}`);
      best.addStop(floor);
      return true;
    }

    return false;
  }

  /**
   * Invoked by each elevator whenever its state changes.
   * – Clears call buttons when the elevator arrives at a floor.
   * – Re-attempts assignment of queued requests.
   */
  private handleElevatorUpdate(elevator: Elevator): void {
    // Clear hall-call buttons for this floor when doors open
    if (elevator.status === ElevatorStatus.DOORS_OPEN) {
      const upKey = callKey(elevator.currentFloor, Direction.UP);
      const downKey = callKey(elevator.currentFloor, Direction.DOWN);
      const clearedUp = this.activeCallButtons.delete(upKey);
      const clearedDn = this.activeCallButtons.delete(downKey);
      if (clearedUp || clearedDn) {
        this.log(
          `E${elevator.id}: arrived at floor ${elevator.currentFloor} — doors open`
        );
      }
    }

    if (elevator.status === ElevatorStatus.IDLE) {
      this.log(`E${elevator.id}: idle at floor ${elevator.currentFloor}`);
    }

    // Retry pending requests (some may now be assignable)
    if (this.pendingRequests.length > 0) {
      const stillPending: FloorRequest[] = [];
      for (const req of this.pendingRequests) {
        if (!this.tryAssign(req)) {
          stillPending.push(req);
        }
      }
      this.pendingRequests = stillPending;
    }

    this.onUpdate?.();
  }

  private log(msg: string): void {
    this.onLog?.(msg);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function callKey(floor: number, direction: Direction): string {
  return `${floor}-${direction}`;
}
