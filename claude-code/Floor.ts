export class Floor {
  floorNumber: number;
  upButtonPressed: boolean;
  downButtonPressed: boolean;
  element: HTMLElement | null;
  upButton: HTMLElement | null;
  downButton: HTMLElement | null;

  constructor(floorNumber: number) {
    this.floorNumber = floorNumber;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
    this.element = null;
    this.upButton = null;
    this.downButton = null;
  }

  pressUpButton(): void {
    this.upButtonPressed = true;
    this.updateButtonUI();
  }

  pressDownButton(): void {
    this.downButtonPressed = true;
    this.updateButtonUI();
  }

  clearUpButton(): void {
    this.upButtonPressed = false;
    this.updateButtonUI();
  }

  clearDownButton(): void {
    this.downButtonPressed = false;
    this.updateButtonUI();
  }

  updateButtonUI(): void {
    if (this.upButton) {
      if (this.upButtonPressed) {
        this.upButton.classList.add('pressed');
      } else {
        this.upButton.classList.remove('pressed');
      }
    }

    if (this.downButton) {
      if (this.downButtonPressed) {
        this.downButton.classList.add('pressed');
      } else {
        this.downButton.classList.remove('pressed');
      }
    }
  }
}
