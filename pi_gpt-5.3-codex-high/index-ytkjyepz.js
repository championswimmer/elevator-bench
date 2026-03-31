// elevator.ts
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Elevator {
  id;
  floorCount;
  floorHeight;
  travelTimeMs;
  doorTimeMs;
  carElement;
  callbacks;
  currentFloor = 0;
  direction = "idle";
  moving = false;
  doorOpen = false;
  processing = false;
  pendingStops = new Set;
  constructor(config) {
    this.id = config.id;
    this.floorCount = config.floorCount;
    this.floorHeight = config.floorHeight;
    this.travelTimeMs = config.travelTimeMs;
    this.doorTimeMs = config.doorTimeMs;
    this.carElement = config.carElement;
    this.callbacks = config.callbacks ?? {};
    this.carElement.style.bottom = `${this.floorToBottom(0)}px`;
    this.emitState();
  }
  getCurrentFloor() {
    return this.currentFloor;
  }
  getDirection() {
    return this.direction;
  }
  getPendingFloors() {
    return [...this.pendingStops].sort((a, b) => a - b);
  }
  isIdle() {
    return !this.processing && !this.moving && !this.doorOpen && this.pendingStops.size === 0;
  }
  distanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  requestFloor(floor) {
    if (floor < 0 || floor >= this.floorCount)
      return;
    if (floor === this.currentFloor && !this.moving) {
      if (!this.pendingStops.has(floor)) {
        this.pendingStops.add(floor);
        this.emitQueueChange();
      }
    } else {
      if (this.pendingStops.has(floor))
        return;
      this.pendingStops.add(floor);
      this.emitQueueChange();
    }
    if (!this.processing) {
      this.processLoop();
    }
  }
  async processLoop() {
    if (this.processing)
      return;
    this.processing = true;
    while (this.pendingStops.size > 0) {
      if (this.pendingStops.has(this.currentFloor)) {
        await this.stopAtCurrentFloor();
        continue;
      }
      this.updateDirection();
      if (this.direction === "idle") {
        break;
      }
      const step = this.direction === "up" ? 1 : -1;
      const nextFloor = Math.max(0, Math.min(this.floorCount - 1, this.currentFloor + step));
      if (nextFloor === this.currentFloor) {
        this.direction = this.direction === "up" ? "down" : "up";
        this.emitState();
        continue;
      }
      await this.moveToFloor(nextFloor);
      if (this.pendingStops.has(this.currentFloor)) {
        await this.stopAtCurrentFloor();
      }
    }
    this.direction = "idle";
    this.processing = false;
    this.emitState();
    this.callbacks.onIdle?.(this);
  }
  updateDirection() {
    const pending = this.getPendingFloors();
    const hasAbove = pending.some((floor) => floor > this.currentFloor);
    const hasBelow = pending.some((floor) => floor < this.currentFloor);
    if (this.direction === "idle") {
      if (!hasAbove && !hasBelow)
        return;
      if (hasAbove && hasBelow) {
        const nearestAbove = Math.min(...pending.filter((floor) => floor > this.currentFloor)) - this.currentFloor;
        const nearestBelow = this.currentFloor - Math.max(...pending.filter((floor) => floor < this.currentFloor));
        this.direction = nearestAbove <= nearestBelow ? "up" : "down";
      } else {
        this.direction = hasAbove ? "up" : "down";
      }
      this.emitState();
      return;
    }
    if (this.direction === "up" && !hasAbove) {
      this.direction = hasBelow ? "down" : "idle";
      this.emitState();
      return;
    }
    if (this.direction === "down" && !hasBelow) {
      this.direction = hasAbove ? "up" : "idle";
      this.emitState();
    }
  }
  async moveToFloor(targetFloor) {
    this.moving = true;
    this.emitState();
    this.carElement.style.transition = `bottom ${this.travelTimeMs}ms linear`;
    this.carElement.style.bottom = `${this.floorToBottom(targetFloor)}px`;
    await wait(this.travelTimeMs);
    this.currentFloor = targetFloor;
    this.moving = false;
    this.emitState();
  }
  async stopAtCurrentFloor() {
    this.pendingStops.delete(this.currentFloor);
    this.emitQueueChange();
    this.doorOpen = true;
    this.carElement.classList.add("door-open");
    this.emitState();
    this.callbacks.onStop?.(this, this.currentFloor);
    await wait(this.doorTimeMs);
    this.doorOpen = false;
    this.carElement.classList.remove("door-open");
    this.emitState();
  }
  emitQueueChange() {
    this.callbacks.onQueueChange?.(this, this.getPendingFloors());
  }
  emitState() {
    this.callbacks.onStateChange?.(this);
  }
  floorToBottom(floor) {
    return floor * this.floorHeight + 4;
  }
}

