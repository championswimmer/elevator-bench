/**
 * Elevator Simulator
 * -----------------
 * This script creates a simple elevator simulation with:
 *  - 10 floors (0‑9)
 *  - 4 elevators
 *  - Floor up/down request buttons
 *  - Inside‑elevator floor selection buttons
 *  - Simple scheduling: closest idle elevator serves request,
 *    otherwise request is queued.
 *
 * Run with:  bun ./index.html
 * Build with: bun build ./index.html --outdir ./dist
 */

type Direction = -1 | 0 | 1;

interface FloorRequest {
  floor: number;
  direction: Direction; // direction the user wants to travel
}

/** Elevator state */
class Elevator {
  id: number;
  currentFloor: number = 0;
  direction: Direction = 0; // 0 = idle, 1 = up, -1 = down
  /** queue of destination floors */
  queue: number[] = [];

  /** DOM element representing the cabin */
  cabinEl: HTMLElement;

  constructor(id: number) {
    this.id = id;
    const cabin = document.createElement('div');
    cabin.className = 'elevator-cabin';
    cabin.dataset.id = String(id);
    // create inside buttons for each floor
    for (let f = 0; f < FLOOR_COUNT; f++) {
      const btn = document.createElement('button');
      btn.textContent = String(f);
      btn.dataset.floor = String(f);
      btn.addEventListener('click', () => this.addDestination(f));
      cabin.appendChild(btn);
    }
    this.cabinEl = cabin;
    // position at ground floor initially
    this.setPosition(0);
    // add to shaft container
    const shaft = document.getElementById(`shaft-${id}`);
    shaft?.appendChild(cabin);
  }

  /** Add a destination floor to the queue */
  addDestination(floor: number) {
    if (!this.queue.includes(floor)) {
      this.queue.push(floor);
      this.processQueue();
    }
  }

  /** Process the queue – move one floor at a time */
  private async processQueue() {
    if (this.direction !== 0) return; // already moving
    while (this.queue.length) {
      const target = this.queue.shift()!;
      this.direction = target > this.currentFloor ? 1 : -1;
      // move step‑by‑step for animation
      while (this.currentFloor !== target) {
        this.currentFloor += this.direction;
        this.setPosition(this.currentFloor);
        await new Promise(r => setTimeout(r, 400)); // animation speed
      }
      // arrived – keep direction until queue empty
    }
    this.direction = 0; // idle
    // after finishing, try to serve queued external requests
    serveQueuedRequests();
  }

  /** Update visual position */
  private setPosition(floor: number) {
    // bottom 0% = ground floor, 100% = top floor
    const percent = (floor / (FLOOR_COUNT - 1)) * 100;
    this.cabinEl.style.bottom = `${percent}%`;
  }
}

/* ---------- Global state ---------- */
const FLOOR_COUNT = 10;
const ELEVATOR_COUNT = 4;

/** All elevators */
const elevators: Elevator[] = [];

/** Queue of external floor requests when all elevators are busy */
const externalQueue: FloorRequest[] = [];

/** Initialise the UI */
function init() {
  createFloorPanels();
  createElevatorShafts();
}

/** Create floor panels with up/down buttons */
function createFloorPanels() {
  const container = document.getElementById('floors')!;
  for (let f = FLOOR_COUNT - 1; f >= 0; f--) {
    const panel = document.createElement('div');
    panel.className = 'floor';
    const label = document.createElement('span');
    label.className = 'floor-label';
    label.textContent = `Floor ${f}`;
    panel.appendChild(label);

    // up button (not on top floor)
    if (f < FLOOR_COUNT - 1) {
      const up = document.createElement('button');
      up.textContent = '↑';
      up.dataset.floor = String(f);
      up.dataset.dir = 'up';
      up.addEventListener('click', () => handleFloorRequest(f, 1));
      panel.appendChild(up);
    }
    // down button (not on ground floor)
    if (f > 0) {
      const down = document.createElement('button');
      down.textContent = '↓';
      down.dataset.floor = String(f);
      down.dataset.dir = 'down';
      down.addEventListener('click', () => handleFloorRequest(f, -1));
      panel.appendChild(down);
    }
    container.appendChild(panel);
  }
}

/** Create elevator shafts and cabins */
function createElevatorShafts() {
  const container = document.getElementById('elevators')!;
  for (let i = 0; i < ELEVATOR_COUNT; i++) {
    // shaft visual
    const shaft = document.createElement('div');
    shaft.className = 'elevator-shaft';
    shaft.id = `shaft-${i}`;
    container.appendChild(shaft);
    // elevator instance (cabin will be appended inside shaft)
    elevators.push(new Elevator(i));
  }
}

/** Handle a floor button press */
function handleFloorRequest(floor: number, direction: Direction) {
  // find closest idle elevator travelling in the same direction
  const candidate = elevators
    .filter(e => e.direction === direction || e.direction === 0)
    .reduce((best, e) => {
      if (!best) return e;
      const distBest = Math.abs(best.currentFloor - floor);
      const distE = Math.abs(e.currentFloor - floor);
      // prefer idle over moving in same direction
      if (best.direction === 0 && e.direction !== 0) return best;
      if (best.direction !== 0 && e.direction === 0) return e;
      return distE < distBest ? e : best;
    }, null as Elevator | null);

  if (candidate) {
    candidate.addDestination(floor);
  } else {
    // all busy – queue request
    externalQueue.push({ floor, direction } as FloorRequest);
  }
}

/** When an elevator becomes idle, give it the next queued request */
function serveQueuedRequests() {
  if (externalQueue.length === 0) return;
  const req = externalQueue.shift()!;
  const candidate = elevators
    .filter(e => e.direction === 0)
    .reduce((best, e) => {
      if (!best) return e;
      return Math.abs(e.currentFloor - req.floor) < Math.abs(best.currentFloor - req.floor) ? e : best;
    }, null as Elevator | null);
  if (candidate) candidate.addDestination(req.floor);
}

/* Initialise on DOM ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}