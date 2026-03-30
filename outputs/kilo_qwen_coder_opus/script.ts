import { Building } from './building';
import { Elevator } from './elevator';
import { Floor } from './floor';
import { Direction, BuildingConfig } from './types';

// Configuration
const CONFIG: BuildingConfig = {
    totalFloors: 10,
    totalElevators: 4,
    moveDuration: 500,
    doorOpenDuration: 300
};

// UI References
let building: Building;
let elevatorElements: Map<number, HTMLElement> = new Map();
let floorButtonElements: Map<string, HTMLElement> = new Map();
let elevatorButtonElements: Map<string, HTMLElement> = new Map();

// Initialize the simulator
function init(): void {
    // Create building
    building = new Building(CONFIG);
    
    // Set up callbacks
    setupCallbacks();
    
    // Build UI
    buildUI();
    
    console.log('Elevator Simulator initialized');
    console.log(`Floors: ${CONFIG.totalFloors}, Elevators: ${CONFIG.totalElevators}`);
}

// Set up all callbacks
function setupCallbacks(): void {
    building.setElevatorStateChangeCallback((elevatorId, state) => {
        updateElevatorUI(elevatorId, state);
        updateElevatorStatusPanel();
    });
    
    building.setElevatorMovementCallback((elevatorId, fromFloor, toFloor) => {
        animateElevatorMovement(elevatorId, fromFloor, toFloor);
    });
    
    building.setRequestAssignedCallback((request, elevatorId) => {
        console.log(`Request from floor ${request.floor} (${request.direction}) assigned to elevator ${elevatorId}`);
    });
    
    building.setRequestCompletedCallback((request) => {
        console.log(`Request from floor ${request.floor} completed`);
    });
    
    building.setQueueUpdateCallback((requests) => {
        updateRequestQueueUI(requests);
    });
}

// Build all UI elements
function buildUI(): void {
    buildFloors();
    buildElevators();
    buildFloorButtons();
    buildElevatorPanels();
    updateElevatorStatusPanel();
    updateRequestQueueUI(building.getPendingRequests());
}

