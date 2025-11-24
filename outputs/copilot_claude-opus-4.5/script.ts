import { Building, CONFIG } from './Building';

// Main entry point for the elevator simulator
class ElevatorSimulator {
  private building: Building;

  constructor() {
    this.building = new Building(CONFIG.TOTAL_FLOORS, CONFIG.TOTAL_ELEVATORS);
  }

  public initialize(): void {
    const container = document.getElementById('simulator-container');
    if (!container) {
      console.error('Simulator container not found');
      return;
    }

    // Initialize the UI
    this.building.initializeUI(container);

    // Start the simulation
    this.building.runSimulation();

    console.log('Elevator Simulator initialized');
    console.log(`Floors: ${CONFIG.TOTAL_FLOORS}, Elevators: ${CONFIG.TOTAL_ELEVATORS}`);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const simulator = new ElevatorSimulator();
  simulator.initialize();
});
