import { Elevator } from "./elevator";
import type {
  BuildingSnapshot,
  HallRequest,
  TravelDirection,
} from "./types";

export class Building {
  private readonly totalFloors: number;
  private readonly elevators: Elevator[];
  private readonly activeHallRequests = new Map<string, HallRequest>();
  private readonly pendingHallRequests: HallRequest[] = [];
  private readonly eventLog: string[] = [];

  constructor(totalFloors: number, elevatorCount: number) {
    this.totalFloors = totalFloors;
    this.elevators = Array.from({ length: elevatorCount }, (_, index) => new Elevator(index));
    this.pushEvent(
      `Simulation ready with ${elevatorCount} elevators at floor 0 across ${totalFloors} floors.`,
    );
  }

  getSnapshot(): BuildingSnapshot {
    return {
      totalFloors: this.totalFloors,
      elevatorCount: this.elevators.length,
      elevators: this.elevators.map((elevator) => elevator.snapshot()),
      activeHallRequests: [...this.activeHallRequests.values()].sort((a, b) => {
        if (a.floor === b.floor) {
          return a.direction.localeCompare(b.direction);
        }
        return b.floor - a.floor;
      }),
      pendingHallRequests: [...this.pendingHallRequests].sort((a, b) => {
        if (a.floor === b.floor) {
          return a.direction.localeCompare(b.direction);
        }
        return b.floor - a.floor;
      }),
      eventLog: [...this.eventLog],
    };
  }

  requestElevator(floor: number, direction: TravelDirection): void {
    const request = this.ensureHallRequest(floor, direction);
    if (!request) {
      this.pushEvent(`Hall call for floor ${floor} (${direction}) is already active.`);
      return;
    }

    const assigned = this.assignHallRequest(request);
    if (!assigned) {
      this.pendingHallRequests.push(request);
      this.pushEvent(`Queued hall call at floor ${floor} (${direction}) until a cabin frees up.`);
    }
  }

  requestFloor(elevatorId: number, floor: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator) {
      return;
    }

    elevator.requestStop(floor);
    this.pushEvent(`Elevator ${elevatorId} received an internal request for floor ${floor}.`);
  }

  tick(): void {
    for (const elevator of this.elevators) {
      const result = elevator.step(this.totalFloors);

      for (const event of result.events) {
        this.pushEvent(event);
      }

      if (result.stoppedAtFloor !== null) {
        this.clearServicedHallCalls(result.stoppedAtFloor, result.servicedDirections);
      }
    }

    if (this.pendingHallRequests.length > 0) {
      const remaining: HallRequest[] = [];
      for (const request of this.pendingHallRequests) {
        const assigned = this.assignHallRequest(request);
        if (!assigned) {
          remaining.push(request);
        }
      }

      this.pendingHallRequests.length = 0;
      this.pendingHallRequests.push(...remaining);
    }
  }

  injectRandomHallCall(): void {
    const floor = Math.floor(Math.random() * this.totalFloors);
    const direction = this.pickValidDirectionForFloor(floor);
    this.requestElevator(floor, direction);
  }

  private ensureHallRequest(
    floor: number,
    direction: TravelDirection,
  ): HallRequest | null {
    const key = this.getHallKey(floor, direction);
    if (this.activeHallRequests.has(key)) {
      return null;
    }

    const request: HallRequest = {
      floor,
      direction,
      createdAt: Date.now(),
    };
    this.activeHallRequests.set(key, request);
    return request;
  }

  private assignHallRequest(request: HallRequest): boolean {
    const movingCandidates = this.elevators
      .filter((elevator) => elevator.canServeOnCurrentPath(request.floor, request.direction))
      .sort((left, right) => this.compareElevatorsForRequest(left, right, request.floor));

    const idleCandidates = this.elevators
      .filter((elevator) => elevator.isIdle)
      .sort((left, right) => this.compareElevatorsForRequest(left, right, request.floor));

    const selected = movingCandidates[0] ?? idleCandidates[0];

    if (!selected) {
      return false;
    }

    selected.requestStop(request.floor, request.direction);
    this.pushEvent(
      `Assigned floor ${request.floor} (${request.direction}) to elevator ${selected.id}.`,
    );
    return true;
  }

  private compareElevatorsForRequest(
    left: Elevator,
    right: Elevator,
    floor: number,
  ): number {
    const distanceDiff = left.distanceToFloor(floor) - right.distanceToFloor(floor);
    if (distanceDiff !== 0) {
      return distanceDiff;
    }

    return left.id - right.id;
  }

  private clearServicedHallCalls(
    floor: number,
    directions: TravelDirection[],
  ): void {
    for (const direction of directions) {
      const key = this.getHallKey(floor, direction);
      if (this.activeHallRequests.delete(key)) {
        this.pushEvent(`Hall call cleared at floor ${floor} (${direction}).`);
      }
    }
  }

  private pickValidDirectionForFloor(floor: number): TravelDirection {
    if (floor === 0) {
      return "up";
    }

    if (floor === this.totalFloors - 1) {
      return "down";
    }

    return Math.random() > 0.5 ? "up" : "down";
  }

  private getHallKey(floor: number, direction: TravelDirection): string {
    return `${floor}:${direction}`;
  }

  private pushEvent(event: string): void {
    this.eventLog.unshift(event);
    this.eventLog.splice(18);
  }
}
