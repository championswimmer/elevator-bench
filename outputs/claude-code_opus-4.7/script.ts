import { CONFIG } from './types.js';
import { Building } from './Building.js';

const building = new Building(
  CONFIG.NUM_FLOORS,
  CONFIG.NUM_ELEVATORS,
  CONFIG.ELEVATOR_SPEED,
  CONFIG.DOOR_OPEN_DURATION,
);

function floorLabel(f: number): string {
  return f === 0 ? 'G' : String(f);
}

function setupBuildingDOM(): void {
  const root = document.getElementById('building')!;
  root.style.setProperty('--floor-height', CONFIG.FLOOR_HEIGHT_PX + 'px');
  root.style.setProperty('--num-floors', String(CONFIG.NUM_FLOORS));

  const floorsCol = document.createElement('div');
  floorsCol.className = 'floors-column';
  floorsCol.style.height = (CONFIG.NUM_FLOORS * CONFIG.FLOOR_HEIGHT_PX) + 'px';

  for (let f = CONFIG.NUM_FLOORS - 1; f >= 0; f--) {
    const row = document.createElement('div');
    row.className = 'floor-row';
    row.dataset.floor = String(f);

    const label = document.createElement('div');
    label.className = 'floor-label';
    label.textContent = floorLabel(f);
    row.appendChild(label);

    const buttons = document.createElement('div');
    buttons.className = 'hall-buttons';

    if (f < CONFIG.NUM_FLOORS - 1) {
      const upBtn = document.createElement('button');
      upBtn.className = 'hall-btn up';
      upBtn.textContent = '▲';
      upBtn.dataset.floor = String(f);
      upBtn.dataset.dir = 'up';
      upBtn.title = `Call up from floor ${floorLabel(f)}`;
      upBtn.addEventListener('click', () => building.requestHallCall(f, 'up'));
      buttons.appendChild(upBtn);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'hall-btn placeholder';
      buttons.appendChild(placeholder);
    }

    if (f > 0) {
      const downBtn = document.createElement('button');
      downBtn.className = 'hall-btn down';
      downBtn.textContent = '▼';
      downBtn.dataset.floor = String(f);
      downBtn.dataset.dir = 'down';
      downBtn.title = `Call down from floor ${floorLabel(f)}`;
      downBtn.addEventListener('click', () => building.requestHallCall(f, 'down'));
      buttons.appendChild(downBtn);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'hall-btn placeholder';
      buttons.appendChild(placeholder);
    }

    row.appendChild(buttons);
    floorsCol.appendChild(row);
  }
  root.appendChild(floorsCol);

  for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
    const shaft = document.createElement('div');
    shaft.className = 'shaft';
    shaft.dataset.shaft = String(i);
    shaft.style.height = (CONFIG.NUM_FLOORS * CONFIG.FLOOR_HEIGHT_PX) + 'px';

    const shaftLabel = document.createElement('div');
    shaftLabel.className = 'shaft-label';
    shaftLabel.textContent = `E${i}`;
    shaft.appendChild(shaftLabel);

    const elevator = document.createElement('div');
    elevator.className = 'elevator idle';
    elevator.id = 'elevator-' + i;
    elevator.style.height = CONFIG.FLOOR_HEIGHT_PX + 'px';

    const car = document.createElement('div');
    car.className = 'elevator-car';

    const indicator = document.createElement('div');
    indicator.className = 'elevator-indicator';
    indicator.id = 'indicator-' + i;
    indicator.textContent = '•';

    const elevId = document.createElement('div');
    elevId.className = 'elevator-id';
    elevId.textContent = String(i);

    const doorL = document.createElement('div');
    doorL.className = 'door door-left';
    const doorR = document.createElement('div');
    doorR.className = 'door door-right';

    car.appendChild(indicator);
    car.appendChild(elevId);
    car.appendChild(doorL);
    car.appendChild(doorR);
    elevator.appendChild(car);
    shaft.appendChild(elevator);

    root.appendChild(shaft);
  }
}

function setupElevatorPanels(): void {
  const panelsEl = document.getElementById('elevator-panels')!;
  for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
    const card = document.createElement('div');
    card.className = 'elevator-panel';
    card.id = 'panel-' + i;

    const header = document.createElement('div');
    header.className = 'panel-header';
    const title = document.createElement('span');
    title.className = 'panel-title';
    title.textContent = `Elevator ${i}`;
    const status = document.createElement('span');
    status.className = 'panel-status';
    status.id = 'status-' + i;
    status.textContent = 'Idle • G';
    header.appendChild(title);
    header.appendChild(status);
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'car-buttons';
    for (let f = CONFIG.NUM_FLOORS - 1; f >= 0; f--) {
      const btn = document.createElement('button');
      btn.className = 'car-btn';
      btn.textContent = floorLabel(f);
      btn.dataset.elevator = String(i);
      btn.dataset.floor = String(f);
      btn.addEventListener('click', () => building.requestCarCall(i, f));
      grid.appendChild(btn);
    }
    card.appendChild(grid);

    panelsEl.appendChild(card);
  }
}

function render(): void {
  document.querySelectorAll<HTMLButtonElement>('.hall-btn').forEach(btn => {
    if (!btn.dataset.dir) return;
    const f = Number(btn.dataset.floor);
    const dir = btn.dataset.dir;
    const lit = dir === 'up' ? building.hallUp.has(f) : building.hallDown.has(f);
    btn.classList.toggle('lit', lit);
  });

  for (let i = 0; i < CONFIG.NUM_ELEVATORS; i++) {
    const e = building.elevators[i];
    const elev = document.getElementById('elevator-' + i)!;
    const offsetPx = e.position * CONFIG.FLOOR_HEIGHT_PX;
    elev.style.transform = `translateY(-${offsetPx}px)`;

    elev.classList.toggle('moving-up', e.direction === 'up' && !e.doorOpen);
    elev.classList.toggle('moving-down', e.direction === 'down' && !e.doorOpen);
    elev.classList.toggle('idle', e.direction === 'idle' && !e.doorOpen);
    elev.classList.toggle('door-open', e.doorOpen);

    const indicator = document.getElementById('indicator-' + i)!;
    if (e.doorOpen) indicator.textContent = '◇';
    else if (e.direction === 'up') indicator.textContent = '▲';
    else if (e.direction === 'down') indicator.textContent = '▼';
    else indicator.textContent = '•';

    const status = document.getElementById('status-' + i)!;
    let dirText: string;
    if (e.doorOpen) dirText = 'Doors Open';
    else if (e.direction === 'up') dirText = 'Going Up';
    else if (e.direction === 'down') dirText = 'Going Down';
    else dirText = 'Idle';
    status.textContent = `${dirText} • ${floorLabel(e.currentFloor)}`;

    const panel = document.getElementById('panel-' + i)!;
    panel.querySelectorAll<HTMLButtonElement>('.car-btn').forEach(btn => {
      const f = Number(btn.dataset.floor);
      btn.classList.toggle('lit', e.carCalls.has(f));
      btn.classList.toggle('current', e.currentFloor === f && e.doorOpen);
    });
  }
}

let lastTime = 0;
function loop(time: number): void {
  const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  building.tick(dt);
  render();
  requestAnimationFrame(loop);
}

function init(): void {
  setupBuildingDOM();
  setupElevatorPanels();
  render();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
