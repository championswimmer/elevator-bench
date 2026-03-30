export type RequestDirection = 'up' | 'down';

export interface FloorRequest {
  floor: number;
  direction: RequestDirection;
  timestamp: number;
}

export class Floor {
  public floorNumber: number;
  public totalFloors: number;
  public upButtonPressed: boolean;
  public downButtonPressed: boolean;
  public requests: FloorRequest[];

  constructor(floorNumber: number, totalFloors: number) {
    this.floorNumber = floorNumber;
    this.totalFloors = totalFloors;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
    this.requests = [];
  }

  public isTopFloor(): boolean {
    return this.floorNumber === this.totalFloors - 1;
  }

  public isBottomFloor(): boolean {
    return this.floorNumber === 0;
  }

  public hasUpButton(): boolean {
    return !this.isTopFloor();
  }

  public hasDownButton(): boolean {
    return !this.isBottomFloor();
  }

  public pressUpButton(): void {
    if (this.hasUpButton() && !this.upButtonPressed) {
      this.upButtonPressed = true;
      this.requests.push({
        floor: this.floorNumber,
        direction: 'up',
        timestamp: Date.now()
      });
    }
  }

  public pressDownButton(): void {
    if (this.hasDownButton() && !this.downButtonPressed) {
      this.downButtonPressed = true;
      this.requests.push({
        floor: this.floorNumber,
        direction: 'down',
        timestamp: Date.now()
      });
    }
  }

  public releaseUpButton(): void {
    this.upButtonPressed = false;
  }

  public releaseDownButton(): void {
    this.downButtonPressed = false;
  }

  public resetButtons(): void {
    this.upButtonPressed = false;
    this.downButtonPressed = false;
  }

  public getRequestDirection(): RequestDirection | null {
    if (this.upButtonPressed) return 'up';
    if (this.downButtonPressed) return 'down';
    return null;
  }
}
