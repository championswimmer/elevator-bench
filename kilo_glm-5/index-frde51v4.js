// types.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var FLOOR_HEIGHT = 80;
var DOOR_OPEN_TIME = 1000;
var DOOR_CLOSE_TIME = 500;
var FLOOR_TRAVEL_TIME = 500;

// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  state;
  targetFloors;
  element = null;
  panelElement = null;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle" /* None */;
    this.state = "idle" /* Idle */;
    this.targetFloors = new Set;
  }
  setElement(element) {
    this.element = element;
  }
  setPanelElement(element) {
    this.panelElement = element;
  }
  isIdle() {
    return this.state === "idle" /* Idle */ && this.targetFloors.size === 0;
  }
  addTargetFloor(floor) {
    this.targetFloors.add(floor);
  }
  hasTargetFloor(floor) {
    return this.targetFloors.has(floor);
  }
  updatePosition() {
    if (this.element) {
      const bottom = this.currentFloor * FLOOR_HEIGHT;
      this.element.style.bottom = `${bottom}px`;
    }
  }
  updatePanelDisplay() {
    if (!this.panelElement)
      return;
    const buttons = this.panelElement.querySelectorAll(".panel-btn");
    buttons.forEach((btn) => {
      const floor = parseInt(btn.getAttribute("data-floor") || "0");
      if (this.targetFloors.has(floor)) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }
  async openDoors() {
    if (!this.element)
      return;
    this.state = "doors_open" /* DoorsOpen */;
    this.element.classList.add("open");
    await this.delay(DOOR_OPEN_TIME);
  }
  async closeDoors() {
    if (!this.element)
      return;
    this.element.classList.remove("open");
    await this.delay(DOOR_CLOSE_TIME);
  }
  async moveToFloor(targetFloor) {
    if (this.currentFloor === targetFloor)
      return;
    this.state = "moving" /* Moving */;
    this.direction = targetFloor > this.currentFloor ? "up" /* Up */ : "down" /* Down */;
    const step = this.direction === "up" /* Up */ ? 1 : -1;
    while (this.currentFloor !== targetFloor) {
      this.currentFloor += step;
      this.updatePosition();
      await this.delay(FLOOR_TRAVEL_TIME);
    }
    this.targetFloors.delete(targetFloor);
    this.updatePanelDisplay();
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getNextTargetFloor() {
    if (this.targetFloors.size === 0)
      return null;
    const targets = Array.from(this.targetFloors);
    if (this.direction === "up" /* Up */) {
      const upwardTargets = targets.filter((f) => f > this.currentFloor);
      if (upwardTargets.length > 0) {
        return Math.min(...upwardTargets);
      }
      return Math.max(...targets);
    } else if (this.direction === "down" /* Down */) {
      const downwardTargets = targets.filter((f) => f < this.currentFloor);
      if (downwardTargets.length > 0) {
        return Math.max(...downwardTargets);
      }
      return Math.min(...targets);
    }
    const closest = targets.reduce((prev, curr) => Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev);
    return closest;
  }
  canServeRequest(floor, direction) {
    if (this.isIdle())
      return true;
    if (direction === "up" /* Up */ && this.direction === "up" /* Up */) {
      return floor >= this.currentFloor;
    }
    if (direction === "down" /* Down */ && this.direction === "down" /* Down */) {
      return floor <= this.currentFloor;
    }
    return false;
  }
  getDistanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
}

// Floor.ts
class Floor {
  floorNumber;
  hasUpButton;
  hasDownButton;
  upButtonElement = null;
  downButtonElement = null;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
    this.hasUpButton = floorNumber < NUM_FLOORS - 1;
    this.hasDownButton = floorNumber > 0;
  }
  setUpButtonElement(element) {
    this.upButtonElement = element;
  }
  setDownButtonElement(element) {
    this.downButtonElement = element;
  }
  activateButton(direction) {
    if (direction === "up" /* Up */ && this.upButtonElement) {
      this.upButtonElement.classList.add("active");
    } else if (direction === "down" /* Down */ && this.downButtonElement) {
      this.downButtonElement.classList.add("active");
    }
  }
  deactivateButton(direction) {
    if (direction === "up" /* Up */ && this.upButtonElement) {
      this.upButtonElement.classList.remove("active");
    } else if (direction === "down" /* Down */ && this.downButtonElement) {
      this.downButtonElement.classList.remove("active");
    }
  }
}

// Building.ts
class Building {
  elevators;
  floors;
  pendingRequests;
  onFloorRequest = null;
  constructor() {
    this.elevators = [];
    this.floors = [];
    this.pendingRequests = [];
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
    for (let i = 0;i < NUM_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
  }
  setOnFloorRequest(callback) {
    this.onFloorRequest = callback;
  }
  requestElevator(floor, direction) {
    const request = { floor, direction };
    this.floors[floor].activateButton(direction);
    if (this.onFloorRequest) {
      this.onFloorRequest(request);
    }
  }
  findBestElevator(request) {
    const { floor, direction } = request;
    const idleElevators = this.elevators.filter((e) => e.isIdle());
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, elevator) => {
        const currentDistance = closest.getDistanceTo(floor);
        const newDistance = elevator.getDistanceTo(floor);
        return newDistance < currentDistance ? elevator : closest;
      });
    }
    const matchingElevators = this.elevators.filter((e) => e.canServeRequest(floor, direction) && !e.hasTargetFloor(floor));
    if (matchingElevators.length > 0) {
      return matchingElevators.reduce((closest, elevator) => {
        const currentDistance = closest.getDistanceTo(floor);
        const newDistance = elevator.getDistanceTo(floor);
        return newDistance < currentDistance ? elevator : closest;
      });
    }
    return null;
  }
  addPendingRequest(request) {
    this.pendingRequests.push(request);
  }
  getNextPendingRequest() {
    return this.pendingRequests.shift();
  }
  hasPendingRequests() {
    return this.pendingRequests.length > 0;
  }
  deactivateFloorButton(floor, direction) {
    this.floors[floor].deactivateButton(direction);
  }
}

