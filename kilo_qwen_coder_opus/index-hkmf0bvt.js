// types.ts
var DEFAULT_CONFIG = {
  totalFloors: 10,
  totalElevators: 4,
  moveDuration: 500,
  doorOpenDuration: 300
};

// elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  status;
  internalRequests;
  isMoving;
  moveDuration;
  doorOpenDuration;
  onStateChange;
  onMovementStart;
  onMovementComplete;
  constructor(id, options = {}) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = null;
    this.status = "idle";
    this.internalRequests = new Set;
    this.isMoving = false;
    this.moveDuration = options.moveDuration || 500;
    this.doorOpenDuration = options.doorOpenDuration || 300;
  }
  getId() {
    return this.id;
  }
  getCurrentFloor() {
    return this.currentFloor;
  }
  getDirection() {
    return this.direction;
  }
  getStatus() {
    return this.status;
  }
  getInternalRequests() {
    return Array.from(this.internalRequests).sort((a, b) => a - b);
  }
  isIdle() {
    return this.status === "idle" && !this.isMoving;
  }
  isBusy() {
    return this.status !== "idle" || this.isMoving || this.internalRequests.size > 0;
  }
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }
  setMovementStartCallback(callback) {
    this.onMovementStart = callback;
  }
  setMovementCompleteCallback(callback) {
    this.onMovementComplete = callback;
  }
  addInternalRequest(floor) {
    if (floor === this.currentFloor) {
      return false;
    }
    if (this.internalRequests.has(floor)) {
      return false;
    }
    this.internalRequests.add(floor);
    this.notifyStateChange();
    return true;
  }
  removeInternalRequest(floor) {
    this.internalRequests.delete(floor);
  }
  clearInternalRequests() {
    this.internalRequests.clear();
  }
  hasRequestForFloor(floor) {
    return this.internalRequests.has(floor);
  }
  getNextFloor(totalFloors) {
    if (this.internalRequests.size === 0) {
      return null;
    }
    const requests = this.internalRequests;
    if (this.direction === "UP" /* UP */) {
      let nextFloor = null;
      for (const floor of requests) {
        if (floor > this.currentFloor) {
          if (nextFloor === null || floor < nextFloor) {
            nextFloor = floor;
          }
        }
      }
      if (nextFloor === null) {
        this.direction = "DOWN" /* DOWN */;
        nextFloor = Math.max(...requests);
      }
      return nextFloor;
    } else if (this.direction === "DOWN" /* DOWN */) {
      let nextFloor = null;
      for (const floor of requests) {
        if (floor < this.currentFloor) {
          if (nextFloor === null || floor > nextFloor) {
            nextFloor = floor;
          }
        }
      }
      if (nextFloor === null) {
        this.direction = "UP" /* UP */;
        nextFloor = Math.min(...requests);
      }
      return nextFloor;
    } else {
      const floorsAbove = Array.from(requests).filter((f) => f > this.currentFloor);
      const floorsBelow = Array.from(requests).filter((f) => f < this.currentFloor);
      if (floorsAbove.length > 0) {
        this.direction = "UP" /* UP */;
        return Math.min(...floorsAbove);
      } else if (floorsBelow.length > 0) {
        this.direction = "DOWN" /* DOWN */;
        return Math.max(...floorsBelow);
      }
      return null;
    }
  }
  async moveToFloor(targetFloor) {
    if (targetFloor === this.currentFloor) {
      return;
    }
    this.isMoving = true;
    this.status = "moving";
    this.direction = targetFloor > this.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    this.notifyStateChange();
    this.onMovementStart?.(this, targetFloor);
    const distance = Math.abs(targetFloor - this.currentFloor);
    const moveTime = distance * this.moveDuration;
    await new Promise((resolve) => setTimeout(resolve, moveTime));
    this.currentFloor = targetFloor;
    this.isMoving = false;
    this.notifyStateChange();
    this.onMovementComplete?.(this);
  }
  async openDoors() {
    this.status = "door_open";
    this.notifyStateChange();
    await new Promise((resolve) => setTimeout(resolve, this.doorOpenDuration));
  }
  async closeDoorsAndContinue(totalFloors) {
    this.status = this.internalRequests.size > 0 ? "moving" : "idle";
    while (this.internalRequests.size > 0) {
      const nextFloor = this.getNextFloor(totalFloors);
      if (nextFloor === null)
        break;
      await this.moveToFloor(nextFloor);
      await this.openDoors();
      this.removeInternalRequest(nextFloor);
    }
    if (this.internalRequests.size === 0) {
      this.direction = null;
      this.status = "idle";
    }
    this.notifyStateChange();
  }
  getDistanceFromFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  canServeRequest(floor, direction) {
    if (this.isIdle()) {
      return true;
    }
    if (this.direction === direction) {
      if (direction === "UP" /* UP */ && floor >= this.currentFloor) {
        return true;
      }
      if (direction === "DOWN" /* DOWN */ && floor <= this.currentFloor) {
        return true;
      }
    }
    return false;
  }
  getState() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      status: this.status,
      internalRequests: new Set(this.internalRequests),
      isMoving: this.isMoving
    };
  }
  notifyStateChange() {
    this.onStateChange?.(this);
  }
}

