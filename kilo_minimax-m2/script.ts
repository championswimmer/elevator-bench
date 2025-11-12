import { Elevator, ElevatorDirection, ElevatorStatus } from './Elevator';
import { Floor } from './Floor';
import { Building, BuildingConfig } from './Building';

// DOM Elements
let building: Building | null = null;
let isInitialized = false;

// DOM element references
const domElements = {
    startBtn: null as HTMLElement | null,
    resetBtn: null as HTMLElement | null,
    emergencyBtn: null as HTMLElement | null,
    floorsInput: null as HTMLInputElement | null,
    elevatorsInput: null as HTMLInputElement | null,
    speedSelect: null as HTMLSelectElement | null,
    logContainer: null as HTMLElement | null,
    floorControls: null as HTMLElement | null,
    elevatorsContainer: null as HTMLElement | null,
    building: null as HTMLElement | null
};

// Log entry structure
interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'error' | 'request' | 'elevator';
    timestamp: Date;
}

/**
 * Initialize the elevator simulator
 */
async function initializeSimulator(): Promise<void> {
    if (isInitialized) return;
    
    try {
        // Get DOM elements
        getDOMElements();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize building
        const config = getCurrentConfig();
        building = new Building(config);
        setupBuildingCallbacks();
        
        // Create UI
        await createUI();
        
        // Initialize building
        building.initialize();
        
        isInitialized = true;
        addLog('Elevator simulator initialized successfully', 'success');
        
    } catch (error) {
        addLog(`Failed to initialize simulator: ${error}`, 'error');
        console.error('Initialization error:', error);
    }
}

/**
 * Get DOM element references
 */
function getDOMElements(): void {
    domElements.startBtn = document.getElementById('startBtn');
    domElements.resetBtn = document.getElementById('resetBtn');
    domElements.emergencyBtn = document.getElementById('emergencyBtn');
    domElements.floorsInput = document.getElementById('floorsInput') as HTMLInputElement;
    domElements.elevatorsInput = document.getElementById('elevatorsInput') as HTMLInputElement;
    domElements.speedSelect = document.getElementById('speedSelect') as HTMLSelectElement;
    domElements.logContainer = document.getElementById('log');
    domElements.floorControls = document.querySelector('.floor-controls');
    domElements.elevatorsContainer = document.querySelector('.elevators-container');
    domElements.building = document.getElementById('building');
}

/**
 * Setup event listeners for controls
 */
function setupEventListeners(): void {
    if (!domElements.startBtn || !domElements.resetBtn || !domElements.emergencyBtn || 
        !domElements.floorsInput || !domElements.elevatorsInput || !domElements.speedSelect) {
        throw new Error('Required DOM elements not found');
    }

    // Control buttons
    domElements.startBtn.addEventListener('click', toggleSimulation);
    domElements.resetBtn.addEventListener('click', resetSimulation);
    domElements.emergencyBtn.addEventListener('click', emergencyStop);

    // Configuration inputs
    domElements.floorsInput.addEventListener('change', updateBuildingConfig);
    domElements.elevatorsInput.addEventListener('change', updateBuildingConfig);
    domElements.speedSelect.addEventListener('change', updateBuildingConfig);
}

/**
 * Setup building event callbacks
 */
function setupBuildingCallbacks(): void {
    if (!building) return;

    building.onLogMessage = (message: string, type?: 'info' | 'success' | 'error' | 'request' | 'elevator') => {
        addLog(message, type);
    };

    building.onStatusUpdate = () => {
        updateUI();
    };
}

/**
 * Create the user interface elements
 */
async function createUI(): Promise<void> {
    if (!building) throw new Error('Building not initialized');
    
    await createFloorControls();
    await createElevatorShaft();
}

/**
 * Create floor control buttons
 */
