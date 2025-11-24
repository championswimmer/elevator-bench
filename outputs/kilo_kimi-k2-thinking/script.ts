import { Building } from './building';

// Get model, tool, and provider info from the global script in HTML
declare global {
    interface Window {
        modelInfo: string;
        toolInfo: string;
        providerInfo: string;
    }
}

// Display model, tool, and provider info
document.addEventListener('DOMContentLoaded', () => {
    if (window.modelInfo) {
        const modelInfoElement = document.getElementById('model-info');
        if (modelInfoElement) modelInfoElement.textContent = window.modelInfo;
    }
    
    if (window.toolInfo) {
        const toolInfoElement = document.getElementById('tool-info');
        if (toolInfoElement) toolInfoElement.textContent = window.toolInfo;
    }
    
    if (window.providerInfo) {
        const providerInfoElement = document.getElementById('provider-info');
        if (providerInfoElement) providerInfoElement.textContent = window.providerInfo;
    }
    
    // Initialize the building
    const building = new Building(10, 4); // 10 floors, 4 elevators
    
    // Set up event listeners for control buttons
    const startButton = document.getElementById('start-btn');
    const resetButton = document.getElementById('reset-btn');
    
    if (startButton) {
        startButton.addEventListener('click', () => {
            // In a more complete implementation, this would start the simulation
            // For now, we'll just show a message
            alert('Simulation started! Click floor buttons to request elevators.');
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            building.reset();
        });
    }
    
    // Expose building to global scope for floor buttons to access
    (window as any).building = building;
});

// This function will be called by floor buttons
(window as any).requestElevator = (floor: number, direction: 'up' | 'down') => {
    const building = (window as any).building as Building;
    if (building) {
        building.requestElevator(floor, direction);
    }
};