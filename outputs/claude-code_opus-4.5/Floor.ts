import { Direction, CONFIG } from './types';

export class Floor {
  public number: number;
  public upButtonActive: boolean = false;
  public downButtonActive: boolean = false;
  private upButton: HTMLElement | null = null;
  private downButton: HTMLElement | null = null;

  constructor(number: number) {
    this.number = number;
  }

  setUpButton(element: HTMLElement): void {
    this.upButton = element;
  }

  setDownButton(element: HTMLElement): void {
    this.downButton = element;
  }

  hasUpButton(): boolean {
    // All floors except top floor have up button
    return this.number < CONFIG.NUM_FLOORS - 1;
  }

  hasDownButton(): boolean {
    // All floors except ground floor have down button
    return this.number > 0;
  }

  activateUpButton(): void {
    if (this.hasUpButton()) {
      this.upButtonActive = true;
      if (this.upButton) {
        this.upButton.classList.add('active');
      }
    }
  }

  activateDownButton(): void {
    if (this.hasDownButton()) {
      this.downButtonActive = true;
      if (this.downButton) {
        this.downButton.classList.add('active');
      }
    }
  }

  deactivateUpButton(): void {
    this.upButtonActive = false;
    if (this.upButton) {
      this.upButton.classList.remove('active');
    }
  }

  deactivateDownButton(): void {
    this.downButtonActive = false;
    if (this.downButton) {
      this.downButton.classList.remove('active');
    }
  }

  deactivateButton(direction: Direction): void {
    if (direction === Direction.UP) {
      this.deactivateUpButton();
    } else if (direction === Direction.DOWN) {
      this.deactivateDownButton();
    }
  }

  isButtonActive(direction: Direction): boolean {
    if (direction === Direction.UP) return this.upButtonActive;
    if (direction === Direction.DOWN) return this.downButtonActive;
    return false;
  }
}