// Build floors display
function buildFloors(): void {
    const container = document.getElementById('floorsContainer') as HTMLElement;
    container.innerHTML = '';
    
    // Build floors from top to bottom (visually)
    for (let i = CONFIG.totalFloors - 1; i >= 0; i--) {
        const floor = building.getFloor(i);
        if (!floor) continue;
        
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${i}`;
        
        floorDiv.innerHTML = `
            <div class="floor-number">${i}</div>
            <div class="floor-label">Floor ${i}</div>
        `;
        
        container.appendChild(floorDiv);
    }
}

// Build elevators display
function buildElevators(): void {
    const container = document.getElementById('elevatorsContainer') as HTMLElement;
    container.innerHTML = '';
    
    for (let i = 0; i < CONFIG.totalElevators; i++) {
        const elevator = building.getElevator(i);
        if (!elevator) continue;
        
        const shaft = document.createElement('div');
        shaft.className = 'elevator-shaft';
        shaft.id = `shaft-${i}`;
        
        const elevatorDiv = document.createElement('div');
        elevatorDiv.className = 'elevator';
        elevatorDiv.id = `elevator-${i}`;
        elevatorDiv.innerHTML = `
            <div class="status-light"></div>
            <div class="door left"></div>
            <div class="door right"></div>
            <span class="elevator-number">E${i}</span>
        `;
        
        shaft.appendChild(elevatorDiv);
        container.appendChild(shaft);
        
        elevatorElements.set(i, elevatorDiv);
        
        // Position elevator at ground floor
        updateElevatorPosition(i, 0);
    }
}

// Build floor request buttons
function buildFloorButtons(): void {
    const container = document.getElementById('floorButtonsContainer') as HTMLElement;
    container.innerHTML = '';
    
    // Build from top to bottom
    for (let i = CONFIG.totalFloors - 1; i >= 0; i--) {
        const floor = building.getFloor(i);
        if (!floor) continue;
        
        const rowDiv = document.createElement('div');
        rowDiv.className = 'floor-button-row';
        rowDiv.id = `floor-buttons-${i}`;
        
        // Up button (not on ground floor)
        if (floor.hasUpButton()) {
            const upBtn = document.createElement('button');
            upBtn.className = 'floor-request-btn up';
            upBtn.innerHTML = '↑';
            upBtn.id = `floor-up-btn-${i}`;
            upBtn.onclick = () => handleFloorUpRequest(i);
            rowDiv.appendChild(upBtn);
            floorButtonElements.set(`up-${i}`, upBtn);
        }
        
        // Down button (not on top floor)
        if (floor.hasDownButton()) {
            const downBtn = document.createElement('button');
            downBtn.className = 'floor-request-btn down';
            downBtn.innerHTML = '↓';
            downBtn.id = `floor-down-btn-${i}`;
            downBtn.onclick = () => handleFloorDownRequest(i);
            rowDiv.appendChild(downBtn);
            floorButtonElements.set(`down-${i}`, downBtn);
        }
        
        container.appendChild(rowDiv);
    }
}

// Build elevator control panels
function buildElevatorPanels(): void {
    const container = document.getElementById('elevatorPanelsContainer') as HTMLElement;
    container.innerHTML = '';
    
    for (let i = 0; i < CONFIG.totalElevators; i++) {
        const panel = document.createElement('div');
        panel.className = 'elevator-panel';
        panel.id = `elevator-panel-${i}`;
        
        panel.innerHTML = `
            <h4>Elevator ${i}</h4>
            <div class="elevator-panel-buttons" id="panel-buttons-${i}"></div>
        `;
        
        const buttonsContainer = panel.querySelector('.elevator-panel-buttons') as HTMLElement;
        
        for (let floor = 0; floor < CONFIG.totalFloors; floor++) {
            const btn = document.createElement('button');
            btn.className = 'elevator-floor-btn';
            btn.textContent = floor.toString();
            btn.id = `elevator-btn-${i}-${floor}`;
            btn.onclick = () => handleElevatorButtonPress(i, floor);
            buttonsContainer.appendChild(btn);
            elevatorButtonElements.set(`${i}-${floor}`, btn);
        }
        
        container.appendChild(panel);
    }
}

// Handle floor up button request
function handleFloorUpRequest(floor: number): void {
    const floorObj = building.getFloor(floor);
    if (floorObj && floorObj.hasUpButton()) {
        floorObj.activateUpRequest();
        updateFloorButtonUI(floor, Direction.UP);
    }
}

// Handle floor down button request
function handleFloorDownRequest(floor: number): void {
    const floorObj = building.getFloor(floor);
    if (floorObj && floorObj.hasDownButton()) {
        floorObj.activateDownRequest();
        updateFloorButtonUI(floor, Direction.DOWN);
    }
}

// Handle elevator button press
function handleElevatorButtonPress(elevatorId: number, floor: number): void {
    const result = building.addInternalRequest(elevatorId, floor);
    if (result) {
        updateElevatorButtonUI(elevatorId, floor);
        console.log(`Elevator ${elevatorId} requested floor ${floor}`);
    }
}

// Update elevator position visually
function updateElevatorPosition(elevatorId: number, floor: number): void {
    const elevator = elevatorElements.get(elevatorId);
    if (!elevator) return;
    
    const floorHeight = 60; // pixels per floor
    const offset = (CONFIG.totalFloors - 1 - floor) * floorHeight;
    elevator.style.top = `${offset}px`;
}

// Animate elevator movement
function animateElevatorMovement(elevatorId: number, fromFloor: number, toFloor: number): void {
    const elevator = elevatorElements.get(elevatorId);
    if (!elevator) return;
    
    // Update position
    updateElevatorPosition(elevatorId, toFloor);
    
    // Open doors when arrived
    setTimeout(() => {
        openElevatorDoors(elevatorId);
    }, 100);
    
    // Close doors after delay
    setTimeout(() => {
        closeElevatorDoors(elevatorId);
    }, CONFIG.doorOpenDuration);
}

// Open elevator doors visually
function openElevatorDoors(elevatorId: number): void {
    const elevator = elevatorElements.get(elevatorId);
    if (!elevator) return;
    
    const doors = elevator.querySelectorAll('.door');
    doors.forEach(door => door.classList.add('open'));
}

// Close elevator doors visually
function closeElevatorDoors(elevatorId: number): void {
    const elevator = elevatorElements.get(elevatorId);
    if (!elevator) return;
    
    const doors = elevator.querySelectorAll('.door');
    doors.forEach(door => door.classList.remove('open'));
}

// Update elevator UI based on state
function updateElevatorUI(elevatorId: number, state: any): void {
    const elevator = elevatorElements.get(elevatorId);
    if (!elevator) return;
    
    const statusLight = elevator.querySelector('.status-light') as HTMLElement;
    
    // Update status light
    statusLight.className = 'status-light';
    if (state.status === 'moving') {
        statusLight.classList.add('moving');
    } else if (state.status === 'door_open') {
        statusLight.classList.add('busy');
    }
}

// Update floor button UI
function updateFloorButtonUI(floor: number, direction: Direction): void {
    const key = direction === Direction.UP ? `up-${floor}` : `down-${floor}`;
    const btn = floorButtonElements.get(key);
    if (btn) {
        btn.classList.add('active');
    }
}

// Update elevator button UI
function updateElevatorButtonUI(elevatorId: number, floor: number): void {
    const key = `${elevatorId}-${floor}`;
    const btn = elevatorButtonElements.get(key);
    if (btn) {
        btn.classList.add('active');
    }
}

// Update elevator status panel
function updateElevatorStatusPanel(): void {
    const container = document.getElementById('elevatorStatus') as HTMLElement;
    container.innerHTML = '';
    
    for (let i = 0; i < CONFIG.totalElevators; i++) {
        const elevator = building.getElevator(i);
        if (!elevator) continue;
        
        const state = elevator.getState();
        const statusItem = document.createElement('div');
        statusItem.className = 'elevator-status-item';
        
        let statusText = 'Idle';
        let statusClass = '';
        
        if (state.status === 'moving') {
            statusText = 'Moving';
            statusClass = 'moving';
        } else if (state.status === 'door_open') {
            statusText = 'Door Open';
            statusClass = 'busy';
        }
        
        statusItem.innerHTML = `
            <span>Elevator ${i}: Floor ${state.currentFloor} - ${statusText}</span>
            <span class="status-indicator ${statusClass}"></span>
        `;
        
        container.appendChild(statusItem);
    }
}

// Update request queue UI
function updateRequestQueueUI(requests: any[]): void {
    const container = document.getElementById('requestQueue') as HTMLElement;
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<span style="color: #888;">No pending requests</span>';
        return;
    }
    
    requests.forEach(request => {
        const item = document.createElement('div');
        item.className = `queue-item ${request.direction === Direction.UP ? 'up' : 'down'}`;
        item.textContent = `Floor ${request.floor} ${request.direction === Direction.UP ? '↑' : '↓'}`;
        container.appendChild(item);
    });
}

// Start the simulator when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init);
}

// Export for testing
export { init, building, CONFIG };
