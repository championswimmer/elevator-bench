import { Building } from "./building";
import type {
  BuildingSnapshot,
  Direction,
  ElevatorSnapshot,
  TravelDirection,
} from "./types";

const TOTAL_FLOORS = 10;
const ELEVATOR_COUNT = 4;
const TICK_MS = 850;
const FLOOR_HEIGHT = 78;
const FLOOR_GAP = 8;

document.documentElement.style.setProperty("--floor-count", `${TOTAL_FLOORS}`);
document.documentElement.style.setProperty("--floor-height", `${FLOOR_HEIGHT}px`);
document.documentElement.style.setProperty("--floor-gap", `${FLOOR_GAP}px`);

const floorsContainer = mustElement<HTMLDivElement>("floors");
const shaftsContainer = mustElement<HTMLDivElement>("shafts");
const elevatorPanels = mustElement<HTMLDivElement>("elevator-panels");
const eventLog = mustElement<HTMLUListElement>("event-log");
const queueList = mustElement<HTMLDivElement>("queue-list");
const pendingCount = mustElement<HTMLElement>("pending-count");
const activeCount = mustElement<HTMLElement>("active-count");
const systemStatus = mustElement<HTMLElement>("system-status");
const randomRequestButton = mustElement<HTMLButtonElement>("random-request");
const resetButton = mustElement<HTMLButtonElement>("reset-sim");

let building = new Building(TOTAL_FLOORS, ELEVATOR_COUNT);
let timer = window.setInterval(onTick, TICK_MS);

randomRequestButton.addEventListener("click", () => {
  building.injectRandomHallCall();
  render();
});

resetButton.addEventListener("click", () => {
  window.clearInterval(timer);
  building = new Building(TOTAL_FLOORS, ELEVATOR_COUNT);
  timer = window.setInterval(onTick, TICK_MS);
  render();
});

render();

function onTick(): void {
  building.tick();
  render();
}

function render(): void {
  const snapshot = building.getSnapshot();
  systemStatus.textContent = `${snapshot.elevatorCount} elevators • ${snapshot.totalFloors} floors • tick ${TICK_MS}ms`;

  renderFloors(snapshot);
  renderShafts(snapshot);
  renderElevatorPanels(snapshot);
  renderQueue(snapshot);
  renderLog(snapshot);
}

function renderFloors(snapshot: BuildingSnapshot): void {
  const activeRequests = new Set(
    snapshot.activeHallRequests.map((request) => `${request.floor}:${request.direction}`),
  );

  floorsContainer.replaceChildren();

  for (let floor = snapshot.totalFloors - 1; floor >= 0; floor -= 1) {
    const row = document.createElement("div");
    row.className = "floor-row";

    const caption = document.createElement("div");
    caption.className = "floor-caption";
    caption.innerHTML = `<strong>${floor}</strong><span>Floor</span>`;

    const controls = document.createElement("div");
    controls.className = "hall-controls";

    const upButton = createHallButton("Up", "▲", floor, "up", activeRequests, snapshot);
    const downButton = createHallButton("Down", "▼", floor, "down", activeRequests, snapshot);

    controls.append(upButton, downButton);
    row.append(caption, controls);
    floorsContainer.append(row);
  }
}

function createHallButton(
  label: string,
  symbol: string,
  floor: number,
  direction: TravelDirection,
  activeRequests: Set<string>,
  snapshot: BuildingSnapshot,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "hall-button";
  button.textContent = symbol;
  button.setAttribute("aria-label", `${label} from floor ${floor}`);

  if (
    (floor === 0 && direction === "down") ||
    (floor === snapshot.totalFloors - 1 && direction === "up")
  ) {
    button.disabled = true;
    return button;
  }

  if (activeRequests.has(`${floor}:${direction}`)) {
    button.classList.add("active");
  }

  button.addEventListener("click", () => {
    building.requestElevator(floor, direction);
    render();
  });

  return button;
}

