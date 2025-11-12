// src/constants.ts
var DEFAULT_BUILDING_OPTIONS = {
  totalFloors: 10,
  elevatorCount: 4,
  secondsPerFloor: 1.2,
  doorHoldSeconds: 1.4,
  floorHeight: 72,
  pendingRequestInterval: 500
};

// src/elevator.ts
class Elevator {
  config;
  shaftElement;
  carElement;
  panelElement;
  statusElement;
  buttonGrid;
  floorButtons = new Map;
  upQueue = [];
  downQueue = [];
  status = "idle";
  direction = "idle";
  currentTarget = null;
  currentFloor = 0;
  doorTimer = null;
  lastTravelDirection = "up";
  constructor(config) {
    this.config = config;
    this.shaftElement = document.createElement("div");
    this.shaftElement.className = "elevator-shaft";
    this.carElement = document.createElement("div");
    this.carElement.className = "elevator-car";
    this.carElement.textContent = `#${config.id}`;
    this.shaftElement.appendChild(this.carElement);
    this.config.shaftContainer.appendChild(this.shaftElement);
    this.panelElement = document.createElement("div");
    this.panelElement.className = "elevator-panel";
    const heading = document.createElement("h3");
    heading.textContent = `Elevator ${config.id}`;
    this.panelElement.appendChild(heading);
    this.statusElement = document.createElement("p");
    this.statusElement.className = "panel-status";
    this.panelElement.appendChild(this.statusElement);
    this.buttonGrid = document.createElement("div");
    this.buttonGrid.className = "floor-button-grid";
    this.panelElement.appendChild(this.buttonGrid);
    this.config.panelContainer.appendChild(this.panelElement);
    this.initialiseButtons();
    this.updateCarPosition(0, false);
    this.updateStatusText();
  }
  get id() {
    return this.config.id;
  }
  getCurrentFloor() {
    return this.currentFloor;
  }
  getDirection() {
    return this.direction;
  }
  isIdle() {
    return this.status === "idle" && this.currentTarget === null && this.upQueue.length === 0 && this.downQueue.length === 0;
  }
  isMovingTowards(floor, direction) {
    if (this.status !== "moving")
      return false;
    if (this.direction !== direction)
      return false;
    return direction === "up" ? floor >= this.currentFloor : floor <= this.currentFloor;
  }
  distanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  requestPickup(floor, direction) {
    if (floor === this.currentFloor && this.isIdle()) {
      this.lastTravelDirection = direction;
      this.openDoors(direction);
      this.config.onArrival(floor, this, direction);
      return;
    }
    this.enqueueFloor(floor, direction);
    this.processQueues();
  }
  requestInternal(floor) {
    const directionHint = floor >= this.currentFloor ? "up" : "down";
    if (floor === this.currentFloor && this.status !== "moving") {
      this.lastTravelDirection = directionHint;
      this.openDoors(directionHint);
      this.config.onArrival(floor, this, directionHint);
      return;
    }
    this.enqueueFloor(floor, directionHint);
    this.processQueues();
  }
  toState() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      status: this.status,
      upQueue: [...this.upQueue],
      downQueue: [...this.downQueue],
      target: this.currentTarget
    };
  }
  initialiseButtons() {
    for (let floor = this.config.totalFloors - 1;floor >= 0; floor -= 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "floor-button";
      button.textContent = String(floor);
      button.addEventListener("click", () => {
        this.markButtonActive(floor, true);
        this.requestInternal(floor);
      });
      this.buttonGrid.appendChild(button);
      this.floorButtons.set(floor, button);
    }
  }
  enqueueFloor(floor, directionHint) {
    if (floor === this.currentFloor && this.status === "moving") {
      this.queueForReverseDirection(floor);
      this.markButtonActive(floor, true);
      return;
    }
    if (floor > this.currentFloor) {
      if (!this.upQueue.includes(floor)) {
        this.upQueue.push(floor);
        this.upQueue.sort((a, b) => a - b);
      }
    } else if (floor < this.currentFloor) {
      if (!this.downQueue.includes(floor)) {
        this.downQueue.push(floor);
        this.downQueue.sort((a, b) => b - a);
      }
    } else {
      if (!this.upQueue.includes(floor) && !this.downQueue.includes(floor)) {
        if (directionHint === "up") {
          this.upQueue.push(floor);
          this.upQueue.sort((a, b) => a - b);
        } else {
          this.downQueue.push(floor);
          this.downQueue.sort((a, b) => b - a);
        }
      }
    }
    this.markButtonActive(floor, true);
  }
  queueForReverseDirection(floor) {
    if (floor > this.currentFloor) {
      if (!this.upQueue.includes(floor)) {
        this.upQueue.push(floor);
        this.upQueue.sort((a, b) => a - b);
      }
    } else if (floor < this.currentFloor) {
      if (!this.downQueue.includes(floor)) {
        this.downQueue.push(floor);
        this.downQueue.sort((a, b) => b - a);
      }
    }
  }
  processQueues() {
    if (this.status === "moving" || this.status === "door-open")
      return;
    if (this.direction === "up") {
      if (this.upQueue.length > 0) {
        this.dispatchToFloor(this.upQueue.shift(), "up");
        return;
      }
      if (this.downQueue.length > 0) {
        this.direction = "down";
        this.processQueues();
        return;
      }
    } else if (this.direction === "down") {
      if (this.downQueue.length > 0) {
        this.dispatchToFloor(this.downQueue.shift(), "down");
        return;
      }
      if (this.upQueue.length > 0) {
        this.direction = "up";
        this.processQueues();
        return;
      }
    } else {
      if (this.upQueue.length > 0) {
        this.direction = "up";
        this.dispatchToFloor(this.upQueue.shift(), "up");
        return;
      }
      if (this.downQueue.length > 0) {
        this.direction = "down";
        this.dispatchToFloor(this.downQueue.shift(), "down");
        return;
      }
    }
    this.direction = "idle";
    this.status = "idle";
    this.updateStatusText();
    this.config.onIdle(this);
  }
  dispatchToFloor(target, direction) {
    if (target === this.currentFloor) {
      this.lastTravelDirection = direction;
      this.openDoors(direction);
      this.config.onArrival(target, this, direction);
      return;
    }
    this.currentTarget = target;
    this.lastTravelDirection = direction;
    this.direction = direction;
    this.status = "moving";
    this.updateStatusText();
    const travelFloors = Math.abs(target - this.currentFloor);
    const durationSeconds = travelFloors * this.config.secondsPerFloor;
    this.carElement.style.transitionDuration = `${durationSeconds}s`;
    this.updateCarPosition(target, true);
    window.setTimeout(() => {
      this.handleArrival(target, direction);
    }, durationSeconds * 1000);
  }
  handleArrival(floor, direction) {
    this.currentFloor = floor;
    this.currentTarget = null;
    this.status = "door-open";
    this.direction = direction;
    this.updateStatusText();
    this.markButtonActive(floor, false);
    this.openDoors(direction);
    this.config.onArrival(floor, this, direction);
  }
  openDoors(direction) {
    if (this.doorTimer !== null) {
      window.clearTimeout(this.doorTimer);
      this.doorTimer = null;
    }
    this.status = "door-open";
    this.direction = direction;
    this.carElement.classList.add("door-open");
    this.updateStatusText();
    this.doorTimer = window.setTimeout(() => {
      this.closeDoors();
    }, this.config.doorHoldSeconds * 1000);
  }
  closeDoors() {
    if (this.doorTimer !== null) {
      window.clearTimeout(this.doorTimer);
      this.doorTimer = null;
    }
    this.carElement.classList.remove("door-open");
    this.status = "idle";
    this.updateStatusText();
    this.processQueues();
  }
  updateCarPosition(floor, animated) {
    if (!animated) {
      this.carElement.style.transitionDuration = "0s";
    }
    const bottomOffset = floor * this.config.floorHeight;
    this.carElement.style.bottom = `${bottomOffset}px`;
  }
  markButtonActive(floor, active) {
    const button = this.floorButtons.get(floor);
    if (!button)
      return;
    button.classList.toggle("active", active);
  }
  updateStatusText() {
    let message = `Idle at floor ${this.currentFloor}`;
    if (this.status === "moving" && this.currentTarget !== null) {
      message = `Moving ${this.direction} to ${this.currentTarget}`;
    } else if (this.status === "door-open") {
      message = `Doors open at floor ${this.currentFloor}`;
    }
    this.statusElement.textContent = message;
  }
}

