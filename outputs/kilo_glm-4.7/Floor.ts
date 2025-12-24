/**
 * Represents a floor in the building.
 * Top floor (9) only has down button, bottom floor (0) only has up button.
 */
export class Floor {
  /** The floor number (0-based). */
  floorNumber: number;
  /** Whether the up button is pressed. */
  upButton: boolean;
  /** Whether the down button is pressed. */
  downButton: boolean;

  /**
   * Creates a new Floor instance.
   * @param floorNumber The floor number.
   */
  constructor(floorNumber: number) {
    this.floorNumber = floorNumber;
    this.upButton = false;
    this.downButton = false;
  }

  /**
   * Requests to go up from this floor.
   * Only allowed if not the bottom floor.
   */
  requestUp(): void {
    if (this.floorNumber > 0) {
      this.upButton = true;
    }
  }

  /**
   * Requests to go down from this floor.
   * Only allowed if not the top floor.
   */
  requestDown(): void {
    if (this.floorNumber < 9) {
      this.downButton = true;
    }
  }

  /**
   * Resets both buttons to false.
   */
  resetButtons(): void {
    this.upButton = false;
    this.downButton = false;
  }
}