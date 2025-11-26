// config.ts
var DEFAULT_CONFIG = {
  floors: 10,
  elevators: 4,
  floorHeightPx: 64,
  tickMs: 800,
  doorHoldMs: 1200
};

// elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  direction = 0 /* Idle */;
  state = "IDLE" /* Idle */;
  doorHoldMs;
  totalFloors;
  floorHeightPx;
  carElement;
  statusElement;
  panelButtons;
  onIdle;
  onArrive;
  upQueue = [];
  downQueue = [];
  doorHoldUntil = 0;
  activeStops = new Set;
  constructor(options) {
    this.id = options.id;
    this.totalFloors = options.totalFloors;
    this.doorHoldMs = options.doorHoldMs;
    this.floorHeightPx = options.floorHeightPx;
    this.carElement = options.carElement;
    this.statusElement = options.statusElement;
    this.panelButtons = options.panelButtons;
    this.onIdle = options.onIdle;
    this.onArrive = options.onArrive;
    this.panelButtons.forEach((button, floor) => {
      button.addEventListener("click", () => {
        this.addStop(floor);
      });
    });
    this.updateCarPosition();
    this.updateStatus();
  }
  tick(now) {
    if (this.state === "LOADING" /* Loading */) {
      if (now >= this.doorHoldUntil) {
        this.state = "IDLE" /* Idle */;
        this.selectDirection();
        if (this.direction === 0 /* Idle */) {
          this.notifyIdle();
        }
      } else {
        return;
      }
    }
    this.selectDirection();
    const target = this.peekNextStop();
    if (target === undefined) {
      this.state = "IDLE" /* Idle */;
      this.direction = 0 /* Idle */;
      this.updateStatus();
      return;
    }
    if (this.currentFloor === target) {
      this.handleArrival(now, target);
      return;
    }
    this.state = "MOVING" /* Moving */;
    this.currentFloor += this.direction === 1 /* Up */ ? 1 : -1;
    this.updateCarPosition();
    if (this.currentFloor === target) {
      this.handleArrival(now, target);
    } else {
      this.updateStatus();
    }
  }
  addStop(floor) {
    if (floor < 0 || floor >= this.totalFloors)
      return;
    if (floor === this.currentFloor && this.direction === 0 /* Idle */) {
      this.handleImmediateArrival(performance.now(), floor);
      return;
    }
    if (this.direction === 1 /* Up */) {
      this.enqueueRelative(floor, floor >= this.currentFloor);
    } else if (this.direction === -1 /* Down */) {
      this.enqueueRelative(floor, floor > this.currentFloor);
    } else {
      this.enqueueRelative(floor, floor >= this.currentFloor);
    }
    this.updatePanelIndicators();
  }
  hasPendingStops() {
    return this.upQueue.length > 0 || this.downQueue.length > 0;
  }
  canServe(floor, direction) {
    if (this.direction === 0 /* Idle */) {
      return true;
    }
    if (this.direction !== direction) {
      return false;
    }
    if (direction === 1 /* Up */) {
      return floor >= this.currentFloor;
    }
    if (direction === -1 /* Down */) {
      return floor <= this.currentFloor;
    }
    return false;
  }
  distanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  enqueueRelative(floor, goesUp) {
    if (floor === this.currentFloor) {
      return;
    }
    if (goesUp) {
      if (this.upQueue.includes(floor))
        return;
      this.upQueue.push(floor);
      this.upQueue.sort((a, b) => a - b);
    } else {
      if (this.downQueue.includes(floor))
        return;
      this.downQueue.push(floor);
      this.downQueue.sort((a, b) => b - a);
    }
    this.activeStops.add(floor);
  }
  peekNextStop() {
    if (this.direction === 1 /* Up */) {
      return this.upQueue[0];
    }
    if (this.direction === -1 /* Down */) {
      return this.downQueue[0];
    }
    return;
  }
  selectDirection() {
    if (this.direction === 1 /* Up */ && this.upQueue.length > 0) {
      return;
    }
    if (this.direction === -1 /* Down */ && this.downQueue.length > 0) {
      return;
    }
    if (this.upQueue.length > 0) {
      this.direction = 1 /* Up */;
      return;
    }
    if (this.downQueue.length > 0) {
      this.direction = -1 /* Down */;
      return;
    }
    this.direction = 0 /* Idle */;
  }
  handleArrival(now, floor) {
    if (this.direction === 1 /* Up */) {
      this.upQueue.shift();
    } else if (this.direction === -1 /* Down */) {
      this.downQueue.shift();
    }
    this.activeStops.delete(floor);
    this.updatePanelIndicators();
    this.state = "LOADING" /* Loading */;
    this.doorHoldUntil = now + this.doorHoldMs;
    this.updateCarPosition();
    this.updateStatus();
    if (this.onArrive) {
      this.onArrive(this, floor);
    }
    if (!this.hasPendingStops()) {
      this.direction = 0 /* Idle */;
      this.notifyIdle();
    }
  }
  handleImmediateArrival(now, floor) {
    this.state = "LOADING" /* Loading */;
    this.doorHoldUntil = now + this.doorHoldMs;
    this.activeStops.delete(floor);
    this.updatePanelIndicators();
    this.updateStatus();
    if (this.onArrive) {
      this.onArrive(this, floor);
    }
    this.notifyIdle();
  }
  notifyIdle() {
    this.onIdle(this);
  }
  updateCarPosition() {
    this.carElement.style.setProperty("--current-floor", `${this.currentFloor}`);
    this.carElement.style.setProperty("bottom", `${this.currentFloor * this.floorHeightPx}px`);
    this.carElement.dataset.floor = `${this.currentFloor}`;
  }
  updatePanelIndicators() {
    this.panelButtons.forEach((button, floor) => {
      if (this.activeStops.has(floor)) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }
  updateStatus() {
    const directionText = this.direction === 1 /* Up */ ? "↑" : this.direction === -1 /* Down */ ? "↓" : "•";
    this.statusElement.textContent = `Floor ${this.currentFloor} ${directionText} ${this.state}`;
  }
}

// building.ts
class Building {
  config;
  elevators = [];
  floorButtons = new Map;
  pendingRequests = [];
  pendingKeys = new Set;
  tickHandle;
  floorsContainer;
  shaftsContainer;
  panelsContainer;
  constructor(config) {
    this.config = config;
  }
  init() {
    this.grabContainers();
    this.renderFloors();
    this.renderElevators();
    this.tickHandle = window.setInterval(() => this.tick(), this.config.tickMs);
  }
  requestElevator(floor, direction) {
    const key = this.requestKey(floor, direction);
    if (this.pendingKeys.has(key)) {
      return;
    }
    this.pendingKeys.add(key);
    this.toggleFloorButton(floor, direction, true);
    const elevator = this.findBestElevator(floor, direction);
    if (elevator) {
      elevator.addStop(floor);
    } else {
      this.pendingRequests.push({ floor, direction });
    }
  }
  tick() {
    const now = performance.now();
    this.elevators.forEach((elevator) => elevator.tick(now));
    this.dispatchPending();
  }
  grabContainers() {
    const floors = document.getElementById("floor-stack");
    const shafts = document.getElementById("shaft-stack");
    const panels = document.getElementById("panels");
    if (!floors || !shafts || !panels) {
      throw new Error("Missing simulator containers in index.html");
    }
    this.floorsContainer = floors;
    this.shaftsContainer = shafts;
    this.panelsContainer = panels;
    const buildingShell = document.querySelector(".building-shell");
    if (buildingShell instanceof HTMLElement) {
      buildingShell.style.setProperty("--floor-height", `${this.config.floorHeightPx}px`);
      buildingShell.style.setProperty("--floors", `${this.config.floors}`);
    }
  }
  renderFloors() {
    this.floorsContainer.innerHTML = "";
    this.floorButtons.clear();
    for (let floor = this.config.floors - 1;floor >= 0; floor -= 1) {
      const floorRow = document.createElement("div");
      floorRow.className = "floor-row";
      floorRow.dataset.floor = `${floor}`;
      const label = document.createElement("div");
      label.className = "floor-label";
      label.textContent = `Floor ${floor}`;
      const buttons = document.createElement("div");
      buttons.className = "floor-buttons";
      const group = {};
      if (floor < this.config.floors - 1) {
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "call-button up";
        upBtn.textContent = "↑";
        upBtn.addEventListener("click", () => this.requestElevator(floor, 1 /* Up */));
        buttons.appendChild(upBtn);
        group.up = upBtn;
      }
      if (floor > 0) {
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "call-button down";
        downBtn.textContent = "↓";
        downBtn.addEventListener("click", () => this.requestElevator(floor, -1 /* Down */));
        buttons.appendChild(downBtn);
        group.down = downBtn;
      }
      this.floorButtons.set(floor, group);
      floorRow.appendChild(label);
      floorRow.appendChild(buttons);
      this.floorsContainer.appendChild(floorRow);
    }
  }
  renderElevators() {
    this.shaftsContainer.innerHTML = "";
    this.panelsContainer.innerHTML = "";
    this.elevators = [];
    for (let i = 0;i < this.config.elevators; i += 1) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";
      const car = document.createElement("div");
      car.className = "elevator-car";
      car.dataset.id = `${i}`;
      car.style.setProperty("bottom", "0px");
      const door = document.createElement("div");
      door.className = "door";
      car.appendChild(door);
      shaft.appendChild(car);
      this.shaftsContainer.appendChild(shaft);
      const panel = document.createElement("div");
      panel.className = "panel";
      const heading = document.createElement("h3");
      heading.textContent = `Elevator ${i}`;
      const status = document.createElement("p");
      status.className = "status";
      status.textContent = "Floor 0 • IDLE";
      const buttonsWrap = document.createElement("div");
      buttonsWrap.className = "panel-buttons";
      const panelButtons = [];
      for (let floor = this.config.floors - 1;floor >= 0; floor -= 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${floor}`;
        buttonsWrap.appendChild(button);
        panelButtons[floor] = button;
      }
      panel.appendChild(heading);
      panel.appendChild(status);
      panel.appendChild(buttonsWrap);
      this.panelsContainer.appendChild(panel);
      const elevator = new Elevator({
        id: i,
        totalFloors: this.config.floors,
        doorHoldMs: this.config.doorHoldMs,
        floorHeightPx: this.config.floorHeightPx,
        carElement: car,
        statusElement: status,
        panelButtons,
        onIdle: () => this.dispatchPending(),
        onArrive: (_, floor) => this.handleArrival(floor)
      });
      this.elevators.push(elevator);
    }
  }
  dispatchPending() {
    if (!this.pendingRequests.length) {
      return;
    }
    const remaining = [];
    for (const request of this.pendingRequests) {
      const elevator = this.findBestElevator(request.floor, request.direction);
      if (elevator) {
        elevator.addStop(request.floor);
      } else {
        remaining.push(request);
      }
    }
    this.pendingRequests = remaining;
  }
  findBestElevator(floor, direction) {
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const elevator of this.elevators) {
      if (!elevator.canServe(floor, direction)) {
        continue;
      }
      const distance = elevator.distanceToFloor(floor);
      const penalty = elevator.state === "IDLE" /* Idle */ ? 0 : elevator.direction === direction ? 0.5 : 1;
      const score = distance + penalty;
      if (score < bestScore) {
        best = elevator;
        bestScore = score;
      }
    }
    return best;
  }
  requestKey(floor, direction) {
    return `${floor}:${direction}`;
  }
  toggleFloorButton(floor, direction, pending) {
    const group = this.floorButtons.get(floor);
    if (!group)
      return;
    const button = direction === 1 /* Up */ ? group.up : group.down;
    if (!button)
      return;
    button.disabled = pending;
    button.classList.toggle("pending", pending);
  }
  handleArrival(floor) {
    const keyUp = this.requestKey(floor, 1 /* Up */);
    const keyDown = this.requestKey(floor, -1 /* Down */);
    this.pendingKeys.delete(keyUp);
    this.pendingKeys.delete(keyDown);
    const group = this.floorButtons.get(floor);
    if (group?.up) {
      group.up.disabled = false;
      group.up.classList.remove("pending");
    }
    if (group?.down) {
      group.down.disabled = false;
      group.down.classList.remove("pending");
    }
    this.flashFloor(floor);
  }
  flashFloor(floor) {
    const row = this.floorsContainer.querySelector(`.floor-row[data-floor="${floor}"]`);
    if (!(row instanceof HTMLElement))
      return;
    row.classList.add("arriving");
    window.setTimeout(() => row.classList.remove("arriving"), 800);
  }
}

// script.ts
window.addEventListener("DOMContentLoaded", () => {
  const building = new Building(DEFAULT_CONFIG);
  building.init();
  window.simulator = building;
});