// src/floor.ts
class Floor {
  config;
  element;
  upButton;
  downButton;
  constructor(config) {
    this.config = config;
    this.element = document.createElement("div");
    this.element.className = "floor-row";
    this.element.dataset.floor = String(config.floorNumber);
    const label = document.createElement("span");
    label.className = "floor-label";
    label.textContent = `Floor ${config.floorNumber}`;
    this.element.appendChild(label);
    const buttonWrap = document.createElement("div");
    buttonWrap.className = "call-buttons";
    if (config.floorNumber < config.totalFloors - 1) {
      this.upButton = this.createButton("Up", "up", buttonWrap);
    }
    if (config.floorNumber > 0) {
      this.downButton = this.createButton("Down", "down", buttonWrap);
    }
    this.element.appendChild(buttonWrap);
    config.container.appendChild(this.element);
  }
  markPending(direction, active) {
    const target = direction === "up" ? this.upButton : this.downButton;
    if (!target)
      return;
    target.classList.toggle("pending", active);
    if (!active) {
      target.blur();
    }
  }
  createButton(label, direction, wrap) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `call-button call-${direction}`;
    button.textContent = label;
    button.addEventListener("click", () => {
      this.markPending(direction, true);
      this.config.onRequest(direction);
    });
    wrap.appendChild(button);
    return button;
  }
}

