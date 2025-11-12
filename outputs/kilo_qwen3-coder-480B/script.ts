// Main entry point for the Elevator Simulator
// This file will import and initialize all other components

import { Elevator } from './Elevator';
import { Floor } from './Floor';
import { Building } from './Building';

// Initialize the building with specified configuration
// 10 floors (0-9) and 4 elevators (0-3)
const building = new Building(10, 4);

// Game loop for continuous updates
let gameLoopId: number;
let lastTimestamp: number = 0;
const frameRate = 60; // Target 60 FPS
const frameInterval = 1000 / frameRate;

// Function to initialize the simulator
function initSimulator() {
    // Create building UI
    try {
        building.createBuildingUI();
        
        // Initialize event listeners
        building.initEventListeners();
        
        // Display model information from info.json
        displayModelInfo();
        
        // Start game loop
        startGameLoop();
        
        console.log('Elevator Simulator initialized with 10 floors and 4 elevators');
    } catch (error) {
        console.error('Error initializing elevator simulator:', error);
        displayError('Failed to initialize elevator simulator. Please refresh the page.');
    }
}

// Display model information from info.json
function displayModelInfo() {
    fetch('info.json')
        .then(response => response.json())
        .then(data => {
            const modelInfo = data.config;
            document.getElementById('tool-name')!.textContent = modelInfo.tool;
            document.getElementById('provider-name')!.textContent = modelInfo.provider;
            document.getElementById('model-name')!.textContent = modelInfo.model;
        })
        .catch(error => {
            console.error('Error loading model info:', error);
            displayError('Failed to load model information');
        });
}

// Display error message to user
function displayError(message: string) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    errorElement.style.position = 'fixed';
    errorElement.style.top = '10px';
    errorElement.style.left = '50%';
    errorElement.style.transform = 'translateX(-50%)';
    errorElement.style.backgroundColor = '#e74c3c';
    errorElement.style.color = 'white';
    errorElement.style.padding = '10px 20px';
    errorElement.style.borderRadius = '5px';
    errorElement.style.zIndex = '1000';
    document.body.appendChild(errorElement);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

// Start the game loop for continuous updates
function startGameLoop() {
    lastTimestamp = performance.now();
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Main game loop function
function gameLoop(timestamp: number) {
    // Calculate delta time for smooth animation
    const deltaTime = timestamp - lastTimestamp;
    
    // Only update at the target frame rate
    if (deltaTime >= frameInterval) {
        lastTimestamp = timestamp - (deltaTime % frameInterval);
        
        // Update the building simulation
        building.update();
    }
    
    // Continue the game loop
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', () => {
    initSimulator();
});

// Handle window resize for responsive design
window.addEventListener('resize', () => {
    // Reinitialize UI if needed
    building.createBuildingUI();
});

// Export building instance for potential debugging
export { building };