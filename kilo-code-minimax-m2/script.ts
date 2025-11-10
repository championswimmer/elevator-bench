// Elevator Simulator TypeScript Implementation

// Constants
const NUM_FLOORS = 10; // Floors 0-9
const NUM_ELEVATORS = 4; // Elevators 0-3
const FLOOR_HEIGHT = 30; // pixels per floor for animation
const MOVEMENT_SPEED = 1000; // milliseconds per floor

// Types
type Direction = 'up' | 'down' | null;
type ElevatorStatus = 'idle' | 'moving' | 'busy';

interface FloorRequest {
    floor: number;
    direction: Direction;
    timestamp: number;
    assigned: boolean;
}

interface ElevatorState {
    id: number;
    currentFloor: number;
    targetFloor: number | null;
    status: ElevatorStatus;
    direction: Direction;
    queue: number[]; // Destination floors
    isMoving: boolean;
}

// Global state
let elevators: ElevatorState[] = [];
let floorRequests: FloorRequest[] = [];
let requestQueue: FloorRequest[] = [];

// Initialize elevators
function initializeElevators(): void {
    elevators = [];
    for (let i = 0; i < NUM_ELEVATORS; i++) {
        elevators.push({
            id: i,
            currentFloor: 0,
            targetFloor: null,
            status: 'idle',
            direction: null,
            queue: [],
            isMoving: false
        });
    }
}

// Calculate position for elevator animation
function getElevatorPosition(floor: number): number {
    // Elevator starts at bottom (floor 0) and moves up
    // Each floor is FLOOR_HEIGHT pixels tall
    return (NUM_FLOORS - 1 - floor) * FLOOR_HEIGHT;
}

