/**
 * Elevator Simulator - Main TypeScript Entry Point
 * 
 * This is the main entry point for the Elevator Simulator application.
 * It handles initialization, event handling, DOM updates, and state management.
 */

// Import classes from their respective .ts files
import { Floor } from './Floor';
import { Elevator, ElevatorState, RequestType } from './Elevator';
import { Building, TOTAL_FLOORS, TOTAL_ELEVATORS, ELEVATOR_MOVE_TIME } from './Building';

// ============================================================================
// Configuration Constants
// ============================================================================

// Building configuration
const BUILDING_FLOORS = TOTAL_FLOORS;      // floors 0-9
const BUILDING_ELEVATORS = TOTAL_ELEVATORS; // elevators 0-3
const MOVE_TIME = ELEVATOR_MOVE_TIME;       // ms per floor movement

// ============================================================================
// Global State
// ============================================================================

let building: Building | null = null;
let elevatorTimers: Map<number, ReturnType<typeof setInterval>> = new Map();

// ============================================================================
// DOM Element References
// ============================================================================

/**
 * Get all DOM elements needed for the simulator
 */
function getDOMElements(): {
    buildingElement: HTMLElement | null;
    elevatorsContainer: HTMLElement | null;
    floorsContainer: HTMLElement | null;
    statusPanel: HTMLElement | null;
    requestQueue: HTMLElement | null;
} {
    return {
        buildingElement: document.getElementById('building'),
        elevatorsContainer: document.getElementById('elevators-container'),
        floorsContainer: document.getElementById('floors-container'),
        statusPanel: document.getElementById('status-panel'),
        requestQueue: document.getElementById('request-queue')
    };
}

// ============================================================================
// DOM Update Functions
// ============================================================================

/**
 * Update elevator position in the DOM
 */
function updateElevatorPosition(elevator: Elevator): void {
    const elevatorElement = document.getElementById(`elevator-${elevator.getElevatorId()}`);
    if (!elevatorElement) return;

    // Calculate bottom position based on floor (floor 0 = bottom)
    const bottomPosition = elevator.getCurrentFloor() * 10; // 10% per floor
    elevatorElement.style.bottom = `${bottomPosition}%`;

    // Update elevator state display
    const stateElement = elevatorElement.querySelector('.elevator-state');
    if (stateElement) {
        stateElement.textContent = elevator.getStatusString();
    }

    // Update elevator color based on state
    elevatorElement.classList.remove('idle', 'moving-up', 'moving-down');
    elevatorElement.classList.add(elevator.getState().replace('_', '-'));

    // Update button states in elevator
    updateElevatorButtonStates(elevator);
}

/**
 * Update elevator interior button states
 */
