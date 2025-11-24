// Elevator.ts
class Elevator {
  id;
  currentFloor;
  state;
  direction;
  destinationFloors;
  floorRequests;
  element;
  panelElement;
  floorButtons;
  constructor(id, totalFloors) {
    this.id = id;
    this.currentFloor = 0;
    this.state = "idle" /* IDLE */;
    this.direction = "none" /* NONE */;
    this.destinationFloors = new Set;
    this.floorRequests = new Map;
    this.floorButtons = new Map;
    this.createElement();
    this.createPanel(totalFloors);
  }
  createElement() {
    this.element = document.createElement("div");
    this.element.className = "elevator idle";
    this.element.id = `elevator-${this.id}`;
    this.element.innerHTML = `<span>E${this.id}</span>`;
    this.updatePosition();
  }
  createPanel(totalFloors) {
    this.panelElement = document.createElement("div");
    this.panelElement.className = "elevator-panel";
    for (let floor = 0;floor < totalFloors; floor++) {
      const button = document.createElement("button");
      button.className = "elevator-floor-button";
      button.textContent = `F${floor}`;
      button.dataset.floor = floor.toString();
      button.dataset.elevatorId = this.id.toString();
      button.addEventListener("click", () => {
        this.requestFloor(floor);
      });
      this.floorButtons.set(floor, button);
      this.panelElement.appendChild(button);
    }
    this.element.appendChild(this.panelElement);
  }
  requestFloor(floor) {
    if (floor === this.currentFloor && this.state === "doors-open" /* DOORS_OPEN */) {
      return;
    }
    this.destinationFloors.add(floor);
    this.updateFloorButton(floor, true);
    if (this.state === "idle" /* IDLE */) {
      this.startMoving();
    }
  }
  addFloorRequest(floor, direction) {
    this.floorRequests.set(floor, direction);
    this.requestFloor(floor);
  }
  startMoving() {
    if (this.destinationFloors.size === 0) {
      this.state = "idle" /* IDLE */;
      this.direction = "none" /* NONE */;
      this.updateState();
      return;
    }
    const nextFloor = this.getNextFloor();
    if (nextFloor === undefined) {
      this.state = "idle" /* IDLE */;
      this.direction = "none" /* NONE */;
      this.updateState();
      return;
    }
    if (nextFloor > this.currentFloor) {
      this.direction = "up" /* UP */;
      this.state = "moving-up" /* MOVING_UP */;
    } else if (nextFloor < this.currentFloor) {
      this.direction = "down" /* DOWN */;
      this.state = "moving-down" /* MOVING_DOWN */;
    } else {
      this.arriveAtFloor();
      return;
    }
    this.updateState();
    this.moveToFloor(nextFloor);
  }
  getNextFloor() {
    if (this.destinationFloors.size === 0) {
      return;
    }
    let candidates = [];
    if (this.direction === "up" /* UP */) {
      candidates = Array.from(this.destinationFloors).filter((floor) => floor > this.currentFloor);
      if (candidates.length === 0) {
        candidates = Array.from(this.destinationFloors).filter((floor) => floor < this.currentFloor);
      }
    } else if (this.direction === "down" /* DOWN */) {
      candidates = Array.from(this.destinationFloors).filter((floor) => floor < this.currentFloor);
      if (candidates.length === 0) {
        candidates = Array.from(this.destinationFloors).filter((floor) => floor > this.currentFloor);
      }
    } else {
      candidates = Array.from(this.destinationFloors);
    }
    if (candidates.length === 0) {
      return;
    }
    if (this.direction === "up" /* UP */) {
      return Math.min(...candidates);
    } else if (this.direction === "down" /* DOWN */) {
      return Math.max(...candidates);
    } else {
      return candidates.reduce((closest, floor) => {
        return Math.abs(floor - this.currentFloor) < Math.abs(closest - this.currentFloor) ? floor : closest;
      });
    }
  }
  moveToFloor(targetFloor) {
    const moveDuration = Math.abs(targetFloor - this.currentFloor) * 1000;
    setTimeout(() => {
      this.currentFloor = targetFloor;
      this.updatePosition();
      this.arriveAtFloor();
    }, moveDuration);
  }
  arriveAtFloor() {
    this.state = "doors-open" /* DOORS_OPEN */;
    this.updateState();
    this.destinationFloors.delete(this.currentFloor);
    this.floorRequests.delete(this.currentFloor);
    this.updateFloorButton(this.currentFloor, false);
    setTimeout(() => {
      this.startMoving();
    }, 2000);
  }
  updatePosition() {
    const floorHeight = 60;
    this.element.style.bottom = `${this.currentFloor * floorHeight + 5}px`;
  }
  updateState() {
    this.element.className = `elevator ${this.state}`;
  }
  updateFloorButton(floor, isActive) {
    const button = this.floorButtons.get(floor);
    if (button) {
      if (isActive) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }
  isIdle() {
    return this.state === "idle" /* IDLE */;
  }
  canHandleRequest(floor, direction) {
    if (!this.isIdle()) {
      return false;
    }
    return true;
  }
  getDistanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
}

// Floor.ts
class Floor {
  number;
  element;
  upButton;
  downButton;
  onRequest;
  constructor(floorNumber, totalFloors, onRequest) {
    this.number = floorNumber;
    this.onRequest = onRequest;
    this.createElement();
  }
  createElement() {
    this.element = document.createElement("div");
    this.element.className = "floor";
    this.element.id = `floor-${this.number}`;
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = `F${this.number}`;
    const floorButtons = document.createElement("div");
    floorButtons.className = "floor-buttons";
    if (this.number > 0) {
      this.upButton = document.createElement("button");
      this.upButton.className = "floor-button up";
      this.upButton.textContent = "▲";
      this.upButton.addEventListener("click", () => {
        this.requestElevator("up" /* UP */);
      });
      floorButtons.appendChild(this.upButton);
    }
    if (this.number < 9) {
      this.downButton = document.createElement("button");
      this.downButton.className = "floor-button down";
      this.downButton.textContent = "▼";
      this.downButton.addEventListener("click", () => {
        this.requestElevator("down" /* DOWN */);
      });
      floorButtons.appendChild(this.downButton);
    }
    this.element.appendChild(floorNumber);
    this.element.appendChild(floorButtons);
  }
  requestElevator(direction) {
    this.onRequest(this.number, direction);
    this.setButtonActive(direction, true);
  }
  setButtonActive(direction, isActive) {
    if (direction === "up" /* UP */ && this.upButton) {
      if (isActive) {
        this.upButton.classList.add("active");
      } else {
        this.upButton.classList.remove("active");
      }
    } else if (direction === "down" /* DOWN */ && this.downButton) {
      if (isActive) {
        this.downButton.classList.add("active");
      } else {
        this.downButton.classList.remove("active");
      }
    }
  }
}

// Building.ts
class Building {
  totalFloors;
  totalElevators;
  elevators;
  floors;
  requestQueue;
  isRunning;
  constructor(totalFloors, totalElevators) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.elevators = [];
    this.floors = [];
    this.requestQueue = [];
    this.isRunning = false;
    this.initializeElevators();
    this.initializeFloors();
  }
  initializeElevators() {
    for (let i = 0;i < this.totalElevators; i++) {
      const elevator = new Elevator(i, this.totalFloors);
      this.elevators.push(elevator);
    }
  }
  initializeFloors() {
    for (let i = 0;i < this.totalFloors; i++) {
      const floor = new Floor(i, this.totalFloors, (floorNumber, direction) => {
        this.handleFloorRequest(floorNumber, direction);
      });
      this.floors.push(floor);
    }
  }
  handleFloorRequest(floorNumber, direction) {
    if (!this.isRunning) {
      return;
    }
    const request = { floor: floorNumber, direction };
    const availableElevator = this.findBestElevator(request);
    if (availableElevator) {
      availableElevator.addFloorRequest(floorNumber, direction);
    } else {
      this.requestQueue.push(request);
    }
  }
  findBestElevator(request) {
    const idleElevators = this.elevators.filter((e) => e.isIdle());
    if (idleElevators.length === 0) {
      return null;
    }
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of idleElevators) {
      const distance = elevator.getDistanceToFloor(request.floor);
      if (distance < minDistance) {
        minDistance = distance;
        bestElevator = elevator;
      }
    }
    return bestElevator;
  }
  processQueue() {
    if (this.requestQueue.length === 0) {
      return;
    }
    const request = this.requestQueue[0];
    const availableElevator = this.findBestElevator(request);
    if (availableElevator) {
      this.requestQueue.shift();
      availableElevator.addFloorRequest(request.floor, request.direction);
    }
  }
  start() {
    this.isRunning = true;
  }
  stop() {
    this.isRunning = false;
  }
  reset() {
    this.isRunning = false;
    this.requestQueue = [];
    for (const elevator of this.elevators) {
      elevator.currentFloor = 0;
      elevator.state = "idle" /* IDLE */;
      elevator.direction = "none" /* NONE */;
      elevator.destinationFloors.clear();
      elevator.floorRequests.clear();
      elevator.updatePosition();
      elevator.updateState();
    }
  }
  getActiveRequestsCount() {
    let count = this.requestQueue.length;
    for (const elevator of this.elevators) {
      count += elevator.destinationFloors.size;
    }
    return count;
  }
  renderFloors(container) {
    container.innerHTML = "";
    for (const floor of this.floors) {
      container.appendChild(floor.element);
    }
  }
  renderElevators(container) {
    container.innerHTML = "";
    for (let i = 0;i < this.elevators.length; i++) {
      const elevator = this.elevators[i];
      elevator.element.style.left = `${i * 50}px`;
      container.appendChild(elevator.element);
    }
  }
}

