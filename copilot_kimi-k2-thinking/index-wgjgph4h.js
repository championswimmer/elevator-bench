// types.ts
var CONFIG = {
  FLOOR_COUNT: 10,
  ELEVATOR_COUNT: 4,
  FLOOR_HEIGHT: 80,
  ELEVATOR_SPEED: 1000,
  LOADING_TIME: 2000,
  PORT: 8623
};

// Elevator.ts
class Elevator {
  id;
  currentFloor;
  targetFloor;
  direction;
  state;
  destinationRequests;
  floorRequests;
  isMoving;
  element;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.targetFloor = 0;
    this.direction = "idle" /* IDLE */;
    this.state = "idle" /* IDLE */;
    this.destinationRequests = new Set;
    this.floorRequests = [];
    this.isMoving = false;
    this.element = null;
  }
  requestFloor(floor) {
    if (floor === this.currentFloor && this.state === "idle" /* IDLE */) {
      this.state = "loading" /* LOADING */;
      setTimeout(() => {
        this.state = "idle" /* IDLE */;
        this.updateDisplay();
      }, CONFIG.LOADING_TIME);
      return;
    }
    this.destinationRequests.add(floor);
    this.processRequests();
  }
  requestPickup(request) {
    if (this.canServiceRequest(request)) {
      this.floorRequests.push(request);
      this.processRequests();
    }
  }
  canServiceRequest(request) {
    if (this.state === "idle" /* IDLE */) {
      return true;
    }
    if (this.direction === "up" /* UP */ && request.direction === "up" /* UP */) {
      return request.floor > this.currentFloor;
    }
    if (this.direction === "down" /* DOWN */ && request.direction === "down" /* DOWN */) {
      return request.floor < this.currentFloor;
    }
    return false;
  }
  processRequests() {
    if (this.isMoving || this.state === "loading" /* LOADING */) {
      return;
    }
    if (this.destinationRequests.size > 0) {
      const nextDestination = this.getNextDestination();
      if (nextDestination !== null) {
        this.moveToFloor(nextDestination);
        return;
      }
    }
    if (this.floorRequests.length > 0) {
      const nextRequest = this.getNextFloorRequest();
      if (nextRequest) {
        this.moveToFloor(nextRequest.floor);
        this.floorRequests = this.floorRequests.filter((req) => !(req.floor === nextRequest.floor && req.direction === nextRequest.direction));
      }
    }
  }
  getNextDestination() {
    if (this.destinationRequests.size === 0)
      return null;
    const destinations = Array.from(this.destinationRequests);
    if (this.direction === "idle" /* IDLE */) {
      return destinations.reduce((closest, floor) => {
        const currentDist = Math.abs(floor - this.currentFloor);
        const closestDist = Math.abs(closest - this.currentFloor);
        return currentDist < closestDist ? floor : closest;
      });
    }
    const floorsInDirection = destinations.filter((floor) => {
      if (this.direction === "up" /* UP */)
        return floor > this.currentFloor;
      if (this.direction === "down" /* DOWN */)
        return floor < this.currentFloor;
      return false;
    });
    if (floorsInDirection.length > 0) {
      return this.direction === "up" /* UP */ ? Math.min(...floorsInDirection) : Math.max(...floorsInDirection);
    }
    this.direction = this.direction === "up" /* UP */ ? "down" /* DOWN */ : "up" /* UP */;
    return this.getNextDestination();
  }
  getNextFloorRequest() {
    if (this.floorRequests.length === 0)
      return null;
    const validRequests = this.floorRequests.filter((req) => {
      if (this.direction === "idle" /* IDLE */)
        return true;
      if (this.direction === "up" /* UP */)
        return req.floor > this.currentFloor;
      if (this.direction === "down" /* DOWN */)
        return req.floor < this.currentFloor;
      return false;
    });
    if (validRequests.length > 0) {
      return validRequests.reduce((closest, req) => {
        const currentDist = Math.abs(req.floor - this.currentFloor);
        const closestDist = Math.abs(closest.floor - this.currentFloor);
        return currentDist < closestDist ? req : closest;
      });
    }
    return null;
  }
  moveToFloor(targetFloor) {
    if (this.currentFloor === targetFloor) {
      this.destinationRequests.delete(targetFloor);
      this.state = "loading" /* LOADING */;
      this.updateDisplay();
      setTimeout(() => {
        this.state = "idle" /* IDLE */;
        this.isMoving = false;
        this.updateDisplay();
        this.processRequests();
      }, CONFIG.LOADING_TIME);
      return;
    }
    this.isMoving = true;
    this.targetFloor = targetFloor;
    this.direction = targetFloor > this.currentFloor ? "up" /* UP */ : "down" /* DOWN */;
    this.state = "moving" /* MOVING */;
    const distance = Math.abs(targetFloor - this.currentFloor);
    const travelTime = distance * CONFIG.ELEVATOR_SPEED;
    this.updateDisplay();
    this.animateMovement(targetFloor, travelTime);
    setTimeout(() => {
      this.currentFloor = targetFloor;
      this.destinationRequests.delete(targetFloor);
      this.state = "loading" /* LOADING */;
      this.updateDisplay();
      setTimeout(() => {
        this.state = "idle" /* IDLE */;
        this.isMoving = false;
        this.updateDisplay();
        this.processRequests();
      }, CONFIG.LOADING_TIME);
    }, travelTime);
  }
  animateMovement(targetFloor, duration) {
    if (!this.element)
      return;
    const targetPosition = (CONFIG.FLOOR_COUNT - 1 - targetFloor) * CONFIG.FLOOR_HEIGHT;
    this.element.style.transition = `bottom ${duration}ms ease-in-out`;
    this.element.style.bottom = `${targetPosition}px`;
  }
  updateDisplay() {
    if (!this.element)
      return;
    const floorDisplay = this.element.querySelector(".floor-display");
    const statusDisplay = this.element.querySelector(".status");
    if (floorDisplay) {
      floorDisplay.textContent = `${this.currentFloor}`;
    }
    if (statusDisplay) {
      const statusText = this.state === "moving" /* MOVING */ ? `${this.direction === "up" /* UP */ ? "↑" : "↓"}` : this.state === "loading" /* LOADING */ ? "○" : "";
      statusDisplay.textContent = statusText;
    }
    const directionIndicator = this.element.querySelector(".direction-indicator");
    if (directionIndicator) {
      directionIndicator.textContent = this.direction === "up" /* UP */ ? "↑" : this.direction === "down" /* DOWN */ ? "↓" : "";
    }
  }
  setElement(element) {
    this.element = element;
    this.updateDisplay();
  }
  getDistanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  isAvailableForRequest() {
    return this.state === "idle" /* IDLE */ || this.state === "moving" /* MOVING */ && this.floorRequests.length < 3;
  }
}

