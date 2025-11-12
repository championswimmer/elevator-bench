import ElevatorRequest from './request';
import Building from './building';
import Elevator from './elevator';

/**
 * RequestQueue class manages elevator requests and assigns them to elevators
 */
class RequestQueue {
  queue: ElevatorRequest[];
  building: Building;

  constructor(building: Building) {
    this.queue = [];
    this.building = building;
  }

  /**
   * Add a new request to the queue
   * @param request The request to add
   */
  addRequest(request: ElevatorRequest): void {
    console.log(`Adding request to queue: floor ${request.floor}, direction ${request.direction}`);
    // Check if this request already exists in the queue
    const exists = this.queue.some(
      r => r.floor === request.floor && r.direction === request.direction
    );
    
    if (!exists) {
      this.queue.push(request);
      console.log(`Request added to queue. Queue length: ${this.queue.length}`);
      this.processRequests();
    } else {
      console.log(`Request already exists in queue, not adding duplicate`);
    }
  }

  /**
   * Process all pending requests by assigning them to elevators
   */
  processRequests(): void {
    console.log(`Processing requests. Queue length: ${this.queue.length}`);
    // Process each request in the queue
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const request = this.queue[i];
      console.log(`Processing request: floor ${request.floor}, direction ${request.direction}`);
      const elevator = this.findBestElevator(request);
      
      if (elevator) {
        console.log(`Assigning request to elevator ${elevator.id}`);
        // Assign the request to the elevator
        elevator.addTargetFloor(request.floor);
        
        // Remove the request from the queue
        this.queue.splice(i, 1);
      } else {
        console.log(`No elevator available for request`);
      }
    }
    console.log(`Finished processing requests. Queue length: ${this.queue.length}`);
  }

  /**
   * Find the best elevator to handle a request
   * @param request The request to handle
   * @returns The best elevator or null if none available
   */
  findBestElevator(request: ElevatorRequest): Elevator | null {
    console.log(`Finding best elevator for request: floor ${request.floor}, direction ${request.direction}`);
    // First, look for an idle elevator on the same floor
    for (const elevator of this.building.elevators) {
      console.log(`Checking elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, direction=${elevator.direction}, status=${elevator.status}`);
      if (elevator.isAvailable() && elevator.currentFloor === request.floor) {
        console.log(`Found idle elevator ${elevator.id} on same floor ${request.floor}`);
        return elevator;
      }
    }
    
    // Then, look for an elevator traveling in the same direction
    for (const elevator of this.building.elevators) {
      if (elevator.direction === request.direction) {
        // For up requests, elevator should be below the floor and moving up
        if (request.direction === 'up' && elevator.currentFloor < request.floor) {
          console.log(`Found elevator ${elevator.id} traveling in same direction (up) and below floor`);
          return elevator;
        }
        // For down requests, elevator should be above the floor and moving down
        if (request.direction === 'down' && elevator.currentFloor > request.floor) {
          console.log(`Found elevator ${elevator.id} traveling in same direction (down) and above floor`);
          return elevator;
        }
      }
    }
    
    // Finally, look for any available elevator
    for (const elevator of this.building.elevators) {
      if (elevator.isAvailable()) {
        console.log(`Found available elevator ${elevator.id}`);
        return elevator;
      }
    }
    
    // No elevator available
    return null;
  }
}

export default RequestQueue;