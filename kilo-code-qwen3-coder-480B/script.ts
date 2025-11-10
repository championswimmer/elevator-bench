// Elevator Simulator TypeScript Logic

interface Elevator {
    id: number;
    currentFloor: number;
    targetFloors: number[];
    isMoving: boolean;
    isGoingUp: boolean | null;
    doorOpen: boolean;
    idleTimer: number | null;
}

interface FloorRequest {
    floor: number;
    direction: 'up' | 'down';
}

class ElevatorSimulator {
    private elevators: Elevator[];
    private floorRequests: FloorRequest[];
    private readonly NUM_FLOORS = 10;
    private readonly NUM_ELEVATORS = 4;
    private readonly FLOOR_HEIGHT = 100; // pixels
    private readonly MOVE_DURATION = 2000; // ms per floor
    private readonly DOOR_DURATION = 1000; // ms for door open/close
    private readonly IDLE_RETURN_TIME = 10000; // ms before returning to floor 0
    
    constructor() {
        // Initialize 4 elevators at floor 0 (ground floor)
        this.elevators = [];
        for (let i = 0; i < this.NUM_ELEVATORS; i++) {
            this.elevators.push({
                id: i,
                currentFloor: 0,
                targetFloors: [],
                isMoving: false,
                isGoingUp: null,
                doorOpen: false,
                idleTimer: null
            });
        }
        
        // Initialize floor requests array
        this.floorRequests = [];
        
        // Bind event listeners
        this.bindEvents();
        
        // Start the elevator processing loop
        this.processRequests();
    }
    
