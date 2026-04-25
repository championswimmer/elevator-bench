import { Elevator } from './Elevator.js';

export class Building {
  numFloors: number;
  elevators: Elevator[];
  hallUp: Set<number> = new Set();
  hallDown: Set<number> = new Set();

  constructor(numFloors: number, numElevators: number, speed: number, doorOpenDuration: number) {
    this.numFloors = numFloors;
    this.elevators = [];
    for (let i = 0; i < numElevators; i++) {
      this.elevators.push(new Elevator(i, numFloors, speed, doorOpenDuration));
    }
  }

  requestHallCall(floor: number, dir: 'up' | 'down'): void {
    if (floor < 0 || floor >= this.numFloors) return;
    if (dir === 'up' && floor === this.numFloors - 1) return;
    if (dir === 'down' && floor === 0) return;

    if (dir === 'up') {
      if (this.hallUp.has(floor)) return;
      this.hallUp.add(floor);
    } else {
      if (this.hallDown.has(floor)) return;
      this.hallDown.add(floor);
    }

    const best = this.findBestElevator(floor, dir);
    if (best) best.addHallCall(floor, dir);
  }

  requestCarCall(elevatorId: number, floor: number): void {
    const e = this.elevators[elevatorId];
    if (!e) return;
    e.addCarCall(floor);
  }

  private findBestElevator(floor: number, dir: 'up' | 'down'): Elevator | null {
    let best: Elevator | null = null;
    let bestCost = Infinity;
    for (const e of this.elevators) {
      const c = this.cost(e, floor, dir);
      if (c < bestCost) {
        bestCost = c;
        best = e;
      }
    }
    return best;
  }

  // Approximate "time to serve" cost. Same-direction-on-the-way is cheapest;
  // opposite-direction or already-passed requires a wraparound trip.
  private cost(e: Elevator, floor: number, dir: 'up' | 'down'): number {
    const pos = e.position;
    const N = this.numFloors;

    if (e.direction === 'idle' && !e.hasAnyStops()) {
      return Math.abs(pos - floor);
    }

    const allStops = [...e.pendingUp, ...e.pendingDown, ...e.carCalls];
    let top = pos;
    let bottom = pos;
    for (const f of allStops) {
      if (f > top) top = f;
      if (f < bottom) bottom = f;
    }

    if (e.direction === 'up') {
      if (dir === 'up' && floor >= pos) {
        return floor - pos + 0.1;
      }
      if (dir === 'down') {
        const finalTop = Math.max(top, floor);
        return (finalTop - pos) + (finalTop - floor) + 0.5;
      }
      // dir === 'up' && floor < pos: full wraparound
      const finalBottom = Math.min(bottom, floor);
      return (top - pos) + (top - finalBottom) + (floor - finalBottom) + 1.0;
    }

    if (e.direction === 'down') {
      if (dir === 'down' && floor <= pos) {
        return pos - floor + 0.1;
      }
      if (dir === 'up') {
        const finalBottom = Math.min(bottom, floor);
        return (pos - finalBottom) + (floor - finalBottom) + 0.5;
      }
      const finalTop = Math.max(top, floor);
      return (pos - bottom) + (finalTop - bottom) + (finalTop - floor) + 1.0;
    }

    // Idle but with stops queued (rare transition state)
    return Math.abs(pos - floor) + N;
  }

  tick(dt: number): void {
    for (const e of this.elevators) {
      const event = e.tick(dt);
      if (event && event.arrived) {
        if (event.servedUp) this.hallUp.delete(event.floor);
        if (event.servedDown) this.hallDown.delete(event.floor);
      }
    }
  }
}
