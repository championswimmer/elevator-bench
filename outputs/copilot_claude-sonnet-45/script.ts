import { Building, Config } from './Building.js';
import { RequestDirection } from './Floor.js';

// Configuration
const CONFIG: Config = {
  totalFloors: 10,
  totalElevators: 4,
  floorTravelTime: 1000, // 1 second per floor
  doorOpenTime: 1500, // 1.5 seconds for doors
};

let building: Building;

function initializeBuilding(): void {
  building = new Building(CONFIG);
  renderBuilding();
  setupEventListeners();
}

function renderBuilding(): void {
  renderShaft();
  renderFloors();
  renderElevators();
  renderControlPanels();
}

function renderShaft(): void {
  const shaftContainer = document.getElementById('shaft-container');
  if (!shaftContainer) return;

  shaftContainer.innerHTML = '';
  shaftContainer.style.height = `${CONFIG.totalFloors * 80}px`;

  // Create elevator shafts
  for (let i = 0; i < CONFIG.totalElevators; i++) {
    const shaft = document.createElement('div');
    shaft.className = 'elevator-shaft';
    shaft.id = `shaft-${i}`;
    shaftContainer.appendChild(shaft);
  }
}

function renderFloors(): void {
  const floorsContainer = document.getElementById('floors-container');
  if (!floorsContainer) return;

  floorsContainer.innerHTML = '';

  // Render floors from top to bottom (reverse order for visual display)
  for (let i = CONFIG.totalFloors - 1; i >= 0; i--) {
    const floor = building.floors[i];
    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.id = `floor-${i}`;

    const floorNumber = document.createElement('div');
    floorNumber.className = 'floor-number';
    floorNumber.textContent = `${i}`;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'floor-buttons';

    if (floor.hasUpButton) {
      const upButton = document.createElement('button');
      upButton.className = 'floor-call-button up-button';
      upButton.innerHTML = '↑';
      upButton.onclick = () => handleFloorRequest(i, RequestDirection.UP);
      buttonsDiv.appendChild(upButton);
      floor.setUpButtonElement(upButton);
    }

    if (floor.hasDownButton) {
      const downButton = document.createElement('button');
      downButton.className = 'floor-call-button down-button';
      downButton.innerHTML = '↓';
      downButton.onclick = () => handleFloorRequest(i, RequestDirection.DOWN);
      buttonsDiv.appendChild(downButton);
      floor.setDownButtonElement(downButton);
    }

    floorDiv.appendChild(floorNumber);
    floorDiv.appendChild(buttonsDiv);
    floorsContainer.appendChild(floorDiv);
  }
}

function renderElevators(): void {
  for (let i = 0; i < CONFIG.totalElevators; i++) {
    const shaft = document.getElementById(`shaft-${i}`);
    if (!shaft) continue;

    const elevator = building.elevators[i];
    const elevatorDiv = document.createElement('div');
    elevatorDiv.className = 'elevator';
    elevatorDiv.id = `elevator-${i}`;
    elevatorDiv.setAttribute('data-floor', '0');
    elevatorDiv.setAttribute('data-state', 'IDLE');
    elevatorDiv.setAttribute('data-direction', 'IDLE');

    const elevatorInfo = document.createElement('div');
    elevatorInfo.className = 'elevator-info';

    const elevatorId = document.createElement('div');
    elevatorId.className = 'elevator-id';
    elevatorId.textContent = `E${i}`;

    const elevatorFloor = document.createElement('div');
    elevatorFloor.className = 'elevator-floor';
    elevatorFloor.textContent = '0';

    const elevatorDirection = document.createElement('div');
    elevatorDirection.className = 'elevator-direction';
    elevatorDirection.textContent = '•';

    elevatorInfo.appendChild(elevatorId);
    elevatorInfo.appendChild(elevatorFloor);
    elevatorInfo.appendChild(elevatorDirection);
    elevatorDiv.appendChild(elevatorInfo);

    shaft.appendChild(elevatorDiv);
    elevator.setElement(elevatorDiv);
    elevator.updateVisualPosition();
  }
}

function renderControlPanels(): void {
  const panelsContainer = document.getElementById('control-panels');
  if (!panelsContainer) return;

  panelsContainer.innerHTML = '';

  for (let i = 0; i < CONFIG.totalElevators; i++) {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.id = `elevator-${i}-panel`;

    const panelTitle = document.createElement('div');
    panelTitle.className = 'panel-title';
    panelTitle.textContent = `Elevator ${i}`;

    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'panel-buttons';

    // Create floor buttons (from top to bottom)
    for (let floor = CONFIG.totalFloors - 1; floor >= 0; floor--) {
      const button = document.createElement('button');
      button.className = 'floor-button';
      button.textContent = floor.toString();
      button.setAttribute('data-floor', floor.toString());
      button.onclick = () => handleElevatorFloorSelection(i, floor);
      buttonsGrid.appendChild(button);
    }

    panel.appendChild(panelTitle);
    panel.appendChild(buttonsGrid);
    panelsContainer.appendChild(panel);
  }
}

function handleFloorRequest(floor: number, direction: RequestDirection): void {
  building.requestElevator(floor, direction);
}

function handleElevatorFloorSelection(elevatorId: number, floor: number): void {
  building.selectFloor(elevatorId, floor);
}

function setupEventListeners(): void {
  // Any additional global event listeners can go here
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeBuilding);
} else {
  initializeBuilding();
}

// Export for potential external use
export { building, CONFIG };
