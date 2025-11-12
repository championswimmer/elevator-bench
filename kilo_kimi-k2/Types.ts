export type ElevatorDirection = 'up' | 'down' | 'idle';

export interface Request {
  floor: number;
  direction: ElevatorDirection;
  timestamp: number;
}

export interface Passenger {
  id: string;
  currentFloor: number;
  targetFloor: number;
  direction: ElevatorDirection;
}

export interface ElevatorState {
  id: number;
  currentFloor: number;
  targetFloor: number;
  direction: ElevatorDirection;
  isMoving: boolean;
  isIdle: boolean;
  requests: Request[];
  passengers: Passenger[];
}

export interface FloorState {
  floorNumber: number;
  upButton: boolean;
  downButton: boolean;
  upRequests: Request[];
  downRequests: Request[];
}

export interface BuildingState {
  floors: FloorState[];
  elevators: ElevatorState[];
  totalFloors: number;
  totalElevators: number;
}