// src/building.ts
class Building {
  root;
  options;
  floors = [];
  elevators = [];
  pendingRequests = [];
  floorsColumn;
  shaftArea;
  panelArea;
  pendingIndicator;
  dispatchTimer = null;
  constructor(root, options) {
    this.root = root;
    this.options = { ...DEFAULT_BUILDING_OPTIONS, ...options };
    this.root.classList.add("simulator-grid");
    this.root.style.setProperty("--floor-height", `${this.options.floorHeight}px`);
    this.root.style.setProperty("--floor-count", String(this.options.totalFloors));
    const visualArea = document.createElement("div");
    visualArea.className = "visual-area";
    this.floorsColumn = document.createElement("div");
    this.floorsColumn.className = "floors-column";
    visualArea.appendChild(this.floorsColumn);
    this.shaftArea = document.createElement("div");
    this.shaftArea.className = "shaft-area";
    visualArea.appendChild(this.shaftArea);
    this.panelArea = document.createElement("div");
    this.panelArea.className = "panels-column";
    const pendingWrap = document.createElement("div");
    pendingWrap.className = "pending-summary";
    const pendingLabel = document.createElement("span");
    pendingLabel.textContent = "Waiting requests:";
    this.pendingIndicator = document.createElement("span");
    this.pendingIndicator.className = "pending-count";
    this.pendingIndicator.textContent = "0";
    pendingWrap.append(pendingLabel, this.pendingIndicator);
    this.panelArea.appendChild(pendingWrap);
    this.root.append(visualArea, this.panelArea);
    this.bootstrapFloors();
    this.bootstrapElevators();
    this.updatePendingCount();
    this.dispatchTimer = window.setInterval(() => {
      this.dispatchRequests();
    }, this.options.pendingRequestInterval);
  }
  requestElevator(floor, direction) {
    if (this.hasOpenRequest(floor, direction)) {
      return;
    }
    const request = {
      floor,
      direction,
      timestamp: Date.now(),
      status: "waiting"
    };
    this.pendingRequests.push(request);
    this.dispatchRequests();
    this.updatePendingCount();
  }
  bootstrapFloors() {
    for (let floor = this.options.totalFloors - 1;floor >= 0; floor -= 1) {
      const floorInstance = new Floor({
        floorNumber: floor,
        totalFloors: this.options.totalFloors,
        container: this.floorsColumn,
        onRequest: (direction) => this.requestElevator(floor, direction)
      });
      this.floors[floor] = floorInstance;
    }
  }
  bootstrapElevators() {
    for (let id = 0;id < this.options.elevatorCount; id += 1) {
      const elevator = new Elevator({
        id,
        totalFloors: this.options.totalFloors,
        floorHeight: this.options.floorHeight,
        secondsPerFloor: this.options.secondsPerFloor,
        doorHoldSeconds: this.options.doorHoldSeconds,
        shaftContainer: this.shaftArea,
        panelContainer: this.panelArea,
        onIdle: (instance) => this.handleElevatorIdle(instance),
        onArrival: (floor, instance, direction) => this.handleElevatorArrival(instance, floor, direction)
      });
      this.elevators.push(elevator);
    }
  }
  handleElevatorIdle(_elevator) {
    this.dispatchRequests();
  }
  handleElevatorArrival(elevator, floor, direction) {
    const match = this.pendingRequests.find((request) => request.floor === floor && request.direction === direction && request.status === "assigned" && request.assignedTo === elevator.id);
    if (match) {
      match.status = "served";
      this.floors[floor]?.markPending(direction, false);
      this.cleanupRequests();
    }
    this.updatePendingCount();
  }
  dispatchRequests() {
    for (const request of this.pendingRequests) {
      if (request.status !== "waiting")
        continue;
      const elevator = this.pickElevator(request.floor, request.direction);
      if (!elevator) {
        continue;
      }
      request.status = "assigned";
      request.assignedTo = elevator.id;
      elevator.requestPickup(request.floor, request.direction);
    }
    this.updatePendingCount();
  }
  pickElevator(floor, direction) {
    const moving = this.elevators.filter((elevator) => elevator.isMovingTowards(floor, direction)).sort((a, b) => a.distanceToFloor(floor) - b.distanceToFloor(floor));
    if (moving.length > 0) {
      return moving[0];
    }
    const idle = this.elevators.filter((elevator) => elevator.isIdle()).sort((a, b) => {
      const floorDelta = a.distanceToFloor(floor) - b.distanceToFloor(floor);
      return floorDelta === 0 ? a.id - b.id : floorDelta;
    });
    return idle[0];
  }
  hasOpenRequest(floor, direction) {
    return this.pendingRequests.some((request) => request.floor === floor && request.direction === direction && request.status !== "served");
  }
  cleanupRequests() {
    if (this.pendingRequests.length === 0)
      return;
    const remaining = this.pendingRequests.filter((request) => request.status !== "served");
    this.pendingRequests.splice(0, this.pendingRequests.length, ...remaining);
  }
  updatePendingCount() {
    const waiting = this.pendingRequests.filter((request) => request.status === "waiting").length;
    this.pendingIndicator.textContent = String(waiting);
  }
  dispose() {
    if (this.dispatchTimer !== null) {
      window.clearInterval(this.dispatchTimer);
      this.dispatchTimer = null;
    }
  }
}

