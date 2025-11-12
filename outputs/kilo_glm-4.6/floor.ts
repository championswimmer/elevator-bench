import Button from './button';
import Building from './building';

/**
 * Floor class represents a floor in the building with up/down buttons
 */
class Floor {
  floorNumber: number;
  upButton: Button | null;
  downButton: Button | null;
  element: HTMLElement;
  building: Building;

  constructor(floorNumber: number, element: HTMLElement, building: Building) {
    this.floorNumber = floorNumber;
    this.element = element;
    this.building = building;
    
    console.log(`Initializing floor ${floorNumber}`);

    // Get the up and down buttons for this floor
    const upButtonElement = element.querySelector('.floor-button[data-direction="up"]') as HTMLElement;
    const downButtonElement = element.querySelector('.floor-button[data-direction="down"]') as HTMLElement;
    
    console.log(`Floor ${floorNumber} - upButtonElement:`, upButtonElement);
    console.log(`Floor ${floorNumber} - downButtonElement:`, downButtonElement);

    // Create button instances if elements exist
    this.upButton = upButtonElement ? new Button(upButtonElement) : null;
    this.downButton = downButtonElement ? new Button(downButtonElement) : null;
    
    console.log(`Floor ${floorNumber} - upButton:`, this.upButton);
    console.log(`Floor ${floorNumber} - downButton:`, this.downButton);

    // Add event listeners to the buttons
    if (this.upButton) {
      this.upButton.element.addEventListener('click', () => {
        console.log(`Up button clicked on floor ${floorNumber}`);
        this.requestElevator('up');
      });
    }

    if (this.downButton) {
      this.downButton.element.addEventListener('click', () => {
        console.log(`Down button clicked on floor ${floorNumber}`);
        this.requestElevator('down');
      });
    }
  }

  /**
   * Request an elevator to this floor in the specified direction
   * @param direction The direction of the request ('up' or 'down')
   */
  requestElevator(direction: 'up' | 'down'): void {
    // Press the button to give visual feedback
    if (direction === 'up' && this.upButton) {
      this.upButton.press();
    } else if (direction === 'down' && this.downButton) {
      this.downButton.press();
    }

    // Add the request to the building's request queue
    this.building.handleFloorRequest(this.floorNumber, direction);
  }
}

export default Floor;