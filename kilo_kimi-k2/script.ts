import { Building } from './Building';
import { Elevator } from './Elevator';
import { Floor } from './Floor';
import { ElevatorDirection, Request, Passenger, BuildingState } from './Types';

class ElevatorSimulator {
  private building: Building;
  private isRunning: boolean = false;
  private animationFrame: number | null = null;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 16; // ~60 FPS

  constructor() {
    // Initialize building with 10 floors and 4 elevators as specified
    this.building = new Building(10, 4);
  }

  // Initialize the simulation
  initialize(): void {
    console.log('Elevator Simulator initialized');
    console.log(`Building: ${this.building.totalFloors} floors, ${this.building.totalElevators} elevators`);
    
    // Set up DOM event listeners
    this.setupDOMEventListeners();
    
    // Set up event listeners for floor buttons
    this.setupFloorButtonListeners();
    
    // Set up event listeners for elevator buttons
    this.setupElevatorButtonListeners();
    
    // Initialize UI state
    this.initializeUI();
    
    // Start the simulation loop
    this.start();
  }

  // Set up DOM event listeners for direct HTML integration
  private setupDOMEventListeners(): void {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.attachEventListeners();
      });
    } else {
      this.attachEventListeners();
    }
  }

  // Attach event listeners to DOM elements
  private attachEventListeners(): void {
    console.log('Attaching DOM event listeners...');
    
    // Floor button listeners
    document.querySelectorAll('.floor-button-up').forEach(button => {
      button.addEventListener('click', (e) => {
        const floorElement = (e.target as HTMLElement).closest('.floor');
        if (floorElement) {
          const floorNumber = parseInt(floorElement.getAttribute('data-floor') || '0');
          this.handleFloorButtonPress(floorNumber, 'up');
        }
      });
    });

    document.querySelectorAll('.floor-button-down').forEach(button => {
      button.addEventListener('click', (e) => {
        const floorElement = (e.target as HTMLElement).closest('.floor');
        if (floorElement) {
          const floorNumber = parseInt(floorElement.getAttribute('data-floor') || '0');
          this.handleFloorButtonPress(floorNumber, 'down');
        }
      });
    });

    // Elevator button listeners
    document.querySelectorAll('.elevator-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const elevatorElement = (e.target as HTMLElement).closest('.elevator');
        const elevatorId = parseInt(elevatorElement?.getAttribute('data-elevator') || '0');
        const targetFloor = parseInt((e.target as HTMLElement).getAttribute('data-floor') || '0');
        this.handleElevatorButtonPress(elevatorId, targetFloor);
      });
    });

    // Listen for simulation updates
    window.addEventListener('simulationUpdate', (event: Event) => {
      const customEvent = event as CustomEvent;
      this.updateVisualState(customEvent.detail);
    });
    
    console.log('DOM event listeners attached successfully');
  }

  // Set up floor button event listeners
  private setupFloorButtonListeners(): void {
    // This will be connected to DOM elements in the HTML integration
    // For now, we'll create a method that can be called by the UI
    window.addEventListener('floorButtonPressed', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { floor, direction } = customEvent.detail;
      this.handleFloorButtonPress(floor, direction);
    });
  }

  // Set up elevator button event listeners
  private setupElevatorButtonListeners(): void {
    // This will be connected to DOM elements in the HTML integration
    // For now, we'll create a method that can be called by the UI
    window.addEventListener('elevatorButtonPressed', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { elevatorId, floor } = customEvent.detail;
      this.handleElevatorButtonPress(elevatorId, floor);
    });
  }

  // Initialize UI state
  private initializeUI(): void {
    console.log('Initializing UI state...');
    
    // Set initial elevator positions
    for (let i = 0; i < this.building.totalElevators; i++) {
      const elevator = this.building.getElevatorById(i);
      if (elevator) {
        this.updateElevatorPosition(i, elevator.currentFloor);
      }
    }
    
    // Update all button states
    this.updateAllButtonStates();
    console.log('UI state initialized');
  }

  // Handle floor button press
  handleFloorButtonPress(floor: number, direction: ElevatorDirection): boolean {
    const success = this.building.requestElevator(floor, direction);
    if (success) {
      console.log(`Floor ${floor} ${direction} button pressed`);
      this.updateUI();
      this.updateFloorButtonState(floor, direction, true);
    }
    return success;
  }

  // Handle elevator button press (inside elevator)
  handleElevatorButtonPress(elevatorId: number, targetFloor: number): boolean {
    const elevator = this.building.getElevatorById(elevatorId);
    if (!elevator) {
      console.error(`Elevator ${elevatorId} not found`);
      return false;
    }

    if (targetFloor < 0 || targetFloor >= this.building.totalFloors) {
      console.error(`Invalid floor number: ${targetFloor}`);
      return false;
    }

    // Determine direction based on current floor and target floor
    const direction: ElevatorDirection = targetFloor > elevator.currentFloor ? 'up' : 'down';
    
    elevator.addRequest(targetFloor, direction);
    
    // Create a passenger for this request
    const passenger: Passenger = {
      id: `passenger_${Date.now()}_${Math.random()}`,
      currentFloor: elevator.currentFloor,
      targetFloor: targetFloor,
      direction: direction
    };
    
    elevator.addPassenger(passenger);
    
    console.log(`Elevator ${elevatorId} requested to floor ${targetFloor}`);
    this.updateUI();
    this.updateElevatorButtonState(elevatorId, targetFloor, true);
    
    return true;
  }

  // Update elevator position visually
  private updateElevatorPosition(elevatorId: number, floor: number): void {
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    if (elevatorElement) {
      // Calculate position based on floor (0-9)
      const floorHeight = 120; // matches CSS var(--floor-height)
      const bottomPosition = floor * floorHeight;
      (elevatorElement as HTMLElement).style.bottom = `${bottomPosition}px`;
      
      // Add moving class for animation
      elevatorElement.classList.add('moving');
      setTimeout(() => {
        elevatorElement.classList.remove('moving');
      }, 500);
    }
  }

  // Update floor button state
  private updateFloorButtonState(floor: number, direction: ElevatorDirection, isActive: boolean): void {
    const floorElement = document.querySelector(`.floor[data-floor="${floor}"]`);
    if (floorElement) {
      const buttonClass = direction === 'up' ? '.floor-button-up' : '.floor-button-down';
      const button = floorElement.querySelector(buttonClass);
      if (button) {
        if (isActive) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    }
  }

  // Update elevator button state
  private updateElevatorButtonState(elevatorId: number, floor: number, isActive: boolean): void {
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    if (elevatorElement) {
      const button = elevatorElement.querySelector(`.elevator-button[data-floor="${floor}"]`);
      if (button) {
        if (isActive) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      }
    }
  }

  // Update all button states based on current building state
  private updateAllButtonStates(): void {
    const state = this.getCurrentState();
    
    // Update floor buttons
    state.floors.forEach(floorState => {
      this.updateFloorButtonState(floorState.floorNumber, 'up', floorState.upButton);
      this.updateFloorButtonState(floorState.floorNumber, 'down', floorState.downButton);
    });
    
    // Update elevator buttons
    state.elevators.forEach(elevatorState => {
      elevatorState.requests.forEach(request => {
        this.updateElevatorButtonState(elevatorState.id, request.floor, true);
      });
    });
  }

  // Update visual state based on simulation state
  private updateVisualState(state: BuildingState): void {
    // Update elevator positions
    state.elevators.forEach(elevatorState => {
      this.updateElevatorPosition(elevatorState.id, elevatorState.currentFloor);
    });
    
    // Update button states
    this.updateAllButtonStates();
  }

  // Main simulation loop
  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    
    const gameLoop = (currentTime: number) => {
      if (!this.isRunning) return;
      
      const deltaTime = currentTime - this.lastUpdateTime;
      
      if (deltaTime >= this.updateInterval) {
        this.update(deltaTime);
        this.lastUpdateTime = currentTime;
      }
      
      this.animationFrame = requestAnimationFrame(gameLoop);
    };
    
    this.animationFrame = requestAnimationFrame(gameLoop);
    console.log('Elevator simulation started');
  }

  // Stop the simulation
  stop(): void {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log('Elevator simulation stopped');
  }

  // Update simulation state
  private update(deltaTime: number): void {
    // Process all building requests and movements
    this.building.processRequests();
    
    // Update UI
    this.updateUI();
  }

  // Update UI elements
  private updateUI(): void {
    // Dispatch custom event for UI updates
    const event = new CustomEvent('simulationUpdate', {
      detail: this.getCurrentState()
    });
    window.dispatchEvent(event);
  }

  // Get current simulation state
  getCurrentState(): BuildingState {
    return this.building.getBuildingState();
  }

  // Get elevator metrics for debugging/monitoring
  getElevatorMetrics() {
    return this.building.getElevatorMetrics();
  }

  // Get all pending requests
  getPendingRequests() {
    return this.building.getAllPendingRequests();
  }

  // Manual control methods for testing
  moveElevatorToFloor(elevatorId: number, targetFloor: number): boolean {
    const elevator = this.building.getElevatorById(elevatorId);
    if (!elevator) return false;
    
    const direction: ElevatorDirection = targetFloor > elevator.currentFloor ? 'up' : 'down';
    elevator.addRequest(targetFloor, direction);
    return true;
  }

  getElevatorById(id: number): Elevator | null {
    return this.building.getElevatorById(id);
  }

  getFloorByNumber(floorNumber: number): Floor | null {
    return this.building.getFloorByNumber(floorNumber);
  }

  // Reset simulation to initial state
  reset(): void {
    this.stop();
    this.building = new Building(10, 4);
    this.start();
    console.log('Simulation reset');
  }

  // Get building instance for external access
  getBuilding(): Building {
    return this.building;
  }
}

// Create global simulator instance
declare global {
  interface Window {
    elevatorSimulator: ElevatorSimulator;
  }
}

// Initialize the simulator when the script loads
const simulator = new ElevatorSimulator();
window.elevatorSimulator = simulator;

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    simulator.initialize();
  });
} else {
  // DOM is already ready
  simulator.initialize();
}

// Export for use in other modules
export { ElevatorSimulator };
export { Building, Elevator, Floor };
export { ElevatorDirection, Request, Passenger, BuildingState };