// Update elevator visual position
function updateElevatorPosition(elevatorId: number, targetFloor: number): Promise<void> {
    return new Promise((resolve) => {
        const elevatorCar = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`) as HTMLElement;
        if (!elevatorCar) {
            resolve();
            return;
        }

        // Add moving class for visual feedback
        elevatorCar.classList.add('moving');

        // Calculate position (bottom-anchored)
        const targetPosition = getElevatorPosition(targetFloor);
        const currentPosition = parseInt(elevatorCar.style.bottom || '0');
        const distance = Math.abs(targetFloor - elevators[elevatorId].currentFloor);
        const duration = distance * MOVEMENT_SPEED;

        // Animate using CSS transition
        elevatorCar.style.transition = `bottom ${duration}ms ease-in-out`;
        elevatorCar.style.bottom = `${targetPosition}px`;

        // Update internal state
        elevators[elevatorId].currentFloor = targetFloor;
        elevators[elevatorId].isMoving = true;

        // Update UI
        updateElevatorUI(elevatorId);

        // Resolve after animation completes
        setTimeout(() => {
            elevatorCar.classList.remove('moving');
            elevators[elevatorId].isMoving = false;
            updateElevatorUI(elevatorId);
            resolve();
        }, duration + 100);
    });
}

// Update elevator UI
function updateElevatorUI(elevatorId: number): void {
    const elevator = elevators[elevatorId];
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    
    if (!elevatorElement) return;

    // Update current floor display
    const currentFloorSpan = elevatorElement.querySelector('.current-floor') as HTMLElement;
    if (currentFloorSpan) {
        currentFloorSpan.textContent = `Floor: ${elevator.currentFloor}`;
    }

    // Update status
    const statusSpan = elevatorElement.querySelector('.status') as HTMLElement;
    if (statusSpan) {
        statusSpan.textContent = elevator.status;
        statusSpan.className = `status ${elevator.status}`;
    }

    // Update elevator indicator
    const indicator = elevatorElement.querySelector('.elevator-indicator') as HTMLElement;
    if (indicator) {
        indicator.textContent = elevator.currentFloor.toString();
    }
}

// Find closest idle elevator in the right direction
function findBestElevator(floor: number, direction: Direction): number | null {
    const idleElevators = elevators.filter(e => e.status === 'idle');
    
    if (idleElevators.length === 0) return null;

    // For ground floor (0), prefer elevators going up or closest ones
    if (floor === 0) {
        return idleElevators.reduce((best, current) => 
            Math.abs(current.currentFloor - floor) < Math.abs(best.currentFloor - floor) ? current : best
        ).id;
    }

    // For other floors, prioritize elevators in the same direction or closest
    let candidates = idleElevators;
    
    // If direction is specified, prefer elevators in the same direction
    if (direction) {
        const sameDirection = idleElevators.filter(e => {
            if (e.direction === null) return true; // Idle elevators can go either way
            return e.direction === direction;
        });
        
        if (sameDirection.length > 0) {
            candidates = sameDirection;
        }
    }

    // Return the closest candidate
    return candidates.reduce((best, current) => 
        Math.abs(current.currentFloor - floor) < Math.abs(best.currentFloor - floor) ? current : best
    ).id;
}

// Assign floor request to elevator
function assignRequestToElevator(request: FloorRequest): void {
    const elevatorId = findBestElevator(request.floor, request.direction);
    
    if (elevatorId !== null) {
        // Assign to available elevator
        const elevator = elevators[elevatorId];
        if (elevator.queue.length === 0 && elevator.status === 'idle') {
            // Elevator is completely idle, start moving immediately
            startElevatorToFloor(elevatorId, request.floor);
        } else {
            // Add to queue
            elevator.queue.push(request.floor);
            request.assigned = true;
            highlightDestinationButton(elevatorId, request.floor);
        }
    } else {
        // No elevator available, add to request queue
        requestQueue.push(request);
        updateRequestQueueDisplay();
    }
}

// Start elevator moving to a specific floor
function startElevatorToFloor(elevatorId: number, targetFloor: number): Promise<void> {
    const elevator = elevators[elevatorId];
    
    if (elevator.status !== 'idle' && !elevator.isMoving) {
        console.warn(`Elevator ${elevatorId} is busy`);
        return Promise.resolve();
    }

    elevator.targetFloor = targetFloor;
    elevator.status = 'moving';
    elevator.direction = targetFloor > elevator.currentFloor ? 'up' : 'down';
    
    updateElevatorUI(elevatorId);
    
    return updateElevatorPosition(elevatorId, targetFloor).then(() => {
        // Arrived at destination
        processElevatorArrival(elevatorId, targetFloor);
    });
}

// Process elevator arrival at floor
function processElevatorArrival(elevatorId: number, arrivedFloor: number): void {
    const elevator = elevators[elevatorId];
    
    // Clear destination if it matches
    if (elevator.targetFloor === arrivedFloor) {
        elevator.targetFloor = null;
    }

    // Remove from queue
    const queueIndex = elevator.queue.indexOf(arrivedFloor);
    if (queueIndex !== -1) {
        elevator.queue.splice(queueIndex, 1);
        clearDestinationButton(elevatorId, arrivedFloor);
    }

    // Process pending requests for this floor
    processFloorRequests(arrivedFloor);

    // Check if there are more destinations
    if (elevator.queue.length > 0) {
        const nextFloor = elevator.queue[0];
        startElevatorToFloor(elevatorId, nextFloor);
    } else {
        // No more destinations, set to idle
        elevator.status = 'idle';
        elevator.direction = null;
        updateElevatorUI(elevatorId);
        
        // Process any waiting requests
        processWaitingRequests();
    }
}

// Process pending floor requests
function processFloorRequests(floor: number): void {
    // Clear floor request buttons
    const floorRow = document.querySelector(`.floor-row[data-floor="${floor}"]`);
    if (floorRow) {
        const buttons = floorRow.querySelectorAll('.floor-btn');
        buttons.forEach(btn => {
            btn.classList.remove('requested');
        });
    }

    // Remove processed requests
    floorRequests = floorRequests.filter(req => req.floor !== floor || req.assigned);
}

// Process any waiting requests in the queue
function processWaitingRequests(): void {
    if (requestQueue.length === 0) return;

    const availableElevator = elevators.find(e => e.status === 'idle');
    if (!availableElevator) return;

    const request = requestQueue.shift();
    if (request) {
        assignRequestToElevator(request);
        updateRequestQueueDisplay();
    }
}

// Handle floor button click
function handleFloorButtonClick(floor: number, direction: Direction, button: HTMLElement): void {
    // Add visual feedback
    button.classList.add('requested');

    // Create request
    const request: FloorRequest = {
        floor,
        direction,
        timestamp: Date.now(),
        assigned: false
    };

    // Add to pending requests
    floorRequests.push(request);

    // Try to assign to elevator
    assignRequestToElevator(request);
}

// Handle elevator control button click
function handleElevatorControlClick(elevatorId: number, floor: number, button: HTMLElement): void {
    const elevator = elevators[elevatorId];
    
    // Add visual feedback
    button.classList.add('selected', 'destination');
    
    if (elevator.status === 'idle' && !elevator.isMoving) {
        // Start moving immediately
        startElevatorToFloor(elevatorId, floor);
    } else {
        // Add to queue
        if (!elevator.queue.includes(floor)) {
            elevator.queue.push(floor);
            highlightDestinationButton(elevatorId, floor);
        }
    }
}

// Highlight destination button in elevator
function highlightDestinationButton(elevatorId: number, floor: number): void {
    const button = document.querySelector(
        `.elevator[data-elevator="${elevatorId}"] .control-btn[data-floor="${floor}"]`
    ) as HTMLElement;
    if (button) {
        button.classList.add('destination');
    }
}

// Clear destination button
function clearDestinationButton(elevatorId: number, floor: number): void {
    const button = document.querySelector(
        `.elevator[data-elevator="${elevatorId}"] .control-btn[data-floor="${floor}"]`
    ) as HTMLElement;
    if (button) {
        button.classList.remove('selected', 'destination');
    }
}

// Update request queue display
function updateRequestQueueDisplay(): void {
    const queueContent = document.getElementById('queue-content');
    if (!queueContent) return;

    if (requestQueue.length === 0) {
        queueContent.innerHTML = '<span class="empty-queue">No pending requests</span>';
        return;
    }

    queueContent.innerHTML = requestQueue.map(req => 
        `<span class="queue-item">Floor ${req.floor} (${req.direction})</span>`
    ).join('');
}

// Event listeners setup
function setupEventListeners(): void {
    // Floor button listeners
    document.querySelectorAll('.floor-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const floor = parseInt(target.closest('.floor-row')?.getAttribute('data-floor') || '0');
            const direction = target.getAttribute('data-direction') as Direction;
            
            handleFloorButtonClick(floor, direction, target);
        });
    });

    // Elevator control button listeners
    document.querySelectorAll('.control-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const elevatorId = parseInt(target.closest('.elevator')?.getAttribute('data-elevator') || '0');
            const floor = parseInt(target.getAttribute('data-floor') || '0');
            
            handleElevatorControlClick(elevatorId, floor, target);
        });
    });
}

// Initialize the application
function initialize(): void {
    console.log('Initializing Elevator Simulator...');
    
    // Initialize elevator states
    initializeElevators();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial UI update
    elevators.forEach(elevator => updateElevatorUI(elevator.id));
    
    console.log('Elevator Simulator initialized with:');
    console.log(`- ${NUM_FLOORS} floors (0-${NUM_FLOORS - 1})`);
    console.log(`- ${NUM_ELEVATORS} elevators`);
    console.log('All elevators start at ground floor (0) and are idle.');
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Export functions for debugging (if needed)
if (typeof window !== 'undefined') {
    (window as any).elevatorSimulator = {
        elevators,
        floorRequests,
        requestQueue,
        initialize,
        startElevatorToFloor,
        updateElevatorPosition,
        handleFloorButtonClick,
        handleElevatorControlClick
    };
}