import { Direction } from './Elevator';

export interface FloorRequest {
  floor: number;
  direction: Direction;
  timestamp: number;
}

export class Floor {
  public floorNumber: number;
  public hasUpButton: boolean;
  public hasDownButton: boolean;
  public upButtonActive: boolean = false;
  public downButtonActive: boolean = false;
  public element: HTMLElement | null = null;
  public upButtonElement: HTMLElement | null = null;
  public downButtonElement: HTMLElement | null = null;

  constructor(floorNumber: number, totalFloors: number) {
    this.floorNumber = floorNumber;
    // Bottom floor (0) only has up button
    // Top floor (totalFloors - 1) only has down button
    // All other floors have both
    this.hasUpButton = floorNumber < totalFloors - 1;
    this.hasDownButton = floorNumber > 0;
  }

  // Activate the up button (request elevator going up)
  pressUpButton(): FloorRequest | null {
    if (!this.hasUpButton || this.upButtonActive) {
      return null;
    }
    this.upButtonActive = true;
    if (this.upButtonElement) {
      this.upButtonElement.classList.add('active');
    }
    return {
      floor: this.floorNumber,
      direction: Direction.UP,
      timestamp: Date.now()
    };
  }

  // Activate the down button (request elevator going down)
  pressDownButton(): FloorRequest | null {
    if (!this.hasDownButton || this.downButtonActive) {
      return null;
    }
    this.downButtonActive = true;
    if (this.downButtonElement) {
      this.downButtonElement.classList.add('active');
    }
    return {
      floor: this.floorNumber,
      direction: Direction.DOWN,
      timestamp: Date.now()
    };
  }

  // Deactivate the up button (elevator arrived going up)
  clearUpButton(): void {
    this.upButtonActive = false;
    if (this.upButtonElement) {
      this.upButtonElement.classList.remove('active');
    }
  }

  // Deactivate the down button (elevator arrived going down)
  clearDownButton(): void {
    this.downButtonActive = false;
    if (this.downButtonElement) {
      this.downButtonElement.classList.remove('active');
    }
  }

  // Set DOM elements
  setElements(floorElement: HTMLElement, upButton: HTMLElement | null, downButton: HTMLElement | null): void {
    this.element = floorElement;
    this.upButtonElement = upButton;
    this.downButtonElement = downButton;
  }
}
