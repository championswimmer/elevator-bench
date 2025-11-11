import Building from './building';
import Button from './button';

/**
 * Elevator status enum
 */
enum ElevatorStatus {
  IDLE = 'idle',
  MOVING_UP = 'moving up',
  MOVING_DOWN = 'moving down',
  DOOR_OPENING = 'door opening',
  DOOR_CLOSING = 'door closing'
}

/**
 * Elevator class represents an elevator in the building
 */
class Elevator {
  id: number;
  currentFloor: number;
  direction: 'up' | 'down' | 'idle';
  targetFloors: number[];
  status: ElevatorStatus;
  element: HTMLElement;
  building: Building;
  floorDisplay: HTMLElement;
  directionDisplay: HTMLElement;

  constructor(id: number, element: HTMLElement, building: Building) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = 'idle';
    this.targetFloors = [];
    this.status = ElevatorStatus.IDLE;
    this.element = element;
    this.building = building;
    
    console.log(`Initializing elevator ${id}`);

    // Get display elements
    this.floorDisplay = element.querySelector('.elevator-floor span') as HTMLElement;
    this.directionDisplay = element.querySelector('.elevator-direction span') as HTMLElement;

    // Update initial display
    this.updateDisplay();
  }

  /**
   * Move the elevator to a specific floor
   * @param floor The target floor
   */
  moveToFloor(floor: number): void {
    console.log(`Elevator ${this.id} moving to floor ${floor}`);
    if (floor === this.currentFloor) {
      return;
    }

    // Set direction based on target floor
    this.direction = floor > this.currentFloor ? 'up' : 'down';
    this.status = this.direction === 'up' ? ElevatorStatus.MOVING_UP : ElevatorStatus.MOVING_DOWN;

    // Update display
    this.updateDisplay();

    // Animate movement
    this.animateMovement(floor);
  }

  /**
   * Add a floor to the target floors list
   * @param floor The floor to add
   */
  addTargetFloor(floor: number): void {
    console.log(`Elevator ${this.id} adding target floor ${floor}`);
    console.log(`Elevator ${this.id} current targets:`, this.targetFloors);
    if (!this.targetFloors.includes(floor)) {
      this.targetFloors.push(floor);
      // Sort targets based on current direction
      if (this.direction === 'up') {
        this.targetFloors.sort((a, b) => a - b);
      } else if (this.direction === 'down') {
        this.targetFloors.sort((a, b) => b - a);
      }
    }
    console.log(`Elevator ${this.id} updated targets:`, this.targetFloors);

    // Process next target if idle
    if (this.status === ElevatorStatus.IDLE) {
      this.processNextTarget();
    }
  }

  /**
   * Process the next target floor
   */
  processNextTarget(): void {
    if (this.targetFloors.length > 0) {
      const nextFloor = this.targetFloors[0];
      this.moveToFloor(nextFloor);
    } else {
      this.direction = 'idle';
      this.status = ElevatorStatus.IDLE;
      this.updateDisplay();
    }
  }

  /**
   * Check if the elevator is available (idle or moving in the same direction)
   * @returns true if available, false otherwise
   */
  isAvailable(): boolean {
    return this.status === ElevatorStatus.IDLE || 
           this.status === ElevatorStatus.MOVING_UP || 
           this.status === ElevatorStatus.MOVING_DOWN;
  }

  /**
   * Animate the elevator movement
   * @param targetFloor The target floor
   */
  animateMovement(targetFloor: number): void {
    // Calculate the position based on floor height
    const floorHeight = 60; // From CSS
    const buildingHeight = floorHeight * this.building.numFloors;
    const targetPosition = buildingHeight - (targetFloor * floorHeight) - floorHeight;

    // Apply CSS transition for smooth movement
    this.element.style.transition = `bottom 2s linear`;
    this.element.style.bottom = `${targetPosition}px`;

    // After animation completes
    setTimeout(() => {
      this.currentFloor = targetFloor;
      this.updateDisplay();

      // Remove the reached floor from targets
      const index = this.targetFloors.indexOf(targetFloor);
      if (index > -1) {
        this.targetFloors.splice(index, 1);
      }

      // Open and close doors
      this.status = ElevatorStatus.DOOR_OPENING;
      this.updateDisplay();

      setTimeout(() => {
        this.status = ElevatorStatus.DOOR_CLOSING;
        this.updateDisplay();

        setTimeout(() => {
          // Process next target
          this.processNextTarget();
        }, 1000);
      }, 1000);
    }, 2000);
  }

  /**
   * Update the elevator display
   */
  updateDisplay(): void {
    if (this.floorDisplay) {
      this.floorDisplay.textContent = this.currentFloor.toString();
    }
    
    if (this.directionDisplay) {
      this.directionDisplay.textContent = this.status;
    }
    
    // Update button states in control panel
    this.updateButtonStates();
  }

  /**
   * Update button states in the control panel
   */
  updateButtonStates(): void {
    const controlPanel = document.querySelector(`#control-panel-${this.id} .button-grid`);
    if (controlPanel) {
      const buttons = controlPanel.querySelectorAll('.elevator-button');
      buttons.forEach(button => {
        const floor = parseInt(button.getAttribute('data-floor') || '0');
        if (floor === this.currentFloor) {
          button.classList.add('pressed');
        } else {
          button.classList.remove('pressed');
        }
      });
    }
  }
}

export default Elevator;
export { ElevatorStatus };