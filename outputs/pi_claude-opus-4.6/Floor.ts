export interface FloorRequest {
  floor: number;
  direction: 'up' | 'down';
  timestamp: number;
}

export class Floor {
  number: number;
  upRequested: boolean;
  downRequested: boolean;
  isTopFloor: boolean;
  isBottomFloor: boolean;

  constructor(number: number, totalFloors: number) {
    this.number = number;
    this.upRequested = false;
    this.downRequested = false;
    this.isTopFloor = number === totalFloors - 1;
    this.isBottomFloor = number === 0;
  }

  requestUp(): boolean {
    if (this.isTopFloor) return false;
    this.upRequested = true;
    return true;
  }

  requestDown(): boolean {
    if (this.isBottomFloor) return false;
    this.downRequested = true;
    return true;
  }

  clearUp(): void {
    this.upRequested = false;
  }

  clearDown(): void {
    this.downRequested = false;
  }
}
