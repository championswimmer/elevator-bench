// src/Config.ts
var CONFIG = {
  FLOOR_COUNT: 10,
  ELEVATOR_COUNT: 4,
  FLOOR_HEIGHT: 60,
  SPEED_PER_FLOOR: 1000,
  DOOR_OPEN_TIME: 2000
};

// src/Floor.ts
class Floor {
  level;
  element;
  btnUp = null;
  btnDown = null;
  requestCallback;
  constructor(level, requestCallback) {
    this.level = level;
    this.requestCallback = requestCallback;
    this.element = this.createDOM();
  }
  createDOM() {
    const div = document.createElement("div");
    div.className = "floor-control";
    const label = document.createElement("span");
    label.className = "floor-label";
    label.textContent = `Floor ${this.level}`;
    div.appendChild(label);
    const btnGroup = document.createElement("div");
    btnGroup.className = "floor-buttons";
    if (this.level < 9) {
      this.btnUp = document.createElement("button");
      this.btnUp.className = "floor-btn btn-up";
      this.btnUp.innerHTML = "▲";
      this.btnUp.onclick = () => this.handleRequest("UP");
      btnGroup.appendChild(this.btnUp);
    }
    if (this.level > 0) {
      this.btnDown = document.createElement("button");
      this.btnDown.className = "floor-btn btn-down";
      this.btnDown.innerHTML = "▼";
      this.btnDown.onclick = () => this.handleRequest("DOWN");
      btnGroup.appendChild(this.btnDown);
    }
    div.appendChild(btnGroup);
    return div;
  }
  handleRequest(direction) {
    this.requestCallback(this.level, direction);
    this.setButtonActive(direction, true);
  }
  getElement() {
    return this.element;
  }
  setButtonActive(direction, active) {
    if (direction === "UP" && this.btnUp) {
      active ? this.btnUp.classList.add("active") : this.btnUp.classList.remove("active");
    } else if (direction === "DOWN" && this.btnDown) {
      active ? this.btnDown.classList.add("active") : this.btnDown.classList.remove("active");
    }
  }
}

// src/Elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  state = "IDLE";
  direction = "IDLE";
  requests = new Set;
  element;
  controlPanel;
  doorLeft;
  doorRight;
  infoDisplay;
  panelButtons = new Map;
  updateCallback;
  constructor(id, updateCallback) {
    this.id = id;
    this.updateCallback = updateCallback;
    this.element = this.createDOM();
    this.controlPanel = this.createControlPanel();
  }
  createControlPanel() {
    const panel = document.createElement("div");
    panel.className = "elevator-panel";
    for (let i = 0;i < CONFIG.FLOOR_COUNT; i++) {
      const btn = document.createElement("button");
      btn.className = "panel-btn";
      btn.textContent = `${i}`;
      btn.onclick = () => {
        this.addRequest(i);
        btn.classList.add("active");
      };
      this.panelButtons.set(i, btn);
      panel.appendChild(btn);
    }
    return panel;
  }
  createDOM() {
    const el = document.createElement("div");
    el.className = "elevator";
    this.doorLeft = document.createElement("div");
    this.doorLeft.className = "door-left";
    this.doorRight = document.createElement("div");
    this.doorRight.className = "door-right";
    const doors = document.createElement("div");
    doors.className = "elevator-doors";
    doors.appendChild(this.doorLeft);
    doors.appendChild(this.doorRight);
    this.infoDisplay = document.createElement("div");
    this.infoDisplay.className = "elevator-info";
    this.infoDisplay.textContent = `${this.id}`;
    el.appendChild(doors);
    el.appendChild(this.infoDisplay);
    return el;
  }
  getElement() {
    return this.element;
  }
  getControlPanel() {
    return this.controlPanel;
  }
  addRequest(floor) {
    if (this.requests.has(floor))
      return;
    this.requests.add(floor);
    this.updateState();
  }
  isIdle() {
    return this.state === "IDLE";
  }
  getDistanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  updateState() {
    if (this.state !== "IDLE")
      return;
    if (this.requests.size === 0)
      return;
    this.processNextMove();
  }
  getNextFloor() {
    if (this.requests.size === 0)
      return null;
    const floors = Array.from(this.requests).sort((a, b) => a - b);
    if (this.direction === "UP") {
      const nextAbove = floors.find((f) => f >= this.currentFloor);
      if (nextAbove !== undefined)
        return nextAbove;
      return floors[floors.length - 1];
    } else if (this.direction === "DOWN") {
      const nextBelow = floors.slice().reverse().find((f) => f <= this.currentFloor);
      if (nextBelow !== undefined)
        return nextBelow;
      return floors[0];
    } else {
      return floors.reduce((prev, curr) => Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev);
    }
  }
  async processNextMove() {
    const nextFloor = this.getNextFloor();
    if (nextFloor === null) {
      this.state = "IDLE";
      this.direction = "IDLE";
      this.element.classList.remove("busy");
      this.updateCallback();
      return;
    }
    this.state = "MOVING";
    this.element.classList.add("busy");
    if (nextFloor > this.currentFloor) {
      this.direction = "UP";
    } else if (nextFloor < this.currentFloor) {
      this.direction = "DOWN";
    } else {
      this.direction = this.direction === "IDLE" ? "IDLE" : this.direction;
      await this.openDoors(nextFloor);
      return;
    }
    const floorsToTravel = Math.abs(nextFloor - this.currentFloor);
    const duration = floorsToTravel * CONFIG.SPEED_PER_FLOOR;
    this.element.style.transition = `bottom ${duration}ms linear`;
    this.element.style.bottom = `${nextFloor * CONFIG.FLOOR_HEIGHT}px`;
    setTimeout(async () => {
      this.currentFloor = nextFloor;
      this.element.style.transition = "";
      await this.openDoors(nextFloor);
    }, duration);
  }
  async openDoors(floor) {
    this.state = "DOOR_OPEN";
    this.element.classList.add("open");
    this.requests.delete(floor);
    const btn = this.panelButtons.get(floor);
    if (btn)
      btn.classList.remove("active");
    const event = new CustomEvent("elevatorArrived", {
      detail: { floor, direction: this.direction, elevatorId: this.id }
    });
    window.dispatchEvent(event);
    setTimeout(() => {
      this.element.classList.remove("open");
      this.state = "IDLE";
      this.updateState();
      if (this.requests.size === 0) {
        this.direction = "IDLE";
        this.element.classList.remove("busy");
        this.updateCallback();
      }
    }, CONFIG.DOOR_OPEN_TIME);
  }
}

