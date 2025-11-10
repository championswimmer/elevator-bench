// Elevator Simulator TypeScript Implementation

// Configuration Constants
const FLOORS_IN_BUILDING = 10;
const NUMBER_OF_ELEVATORS = 4;
const ANIMATION_SPEED = 500; // milliseconds per floor

// Types
type Direction = 'up' | 'down' | 'idle';
type ElevatorStatus = 'idle' | 'moving' | 'stopped';

interface ElevatorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloor: number;
    direction: Direction;
    status: ElevatorStatus;
    requests: Set<number>;
    isMoving: boolean;
}

// Global State
let elevators: Elevator[] = [];
let floorRequests: Map<number, Direction[]> = new Map();
let isPaused = false;
let statusLog: string[] = [];

// Initialize the simulation
function initializeSimulation(): void {
    // Initialize elevators
    elevators = [];
    for (let i = 0; i < NUMBER_OF_ELEVATORS; i++) {
        elevators.push({
            id: i,
            currentFloor: 0,
            targetFloor: 0,
            direction: 'idle',
            status: 'idle',
            requests: new Set(),
            isMoving: false
        });
    }

    // Initialize floor requests
    floorRequests.clear();
    for (let i = 0; i < FLOORS_IN_BUILDING; i++) {
        floorRequests.set(i, []);
    }

    // Create UI
    createFloorsUI();
    createElevatorButtons();
    updateDisplay();
    
    addStatusLog('Simulation initialized. All elevators at ground floor.', 'movement');
}