// building.ts
class Building {
  config;
  elevators = [];
  hallButtons = new Map;
  panelButtons = new Map;
  statusElements = new Map;
  activeHallRequests = new Set;
  pendingHallRequests = [];
  constructor(config) {
    this.config = config;
  }
  init() {
    this.render();
    this.updateQueueInfo();
  }
  render() {
    this.config.buildingContainer.innerHTML = "";
    this.config.panelsContainer.innerHTML = "";
    const shell = document.createElement("div");
    shell.className = "building-shell";
    const floorColumn = document.createElement("div");
    floorColumn.className = "floor-column";
    const shafts = document.createElement("div");
    shafts.className = "shafts";
    const shaftHeight = this.config.floorCount * this.config.floorHeight;
    for (let floor = this.config.floorCount - 1;floor >= 0; floor -= 1) {
      const row = document.createElement("div");
      row.className = "floor-row";
      row.style.height = `${this.config.floorHeight}px`;
      const label = document.createElement("span");
      label.className = "floor-label";
      label.textContent = `Floor ${floor}`;
      const buttonWrap = document.createElement("div");
      buttonWrap.className = "hall-buttons";
      if (floor < this.config.floorCount - 1) {
        const upBtn = this.createHallButton(floor, "up", "↑");
        buttonWrap.append(upBtn);
      }
      if (floor > 0) {
        const downBtn = this.createHallButton(floor, "down", "↓");
        buttonWrap.append(downBtn);
      }
      row.append(label, buttonWrap);
      floorColumn.append(row);
    }
    for (let i = 0;i < this.config.elevatorCount; i += 1) {
      const shaft = document.createElement("div");
      shaft.className = "shaft";
      shaft.style.height = `${shaftHeight}px`;
      const car = document.createElement("div");
      car.className = "elevator-car";
      car.style.height = `${this.config.floorHeight - 10}px`;
      car.textContent = `${i}`;
      shaft.append(car);
      const elevator = new Elevator({
        id: i,
        floorCount: this.config.floorCount,
        floorHeight: this.config.floorHeight,
        travelTimeMs: this.config.travelTimeMs,
        doorTimeMs: this.config.doorTimeMs,
        carElement: car,
        callbacks: {
          onStateChange: (lift) => this.updateElevatorPanelStatus(lift),
          onStop: (lift, floor) => this.onElevatorStop(lift, floor),
          onIdle: () => this.dispatchPendingRequests(),
          onQueueChange: (lift, pendingFloors) => this.updatePanelFloorButtons(lift.id, pendingFloors)
        }
      });
      this.elevators.push(elevator);
      shafts.append(shaft);
      this.createElevatorPanel(elevator);
      this.updateElevatorPanelStatus(elevator);
    }
    shell.append(floorColumn, shafts);
    this.config.buildingContainer.append(shell);
  }
  createHallButton(floor, direction, label) {
    const btn = document.createElement("button");
    btn.className = "hall-btn";
    btn.textContent = label;
    btn.title = `Request ${direction} at floor ${floor}`;
    const key = this.requestKey(floor, direction);
    this.hallButtons.set(key, btn);
    btn.addEventListener("click", () => {
      this.handleHallRequest(floor, direction);
    });
    return btn;
  }
  createElevatorPanel(elevator) {
    const panel = document.createElement("section");
    panel.className = "panel";
    const title = document.createElement("h3");
    title.textContent = `Elevator ${elevator.id}`;
    const status = document.createElement("p");
    status.className = "status";
    const floorGrid = document.createElement("div");
    floorGrid.className = "floor-grid";
    const floorButtonMap = new Map;
    for (let floor = this.config.floorCount - 1;floor >= 0; floor -= 1) {
      const btn = document.createElement("button");
      btn.className = "floor-btn";
      btn.textContent = `${floor}`;
      btn.title = `Send Elevator ${elevator.id} to floor ${floor}`;
      btn.addEventListener("click", () => {
        elevator.requestFloor(floor);
      });
      floorGrid.append(btn);
      floorButtonMap.set(floor, btn);
    }
    this.panelButtons.set(elevator.id, floorButtonMap);
    this.statusElements.set(elevator.id, status);
    panel.append(title, status, floorGrid);
    this.config.panelsContainer.append(panel);
  }
  handleHallRequest(floor, direction) {
    const key = this.requestKey(floor, direction);
    if (this.activeHallRequests.has(key))
      return;
    this.activeHallRequests.add(key);
    this.hallButtons.get(key)?.classList.add("active");
    const request = { floor, direction, key };
    const assigned = this.assignRequestToIdleElevator(request);
    if (!assigned) {
      this.pendingHallRequests.push(request);
    }
    this.updateQueueInfo();
  }
  assignRequestToIdleElevator(request) {
    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
    if (idleElevators.length === 0) {
      return false;
    }
    idleElevators.sort((a, b) => {
      const distanceDiff = a.distanceTo(request.floor) - b.distanceTo(request.floor);
      return distanceDiff !== 0 ? distanceDiff : a.id - b.id;
    });
    const selected = idleElevators[0];
    selected.requestFloor(request.floor);
    return true;
  }
  dispatchPendingRequests() {
    if (this.pendingHallRequests.length === 0)
      return;
    const remaining = [];
    for (const request of this.pendingHallRequests) {
      const assigned = this.assignRequestToIdleElevator(request);
      if (!assigned) {
        remaining.push(request);
      }
    }
    this.pendingHallRequests = remaining;
    this.updateQueueInfo();
  }
  onElevatorStop(_elevator, floor) {
    for (const direction of ["up", "down"]) {
      const key = this.requestKey(floor, direction);
      if (!this.activeHallRequests.has(key))
        continue;
      this.activeHallRequests.delete(key);
      this.hallButtons.get(key)?.classList.remove("active");
      this.pendingHallRequests = this.pendingHallRequests.filter((request) => request.key !== key);
    }
    this.updateQueueInfo();
  }
  updateElevatorPanelStatus(elevator) {
    const statusElement = this.statusElements.get(elevator.id);
    if (!statusElement)
      return;
    const direction = this.prettyDirection(elevator.getDirection());
    const pending = elevator.getPendingFloors();
    statusElement.textContent = `Floor ${elevator.getCurrentFloor()} · ${direction} · Queue [${pending.join(", ") || "empty"}]`;
  }
  updatePanelFloorButtons(elevatorId, pendingFloors) {
    const buttons = this.panelButtons.get(elevatorId);
    if (!buttons)
      return;
    const active = new Set(pendingFloors);
    for (const [floor, button] of buttons.entries()) {
      button.classList.toggle("active", active.has(floor));
    }
  }
  updateQueueInfo() {
    if (this.pendingHallRequests.length === 0) {
      this.config.queueInfoElement.textContent = "Queued hall requests: none";
      return;
    }
    const summary = this.pendingHallRequests.map((request) => `F${request.floor}${request.direction === "up" ? "↑" : "↓"}`).join(", ");
    this.config.queueInfoElement.textContent = `Queued hall requests: ${summary}`;
  }
  requestKey(floor, direction) {
    return `${floor}:${direction}`;
  }
  prettyDirection(direction) {
    if (direction === "up")
      return "moving up";
    if (direction === "down")
      return "moving down";
    return "idle";
  }
}

// script.ts
var DEFAULTS = {
  floorCount: 10,
  elevatorCount: 4,
  floorHeight: 56,
  travelTimeMs: 850,
  doorTimeMs: 600
};
function bootstrap() {
  const buildingContainer = document.getElementById("building");
  const panelsContainer = document.getElementById("control-panels");
  const queueInfoElement = document.getElementById("queue-info");
  if (!buildingContainer || !panelsContainer || !queueInfoElement) {
    throw new Error("Missing required root elements in index.html");
  }
  document.documentElement.style.setProperty("--floor-height", `${DEFAULTS.floorHeight}px`);
  const building = new Building({
    floorCount: DEFAULTS.floorCount,
    elevatorCount: DEFAULTS.elevatorCount,
    floorHeight: DEFAULTS.floorHeight,
    travelTimeMs: DEFAULTS.travelTimeMs,
    doorTimeMs: DEFAULTS.doorTimeMs,
    buildingContainer,
    panelsContainer,
    queueInfoElement
  });
  building.init();
}
bootstrap();
