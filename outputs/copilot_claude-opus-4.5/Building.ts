import { Elevator, Direction, ElevatorState } from './Elevator';
import { Floor, FloorRequest } from './Floor';

// Configuration constants
export const CONFIG = {
  TOTAL_FLOORS: 10,
  TOTAL_ELEVATORS: 4,
  FLOOR_TRAVEL_TIME: 800, // ms per floor
  DOOR_OPEN_TIME: 1500, // ms doors stay open
};

export class Building {
  public floors: Floor[];
  public elevators: Elevator[];
  public requestQueue: FloorRequest[];
  private isRunning: boolean = false;
  private buildingElement: HTMLElement | null = null;

  constructor(totalFloors: number = CONFIG.TOTAL_FLOORS, totalElevators: number = CONFIG.TOTAL_ELEVATORS) {
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];

    // Initialize floors
    for (let i = 0; i < totalFloors; i++) {
      this.floors.push(new Floor(i, totalFloors));
    }

    // Initialize elevators
    for (let i = 0; i < totalElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
  }

  // Request an elevator from a floor
  requestElevator(floorNumber: number, direction: Direction): void {
    const floor = this.floors[floorNumber];
    if (!floor) return;

    let request: FloorRequest | null = null;
    if (direction === Direction.UP) {
      request = floor.pressUpButton();
    } else if (direction === Direction.DOWN) {
      request = floor.pressDownButton();
    }

    if (request) {
      this.assignElevator(request);
    }
  }

  // Select a floor from inside an elevator
  selectFloor(elevatorId: number, floorNumber: number): void {
    const elevator = this.elevators[elevatorId];
    if (!elevator || floorNumber < 0 || floorNumber >= this.floors.length) return;

    if (elevator.currentFloor === floorNumber && elevator.isIdle()) {
      return; // Already at the floor and idle
    }

    elevator.addDestination(floorNumber);
    
    // Update button state in elevator panel
    const buttonElement = document.querySelector(
      `.elevator-panel[data-elevator="${elevatorId}"] .floor-btn[data-floor="${floorNumber}"]`
    );
    if (buttonElement) {
      buttonElement.classList.add('active');
    }

    if (elevator.state === ElevatorState.IDLE) {
      elevator.state = ElevatorState.MOVING;
      elevator.updateDirection();
    }
  }

  // Assign the best elevator to a request
  private assignElevator(request: FloorRequest): void {
    let bestElevator: Elevator | null = null;
    let bestScore = Infinity;

    for (const elevator of this.elevators) {
      const score = this.calculateElevatorScore(elevator, request);
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }

    if (bestElevator && bestScore < Infinity) {
      bestElevator.addDestination(request.floor);
      if (bestElevator.state === ElevatorState.IDLE) {
        bestElevator.state = ElevatorState.MOVING;
        bestElevator.updateDirection();
      }
    } else {
      // All elevators are busy and not suitable, queue the request
      this.requestQueue.push(request);
    }
  }

  // Calculate a score for an elevator for a given request (lower is better)
  private calculateElevatorScore(elevator: Elevator, request: FloorRequest): number {
    const distance = elevator.distanceTo(request.floor);

    // Idle elevator - just use distance
    if (elevator.isIdle()) {
      return distance;
    }

    // Elevator already moving in the right direction and will pass the floor
    if (elevator.direction === request.direction) {
      if (request.direction === Direction.UP && elevator.currentFloor <= request.floor) {
        return distance;
      }
      if (request.direction === Direction.DOWN && elevator.currentFloor >= request.floor) {
        return distance;
      }
    }

    // Elevator moving towards the floor but in opposite direction (will service on return)
    if (elevator.direction === Direction.UP && request.direction === Direction.DOWN) {
      if (elevator.currentFloor < request.floor) {
        // Will pass the floor on the way up, but needs to come back down
        const maxDest = Math.max(...Array.from(elevator.destinationFloors), elevator.currentFloor);
        return (maxDest - elevator.currentFloor) + (maxDest - request.floor) + 100; // Penalty
      }
    }

    if (elevator.direction === Direction.DOWN && request.direction === Direction.UP) {
      if (elevator.currentFloor > request.floor) {
        // Will pass the floor on the way down, but needs to come back up
        const minDest = Math.min(...Array.from(elevator.destinationFloors), elevator.currentFloor);
        return (elevator.currentFloor - minDest) + (request.floor - minDest) + 100; // Penalty
      }
    }

    // Elevator going opposite direction, needs to finish current path first
    return distance + 200; // Higher penalty
  }