// floor.ts
class Floor {
  floorNumber;
  _hasUpButton;
  _hasDownButton;
  upRequestActive;
  downRequestActive;
  onUpRequest;
  onDownRequest;
  onRequestCleared;
  constructor(floorNumber, isGroundFloor, isTopFloor) {
    this.floorNumber = floorNumber;
    this._hasUpButton = !isGroundFloor;
    this._hasDownButton = !isTopFloor;
    this.upRequestActive = false;
    this.downRequestActive = false;
  }
  getFloorNumber() {
    return this.floorNumber;
  }
  hasUpButton() {
    return this._hasUpButton;
  }
  hasDownButton() {
    return this._hasDownButton;
  }
  isUpRequestActive() {
    return this.upRequestActive;
  }
  isDownRequestActive() {
    return this.downRequestActive;
  }
  setUpRequestCallback(callback) {
    this.onUpRequest = callback;
  }
  setDownRequestCallback(callback) {
    this.onDownRequest = callback;
  }
  setRequestClearedCallback(callback) {
    this.onRequestCleared = callback;
  }
  activateUpRequest() {
    if (!this.upRequestActive && this._hasUpButton) {
      this.upRequestActive = true;
      this.onUpRequest?.();
    }
  }
  activateDownRequest() {
    if (!this.downRequestActive && this._hasDownButton) {
      this.downRequestActive = true;
      this.onDownRequest?.();
    }
  }
  clearUpRequest() {
    if (this.upRequestActive) {
      this.upRequestActive = false;
      this.onRequestCleared?.("UP" /* UP */);
    }
  }
  clearDownRequest() {
    if (this.downRequestActive) {
      this.downRequestActive = false;
      this.onRequestCleared?.("DOWN" /* DOWN */);
    }
  }
  getActiveRequests() {
    const requests = [];
    if (this.upRequestActive) {
      requests.push({
        floor: this.floorNumber,
        direction: "UP" /* UP */,
        timestamp: Date.now(),
        assignedElevatorId: null
      });
    }
    if (this.downRequestActive) {
      requests.push({
        floor: this.floorNumber,
        direction: "DOWN" /* DOWN */,
        timestamp: Date.now(),
        assignedElevatorId: null
      });
    }
    return requests;
  }
  hasActiveRequest() {
    return this.upRequestActive || this.downRequestActive;
  }
}

