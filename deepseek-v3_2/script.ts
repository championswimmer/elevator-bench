// Configuration constants
const TOTAL_FLOORS = 10;
const TOTAL_ELEVATORS = 4;
const GROUND_FLOOR = 0;
const TOP_FLOOR = TOTAL_FLOORS - 1;
const MOVE_DELAY = 1000; // 1 second per floor movement

// Types
type Direction = 'up' | 'down' | 'idle';
type ElevatorStatus = 'idle' | 'moving' | 'stopped';

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloors: number[];
    direction: Direction;
    status: ElevatorStatus;
    floorRequests: Set<number>;
}

interface FloorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
}

// Global state
let elevators: Elevator[] = [];
let floorRequests: FloorRequest[] = [];
let animationInterval: number | null = null;

// Initialize the simulator
function initializeSimulator(): void {
    createElevators();
    createFloors();
    createElevatorControls();
    startAnimation();
    addStatusMessage('Simulator started. All elevators are idle at ground floor.');
}

// Create elevators
function createElevators(): void {
    elevators = Array.from({ length: TOTAL_ELEVATORS }, (_, i) => ({
        id: i,
        currentFloor: GROUND_FLOOR,
        targetFloors: [],
        direction: 'idle' as Direction,
        status: 'idle' as ElevatorStatus,
        floorRequests: new Set<number>()
    }));
}

// Create floor buttons
function createFloors(): void {
    const floorsList = document.getElementById('floors-list')!;
    floorsList.innerHTML = '';

    for (let floor = TOP_FLOOR; floor >= 0; floor--) {
        const floorItem = document.createElement('div');
        floorItem.className = 'floor-item';
        floorItem.innerHTML = `
            <div class="floor-label">Floor ${floor}</div>
            <div class="floor-buttons">
                ${floor < TOP_FLOOR ? `<button class="btn btn-up" data-floor="${floor}" data-direction="up">↑</button>` : ''}
                ${floor > GROUND_FLOOR ? `<button class="btn btn-down" data-floor="${floor}" data-direction="down">↓</button>` : ''}
            </div>
        `;
        floorsList.appendChild(floorItem);
    }

    // Add event listeners to floor buttons
    document.querySelectorAll('.btn-up, .btn-down').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            const floor = parseInt(target.dataset.floor!);
            const direction = target.dataset.direction as Direction;
            requestElevator(floor, direction);
        });
    });
}

// Create elevator controls
function createElevatorControls(): void {
    const elevatorsList = document.getElementById('elevators-list')!;
    elevatorsList.innerHTML = '';

    elevators.forEach(elevator => {
        const elevatorItem = document.createElement('div');
        elevatorItem.className = 'elevator-item idle';
        elevatorItem.id = `elevator-${elevator.id}`;
        
        let floorButtons = '';
        for (let floor = 0; floor < TOTAL_FLOORS; floor++) {
            floorButtons += `<button class="btn btn-floor" data-elevator="${elevator.id}" data-floor="${floor}">${floor}</button>`;
        }

        elevatorItem.innerHTML = `
            <div class="elevator-header">
                <div class="elevator-label">Elevator ${elevator.id}</div>
                <div class="elevator-status status-idle">IDLE</div>
            </div>
            <div class="elevator-position">${elevator.currentFloor}</div>
            <div class="elevator-controls">
                ${floorButtons}
            </div>
        `;
        elevatorsList.appendChild(elevatorItem);
    });

    // Add event listeners to elevator floor buttons
    document.querySelectorAll('.btn-floor').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            const elevatorId = parseInt(target.dataset.elevator!);
            const floor = parseInt(target.dataset.floor!);
            requestFloor(elevatorId, floor);
        });
    });
}

// Request an elevator from a floor
function requestElevator(floor: number, direction: Direction): void {
    // Check if request already exists
    const existingRequest = floorRequests.find(req => 
        req.floor === floor && req.direction === direction
    );
    
    if (existingRequest) {
        addStatusMessage(`Floor ${floor} ${direction.toUpperCase()} request already pending`);
        return;
    }

    const request: FloorRequest = {
        floor,
        direction,
        timestamp: Date.now()
    };

    floorRequests.push(request);
    addStatusMessage(`Floor ${floor} requested elevator going ${direction.toUpperCase()}`);

    // Try to assign immediately
    assignElevatorToRequest(request);
}

// Request a floor inside an elevator
function requestFloor(elevatorId: number, floor: number): void {
    const elevator = elevators[elevatorId];
    
    if (elevator.floorRequests.has(floor)) {
        addStatusMessage(`Elevator ${elevatorId}: Floor ${floor} already requested`);
        return;
    }

    elevator.floorRequests.add(floor);
    
    // Add to target floors if not already there
    if (!elevator.targetFloors.includes(floor)) {
        elevator.targetFloors.push(floor);
        sortTargetFloors(elevator);
    }

    addStatusMessage(`Elevator ${elevatorId}: Floor ${floor} requested`);
    updateElevatorDisplay(elevatorId);
}

// Assign an elevator to a floor request
function assignElevatorToRequest(request: FloorRequest): void {
    const { floor, direction } = request;

    // Find the best elevator for this request
    const bestElevator = findBestElevatorForRequest(request);
    
    if (bestElevator) {
        // Remove from floor requests
        floorRequests = floorRequests.filter(req => 
            !(req.floor === floor && req.direction === direction)
        );

        // Add to elevator's floor requests
        bestElevator.floorRequests.add(floor);
        
        // Add to target floors if not already there
        if (!bestElevator.targetFloors.includes(floor)) {
            bestElevator.targetFloors.push(floor);
            sortTargetFloors(bestElevator);
        }

        addStatusMessage(`Elevator ${bestElevator.id} assigned to floor ${floor} ${direction.toUpperCase()} request`);
        updateElevatorDisplay(bestElevator.id);
    }
}

