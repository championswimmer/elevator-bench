import { Building, NUM_FLOORS, NUM_ELEVATORS } from './Building.js';
import { Direction } from './Elevator.js';

const building = new Building();

function initializeUI(): void {
  const container = document.getElementById('simulator-container');
  if (!container) return;

  // Create building structure
  const buildingElement = document.createElement('div');
  buildingElement.className = 'building';

  // Create floors (top to bottom for display)
  for (let i = NUM_FLOORS - 1; i >= 0; i--) {
    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.dataset.floor = i.toString();

    const floorLabel = document.createElement('div');
    floorLabel.className = 'floor-label';
    floorLabel.textContent = `Floor ${i}`;

    const floorButtons = document.createElement('div');
    floorButtons.className = 'floor-buttons';

    // Add up button (not for top floor)
    if (i < NUM_FLOORS - 1) {
      const upButton = document.createElement('button');
      upButton.className = 'floor-button up-button';
      upButton.textContent = '↑';
      upButton.onclick = () => handleFloorButtonClick(i, 'up');
      floorButtons.appendChild(upButton);
      building.floors[i].upButton = upButton;
    }

    // Add down button (not for ground floor)
    if (i > 0) {
      const downButton = document.createElement('button');
      downButton.className = 'floor-button down-button';
      downButton.textContent = '↓';
      downButton.onclick = () => handleFloorButtonClick(i, 'down');
      floorButtons.appendChild(downButton);
      building.floors[i].downButton = downButton;
    }

    floorDiv.appendChild(floorLabel);
    floorDiv.appendChild(floorButtons);
    building.floors[i].element = floorDiv;

    buildingElement.appendChild(floorDiv);
  }

  // Create elevator shafts
  const shaftsContainer = document.createElement('div');
  shaftsContainer.className = 'elevator-shafts';

  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const shaft = document.createElement('div');
    shaft.className = 'elevator-shaft';

    const elevatorDiv = document.createElement('div');
    elevatorDiv.className = 'elevator';
    elevatorDiv.dataset.elevatorId = i.toString();

    const elevatorLabel = document.createElement('div');
    elevatorLabel.className = 'elevator-label';
    elevatorLabel.textContent = `E${i}`;

    const elevatorFloor = document.createElement('div');
    elevatorFloor.className = 'elevator-floor';
    elevatorFloor.textContent = 'Floor 0';

    const elevatorStatus = document.createElement('div');
    elevatorStatus.className = 'elevator-status';
    elevatorStatus.textContent = 'Idle';

    const elevatorDestinations = document.createElement('div');
    elevatorDestinations.className = 'elevator-destinations';
    elevatorDestinations.textContent = 'No destinations';

    elevatorDiv.appendChild(elevatorLabel);
    elevatorDiv.appendChild(elevatorFloor);
    elevatorDiv.appendChild(elevatorStatus);
    elevatorDiv.appendChild(elevatorDestinations);

    shaft.appendChild(elevatorDiv);
    shaftsContainer.appendChild(shaft);

    building.elevators[i].element = elevatorDiv;
    building.elevators[i].updatePosition();
  }

  container.appendChild(buildingElement);
  container.appendChild(shaftsContainer);

  // Create elevator control panels
  createControlPanels();
}

function createControlPanels(): void {
  const panelsContainer = document.getElementById('control-panels');
  if (!panelsContainer) return;

  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const panel = document.createElement('div');
    panel.className = 'control-panel';

    const panelTitle = document.createElement('div');
    panelTitle.className = 'panel-title';
    panelTitle.textContent = `Elevator ${i} Controls`;

    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'panel-buttons';

    for (let floor = 0; floor < NUM_FLOORS; floor++) {
      const button = document.createElement('button');
      button.className = 'panel-button';
      button.textContent = floor.toString();
      button.onclick = () => handleElevatorButtonClick(i, floor);
      buttonsGrid.appendChild(button);
    }

    panel.appendChild(panelTitle);
    panel.appendChild(buttonsGrid);
    panelsContainer.appendChild(panel);
  }
}

function handleFloorButtonClick(floor: number, direction: Direction): void {
  building.requestElevator(floor, direction);
}

function handleElevatorButtonClick(elevatorId: number, floor: number): void {
  building.selectFloorInElevator(elevatorId, floor);
}

// Initialize the simulation when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializeUI();
  building.startSimulation();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  building.stopSimulation();
});
