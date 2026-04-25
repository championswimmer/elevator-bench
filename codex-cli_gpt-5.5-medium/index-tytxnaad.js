// script.js
var FLOOR_COUNT = 10;
var ELEVATOR_COUNT = 4;
var MOVE_INTERVAL_MS = 900;
var IDLE = "idle";
var UP = "up";
var DOWN = "down";

class Elevator {
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = IDLE;
    this.stops = new Set;
    this.assignedHallCalls = new Set;
  }
  get isIdle() {
    return this.direction === IDLE && this.stops.size === 0;
  }
  assignFloor(floor, hallCallKey = "") {
    this.stops.add(floor);
    if (hallCallKey) {
      this.assignedHallCalls.add(hallCallKey);
    }
    if (this.direction === IDLE && floor !== this.currentFloor) {
      this.direction = floor > this.currentFloor ? UP : DOWN;
    }
  }
  hasStopsAhead() {
    if (this.direction === UP) {
      return [...this.stops].some((floor) => floor > this.currentFloor);
    }
    if (this.direction === DOWN) {
      return [...this.stops].some((floor) => floor < this.currentFloor);
    }
    return false;
  }
  chooseDirection() {
    if (this.stops.size === 0) {
      this.direction = IDLE;
      return;
    }
    if (this.direction !== IDLE && this.hasStopsAhead()) {
      return;
    }
    const above = [...this.stops].filter((floor) => floor > this.currentFloor);
    const below = [...this.stops].filter((floor) => floor < this.currentFloor);
    if (this.direction === UP && above.length === 0 && below.length > 0) {
      this.direction = DOWN;
    } else if (this.direction === DOWN && below.length === 0 && above.length > 0) {
      this.direction = UP;
    } else if (above.length > 0) {
      this.direction = UP;
    } else if (below.length > 0) {
      this.direction = DOWN;
    } else {
      this.direction = IDLE;
    }
  }
  tick() {
    if (this.stops.has(this.currentFloor)) {
      this.stops.delete(this.currentFloor);
      this.chooseDirection();
      return true;
    }
    this.chooseDirection();
    if (this.direction === UP) {
      this.currentFloor = Math.min(FLOOR_COUNT - 1, this.currentFloor + 1);
    } else if (this.direction === DOWN) {
      this.currentFloor = Math.max(0, this.currentFloor - 1);
    }
    if (this.currentFloor === 0 || this.currentFloor === FLOOR_COUNT - 1) {
      this.chooseDirection();
    }
    return false;
  }
}

