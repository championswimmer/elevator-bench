// Configuration constants
const CONFIG = {
    FLOORS: 10,
    ELEVATORS: 4,
    MOVE_TIME: 1000, // milliseconds per floor
    DOOR_TIME: 500, // milliseconds for door operations
};

// Types
interface ElevatorRequest {
    floor: number;
    direction: 'up' | 'down';
    timestamp: number;
}

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloor: number;
    direction: 'up' | 'down' | 'idle';
    status: 'moving' | 'stopped' | 'idle';
    requests: number[];
    isMoving: boolean;
}

// Global state
let elevators: Elevator[] = [];
let pendingRequests: ElevatorRequest[] = [];
let isSimulationRunning = false;

// DOM elements
let floorsContainer: HTMLElement;
let elevatorsContainer: HTMLElement;
let statusLog: HTMLElement;

// Initialize the simulation
function init() {
    // Get DOM elements
    floorsContainer = document.getElementById('floors-container')!;
    elevatorsContainer = document.getElementById('elevators-container')!;
    statusLog = document.getElementById('status-log')!;

    // Initialize elevators
    for (let i = 0; i < CONFIG.ELEVATORS; i++) {
        elevators.push({
            id: i,
            currentFloor: 0,
            targetFloor: 0,
            direction: 'idle',
            status: 'idle',
            requests: [],
            isMoving: false,
        });
    }

    // Create UI
    createFloorsUI();
    createElevatorsUI();

    // Add event listeners
    document.getElementById('reset-btn')!.addEventListener('click', resetSimulation);
    document.getElementById('add-request-btn')!.addEventListener('click', addRandomRequest);

    // Start simulation
    isSimulationRunning = true;
    logStatus('Simulation started');
    
    // Start the main simulation loop
    setInterval(simulate, 100);
}

// Create floors UI
function createFloorsUI() {
    floorsContainer.innerHTML = '';
    
    for (let floor = CONFIG.FLOORS - 1; floor >= 0; floor--) {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${floor}`;
        
        const floorInfo = document.createElement('div');
        floorInfo.className = 'floor-info';
        
        const floorNumber = document.createElement('div');
        floorNumber.className = 'floor-number';
        floorNumber.textContent = `Floor ${floor}`;
        
        const floorButtons = document.createElement('div');
        floorButtons.className = 'floor-buttons';
        
        // Add up button (not for top floor)
        if (floor < CONFIG.FLOORS - 1) {
            const upBtn = document.createElement('button');
            upBtn.className = 'floor-btn up';
            upBtn.textContent = '↑ UP';
            upBtn.addEventListener('click', () => requestElevator(floor, 'up'));
            floorButtons.appendChild(upBtn);
        }
        
        // Add down button (not for ground floor)
        if (floor > 0) {
            const downBtn = document.createElement('button');
            downBtn.className = 'floor-btn down';
            downBtn.textContent = '↓ DOWN';
            downBtn.addEventListener('click', () => requestElevator(floor, 'down'));
            floorButtons.appendChild(downBtn);
        }
        
        floorInfo.appendChild(floorNumber);
        floorInfo.appendChild(floorButtons);
        floorDiv.appendChild(floorInfo);
        floorsContainer.appendChild(floorDiv);
    }
}

// Create elevators UI
function createElevatorsUI() {
    elevatorsContainer.innerHTML = '';
    
    elevators.forEach((elevator, index) => {
        const elevatorDiv = document.createElement('div');
        elevatorDiv.className = 'elevator';
        elevatorDiv.id = `elevator-${index}`;
        
        const header = document.createElement('div');
        header.className = 'elevator-header';
        header.textContent = `Elevator ${index}`;
        
        const display = document.createElement('div');
        display.className = 'elevator-display';
        
        const floorDisplay = document.createElement('div');
        floorDisplay.className = 'elevator-floor';
        floorDisplay.id = `elevator-${index}-floor`;
        floorDisplay.textContent = elevator.currentFloor.toString();
        
        const directionDisplay = document.createElement('div');
        directionDisplay.className = 'elevator-direction';
        directionDisplay.id = `elevator-${index}-direction`;
        directionDisplay.textContent = '●';
        
        display.appendChild(floorDisplay);
        display.appendChild(directionDisplay);
        
        const buttons = document.createElement('div');
        buttons.className = 'elevator-buttons';
        
        for (let floor = 0; floor < CONFIG.FLOORS; floor++) {
            const btn = document.createElement('button');
            btn.className = 'elevator-btn';
            btn.textContent = floor.toString();
            btn.addEventListener('click', () => selectFloor(index, floor));
            buttons.appendChild(btn);
        }
        
        elevatorDiv.appendChild(header);
        elevatorDiv.appendChild(display);
        elevatorDiv.appendChild(buttons);
        elevatorsContainer.appendChild(elevatorDiv);
    });
}

// Request elevator from floor
function requestElevator(floor: number, direction: 'up' | 'down') {
    const request: ElevatorRequest = {
        floor,
        direction,
        timestamp: Date.now(),
    };
    
    pendingRequests.push(request);
    logStatus(`Request: Floor ${floor} going ${direction}`);
    
    // Visual feedback
    const btn = document.querySelector(`#floor-${floor} .floor-btn.${direction}`) as HTMLButtonElement;
    if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 200);
    }
}