// Create floors UI
function createFloorsUI(): void {
    const floorsContainer = document.getElementById('floors-container');
    if (!floorsContainer) return;

    floorsContainer.innerHTML = '';

    for (let floor = FLOORS_IN_BUILDING - 1; floor >= 0; floor--) {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${floor}`;

        const floorNumber = document.createElement('div');
        floorNumber.className = 'floor-number';
        floorNumber.textContent = floor.toString();

        const floorButtons = document.createElement('div');
        floorButtons.className = 'floor-buttons';

        // Add up button (not for top floor)
        if (floor < FLOORS_IN_BUILDING - 1) {
            const upButton = document.createElement('button');
            upButton.className = 'floor-btn up';
            upButton.textContent = '↑';
            upButton.onclick = () => requestElevator(floor, 'up');
            floorButtons.appendChild(upButton);
        }

        // Add down button (not for ground floor)
        if (floor > 0) {
            const downButton = document.createElement('button');
            downButton.className = 'floor-btn down';
            downButton.textContent = '↓';
            downButton.onclick = () => requestElevator(floor, 'down');
            floorButtons.appendChild(downButton);
        }

        floorDiv.appendChild(floorNumber);
        floorDiv.appendChild(floorButtons);
        floorsContainer.appendChild(floorDiv);
    }
}

// Create elevator buttons
function createElevatorButtons(): void {
    for (let elevatorId = 0; elevatorId < NUMBER_OF_ELEVATORS; elevatorId++) {
        const floorButtonsContainer = document.getElementById(`floor-buttons-${elevatorId}`);
        if (!floorButtonsContainer) continue;

        floorButtonsContainer.innerHTML = '';

        for (let floor = 0; floor < FLOORS_IN_BUILDING; floor++) {
            const button = document.createElement('button');
            button.className = 'elevator-floor-btn';
            button.textContent = floor.toString();
            button.onclick = () => requestFloor(elevatorId, floor);
            floorButtonsContainer.appendChild(button);
        }
    }
}

// Request elevator from floor
function requestElevator(floor: number, direction: Direction): void {
    if (isPaused) return;

    const requests = floorRequests.get(floor) || [];
    if (!requests.includes(direction)) {
        requests.push(direction);
        floorRequests.set(floor, requests);
        
        // Update button state
        updateFloorButton(floor, direction, true);
        
        addStatusLog(`Floor ${floor}: ${direction} button pressed`, 'request');
        
        // Assign elevator to this request
        assignElevatorToRequest(floor, direction);
    }
}

// Request floor from inside elevator
function requestFloor(elevatorId: number, floor: number): void {
    if (isPaused) return;

    const elevator = elevators[elevatorId];
    if (elevator.status === 'idle') {
        // If elevator is idle, move to requested floor
        moveElevatorToFloor(elevatorId, floor);
    } else {
        // Add to requests queue
        elevator.requests.add(floor);
        updateElevatorButton(elevatorId, floor, true);
        addStatusLog(`Elevator ${elevatorId}: Floor ${floor} requested`, 'request');
    }
}

// Assign elevator to floor request
function assignElevatorToRequest(floor: number, direction: Direction): void {
    const availableElevator = findBestElevator(floor, direction);
    
    if (availableElevator !== -1) {
        moveElevatorToFloor(availableElevator, floor);
    } else {
        addStatusLog(`No available elevators for floor ${floor} ${direction} request. Queued.`, 'request');
    }
}

// Find the best elevator for a request
function findBestElevator(requestFloor: number, direction: Direction): number {
    let bestElevator = -1;
    let minDistance = Infinity;

    for (let i = 0; i < NUMBER_OF_ELEVATORS; i++) {
        const elevator = elevators[i];
        
        // Skip if elevator is moving in opposite direction
        if (elevator.direction !== 'idle' && elevator.direction !== direction) {
            continue;
        }

        // Calculate distance
        let distance = Math.abs(elevator.currentFloor - requestFloor);
        
        // Prefer elevators moving in the same direction
        if (elevator.direction === direction) {
            if (direction === 'up' && elevator.currentFloor > requestFloor) {
                continue; // Moving up but already passed the floor
            }
            if (direction === 'down' && elevator.currentFloor < requestFloor) {
                continue; // Moving down but already passed the floor
            }
        }

        // Prefer idle elevators
        if (elevator.direction === 'idle') {
            distance *= 0.8; // Slight preference for idle elevators
        }

        if (distance < minDistance) {
            minDistance = distance;
            bestElevator = i;
        }
    }

    return bestElevator;
}

// Move elevator to specific floor
function moveElevatorToFloor(elevatorId: number, targetFloor: number): void {
    const elevator = elevators[elevatorId];
    
    if (elevator.currentFloor === targetFloor) {
        // Already at target floor
        handleElevatorArrival(elevatorId);
        return;
    }

    elevator.targetFloor = targetFloor;
    elevator.direction = elevator.currentFloor < targetFloor ? 'up' : 'down';
    elevator.status = 'moving';
    elevator.isMoving = true;

    addStatusLog(`Elevator ${elevatorId}: Moving ${elevator.direction} to floor ${targetFloor}`, 'movement');
    
    // Animate movement
    animateElevatorMovement(elevatorId);
}

// Animate elevator movement
function animateElevatorMovement(elevatorId: number): void {
    const elevator = elevators[elevatorId];
    const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
    const floorIndicator = document.getElementById(`floor-indicator-${elevatorId}`);
    const directionIndicator = document.getElementById(`direction-indicator-${elevatorId}`);

    if (!elevatorElement || !floorIndicator || !directionIndicator) return;

    // Update direction indicator
    directionIndicator.className = `direction-indicator ${elevator.direction}`;

    const startFloor = elevator.currentFloor;
    const targetFloor = elevator.targetFloor;
    const distance = Math.abs(targetFloor - startFloor);
    const direction = targetFloor > startFloor ? 1 : -1;

    let currentFloor = startFloor;
    let step = 0;

    const moveStep = () => {
        if (isPaused) {
            setTimeout(moveStep, 100);
            return;
        }

        if (step < distance) {
            currentFloor += direction;
            elevator.currentFloor = currentFloor;
            
            // Update visual position
            const bottomPosition = currentFloor * 60;
            elevatorElement.style.bottom = `${bottomPosition}px`;
            floorIndicator.textContent = currentFloor.toString();
            
            step++;
            setTimeout(moveStep, ANIMATION_SPEED);
        } else {
            // Arrived at target floor
            handleElevatorArrival(elevatorId);
        }
    };

    moveStep();
}

// Handle elevator arrival at floor
function handleElevatorArrival(elevatorId: number): void {
    const elevator = elevators[elevatorId];
    const currentFloor = elevator.currentFloor;

    elevator.isMoving = false;
    elevator.status = 'stopped';
    
    addStatusLog(`Elevator ${elevatorId}: Arrived at floor ${currentFloor}`, 'arrival');

    // Clear floor requests for this floor
    const floorRequestsList = floorRequests.get(currentFloor) || [];
    const relevantRequests = floorRequestsList.filter(dir => 
        (dir === 'up' && elevator.direction === 'up') ||
        (dir === 'down' && elevator.direction === 'down') ||
        elevator.direction === 'idle'
    );

    if (relevantRequests.length > 0) {
        // Clear the requests
        const remainingRequests = floorRequestsList.filter(dir => !relevantRequests.includes(dir));
        floorRequests.set(currentFloor, remainingRequests);
        
        // Update button states
        relevantRequests.forEach(dir => updateFloorButton(currentFloor, dir, false));
    }

    // Add current floor to elevator requests if not already there
    elevator.requests.add(currentFloor);

    // Process elevator requests
    setTimeout(() => {
        processElevatorRequests(elevatorId);
    }, 1000);
}

// Process elevator requests (floors requested from inside)
function processElevatorRequests(elevatorId: number): void {
    const elevator = elevators[elevatorId];
    
    if (elevator.requests.size === 0) {
        // No more requests, become idle
        elevator.direction = 'idle';
        elevator.status = 'idle';
        updateDisplay();
        
        // Check for pending floor requests
        checkPendingRequests();
        return;
    }

    // Find next floor to visit
    const currentFloor = elevator.currentFloor;
    const requests = Array.from(elevator.requests);
    
    let nextFloor = -1;
    
    if (elevator.direction === 'up') {
        // Find next floor above current floor
        const upRequests = requests.filter(f => f > currentFloor);
        nextFloor = upRequests.length > 0 ? Math.min(...upRequests) : -1;
        
        if (nextFloor === -1) {
            // No more up requests, change direction
            const downRequests = requests.filter(f => f < currentFloor);
            nextFloor = downRequests.length > 0 ? Math.max(...downRequests) : -1;
            elevator.direction = nextFloor !== -1 ? 'down' : 'idle';
        }
    } else if (elevator.direction === 'down') {
        // Find next floor below current floor
        const downRequests = requests.filter(f => f < currentFloor);
        nextFloor = downRequests.length > 0 ? Math.max(...downRequests) : -1;
        
        if (nextFloor === -1) {
            // No more down requests, change direction
            const upRequests = requests.filter(f => f > currentFloor);
            nextFloor = upRequests.length > 0 ? Math.min(...upRequests) : -1;
            elevator.direction = nextFloor !== -1 ? 'up' : 'idle';
        }
    } else {
        // Idle - find closest request
        nextFloor = requests.reduce((closest, floor) => {
            const currentDistance = Math.abs(floor - currentFloor);
            const closestDistance = Math.abs(closest - currentFloor);
            return currentDistance < closestDistance ? floor : closest;
        }, requests[0]);
        
        elevator.direction = nextFloor > currentFloor ? 'up' : 'down';
    }

    if (nextFloor !== -1) {
        // Remove current floor from requests
        elevator.requests.delete(currentFloor);
        updateElevatorButton(elevatorId, currentFloor, false);
        
        // Move to next floor
        moveElevatorToFloor(elevatorId, nextFloor);
    } else {
        // No more requests
        elevator.direction = 'idle';
        elevator.status = 'idle';
        updateDisplay();
        checkPendingRequests();
    }
}

// Check for pending floor requests
function checkPendingRequests(): void {
    for (let [floor, directions] of floorRequests) {
        if (directions.length > 0) {
            directions.forEach(direction => {
                assignElevatorToRequest(floor, direction);
            });
        }
    }
}

// Update floor button state
function updateFloorButton(floor: number, direction: Direction, active: boolean): void {
    const floorDiv = document.getElementById(`floor-${floor}`);
    if (!floorDiv) return;

    const button = floorDiv.querySelector(`.floor-btn.${direction}`) as HTMLButtonElement;
    if (button) {
        if (active) {
            button.classList.add('active');
            button.disabled = true;
        } else {
            button.classList.remove('active');
            button.disabled = false;
        }
    }
}

// Update elevator button state
function updateElevatorButton(elevatorId: number, floor: number, active: boolean): void {
    const floorButtonsContainer = document.getElementById(`floor-buttons-${elevatorId}`);
    if (!floorButtonsContainer) return;

    const buttons = floorButtonsContainer.querySelectorAll('.elevator-floor-btn');
    const button = buttons[floor] as HTMLButtonElement;
    
    if (button) {
        if (active) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

// Update display
function updateDisplay(): void {
    elevators.forEach((elevator, index) => {
        const floorIndicator = document.getElementById(`floor-indicator-${index}`);
        const directionIndicator = document.getElementById(`direction-indicator-${index}`);
        
        if (floorIndicator) {
            floorIndicator.textContent = elevator.currentFloor.toString();
        }
        
        if (directionIndicator) {
            if (elevator.direction === 'idle') {
                directionIndicator.className = 'direction-indicator';
            } else {
                directionIndicator.className = `direction-indicator ${elevator.direction}`;
            }
        }
    });
}

// Add status log
function addStatusLog(message: string, type: string = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    statusLog.push(logEntry);
    
    // Keep only last 50 entries
    if (statusLog.length > 50) {
        statusLog = statusLog.slice(-50);
    }
    
    updateStatusDisplay();
}

// Update status display
function updateStatusDisplay(): void {
    const statusLogElement = document.getElementById('status-log');
    if (!statusLogElement) return;

    statusLogElement.innerHTML = statusLog
        .map(entry => {
            const type = entry.includes('request') ? 'request' :
                      entry.includes('movement') ? 'movement' :
                      entry.includes('arrival') ? 'arrival' :
                      entry.includes('error') ? 'error' : 'info';
            return `<div class="status-entry ${type}">${entry}</div>`;
        })
        .join('\n');
    
    // Scroll to bottom
    statusLogElement.scrollTop = statusLogElement.scrollHeight;
}

// Reset simulation
function resetSimulation(): void {
    isPaused = false;
    initializeSimulation();
    addStatusLog('Simulation reset.', 'movement');
}

// Toggle pause
function togglePause(): void {
    isPaused = !isPaused;
    addStatusLog(isPaused ? 'Simulation paused.' : 'Simulation resumed.', 'info');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeSimulation();
    
    // Add control button listeners
    const resetBtn = document.getElementById('reset-btn');
    const pauseBtn = document.getElementById('pause-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }
    
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }
});