    private bindEvents(): void {
        // Floor button events
        document.querySelectorAll('.floor-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.target as HTMLButtonElement;
                const floor = parseInt(target.getAttribute('data-floor') || '0');
                const direction = target.classList.contains('up') ? 'up' : 'down';
                this.requestFloor(floor, direction);
            });
        });
        
        // Elevator button events
        document.querySelectorAll('.elevator-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const target = event.target as HTMLButtonElement;
                const floor = parseInt(target.getAttribute('data-floor') || '0');
                const elevatorId = parseInt(target.closest('.elevator')?.getAttribute('data-elevator') || '0');
                this.selectFloor(elevatorId, floor);
            });
        });
    }
    
    // Request a floor from outside the elevator
    public requestFloor(floor: number, direction: 'up' | 'down'): void {
        console.log(`Floor ${floor} requested to go ${direction}`);
        
        // Add visual feedback
        const button = document.querySelector(`.floor-button[data-floor="${floor}"]${direction === 'up' ? '.up' : '.down'}`);
        if (button) {
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);
        }
        
        // Add to floor requests
        this.floorRequests.push({ floor, direction });
        
        this.updateStatus(`Floor ${floor} requested to go ${direction}`);
        
        // Try to assign the request immediately
        this.assignRequests();
    }
    
    // Select a floor from inside the elevator
    public selectFloor(elevatorId: number, floor: number): void {
        console.log(`Elevator ${elevatorId} requested to go to floor ${floor}`);
        
        const elevator = this.elevators[elevatorId];
        if (!elevator) return;
        
        // Add visual feedback
        const button = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-button[data-floor="${floor}"]`);
        if (button) {
            button.classList.add('active');
            setTimeout(() => button.classList.remove('active'), 300);
        }
        
        // Add to target floors if not already there
        if (!elevator.targetFloors.includes(floor)) {
            elevator.targetFloors.push(floor);
            // Sort target floors based on current direction
            this.sortTargetFloors(elevator);
        }
        
        this.updateStatus(`Elevator ${elevatorId} requested to go to floor ${floor}`);
        
        // Clear idle timer when a floor is selected
        if (elevator.idleTimer) {
            clearTimeout(elevator.idleTimer);
            elevator.idleTimer = null;
        }
    }
    
    // Sort target floors based on elevator direction
    private sortTargetFloors(elevator: Elevator): void {
        if (elevator.isGoingUp === true) {
            // Going up: sort ascending
            elevator.targetFloors.sort((a, b) => a - b);
        } else if (elevator.isGoingUp === false) {
            // Going down: sort descending
            elevator.targetFloors.sort((a, b) => b - a);
        }
        // If direction is null (idle), sort by closest first
        else {
            elevator.targetFloors.sort((a, b) => {
                const distanceA = Math.abs(elevator.currentFloor - a);
                const distanceB = Math.abs(elevator.currentFloor - b);
                return distanceA - distanceB;
            });
        }
    }
    
    // Assign floor requests to elevators
    private assignRequests(): void {
        // Process each pending floor request
        for (let i = this.floorRequests.length - 1; i >= 0; i--) {
            const request = this.floorRequests[i];
            const assignedElevator = this.findBestElevator(request.floor, request.direction);
            
            if (assignedElevator !== null) {
                // Assign the request to this elevator
                const elevator = this.elevators[assignedElevator];
                
                // Add the floor to the elevator's targets if not already there
                if (!elevator.targetFloors.includes(request.floor)) {
                    elevator.targetFloors.push(request.floor);
                    this.sortTargetFloors(elevator);
                }
                
                this.updateStatus(`Request from floor ${request.floor} assigned to Elevator ${assignedElevator}`);
                
                // Remove the request from the queue
                this.floorRequests.splice(i, 1);
                
                // Clear idle timer when a request is assigned
                if (elevator.idleTimer) {
                    clearTimeout(elevator.idleTimer);
                    elevator.idleTimer = null;
                }
            }
        }
    }
    
    // Find the best elevator for a request
    private findBestElevator(requestFloor: number, direction: 'up' | 'down'): number | null {
        console.log(`Finding best elevator for floor ${requestFloor} going ${direction}`);
        let bestElevator: number | null = null;
        let bestScore = -1;
        
        for (const elevator of this.elevators) {
            console.log(`Elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, isMoving=${elevator.isMoving}, isGoingUp=${elevator.isGoingUp}, doorOpen=${elevator.doorOpen}`);
            
            // Skip elevators with door open
            if (elevator.doorOpen) {
                console.log(`Elevator ${elevator.id} skipping - door is open`);
                continue;
            }
            
            // Calculate distance to the request floor
            const distance = Math.abs(elevator.currentFloor - requestFloor);
            
            // Calculate score based on multiple factors
            let score = 0;
            
            // Prefer elevators that are idle (not moving)
            if (!elevator.isMoving) {
                score += 1000;
            }
            
            // Prefer elevators already moving in the correct direction
            if (elevator.isMoving && elevator.isGoingUp !== null) {
                const goingCorrectDirection =
                    (direction === 'up' && elevator.isGoingUp) ||
                    (direction === 'down' && !elevator.isGoingUp);
                
                if (goingCorrectDirection) {
                    score += 500;
                } else {
                    // Penalize elevators going in the wrong direction
                    score -= 1000;
                }
            }
            
            // Prefer closer elevators (inverse of distance)
            score += (10 - distance) * 10;
            
            console.log(`Elevator ${elevator.id} score: ${score}`);
            
            // Update best elevator if this one has a better score
            if (score > bestScore) {
                bestScore = score;
                bestElevator = elevator.id;
                console.log(`Elevator ${elevator.id} is now best candidate with score ${score}`);
            }
        }
        
        console.log(`Best elevator for floor ${requestFloor}: ${bestElevator} with score ${bestScore}`);
        return bestElevator;
    }
    
    // Process requests continuously
    private processRequests(): void {
        setInterval(() => {
            this.assignRequests();
            this.processElevatorMovements();
        }, 100); // Check every 100ms
    }
    
    // Process elevator movements
    private processElevatorMovements(): void {
        for (const elevator of this.elevators) {
            console.log(`Processing elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, targetFloors=[${elevator.targetFloors}], isMoving=${elevator.isMoving}, doorOpen=${elevator.doorOpen}`);
            
            // Skip if elevator is moving or door is open
            if (elevator.isMoving || elevator.doorOpen) {
                console.log(`Elevator ${elevator.id} skipping - currently moving or door is open`);
                continue;
            }
            
            // If elevator has target floors, move to the next one
            if (elevator.targetFloors.length > 0) {
                // Clear any existing idle timer when there are targets
                if (elevator.idleTimer) {
                    clearTimeout(elevator.idleTimer);
                    elevator.idleTimer = null;
                }
                
                // Get the next floor based on current direction
                let nextFloor: number | null = null;
                
                if (elevator.isGoingUp !== null) {
                    // If we have a direction, find the next floor in that direction
                    if (elevator.isGoingUp) {
                        // Going up, find the smallest target floor that's >= current floor
                        const upFloors = elevator.targetFloors.filter(floor => floor >= elevator.currentFloor);
                        if (upFloors.length > 0) {
                            nextFloor = Math.min(...upFloors);
                        }
                    } else {
                        // Going down, find the largest target floor that's <= current floor
                        const downFloors = elevator.targetFloors.filter(floor => floor <= elevator.currentFloor);
                        if (downFloors.length > 0) {
                            nextFloor = Math.max(...downFloors);
                        }
                    }
                }
                
                // If we couldn't find a floor in the current direction, just take the closest one
                if (nextFloor === null && elevator.targetFloors.length > 0) {
                    // Find the closest floor
                    nextFloor = elevator.targetFloors.reduce((closest, floor) => {
                        const closestDistance = Math.abs(elevator.currentFloor - closest);
                        const floorDistance = Math.abs(elevator.currentFloor - floor);
                        return floorDistance < closestDistance ? floor : closest;
                    }, elevator.targetFloors[0]);
                }
                
                // If we still don't have a floor, skip
                if (nextFloor === null) {
                    console.log(`Elevator ${elevator.id} has no valid target floors`);
                    continue;
                }
                
                console.log(`Elevator ${elevator.id} has target floors, next floor is ${nextFloor}`);
                
                // Determine direction
                if (elevator.currentFloor < nextFloor) {
                    elevator.isGoingUp = true;
                } else if (elevator.currentFloor > nextFloor) {
                    elevator.isGoingUp = false;
                } else {
                    // Already at the target floor, remove from targets and open door
                    console.log(`Elevator ${elevator.id} already at target floor ${nextFloor}`);
                    const index = elevator.targetFloors.indexOf(nextFloor);
                    if (index > -1) {
                        elevator.targetFloors.splice(index, 1);
                    }
                    this.openDoor(elevator.id);
                    continue;
                }
                
                // Move to the next floor
                console.log(`Moving elevator ${elevator.id} to floor ${nextFloor}`);
                this.moveElevator(elevator.id, nextFloor);
            }
            // If elevator is idle and has no requests, start idle timer
            else if (elevator.currentFloor !== 0 && !elevator.idleTimer) {
                console.log(`Elevator ${elevator.id} is idle, starting idle timer`);
                elevator.idleTimer = window.setTimeout(() => {
                    // Return to floor 0 after being idle
                    if (elevator.targetFloors.length === 0 && elevator.currentFloor !== 0) {
                        console.log(`Elevator ${elevator.id} returning to floor 0 after being idle`);
                        elevator.targetFloors.push(0);
                        this.sortTargetFloors(elevator);
                    }
                    // Clear the timer reference
                    elevator.idleTimer = null;
                }, this.IDLE_RETURN_TIME);
            }
        }
    }
    
    // Move an elevator to a floor
    private moveElevator(elevatorId: number, targetFloor: number): void {
        const elevator = this.elevators[elevatorId];
        if (!elevator || elevator.isMoving) return;
        
        elevator.isMoving = true;
        
        // Update status
        this.updateStatus(`Elevator ${elevatorId} moving from floor ${elevator.currentFloor} to floor ${targetFloor}`);
        
        // Update elevator status display
        const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
        if (statusElement) {
            statusElement.textContent = `Moving ${elevator.isGoingUp ? 'Up' : 'Down'} to Floor ${targetFloor}`;
            statusElement.className = 'elevator-status'; // Reset classes
            statusElement.classList.add('elevator-status', elevator.isGoingUp ? 'moving-up' : 'moving-down');
        }
        
        // Animate the movement
        const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
        if (elevatorElement) {
            // Calculate new position (inverted because 0 floor is at the bottom)
            const newPosition = (this.NUM_FLOORS - 1 - targetFloor) * this.FLOOR_HEIGHT;
            
            // Apply CSS transition for smooth movement
            (elevatorElement as HTMLElement).style.transition = `transform ${this.MOVE_DURATION}ms ease-in-out`;
            (elevatorElement as HTMLElement).style.transform = `translateY(${-newPosition}px)`;
            
            // After movement is complete
            setTimeout(() => {
                elevator.currentFloor = targetFloor;
                elevator.isMoving = false;
                
                // Remove the floor from targets
                const index = elevator.targetFloors.indexOf(targetFloor);
                if (index > -1) {
                    elevator.targetFloors.splice(index, 1);
                }
                
                this.updateStatus(`Elevator ${elevatorId} arrived at floor ${targetFloor}`);
                
                // Open door when arrived
                this.openDoor(elevatorId);
                
                // Update status display
                if (statusElement) {
                    statusElement.textContent = `Stopped at Floor ${targetFloor}`;
                    statusElement.className = 'elevator-status';
                    statusElement.classList.add('elevator-status', 'stopped');
                }
            }, this.MOVE_DURATION);
        }
    }
    
    // Open elevator door
    private openDoor(elevatorId: number): void {
        const elevator = this.elevators[elevatorId];
        if (!elevator) return;
        
        elevator.doorOpen = true;
        
        // Update status display
        const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
        if (statusElement) {
            statusElement.textContent = `Door Opening`;
            statusElement.className = 'elevator-status';
            statusElement.classList.add('elevator-status', 'door-opening');
        }
        
        // Visual door animation would go here in a real implementation
        
        // After door open duration, close door
        setTimeout(() => {
            this.closeDoor(elevatorId);
        }, this.DOOR_DURATION);
    }
    
    // Close elevator door
    private closeDoor(elevatorId: number): void {
        const elevator = this.elevators[elevatorId];
        if (!elevator) return;
        
        elevator.doorOpen = false;
        
        // Update status display
        const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
        if (statusElement) {
            statusElement.textContent = `Idle at Floor ${elevator.currentFloor}`;
            statusElement.className = 'elevator-status';
            statusElement.classList.add('elevator-status', 'idle');
        }
        
        this.updateStatus(`Elevator ${elevatorId} door closed at floor ${elevator.currentFloor}`);
    }
    
    // Update the status display
    private updateStatus(message: string): void {
        const statusContent = document.querySelector('.status-content');
        if (statusContent) {
            // Create new paragraph for the message
            const paragraph = document.createElement('p');
            paragraph.textContent = new Date().toLocaleTimeString() + ': ' + message;
            
            // Add to the beginning of the status content
            if (statusContent.firstChild) {
                statusContent.insertBefore(paragraph, statusContent.firstChild);
            } else {
                statusContent.appendChild(paragraph);
            }
            
            // Limit to 20 messages
            while (statusContent.children.length > 20) {
                statusContent.removeChild(statusContent.lastChild as Node);
            }
            
            // Scroll to top
            statusContent.scrollTop = 0;
        }
    }
}

// Initialize the simulator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const simulator = new ElevatorSimulator();
    console.log('Elevator Simulator initialized');
    
    // Update the status display
    const statusContent = document.querySelector('.status-content');
    if (statusContent) {
        statusContent.innerHTML = '<p>System initialized. All elevators are idle at floor 0.</p>';
    }
});