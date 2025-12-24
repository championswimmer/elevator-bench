import { Building, NUM_FLOORS, NUM_ELEVATORS, ELEVATOR_SPEED } from './Building';
import { Elevator } from './Elevator';
import { Floor } from './Floor';

// Global Variables
let building: Building;
let lastTime: number = 0;
let animationFrameId: number;

// Initialization Function
function init(): void {
    building = new Building();

    createFloorElements();
    createElevatorElements();
    setupEventListeners();

    // Start the animation loop
    animate(0);
}

// UI Creation Functions
function createFloorElements(): void {
    const buildingContainer = document.getElementById('building') as HTMLElement;
    if (!buildingContainer) return;

    // Create floors from top (NUM_FLOORS-1) to bottom (0)
    for (let floorNum = NUM_FLOORS - 1; floorNum >= 0; floorNum--) {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.setAttribute('data-floor', floorNum.toString());

        const floorLabel = document.createElement('span');
        floorLabel.textContent = `Floor ${floorNum}`;
        floorDiv.appendChild(floorLabel);

        // Up button (not on top floor)
        if (floorNum < NUM_FLOORS - 1) {
            const upButton = document.createElement('button');
            upButton.className = 'floor-button up';
            upButton.textContent = '↑';
            upButton.setAttribute('data-floor', floorNum.toString());
            upButton.setAttribute('data-direction', 'up');
            floorDiv.appendChild(upButton);
        }

        // Down button (not on ground floor)
        if (floorNum > 0) {
            const downButton = document.createElement('button');
            downButton.className = 'floor-button down';
            downButton.textContent = '↓';
            downButton.setAttribute('data-floor', floorNum.toString());
            downButton.setAttribute('data-direction', 'down');
            floorDiv.appendChild(downButton);
        }

        buildingContainer.appendChild(floorDiv);
    }
}

function createElevatorElements(): void {
    const buildingContainer = document.getElementById('building') as HTMLElement;
    if (!buildingContainer) return;

    for (let elevatorId = 0; elevatorId < NUM_ELEVATORS; elevatorId++) {
        const elevatorDiv = document.createElement('div');
        elevatorDiv.className = 'elevator';
        elevatorDiv.setAttribute('data-elevator', elevatorId.toString());

        // Direction indicator
        const directionDiv = document.createElement('div');
        directionDiv.className = 'direction';
        elevatorDiv.appendChild(directionDiv);

        // Floor buttons inside elevator
        for (let floorNum = NUM_FLOORS - 1; floorNum >= 0; floorNum--) {
            const button = document.createElement('button');
            button.className = 'elevator-button';
            button.textContent = floorNum.toString();
            button.setAttribute('data-elevator', elevatorId.toString());
            button.setAttribute('data-floor', floorNum.toString());
            elevatorDiv.appendChild(button);
        }

        buildingContainer.appendChild(elevatorDiv);
    }
}

function setupEventListeners(): void {
    // Floor buttons
    document.querySelectorAll('.floor-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const floor = parseInt(target.getAttribute('data-floor')!);
            const direction = target.getAttribute('data-direction') as 'up' | 'down';
            handleFloorRequest(floor, direction);
        });
    });

    // Elevator buttons
    document.querySelectorAll('.elevator-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const elevatorId = parseInt(target.getAttribute('data-elevator')!);
            const floor = parseInt(target.getAttribute('data-floor')!);
            handleElevatorRequest(elevatorId, floor);
        });
    });
}

// Event Handlers
function handleFloorRequest(floor: number, direction: 'up' | 'down'): void {
    if (direction === 'up') {
        building.floors[floor].requestUp();
    } else {
        building.floors[floor].requestDown();
    }
    building.requestElevator(floor, direction);
}

function handleElevatorRequest(elevatorId: number, floor: number): void {
    building.elevators[elevatorId].addDestination(floor);
}

// Update Functions
function updateUI(): void {
    // Update elevator positions
    building.elevators.forEach((elevator, index) => {
        const elevatorDiv = document.querySelector(`.elevator[data-elevator="${index}"]`) as HTMLElement;
        if (elevatorDiv) {
            // Assuming floors are 100px high, position from top
            const yPosition = (NUM_FLOORS - 1 - elevator.currentFloor) * 100;
            elevatorDiv.style.transform = `translateY(${yPosition}px)`;

            // Update direction indicator
            const directionDiv = elevatorDiv.querySelector('.direction') as HTMLElement;
            if (directionDiv) {
                directionDiv.textContent = elevator.direction === 'up' ? '↑' : elevator.direction === 'down' ? '↓' : '—';
            }

            // Update elevator button states
            elevatorDiv.querySelectorAll('.elevator-button').forEach(button => {
                const btnFloor = parseInt(button.getAttribute('data-floor')!);
                if (elevator.destinationFloors.has(btnFloor)) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
        }
    });

    // Update floor button states
    document.querySelectorAll('.floor-button').forEach(button => {
        const floor = parseInt(button.getAttribute('data-floor')!);
        const direction = button.getAttribute('data-direction') as 'up' | 'down';
        const hasRequest = direction === 'up' ? building.floors[floor].upButton : building.floors[floor].downButton;
        if (hasRequest) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Animation Loop
function animate(currentTime: number): void {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Update building (move elevators)
    building.update();

    // Update UI
    updateUI();

    // Continue animation
    animationFrameId = requestAnimationFrame(animate);
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', init);