import Floor from './floor';
import Elevator from './elevator';
import RequestQueue from './requestQueue';
import ElevatorRequest from './request';

/**
 * Building class represents the entire building with floors and elevators
 */
class Building {
  numFloors: number;
  numElevators: number;
  floors: Floor[];
  elevators: Elevator[];
  requestQueue: RequestQueue;

  constructor(numFloors: number = 10, numElevators: number = 4) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = new RequestQueue(this);

    this.initialize();
  }

  /**
   * Initialize the building with floors and elevators
   */
  initialize(): void {
    // Create floors - HTML has floors from 9 to 0 (top to bottom)
    // We need to initialize them in the correct order to match the visual layout
    for (let i = 0; i < this.numFloors; i++) {
      // In the HTML, floor-9 is at the top, floor-0 is at the bottom
      // But we want to store them in the array from bottom to top (0 to 9)
      const floorElement = document.getElementById(`floor-${i}`);
      if (floorElement) {
        console.log(`Initializing floor ${i}`);
        const floor = new Floor(i, floorElement, this);
        this.floors.push(floor);
      } else {
        console.warn(`Floor element not found for floor ${i}`);
      }
    }

    // Create elevators
    for (let i = 0; i < this.numElevators; i++) {
      const elevatorElement = document.getElementById(`elevator-${i}`);
      if (elevatorElement) {
        console.log(`Initializing elevator ${i}`);
        const elevator = new Elevator(i, elevatorElement, this);
        this.elevators.push(elevator);
      } else {
        console.warn(`Elevator element not found for elevator ${i}`);
      }
    }

    // Add event listeners for elevator control panels
    this.initializeControlPanels();
    
    // Update status display
    this.updateStatusDisplay();
  }

  /**
   * Initialize control panels for each elevator
   */
  initializeControlPanels(): void {
    for (let i = 0; i < this.numElevators; i++) {
      const controlPanel = document.getElementById(`control-panel-${i}`);
      if (controlPanel) {
        const buttons = controlPanel.querySelectorAll('.elevator-button');
        buttons.forEach(button => {
          button.addEventListener('click', () => {
            const floor = parseInt(button.getAttribute('data-floor') || '0');
            this.handleElevatorRequest(i, floor);
            
            // Visual feedback
            button.classList.add('pressed');
            
            // Remove visual feedback after 2 seconds
            setTimeout(() => {
              button.classList.remove('pressed');
            }, 2000);
          });
        });
      }
    }
  }

  /**
   * Handle a floor request (up/down button pressed)
   * @param floor The floor number
   * @param direction The direction requested
   */
  handleFloorRequest(floor: number, direction: 'up' | 'down'): void {
    console.log(`Floor request: floor ${floor}, direction ${direction}`);
    const request = new ElevatorRequest(floor, direction);
    this.requestQueue.addRequest(request);
    this.updateStatusDisplay();
  }

  /**
   * Handle an elevator request (control panel button pressed)
   * @param elevatorId The elevator ID
   * @param floor The target floor
   */
  handleElevatorRequest(elevatorId: number, floor: number): void {
    console.log(`Elevator request: elevator ${elevatorId}, floor ${floor}`);
    const elevator = this.elevators[elevatorId];
    if (elevator) {
      elevator.addTargetFloor(floor);
    }
    this.updateStatusDisplay();
  }

  /**
   * Assign an elevator to handle a request
   * @param request The request to handle
   */
  assignElevator(request: ElevatorRequest): void {
    const elevator = this.requestQueue.findBestElevator(request);
    if (elevator) {
      elevator.addTargetFloor(request.floor);
    } else {
      // If no elevator is available, queue the request
      this.requestQueue.addRequest(request);
    }
  }

  /**
   * Update elevator position display
   * @param elevatorId The elevator ID
   * @param floor The current floor
   */
  updateElevatorPosition(elevatorId: number, floor: number): void {
    const floorDisplay = document.getElementById(`elevator-${elevatorId}-floor`);
    if (floorDisplay) {
      floorDisplay.textContent = floor.toString();
    }
  }

  /**
   * Update the status display
   */
  updateStatusDisplay(): void {
    const activeRequestsElement = document.getElementById('active-requests');
    if (activeRequestsElement) {
      activeRequestsElement.textContent = this.requestQueue.queue.length.toString();
    }
    
    const totalFloorsElement = document.getElementById('total-floors');
    if (totalFloorsElement) {
      totalFloorsElement.textContent = this.numFloors.toString();
    }
    
    const totalElevatorsElement = document.getElementById('total-elevators');
    if (totalElevatorsElement) {
      totalElevatorsElement.textContent = this.numElevators.toString();
    }
  }
}

export default Building;