// Select floor from inside elevator
function selectFloor(elevatorId: number, floor: number) {
    const elevator = elevators[elevatorId];
    
    if (elevator.requests.includes(floor)) {
        return; // Already requested
    }
    
    elevator.requests.push(floor);
    logStatus(`Elevator ${elevatorId}: Floor ${floor} selected`);
    
    // Visual feedback
    const btn = document.querySelector(`#elevator-${elevatorId} .elevator-btn:nth-child(${floor + 1})`) as HTMLButtonElement;
    if (btn) {
        btn.classList.add('active', 'pressed');
        setTimeout(() => btn.classList.remove('pressed'), 200);
    }
}

// Find best elevator for request
function findBestElevator(request: ElevatorRequest): number | null {
    let bestElevator: number | null = null;
    let bestScore = Infinity;
    
    elevators.forEach((elevator, index) => {
        if (elevator.status === 'idle') {
            // Idle elevator - calculate distance
            const distance = Math.abs(elevator.currentFloor - request.floor);
            if (distance < bestScore) {
                bestScore = distance;
                bestElevator = index;
            }
        } else if (elevator.direction === request.direction) {
            // Moving in same direction - check if it can service this request
            if (request.direction === 'up' && elevator.currentFloor <= request.floor) {
                const distance = request.floor - elevator.currentFloor;
                if (distance < bestScore) {
                    bestScore = distance;
                    bestElevator = index;
                }
            } else if (request.direction === 'down' && elevator.currentFloor >= request.floor) {
                const distance = elevator.currentFloor - request.floor;
                if (distance < bestScore) {
                    bestScore = distance;
                    bestElevator = index;
                }
            }
        }
    });
    
    return bestElevator;
}

// Assign pending requests to elevators
function assignRequests() {
    const unassignedRequests: ElevatorRequest[] = [];
    
    pendingRequests.forEach(request => {
        const bestElevator = findBestElevator(request);
        
        if (bestElevator !== null) {
            const elevator = elevators[bestElevator];
            if (!elevator.requests.includes(request.floor)) {
                elevator.requests.push(request.floor);
                logStatus(`Assigned floor ${request.floor} to elevator ${bestElevator}`);
            }
        } else {
            unassignedRequests.push(request);
        }
    });
    
    pendingRequests = unassignedRequests;
}

