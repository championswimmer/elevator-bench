const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;

const building = document.getElementById('building')!;

// Create floors and floor buttons
for (let i = NUM_FLOORS - 1; i >= 0; i--) {
    const floor = document.createElement('div');
    floor.classList.add('floor');
    floor.dataset.floor = i.toString();

    const floorLabel = document.createElement('div');
    floorLabel.classList.add('floor-label');
    floorLabel.innerText = `Floor ${i}`;
    floor.appendChild(floorLabel);

    const floorButtons = document.createElement('div');
    floorButtons.classList.add('floor-buttons');

    if (i < NUM_FLOORS - 1) {
        const upButton = document.createElement('button');
        upButton.innerText = '▲';
        upButton.addEventListener('click', () => requestElevator(i, 'up'));
        floorButtons.appendChild(upButton);
    }

    if (i > 0) {
        const downButton = document.createElement('button');
        downButton.innerText = '▼';
        downButton.addEventListener('click', () => requestElevator(i, 'down'));
        floorButtons.appendChild(downButton);
    }

    floor.appendChild(floorButtons);
    building.appendChild(floor);
}

// Create elevator shafts and elevators
for (let i = 0; i < NUM_ELEVATORS; i++) {
    const elevatorShaft = document.createElement('div');
    elevatorShaft.classList.add('elevator-shaft');

    const elevator = document.createElement('div');
    elevator.classList.add('elevator');
    elevator.dataset.elevator = i.toString();

    const elevatorLabel = document.createElement('div');
    elevatorLabel.classList.add('elevator-label');
    elevatorLabel.innerText = `Elevator ${i}`;
    elevator.appendChild(elevatorLabel);

    const elevatorButtons = document.createElement('div');
    elevatorButtons.classList.add('elevator-buttons');
    for (let j = 0; j < NUM_FLOORS; j++) {
        const button = document.createElement('button');
        button.innerText = j.toString();
        button.addEventListener('click', () => goToFloor(i, j));
        elevatorButtons.appendChild(button);
    }
    elevator.appendChild(elevatorButtons);
    elevatorShaft.appendChild(elevator);
    building.appendChild(elevatorShaft);
}

type Direction = 'up' | 'down';
type ElevatorState = 'idle' | 'moving_up' | 'moving_down';

interface Elevator {
    id: number;
    currentFloor: number;
    state: ElevatorState;
    destinationQueue: number[];
}

const elevators: Elevator[] = [];
for (let i = 0; i < NUM_ELEVATORS; i++) {
    elevators.push({
        id: i,
        currentFloor: 0,
        state: 'idle',
        destinationQueue: [],
    });
}

const requestQueue: { floor: number, direction: Direction }[] = [];

function requestElevator(floor: number, direction: Direction) {
    const bestElevator = findBestElevator(floor, direction);
    if (bestElevator) {
        addDestination(bestElevator, floor);
    } else {
        requestQueue.push({ floor, direction });
    }
}

function goToFloor(elevatorId: number, floor: number) {
    const elevator = elevators[elevatorId];
    addDestination(elevator, floor);
}

function findBestElevator(floor: number, direction: Direction): Elevator | null {
    let bestElevator: Elevator | null = null;
    let minDistance = Infinity;

    for (const elevator of elevators) {
        if (elevator.state === 'idle') {
            const distance = Math.abs(elevator.currentFloor - floor);
            if (distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        } else if (
            (direction === 'up' && elevator.state === 'moving_up' && elevator.currentFloor <= floor) ||
            (direction === 'down' && elevator.state === 'moving_down' && elevator.currentFloor >= floor)
        ) {
            const distance = Math.abs(elevator.currentFloor - floor);
            if (distance < minDistance) {
                minDistance = distance;
                bestElevator = elevator;
            }
        }
    }
    return bestElevator;
}

function addDestination(elevator: Elevator, floor: number) {
    if (!elevator.destinationQueue.includes(floor)) {
        elevator.destinationQueue.push(floor);
        if (elevator.state === 'idle') {
            processNextDestination(elevator);
        }
    }
}

function processNextDestination(elevator: Elevator) {
    if (elevator.destinationQueue.length === 0) {
        elevator.state = 'idle';
        // Check request queue
        const nextRequest = requestQueue.shift();
        if (nextRequest) {
            requestElevator(nextRequest.floor, nextRequest.direction);
        }
        return;
    }

    let nextFloor: number;
    if (elevator.state === 'moving_up') {
        const destinationsAbove = elevator.destinationQueue.filter(f => f > elevator.currentFloor);
        if (destinationsAbove.length > 0) {
            nextFloor = Math.min(...destinationsAbove);
        } else {
            nextFloor = Math.max(...elevator.destinationQueue);
        }
    } else if (elevator.state === 'moving_down') {
        const destinationsBelow = elevator.destinationQueue.filter(f => f < elevator.currentFloor);
        if (destinationsBelow.length > 0) {
            nextFloor = Math.max(...destinationsBelow);
        } else {
            nextFloor = Math.min(...elevator.destinationQueue);
        }
    } else { // idle
        nextFloor = elevator.destinationQueue[0];
    }
    
    elevator.destinationQueue = elevator.destinationQueue.filter(f => f !== nextFloor);

    if (nextFloor > elevator.currentFloor) {
        elevator.state = 'moving_up';
    } else if (nextFloor < elevator.currentFloor) {
        elevator.state = 'moving_down';
    } else {
        processNextDestination(elevator);
        return;
    }

    moveElevator(elevator, nextFloor);
}


function moveElevator(elevator: Elevator, toFloor: number) {
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`) as HTMLElement;
    const travelTime = Math.abs(elevator.currentFloor - toFloor) * 1000; // 1s per floor
    elevatorElement.style.transition = `bottom ${travelTime}ms linear`;
    elevatorElement.style.bottom = `${toFloor * 100}px`;

    setTimeout(() => {
        elevator.currentFloor = toFloor;
        processNextDestination(elevator);
    }, travelTime);
}