// Floor.ts
class Floor {
  floorNumber;
  upButton;
  downButton;
  element;
  upButtonElement;
  downButtonElement;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.upButton = false;
    this.downButton = false;
    this.element = null;
    this.upButtonElement = null;
    this.downButtonElement = null;
    if (floorNumber === totalFloors - 1) {
      this.upButton = false;
      this.downButton = true;
    } else if (floorNumber === 0) {
      this.upButton = true;
      this.downButton = false;
    } else {
      this.upButton = true;
      this.downButton = true;
    }
  }
  setElement(element) {
    this.element = element;
    this.upButtonElement = element.querySelector(".up-btn");
    this.downButtonElement = element.querySelector(".down-btn");
    this.updateButtonStates();
  }
  pressUpButton() {
    if (!this.upButton || !this.upButtonElement)
      return null;
    const request = {
      floor: this.floorNumber,
      direction: "up" /* UP */
    };
    this.upButtonElement.classList.add("active");
    return request;
  }
  pressDownButton() {
    if (!this.downButton || !this.downButtonElement)
      return null;
    const request = {
      floor: this.floorNumber,
      direction: "down" /* DOWN */
    };
    this.downButtonElement.classList.add("active");
    return request;
  }
  clearButton(direction) {
    if (direction === "up" /* UP */ && this.upButtonElement) {
      this.upButtonElement.classList.remove("active");
    } else if (direction === "down" /* DOWN */ && this.downButtonElement) {
      this.downButtonElement.classList.remove("active");
    }
  }
  updateButtonStates() {
    if (this.upButtonElement) {
      this.upButtonElement.style.display = this.upButton ? "inline-block" : "none";
    }
    if (this.downButtonElement) {
      this.downButtonElement.style.display = this.downButton ? "inline-block" : "none";
    }
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  queuedRequests;
  buildingElement;
  floorsContainer;
  elevatorShafts;
  constructor() {
    this.floors = [];
    this.elevators = [];
    this.queuedRequests = [];
    this.buildingElement = null;
    this.floorsContainer = null;
    this.elevatorShafts = null;
    this.initializeBuilding();
  }
  initializeBuilding() {
    for (let i = 0;i < CONFIG.FLOOR_COUNT; i++) {
      this.floors.push(new Floor(i, CONFIG.FLOOR_COUNT));
    }
    for (let i = 0;i < CONFIG.ELEVATOR_COUNT; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  setElements(buildingElement, floorsContainer, elevatorShafts) {
    this.buildingElement = buildingElement;
    this.floorsContainer = floorsContainer;
    this.elevatorShafts = elevatorShafts;
    this.renderBuilding();
  }
  renderBuilding() {
    if (!this.floorsContainer || !this.elevatorShafts)
      return;
    this.floorsContainer.innerHTML = "";
    this.elevatorShafts.innerHTML = "";
    for (let i = 0;i < CONFIG.ELEVATOR_COUNT; i++) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";
      shaft.style.height = `${CONFIG.FLOOR_COUNT * CONFIG.FLOOR_HEIGHT}px`;
      const elevator = this.elevators[i];
      const elevatorElement = this.createElevatorElement(i);
      shaft.appendChild(elevatorElement);
      elevator.setElement(elevatorElement);
      this.elevatorShafts.appendChild(shaft);
    }
    for (let i = CONFIG.FLOOR_COUNT - 1;i >= 0; i--) {
      const floor = this.floors[i];
      const floorElement = this.createFloorElement(i);
      floor.setElement(floorElement);
      this.floorsContainer.appendChild(floorElement);
    }
  }
  createElevatorElement(elevatorId) {
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${elevatorId}`;
    elevatorDiv.style.bottom = "0px";
    elevatorDiv.innerHTML = `
            <div class="elevator-info">
                <span class="elevator-id">${elevatorId}</span>
                <span class="floor-display">0</span>
                <span class="status"></span>
            </div>
            <div class="elevator-buttons">
                ${Array.from({ length: CONFIG.FLOOR_COUNT }, (_, i) => `<button class="floor-btn" data-floor="${i}">${i}</button>`).join("")}
            </div>
            <div class="direction-indicator"></div>
        `;
    return elevatorDiv;
  }
  createFloorElement(floorNumber) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${floorNumber}`;
    floorDiv.innerHTML = `
            <div class="floor-info">
                <span class="floor-number">Floor ${floorNumber}</span>
            </div>
            <div class="floor-controls">
                <button class="up-btn" data-floor="${floorNumber}">▲</button>
                <button class="down-btn" data-floor="${floorNumber}">▼</button>
            </div>
        `;
    return floorDiv;
  }
  requestElevator(floorNumber, direction) {
    const request = { floor: floorNumber, direction };
    const availableElevator = this.findBestElevator(request);
    if (availableElevator) {
      availableElevator.requestPickup(request);
    } else {
      this.queuedRequests.push(request);
      this.updateStats();
    }
  }
  findBestElevator(request) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.canServiceRequest(request)) {
        const distance = elevator.getDistanceToFloor(request.floor);
        const queuePenalty = elevator.floorRequests.length * 2;
        const score = distance + queuePenalty;
        if (score < bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }
    }
    return bestElevator;
  }
  processQueuedRequests() {
    if (this.queuedRequests.length === 0)
      return;
    const processedRequests = [];
    for (const request of this.queuedRequests) {
      const elevator = this.findBestElevator(request);
      if (elevator) {
        elevator.requestPickup(request);
        processedRequests.push(request);
        const floor = this.floors[request.floor];
        floor.clearButton(request.direction);
      }
    }
    this.queuedRequests = this.queuedRequests.filter((req) => !processedRequests.some((processed) => processed.floor === req.floor && processed.direction === req.direction));
    this.updateStats();
  }
  updateStats() {
    const activeRequests = this.elevators.reduce((total, elevator) => total + elevator.floorRequests.length + elevator.destinationRequests.size, 0);
    const activeRequestsEl = document.getElementById("active-requests");
    const queuedRequestsEl = document.getElementById("queued-requests");
    if (activeRequestsEl)
      activeRequestsEl.textContent = activeRequests.toString();
    if (queuedRequestsEl)
      queuedRequestsEl.textContent = this.queuedRequests.length.toString();
  }
  reset() {
    this.elevators.forEach((elevator) => {
      elevator.currentFloor = 0;
      elevator.targetFloor = 0;
      elevator.direction = "idle" /* IDLE */;
      elevator.state = "idle" /* IDLE */;
      elevator.destinationRequests.clear();
      elevator.floorRequests = [];
      elevator.isMoving = false;
      elevator.updateDisplay();
    });
    this.queuedRequests = [];
    this.floors.forEach((floor) => {
      floor.clearButton("up" /* UP */);
      floor.clearButton("down" /* DOWN */);
    });
    this.updateStats();
  }
  start() {
    setInterval(() => {
      this.processQueuedRequests();
    }, 500);
    setInterval(() => {
      this.updateStats();
    }, 250);
  }
}