// Move elevator
function moveElevator(elevatorId: number) {
    const elevator = elevators[elevatorId];
    
    if (elevator.requests.length === 0) {
        elevator.status = 'idle';
        elevator.direction = 'idle';
        elevator.isMoving = false;
        return;
    }
    
    // Determine next target floor
    if (elevator.direction === 'idle') {
        // Find closest request
        let closestFloor = elevator.requests[0];
        let minDistance = Math.abs(elevator.currentFloor - closestFloor);
        
        elevator.requests.forEach(floor => {
            const distance = Math.abs(elevator.currentFloor - floor);
            if (distance < minDistance) {
                minDistance = distance;
                closestFloor = floor;
            }
        });
        
        elevator.targetFloor = closestFloor;
        elevator.direction = elevator.currentFloor < closestFloor ? 'up' : 'down';
    }
    
    // Move towards target
    if (elevator.currentFloor !== elevator.targetFloor) {
        elevator.status = 'moving';
        elevator.isMoving = true;
        
        // Move one floor at a time
        if (elevator.currentFloor < elevator.targetFloor) {
            elevator.currentFloor++;
            elevator.direction = 'up';
        } else {
            elevator.currentFloor--;
            elevator.direction = 'down';
        }
        
        logStatus(`Elevator ${elevatorId}: Moving to floor ${elevator.currentFloor}`);
        
        // Remove reached floor from requests
        elevator.requests = elevator.requests.filter(floor => floor !== elevator.currentFloor);
    } else {
        // Reached target floor
        elevator.status = 'stopped';
        elevator.isMoving = false;
        logStatus(`Elevator ${elevatorId}: Arrived at floor ${elevator.currentFloor}`);
        
        // Remove current floor from requests
        elevator.requests = elevator.requests.filter(floor => floor !== elevator.currentFloor);
    }
}

// Update elevator UI
function updateElevatorUI(elevatorId: number) {
    const elevator = elevators[elevatorId];
    
    // Update floor display
    const floorDisplay = document.getElementById(`elevator-${elevatorId}-floor`);
    if (floorDisplay) {
        floorDisplay.textContent = elevator.currentFloor.toString();
    }
    
    // Update direction display
    const directionDisplay = document.getElementById(`elevator-${elevatorId}-direction`);
    if (directionDisplay) {
        let directionSymbol = '●';
        if (elevator.direction === 'up') directionSymbol = '↑';
        else if (elevator.direction === 'down') directionSymbol = '↓';
        directionDisplay.textContent = directionSymbol;
    }
    
    // Update elevator visual state
    const elevatorDiv = document.getElementById(`elevator-${elevatorId}`);
    if (elevatorDiv) {
        if (elevator.isMoving) {
            elevatorDiv.classList.add('moving');
        } else {
            elevatorDiv.classList.remove('moving');
        }
    }
    
    // Update button states
    const buttons = document.querySelectorAll(`#elevator-${elevatorId} .elevator-btn`);
    buttons.forEach((btn, index) => {
        if (elevator.requests.includes(index)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Main simulation loop
function simulate() {
    if (!isSimulationRunning) return;
    
    // Assign pending requests
    assignRequests();
    
    // Move elevators
    elevators.forEach((elevator, index) => {
        moveElevator(index);
        updateElevatorUI(index);
    });
}

// Add random request for testing
function addRandomRequest() {
    const floor = Math.floor(Math.random() * CONFIG.FLOORS);
    const direction = Math.random() > 0.5 ? 'up' : 'down';
    requestElevator(floor, direction);
}

// Reset simulation
function resetSimulation() {
    elevators.forEach((elevator, index) => {
        elevator.currentFloor = 0;
        elevator.targetFloor = 0;
        elevator.direction = 'idle';
        elevator.status = 'idle';
        elevator.requests = [];
        elevator.isMoving = false;
        updateElevatorUI(index);
    });
    
    pendingRequests = [];
    logStatus('Simulation reset');
}

// Log status message
function logStatus(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'status-entry';
    entry.textContent = `[${timestamp}] ${message}`;
    
    statusLog.appendChild(entry);
    statusLog.scrollTop = statusLog.scrollHeight;
    
    // Keep only last 50 messages
    while (statusLog.children.length > 50) {
        statusLog.removeChild(statusLog.firstChild!);
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', init);