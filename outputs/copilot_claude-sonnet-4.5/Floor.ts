export enum RequestDirection {
  UP = "UP",
  DOWN = "DOWN"
}

export class Floor {
  number: number;
  hasUpButton: boolean;
  hasDownButton: boolean;
  upButtonPressed: boolean;
  downButtonPressed: boolean;
  private upButtonElement: HTMLElement | null = null;
  private downButtonElement: HTMLElement | null = null;

  constructor(number: number, totalFloors: number) {
    this.number = number;
    this.hasUpButton = number < totalFloors - 1;
    this.hasDownButton = number > 0;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
  }

  setUpButtonElement(element: HTMLElement): void {
    this.upButtonElement = element;
  }

  setDownButtonElement(element: HTMLElement): void {
    this.downButtonElement = element;
  }

  pressUpButton(): void {
    if (this.hasUpButton) {
      this.upButtonPressed = true;
      this.updateButtonVisuals();
    }
  }

  pressDownButton(): void {
    if (this.hasDownButton) {
      this.downButtonPressed = true;
      this.updateButtonVisuals();
    }
  }

  clearUpButton(): void {
    this.upButtonPressed = false;
    this.updateButtonVisuals();
  }

  clearDownButton(): void {
    this.downButtonPressed = false;
    this.updateButtonVisuals();
  }

  updateButtonVisuals(): void {
    if (this.upButtonElement) {
      if (this.upButtonPressed) {
        this.upButtonElement.classList.add('pressed');
      } else {
        this.upButtonElement.classList.remove('pressed');
      }
    }

    if (this.downButtonElement) {
      if (this.downButtonPressed) {
        this.downButtonElement.classList.add('pressed');
      } else {
        this.downButtonElement.classList.remove('pressed');
      }
    }
  }
}
