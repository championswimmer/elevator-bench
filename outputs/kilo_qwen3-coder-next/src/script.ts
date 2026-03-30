import { Building, BuildingConfig } from './building';
import { Elevator } from './elevator';

// Configuration from info.json
const PORT = 8666;
const TOTAL_FLOORS = 10;
const NUM_ELEVATORS = 4;
const ELEVATOR_SPEED = 0.5;

const config: BuildingConfig = {
  totalFloors: TOTAL_FLOORS,
  numElevators: NUM_ELEVATORS,
  elevatorSpeed: ELEVATOR_SPEED
};

const building = new Building(config);

// DOM Elements
let simulationRunning = false;
let animationFrameId: number | null = null;
const simulationSpeed = 1;

// Initialize the UI
function initUI(): void {
  const container = document.getElementById('building-container');
  if (!container) return;

  // Create floors with buttons
  for (let i = TOTAL_FLOORS - 1; i >= 0; i--) {
    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.dataset.floor = i.toString();

    // Floor number label
    const floorLabel = document.createElement('div');
    floorLabel.className = 'floor-label';
    floorLabel.textContent = `Floor ${i}`;
    floorDiv.appendChild(floorLabel);

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'floor-buttons';

    // Up button (not for top floor)
    if (i < TOTAL_FLOORS - 1) {
      const upButton = document.createElement('button');
      upButton.className = 'button up';
      upButton.innerHTML = '&#8593;';
      upButton.title = 'Call Elevator Up';
      upButton.onclick = () => handleFloorRequest(i, 'up');
      buttonContainer.appendChild(upButton);
    }

    // Down button (not for bottom floor)
    if (i > 0) {
      const downButton = document.createElement('button');
      downButton.className = 'button down';
      downButton.innerHTML = '&#8595;';
      downButton.title = 'Call Elevator Down';
      downButton.onclick = () => handleFloorRequest(i, 'down');
      buttonContainer.appendChild(downButton);
    }

    floorDiv.appendChild(buttonContainer);
    container.appendChild(floorDiv);
  }

  // Create elevator shaft
  const shaftDiv = document.createElement('div');
  shaftDiv.className = 'elevator-shaft';

  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const elevatorDiv = document.createElement('div');
    elevatorDiv.className = 'elevator';
    elevatorDiv.id = `elevator-${i}`;
    elevatorDiv.dataset.elevator = i.toString();

    // Elevator floor display
    const displayDiv = document.createElement('div');
    displayDiv.className = 'elevator-display';
    displayDiv.textContent = '0';
    elevatorDiv.appendChild(displayDiv);

    // Elevator doors
    const doorsDiv = document.createElement('div');
    doorsDiv.className = 'elevator-doors';
    elevatorDiv.appendChild(doorsDiv);

    // Elevator buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'elevator-buttons';

    for (let f = 0; f < TOTAL_FLOORS; f++) {
      const btn = document.createElement('button');
      btn.className = 'floor-button';
      btn.textContent = f.toString();
      btn.onclick = () => handleDestinationRequest(i, f);
      buttonsDiv.appendChild(btn);
    }

    elevatorDiv.appendChild(buttonsDiv);
    shaftDiv.appendChild(elevatorDiv);
  }

  container.appendChild(shaftDiv);

  // Control panel
  const controlPanel = document.createElement('div');
  controlPanel.className = 'control-panel';

  const startBtn = document.createElement('button');
  startBtn.textContent = 'Start Simulation';
  startBtn.onclick = toggleSimulation;
  controlPanel.appendChild(startBtn);

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.onclick = resetSimulation;
  controlPanel.appendChild(resetBtn);

  const infoDiv = document.createElement('div');
  infoDiv.className = 'simulation-info';
  infoDiv.innerHTML = `
    <div>Port: ${PORT}</div>
    <div>Floors: ${TOTAL_FLOORS}</div>
    <div>Elevators: ${NUM_ELEVATORS}</div>
  `;
  controlPanel.appendChild(infoDiv);

  container.appendChild(controlPanel);
}

function handleFloorRequest(floor: number, direction: 'up' | 'down'): void {
  building.requestElevator(floor, direction);
  updateUI();
}

function handleDestinationRequest(elevatorId: number, floor: number): void {
  building.selectDestination(elevatorId, floor);
  updateUI();
}

function toggleSimulation(): void {
  simulationRunning = !simulationRunning;
  const btn = document.querySelector('.control-panel button:first-child') as HTMLButtonElement;
  
  if (simulationRunning) {
    btn.textContent = 'Pause Simulation';
    animate();
  } else {
    btn.textContent = 'Start Simulation';
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}

function resetSimulation(): void {
  simulationRunning = false;
  const btn = document.querySelector('.control-panel button:first-child') as HTMLButtonElement;
  btn.textContent = 'Start Simulation';
  
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Reset building
  for (let i = 0; i < config.numElevators; i++) {
    building.elevators[i] = new Elevator(i, config.totalFloors, config.elevatorSpeed);
  }
  
  building.requestQueue = [];
  
  // Reset floor buttons
  for (const floor of building.floors) {
    floor.resetButtons();
  }

  updateUI();
}

function animate(): void {
  if (!simulationRunning) return;

  building.step();
  updateUI();

  animationFrameId = requestAnimationFrame(animate);
}

function updateUI(): void {
  // Update elevator positions
  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const elevator = building.elevators[i];
    const elevatorDiv = document.getElementById(`elevator-${i}`);
    
    if (elevatorDiv) {
      const normalizedPosition = elevator.getNormalizedPosition();
      const topPosition = 100 - (normalizedPosition * 100) - 5; // -5 for elevator height/2
      elevatorDiv.style.top = `${topPosition}%`;
      
      // Update floor display
      const display = elevatorDiv.querySelector('.elevator-display');
      if (display) {
        display.textContent = elevator.getFloor().toString();
      }

      // Update direction indicator
      if (elevator.direction === 'up') {
        elevatorDiv.classList.add('moving-up');
        elevatorDiv.classList.remove('moving-down');
      } else if (elevator.direction === 'down') {
        elevatorDiv.classList.add('moving-down');
        elevatorDiv.classList.remove('moving-up');
      } else {
        elevatorDiv.classList.remove('moving-up', 'moving-down');
      }
    }
  }

  // Update floor button states
  for (let i = 0; i < TOTAL_FLOORS; i++) {
    const floor = building.floors[i];
    const floorDiv = document.querySelector(`.floor[data-floor="${i}"]`);
    
    if (floorDiv) {
      const upButton = floorDiv.querySelector('.button.up');
      const downButton = floorDiv.querySelector('.button.down');

      if (upButton) {
        if (floor.upButtonPressed) {
          upButton.classList.add('active');
        } else {
          upButton.classList.remove('active');
        }
      }

      if (downButton) {
        if (floor.downButtonPressed) {
          downButton.classList.add('active');
        } else {
          downButton.classList.remove('active');
        }
      }
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  updateUI();
});

// Export for potential external use
export { building, config };