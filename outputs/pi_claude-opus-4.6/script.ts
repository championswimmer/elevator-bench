import { Building } from './Building';
import type { Elevator } from './Elevator';

// Configuration
const TOTAL_FLOORS = 10;
const TOTAL_ELEVATORS = 4;

// Initialize the building
const building = new Building(TOTAL_FLOORS, TOTAL_ELEVATORS);

// DOM references
const buildingEl = document.getElementById('building')!;
const elevatorShaftsEl = document.getElementById('elevator-shafts')!;
const floorsEl = document.getElementById('floors')!;

// Track which elevator's internal panel is active
let activePanelElevator: number = 0;

/**
 * Build the initial DOM structure
 */
function initializeDOM(): void {
  // Build floors (top to bottom)
  for (let i = TOTAL_FLOORS - 1; i >= 0; i--) {
    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.dataset.floor = String(i);

    const floorLabel = document.createElement('div');
    floorLabel.className = 'floor-label';
    floorLabel.textContent = `F${i}`;

    const floorButtons = document.createElement('div');
    floorButtons.className = 'floor-buttons';

    // Up button (not on top floor)
    if (i < TOTAL_FLOORS - 1) {
      const upBtn = document.createElement('button');
      upBtn.className = 'hall-btn hall-btn-up';
      upBtn.dataset.floor = String(i);
      upBtn.dataset.direction = 'up';
      upBtn.innerHTML = '▲';
      upBtn.title = `Call elevator up from floor ${i}`;
      upBtn.addEventListener('click', () => handleHallCall(i, 'up'));
      floorButtons.appendChild(upBtn);
    }

    // Down button (not on bottom floor)
    if (i > 0) {
      const downBtn = document.createElement('button');
      downBtn.className = 'hall-btn hall-btn-down';
      downBtn.dataset.floor = String(i);
      downBtn.dataset.direction = 'down';
      downBtn.innerHTML = '▼';
      downBtn.title = `Call elevator down from floor ${i}`;
      downBtn.addEventListener('click', () => handleHallCall(i, 'down'));
      floorButtons.appendChild(downBtn);
    }

    floorDiv.appendChild(floorLabel);
    floorDiv.appendChild(floorButtons);
    floorsEl.appendChild(floorDiv);
  }

  // Build elevator shafts
  for (let e = 0; e < TOTAL_ELEVATORS; e++) {
    const shaftDiv = document.createElement('div');
    shaftDiv.className = 'shaft';
    shaftDiv.dataset.elevator = String(e);

    const shaftLabel = document.createElement('div');
    shaftLabel.className = 'shaft-label';
    shaftLabel.textContent = `E${e}`;
    shaftDiv.appendChild(shaftLabel);

    // Floor indicators in shaft
    for (let i = TOTAL_FLOORS - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'shaft-cell';
      cell.dataset.elevator = String(e);
      cell.dataset.floor = String(i);
      shaftDiv.appendChild(cell);
    }

    // Elevator car
    const carDiv = document.createElement('div');
    carDiv.className = 'elevator-car';
    carDiv.id = `elevator-${e}`;
    carDiv.dataset.elevator = String(e);
    carDiv.innerHTML = `<span class="car-id">E${e}</span><span class="car-direction"></span>`;
    carDiv.addEventListener('click', () => setActivePanelElevator(e));
    shaftDiv.appendChild(carDiv);

    elevatorShaftsEl.appendChild(shaftDiv);
  }

  // Build internal elevator panel
  buildElevatorPanel();
}

/**
 * Build the elevator's internal floor selection panel
 */
