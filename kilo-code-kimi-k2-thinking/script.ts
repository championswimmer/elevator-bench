// Define TypeScript interfaces
interface Elevator {
  id: number;
  currentFloor: number;
  targetFloors: number[];
  state: 'idle' | 'movingUp' | 'movingDown' | 'stopped';
  direction: 'up' | 'down' | null;
}

interface FloorRequest {
  floor: number;
  direction: 'up' | 'down';
}

interface SystemConfig {
  numberOfFloors: number;
  numberOfElevators: number;
  elevatorMoveDuration: number; // in milliseconds
}

// System configuration
const config: SystemConfig = {
  numberOfFloors: 10,
  numberOfElevators: 4,
  elevatorMoveDuration: 2000 // 2 seconds
};

// Elevator system state
let elevators: Elevator[] = [];
let requestQueue: FloorRequest[] = [];

// Initialize the elevator system
function initializeElevatorSystem(): void {
  // Create elevators
  for (let i = 0; i < config.numberOfElevators; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloors: [],
      state: 'idle',
      direction: null
    });
  }

  // Set up event listeners
  setupEventListeners();
  
  // Start the simulation loop
  setInterval(processElevatorMovement, 100);
}

// Set up event listeners for buttons
function setupEventListeners(): void {
  // Floor up/down buttons
  document.querySelectorAll('.btn-floor-up, .btn-floor-down').forEach(button => {
    button.addEventListener('click', handleFloorButtonClick);
  });

  // Elevator floor selection buttons
  document.querySelectorAll('.btn-elevator-floor').forEach(button => {
    button.addEventListener('click', handleElevatorFloorButtonClick);
  });
}

// Handle floor button clicks
function handleFloorButtonClick(event: Event): void {
  const button = event.target as HTMLButtonElement;
  const floor = parseInt(button.getAttribute('data-floor') || '0');
  const direction = button.getAttribute('data-direction') as 'up' | 'down';
  
  // Disable button temporarily to prevent duplicate requests
  button.disabled = true;
  
  // Assign the floor request
  assignFloorRequest(floor, direction);
}

// Handle elevator floor button clicks
function handleElevatorFloorButtonClick(event: Event): void {
  const button = event.target as HTMLButtonElement;
  const elevatorId = parseInt(button.getAttribute('data-elevator') || '0');
  const floor = parseInt(button.getAttribute('data-floor') || '0');
  
  // Add floor to elevator's target list
  const elevator = elevators[elevatorId];
  if (!elevator.targetFloors.includes(floor)) {
    elevator.targetFloors.push(floor);
    button.classList.add('targeted');
    
    // Update elevator state if it was idle
    if (elevator.state === 'idle') {
      updateElevatorState(elevatorId, floor > elevator.currentFloor ? 'movingUp' : 'movingDown');
    }
  }
}

// Assign floor request to an elevator
function assignFloorRequest(floor: number, direction: 'up' | 'down'): void {
  // Find eligible elevators (idle or moving in same direction)
  const eligibleElevators = elevators.filter(elevator => {
    return elevator.state === 'idle' || 
           (elevator.direction === direction && 
            ((direction === 'up' && elevator.currentFloor <= floor) || 
             (direction === 'down' && elevator.currentFloor >= floor)));
  });

  if (eligibleElevators.length > 0) {
    // Calculate distances to request floor
    const distances = eligibleElevators.map(elevator => {
      return {
        elevator,
        distance: Math.abs(elevator.currentFloor - floor)
      };
    });

    // Find closest eligible elevator
    const closestElevator = distances.reduce((min, current) => 
      current.distance < min.distance ? current : min
    ).elevator;

    // Add floor to elevator's target list
    if (!closestElevator.targetFloors.includes(floor)) {
      closestElevator.targetFloors.push(floor);
      
      // Update elevator state if it was idle
      if (closestElevator.state === 'idle') {
        closestElevator.direction = direction;
        updateElevatorState(closestElevator.id, direction === 'up' ? 'movingUp' : 'movingDown');
      }
      
      // Update UI
      updateElevatorUI(closestElevator.id);
    }
  } else {
    // If no eligible elevators, add to queue
    requestQueue.push({ floor, direction });
  }
}

// Process elevator movement
function processElevatorMovement(): void {
  elevators.forEach(elevator => {
    if (elevator.state === 'movingUp') {
      moveElevatorUp(elevator);
    } else if (elevator.state === 'movingDown') {
      moveElevatorDown(elevator);
    } else if (elevator.state === 'idle') {
      // Check queue for pending requests
      processRequestQueue(elevator.id);
    }
  });
}

