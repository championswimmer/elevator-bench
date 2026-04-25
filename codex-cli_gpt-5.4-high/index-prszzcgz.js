// elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  direction = "idle";
  doorOpenTicks = 0;
  upStops = new Set;
  downStops = new Set;
  constructor(id) {
    this.id = id;
  }
  get isIdle() {
    return this.direction === "idle" && !this.doorOpen && !this.hasQueuedStops();
  }
  get doorOpen() {
    return this.doorOpenTicks > 0;
  }
  get pendingStops() {
    return [...new Set([...this.getOrderedStops("up"), ...this.getOrderedStops("down")])];
  }
  requestStop(targetFloor, preferredDirection) {
    if (targetFloor === this.currentFloor) {
      if (preferredDirection === "down") {
        this.downStops.add(targetFloor);
      } else {
        this.upStops.add(targetFloor);
      }
      return;
    }
    if (targetFloor > this.currentFloor) {
      this.upStops.add(targetFloor);
      return;
    }
    this.downStops.add(targetFloor);
  }
  canServeOnCurrentPath(floor, direction) {
    if (this.direction !== direction) {
      return false;
    }
    if (direction === "up") {
      return floor >= this.currentFloor;
    }
    return floor <= this.currentFloor;
  }
  distanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  step(totalFloors) {
    const events = [];
    if (this.doorOpenTicks > 0) {
      this.doorOpenTicks -= 1;
      if (this.doorOpenTicks === 0) {
        events.push(`Elevator ${this.id} doors closed at floor ${this.currentFloor}.`);
      }
      return {
        events,
        servicedDirections: [],
        stoppedAtFloor: null
      };
    }
    const servicedHere = this.collectServicedDirectionsAtCurrentFloor();
    if (servicedHere.length > 0) {
      this.openDoorsAtCurrentFloor();
      events.push(`Elevator ${this.id} served floor ${this.currentFloor} for ${servicedHere.join(" & ")} traffic.`);
      this.refreshDirection();
      return {
        events,
        servicedDirections: servicedHere,
        stoppedAtFloor: this.currentFloor
      };
    }
    if (this.direction === "idle") {
      this.direction = this.pickNextDirection();
      if (this.direction === "idle") {
        return {
          events,
          servicedDirections: [],
          stoppedAtFloor: null
        };
      }
    }
    if (!this.hasStopsInDirection(this.direction)) {
      this.direction = this.reverseOrIdle();
      if (this.direction === "idle") {
        return {
          events,
          servicedDirections: [],
          stoppedAtFloor: null
        };
      }
    }
    const nextFloor = this.direction === "up" ? this.currentFloor + 1 : this.currentFloor - 1;
    if (nextFloor < 0 || nextFloor >= totalFloors) {
      this.direction = this.reverseOrIdle();
      return {
        events,
        servicedDirections: [],
        stoppedAtFloor: null
      };
    }
    this.currentFloor = nextFloor;
    events.push(`Elevator ${this.id} moved ${this.direction} to floor ${this.currentFloor}.`);
    const servicedAfterMove = this.collectServicedDirectionsAtCurrentFloor();
    if (servicedAfterMove.length > 0) {
      this.openDoorsAtCurrentFloor();
      events.push(`Elevator ${this.id} served floor ${this.currentFloor} for ${servicedAfterMove.join(" & ")} traffic.`);
      this.refreshDirection();
      return {
        events,
        servicedDirections: servicedAfterMove,
        stoppedAtFloor: this.currentFloor
      };
    }
    this.refreshDirection();
    return {
      events,
      servicedDirections: [],
      stoppedAtFloor: null
    };
  }
  snapshot() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      doorOpen: this.doorOpen,
      upStops: this.getOrderedStops("up"),
      downStops: this.getOrderedStops("down")
    };
  }
  hasQueuedStops() {
    return this.upStops.size > 0 || this.downStops.size > 0;
  }
  getOrderedStops(direction) {
    const source = direction === "up" ? this.upStops : this.downStops;
    const ordered = [...source];
    ordered.sort((a, b) => direction === "up" ? a - b : b - a);
    return ordered;
  }
  hasStopsInDirection(direction) {
    if (direction === "idle") {
      return false;
    }
    if (direction === "up") {
      return [...this.upStops].some((stop) => stop >= this.currentFloor);
    }
    return [...this.downStops].some((stop) => stop <= this.currentFloor);
  }
  collectServicedDirectionsAtCurrentFloor() {
    const serviced = [];
    if (this.upStops.has(this.currentFloor)) {
      serviced.push("up");
      this.upStops.delete(this.currentFloor);
    }
    if (this.downStops.has(this.currentFloor)) {
      serviced.push("down");
      this.downStops.delete(this.currentFloor);
    }
    return serviced;
  }
  openDoorsAtCurrentFloor() {
    this.doorOpenTicks = 1;
  }
  pickNextDirection() {
    const nearestUp = this.getNearestStopDistance("up");
    const nearestDown = this.getNearestStopDistance("down");
    if (nearestUp === null && nearestDown === null) {
      return "idle";
    }
    if (nearestDown === null) {
      return "up";
    }
    if (nearestUp === null) {
      return "down";
    }
    return nearestUp <= nearestDown ? "up" : "down";
  }
  getNearestStopDistance(direction) {
    const stops = this.getOrderedStops(direction);
    if (stops.length === 0) {
      return null;
    }
    return Math.min(...stops.map((stop) => Math.abs(stop - this.currentFloor)));
  }
  reverseOrIdle() {
    if (this.direction === "up" && this.downStops.size > 0) {
      return "down";
    }
    if (this.direction === "down" && this.upStops.size > 0) {
      return "up";
    }
    return this.pickNextDirection();
  }
  refreshDirection() {
    if (this.direction === "up" && this.hasStopsInDirection("up")) {
      return;
    }
    if (this.direction === "down" && this.hasStopsInDirection("down")) {
      return;
    }
    this.direction = this.reverseOrIdle();
  }
}

