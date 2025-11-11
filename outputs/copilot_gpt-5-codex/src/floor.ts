import type { TravelDirection } from './types.ts';

interface FloorConfig {
  floorNumber: number;
  totalFloors: number;
  container: HTMLElement;
  onRequest: (direction: TravelDirection) => void;
}

export class Floor {
  readonly element: HTMLDivElement;
  private readonly upButton?: HTMLButtonElement;
  private readonly downButton?: HTMLButtonElement;

  constructor(private readonly config: FloorConfig) {
    this.element = document.createElement('div');
    this.element.className = 'floor-row';
    this.element.dataset.floor = String(config.floorNumber);

    const label = document.createElement('span');
    label.className = 'floor-label';
    label.textContent = `Floor ${config.floorNumber}`;
    this.element.appendChild(label);

    const buttonWrap = document.createElement('div');
    buttonWrap.className = 'call-buttons';

    if (config.floorNumber < config.totalFloors - 1) {
      this.upButton = this.createButton('Up', 'up', buttonWrap);
    }

    if (config.floorNumber > 0) {
      this.downButton = this.createButton('Down', 'down', buttonWrap);
    }

    this.element.appendChild(buttonWrap);
    config.container.appendChild(this.element);
  }

  markPending(direction: TravelDirection, active: boolean): void {
    const target = direction === 'up' ? this.upButton : this.downButton;
    if (!target) return;
    target.classList.toggle('pending', active);
    if (!active) {
      target.blur();
    }
  }

  private createButton(
    label: string,
    direction: TravelDirection,
    wrap: HTMLElement,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `call-button call-${direction}`;
    button.textContent = label;
    button.addEventListener('click', () => {
      this.markPending(direction, true);
      this.config.onRequest(direction);
    });
    wrap.appendChild(button);
    return button;
  }
}
