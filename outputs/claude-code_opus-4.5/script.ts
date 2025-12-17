import { Building } from './Building';
import { Direction, CONFIG } from './types';

class ElevatorSimulator {
  private building: Building;
  private buildingElement: HTMLElement | null = null;

  constructor() {
    this.building = new Building();
  }

  initialize(): void {
    this.buildingElement = document.getElementById('building');
    if (!this.buildingElement) {
      console.error('Building element not found');
      return;
    }

    this.renderBuilding();
    this.renderElevatorPanels();
    this.initializeElevatorPositions();
  }

  private renderBuilding(): void {
    if (!this.buildingElement) return;

    // Create floor container
    const floorsContainer = document.createElement('div');
    floorsContainer.className = 'floors-container';

    // Create floors from top to bottom for display
    for (let i = CONFIG.NUM_FLOORS - 1; i >= 0; i--) {
      const floor = this.building.floors[i];
      const floorElement = document.createElement('div');
      floorElement.className = 'floor';
      floorElement.dataset.floor = i.toString();

      // Floor label
      const floorLabel = document.createElement('div');
      floorLabel.className = 'floor-label';
      floorLabel.textContent = i === 0 ? 'G' : i.toString();
      floorElement.appendChild(floorLabel);

      // Floor buttons container
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'floor-buttons';

      // Up button (not on top floor)
      if (floor.hasUpButton()) {
        const upButton = document.createElement('button');
        upButton.className = 'floor-button up-button';
        upButton.innerHTML = '▲';
        upButton.addEventListener('click', () => {
          this.building.requestElevator(i, Direction.UP);
        });
        buttonsContainer.appendChild(upButton);
        floor.setUpButton(upButton);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'button-placeholder';
        buttonsContainer.appendChild(placeholder);
      }

      // Down button (not on ground floor)
      if (floor.hasDownButton()) {
        const downButton = document.createElement('button');
        downButton.className = 'floor-button down-button';
        downButton.innerHTML = '▼';
        downButton.addEventListener('click', () => {
          this.building.requestElevator(i, Direction.DOWN);
        });
        buttonsContainer.appendChild(downButton);
        floor.setDownButton(downButton);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'button-placeholder';
        buttonsContainer.appendChild(placeholder);
      }

      floorElement.appendChild(buttonsContainer);

      // Elevator shaft area (visual representation of where elevators are)
      const shaftArea = document.createElement('div');
      shaftArea.className = 'shaft-area';
      floorElement.appendChild(shaftArea);

      floorsContainer.appendChild(floorElement);
    }

    this.buildingElement.appendChild(floorsContainer);

    // Create elevator shafts
    const shaftsContainer = document.createElement('div');
    shaftsContainer.className = 'shafts-container';

    for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
      const shaft = document.createElement('div');
      shaft.className = 'elevator-shaft';
      shaft.dataset.elevator = i.toString();

      // Elevator car
      const car = document.createElement('div');
      car.className = 'elevator-car';
      car.id = `elevator-${i}`;

      const stateIndicator = document.createElement('div');
      stateIndicator.className = 'elevator-state';
      stateIndicator.textContent = '●';
      car.appendChild(stateIndicator);

      const floorDisplay = document.createElement('div');
      floorDisplay.className = 'elevator-floor';
      floorDisplay.textContent = '0';
      car.appendChild(floorDisplay);

      const elevatorId = document.createElement('div');
      elevatorId.className = 'elevator-id';
      elevatorId.textContent = `E${i}`;
      car.appendChild(elevatorId);

      shaft.appendChild(car);
      shaftsContainer.appendChild(shaft);

      // Set element reference
      this.building.elevators[i].setElement(car);
    }

    this.buildingElement.appendChild(shaftsContainer);
  }

  private renderElevatorPanels(): void {
    const panelsContainer = document.getElementById('elevator-panels');
    if (!panelsContainer) return;

    for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
      const panel = document.createElement('div');
      panel.className = 'elevator-panel';

      const panelTitle = document.createElement('div');
      panelTitle.className = 'panel-title';
      panelTitle.textContent = `Elevator ${i}`;
      panel.appendChild(panelTitle);

      const buttonsGrid = document.createElement('div');
      buttonsGrid.className = 'panel-buttons';

      // Create floor buttons
      for (let j = CONFIG.NUM_FLOORS - 1; j >= 0; j--) {
        const button = document.createElement('button');
        button.className = 'panel-button';
        button.textContent = j === 0 ? 'G' : j.toString();
        button.addEventListener('click', () => {
          this.building.selectFloorInElevator(i, j);
        });
        buttonsGrid.appendChild(button);

        // Store button reference
        this.building.elevators[i].setFloorButtonElement(j, button);
      }

      panel.appendChild(buttonsGrid);
      panelsContainer.appendChild(panel);
    }
  }

  private initializeElevatorPositions(): void {
    for (const elevator of this.building.elevators) {
      elevator.updateVisualPosition();
      elevator.updateStateDisplay();
    }
  }
}

// Initialize the simulator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const simulator = new ElevatorSimulator();
  simulator.initialize();
});
