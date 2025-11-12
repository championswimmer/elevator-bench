/**
 * ElevatorRequest class represents an elevator request from a floor
 */
class ElevatorRequest {
  floor: number;
  direction: 'up' | 'down';

  constructor(floor: number, direction: 'up' | 'down') {
    this.floor = floor;
    this.direction = direction;
  }
}

export default ElevatorRequest;