function updateElevatorButtonStates(elevator: Elevator): void {
    const elevatorElement = document.getElementById(`elevator-${elevator.getElevatorId()}`);
    if (!elevatorElement) return;

    const buttons = elevatorElement.querySelectorAll('.elevator-btn');
    buttons.forEach((button) => {
        const floorNum = parseInt(button.getAttribute('data-floor') || '0');
        const isTarget = elevator.getTargetFloors().has(floorNum);
        
        if (isTarget) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * Update floor button states
 */
function updateFloorButtonStates(): void {
    if (!building) return;

    for (let floorNum = 0; floorNum < BUILDING_FLOORS; floorNum++) {
        const floor = building.getFloor(floorNum);
        if (!floor) continue;

        const floorElement = document.getElementById(`floor-${floorNum}`);
        if (!floorElement) continue;

        // Update up button
        const upButton = floorElement.querySelector('.up-btn');
        if (upButton) {
            if (floor.getUpButtonActive()) {
                upButton.classList.add('active');
            } else {
                upButton.classList.remove('active');
            }
        }

        // Update down button
        const downButton = floorElement.querySelector('.down-btn');
        if (downButton) {
            if (floor.getDownButtonActive()) {
                downButton.classList.add('active');
            } else {
                downButton.classList.remove('active');
            }
        }
    }
}

/**
 * Update status panel with current statistics
 */
function updateStatusPanel(): void {
    if (!building) return;

    const elements = getDOMElements();
    const stats = building.getStats();

    if (elements.statusPanel) {
        elements.statusPanel.innerHTML = `
            <div class="stat">
                <span class="stat-label">Total Elevators:</span>
                <span class="stat-value">${stats.totalElevators}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Busy Elevators:</span>
                <span class="stat-value">${stats.busyElevators}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Idle Elevators:</span>
                <span class="stat-value">${stats.idleElevators}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Queued Requests:</span>
                <span class="stat-value">${stats.queuedRequests}</span>
            </div>
        `;
    }
}

/**
 * Update request queue display
 */
function updateRequestQueue(): void {
    if (!building) return;

    const elements = getDOMElements();
    const queue = building.getRequestQueue();

    if (elements.requestQueue) {
        if (queue.length === 0) {
            elements.requestQueue.innerHTML = '<p>No pending requests</p>';
        } else {
            elements.requestQueue.innerHTML = queue.map((request, index) => `
                <div class="queue-item">
                    <span>#${index + 1}</span>
                    <span>Floor ${request.floor}</span>
                    <span>${getRequestTypeLabel(request.requestType)}</span>
                    <span class="queue-time">${new Date(request.timestamp).toLocaleTimeString()}</span>
                </div>
            `).join('');
        }
    }
}

/**
 * Get human-readable label for request type
 */
function getRequestTypeLabel(requestType: RequestType): string {
    switch (requestType) {
        case RequestType.FLOOR_REQUEST:
            return 'Direct';
        case RequestType.UP_REQUEST:
            return '↑ Up';
        case RequestType.DOWN_REQUEST:
            return '↓ Down';
        default:
            return 'Unknown';
    }
}

/**
 * Update all UI elements to reflect current state
 */
function updateAllDisplays(): void {
    if (!building) return;

    // Update all elevators
    building.getElevators().forEach(elevator => {
        updateElevatorPosition(elevator);
    });

    // Update floor buttons
    updateFloorButtonStates();

    // Update status panel
    updateStatusPanel();

    // Update request queue
    updateRequestQueue();
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Handle floor request button click
 */
function handleFloorRequest(floorNumber: number, requestType: RequestType): void {
    if (!building) return;

    const floor = building.getFloor(floorNumber);
    if (!floor) return;

    // Update floor button state
    if (requestType === RequestType.UP_REQUEST) {
        floor.setUpButtonActive(true);
    } else if (requestType === RequestType.DOWN_REQUEST) {
        floor.setDownButtonActive(true);
    }

    // Add request to building
    building.addFloorRequest(floorNumber, requestType);

    // Update UI
    updateFloorButtonStates();
    updateRequestQueue();
}

/**
 * Handle elevator interior button click
 */
function handleElevatorButton(elevatorId: number, floorNumber: number): void {
    if (!building) return;

    const elevator = building.getElevator(elevatorId);
    if (!elevator) return;

    // Add floor as target
    elevator.addTargetFloor(floorNumber);

    // If elevator is idle, start moving
    if (elevator.getState() === ElevatorState.IDLE) {
        if (floorNumber > elevator.getCurrentFloor()) {
            elevator.setState(ElevatorState.MOVING_UP);
            elevator.setDirection(1);
        } else if (floorNumber < elevator.getCurrentFloor()) {
            elevator.setState(ElevatorState.MOVING_DOWN);
            elevator.setDirection(-1);
        }
        
        // Start moving the elevator
        moveElevator(elevator);
    }

    // Update UI
    updateElevatorPosition(elevator);
    updateStatusPanel();
}

/**
 * Move elevator towards its target
 */
function moveElevator(elevator: Elevator): void {
    // Clear any existing timer for this elevator
    if (elevatorTimers.has(elevator.getElevatorId())) {
        clearInterval(elevatorTimers.get(elevator.getElevatorId()));
    }

    const moveInterval = setInterval(() => {
        if (!building) {
            clearInterval(moveInterval);
            return;
        }

        const currentFloor = elevator.getCurrentFloor();
        const targets = Array.from(elevator.getTargetFloors());

        if (targets.length === 0) {
            elevator.setState(ElevatorState.IDLE);
            elevator.setDirection(0);
            updateElevatorPosition(elevator);
            clearInterval(moveInterval);
            elevatorTimers.delete(elevator.getElevatorId());
            return;
        }

        // Find next target based on direction
        let nextTarget: number | null = null;

        if (elevator.getDirection() === 1) {
            // Moving up - find closest floor above current
            nextTarget = targets.find(f => f >= currentFloor) || Math.min(...targets);
        } else if (elevator.getDirection() === -1) {
            // Moving down - find closest floor below current
            nextTarget = targets.filter(f => f <= currentFloor).pop() || Math.max(...targets);
        }

        if (nextTarget === null) {
            clearInterval(moveInterval);
            elevatorTimers.delete(elevator.getElevatorId());
            return;
        }

        // Move one floor
        if (nextTarget > currentFloor) {
            elevator.setCurrentFloor(currentFloor + 1);
        } else if (nextTarget < currentFloor) {
            elevator.setCurrentFloor(currentFloor - 1);
        } else {
            // Arrived at target floor
            building.handleElevatorArrival(elevator.getElevatorId(), currentFloor);
            
            // Check if there are more targets
            if (elevator.getTargetFloors().size === 0) {
                elevator.setState(ElevatorState.IDLE);
                elevator.setDirection(0);
                clearInterval(moveInterval);
                elevatorTimers.delete(elevator.getElevatorId());
            } else {
                // Continue to next target
                const newNextTarget = elevator.getNextTargetFloor();
                if (newNextTarget !== null) {
                    if (newNextTarget > elevator.getCurrentFloor()) {
                        elevator.setDirection(1);
                    } else if (newNextTarget < elevator.getCurrentFloor()) {
                        elevator.setDirection(-1);
                    }
                }
            }
        }

        updateElevatorPosition(elevator);
        updateStatusPanel();

    }, MOVE_TIME);

    elevatorTimers.set(elevator.getElevatorId(), moveInterval);
}

// ============================================================================
// Event Listener Setup
// ============================================================================

/**
 * Set up event listeners for floor request buttons
 */
function setupFloorRequestListeners(): void {
    for (let floorNum = 0; floorNum < BUILDING_FLOORS; floorNum++) {
        const floorElement = document.getElementById(`floor-${floorNum}`);
        if (!floorElement) continue;

        // Up button
        const upButton = floorElement.querySelector('.up-btn');
        if (upButton) {
            upButton.addEventListener('click', () => {
                handleFloorRequest(floorNum, RequestType.UP_REQUEST);
            });
        }

        // Down button
        const downButton = floorElement.querySelector('.down-btn');
        if (downButton) {
            downButton.addEventListener('click', () => {
                handleFloorRequest(floorNum, RequestType.DOWN_REQUEST);
            });
        }
    }
}

/**
 * Set up event listeners for elevator interior buttons
 */
function setupElevatorButtonListeners(): void {
    for (let elevatorId = 0; elevatorId < BUILDING_ELEVATORS; elevatorId++) {
        const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
        if (!elevatorElement) continue;

        const buttons = elevatorElement.querySelectorAll('.elevator-btn');
        buttons.forEach((button) => {
            button.addEventListener('click', () => {
                const floorNum = parseInt(button.getAttribute('data-floor') || '0');
                handleElevatorButton(elevatorId, floorNum);
            });
        });
    }
}

/**
 * Set up reset button listener
 */
function setupResetListener(): void {
    const resetButton = document.getElementById('reset-btn');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (!building) return;

            // Clear all timers
            elevatorTimers.forEach((timer) => {
                clearInterval(timer);
            });
            elevatorTimers.clear();

            // Reset building
            building.reset();

            // Update all displays
            updateAllDisplays();
        });
    }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the simulator
 */
function initializeSimulator(): void {
    // Create building instance
    building = new Building();

    // Set up event listeners
    setupFloorRequestListeners();
    setupElevatorButtonListeners();
    setupResetListener();

    // Initial UI update
    updateAllDisplays();

    console.log('Elevator Simulator initialized');
    console.log(`Building: ${BUILDING_FLOORS} floors, ${BUILDING_ELEVATORS} elevators`);
    console.log(`Move time: ${MOVE_TIME}ms per floor`);
}

/**
 * Initialize when DOM is ready
 */
function whenDOMReady(callback: () => void): void {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// ============================================================================
// Main Entry Point
// ============================================================================

// Initialize when DOM is ready
whenDOMReady(() => {
    initializeSimulator();
});

// Export for potential external use
export { building, initializeSimulator, updateAllDisplays };
