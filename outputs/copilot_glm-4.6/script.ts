import { Building } from './Building';

const TOTAL_FLOORS = 10;
const TOTAL_ELEVATORS = 4;

let building: Building;
let queueProcessorInterval: number | null = null;

document.addEventListener('DOMContentLoaded', () => {
    initializeSimulation();
    setupEventListeners();
});

function initializeSimulation(): void {
    building = new Building(TOTAL_FLOORS, TOTAL_ELEVATORS);
    
    const floorsContainer = document.getElementById('floors');
    const elevatorsContainer = document.getElementById('elevators');
    
    if (floorsContainer && elevatorsContainer) {
        building.renderFloors(floorsContainer);
        building.renderElevators(elevatorsContainer);
    }
    
    updateStatusDisplay();
}

function setupEventListeners(): void {
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    
    if (startBtn) {
        startBtn.addEventListener('click', startSimulation);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopSimulation);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSimulation);
    }
}

function startSimulation(): void {
    building.start();
    startQueueProcessor();
    updateStatusDisplay();
    
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    if (startBtn) {
        startBtn.disabled = true;
    }
    
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    if (stopBtn) {
        stopBtn.disabled = false;
    }
}

function stopSimulation(): void {
    building.stop();
    stopQueueProcessor();
    updateStatusDisplay();
    
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    if (stopBtn) {
        stopBtn.disabled = true;
    }
}

function resetSimulation(): void {
    stopSimulation();
    building.reset();
    updateStatusDisplay();
    
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    if (startBtn) {
        startBtn.disabled = false;
    }
    
    const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    if (stopBtn) {
        stopBtn.disabled = true;
    }
}

function startQueueProcessor(): void {
    if (queueProcessorInterval) {
        clearInterval(queueProcessorInterval);
    }
    
    queueProcessorInterval = setInterval(() => {
        building.processQueue();
        updateStatusDisplay();
    }, 1000);
}

function stopQueueProcessor(): void {
    if (queueProcessorInterval) {
        clearInterval(queueProcessorInterval);
        queueProcessorInterval = null;
    }
}

function updateStatusDisplay(): void {
    const simStatus = document.getElementById('sim-status');
    const activeRequests = document.getElementById('active-requests');
    
    if (simStatus) {
        simStatus.textContent = building.isRunning ? 'Running' : 'Stopped';
    }
    
    if (activeRequests) {
        activeRequests.textContent = building.getActiveRequestsCount().toString();
    }
}