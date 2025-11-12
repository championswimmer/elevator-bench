/**
 * Button class represents a UI button element in the elevator simulator
 */
class Button {
  element: HTMLElement;
  isPressed: boolean;

  constructor(element: HTMLElement) {
    this.element = element;
    this.isPressed = false;
  }

  /**
   * Press the button and update its visual state
   */
  press(): void {
    if (!this.isPressed) {
      this.isPressed = true;
      this.element.classList.add('pressed');
      this.element.setAttribute('aria-pressed', 'true');
    }
  }

  /**
   * Reset the button to its default state
   */
  reset(): void {
    if (this.isPressed) {
      this.isPressed = false;
      this.element.classList.remove('pressed');
      this.element.setAttribute('aria-pressed', 'false');
    }
  }
}

export default Button;