// script.ts
class ElevatorSimulator {
  building;
  constructor() {
    this.building = new Building;
    this.initializeEventListeners();
    this.building.start();
  }
  initializeEventListeners() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.setupBuilding();
        this.setupEventListeners();
      });
    } else {
      this.setupBuilding();
      this.setupEventListeners();
    }
  }
  setupBuilding() {
    const buildingElement = document.querySelector(".building");
    const floorsContainer = document.getElementById("floors-container");
    const elevatorShafts = document.getElementById("elevator-shafts");
    if (buildingElement && floorsContainer && elevatorShafts) {
      this.building.setElements(buildingElement, floorsContainer, elevatorShafts);
    }
  }
  setupEventListeners() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (target.classList.contains("up-btn")) {
        const floorNumber = parseInt(target.dataset.floor || "0");
        this.building.requestElevator(floorNumber, "up" /* UP */);
      }
      if (target.classList.contains("down-btn")) {
        const floorNumber = parseInt(target.dataset.floor || "0");
        this.building.requestElevator(floorNumber, "down" /* DOWN */);
      }
    });
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (target.classList.contains("floor-btn")) {
        const floorNumber = parseInt(target.dataset.floor || "0");
        const elevatorElement = target.closest(".elevator");
        if (elevatorElement) {
          const elevatorId = parseInt(elevatorElement.id.split("-")[1]);
          const elevator = this.building.elevators[elevatorId];
          if (elevator) {
            elevator.requestFloor(floorNumber);
            target.classList.add("pressed");
            setTimeout(() => target.classList.remove("pressed"), 200);
          }
        }
      }
    });
    const resetBtn = document.getElementById("reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.building.reset();
      });
    }
  }
}
var simulator = new ElevatorSimulator;