// script.ts
function extractOptions(root) {
  const { floors, elevators, secondsPerFloor, doorHoldSeconds } = root.dataset;
  const parsed = {};
  if (floors) {
    const totalFloors = Number.parseInt(floors, 10);
    if (Number.isFinite(totalFloors) && totalFloors > 1) {
      parsed.totalFloors = totalFloors;
    }
  }
  if (elevators) {
    const elevatorCount = Number.parseInt(elevators, 10);
    if (Number.isFinite(elevatorCount) && elevatorCount > 0) {
      parsed.elevatorCount = elevatorCount;
    }
  }
  if (secondsPerFloor) {
    const value = Number.parseFloat(secondsPerFloor);
    if (Number.isFinite(value) && value > 0) {
      parsed.secondsPerFloor = value;
    }
  }
  if (doorHoldSeconds) {
    const value = Number.parseFloat(doorHoldSeconds);
    if (Number.isFinite(value) && value >= 0.3) {
      parsed.doorHoldSeconds = value;
    }
  }
  return parsed;
}
window.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("simulator-root");
  if (!root) {
    throw new Error("Simulator root element not found");
  }
  const options = extractOptions(root);
  const building = new Building(root, options);
  window.elevatorSimulator = building;
  window.addEventListener("beforeunload", () => {
    building.dispose();
  });
});
