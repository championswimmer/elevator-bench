import { ElevatorDirection, Request } from './Types';

export class Floor {
  floorNumber: number;
  upButton: boolean;
  downButton: boolean;
  upRequests: Request[];
  downRequests: Request[];

  constructor(floorNumber: number) {
    this.floorNumber = floorNumber;
    this.upButton = false;
    this.downButton = false;
    this.upRequests = [];
    this.downRequests = [];
  }

  requestUp(): void {
    this.upButton = true;
    const existingRequest = this.upRequests.find(req => req.floor === this.floorNumber);
    if (!existingRequest) {
      this.upRequests.push({
        floor: this.floorNumber,
        direction: 'up',
        timestamp: Date.now()
      });
    }
  }

  requestDown(): void {
    this.downButton = true;
    const existingRequest = this.downRequests.find(req => req.floor === this.floorNumber);
    if (!existingRequest) {
      this.downRequests.push({
        floor: this.floorNumber,
        direction: 'down',
        timestamp: Date.now()
      });
    }
  }

  hasUpRequest(): boolean {
    return this.upRequests.length > 0;
  }

  hasDownRequest(): boolean {
    return this.downRequests.length > 0;
  }

  hasAnyRequest(): boolean {
    return this.hasUpRequest() || this.hasDownRequest();
  }

  clearRequest(direction: ElevatorDirection): void {
    if (direction === 'up') {
      this.upRequests = this.upRequests.filter(req => req.floor !== this.floorNumber);
      if (this.upRequests.length === 0) {
        this.upButton = false;
      }
    } else if (direction === 'down') {
      this.downRequests = this.downRequests.filter(req => req.floor !== this.floorNumber);
      if (this.downRequests.length === 0) {
        this.downButton = false;
      }
    }
  }

  clearAllRequests(): void {
    this.upRequests = [];
    this.downRequests = [];
    this.upButton = false;
    this.downButton = false;
  }

  getNextRequest(): Request | null {
    // Prioritize based on timestamp - older requests first
    let nextRequest: Request | null = null;
    
    if (this.upRequests.length > 0 && this.downRequests.length > 0) {
      // Both directions have requests, choose the older one
      const oldestUp = this.upRequests[0];
      const oldestDown = this.downRequests[0];
      nextRequest = oldestUp.timestamp <= oldestDown.timestamp ? oldestUp : oldestDown;
    } else if (this.upRequests.length > 0) {
      nextRequest = this.upRequests[0];
    } else if (this.downRequests.length > 0) {
      nextRequest = this.downRequests[0];
    }
    
    return nextRequest;
  }

  getRequestsByDirection(direction: ElevatorDirection): Request[] {
    return direction === 'up' ? [...this.upRequests] : [...this.downRequests];
  }

  getState() {
    return {
      floorNumber: this.floorNumber,
      upButton: this.upButton,
      downButton: this.downButton,
      upRequests: [...this.upRequests],
      downRequests: [...this.downRequests]
    };
  }
}