async function createFloorControls(): Promise<void> {
    if (!domElements.floorControls || !building) return;
    
    // Clear existing content
    domElements.floorControls.innerHTML = '';
    
    // Create floor elements
    for (let i = building.config.floors - 1; i >= 0; i--) {
        const floor = building.floors[i];
        const elements = floor.createButtonElements();
        
        // Insert floor element in correct position (top to bottom)
        if (i === building.config.floors - 1) {
            domElements.floorControls.insertBefore(
                elements.upBtn.closest('.floor')!, 
                domElements.floorControls.firstChild
            );
        } else {
            domElements.floorControls.appendChild(
                elements.upBtn.closest('.floor')!
            );
        }
    }
}

/**
 * Create elevator shafts
 */
async function createElevatorShaft(): Promise<void> {
    if (!domElements.elevatorsContainer || !building) return;
    
    // Clear existing content
    domElements.elevatorsContainer.innerHTML = '';
    
    // Create shaft for each elevator
    for (let i = 0; i < building.config.elevators; i++) {
        const shaft = createElevatorShaftElement(i, building.config.floors);
        domElements.elevatorsContainer.appendChild(shaft);
    }
}

/**
 * Create individual elevator shaft element
 */
function createElevatorShaftElement(elevatorId: number, totalFloors: number): HTMLElement {
    const shaft = document.createElement('div');
    shaft.className = 'elevator-shaft';
    shaft.setAttribute('data-elevator', elevatorId.toString());
    
    // Create floor slots for positioning
    for (let i = 0; i < totalFloors; i++) {
        const floorSlot = document.createElement('div');
        floorSlot.className = 'elevator-slot';
        floorSlot.setAttribute('data-floor', i.toString());
        shaft.appendChild(floorSlot);
    }
    
    return shaft;
}

/**
 * Toggle simulation start/stop
 */
function toggleSimulation(): void {
    if (!building) return;
    
    if (building.isRunning) {
        building.stop();
        if (domElements.startBtn) {
            domElements.startBtn.textContent = 'Start Simulation';
            domElements.startBtn.className = 'btn btn-primary';
        }
    } else {
        building.start();
        if (domElements.startBtn) {
            domElements.startBtn.textContent = 'Stop Simulation';
            domElements.startBtn.className = 'btn btn-danger';
        }
    }
}

/**
 * Reset the simulation
 */
function resetSimulation(): void {
    if (!building) return;
    
    building.reset();
    
    if (domElements.startBtn) {
        domElements.startBtn.textContent = 'Start Simulation';
        domElements.startBtn.className = 'btn btn-primary';
    }
    
    addLog('Simulation reset', 'info');
    updateUI();
}

/**
 * Emergency stop all elevators
 */
function emergencyStop(): void {
    if (!building) return;
    
    building.emergencyStop();
    
    if (domElements.startBtn) {
        domElements.startBtn.textContent = 'Start Simulation';
        domElements.startBtn.className = 'btn btn-primary';
    }
    
    addLog('EMERGENCY STOP ACTIVATED', 'error');
}

/**
 * Update building configuration
 */
function updateBuildingConfig(): void {
    if (!building) return;
    
    const newConfig = getCurrentConfig();
    
    // Stop current simulation if running
    if (building.isRunning) {
        building.stop();
    }
    
    // Update configuration
    building.updateConfig(newConfig);
    
    // Recreate UI
    createUI();
    
    // Reinitialize
    building.initialize();
    
    addLog(`Configuration updated - Floors: ${newConfig.floors}, Elevators: ${newConfig.elevators}, Speed: ${newConfig.animationSpeed}ms`, 'info');
}

/**
 * Get current configuration from UI inputs
 */
function getCurrentConfig(): BuildingConfig {
    const floors = parseInt(domElements.floorsInput?.value || '10', 10);
    const elevators = parseInt(domElements.elevatorsInput?.value || '4', 10);
    const animationSpeed = parseInt(domElements.speedSelect?.value || '500', 10);
    
    // Validate inputs
    const validFloors = Math.max(3, Math.min(20, floors));
    const validElevators = Math.max(1, Math.min(8, elevators));
    
    return {
        floors: validFloors,
        elevators: validElevators,
        animationSpeed
    };
}