// building.ts
class Building {
  config;
  floors;
  elevators;
  pendingRequests;
  isProcessing;
  onElevatorStateChange;
  onElevatorMovement;
  onRequestAssigned;
  onRequestCompleted;
  onQueueUpdate;
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.floors = new Map;
    this.elevators = new Map;
    this.pendingRequests = [];
    this.isProcessing = false;
    this.initializeFloors();
    this.initializeElevators();
  }
  initializeFloors() {
    for (let i = 0;i < this.config.totalFloors; i++) {
      const isGroundFloor = i === 0;
      const isTopFloor = i === this.config.totalFloors - 1;
      const floor = new Floor(i, isGroundFloor, isTopFloor);
      floor.setUpRequestCallback(() => this.handleExternalRequest(i, "UP" /* UP */));
      floor.setDownRequestCallback(() => this.handleExternalRequest(i, "DOWN" /* DOWN */));
      this.floors.set(i, floor);
    }
  }
  initializeElevators() {
    for (let i = 0;i < this.config.totalElevators; i++) {
      const elevator = new Elevator(i, {
        moveDuration: this.config.moveDuration,
        doorOpenDuration: this.config.doorOpenDuration
      });
      elevator.setStateChangeCallback((elev) => {
        this.onElevatorStateChange?.(elev.getId(), elev.getState());
      });
      elevator.setMovementStartCallback((elev, targetFloor) => {
        this.onElevatorMovement?.(elev.getId(), elev.getCurrentFloor(), targetFloor);
        this.processElevatorMovement(elev);
      });
      this.elevators.set(i, elevator);
    }
  }
  setElevatorStateChangeCallback(callback) {
    this.onElevatorStateChange = callback;
  }
  setElevatorMovementCallback(callback) {
    this.onElevatorMovement = callback;
  }
  setRequestAssignedCallback(callback) {
    this.onRequestAssigned = callback;
  }
  setRequestCompletedCallback(callback) {
    this.onRequestCompleted = callback;
  }
  setQueueUpdateCallback(callback) {
    this.onQueueUpdate = callback;
  }
  handleExternalRequest(floor, direction) {
    const request = {
      floor,
      direction,
      timestamp: Date.now(),
      assignedElevatorId: null
    };
    this.pendingRequests.push(request);
    this.assignRequestToElevator(request);
    this.onQueueUpdate?.(this.pendingRequests);
  }
  assignRequestToElevator(request) {
    const bestElevator = this.findBestElevator(request);
    if (bestElevator) {
      request.assignedElevatorId = bestElevator.getId();
      bestElevator.addInternalRequest(request.floor);
      this.onRequestAssigned?.(request, bestElevator.getId());
    }
  }
  findBestElevator(request) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators.values()) {
      const score = this.calculateElevatorScore(elevator, request);
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }
    return bestElevator;
  }
  calculateElevatorScore(elevator, request) {
    const elevatorFloor = elevator.getCurrentFloor();
    const requestFloor = request.floor;
    const requestDirection = request.direction;
    const elevatorDirection = elevator.getDirection();
    let score = Math.abs(elevatorFloor - requestFloor);
    if (elevator.isIdle()) {
      return score;
    }
    if (elevatorDirection === requestDirection) {
      if (requestDirection === "UP" /* UP */ && requestFloor >= elevatorFloor) {
        return score * 0.5;
      } else if (requestDirection === "DOWN" /* DOWN */ && requestFloor <= elevatorFloor) {
        return score * 0.5;
      }
    }
    if (requestDirection === "UP" /* UP */ && elevatorDirection === "DOWN" /* DOWN */) {
      score *= 2;
    } else if (requestDirection === "DOWN" /* DOWN */ && elevatorDirection === "UP" /* UP */) {
      score *= 2;
    }
    return score;
  }
  async processElevatorMovement(elevator) {
    const totalFloors = this.config.totalFloors;
    while (true) {
      const nextFloor = elevator.getNextFloor(totalFloors);
      if (nextFloor === null) {
        elevator.clearInternalRequests();
        break;
      }
      await elevator.moveToFloor(nextFloor);
      await elevator.openDoors();
      elevator.removeInternalRequest(nextFloor);
      this.clearFloorRequest(nextFloor, nextFloor > elevator.getCurrentFloor() ? "UP" /* UP */ : "DOWN" /* DOWN */);
      const remainingRequests = elevator.getInternalRequests();
      if (remainingRequests.length === 0) {
        break;
      }
    }
    this.updatePendingRequests();
  }
  clearFloorRequest(floor, direction) {
    const floorObj = this.floors.get(floor);
    if (floorObj) {
      if (direction === "UP" /* UP */) {
        floorObj.clearUpRequest();
      } else {
        floorObj.clearDownRequest();
      }
    }
  }
  updatePendingRequests() {
    this.pendingRequests = this.pendingRequests.filter((req) => {
      const floorObj = this.floors.get(req.floor);
      if (!floorObj)
        return false;
      const stillActive = req.direction === "UP" /* UP */ ? floorObj.isUpRequestActive() : floorObj.isDownRequestActive();
      if (!stillActive) {
        this.onRequestCompleted?.(req);
      }
      return stillActive;
    });
    this.onQueueUpdate?.(this.pendingRequests);
  }
  getFloors() {
    return this.floors;
  }
  getElevators() {
    return this.elevators;
  }
  getConfig() {
    return this.config;
  }
  getPendingRequests() {
    return [...this.pendingRequests];
  }
  addInternalRequest(elevatorId, floor) {
    const elevator = this.elevators.get(elevatorId);
    if (elevator) {
      return elevator.addInternalRequest(floor);
    }
    return false;
  }
  getFloor(floorNumber) {
    return this.floors.get(floorNumber);
  }
  getElevator(elevatorId) {
    return this.elevators.get(elevatorId);
  }
}