  // Process the request queue
  private processQueue(): void {
    const pendingRequests: FloorRequest[] = [];

    for (const request of this.requestQueue) {
      let assigned = false;

      for (const elevator of this.elevators) {
        if (elevator.isIdle()) {
          elevator.addDestination(request.floor);
          elevator.state = ElevatorState.MOVING;
          elevator.updateDirection();
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        pendingRequests.push(request);
      }
    }

    this.requestQueue = pendingRequests;
  }

  // Called when an elevator arrives at a floor
  private onElevatorArrival(elevator: Elevator): void {
    const floor = this.floors[elevator.currentFloor];
    
    // Check if this floor was a destination
    const wasDestination = elevator.hasDestination(elevator.currentFloor);
    
    // Check if we should pick up passengers waiting on this floor
    const shouldPickUp = this.shouldPickUpPassengers(elevator, floor);

    if (wasDestination || shouldPickUp) {
      elevator.removeDestination(elevator.currentFloor);
      elevator.openDoors();

      // Clear floor buttons
      if (elevator.direction === Direction.UP || elevator.isIdle()) {
        floor.clearUpButton();
      }
      if (elevator.direction === Direction.DOWN || elevator.isIdle()) {
        floor.clearDownButton();
      }

      // Clear the floor button in elevator panel
      const buttonElement = document.querySelector(
        `.elevator-panel[data-elevator="${elevator.id}"] .floor-btn[data-floor="${elevator.currentFloor}"]`
      );
      if (buttonElement) {
        buttonElement.classList.remove('active');
      }

      // Close doors after delay
      setTimeout(() => {
        elevator.closeDoors();
        elevator.updateDirection();
        
        // Check for queued requests
        this.processQueue();
      }, CONFIG.DOOR_OPEN_TIME);
    }
  }

  // Check if elevator should pick up passengers at this floor
  private shouldPickUpPassengers(elevator: Elevator, floor: Floor): boolean {
    if (elevator.direction === Direction.UP && floor.upButtonActive) {
      return true;
    }
    if (elevator.direction === Direction.DOWN && floor.downButtonActive) {
      return true;
    }
    if (elevator.direction === Direction.IDLE && (floor.upButtonActive || floor.downButtonActive)) {
      return true;
    }
    return false;
  }

  // Main simulation loop
  public async runSimulation(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const tick = async () => {
      if (!this.isRunning) return;

      for (const elevator of this.elevators) {
        if (elevator.state === ElevatorState.MOVING && elevator.direction !== Direction.IDLE) {
          const nextFloor = elevator.getNextFloor();
          
          if (nextFloor !== null) {
            // Move towards next floor
            if (nextFloor > elevator.currentFloor) {
              elevator.direction = Direction.UP;
              elevator.moveOneFloor();
            } else if (nextFloor < elevator.currentFloor) {
              elevator.direction = Direction.DOWN;
              elevator.moveOneFloor();
            }

            // Check if arrived at a destination
            if (elevator.hasDestination(elevator.currentFloor) || 
                this.shouldPickUpPassengers(elevator, this.floors[elevator.currentFloor])) {
              this.onElevatorArrival(elevator);
            }
          } else {
            elevator.direction = Direction.IDLE;
            elevator.state = ElevatorState.IDLE;
          }
        } else if (elevator.state === ElevatorState.IDLE && elevator.destinationFloors.size > 0) {
          elevator.state = ElevatorState.MOVING;
          elevator.updateDirection();
        }
      }

      // Continue simulation
      setTimeout(tick, CONFIG.FLOOR_TRAVEL_TIME);
    };

    tick();
  }

  // Stop the simulation
  public stopSimulation(): void {
    this.isRunning = false;
  }

  // Initialize the UI
  public initializeUI(container: HTMLElement): void {
    this.buildingElement = container;
    
    // Create the building structure
    const buildingHTML = this.createBuildingHTML();
    container.innerHTML = buildingHTML;

    // Set up element references
    this.setupElementReferences();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private createBuildingHTML(): string {
    let html = '<div class="building">';
    
    // Elevator shaft area
    html += '<div class="elevator-shaft-area">';
    
    // Floors container (from top to bottom for display)
    html += '<div class="floors-container">';
    for (let i = this.floors.length - 1; i >= 0; i--) {
      const floor = this.floors[i];
      html += `<div class="floor" data-floor="${i}">`;
      html += `<div class="floor-number">Floor ${i}</div>`;
      html += '<div class="floor-buttons">';
      
      if (floor.hasUpButton) {
        html += `<button class="call-btn up-btn" data-floor="${i}" data-direction="up">▲</button>`;
      }
      if (floor.hasDownButton) {
        html += `<button class="call-btn down-btn" data-floor="${i}" data-direction="down">▼</button>`;
      }
      
      html += '</div>';
      html += '<div class="floor-line"></div>';
      html += '</div>';
    }
    html += '</div>'; // floors-container
    
    // Elevator shafts
    html += '<div class="elevator-shafts">';
    for (let i = 0; i < this.elevators.length; i++) {
      html += `<div class="elevator-shaft" data-elevator="${i}">`;
      html += `<div class="elevator" data-elevator="${i}">`;
      html += `<div class="elevator-number">${i}</div>`;
      html += '<div class="elevator-doors"></div>';
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    
    html += '</div>'; // elevator-shaft-area
    
    // Elevator panels
    html += '<div class="elevator-panels">';
    for (let i = 0; i < this.elevators.length; i++) {
      html += `<div class="elevator-panel" data-elevator="${i}">`;
      html += `<div class="panel-title">Elevator ${i}</div>`;
      html += '<div class="panel-buttons">';
      for (let j = this.floors.length - 1; j >= 0; j--) {
        html += `<button class="floor-btn" data-elevator="${i}" data-floor="${j}">${j}</button>`;
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
    
    html += '</div>'; // building
    
    return html;
  }

  private setupElementReferences(): void {
    // Set up floor elements
    for (const floor of this.floors) {
      const floorElement = document.querySelector(`.floor[data-floor="${floor.floorNumber}"]`) as HTMLElement;
      const upButton = document.querySelector(`.up-btn[data-floor="${floor.floorNumber}"]`) as HTMLElement;
      const downButton = document.querySelector(`.down-btn[data-floor="${floor.floorNumber}"]`) as HTMLElement;
      floor.setElements(floorElement, upButton, downButton);
    }

    // Set up elevator elements
    for (const elevator of this.elevators) {
      const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`) as HTMLElement;
      elevator.setElement(elevatorElement);
    }
  }

  private setupEventListeners(): void {
    // Floor call buttons
    document.querySelectorAll('.call-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const floor = parseInt(target.dataset.floor || '0');
        const direction = target.dataset.direction === 'up' ? Direction.UP : Direction.DOWN;
        this.requestElevator(floor, direction);
      });
    });

    // Elevator panel buttons
    document.querySelectorAll('.floor-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const elevatorId = parseInt(target.dataset.elevator || '0');
        const floor = parseInt(target.dataset.floor || '0');
        this.selectFloor(elevatorId, floor);
      });
    });
  }
}