// Move elevator up
function moveElevatorUp(elevator: Elevator): void {
  // Check if there are targets in the current direction
  const targetsInDirection = elevator.targetFloors.filter(floor => floor > elevator.currentFloor);
  
  if (targetsInDirection.length > 0) {
    // Move to next floor
    setTimeout(() => {
      elevator.currentFloor++;
      updateElevatorPosition(elevator.id, elevator.currentFloor);
      
      // Check if we've reached a target floor
      if (elevator.targetFloors.includes(elevator.currentFloor)) {
        stopAtFloor(elevator, elevator.currentFloor);
      }
    }, config.elevatorMoveDuration / (config.numberOfFloors - 1));
  } else {
    // No more targets in this direction, check opposite direction or become idle
    const targetsInOppositeDirection = elevator.targetFloors.filter(floor => floor < elevator.currentFloor);
    
    if (targetsInOppositeDirection.length > 0) {
      updateElevatorState(elevator.id, 'movingDown');
      elevator.direction = 'down';
    } else {
      updateElevatorState(elevator.id, 'idle');
      elevator.direction = null;
    }
  }
}

// Move elevator down
function moveElevatorDown(elevator: Elevator): void {
  // Check if there are targets in the current direction
  const targetsInDirection = elevator.targetFloors.filter(floor => floor < elevator.currentFloor);
  
  if (targetsInDirection.length > 0) {
    // Move to next floor
    setTimeout(() => {
      elevator.currentFloor--;
      updateElevatorPosition(elevator.id, elevator.currentFloor);
      
      // Check if we've reached a target floor
      if (elevator.targetFloors.includes(elevator.currentFloor)) {
        stopAtFloor(elevator, elevator.currentFloor);
      }
    }, config.elevatorMoveDuration / (config.numberOfFloors - 1));
  } else {
    // No more targets in this direction, check opposite direction or become idle
    const targetsInOppositeDirection = elevator.targetFloors.filter(floor => floor > elevator.currentFloor);
    
    if (targetsInOppositeDirection.length > 0) {
      updateElevatorState(elevator.id, 'movingUp');
      elevator.direction = 'up';
    } else {
      updateElevatorState(elevator.id, 'idle');
      elevator.direction = null;
    }
  }
}

// Stop at a floor
function stopAtFloor(elevator: Elevator, floor: number): void {
  // Remove floor from targets
  elevator.targetFloors = elevator.targetFloors.filter(f => f !== floor);
  
  // Update UI
  updateElevatorUI(elevator.id);
  
  // Re-enable floor buttons
  const floorUpButton = document.querySelector(`.btn-floor-up[data-floor="${floor}"]`) as HTMLButtonElement;
  const floorDownButton = document.querySelector(`.btn-floor-down[data-floor="${floor}"]`) as HTMLButtonElement;
  
  if (floorUpButton) floorUpButton.disabled = false;
  if (floorDownButton) floorDownButton.disabled = false;
}

// Process request queue
function processRequestQueue(elevatorId: number): void {
  const elevator = elevators[elevatorId];
  
  if (requestQueue.length > 0 && elevator.state === 'idle') {
    // Take the oldest request
    const request = requestQueue.shift();
    
    if (request) {
      // Add to elevator's target list
      if (!elevator.targetFloors.includes(request.floor)) {
        elevator.targetFloors.push(request.floor);
        elevator.direction = request.direction;
        updateElevatorState(elevatorId, request.direction === 'up' ? 'movingUp' : 'movingDown');
        updateElevatorUI(elevatorId);
      }
    }
  }
}

// Update elevator state
function updateElevatorState(elevatorId: number, state: 'idle' | 'movingUp' | 'movingDown' | 'stopped'): void {
  elevators[elevatorId].state = state;
  updateElevatorUI(elevatorId);
}

// Update elevator position in the DOM
function updateElevatorPosition(elevatorId: number, floor: number): void {
  const elevatorElement = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`) as HTMLElement;
  if (elevatorElement) {
    // Calculate position based on floor height
    const floorHeight = 80; // from CSS
    const position = (config.numberOfFloors - 1 - floor) * floorHeight;
    elevatorElement.style.top = `${position}px`;
  }
}

// Update elevator UI
function updateElevatorUI(elevatorId: number): void {
  const elevator = elevators[elevatorId];
  
  // Update position
  updateElevatorPosition(elevatorId, elevator.currentFloor);
  
  // Update status displays
  const elevatorElement = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`) as HTMLElement;
  if (elevatorElement) {
    const floorDisplay = elevatorElement.querySelector('.elevator-floor') as HTMLElement;
    const stateDisplay = elevatorElement.querySelector('.elevator-state') as HTMLElement;
    
    if (floorDisplay) floorDisplay.textContent = `Floor: ${elevator.currentFloor}`;
    if (stateDisplay) stateDisplay.textContent = `State: ${elevator.state}`;
  }
  
  // Update targeted floor buttons
  document.querySelectorAll(`.btn-elevator-floor[data-elevator="${elevatorId}"]`).forEach(button => {
    const floor = parseInt(button.getAttribute('data-floor') || '0');
    if (elevator.targetFloors.includes(floor)) {
      button.classList.add('targeted');
    } else {
      button.classList.remove('targeted');
    }
  });
}

// Initialize the system when the page loads
document.addEventListener('DOMContentLoaded', initializeElevatorSystem);