// building.ts
class Building {
  totalFloors;
  elevators;
  activeHallRequests = new Map;
  pendingHallRequests = [];
  eventLog = [];
  constructor(totalFloors, elevatorCount) {
    this.totalFloors = totalFloors;
    this.elevators = Array.from({ length: elevatorCount }, (_, index) => new Elevator(index));
    this.pushEvent(`Simulation ready with ${elevatorCount} elevators at floor 0 across ${totalFloors} floors.`);
  }
  getSnapshot() {
    return {
      totalFloors: this.totalFloors,
      elevatorCount: this.elevators.length,
      elevators: this.elevators.map((elevator) => elevator.snapshot()),
      activeHallRequests: [...this.activeHallRequests.values()].sort((a, b) => {
        if (a.floor === b.floor) {
          return a.direction.localeCompare(b.direction);
        }
        return b.floor - a.floor;
      }),
      pendingHallRequests: [...this.pendingHallRequests].sort((a, b) => {
        if (a.floor === b.floor) {
          return a.direction.localeCompare(b.direction);
        }
        return b.floor - a.floor;
      }),
      eventLog: [...this.eventLog]
    };
  }
  requestElevator(floor, direction) {
    const request = this.ensureHallRequest(floor, direction);
    if (!request) {
      this.pushEvent(`Hall call for floor ${floor} (${direction}) is already active.`);
      return;
    }
    const assigned = this.assignHallRequest(request);
    if (!assigned) {
      this.pendingHallRequests.push(request);
      this.pushEvent(`Queued hall call at floor ${floor} (${direction}) until a cabin frees up.`);
    }
  }
  requestFloor(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (!elevator) {
      return;
    }
    elevator.requestStop(floor);
    this.pushEvent(`Elevator ${elevatorId} received an internal request for floor ${floor}.`);
  }
  tick() {
    for (const elevator of this.elevators) {
      const result = elevator.step(this.totalFloors);
      for (const event of result.events) {
        this.pushEvent(event);
      }
      if (result.stoppedAtFloor !== null) {
        this.clearServicedHallCalls(result.stoppedAtFloor, result.servicedDirections);
      }
    }
    if (this.pendingHallRequests.length > 0) {
      const remaining = [];
      for (const request of this.pendingHallRequests) {
        const assigned = this.assignHallRequest(request);
        if (!assigned) {
          remaining.push(request);
        }
      }
      this.pendingHallRequests.length = 0;
      this.pendingHallRequests.push(...remaining);
    }
  }
  injectRandomHallCall() {
    const floor = Math.floor(Math.random() * this.totalFloors);
    const direction = this.pickValidDirectionForFloor(floor);
    this.requestElevator(floor, direction);
  }
  ensureHallRequest(floor, direction) {
    const key = this.getHallKey(floor, direction);
    if (this.activeHallRequests.has(key)) {
      return null;
    }
    const request = {
      floor,
      direction,
      createdAt: Date.now()
    };
    this.activeHallRequests.set(key, request);
    return request;
  }
  assignHallRequest(request) {
    const movingCandidates = this.elevators.filter((elevator) => elevator.canServeOnCurrentPath(request.floor, request.direction)).sort((left, right) => this.compareElevatorsForRequest(left, right, request.floor));
    const idleCandidates = this.elevators.filter((elevator) => elevator.isIdle).sort((left, right) => this.compareElevatorsForRequest(left, right, request.floor));
    const selected = movingCandidates[0] ?? idleCandidates[0];
    if (!selected) {
      return false;
    }
    selected.requestStop(request.floor, request.direction);
    this.pushEvent(`Assigned floor ${request.floor} (${request.direction}) to elevator ${selected.id}.`);
    return true;
  }
  compareElevatorsForRequest(left, right, floor) {
    const distanceDiff = left.distanceToFloor(floor) - right.distanceToFloor(floor);
    if (distanceDiff !== 0) {
      return distanceDiff;
    }
    return left.id - right.id;
  }
  clearServicedHallCalls(floor, directions) {
    for (const direction of directions) {
      const key = this.getHallKey(floor, direction);
      if (this.activeHallRequests.delete(key)) {
        this.pushEvent(`Hall call cleared at floor ${floor} (${direction}).`);
      }
    }
  }
  pickValidDirectionForFloor(floor) {
    if (floor === 0) {
      return "up";
    }
    if (floor === this.totalFloors - 1) {
      return "down";
    }
    return Math.random() > 0.5 ? "up" : "down";
  }
  getHallKey(floor, direction) {
    return `${floor}:${direction}`;
  }
  pushEvent(event) {
    this.eventLog.unshift(event);
    this.eventLog.splice(18);
  }
}