function renderShafts(snapshot: BuildingSnapshot): void {
  shaftsContainer.replaceChildren();

  for (const elevator of snapshot.elevators) {
    const column = document.createElement("div");
    column.className = "shaft-column";

    const label = document.createElement("div");
    label.className = "shaft-label";
    label.textContent = `Elevator ${elevator.id}`;

    const track = document.createElement("div");
    track.className = "shaft-track";

    const cabin = document.createElement("div");
    cabin.className = `cabin ${movementClass(elevator.direction)}${elevator.doorOpen ? " open" : ""}`;
    cabin.style.bottom = `${getCabinBottom(elevator.currentFloor)}px`;

    const cabinHeader = document.createElement("div");
    cabinHeader.className = "cabin-header";
    cabinHeader.innerHTML = `<span class="cabin-id">E${elevator.id}</span><span class="cabin-floor">F${elevator.currentFloor}</span>`;

    cabin.append(cabinHeader);
    track.append(cabin);
    column.append(label, track);
    shaftsContainer.append(column);
  }
}

function renderElevatorPanels(snapshot: BuildingSnapshot): void {
  elevatorPanels.replaceChildren();

  for (const elevator of snapshot.elevators) {
    const card = document.createElement("section");
    card.className = "elevator-card";

    const queuedFloors = [...new Set([...elevator.upStops, ...elevator.downStops])]
      .sort((a, b) => a - b)
      .join(", ");

    const header = document.createElement("header");
    header.innerHTML = `
      <div>
        <h3>Elevator ${elevator.id}</h3>
        <p class="queue-state">${queuedFloors || "No queued stops"}</p>
      </div>
      <span class="direction-tag direction-${elevator.direction}">${elevator.direction}</span>
    `;

    const summary = document.createElement("div");
    summary.className = "panel-summary";
    summary.innerHTML = `
      <div class="summary-block">
        <span class="metric-label">Current floor</span>
        <strong>${elevator.currentFloor}</strong>
      </div>
      <div class="summary-block">
        <span class="metric-label">Doors</span>
        <strong>${elevator.doorOpen ? "Open" : "Closed"}</strong>
      </div>
    `;

    const grid = document.createElement("div");
    grid.className = "cabin-grid";

    for (let floor = snapshot.totalFloors - 1; floor >= 0; floor -= 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cabin-button";
      button.textContent = `${floor}`;

      if (isFloorQueued(elevator, floor)) {
        button.classList.add("active");
      }

      button.addEventListener("click", () => {
        building.requestFloor(elevator.id, floor);
        render();
      });

      grid.append(button);
    }

    card.append(header, summary, grid);
    elevatorPanels.append(card);
  }
}

function renderQueue(snapshot: BuildingSnapshot): void {
  pendingCount.textContent = `${snapshot.pendingHallRequests.length}`;
  activeCount.textContent = `${snapshot.activeHallRequests.length}`;

  queueList.replaceChildren();

  if (snapshot.activeHallRequests.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No active hall traffic.";
    queueList.append(empty);
    return;
  }

  const pendingKeys = new Set(
    snapshot.pendingHallRequests.map((request) => `${request.floor}:${request.direction}`),
  );

  for (const request of snapshot.activeHallRequests) {
    const pill = document.createElement("div");
    pill.className = "queue-pill";
    const state = pendingKeys.has(`${request.floor}:${request.direction}`)
      ? "Queued"
      : "Assigned";
    pill.innerHTML = `
      <strong>Floor ${request.floor}</strong>
      <span>${request.direction.toUpperCase()} • ${state}</span>
    `;
    queueList.append(pill);
  }
}

function renderLog(snapshot: BuildingSnapshot): void {
  eventLog.replaceChildren();

  for (const line of snapshot.eventLog) {
    const item = document.createElement("li");
    item.textContent = line;
    eventLog.append(item);
  }
}

function movementClass(direction: Direction): string {
  if (direction === "up") {
    return "moving-up";
  }

  if (direction === "down") {
    return "moving-down";
  }

  return "idle";
}

function getCabinBottom(floor: number): number {
  return floor * (FLOOR_HEIGHT + FLOOR_GAP) + 9;
}

function isFloorQueued(elevator: ElevatorSnapshot, floor: number): boolean {
  return elevator.upStops.includes(floor) || elevator.downStops.includes(floor);
}

function mustElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element as T;
}
