import type { Direction, ElevatorSnapshot } from "./types";

export class Elevator {
  readonly id: number;
  readonly floorCount: number;
  currentFloor = 0;
  direction: Direction = 0;
  isMoving = false;

  private upTargets = new Set<number>();
  private downTargets = new Set<number>();

  constructor(id: number, floorCount: number) {
    this.id = id;
    this.floorCount = floorCount;
  }

  requestFloor(floor: number): void {
    if (floor < 0 || floor >= this.floorCount || floor === this.currentFloor) return;
    if (floor > this.currentFloor) this.upTargets.add(floor);
    else this.downTargets.add(floor);

    if (!this.isMoving && this.direction === 0) {
      this.direction = floor > this.currentFloor ? 1 : -1;
    }
  }

  step(): void {
    this.updateDirectionIfNeeded();
    if (this.direction === 0) {
      this.isMoving = false;
      return;
    }

    this.isMoving = true;
    this.currentFloor += this.direction;
    this.currentFloor = Math.max(0, Math.min(this.floorCount - 1, this.currentFloor));

    this.upTargets.delete(this.currentFloor);
    this.downTargets.delete(this.currentFloor);

    this.updateDirectionIfNeeded();
  }

  canTakeHallCall(floor: number, direction: Direction): boolean {
    if (this.direction === 0) return true;
    if (this.direction !== direction) return false;
    return direction === 1 ? floor >= this.currentFloor : floor <= this.currentFloor;
  }

  distanceTo(floor: number): number {
    return Math.abs(this.currentFloor - floor);
  }

  hasPendingRequests(): boolean {
    return this.upTargets.size > 0 || this.downTargets.size > 0;
  }

  isIdle(): boolean {
    return this.direction === 0 && !this.hasPendingRequests() && !this.isMoving;
  }

  getSnapshot(): ElevatorSnapshot {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      isMoving: this.isMoving,
      targetsUp: [...this.upTargets].sort((a, b) => a - b),
      targetsDown: [...this.downTargets].sort((a, b) => b - a),
    };
  }

  private updateDirectionIfNeeded(): void {
    if (this.direction === 1) {
      const hasUpAhead = [...this.upTargets].some((f) => f >= this.currentFloor);
      if (hasUpAhead) return;
      if (this.downTargets.size > 0) {
        this.direction = -1;
        return;
      }
      this.direction = 0;
      this.isMoving = false;
      return;
    }

    if (this.direction === -1) {
      const hasDownAhead = [...this.downTargets].some((f) => f <= this.currentFloor);
      if (hasDownAhead) return;
      if (this.upTargets.size > 0) {
        this.direction = 1;
        return;
      }
      this.direction = 0;
      this.isMoving = false;
      return;
    }

    if (this.upTargets.size > 0 && this.downTargets.size > 0) {
      const nearestUp = Math.min(...this.upTargets);
      const nearestDown = Math.max(...this.downTargets);
      this.direction = Math.abs(nearestUp - this.currentFloor) <= Math.abs(this.currentFloor - nearestDown) ? 1 : -1;
    } else if (this.upTargets.size > 0) {
      this.direction = 1;
    } else if (this.downTargets.size > 0) {
      this.direction = -1;
    } else {
      this.direction = 0;
      this.isMoving = false;
    }
  }
}