// Find the best elevator for a request
function findBestElevatorForRequest(request: FloorRequest): Elevator | null {
    const { floor, direction } = request;
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of elevators) {
        const score = calculateElevatorScore(elevator, request);
        
        if (score < bestScore) {
            bestScore = score;
            bestElevator = elevator;
        }
    }

    return bestElevator;
}

// Calculate score for elevator assignment (lower is better)
function calculateElevatorScore(elevator: Elevator, request: FloorRequest): number {
    const { floor, direction } = request;
    
    // If elevator is idle, use distance
    if (elevator.status === 'idle') {
        return Math.abs(elevator.currentFloor - floor);
    }
    
    // If elevator is moving in the same direction and will pass the floor
    if (elevator.direction === direction) {
        if (direction === 'up' && elevator.currentFloor <= floor) {
            return floor - elevator.currentFloor;
        }
        if (direction === 'down' && elevator.currentFloor >= floor) {
            return elevator.currentFloor - floor;
        }
    }
    
    // If elevator is moving in opposite direction or won't pass the floor
    // Calculate distance after completing current direction
    let remainingDistance = 0;
    
    if (elevator.direction === 'up') {
        const highestTarget = Math.max(...elevator.targetFloors);
        remainingDistance = highestTarget - elevator.currentFloor;
    } else if (elevator.direction === 'down') {
        const lowestTarget = Math.min(...elevator.targetFloors);
        remainingDistance = elevator.currentFloor - lowestTarget;
    }
    
    return remainingDistance + Math.abs(elevator.currentFloor - floor);
}

// Sort target floors based on current direction
function sortTargetFloors(elevator: Elevator): void {
    if (elevator.direction === 'up') {
        elevator.targetFloors.sort((a, b) => a - b);
    } else if (elevator.direction === 'down') {
        elevator.targetFloors.sort((a, b) => b - a);
    }
}

// Update elevator movement
function updateElevatorMovement(): void {
    elevators.forEach(elevator => {
        if (elevator.targetFloors.length === 0) {
            // No targets, become idle
            if (elevator.status !== 'idle') {
                elevator.status = 'idle';
                elevator.direction = 'idle';
                addStatusMessage(`Elevator ${elevator.id} is now idle at floor ${elevator.currentFloor}`);
                updateElevatorDisplay(elevator.id);
            }
            return;
        }

        const nextFloor = elevator.targetFloors[0];
        
        // Determine direction
        if (nextFloor > elevator.currentFloor) {
            elevator.direction = 'up';
            elevator.status = 'moving';
        } else if (nextFloor < elevator.currentFloor) {
            elevator.direction = 'down';
            elevator.status = 'moving';
        } else {
            // Arrived at target floor
            elevator.targetFloors.shift();
            elevator.floorRequests.delete(elevator.currentFloor);
            elevator.status = 'stopped';
            
            addStatusMessage(`Elevator ${elevator.id} arrived at floor ${elevator.currentFloor}`);
            updateElevatorDisplay(elevator.id);
            
            // Process any pending floor requests for this elevator
            setTimeout(() => {
                elevator.status = 'moving';
                updateElevatorDisplay(elevator.id);
            }, 1000);
            
            return;
        }

        // Move elevator
        if (elevator.direction === 'up') {
            elevator.currentFloor++;
        } else if (elevator.direction === 'down') {
            elevator.currentFloor--;
        }

        updateElevatorDisplay(elevator.id);
    });

    // Process pending floor requests
    processPendingRequests();
}

// Process any pending floor requests
function processPendingRequests(): void {
    const unassignedRequests = [...floorRequests];
    
    for (const request of unassignedRequests) {
        assignElevatorToRequest(request);
    }
}

// Update elevator display in DOM
function updateElevatorDisplay(elevatorId: number): void {
    const elevator = elevators[elevatorId];
    const elevatorElement = document.getElementById(`elevator-${elevatorId}`)!;
    const positionElement = elevatorElement.querySelector('.elevator-position') as HTMLElement;
    const statusElement = elevatorElement.querySelector('.elevator-status') as HTMLElement;
    
    // Update position with animation
    positionElement.classList.add('elevator-moving');
    setTimeout(() => {
        positionElement.textContent = elevator.currentFloor.toString();
        positionElement.classList.remove('elevator-moving');
    }, 250);

    // Update status and styling
    elevatorElement.className = `elevator-item ${elevator.status}`;
    statusElement.textContent = elevator.status.toUpperCase();
    statusElement.className = `elevator-status status-${elevator.status}`;
    
    if (elevator.status === 'moving') {
        statusElement.textContent = `${elevator.direction.toUpperCase()}`;
    }

    // Update floor buttons
    elevatorElement.querySelectorAll('.btn-floor').forEach(button => {
        const floor = parseInt((button as HTMLButtonElement).dataset.floor!);
        if (elevator.floorRequests.has(floor)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Add status message
function addStatusMessage(message: string): void {
    const statusContainer = document.getElementById('status-container')!;
    const messageElement = document.createElement('div');
    messageElement.className = 'status-message new';
    messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    
    statusContainer.appendChild(messageElement);
    statusContainer.scrollTop = statusContainer.scrollHeight;
    
    // Remove 'new' class after animation
    setTimeout(() => {
        messageElement.classList.remove('new');
    }, 1000);
}

// Start animation loop
function startAnimation(): void {
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    animationInterval = setInterval(updateElevatorMovement, MOVE_DELAY);
}

// Stop animation
function stopAnimation(): void {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSimulator);

// Export for testing (if needed)
export {
    initializeSimulator,
    requestElevator,
    requestFloor,
    updateElevatorMovement,
    elevators,
    floorRequests
};