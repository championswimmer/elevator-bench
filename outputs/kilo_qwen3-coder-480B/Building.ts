// Building class to manage overall building and elevator coordination
import { Elevator } from './Elevator';
import { Floor } from './Floor';

export class Building {
    floors: Floor[];
    elevators: Elevator[];
    totalFloors: number;
    totalElevators: number;
    pendingRequests: {floor: number, direction: 'up' | 'down'}[];

    constructor(totalFloors: number, totalElevators: number) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        this.floors = [];
        this.elevators = [];
        this.pendingRequests = []; // Queue for pending elevator requests
        
        // Initialize floors
        try {
            for (let i = 0; i < totalFloors; i++) {
                this.floors.push(new Floor(i, totalFloors));
            }
        } catch (error) {
            console.error('Error initializing floors:', error);
            throw new Error('Failed to initialize floors');
        }
        
        // Initialize elevators
        try {
            for (let i = 0; i < totalElevators; i++) {
                this.elevators.push(new Elevator(i, totalFloors));
            }
        } catch (error) {
            console.error('Error initializing elevators:', error);
            throw new Error('Failed to initialize elevators');
        }
    }

    // Create building UI
    createBuildingUI(): void {
        try {
            const buildingElement = document.getElementById('building');
            const elevatorsElement = document.getElementById('elevators');
            
            if (!buildingElement || !elevatorsElement) {
                throw new Error('Building or elevators element not found in DOM');
            }
            
            // Clear existing content
            buildingElement.innerHTML = '';
            elevatorsElement.innerHTML = '';
            
            // Create floors in reverse order (top to bottom)
            for (let i = this.totalFloors - 1; i >= 0; i--) {
                const floorElement = document.createElement('div');
                floorElement.className = 'floor';
                floorElement.id = `floor-${i}`;
                
                const floorLabel = document.createElement('div');
                floorLabel.className = 'floor-label';
                floorLabel.textContent = `Floor ${i}`;
                
                floorElement.appendChild(floorLabel);
                floorElement.appendChild(this.floors[i].getButtonContainer());
                
                buildingElement.appendChild(floorElement);
            }
            
            // Create elevators
            for (let i = 0; i < this.totalElevators; i++) {
                const elevatorElement = document.createElement('div');
                elevatorElement.className = 'elevator';
                elevatorElement.id = `elevator-${i}`;
                
                const elevatorLabel = document.createElement('div');
                elevatorLabel.className = 'elevator-label';
                elevatorLabel.textContent = `Elevator ${i}`;
                
                const elevatorDoor = document.createElement('div');
                elevatorDoor.className = 'elevator-door';
                
                const leftDoor = document.createElement('div');
                leftDoor.className = 'elevator-door left';
                
                const rightDoor = document.createElement('div');
                rightDoor.className = 'elevator-door right';
                
                elevatorDoor.appendChild(leftDoor);
                elevatorDoor.appendChild(rightDoor);
                
                // Create elevator buttons
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'elevator-buttons';
                
                for (let j = 0; j < this.totalFloors; j++) {
                    const button = document.createElement('button');
                    button.className = 'elevator-floor-button';
                    button.textContent = j.toString();
                    button.addEventListener('click', () => {
                        this.selectFloor(i, j);
                    });
                    buttonsContainer.appendChild(button);
                }
                
                elevatorElement.appendChild(elevatorLabel);
                elevatorElement.appendChild(elevatorDoor);
                elevatorElement.appendChild(buttonsContainer);
                
                elevatorsElement.appendChild(elevatorElement);
            }
        } catch (error) {
            console.error('Error creating building UI:', error);
            throw new Error('Failed to create building UI');
        }
    }

    // Initialize event listeners
    initEventListeners(): void {
        // Listen for elevator requests from floors
        document.addEventListener('elevatorRequested', (e: Event) => {
            const customEvent = e as CustomEvent;
            const { floor, direction } = customEvent.detail;
            this.handleElevatorRequest(floor, direction);
        });
    }

    // Handle elevator request from a floor
    handleElevatorRequest(floor: number, direction: 'up' | 'down'): void {
        try {
            // Validate floor number
            if (floor < 0 || floor >= this.totalFloors) {
                throw new Error(`Invalid floor number: ${floor}`);
            }
            
            // Find the best elevator to handle the request
            const bestElevator = this.findBestElevator(floor, direction);
            
            if (bestElevator) {
                // Add floor to elevator targets
                bestElevator.addTargetFloor(floor);
                
                // Reset floor request after delay
                setTimeout(() => {
                    try {
                        this.floors[floor].resetRequest(direction);
                    } catch (error) {
                        console.error(`Error resetting request for floor ${floor}:`, error);
                    }
                }, 3000); // 3 seconds
            } else {
                // If no elevator is available, queue the request
                console.log(`No elevator available for floor ${floor}, queuing request`);
                this.pendingRequests.push({floor, direction});
            }
        } catch (error) {
            console.error(`Error handling elevator request for floor ${floor}:`, error);
            // Even if there's an error, we should still reset the floor request
            setTimeout(() => {
                try {
                    this.floors[floor].resetRequest(direction);
                } catch (resetError) {
                    console.error(`Error resetting request for floor ${floor}:`, resetError);
                }
            }, 3000); // 3 seconds
        }
    }

    // Find the best elevator to handle a request
    findBestElevator(floor: number, direction: 'up' | 'down'): Elevator | null {
        // First, check for idle elevators
        const idleElevators = this.elevators.filter(elevator => elevator.isIdle());
        
        if (idleElevators.length > 0) {
            // Find the closest idle elevator
            return idleElevators.reduce((closest, elevator) => {
                const closestDistance = Math.abs(closest.currentFloor - floor);
                const currentDistance = Math.abs(elevator.currentFloor - floor);
                return currentDistance < closestDistance ? elevator : closest;
            }, idleElevators[0]);
        }
        
        // If no idle elevators, find the closest moving elevator in the same direction
        // that is still going in the direction of the request
        const movingElevators = this.elevators.filter(elevator =>
            elevator.direction === direction &&
            ((direction === 'up' && elevator.currentFloor <= floor) ||
             (direction === 'down' && elevator.currentFloor >= floor))
        );
        
        if (movingElevators.length > 0) {
            // Find the closest moving elevator
            return movingElevators.reduce((closest, elevator) => {
                const closestDistance = Math.abs(closest.currentFloor - floor);
                const currentDistance = Math.abs(elevator.currentFloor - floor);
                return currentDistance < closestDistance ? elevator : closest;
            }, movingElevators[0]);
        }
        
        // If no elevators are available in the right direction, find the closest elevator overall
        // that will be going in the right direction after completing its current tasks
        const busyElevators = this.elevators.filter(elevator =>
            !elevator.isIdle() && elevator.targetFloors.length > 0
        );
        
        if (busyElevators.length > 0) {
            // Find the closest busy elevator that will eventually go in the right direction
            return busyElevators.reduce((closest, elevator) => {
                const closestDistance = Math.abs(closest.currentFloor - floor);
                const currentDistance = Math.abs(elevator.currentFloor - floor);
                return currentDistance < closestDistance ? elevator : closest;
            }, busyElevators[0]);
        }
        
        // If all elevators are busy and not suitable, return null to queue the request
        return null;
    }

    // Select a floor in an elevator
    selectFloor(elevatorId: number, floor: number): void {
        const elevator = this.elevators[elevatorId];
        elevator.addTargetFloor(floor);
    }

    // Update the building simulation
    update(): void {
        // Move all elevators
        this.elevators.forEach(elevator => {
            if (elevator.moving || elevator.targetFloors.length > 0) {
                elevator.move();
            }
        });
        
        // Process pending requests if any elevators become available
        if (this.pendingRequests.length > 0) {
            // Find all idle elevators
            const idleElevators = this.elevators.filter(elevator => elevator.isIdle());
            
            // Assign pending requests to idle elevators
            for (let i = 0; i < Math.min(idleElevators.length, this.pendingRequests.length); i++) {
                const elevator = idleElevators[i];
                const request = this.pendingRequests.shift();
                
                if (request) {
                    elevator.addTargetFloor(request.floor);
                    console.log(`Assigned pending request for floor ${request.floor} to elevator ${elevator.id}`);
                }
            }
        }
        
        // Update UI
        this.updateUI();
    }

    // Update the building UI
    updateUI(): void {
        try {
            // Update elevator positions with animation support
            this.elevators.forEach((elevator, index) => {
                try {
                    const elevatorElement = document.getElementById(`elevator-${index}`);
                    if (elevatorElement) {
                        // Update elevator label with current floor
                        const label = elevatorElement.querySelector('.elevator-label');
                        if (label) {
                            label.textContent = `Elevator ${index} (Floor ${elevator.currentFloor})`;
                        }
                        
                        // Update elevator position with smooth animation
                        const floorHeight = 100; // Height of each floor in pixels
                        const position = elevator.currentFloor * floorHeight +
                                         elevator.animationProgress * floorHeight *
                                         (elevator.direction === 'up' ? 1 :
                                          elevator.direction === 'down' ? -1 : 0);
                        elevatorElement.style.transform = `translateY(-${position}px)`;
                        
                        // Update door animation with CSS transitions
                        const leftDoor = elevatorElement.querySelector('.elevator-door.left');
                        const rightDoor = elevatorElement.querySelector('.elevator-door.right');
                        
                        if (leftDoor && rightDoor) {
                            if (elevator.doorsOpen) {
                                leftDoor.classList.add('open');
                                rightDoor.classList.add('open');
                            } else {
                                leftDoor.classList.remove('open');
                                rightDoor.classList.remove('open');
                            }
                        }
                        
                        // Update elevator button states
                        const buttons = elevatorElement.querySelectorAll('.elevator-floor-button');
                        buttons.forEach((button, buttonIndex) => {
                            if (elevator.targetFloors.includes(buttonIndex)) {
                                button.classList.add('active');
                            } else {
                                button.classList.remove('active');
                            }
                        });
                    }
                } catch (elevatorError) {
                    console.error(`Error updating elevator ${index} UI:`, elevatorError);
                }
            });
            
            // Update floor button states
            this.floors.forEach((floor, floorIndex) => {
                try {
                    const floorElement = document.getElementById(`floor-${floorIndex}`);
                    if (floorElement) {
                        const upButton = floorElement.querySelector('.elevator-button.up');
                        const downButton = floorElement.querySelector('.elevator-button.down');
                        
                        if (upButton) {
                            if (floor.hasUpRequest) {
                                upButton.classList.add('active');
                                upButton.setAttribute('disabled', 'true');
                            } else {
                                upButton.classList.remove('active');
                                upButton.removeAttribute('disabled');
                            }
                        }
                        
                        if (downButton) {
                            if (floor.hasDownRequest) {
                                downButton.classList.add('active');
                                downButton.setAttribute('disabled', 'true');
                            } else {
                                downButton.classList.remove('active');
                                downButton.removeAttribute('disabled');
                            }
                        }
                    }
                } catch (floorError) {
                    console.error(`Error updating floor ${floorIndex} UI:`, floorError);
                }
            });
        } catch (error) {
            console.error('Error updating building UI:', error);
        }
    }
}