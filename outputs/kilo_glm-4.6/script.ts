import Building from './building';
import Elevator from './elevator';
import Floor from './floor';
import Request from './request';
import RequestQueue from './requestQueue';
import Button from './button';

/**
 * Main function to initialize the elevator simulator
 */
function initSimulator(): void {
  try {
    // Create building instance with default configuration (10 floors, 4 elevators)
    const building = new Building(10, 4);
    
    // Log initialization for debugging
    console.log('Elevator Simulator initialized');
    console.log(`Building with ${building.numFloors} floors and ${building.numElevators} elevators`);
    
    // The building initialization handles creating all floors and elevators
    // and setting up event listeners for buttons
  } catch (error) {
    console.error('Error initializing elevator simulator:', error);
  }
}

// Set up DOM ready event listener
if (document.readyState === 'loading') {
  // DOM is still loading, wait for it to complete
  document.addEventListener('DOMContentLoaded', initSimulator);
} else {
  // DOM is already loaded, initialize immediately
  initSimulator();
}

// Export classes to ensure they're included in the build
export { Building, Elevator, Floor, Request, RequestQueue, Button };