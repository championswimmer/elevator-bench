import { TOTAL_FLOORS, NUM_ELEVATORS, MIN_FLOOR, MAX_FLOOR } from './elevator/config.js';
import { Building } from './elevator/building.js';

const building = new Building();

// ─── State ───────────────────────────────────────────────────────────────────
let lastTime = performance.now();

// ─── DOM References ──────────────────────────────────────────────────────────
const buildingEl = document.getElementById('building')!;
const statusEl = document.getElementById('status')!;

// ─── Build UI ────────────────────────────────────────────────────────────────
function buildUI(): void {
  // Build column headers
  const headerRow = document.createElement('div');
  headerRow.className = 'elevator-header-row';
  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const header = document.createElement('div');
    header.className = 'elevator-header';
    header.textContent = `E${i}`;
    headerRow.appendChild(header);
  }
  buildingEl.appendChild(headerRow);

  // Build floor rows (top to bottom visually)
  for (let f = MAX_FLOOR; f >= MIN_FLOOR; f--) {
    const floorRow = document.createElement('div');
    floorRow.className = 'floor-row';
    floorRow.dataset.floor = String(f);

    // Floor label
    const label = document.createElement('div');
    label.className = 'floor-label';
    label.textContent = f;
    if (f === MIN_FLOOR) label.textContent += ' (G)';
    floorRow.appendChild(label);

    // Elevator shafts
    for (let e = 0; e < NUM_ELEVATORS; e++) {
      const shaft = document.createElement('div');
      shaft.className = 'shaft';
      shaft.dataset.elevator = String(e);

      const elevatorBox = document.createElement('div');
      elevatorBox.className = 'elevator-box';
      elevatorBox.id = `elevator-${e}`;
      elevatorBox.dataset.currentFloor = '0';
      shaft.appendChild(elevatorBox);

      // Destination buttons inside elevator
      for (let d = MIN_FLOOR; d <= MAX_FLOOR; d++) {
        const destBtn = document.createElement('button');
        destBtn.className = 'dest-btn';
        destBtn.dataset.floor = String(d);
        destBtn.dataset.elevator = String(e);
        destBtn.textContent = d;
        destBtn.title = `Go to floor ${d}`;
        destBtn.addEventListener('click', () => handleDestinationClick(e, d));
        elevatorBox.appendChild(destBtn);
      }

      floorRow.appendChild(shaft);
    }

    // Hall call buttons (right side)
    const hallButtons = document.createElement('div');
    hallButtons.className = 'hall-buttons';

    const isTopFloor = f === MAX_FLOOR;
    const isBottomFloor = f === MIN_FLOOR;

    if (!isTopFloor) {
      const upBtn = document.createElement('button');
      upBtn.className = 'hall-btn hall-up';
      upBtn.dataset.floor = String(f);
      upBtn.textContent = '▲';
      upBtn.title = `Request elevator up from floor ${f}`;
      upBtn.addEventListener('click', () => handleHallCall(f, 'up'));
      hallButtons.appendChild(upBtn);
    }

    if (!isBottomFloor) {
      const downBtn = document.createElement('button');
      downBtn.className = 'hall-btn hall-down';
      downBtn.dataset.floor = String(f);
      downBtn.textContent = '▼';
      downBtn.title = `Request elevator down from floor ${f}`;
      downBtn.addEventListener('click', () => handleHallCall(f, 'down'));
      hallButtons.appendChild(downBtn);
    }

    floorRow.appendChild(hallButtons);
    buildingEl.appendChild(floorRow);
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────
function handleHallCall(floor: number, direction: 'up' | 'down'): void {
  building.requestElevator(floor, direction);
}

function handleDestinationClick(elevatorId: number, floor: number): void {
  const elevator = building.elevators[elevatorId];
  const destIdx = elevator.destinations.findIndex(d => d.floor === floor);
  if (destIdx !== -1) {
    // Remove destination
    elevator.removeDestination(floor);
  } else {
    if (elevator.addDestination(floor)) {
      elevator.passengers = Math.min(elevator.capacity, elevator.passengers + 1);
    }
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render(): void {
  // Update elevator positions
  for (let e = 0; e < NUM_ELEVATORS; e++) {
    const elevator = building.elevators[e];
    const box = document.getElementById(`elevator-${e}`)!;

    // Position elevator within the shaft
    const progress = elevator.getProgressToNext();
    const floorHeight = getFloorHeight();
    const visualFloor = elevator.currentFloor + (elevator.state === 'moving' ? progress * (elevator.direction === 'up' ? 1 : -1) : 0);

    box.style.bottom = `${(visualFloor / TOTAL_FLOORS) * 100}%`;
    box.dataset.currentFloor = String(elevator.currentFloor);

    // Update state class
    box.classList.toggle('idle', elevator.state === 'idle');
    box.classList.toggle('moving', elevator.state === 'moving');
    box.classList.toggle('door-open', elevator.state === 'door-open');

    // Update direction indicator
    const dirIndicator = box.querySelector('.dir-indicator') as HTMLElement;
    if (!dirIndicator) {
      const di = document.createElement('div');
      di.className = 'dir-indicator';
      box.appendChild(di);
    }
    (box.querySelector('.dir-indicator') as HTMLElement).textContent =
      elevator.direction === 'up' ? '▲' : elevator.direction === 'down' ? '▼' : '';

    // Update destination buttons
    const destBtns = box.querySelectorAll('.dest-btn');
    destBtns.forEach(btn => {
      const btnFloor = parseInt(btn.dataset.floor!);
      const isActive = elevator.destinations.some(d => d.floor === btnFloor);
      btn.classList.toggle('active', isActive);
    });

    // Update passenger count badge
    let badge = box.querySelector('.passenger-badge') as HTMLElement;
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'passenger-badge';
      box.appendChild(badge);
    }
    badge.textContent = `${elevator.passengers}/${elevator.capacity}`;
  }

  // Update hall call buttons
  document.querySelectorAll('.hall-btn').forEach(btn => {
    const floor = parseInt(btn.dataset.floor!);
    const direction = btn.classList.contains('hall-up') ? 'up' : 'down';
    const floorData = building.floors[floor];
    const list = direction === 'up' ? floorData.upRequests : floorData.downRequests;
    const hasPending = list.some(r => !r.queued);
    btn.classList.toggle('active', hasPending);
  });

  // Update status
  const idleCount = building.elevators.filter(e => e.state === 'idle').length;
  const movingCount = building.elevators.filter(e => e.state === 'moving').length;
  const doorCount = building.elevators.filter(e => e.state === 'door-open').length;
  const queueCount = building.hallCallQueue.length;
  statusEl.textContent = `Idle: ${idleCount} | Moving: ${movingCount} | Doors: ${doorCount} | Queue: ${queueCount}`;
}

function getFloorHeight(): number {
  const firstRow = buildingEl.querySelector('.floor-row');
  return firstRow ? (firstRow as HTMLElement).offsetHeight : 80;
}

// ─── Animation Loop ──────────────────────────────────────────────────────────
function animate(timestamp: number): void {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  building.tick(deltaTime);
  render();

  requestAnimationFrame(animate);
}

// ─── Init ────────────────────────────────────────────────────────────────────
buildUI();
requestAnimationFrame(animate);