function buildElevatorPanel(): void {
  const panelEl = document.getElementById('elevator-panel')!;
  panelEl.innerHTML = '';

  // Elevator selector tabs
  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'panel-tabs';
  for (let e = 0; e < TOTAL_ELEVATORS; e++) {
    const tab = document.createElement('button');
    tab.className = `panel-tab${e === activePanelElevator ? ' active' : ''}`;
    tab.textContent = `E${e}`;
    tab.addEventListener('click', () => setActivePanelElevator(e));
    tabsDiv.appendChild(tab);
  }
  panelEl.appendChild(tabsDiv);

  // Panel display
  const displayDiv = document.createElement('div');
  displayDiv.className = 'panel-display';
  displayDiv.id = 'panel-display';
  displayDiv.textContent = '0';
  panelEl.appendChild(displayDiv);

  // Floor buttons grid
  const gridDiv = document.createElement('div');
  gridDiv.className = 'panel-grid';

  for (let i = TOTAL_FLOORS - 1; i >= 0; i--) {
    const btn = document.createElement('button');
    btn.className = 'panel-btn';
    btn.dataset.floor = String(i);
    btn.textContent = String(i);
    btn.addEventListener('click', () => handleCarCall(activePanelElevator, i));
    gridDiv.appendChild(btn);
  }

  panelEl.appendChild(gridDiv);
}

function setActivePanelElevator(elevatorId: number): void {
  activePanelElevator = elevatorId;
  buildElevatorPanel();
  updateDisplay();
}

/**
 * Handle hall call (floor button press)
 */
function handleHallCall(floor: number, direction: 'up' | 'down'): void {
  building.requestFromFloor(floor, direction);
}

/**
 * Handle car call (internal panel button press)
 */
function handleCarCall(elevatorId: number, floor: number): void {
  building.selectFloorInElevator(elevatorId, floor);
}

/**
 * Update the entire display to match building state
 */
function updateDisplay(): void {
  // Update hall buttons
  for (const floor of building.floors) {
    const upBtn = document.querySelector(`.hall-btn-up[data-floor="${floor.number}"]`) as HTMLButtonElement | null;
    const downBtn = document.querySelector(`.hall-btn-down[data-floor="${floor.number}"]`) as HTMLButtonElement | null;

    if (upBtn) {
      upBtn.classList.toggle('active', floor.upRequested);
    }
    if (downBtn) {
      downBtn.classList.toggle('active', floor.downRequested);
    }
  }

  // Update elevator positions and states
  for (const elevator of building.elevators) {
    const carEl = document.getElementById(`elevator-${elevator.id}`) as HTMLElement;
    if (!carEl) continue;

    // Position: bottom of shaft is floor 0, each floor is one cell height
    const floorHeight = 52; // matches CSS .shaft-cell height + border
    const bottomOffset = elevator.currentFloor * floorHeight;
    carEl.style.bottom = `${bottomOffset}px`;

    // Direction indicator
    const dirEl = carEl.querySelector('.car-direction')!;
    if (elevator.direction === 'up') {
      dirEl.textContent = '▲';
    } else if (elevator.direction === 'down') {
      dirEl.textContent = '▼';
    } else {
      dirEl.textContent = '●';
    }

    // Door state
    carEl.classList.toggle('door-open', elevator.doorOpen);
    carEl.classList.toggle('moving', elevator.moving && !elevator.doorOpen);

    // Highlight shaft cells for destinations
    const shaftCells = document.querySelectorAll(`.shaft-cell[data-elevator="${elevator.id}"]`);
    shaftCells.forEach(cell => {
      const cellFloor = parseInt(cell.getAttribute('data-floor')!);
      cell.classList.toggle('destination', elevator.hasDestination(cellFloor));
      cell.classList.toggle('current', cellFloor === elevator.currentFloor);
    });
  }

  // Update panel display
  const panelDisplay = document.getElementById('panel-display');
  if (panelDisplay) {
    const elevator = building.elevators[activePanelElevator];
    panelDisplay.textContent = String(elevator.currentFloor);
    panelDisplay.className = `panel-display ${elevator.direction}`;
  }

  // Update panel buttons (highlight destinations)
  const panelBtns = document.querySelectorAll('.panel-btn');
  panelBtns.forEach(btn => {
    const floor = parseInt(btn.getAttribute('data-floor')!);
    const elevator = building.elevators[activePanelElevator];
    btn.classList.toggle('active', elevator.hasDestination(floor));
    btn.classList.toggle('current', floor === elevator.currentFloor);
  });
}

// Set up building update callback
building.setUpdateCallback(updateDisplay);

// Initialize everything
initializeDOM();
updateDisplay();