class Building {
  constructor() {
    this.elevators = Array.from({ length: ELEVATOR_COUNT }, (_, id) => new Elevator(id));
    this.hallQueue = [];
    this.activeHallCalls = new Set;
    this.logs = ["Simulation ready. All elevators are idle at floor 0."];
  }
  hallKey(floor, direction) {
    return `${floor}:${direction}`;
  }
  requestElevator(floor, direction) {
    const key = this.hallKey(floor, direction);
    if (this.activeHallCalls.has(key)) {
      this.log(`Floor ${floor} ${direction} request is already active.`);
      return;
    }
    this.activeHallCalls.add(key);
    const elevator = this.findElevatorForRequest(floor, direction);
    if (elevator) {
      elevator.assignFloor(floor, key);
      this.log(`Elevator ${elevator.id} assigned to floor ${floor} (${direction}).`);
    } else {
      this.hallQueue.push({ floor, direction, key });
      this.log(`Floor ${floor} ${direction} request queued.`);
    }
    render();
  }
  requestCabinFloor(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (floor === elevator.currentFloor) {
      this.log(`Elevator ${elevator.id} is already at floor ${floor}.`);
      return;
    }
    elevator.assignFloor(floor);
    this.log(`Elevator ${elevator.id} destination set to floor ${floor}.`);
    render();
  }
  findElevatorForRequest(floor, direction) {
    const candidates = this.elevators.filter((elevator) => this.canServe(elevator, floor, direction)).sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
    return candidates[0] || null;
  }
  canServe(elevator, floor, direction) {
    if (elevator.isIdle) {
      return true;
    }
    if (elevator.direction !== direction) {
      return false;
    }
    return direction === UP ? elevator.currentFloor <= floor : elevator.currentFloor >= floor;
  }
  assignQueuedRequests() {
    const remaining = [];
    for (const call of this.hallQueue) {
      const elevator = this.findElevatorForRequest(call.floor, call.direction);
      if (elevator) {
        elevator.assignFloor(call.floor, call.key);
        this.log(`Queued request at floor ${call.floor} assigned to elevator ${elevator.id}.`);
      } else {
        remaining.push(call);
      }
    }
    this.hallQueue = remaining;
  }
  tick() {
    for (const elevator of this.elevators) {
      const arrived = elevator.tick();
      if (arrived) {
        this.clearHallCallsForElevator(elevator);
        this.log(`Elevator ${elevator.id} opened at floor ${elevator.currentFloor}.`);
      }
    }
    this.assignQueuedRequests();
    render();
  }
  clearHallCallsForElevator(elevator) {
    for (const key of [...elevator.assignedHallCalls]) {
      if (key.startsWith(`${elevator.currentFloor}:`)) {
        this.activeHallCalls.delete(key);
        elevator.assignedHallCalls.delete(key);
      }
    }
  }
  log(message) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    this.logs = [`${time} - ${message}`, ...this.logs].slice(0, 12);
  }
}
var building = new Building;
var buildingElement = document.querySelector("#building");
var panelElement = document.querySelector("#elevatorPanels");
var queueElement = document.querySelector("#queueList");
var logElement = document.querySelector("#eventLog");
function icon(direction) {
  return direction === UP ? "▲" : "▼";
}
function renderBuilding() {
  buildingElement.innerHTML = "";
  for (let floor = FLOOR_COUNT - 1;floor >= 0; floor -= 1) {
    const row = document.createElement("div");
    row.className = "floor-row";
    const label = document.createElement("div");
    label.className = "floor-label";
    label.textContent = String(floor);
    const controls = document.createElement("div");
    controls.className = "hall-controls";
    [UP, DOWN].forEach((direction) => {
      const button = document.createElement("button");
      const unavailable = floor === 0 && direction === DOWN || floor === FLOOR_COUNT - 1 && direction === UP;
      const active = building.activeHallCalls.has(building.hallKey(floor, direction));
      button.className = `icon-button${active ? " active" : ""}`;
      button.type = "button";
      button.disabled = unavailable;
      button.title = unavailable ? "Unavailable on this floor" : `Request elevator ${direction}`;
      button.setAttribute("aria-label", `Request elevator ${direction} from floor ${floor}`);
      button.textContent = icon(direction);
      button.addEventListener("click", () => building.requestElevator(floor, direction));
      controls.append(button);
    });
    const shaftGrid = document.createElement("div");
    shaftGrid.className = "shaft-grid";
    building.elevators.forEach((elevator) => {
      const cell = document.createElement("div");
      cell.className = "shaft-cell";
      if (elevator.currentFloor === floor) {
        const car = document.createElement("div");
        car.className = `car${elevator.direction !== IDLE ? " moving" : ""}`;
        car.textContent = `E${elevator.id}`;
        car.title = `Elevator ${elevator.id}: ${elevator.direction}, floor ${elevator.currentFloor}`;
        cell.append(car);
      }
      shaftGrid.append(cell);
    });
    row.append(label, controls, shaftGrid);
    buildingElement.append(row);
  }
}
function renderPanels() {
  panelElement.innerHTML = "";
  building.elevators.forEach((elevator) => {
    const panel = document.createElement("article");
    panel.className = "elevator-panel";
    const status = document.createElement("div");
    status.className = "elevator-status";
    status.innerHTML = `
      <strong>Elevator ${elevator.id}</strong>
      <span>Floor ${elevator.currentFloor}</span>
      <span class="status-pill ${elevator.direction === IDLE ? "idle" : ""}">${elevator.direction}</span>
    `;
    const buttons = document.createElement("div");
    buttons.className = "floor-buttons";
    for (let floor = 0;floor < FLOOR_COUNT; floor += 1) {
      const button = document.createElement("button");
      button.className = `floor-button${elevator.stops.has(floor) ? " active" : ""}`;
      button.type = "button";
      button.textContent = String(floor);
      button.title = `Send elevator ${elevator.id} to floor ${floor}`;
      button.addEventListener("click", () => building.requestCabinFloor(elevator.id, floor));
      buttons.append(button);
    }
    panel.append(status, buttons);
    panelElement.append(panel);
  });
}
function renderQueue() {
  queueElement.innerHTML = "";
  if (building.hallQueue.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No queued hall calls.";
    queueElement.append(empty);
    return;
  }
  building.hallQueue.forEach((call) => {
    const item = document.createElement("li");
    item.textContent = `Floor ${call.floor} ${call.direction}`;
    queueElement.append(item);
  });
}
function renderLog() {
  logElement.innerHTML = "";
  building.logs.forEach((message) => {
    const event = document.createElement("div");
    event.className = "event";
    event.textContent = message;
    logElement.append(event);
  });
}
function render() {
  renderBuilding();
  renderPanels();
  renderQueue();
  renderLog();
}
render();
window.setInterval(() => building.tick(), MOVE_INTERVAL_MS);
