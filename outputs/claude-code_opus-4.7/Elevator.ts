import type { Direction } from './types.js';

export interface ArrivalEvent {
  arrived: true;
  floor: number;
  servedUp: boolean;
  servedDown: boolean;
}

export class Elevator {
  id: number;
  numFloors: number;
  speed: number;
  doorOpenDuration: number;

  position: number = 0;
  direction: Direction = 'idle';
  pendingUp: Set<number> = new Set();
  pendingDown: Set<number> = new Set();
  carCalls: Set<number> = new Set();
  doorOpen: boolean = false;
  doorTimer: number = 0;

  constructor(id: number, numFloors: number, speed: number, doorOpenDuration: number) {
    this.id = id;
    this.numFloors = numFloors;
    this.speed = speed;
    this.doorOpenDuration = doorOpenDuration;
  }

  get currentFloor(): number {
    return Math.round(this.position);
  }

  hasAnyStops(): boolean {
    return this.pendingUp.size + this.pendingDown.size + this.carCalls.size > 0;
  }

  addHallCall(floor: number, dir: 'up' | 'down'): void {
    if (dir === 'up') this.pendingUp.add(floor);
    else this.pendingDown.add(floor);
  }

  addCarCall(floor: number): void {
    if (floor < 0 || floor >= this.numFloors) return;
    this.carCalls.add(floor);
  }

  private hasStopsAbove(floor: number): boolean {
    for (const f of this.pendingUp) if (f > floor) return true;
    for (const f of this.pendingDown) if (f > floor) return true;
    for (const f of this.carCalls) if (f > floor) return true;
    return false;
  }

  private hasStopsBelow(floor: number): boolean {
    for (const f of this.pendingUp) if (f < floor) return true;
    for (const f of this.pendingDown) if (f < floor) return true;
    for (const f of this.carCalls) if (f < floor) return true;
    return false;
  }

  // LOOK algorithm: serve all stops in current direction, then reverse.
  computeNextTarget(): number | null {
    const eps = 1e-3;
    const pos = this.position;

    if (this.direction === 'up') {
      let nextUp = Infinity;
      for (const f of this.pendingUp) if (f >= pos - eps && f < nextUp) nextUp = f;
      for (const f of this.carCalls) if (f >= pos - eps && f < nextUp) nextUp = f;
      if (nextUp !== Infinity) return nextUp;

      // No more up stops above. Look for highest down call above (turnaround at top).
      let topDown = -Infinity;
      for (const f of this.pendingDown) if (f >= pos - eps && f > topDown) topDown = f;
      if (topDown !== -Infinity) return topDown;

      // Nothing above. Switch direction.
      if (this.hasAnyStops()) {
        this.direction = 'down';
        return this.computeNextTarget();
      }
      this.direction = 'idle';
      return null;
    }

    if (this.direction === 'down') {
      let nextDown = -Infinity;
      for (const f of this.pendingDown) if (f <= pos + eps && f > nextDown) nextDown = f;
      for (const f of this.carCalls) if (f <= pos + eps && f > nextDown) nextDown = f;
      if (nextDown !== -Infinity) return nextDown;

      let bottomUp = Infinity;
      for (const f of this.pendingUp) if (f <= pos + eps && f < bottomUp) bottomUp = f;
      if (bottomUp !== Infinity) return bottomUp;

      if (this.hasAnyStops()) {
        this.direction = 'up';
        return this.computeNextTarget();
      }
      this.direction = 'idle';
      return null;
    }

    // Idle: pick the closest stop and orient toward it.
    if (!this.hasAnyStops()) return null;
    const all: number[] = [
      ...this.pendingUp,
      ...this.pendingDown,
      ...this.carCalls,
    ];
    let closest = all[0];
    for (const f of all) {
      if (Math.abs(f - pos) < Math.abs(closest - pos)) closest = f;
    }
    if (closest > pos + eps) this.direction = 'up';
    else if (closest < pos - eps) this.direction = 'down';
    else {
      if (this.pendingUp.has(closest)) this.direction = 'up';
      else if (this.pendingDown.has(closest)) this.direction = 'down';
      else this.direction = 'up';
    }
    return closest;
  }

  private onArrive(floor: number): { up: boolean; down: boolean } {
    const wasUp = this.pendingUp.has(floor);
    const wasDown = this.pendingDown.has(floor);
    let servedUp = false;
    let servedDown = false;

    this.carCalls.delete(floor);

    if (this.direction === 'up') {
      if (wasUp) {
        this.pendingUp.delete(floor);
        servedUp = true;
      }
      if (!this.hasStopsAbove(floor)) {
        if (wasDown) {
          this.pendingDown.delete(floor);
          servedDown = true;
          this.direction = 'down';
        } else if (this.hasStopsBelow(floor)) {
          this.direction = 'down';
        } else {
          this.direction = 'idle';
        }
      }
    } else if (this.direction === 'down') {
      if (wasDown) {
        this.pendingDown.delete(floor);
        servedDown = true;
      }
      if (!this.hasStopsBelow(floor)) {
        if (wasUp) {
          this.pendingUp.delete(floor);
          servedUp = true;
          this.direction = 'up';
        } else if (this.hasStopsAbove(floor)) {
          this.direction = 'up';
        } else {
          this.direction = 'idle';
        }
      }
    } else {
      if (wasUp) { this.pendingUp.delete(floor); servedUp = true; }
      if (wasDown) { this.pendingDown.delete(floor); servedDown = true; }
    }

    if (!this.hasAnyStops()) this.direction = 'idle';

    this.doorOpen = true;
    this.doorTimer = this.doorOpenDuration;

    return { up: servedUp, down: servedDown };
  }

  tick(dt: number): ArrivalEvent | null {
    if (this.doorOpen) {
      this.doorTimer -= dt;
      if (this.doorTimer <= 0) {
        this.doorOpen = false;
        this.doorTimer = 0;
      }
      return null;
    }

    const target = this.computeNextTarget();
    if (target === null) return null;

    const eps = 0.005;
    if (Math.abs(this.position - target) < eps) {
      this.position = target;
      const { up, down } = this.onArrive(target);
      return { arrived: true, floor: target, servedUp: up, servedDown: down };
    }

    const delta = this.speed * dt;
    if (target > this.position) {
      this.position = Math.min(this.position + delta, target);
    } else {
      this.position = Math.max(this.position - delta, target);
    }
    return null;
  }
}
