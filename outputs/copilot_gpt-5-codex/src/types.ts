export type TravelDirection = 'up' | 'down';

export type Direction = TravelDirection | 'idle';

export interface BuildingOptions {
  totalFloors: number;
  elevatorCount: number;
  secondsPerFloor: number;
  doorHoldSeconds: number;
  floorHeight: number;
  pendingRequestInterval: number;
}

export interface ElevatorState {
  id: number;
  currentFloor: number;
  direction: Direction;
  status: 'idle' | 'moving' | 'door-open';
  upQueue: number[];
  downQueue: number[];
  target: number | null;
}

export interface FloorRequest {
  floor: number;
  direction: TravelDirection;
  timestamp: number;
  status: 'waiting' | 'assigned' | 'served';
  assignedTo?: number;
}
