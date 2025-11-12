import { Floor } from './Floor';
import { Elevator } from './Elevator';
import { ElevatorDirection, Request, FloorState, ElevatorState } from './Types';

export class Building {
  floors: Floor[];
  elevators: Elevator[];
  totalFloors: number;
  totalElevators: number;

  constructor(totalFloors: number, totalElevators: number) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.initializeBuilding();
  }

  initializeBuilding(): void {
    // Initialize floors (0-9)
    for (let i = 0; i < this.totalFloors; i++) {
      this.floors.push(new Floor(i));
    }

    // Initialize elevators (0-3)
    for (let i = 0; i < this.totalElevators; i++) {
      this.elevators.push(new Elevator(i, 0)); // All elevators start at floor 0
    }
  }

  findBestElevator(floor: number, direction: ElevatorDirection): Elevator | null {
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      let score = Infinity;

      if (elevator.isIdle) {
        // Idle elevator - score based on distance
        score = elevator.getDistanceToFloor(floor);
      } else if (elevator.canServeRequest(floor, direction)) {
        // Moving in same direction - score based on distance and current load
        const distance = elevator.getDistanceToFloor(floor);
        const loadFactor = elevator.requests.length + elevator.passengers.length;
        score = distance + (loadFactor * 0.5); // Penalty for high load
      }

      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }

    return bestElevator;
  }

  processRequests(): void {
    // Process floor requests
    for (const floor of this.floors) {
      if (floor.hasAnyRequest()) {
        const nextRequest = floor.getNextRequest();
        if (nextRequest) {
          const bestElevator = this.findBestElevator(nextRequest.floor, nextRequest.direction);
          
          if (bestElevator) {
            // Assign request to elevator
            bestElevator.addRequest(nextRequest.floor, nextRequest.direction);
            
            // Clear the request from floor
            floor.clearRequest(nextRequest.direction);
          }
        }
      }
    }

    // Process elevator movements
    for (const elevator of this.elevators) {
      elevator.processRequests();
      elevator.move();
    }
  }

  getFloorRequests(): { floor: number; direction: ElevatorDirection }[] {
    const requests: { floor: number; direction: ElevatorDirection }[] = [];
    
    for (const floor of this.floors) {
      if (floor.hasUpRequest()) {
        requests.push({ floor: floor.floorNumber, direction: 'up' });
      }
      if (floor.hasDownRequest()) {
        requests.push({ floor: floor.floorNumber, direction: 'down' });
      }
    }
    
    return requests;
  }

  requestElevator(floor: number, direction: ElevatorDirection): boolean {
    if (floor < 0 || floor >= this.totalFloors) {
      return false;
    }

    const floorObj = this.floors[floor];
    if (direction === 'up') {
      floorObj.requestUp();
    } else {
      floorObj.requestDown();
    }

    return true;
  }

  getElevatorRequests(floor: number): Request[] {
    const requests: Request[] = [];
    for (const elevator of this.elevators) {
      requests.push(...elevator.requests.filter(req => req.floor === floor));
    }
    return requests;
  }

  getElevatorById(id: number): Elevator | null {
    return this.elevators.find(elevator => elevator.id === id) || null;
  }

  getFloorByNumber(floorNumber: number): Floor | null {
    return this.floors.find(floor => floor.floorNumber === floorNumber) || null;
  }

  getBuildingState() {
    return {
      floors: this.floors.map(floor => floor.getState()),
      elevators: this.elevators.map(elevator => elevator.getState()),
      totalFloors: this.totalFloors,
      totalElevators: this.totalElevators
    };
  }

  // Utility method to check if any elevator can serve a request
  canAnyElevatorServeRequest(floor: number, direction: ElevatorDirection): boolean {
    return this.elevators.some(elevator => elevator.canServeRequest(floor, direction) || elevator.isIdle);
  }

  // Get all pending requests across all floors
  getAllPendingRequests(): Request[] {
    const allRequests: Request[] = [];
    
    for (const floor of this.floors) {
      allRequests.push(...floor.upRequests);
      allRequests.push(...floor.downRequests);
    }
    
    return allRequests;
  }

  // Get elevator efficiency metrics
  getElevatorMetrics() {
    const metrics = this.elevators.map(elevator => ({
      id: elevator.id,
      isIdle: elevator.isIdle,
      currentFloor: elevator.currentFloor,
      direction: elevator.direction,
      requestCount: elevator.requests.length,
      passengerCount: elevator.passengers.length,
      distanceToTarget: elevator.isMoving ? Math.abs(elevator.targetFloor - elevator.currentFloor) : 0
    }));
    
    return metrics;
  }
}