// script.ts
var TOTAL_FLOORS = 10;
var TOTAL_ELEVATORS = 4;
var building;
var queueProcessorInterval = null;
document.addEventListener("DOMContentLoaded", () => {
  initializeSimulation();
  setupEventListeners();
});
function initializeSimulation() {
  building = new Building(TOTAL_FLOORS, TOTAL_ELEVATORS);
  const floorsContainer = document.getElementById("floors");
  const elevatorsContainer = document.getElementById("elevators");
  if (floorsContainer && elevatorsContainer) {
    building.renderFloors(floorsContainer);
    building.renderElevators(elevatorsContainer);
  }
  updateStatusDisplay();
}
function setupEventListeners() {
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const resetBtn = document.getElementById("reset-btn");
  if (startBtn) {
    startBtn.addEventListener("click", startSimulation);
  }
  if (stopBtn) {
    stopBtn.addEventListener("click", stopSimulation);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", resetSimulation);
  }
}
function startSimulation() {
  building.start();
  startQueueProcessor();
  updateStatusDisplay();
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = true;
  }
  const stopBtn = document.getElementById("stop-btn");
  if (stopBtn) {
    stopBtn.disabled = false;
  }
}
function stopSimulation() {
  building.stop();
  stopQueueProcessor();
  updateStatusDisplay();
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = false;
  }
  const stopBtn = document.getElementById("stop-btn");
  if (stopBtn) {
    stopBtn.disabled = true;
  }
}
function resetSimulation() {
  stopSimulation();
  building.reset();
  updateStatusDisplay();
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.disabled = false;
  }
  const stopBtn = document.getElementById("stop-btn");
  if (stopBtn) {
    stopBtn.disabled = true;
  }
}
function startQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
  }
  queueProcessorInterval = setInterval(() => {
    building.processQueue();
    updateStatusDisplay();
  }, 1000);
}
function stopQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
  }
}
function updateStatusDisplay() {
  const simStatus = document.getElementById("sim-status");
  const activeRequests = document.getElementById("active-requests");
  if (simStatus) {
    simStatus.textContent = building.isRunning ? "Running" : "Stopped";
  }
  if (activeRequests) {
    activeRequests.textContent = building.getActiveRequestsCount().toString();
  }
}