// script.ts
var TOTAL_FLOORS = 10;
var ELEVATOR_COUNT = 4;
var TICK_MS = 850;
var FLOOR_HEIGHT = 78;
var FLOOR_GAP = 8;
document.documentElement.style.setProperty("--floor-count", `${TOTAL_FLOORS}`);
document.documentElement.style.setProperty("--floor-height", `${FLOOR_HEIGHT}px`);
document.documentElement.style.setProperty("--floor-gap", `${FLOOR_GAP}px`);
var floorsContainer = mustElement("floors");
var shaftsContainer = mustElement("shafts");
var elevatorPanels = mustElement("elevator-panels");
var eventLog = mustElement("event-log");
var queueList = mustElement("queue-list");
var pendingCount = mustElement("pending-count");
var activeCount = mustElement("active-count");
var systemStatus = mustElement("system-status");
var randomRequestButton = mustElement("random-request");
var resetButton = mustElement("reset-sim");
var building = new Building(TOTAL_FLOORS, ELEVATOR_COUNT);
var timer = window.setInterval(onTick, TICK_MS);
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
function onTick() {
  building.tick();
  render();
}
function render() {
  const snapshot = building.getSnapshot();
  systemStatus.textContent = `${snapshot.elevatorCount} elevators • ${snapshot.totalFloors} floors • tick ${TICK_MS}ms`;
  renderFloors(snapshot);
  renderShafts(snapshot);
  renderElevatorPanels(snapshot);
  renderQueue(snapshot);
  renderLog(snapshot);
}
function renderFloors(snapshot) {
  const activeRequests = new Set(snapshot.activeHallRequests.map((request) => `${request.floor}:${request.direction}`));
  floorsContainer.replaceChildren();
  for (let floor = snapshot.totalFloors - 1;floor >= 0; floor -= 1) {
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
function createHallButton(label, symbol, floor, direction, activeRequests, snapshot) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "hall-button";
  button.textContent = symbol;
  button.setAttribute("aria-label", `${label} from floor ${floor}`);
  if (floor === 0 && direction === "down" || floor === snapshot.totalFloors - 1 && direction === "up") {
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
function renderShafts(snapshot) {
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
function renderElevatorPanels(snapshot) {
  elevatorPanels.replaceChildren();
  for (const elevator of snapshot.elevators) {
    const card = document.createElement("section");
    card.className = "elevator-card";
    const queuedFloors = [...new Set([...elevator.upStops, ...elevator.downStops])].sort((a, b) => a - b).join(", ");
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
    for (let floor = snapshot.totalFloors - 1;floor >= 0; floor -= 1) {
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
function renderQueue(snapshot) {
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
  const pendingKeys = new Set(snapshot.pendingHallRequests.map((request) => `${request.floor}:${request.direction}`));
  for (const request of snapshot.activeHallRequests) {
    const pill = document.createElement("div");
    pill.className = "queue-pill";
    const state = pendingKeys.has(`${request.floor}:${request.direction}`) ? "Queued" : "Assigned";
    pill.innerHTML = `
      <strong>Floor ${request.floor}</strong>
      <span>${request.direction.toUpperCase()} • ${state}</span>
    `;
    queueList.append(pill);
  }
}
function renderLog(snapshot) {
  eventLog.replaceChildren();
  for (const line of snapshot.eventLog) {
    const item = document.createElement("li");
    item.textContent = line;
    eventLog.append(item);
  }
}
function movementClass(direction) {
  if (direction === "up") {
    return "moving-up";
  }
  if (direction === "down") {
    return "moving-down";
  }
  return "idle";
}
function getCabinBottom(floor) {
  return floor * (FLOOR_HEIGHT + FLOOR_GAP) + 9;
}
function isFloorQueued(elevator, floor) {
  return elevator.upStops.includes(floor) || elevator.downStops.includes(floor);
}
function mustElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element;
}