// src/Building.ts
class Building {
  floors = [];
  elevators = [];
  container;
  constructor(containerId) {
    const el = document.getElementById(containerId);
    if (!el)
      throw new Error(`Container ${containerId} not found`);
    this.container = el;
    this.init();
  }
  init() {
    this.container.innerHTML = "";
    this.container.className = "building";
    const floorsCol = document.createElement("div");
    floorsCol.className = "floors-control-column";
    for (let i = 0;i < CONFIG.FLOOR_COUNT; i++) {
      const floor = new Floor(i, this.handleFloorRequest.bind(this));
      this.floors.push(floor);
      floorsCol.appendChild(floor.getElement());
    }
    this.container.appendChild(floorsCol);
    const shaftsContainer = document.createElement("div");
    shaftsContainer.className = "shafts-container";
    shaftsContainer.style.height = `${CONFIG.FLOOR_COUNT * CONFIG.FLOOR_HEIGHT}px`;
    for (let i = 0;i < CONFIG.ELEVATOR_COUNT; i++) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";
      shaft.style.height = "100%";
      for (let f = 1;f < CONFIG.FLOOR_COUNT; f++) {
        const line = document.createElement("div");
        line.className = "shaft-floor-guide";
        line.style.bottom = `${f * CONFIG.FLOOR_HEIGHT}px`;
        shaft.appendChild(line);
      }
      const elevator = new Elevator(i, this.updateSystemState.bind(this));
      this.elevators.push(elevator);
      shaft.appendChild(elevator.getElement());
      shaftsContainer.appendChild(shaft);
    }
    this.container.appendChild(shaftsContainer);
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "controls-container";
    this.elevators.forEach((e) => {
      controlsContainer.appendChild(e.getControlPanel());
    });
    this.container.appendChild(controlsContainer);
    window.addEventListener("elevatorArrived", (e) => {
      const { floor, direction } = e.detail;
      this.floors[floor].setButtonActive("UP", false);
      if (direction === "UP") {
        this.floors[floor].setButtonActive("UP", false);
      } else if (direction === "DOWN") {
        this.floors[floor].setButtonActive("DOWN", false);
      } else {
        this.floors[floor].setButtonActive("UP", false);
        this.floors[floor].setButtonActive("DOWN", false);
      }
    });
  }
  handleFloorRequest(floorIndex, direction) {
    console.log(`Request at Floor ${floorIndex} going ${direction}`);
    const candidate = this.findBestElevator(floorIndex, direction);
    if (candidate) {
      console.log(`Assigned Elevator ${candidate.id}`);
      candidate.addRequest(floorIndex);
    } else {}
  }
  findBestElevator(targetFloor, direction) {
    const idle = this.elevators.filter((e) => e.isIdle());
    const movingTowards = this.elevators.filter((e) => {
      if (e.isIdle())
        return false;
      if (e.direction === direction) {
        if (direction === "UP" && e.currentFloor <= targetFloor)
          return true;
        if (direction === "DOWN" && e.currentFloor >= targetFloor)
          return true;
      }
      return false;
    });
    if (idle.length > 0) {
      return idle.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
    }
    if (movingTowards.length > 0) {
      return movingTowards.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
    }
    return this.elevators.sort((a, b) => a.getDistanceTo(targetFloor) - b.getDistanceTo(targetFloor))[0];
  }
  updateSystemState() {}
}

// script.ts
document.addEventListener("DOMContentLoaded", () => {
  const app = new Building("simulator-container");
});
