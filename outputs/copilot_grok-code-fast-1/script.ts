const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;

class Floor {
    id: number;
    upButton: HTMLButtonElement | null = null;
    downButton: HTMLButtonElement | null = null;

    constructor(id: number) {
        this.id = id;
    }
}

class Elevator {
    id: number;
    currentFloor: number = 0;
    direction: 'up' | 'down' | 'idle' = 'idle';
    internalRequests: Set<number> = new Set();
    externalRequests: {floor: number, direction: 'up' | 'down'}[] = [];
    element: HTMLElement;

    constructor(id: number) {
        this.id = id;
        this.element = document.createElement('div');
        this.element.className = 'elevator';
        this.element.textContent = `E${id}`;
    }

    addRequest(floor: number, direction?: 'up' | 'down') {
        if (direction) {
            this.externalRequests.push({floor, direction});
        } else {
            this.internalRequests.add(floor);
        }
        this.updateDirection();
    }

    updateDirection() {
        if (this.direction === 'idle') {
            let nextFloor = this.getNextFloor();
            if (nextFloor !== null) {
                this.direction = nextFloor > this.currentFloor ? 'up' : nextFloor < this.currentFloor ? 'down' : 'idle';
            }
        }
    }

    getNextFloor(): number | null {
        let allFloors = new Set([...this.internalRequests, ...this.externalRequests.map(r => r.floor)]);
        if (this.direction === 'up') {
            let above = [...allFloors].filter(f => f >= this.currentFloor).sort((a,b)=>a-b);
            return above.length > 0 ? above[0] : null;
        } else if (this.direction === 'down') {
            let below = [...allFloors].filter(f => f <= this.currentFloor).sort((a,b)=>b-a);
            return below.length > 0 ? below[0] : null;
        } else {
            let sorted = [...allFloors].sort((a,b)=>Math.abs(a-this.currentFloor)-Math.abs(b-this.currentFloor));
            return sorted.length > 0 ? sorted[0] : null;
        }
    }

    move() {
        let nextFloor = this.getNextFloor();
        if (nextFloor === null) {
            this.direction = 'idle';
            return;
        }
        if (nextFloor > this.currentFloor) {
            this.direction = 'up';
            this.currentFloor++;
        } else if (nextFloor < this.currentFloor) {
            this.direction = 'down';
            this.currentFloor--;
        } else {
            // arrived
            if (this.internalRequests.has(this.currentFloor)) {
                this.internalRequests.delete(this.currentFloor);
            }
            let extIndex = this.externalRequests.findIndex(r => r.floor === this.currentFloor);
            if (extIndex !== -1) {
                this.externalRequests.splice(extIndex, 1);
            }
            // check if change direction
            let nextInDir = this.getNextFloor();
            if (nextInDir === null) {
                if (this.direction === 'up') {
                    this.direction = 'down';
                    nextInDir = this.getNextFloor();
                    if (nextInDir === null) this.direction = 'idle';
                } else if (this.direction === 'down') {
                    this.direction = 'up';
                    nextInDir = this.getNextFloor();
                    if (nextInDir === null) this.direction = 'idle';
                }
            }
        }
        this.updatePosition();
    }

    updatePosition() {
        this.element.style.bottom = `${this.currentFloor * 80}px`;
    }
}

class Building {
    floors: Floor[] = [];
    elevators: Elevator[] = [];
    requestQueue: {floor: number, direction: 'up' | 'down'}[] = [];

    constructor() {
        for (let i = 0; i < NUM_FLOORS; i++) {
            this.floors.push(new Floor(i));
        }
        for (let i = 0; i < NUM_ELEVATORS; i++) {
            this.elevators.push(new Elevator(i));
        }
    }

    requestElevator(floor: number, direction: 'up' | 'down') {
        let candidates = this.elevators.filter(e => e.direction === 'idle' || (e.direction === direction && ((direction === 'up' && e.currentFloor <= floor) || (direction === 'down' && e.currentFloor >= floor))));
        if (candidates.length > 0) {
            let closest = candidates.reduce((prev, curr) => Math.abs(curr.currentFloor - floor) < Math.abs(prev.currentFloor - floor) ? curr : prev);
            closest.addRequest(floor, direction);
        } else {
            this.requestQueue.push({floor, direction});
        }
    }

    assignQueuedRequests() {
        while (this.requestQueue.length > 0) {
            let req = this.requestQueue.shift()!;
            this.requestElevator(req.floor, req.direction);
        }
    }

    moveElevators() {
        this.elevators.forEach(e => e.move());
        this.assignQueuedRequests();
    }
}

// Main
const building = new Building();

// Generate floors
const floorsDiv = document.getElementById('floors')!;
for (let i = NUM_FLOORS - 1; i >= 0; i--) {
    const floorDiv = document.createElement('div');
    floorDiv.className = 'floor';
    floorDiv.innerHTML = `
        <div class="floor-number">Floor ${i}</div>
        <div class="buttons">
            ${i < NUM_FLOORS - 1 ? '<button class="up">Up</button>' : ''}
            ${i > 0 ? '<button class="down">Down</button>' : ''}
        </div>
    `;
    floorsDiv.appendChild(floorDiv);
    const upBtn = floorDiv.querySelector('.up') as HTMLButtonElement | null;
    const downBtn = floorDiv.querySelector('.down') as HTMLButtonElement | null;
    if (upBtn) upBtn.addEventListener('click', () => building.requestElevator(i, 'up'));
    if (downBtn) downBtn.addEventListener('click', () => building.requestElevator(i, 'down'));
}

// Generate elevators
const elevatorsDiv = document.getElementById('elevators')!;
building.elevators.forEach(e => {
    const shaft = document.createElement('div');
    shaft.className = 'elevator-shaft';
    shaft.appendChild(e.element);
    elevatorsDiv.appendChild(shaft);
    e.updatePosition();
});

// Generate controls
const controlsDiv = document.getElementById('elevator-controls')!;
building.elevators.forEach(e => {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'elevator-control';
    controlDiv.innerHTML = `<h3>Elevator ${e.id}</h3><div class="floor-buttons"></div>`;
    const buttonsDiv = controlDiv.querySelector('.floor-buttons')!;
    for (let f = 0; f < NUM_FLOORS; f++) {
        const btn = document.createElement('button');
        btn.textContent = f.toString();
        btn.addEventListener('click', () => e.addRequest(f));
        buttonsDiv.appendChild(btn);
    }
    controlsDiv.appendChild(controlDiv);
});

// Simulation loop
setInterval(() => {
    building.moveElevators();
}, 1000);