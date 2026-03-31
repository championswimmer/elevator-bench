import { Elevator } from "./elevator";
import type { Direction, HallRequest } from "./types";

export class Building {
  readonly floorCount: number;
  readonly elevators: Elevator[];
  private hallQueue: HallRequest[] = [];

  constructor(floorCount: number, elevatorCount: number) {
    this.floorCount = floorCount;
    this.elevators = Array.from({ length: elevatorCount }, (_, i) => new Elevator(i, floorCount));
  }

  requestElevator(floor: number, direction: Direction): void {
    if (direction === 0) return;

    const idleCandidates = this.elevators
      .filter((e) => e.isIdle() && e.canTakeHallCall(floor, direction))
      .sort((a, b) => a.distanceTo(floor) - b.distanceTo(floor));

    if (idleCandidates.length > 0) {
      idleCandidates[0].requestFloor(floor);
      return;
    }

    const movingCandidates = this.elevators
      .filter((e) => e.canTakeHallCall(floor, direction))
      .sort((a, b) => a.distanceTo(floor) - b.distanceTo(floor));

    if (movingCandidates.length > 0) {
      movingCandidates[0].requestFloor(floor);
      return;
    }

    this.hallQueue.push({ floor, direction });
  }

  requestDestination(elevatorId: number, destinationFloor: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator) return;
    elevator.requestFloor(destinationFloor);
  }

  tick(): void {
    for (const elevator of this.elevators) elevator.step();
    this.flushQueuedHallCalls();
  }

  getQueuedCalls(): HallRequest[] {
    return [...this.hallQueue];
  }

  private flushQueuedHallCalls(): void {
    if (this.hallQueue.length === 0) return;

    const pending = [...this.hallQueue];
    this.hallQueue = [];

    for (const req of pending) {
      const candidates = this.elevators
        .filter((e) => e.isIdle() || e.canTakeHallCall(req.floor, req.direction))
        .sort((a, b) => a.distanceTo(req.floor) - b.distanceTo(req.floor));

      if (candidates.length > 0) {
        candidates[0].requestFloor(req.floor);
      } else {
        this.hallQueue.push(req);
      }
    }
  }
}