// script.ts
class ElevatorSimulator {
  building;
  floorsContainer;
  elevatorsContainer;
  statusContainer;
  elevatorPanels;
  openPanelId = null;
  constructor() {
    this.building = new Building;
    this.floorsContainer = document.getElementById("floors-container");
    this.elevatorsContainer = document.getElementById("elevators-container");
    this.statusContainer = document.createElement("div");
    this.statusContainer.className = "status-bar";
    this.elevatorPanels = new Map;
    this.building.setOnFloorRequest(this.handleFloorRequest.bind(this));
  }
  init() {
    this.renderFloors();
    this.renderElevators();
    this.renderElevatorPanels();
    this.renderStatusBar();
    document.body.appendChild(this.statusContainer);
    this.startSimulation();
  }
  renderFloors() {
    for (let i = NUM_FLOORS - 1;i >= 0; i--) {
      const floorEl = document.createElement("div");
      floorEl.className = "floor";
      floorEl.setAttribute("data-floor", i.toString());
      const floorNumber = document.createElement("div");
      floorNumber.className = "floor-number";
      floorNumber.textContent = i.toString();
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "floor-buttons";
      if (i < NUM_FLOORS - 1) {
        const upBtn = document.createElement("button");
        upBtn.className = "floor-btn up";
        upBtn.textContent = "▲";
        upBtn.setAttribute("data-floor", i.toString());
        upBtn.setAttribute("data-direction", "up");
        upBtn.addEventListener("click", () => {
          this.building.requestElevator(i, "up" /* Up */);
        });
        buttonsContainer.appendChild(upBtn);
        this.building.floors[i].setUpButtonElement(upBtn);
      }
      if (i > 0) {
        const downBtn = document.createElement("button");
        downBtn.className = "floor-btn down";
        downBtn.textContent = "▼";
        downBtn.setAttribute("data-floor", i.toString());
        downBtn.setAttribute("data-direction", "down");
        downBtn.addEventListener("click", () => {
          this.building.requestElevator(i, "down" /* Down */);
        });
        buttonsContainer.appendChild(downBtn);
        this.building.floors[i].setDownButtonElement(downBtn);
      }
      const shaftArea = document.createElement("div");
      shaftArea.className = "shaft-area";
      for (let j = 0;j < NUM_ELEVATORS; j++) {
        const shaft = document.createElement("div");
        shaft.className = "elevator-shaft";
        shaft.setAttribute("data-elevator", j.toString());
        shaft.setAttribute("data-floor", i.toString());
        shaftArea.appendChild(shaft);
      }
      floorEl.appendChild(floorNumber);
      floorEl.appendChild(buttonsContainer);
      floorEl.appendChild(shaftArea);
      this.floorsContainer.appendChild(floorEl);
    }
  }
  renderElevators() {
    const shafts = this.floorsContainer.querySelectorAll(".elevator-shaft");
    this.building.elevators.forEach((elevator, index) => {
      const elevatorEl = document.createElement("div");
      elevatorEl.className = "elevator";
      elevatorEl.id = `elevator-${index}`;
      elevatorEl.style.bottom = "0px";
      const panel = document.createElement("div");
      panel.className = "elevator-panel";
      panel.textContent = "0";
      const doors = document.createElement("div");
      doors.className = "elevator-doors";
      const leftDoor = document.createElement("div");
      leftDoor.className = "door left";
      const rightDoor = document.createElement("div");
      rightDoor.className = "door right";
      doors.appendChild(leftDoor);
      doors.appendChild(rightDoor);
      const elevatorId = document.createElement("div");
      elevatorId.className = "elevator-id";
      elevatorId.textContent = `E${index}`;
      elevatorEl.appendChild(panel);
      elevatorEl.appendChild(doors);
      elevatorEl.appendChild(elevatorId);
      elevatorEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleElevatorPanel(index);
      });
      elevator.setElement(elevatorEl);
      const floorIndex = NUM_FLOORS - 1;
      const shaftIndex = floorIndex * NUM_ELEVATORS + index;
      shafts[shaftIndex].appendChild(elevatorEl);
    });
  }
  renderElevatorPanels() {
    this.building.elevators.forEach((elevator, index) => {
      const panel = document.createElement("div");
      panel.className = "elevator-panel-inner";
      panel.id = `panel-${index}`;
      const title = document.createElement("div");
      title.className = "panel-title";
      title.textContent = `Elevator ${index} - Floor ${elevator.currentFloor}`;
      const closeBtn = document.createElement("button");
      closeBtn.className = "close-panel";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeAllPanels();
      });
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "panel-buttons";
      for (let i = 0;i < NUM_FLOORS; i++) {
        const btn = document.createElement("button");
        btn.className = "panel-btn";
        btn.textContent = i.toString();
        btn.setAttribute("data-floor", i.toString());
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.selectFloor(index, i);
        });
        buttonsContainer.appendChild(btn);
      }
      panel.appendChild(closeBtn);
      panel.appendChild(title);
      panel.appendChild(buttonsContainer);
      document.body.appendChild(panel);
      this.elevatorPanels.set(index, panel);
      elevator.setPanelElement(panel);
    });
    document.addEventListener("click", () => {
      this.closeAllPanels();
    });
  }
  renderStatusBar() {
    this.building.elevators.forEach((elevator) => {
      const status = document.createElement("div");
      status.className = "elevator-status";
      status.id = `status-${elevator.id}`;
      const id = document.createElement("div");
      id.className = "id";
      id.textContent = `Elevator ${elevator.id}`;
      const floor = document.createElement("div");
      floor.className = "floor";
      floor.textContent = elevator.currentFloor.toString();
      const state = document.createElement("div");
      state.className = "state";
      state.textContent = elevator.state;
      const direction = document.createElement("div");
      direction.className = `direction ${elevator.direction}`;
      direction.textContent = this.getDirectionSymbol(elevator.direction);
      status.appendChild(id);
      status.appendChild(floor);
      status.appendChild(state);
      status.appendChild(direction);
      this.statusContainer.appendChild(status);
    });
  }
  getDirectionSymbol(direction) {
    switch (direction) {
      case "up" /* Up */:
        return "▲";
      case "down" /* Down */:
        return "▼";
      default:
        return "—";
    }
  }
  toggleElevatorPanel(elevatorId) {
    if (this.openPanelId === elevatorId) {
      this.closeAllPanels();
    } else {
      this.closeAllPanels();
      const panel = this.elevatorPanels.get(elevatorId);
      if (panel) {
        panel.classList.add("visible");
        this.positionPanel(panel, elevatorId);
        this.openPanelId = elevatorId;
      }
    }
  }
  positionPanel(panel, elevatorId) {
    const elevatorEl = document.getElementById(`elevator-${elevatorId}`);
    if (!elevatorEl)
      return;
    const rect = elevatorEl.getBoundingClientRect();
    panel.style.left = `${rect.right + 20}px`;
    panel.style.top = `${rect.top}px`;
  }
  closeAllPanels() {
    this.elevatorPanels.forEach((panel) => {
      panel.classList.remove("visible");
    });
    this.openPanelId = null;
  }
  selectFloor(elevatorId, floor) {
    const elevator = this.building.elevators[elevatorId];
    elevator.addTargetFloor(floor);
    elevator.updatePanelDisplay;
  }
  handleFloorRequest(request) {
    const elevator = this.building.findBestElevator(request);
    if (elevator) {
      elevator.addTargetFloor(request.floor);
    } else {
      this.building.addPendingRequest(request);
    }
  }
  startSimulation() {
    this.simulationLoop();
  }
  async simulationLoop() {
    while (true) {
      await this.processElevators();
      await this.delay(100);
    }
  }
  async processElevators() {
    const busyElevators = [];
    for (const elevator of this.building.elevators) {
      if (elevator.isIdle() && this.building.hasPendingRequests()) {
        const request = this.building.getNextPendingRequest();
        if (request) {
          const bestElevator = this.building.findBestElevator(request);
          if (bestElevator) {
            bestElevator.addTargetFloor(request.floor);
          } else {
            elevator.addTargetFloor(request.floor);
          }
        }
      }
      if (elevator.targetFloors.size > 0 && elevator.state !== "moving" /* Moving */) {
        busyElevators.push(this.processElevator(elevator));
      }
    }
    if (busyElevators.length > 0) {
      await Promise.all(busyElevators);
    }
  }
  async processElevator(elevator) {
    while (elevator.targetFloors.size > 0) {
      const nextFloor = elevator.getNextTargetFloor();
      if (nextFloor === null)
        break;
      if (elevator.currentFloor !== nextFloor) {
        await elevator.closeDoors();
        await elevator.moveToFloor(nextFloor);
      }
      this.building.deactivateFloorButton(elevator.currentFloor, elevator.direction);
      await elevator.openDoors();
      await this.delay(2000);
      await elevator.closeDoors();
      this.updateStatusBar(elevator);
    }
    elevator.state = "idle" /* Idle */;
    elevator.direction = "idle" /* None */;
    this.updateStatusBar(elevator);
  }
  updateStatusBar(elevator) {
    const status = document.getElementById(`status-${elevator.id}`);
    if (!status)
      return;
    const floor = status.querySelector(".floor");
    const state = status.querySelector(".state");
    const direction = status.querySelector(".direction");
    if (floor)
      floor.textContent = elevator.currentFloor.toString();
    if (state)
      state.textContent = elevator.state;
    if (direction) {
      direction.className = `direction ${elevator.direction}`;
      direction.textContent = this.getDirectionSymbol(elevator.direction);
    }
    const elevatorEl = document.getElementById(`elevator-${elevator.id}`);
    if (elevatorEl) {
      const panel = elevatorEl.querySelector(".elevator-panel");
      if (panel)
        panel.textContent = elevator.currentFloor.toString();
    }
    const panelEl = this.elevatorPanels.get(elevator.id);
    if (panelEl) {
      const title = panelEl.querySelector(".panel-title");
      if (title)
        title.textContent = `Elevator ${elevator.id} - Floor ${elevator.currentFloor}`;
    }
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
var simulator = new ElevatorSimulator;
simulator.init();
