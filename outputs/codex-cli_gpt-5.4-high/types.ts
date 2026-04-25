export type Direction = "up" | "down" | "idle";
export type TravelDirection = Exclude<Direction, "idle">;

export interface HallRequest {
  floor: number;
  direction: TravelDirection;
  createdAt: number;
}

export interface ElevatorSnapshot {
  id: number;
  currentFloor: number;
  direction: Direction;
  doorOpen: boolean;
  upStops: number[];
  downStops: number[];
}

export interface ElevatorStepResult {
  events: string[];
  servicedDirections: TravelDirection[];
  stoppedAtFloor: number | null;
}

export interface BuildingSnapshot {
  totalFloors: number;
  elevatorCount: number;
  elevators: ElevatorSnapshot[];
  activeHallRequests: HallRequest[];
  pendingHallRequests: HallRequest[];
  eventLog: string[];
}