/**
 * Update the UI to reflect current state
 */
function updateUI(): void {
    if (!building) return;
    
    updateElevatorDisplays();
    updateControlStates();
}

/**
 * Update elevator display elements
 */
function updateElevatorDisplays(): void {
    if (!building) return;
    
    building.elevators.forEach(elevator => {
        updateElevatorDisplay(elevator);
    });
}

/**
 * Update individual elevator display
 */
function updateElevatorDisplay(elevator: Elevator): void {
    const shaft = document.querySelector(`[data-elevator="${elevator.id}"]`) as HTMLElement;
    if (!shaft) return;
    
    // Find or create elevator element
    let elevatorElement = shaft.querySelector('.elevator') as HTMLElement;
    if (!elevatorElement) {
        elevatorElement = document.createElement('div');
        elevatorElement.className = 'elevator';
        shaft.appendChild(elevatorElement);
    }
    
    // Update elevator styling and content
    elevatorElement.className = `elevator ${elevator.status}`;
    elevatorElement.innerHTML = `
        <div class="elevator-cabin">
            <div class="elevator-number">E${elevator.id}</div>
            <div class="elevator-floor">${elevator.currentFloor}</div>
        </div>
    `;
    
    // Position elevator in shaft
    const floorSlots = shaft.querySelectorAll('.elevator-slot');
    const targetSlot = floorSlots[elevator.currentFloor];
    if (targetSlot) {
        targetSlot.appendChild(elevatorElement);
    }
    
    // Add status indicator
    let statusIndicator = elevatorElement.querySelector('.elevator-status') as HTMLElement;
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.className = 'elevator-status';
        elevatorElement.appendChild(statusIndicator);
    }
    
    const statusText = elevator.status === ElevatorStatus.IDLE ? 'IDLE' :
                      elevator.status === ElevatorStatus.MOVING ? 'MOVING' :
                      elevator.status === ElevatorStatus.BUSY ? 'BUSY' : 'EMERGENCY';
    const directionText = elevator.direction !== ElevatorDirection.IDLE ? ` ${elevator.direction.toUpperCase()}` : '';
    
    statusIndicator.textContent = `${statusText}${directionText}`;
}

/**
 * Update control button states
 */
function updateControlStates(): void {
    if (!building || !domElements.startBtn) return;
    
    if (building.isRunning) {
        domElements.startBtn.textContent = 'Stop Simulation';
        domElements.startBtn.className = 'btn btn-danger';
    } else {
        domElements.startBtn.textContent = 'Start Simulation';
        domElements.startBtn.className = 'btn btn-primary';
    }
}

/**
 * Add message to log
 */
function addLog(message: string, type: 'info' | 'success' | 'error' | 'request' | 'elevator' = 'info'): void {
    if (!domElements.logContainer) return;
    
    const logEntry: LogEntry = {
        message,
        type,
        timestamp: new Date()
    };
    
    const logElement = document.createElement('div');
    logElement.className = `log-entry ${type}`;
    logElement.innerHTML = `
        <span class="log-time">${logEntry.timestamp.toLocaleTimeString()}</span>
        <span class="log-message">${message}</span>
    `;
    
    // Add to log container
    domElements.logContainer.appendChild(logElement);
    
    // Auto-scroll to bottom
    domElements.logContainer.scrollTop = domElements.logContainer.scrollHeight;
    
    // Limit log entries (keep last 100)
    const logEntries = domElements.logContainer.querySelectorAll('.log-entry');
    if (logEntries.length > 100) {
        logEntries[0].remove();
    }
}

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeSimulator();
    } catch (error) {
        console.error('Failed to initialize application:', error);
        addLog(`Application initialization failed: ${error}`, 'error');
    }
});

// Export for potential testing or external use
export { initializeSimulator, addLog };