// script.ts
var CONFIG = {
  totalFloors: 10,
  totalElevators: 4,
  moveDuration: 500,
  doorOpenDuration: 300
};
var building;
var elevatorElements = new Map;
var floorButtonElements = new Map;
var elevatorButtonElements = new Map;
function init() {
  building = new Building(CONFIG);
  setupCallbacks();
  buildUI();
  console.log("Elevator Simulator initialized");
  console.log(`Floors: ${CONFIG.totalFloors}, Elevators: ${CONFIG.totalElevators}`);
}
function setupCallbacks() {
  building.setElevatorStateChangeCallback((elevatorId, state) => {
    updateElevatorUI(elevatorId, state);
    updateElevatorStatusPanel();
  });
  building.setElevatorMovementCallback((elevatorId, fromFloor, toFloor) => {
    animateElevatorMovement(elevatorId, fromFloor, toFloor);
  });
  building.setRequestAssignedCallback((request, elevatorId) => {
    console.log(`Request from floor ${request.floor} (${request.direction}) assigned to elevator ${elevatorId}`);
  });
  building.setRequestCompletedCallback((request) => {
    console.log(`Request from floor ${request.floor} completed`);
  });
  building.setQueueUpdateCallback((requests) => {
    updateRequestQueueUI(requests);
  });
}
function buildUI() {
  buildFloors();
  buildElevators();
  buildFloorButtons();
  buildElevatorPanels();
  updateElevatorStatusPanel();
  updateRequestQueueUI(building.getPendingRequests());
}
function buildFloors() {
  const container = document.getElementById("floorsContainer");
  container.innerHTML = "";
  for (let i = CONFIG.totalFloors - 1;i >= 0; i--) {
    const floor = building.getFloor(i);
    if (!floor)
      continue;
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${i}`;
    floorDiv.innerHTML = `
            <div class="floor-number">${i}</div>
            <div class="floor-label">Floor ${i}</div>
        `;
    container.appendChild(floorDiv);
  }
}
function buildElevators() {
  const container = document.getElementById("elevatorsContainer");
  container.innerHTML = "";
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const elevator = building.getElevator(i);
    if (!elevator)
      continue;
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    shaft.id = `shaft-${i}`;
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${i}`;
    elevatorDiv.innerHTML = `
            <div class="status-light"></div>
            <div class="door left"></div>
            <div class="door right"></div>
            <span class="elevator-number">E${i}</span>
        `;
    shaft.appendChild(elevatorDiv);
    container.appendChild(shaft);
    elevatorElements.set(i, elevatorDiv);
    updateElevatorPosition(i, 0);
  }
}
function buildFloorButtons() {
  const container = document.getElementById("floorButtonsContainer");
  container.innerHTML = "";
  for (let i = CONFIG.totalFloors - 1;i >= 0; i--) {
    const floor = building.getFloor(i);
    if (!floor)
      continue;
    const rowDiv = document.createElement("div");
    rowDiv.className = "floor-button-row";
    rowDiv.id = `floor-buttons-${i}`;
    if (floor.hasUpButton()) {
      const upBtn = document.createElement("button");
      upBtn.className = "floor-request-btn up";
      upBtn.innerHTML = "↑";
      upBtn.id = `floor-up-btn-${i}`;
      upBtn.onclick = () => handleFloorUpRequest(i);
      rowDiv.appendChild(upBtn);
      floorButtonElements.set(`up-${i}`, upBtn);
    }
    if (floor.hasDownButton()) {
      const downBtn = document.createElement("button");
      downBtn.className = "floor-request-btn down";
      downBtn.innerHTML = "↓";
      downBtn.id = `floor-down-btn-${i}`;
      downBtn.onclick = () => handleFloorDownRequest(i);
      rowDiv.appendChild(downBtn);
      floorButtonElements.set(`down-${i}`, downBtn);
    }
    container.appendChild(rowDiv);
  }
}
function buildElevatorPanels() {
  const container = document.getElementById("elevatorPanelsContainer");
  container.innerHTML = "";
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const panel = document.createElement("div");
    panel.className = "elevator-panel";
    panel.id = `elevator-panel-${i}`;
    panel.innerHTML = `
            <h4>Elevator ${i}</h4>
            <div class="elevator-panel-buttons" id="panel-buttons-${i}"></div>
        `;
    const buttonsContainer = panel.querySelector(".elevator-panel-buttons");
    for (let floor = 0;floor < CONFIG.totalFloors; floor++) {
      const btn = document.createElement("button");
      btn.className = "elevator-floor-btn";
      btn.textContent = floor.toString();
      btn.id = `elevator-btn-${i}-${floor}`;
      btn.onclick = () => handleElevatorButtonPress(i, floor);
      buttonsContainer.appendChild(btn);
      elevatorButtonElements.set(`${i}-${floor}`, btn);
    }
    container.appendChild(panel);
  }
}
function handleFloorUpRequest(floor) {
  const floorObj = building.getFloor(floor);
  if (floorObj && floorObj.hasUpButton()) {
    floorObj.activateUpRequest();
    updateFloorButtonUI(floor, "UP" /* UP */);
  }
}
function handleFloorDownRequest(floor) {
  const floorObj = building.getFloor(floor);
  if (floorObj && floorObj.hasDownButton()) {
    floorObj.activateDownRequest();
    updateFloorButtonUI(floor, "DOWN" /* DOWN */);
  }
}
function handleElevatorButtonPress(elevatorId, floor) {
  const result = building.addInternalRequest(elevatorId, floor);
  if (result) {
    updateElevatorButtonUI(elevatorId, floor);
    console.log(`Elevator ${elevatorId} requested floor ${floor}`);
  }
}
function updateElevatorPosition(elevatorId, floor) {
  const elevator = elevatorElements.get(elevatorId);
  if (!elevator)
    return;
  const floorHeight = 60;
  const offset = (CONFIG.totalFloors - 1 - floor) * floorHeight;
  elevator.style.top = `${offset}px`;
}
function animateElevatorMovement(elevatorId, fromFloor, toFloor) {
  const elevator = elevatorElements.get(elevatorId);
  if (!elevator)
    return;
  updateElevatorPosition(elevatorId, toFloor);
  setTimeout(() => {
    openElevatorDoors(elevatorId);
  }, 100);
  setTimeout(() => {
    closeElevatorDoors(elevatorId);
  }, CONFIG.doorOpenDuration);
}
function openElevatorDoors(elevatorId) {
  const elevator = elevatorElements.get(elevatorId);
  if (!elevator)
    return;
  const doors = elevator.querySelectorAll(".door");
  doors.forEach((door) => door.classList.add("open"));
}
function closeElevatorDoors(elevatorId) {
  const elevator = elevatorElements.get(elevatorId);
  if (!elevator)
    return;
  const doors = elevator.querySelectorAll(".door");
  doors.forEach((door) => door.classList.remove("open"));
}
function updateElevatorUI(elevatorId, state) {
  const elevator = elevatorElements.get(elevatorId);
  if (!elevator)
    return;
  const statusLight = elevator.querySelector(".status-light");
  statusLight.className = "status-light";
  if (state.status === "moving") {
    statusLight.classList.add("moving");
  } else if (state.status === "door_open") {
    statusLight.classList.add("busy");
  }
}
function updateFloorButtonUI(floor, direction) {
  const key = direction === "UP" /* UP */ ? `up-${floor}` : `down-${floor}`;
  const btn = floorButtonElements.get(key);
  if (btn) {
    btn.classList.add("active");
  }
}
function updateElevatorButtonUI(elevatorId, floor) {
  const key = `${elevatorId}-${floor}`;
  const btn = elevatorButtonElements.get(key);
  if (btn) {
    btn.classList.add("active");
  }
}
function updateElevatorStatusPanel() {
  const container = document.getElementById("elevatorStatus");
  container.innerHTML = "";
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const elevator = building.getElevator(i);
    if (!elevator)
      continue;
    const state = elevator.getState();
    const statusItem = document.createElement("div");
    statusItem.className = "elevator-status-item";
    let statusText = "Idle";
    let statusClass = "";
    if (state.status === "moving") {
      statusText = "Moving";
      statusClass = "moving";
    } else if (state.status === "door_open") {
      statusText = "Door Open";
      statusClass = "busy";
    }
    statusItem.innerHTML = `
            <span>Elevator ${i}: Floor ${state.currentFloor} - ${statusText}</span>
            <span class="status-indicator ${statusClass}"></span>
        `;
    container.appendChild(statusItem);
  }
}
function updateRequestQueueUI(requests) {
  const container = document.getElementById("requestQueue");
  container.innerHTML = "";
  if (requests.length === 0) {
    container.innerHTML = '<span style="color: #888;">No pending requests</span>';
    return;
  }
  requests.forEach((request) => {
    const item = document.createElement("div");
    item.className = `queue-item ${request.direction === "UP" /* UP */ ? "up" : "down"}`;
    item.textContent = `Floor ${request.floor} ${request.direction === "UP" /* UP */ ? "↑" : "↓"}`;
    container.appendChild(item);
  });
}
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", init);
}
