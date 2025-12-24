import { Building } from './building.js';
import { Direction } from './elevator.js';

// Configuration constants
const TOTAL_FLOORS = 10;
const TOTAL_ELEVATORS = 4;

// Initialize the building
const building = new Building(TOTAL_FLOORS, TOTAL_ELEVATORS);

// Initialize and render
building.initialize();

const buildingContainer = document.getElementById('building');
if (buildingContainer) {
    building.render(buildingContainer);
}

// Event listeners for controls
const startButton = document.getElementById('startSimulation');
const resetButton = document.getElementById('resetSimulation');

if (startButton) {
    startButton.addEventListener('click', () => {
        if (building.isSimulationRunning) {
            building.stopSimulation();
            startButton.textContent = 'Start Simulation';
        } else {
            building.startSimulation();
            startButton.textContent = 'Stop Simulation';
        }
    });
}

if (resetButton) {
    resetButton.addEventListener('click', () => {
        building.reset();
        if (startButton) {
            startButton.textContent = 'Start Simulation';
        }
    });
}

// Make building accessible from global scope for debugging
(window as any).building = building;
