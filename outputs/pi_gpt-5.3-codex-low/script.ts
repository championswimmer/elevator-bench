import { Building } from "./building";

const FLOOR_COUNT = 10;
const ELEVATOR_COUNT = 4;
const TICK_MS = 900;

const building = new Building(FLOOR_COUNT, ELEVATOR_COUNT);
const buildingEl = document.getElementById("building") as HTMLDivElement;
const statusEl = document.getElementById("status") as HTMLDivElement;

const hallButtonMap = new Map<string, HTMLButtonElement>();
const carButtonMap = new Map<string, HTMLButtonElement>();
const elevatorEls: HTMLDivElement[] = [];

initUI();
render();
window.setInterval(() => {
  building.tick();
  render();
}, TICK_MS);

function initUI(): void {
  document.documentElement.style.setProperty("--floors", String(FLOOR_COUNT));

  for (let floor = FLOOR_COUNT - 1; floor >= 0; floor--) {
    const floorRow = document.createElement("div");
    floorRow.className = "floor-row";

    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = String(floor);

    const controls = document.createElement("div");
    controls.className = "floor-controls";

    if (floor < FLOOR_COUNT - 1) {
      const up = document.createElement("button");
      up.textContent = "↑ Up";
      up.addEventListener("click", () => {
        building.requestElevator(floor, 1);
        up.classList.add("active");
        render();
      });
      controls.appendChild(up);
      hallButtonMap.set(`${floor}:1`, up);
    }

    if (floor > 0) {
      const down = document.createElement("button");
      down.textContent = "↓ Down";
      down.addEventListener("click", () => {
        building.requestElevator(floor, -1);
        down.classList.add("active");
        render();
      });
      controls.appendChild(down);
      hallButtonMap.set(`${floor}:-1`, down);
    }

    floorRow.append(floorLabel, controls);
    buildingEl.appendChild(floorRow);
  }

  const shafts = document.createElement("div");
  shafts.className = "shafts";
  const floorHeight = 72;
  const carSize = 58;

  for (let i = 0; i < ELEVATOR_COUNT; i++) {
    const shaft = document.createElement("div");
    shaft.className = "shaft";

    const elevator = document.createElement("div");
    elevator.className = "elevator idle";
    elevator.style.top = `${(FLOOR_COUNT - 1) * floorHeight + (floorHeight - carSize) / 2}px`;

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `E${i}`;
    const at = document.createElement("div");
    at.className = "at";
    at.textContent = "F0";
    elevator.append(name, at);

    const panel = document.createElement("div");
    panel.className = "car-panel";
    for (let f = FLOOR_COUNT - 1; f >= 0; f--) {
      const b = document.createElement("button");
      b.textContent = String(f);
      b.addEventListener("click", () => {
        building.requestDestination(i, f);
        b.classList.add("active");
        render();
      });
      panel.appendChild(b);
      carButtonMap.set(`${i}:${f}`, b);
    }

    shaft.append(elevator, panel);
    shafts.appendChild(shaft);
    elevatorEls.push(elevator);
  }

  buildingEl.appendChild(shafts);
}

function render(): void {
  const floorHeight = 72;
  const carSize = 58;

  const snapshots = building.elevators.map((e) => e.getSnapshot());
  for (const s of snapshots) {
    const el = elevatorEls[s.id];
    el.classList.remove("idle", "up", "down");
    el.classList.add(s.direction === 1 ? "up" : s.direction === -1 ? "down" : "idle");
    const top = (FLOOR_COUNT - 1 - s.currentFloor) * floorHeight + (floorHeight - carSize) / 2;
    el.style.top = `${top}px`;
    (el.querySelector(".at") as HTMLDivElement).textContent = `F${s.currentFloor}`;

    for (let f = 0; f < FLOOR_COUNT; f++) {
      const b = carButtonMap.get(`${s.id}:${f}`);
      if (!b) continue;
      const active = s.targetsUp.includes(f) || s.targetsDown.includes(f);
      b.classList.toggle("active", active);
    }
  }

  for (const btn of hallButtonMap.values()) btn.classList.remove("active");
  for (const q of building.getQueuedCalls()) {
    hallButtonMap.get(`${q.floor}:${q.direction}`)?.classList.add("active");
  }

  const statusBlocks = snapshots
    .map((s) => {
      const state = s.direction === 1 ? "Up" : s.direction === -1 ? "Down" : "Idle";
      const queue = [...s.targetsUp, ...s.targetsDown].join(", ") || "none";
      return `<div class="elevator-status"><strong>Elevator ${s.id}</strong><br/>Floor: ${s.currentFloor}<br/>State: ${state}<br/>Targets: ${queue}</div>`;
    })
    .join("");

  const queued = building.getQueuedCalls();
  statusEl.innerHTML = `${statusBlocks}<div class="elevator-status"><strong>Queued hall calls:</strong> ${queued.length === 0 ? "none" : queued.map((q) => `F${q.floor}${q.direction === 1 ? "↑" : "↓"}`).join(", ")}</div>`;
}
