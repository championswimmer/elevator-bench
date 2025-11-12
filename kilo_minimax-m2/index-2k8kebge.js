// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  status;
  targetFloors;
  destinationQueue;
  onStatusChange;
  onFloorChange;
  requestQueue;
  isMoving;
  animationSpeed;
  constructor(id, initialFloor = 0, animationSpeed = 500) {
    this.id = id;
    this.currentFloor = initialFloor;
    this.direction = "idle" /* IDLE */;
    this.status = "idle" /* IDLE */;
    this.targetFloors = new Set;
    this.destinationQueue = [];
    this.requestQueue = [];
    this.isMoving = false;
    this.animationSpeed = animationSpeed;
  }
  addRequest(request) {
    if (!this.requestQueue.find((r) => r.floor === request.floor && r.direction === request.direction)) {
      this.requestQueue.push(request);
      this.sortRequests();
      this.updateStatus();
    }
  }
  sortRequests() {
    if (this.requestQueue.length <= 1)
      return;
    const currentPos = this.currentFloor;
    const goingUp = this.direction === "up" /* UP */;
    const goingDown = this.direction === "down" /* DOWN */;
    const upRequests = this.requestQueue.filter((r) => r.direction === "up" /* UP */);
    const downRequests = this.requestQueue.filter((r) => r.direction === "down" /* DOWN */);
    this.requestQueue = [];
    if (goingUp || this.direction === "idle" /* IDLE */) {
      const sameDirectionUp = upRequests.filter((r) => r.floor >= currentPos);
      const oppositeDirectionUp = upRequests.filter((r) => r.floor < currentPos);
      const otherDirectionUp = goingUp ? downRequests : [...downRequests, ...upRequests.filter((r) => r.floor < currentPos)];
      this.requestQueue.push(...sameDirectionUp.sort((a, b) => a.floor - b.floor), ...oppositeDirectionUp.sort((a, b) => b.floor - a.floor), ...otherDirectionUp.sort((a, b) => b.floor - a.floor));
    } else if (goingDown) {
      const sameDirectionDown = downRequests.filter((r) => r.floor <= currentPos);
      const oppositeDirectionDown = downRequests.filter((r) => r.floor > currentPos);
      const otherDirectionDown = [...upRequests, ...downRequests.filter((r) => r.floor > currentPos)];
      this.requestQueue.push(...sameDirectionDown.sort((a, b) => b.floor - a.floor), ...oppositeDirectionDown.sort((a, b) => a.floor - b.floor), ...otherDirectionDown.sort((a, b) => a.floor - b.floor));
    }
  }
  processNextRequest() {
    if (this.requestQueue.length === 0 || this.isMoving) {
      return Promise.resolve();
    }
    const request = this.requestQueue.shift();
    this.isMoving = true;
    this.status = "moving" /* MOVING */;
    if (this.onStatusChange) {
      this.onStatusChange(this);
    }
    if (request.floor > this.currentFloor) {
      this.direction = "up" /* UP */;
    } else if (request.floor < this.currentFloor) {
      this.direction = "down" /* DOWN */;
    }
    return this.moveToFloor(request.floor).then(() => {
      this.isMoving = false;
      this.targetFloors.delete(request.floor);
      if (this.shouldContinueDirection()) {
        this.processNextRequest();
      } else {
        this.direction = "idle" /* IDLE */;
        this.status = "idle" /* IDLE */;
        if (this.onStatusChange) {
          this.onStatusChange(this);
        }
      }
    });
  }
  moveToFloor(targetFloor) {
    return new Promise((resolve) => {
      const step = targetFloor > this.currentFloor ? 1 : -1;
      const animateStep = () => {
        if (step > 0 && this.currentFloor >= targetFloor || step < 0 && this.currentFloor <= targetFloor) {
          this.currentFloor = targetFloor;
          if (this.onFloorChange) {
            this.onFloorChange(this, this.currentFloor);
          }
          resolve();
          return;
        }
        this.currentFloor += step;
        if (this.onFloorChange) {
          this.onFloorChange(this, this.currentFloor);
        }
        setTimeout(animateStep, this.animationSpeed);
      };
      animateStep();
    });
  }
  shouldContinueDirection() {
    if (this.requestQueue.length === 0)
      return false;
    if (this.direction === "up" /* UP */) {
      return this.requestQueue.some((r) => r.floor >= this.currentFloor);
    } else if (this.direction === "down" /* DOWN */) {
      return this.requestQueue.some((r) => r.floor <= this.currentFloor);
    }
    return false;
  }
  isAtFloor(floor) {
    return this.currentFloor === floor;
  }
  getDistanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  canHandleRequest(floor, direction) {
    if (this.status === "emergency" /* EMERGENCY */)
      return false;
    if (this.status === "idle" /* IDLE */)
      return true;
    if (this.direction === direction) {
      if (direction === "up" /* UP */ && floor >= this.currentFloor)
        return true;
      if (direction === "down" /* DOWN */ && floor <= this.currentFloor)
        return true;
    }
    return false;
  }
  emergencyStop() {
    this.status = "emergency" /* EMERGENCY */;
    this.requestQueue = [];
    this.isMoving = false;
    if (this.onStatusChange) {
      this.onStatusChange(this);
    }
  }
  reset() {
    if (this.status === "emergency" /* EMERGENCY */) {
      this.status = "idle" /* IDLE */;
      this.direction = "idle" /* IDLE */;
      this.isMoving = false;
      if (this.onStatusChange) {
        this.onStatusChange(this);
      }
    }
  }
  updateStatus() {
    if (this.status === "emergency" /* EMERGENCY */)
      return;
    if (this.isMoving || this.requestQueue.length > 0) {
      if (this.requestQueue.length > 0) {
        this.status = this.isMoving ? "moving" /* MOVING */ : "busy" /* BUSY */;
      } else {
        this.status = "idle" /* IDLE */;
        this.direction = "idle" /* IDLE */;
      }
    } else {
      this.status = "idle" /* IDLE */;
      this.direction = "idle" /* IDLE */;
    }
    if (this.onStatusChange) {
      this.onStatusChange(this);
    }
  }
  getRequestCount() {
    return this.requestQueue.length;
  }
  getInfo() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      status: this.status,
      direction: this.direction,
      requestCount: this.requestQueue.length
    };
  }
}

// Floor.ts
class Floor {
  floorNumber;
  isTopFloor;
  isBottomFloor;
  upButton;
  downButton;
  onRequest;
  requestQueue;
  activeRequests;
  isActive;
  activeDirection;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.isTopFloor = floorNumber === totalFloors - 1;
    this.isBottomFloor = floorNumber === 0;
    this.upButton = null;
    this.downButton = null;
    this.requestQueue = [];
    this.activeRequests = new Map;
    this.isActive = false;
    this.activeDirection = null;
  }
  createButtonElements() {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.setAttribute("data-floor", this.floorNumber.toString());
    const label = document.createElement("div");
    label.className = "floor-label";
    label.textContent = this.floorNumber.toString();
    floorDiv.appendChild(label);
    const buttonsContainer = document.createElement("div");
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.flexDirection = "column";
    buttonsContainer.style.gap = "4px";
    if (!this.isTopFloor) {
      const upBtn = document.createElement("button");
      upBtn.className = "floor-btn up";
      upBtn.textContent = "↑";
      upBtn.setAttribute("data-direction", "up");
      upBtn.setAttribute("data-floor", this.floorNumber.toString());
      upBtn.addEventListener("click", () => this.requestElevator("up" /* UP */));
      buttonsContainer.appendChild(upBtn);
      this.upButton = upBtn;
    }
    if (!this.isBottomFloor) {
      const downBtn = document.createElement("button");
      downBtn.className = "floor-btn down";
      downBtn.textContent = "↓";
      downBtn.setAttribute("data-direction", "down");
      downBtn.setAttribute("data-floor", this.floorNumber.toString());
      downBtn.addEventListener("click", () => this.requestElevator("down" /* DOWN */));
      buttonsContainer.appendChild(downBtn);
      this.downButton = downBtn;
    }
    floorDiv.appendChild(buttonsContainer);
    return {
      upBtn: this.upButton,
      downBtn: this.downButton
    };
  }
  requestElevator(direction) {
    const request = {
      floor: this.floorNumber,
      direction,
      timestamp: Date.now()
    };
    const requestKey = `${this.floorNumber}-${direction}`;
    if (!this.activeRequests.has(requestKey) && !this.requestQueue.find((r) => r.floor === this.floorNumber && r.direction === direction)) {
      this.requestQueue.push(request);
      this.activateButton(direction);
      if (this.onRequest) {
        this.onRequest(request);
      }
      this.logRequest(request);
    }
  }
  activateButton(direction) {
    const button = direction === "up" /* UP */ ? this.upButton : this.downButton;
    if (button) {
      button.classList.add("active");
      this.isActive = true;
      this.activeDirection = direction;
    }
  }
  deactivateButton(direction) {
    const button = direction === "up" /* UP */ ? this.upButton : this.downButton;
    if (button) {
      button.classList.remove("active");
    }
    const otherDirection = direction === "up" /* UP */ ? "down" /* DOWN */ : "up" /* UP */;
    const otherButton = otherDirection === "up" /* UP */ ? this.upButton : this.downButton;
    if (!otherButton || !otherButton.classList.contains("active")) {
      this.isActive = false;
      this.activeDirection = null;
    }
  }
  removeRequest(request) {
    const requestKey = `${request.floor}-${request.direction}`;
    this.activeRequests.delete(requestKey);
    this.deactivateButton(request.direction);
    this.requestQueue = this.requestQueue.filter((r) => !(r.floor === request.floor && r.direction === request.direction));
  }
  assignElevator(request, elevatorId) {
    const requestKey = `${request.floor}-${request.direction}`;
    this.activeRequests.set(requestKey, {
      elevatorId,
      assignedAt: Date.now()
    });
  }
  getPendingRequests() {
    return [...this.requestQueue];
  }
  hasActiveRequests() {
    return this.activeRequests.size > 0 || this.requestQueue.length > 0;
  }
  getActiveRequests() {
    return Array.from(this.activeRequests.values());
  }
  getRequestsForDirection(direction) {
    return this.requestQueue.filter((r) => r.direction === direction);
  }
  reset() {
    this.requestQueue = [];
    this.activeRequests.clear();
    this.isActive = false;
    this.activeDirection = null;
    if (this.upButton) {
      this.upButton.classList.remove("active");
    }
    if (this.downButton) {
      this.downButton.classList.remove("active");
    }
  }
  getInfo() {
    return {
      floorNumber: this.floorNumber,
      isActive: this.isActive,
      activeDirection: this.activeDirection,
      pendingRequests: this.requestQueue.length,
      activeRequests: this.activeRequests.size
    };
  }
  logRequest(request) {
    const directionText = request.direction === "up" /* UP */ ? "UP" : "DOWN";
    console.log(`Floor ${this.floorNumber}: Elevator requested going ${directionText}`);
  }
}

// Building.ts
class Building {
  config;
  elevators;
  floors;
  isRunning;
  elevatorRequests;
  onLogMessage;
  onStatusUpdate;
  requestQueue;
  assignmentInterval;
  constructor(config) {
    this.config = config;
    this.elevators = [];
    this.floors = [];
    this.isRunning = false;
    this.elevatorRequests = [];
    this.requestQueue = [];
    this.assignmentInterval = null;
  }
  initialize() {
    this.createElevators();
    this.createFloors();
    this.setupFloorCallbacks();
    this.log("Building initialized successfully", "success");
  }
  createElevators() {
    for (let i = 0;i < this.config.elevators; i++) {
      const elevator = new Elevator(i, 0, this.config.animationSpeed);
      this.setupElevatorCallbacks(elevator);
      this.elevators.push(elevator);
    }
    this.log(`Created ${this.config.elevators} elevators`, "info");
  }
  createFloors() {
    for (let i = 0;i < this.config.floors; i++) {
      const floor = new Floor(i, this.config.floors);
      this.floors.push(floor);
    }
    this.log(`Created ${this.config.floors} floors`, "info");
  }
  setupElevatorCallbacks(elevator) {
    elevator.onStatusChange = (elev) => {
      this.log(`Elevator ${elev.id}: Status changed to ${elev.status}`, "elevator");
      if (this.onStatusUpdate) {
        this.onStatusUpdate();
      }
    };
    elevator.onFloorChange = (elev, floor) => {
      this.log(`Elevator ${elev.id}: Moved to floor ${floor}`, "elevator");
      this.checkElevatorArrival(elev, floor);
    };
  }
  setupFloorCallbacks() {
    this.floors.forEach((floor) => {
      floor.onRequest = (request) => {
        this.handleFloorRequest(request);
      };
    });
  }
  handleFloorRequest(request) {
    this.elevatorRequests.push(request);
    this.requestQueue.push(request);
    const directionText = request.direction === "up" /* UP */ ? "UP" : "DOWN";
    this.log(`Floor ${request.floor}: Elevator requested going ${directionText}`, "request");
    this.attemptImmediateAssignment(request);
    if (this.onStatusUpdate) {
      this.onStatusUpdate();
    }
  }
  attemptImmediateAssignment(request) {
    const availableElevator = this.findBestElevator(request);
    if (availableElevator) {
      this.assignElevatorToRequest(availableElevator, request);
    }
  }
  findBestElevator(request) {
    const suitableElevators = this.elevators.filter((elevator) => elevator.canHandleRequest(request.floor, request.direction));
    if (suitableElevators.length === 0) {
      return null;
    }
    const idleElevators = suitableElevators.filter((e) => e.status === "idle" /* IDLE */);
    const busyElevators = suitableElevators.filter((e) => e.status !== "idle" /* IDLE */);
    let candidateElevators = idleElevators.length > 0 ? idleElevators : suitableElevators;
    candidateElevators.sort((a, b) => {
      const distanceA = a.getDistanceToFloor(request.floor);
      const distanceB = b.getDistanceToFloor(request.floor);
      return distanceA - distanceB;
    });
    if (candidateElevators.length > 1) {
      const minDistance = candidateElevators[0].getDistanceToFloor(request.floor);
      const closestElevators = candidateElevators.filter((e) => e.getDistanceToFloor(request.floor) === minDistance);
      if (closestElevators.length > 1) {
        closestElevators.sort((a, b) => a.getRequestCount() - b.getRequestCount());
        candidateElevators = closestElevators;
      }
    }
    return candidateElevators[0] || null;
  }
  assignElevatorToRequest(elevator, request) {
    this.requestQueue = this.requestQueue.filter((r) => !(r.floor === request.floor && r.direction === request.direction));
    elevator.addRequest(request);
    const floor = this.floors[request.floor];
    floor.assignElevator(request, elevator.id);
    if (elevator.status === "idle" /* IDLE */) {
      elevator.processNextRequest();
    }
    this.log(`Elevator ${elevator.id} assigned to floor ${request.floor} (${request.direction})`, "success");
  }
  checkElevatorArrival(elevator, floor) {
    const floorInstance = this.floors[floor];
    const activeRequests = floorInstance.getActiveRequests();
    activeRequests.forEach((requestInfo) => {
      if (requestInfo.elevatorId === elevator.id) {
        const request = {
          floor,
          direction: "up" /* UP */,
          timestamp: Date.now()
        };
        floorInstance.removeRequest(request);
        this.log(`Elevator ${elevator.id} arrived at floor ${floor}`, "success");
        if (this.onStatusUpdate) {
          this.onStatusUpdate();
        }
      }
    });
  }
  processRequestQueue() {
    if (this.requestQueue.length === 0)
      return;
    const requests = [...this.requestQueue];
    requests.forEach((request) => {
      const availableElevator = this.findBestElevator(request);
      if (availableElevator) {
        this.assignElevatorToRequest(availableElevator, request);
      }
    });
  }
  start() {
    if (this.isRunning)
      return;
    this.isRunning = true;
    this.log("Building simulation started", "success");
    this.assignmentInterval = setInterval(() => {
      if (this.isRunning) {
        this.processRequestQueue();
      }
    }, 1000);
    if (this.onStatusUpdate) {
      this.onStatusUpdate();
    }
  }
  stop() {
    if (!this.isRunning)
      return;
    this.isRunning = false;
    this.log("Building simulation stopped", "info");
    if (this.assignmentInterval) {
      clearInterval(this.assignmentInterval);
      this.assignmentInterval = null;
    }
    if (this.onStatusUpdate) {
      this.onStatusUpdate();
    }
  }
  reset() {
    this.stop();
    this.elevators.forEach((elevator) => {
      elevator.currentFloor = 0;
      elevator.direction = "idle" /* IDLE */;
      elevator.status = "idle" /* IDLE */;
      elevator.reset();
    });
    this.floors.forEach((floor) => {
      floor.reset();
    });
    this.elevatorRequests = [];
    this.requestQueue = [];
    this.log("Building reset to initial state", "info");
    if (this.onStatusUpdate) {
      this.onStatusUpdate();
    }
  }
  emergencyStop() {
    this.elevators.forEach((elevator) => {
      elevator.emergencyStop();
    });
    this.stop();
    this.log("Emergency stop activated - all elevators stopped", "error");
    if (this.onStatusUpdate) {
      this.onStatusUpdate();
    }
  }
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.log(`Configuration updated: ${JSON.stringify(this.config)}`, "info");
  }
  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      elevatorCount: this.elevators.length,
      floorCount: this.floors.length,
      pendingRequests: this.requestQueue.length,
      activeRequests: this.elevatorRequests.length - this.requestQueue.length,
      elevators: this.elevators.map((elev) => elev.getInfo()),
      floors: this.floors.map((floor) => floor.getInfo())
    };
  }
  log(message, type = "info") {
    console.log(`[${type.toUpperCase()}] ${message}`);
    if (this.onLogMessage) {
      this.onLogMessage(message, type);
    }
  }
  destroy() {
    this.stop();
    this.elevators = [];
    this.floors = [];
    this.elevatorRequests = [];
    this.requestQueue = [];
  }
}

// script.ts
var building = null;
var isInitialized = false;
var domElements = {
  startBtn: null,
  resetBtn: null,
  emergencyBtn: null,
  floorsInput: null,
  elevatorsInput: null,
  speedSelect: null,
  logContainer: null,
  floorControls: null,
  elevatorsContainer: null,
  building: null
};
async function initializeSimulator() {
  if (isInitialized)
    return;
  try {
    getDOMElements();
    setupEventListeners();
    const config = getCurrentConfig();
    building = new Building(config);
    setupBuildingCallbacks();
    await createUI();
    building.initialize();
    isInitialized = true;
    addLog("Elevator simulator initialized successfully", "success");
  } catch (error) {
    addLog(`Failed to initialize simulator: ${error}`, "error");
    console.error("Initialization error:", error);
  }
}
function getDOMElements() {
  domElements.startBtn = document.getElementById("startBtn");
  domElements.resetBtn = document.getElementById("resetBtn");
  domElements.emergencyBtn = document.getElementById("emergencyBtn");
  domElements.floorsInput = document.getElementById("floorsInput");
  domElements.elevatorsInput = document.getElementById("elevatorsInput");
  domElements.speedSelect = document.getElementById("speedSelect");
  domElements.logContainer = document.getElementById("log");
  domElements.floorControls = document.querySelector(".floor-controls");
  domElements.elevatorsContainer = document.querySelector(".elevators-container");
  domElements.building = document.getElementById("building");
}
function setupEventListeners() {
  if (!domElements.startBtn || !domElements.resetBtn || !domElements.emergencyBtn || !domElements.floorsInput || !domElements.elevatorsInput || !domElements.speedSelect) {
    throw new Error("Required DOM elements not found");
  }
  domElements.startBtn.addEventListener("click", toggleSimulation);
  domElements.resetBtn.addEventListener("click", resetSimulation);
  domElements.emergencyBtn.addEventListener("click", emergencyStop);
  domElements.floorsInput.addEventListener("change", updateBuildingConfig);
  domElements.elevatorsInput.addEventListener("change", updateBuildingConfig);
  domElements.speedSelect.addEventListener("change", updateBuildingConfig);
}
function setupBuildingCallbacks() {
  if (!building)
    return;
  building.onLogMessage = (message, type) => {
    addLog(message, type);
  };
  building.onStatusUpdate = () => {
    updateUI();
  };
}
async function createUI() {
  if (!building)
    throw new Error("Building not initialized");
  await createFloorControls();
  await createElevatorShaft();
}
async function createFloorControls() {
  if (!domElements.floorControls || !building)
    return;
  domElements.floorControls.innerHTML = "";
  for (let i = building.config.floors - 1;i >= 0; i--) {
    const floor = building.floors[i];
    const elements = floor.createButtonElements();
    if (i === building.config.floors - 1) {
      domElements.floorControls.insertBefore(elements.upBtn.closest(".floor"), domElements.floorControls.firstChild);
    } else {
      domElements.floorControls.appendChild(elements.upBtn.closest(".floor"));
    }
  }
}
async function createElevatorShaft() {
  if (!domElements.elevatorsContainer || !building)
    return;
  domElements.elevatorsContainer.innerHTML = "";
  for (let i = 0;i < building.config.elevators; i++) {
    const shaft = createElevatorShaftElement(i, building.config.floors);
    domElements.elevatorsContainer.appendChild(shaft);
  }
}
function createElevatorShaftElement(elevatorId, totalFloors) {
  const shaft = document.createElement("div");
  shaft.className = "elevator-shaft";
  shaft.setAttribute("data-elevator", elevatorId.toString());
  for (let i = 0;i < totalFloors; i++) {
    const floorSlot = document.createElement("div");
    floorSlot.className = "elevator-slot";
    floorSlot.setAttribute("data-floor", i.toString());
    shaft.appendChild(floorSlot);
  }
  return shaft;
}
function toggleSimulation() {
  if (!building)
    return;
  if (building.isRunning) {
    building.stop();
    if (domElements.startBtn) {
      domElements.startBtn.textContent = "Start Simulation";
      domElements.startBtn.className = "btn btn-primary";
    }
  } else {
    building.start();
    if (domElements.startBtn) {
      domElements.startBtn.textContent = "Stop Simulation";
      domElements.startBtn.className = "btn btn-danger";
    }
  }
}
function resetSimulation() {
  if (!building)
    return;
  building.reset();
  if (domElements.startBtn) {
    domElements.startBtn.textContent = "Start Simulation";
    domElements.startBtn.className = "btn btn-primary";
  }
  addLog("Simulation reset", "info");
  updateUI();
}
function emergencyStop() {
  if (!building)
    return;
  building.emergencyStop();
  if (domElements.startBtn) {
    domElements.startBtn.textContent = "Start Simulation";
    domElements.startBtn.className = "btn btn-primary";
  }
  addLog("EMERGENCY STOP ACTIVATED", "error");
}
function updateBuildingConfig() {
  if (!building)
    return;
  const newConfig = getCurrentConfig();
  if (building.isRunning) {
    building.stop();
  }
  building.updateConfig(newConfig);
  createUI();
  building.initialize();
  addLog(`Configuration updated - Floors: ${newConfig.floors}, Elevators: ${newConfig.elevators}, Speed: ${newConfig.animationSpeed}ms`, "info");
}
function getCurrentConfig() {
  const floors = parseInt(domElements.floorsInput?.value || "10", 10);
  const elevators = parseInt(domElements.elevatorsInput?.value || "4", 10);
  const animationSpeed = parseInt(domElements.speedSelect?.value || "500", 10);
  const validFloors = Math.max(3, Math.min(20, floors));
  const validElevators = Math.max(1, Math.min(8, elevators));
  return {
    floors: validFloors,
    elevators: validElevators,
    animationSpeed
  };
}
function updateUI() {
  if (!building)
    return;
  updateElevatorDisplays();
  updateControlStates();
}
function updateElevatorDisplays() {
  if (!building)
    return;
  building.elevators.forEach((elevator) => {
    updateElevatorDisplay(elevator);
  });
}
function updateElevatorDisplay(elevator) {
  const shaft = document.querySelector(`[data-elevator="${elevator.id}"]`);
  if (!shaft)
    return;
  let elevatorElement = shaft.querySelector(".elevator");
  if (!elevatorElement) {
    elevatorElement = document.createElement("div");
    elevatorElement.className = "elevator";
    shaft.appendChild(elevatorElement);
  }
  elevatorElement.className = `elevator ${elevator.status}`;
  elevatorElement.innerHTML = `
        <div class="elevator-cabin">
            <div class="elevator-number">E${elevator.id}</div>
            <div class="elevator-floor">${elevator.currentFloor}</div>
        </div>
    `;
  const floorSlots = shaft.querySelectorAll(".elevator-slot");
  const targetSlot = floorSlots[elevator.currentFloor];
  if (targetSlot) {
    targetSlot.appendChild(elevatorElement);
  }
  let statusIndicator = elevatorElement.querySelector(".elevator-status");
  if (!statusIndicator) {
    statusIndicator = document.createElement("div");
    statusIndicator.className = "elevator-status";
    elevatorElement.appendChild(statusIndicator);
  }
  const statusText = elevator.status === "idle" /* IDLE */ ? "IDLE" : elevator.status === "moving" /* MOVING */ ? "MOVING" : elevator.status === "busy" /* BUSY */ ? "BUSY" : "EMERGENCY";
  const directionText = elevator.direction !== "idle" /* IDLE */ ? ` ${elevator.direction.toUpperCase()}` : "";
  statusIndicator.textContent = `${statusText}${directionText}`;
}
function updateControlStates() {
  if (!building || !domElements.startBtn)
    return;
  if (building.isRunning) {
    domElements.startBtn.textContent = "Stop Simulation";
    domElements.startBtn.className = "btn btn-danger";
  } else {
    domElements.startBtn.textContent = "Start Simulation";
    domElements.startBtn.className = "btn btn-primary";
  }
}
function addLog(message, type = "info") {
  if (!domElements.logContainer)
    return;
  const logEntry = {
    message,
    type,
    timestamp: new Date
  };
  const logElement = document.createElement("div");
  logElement.className = `log-entry ${type}`;
  logElement.innerHTML = `
        <span class="log-time">${logEntry.timestamp.toLocaleTimeString()}</span>
        <span class="log-message">${message}</span>
    `;
  domElements.logContainer.appendChild(logElement);
  domElements.logContainer.scrollTop = domElements.logContainer.scrollHeight;
  const logEntries = domElements.logContainer.querySelectorAll(".log-entry");
  if (logEntries.length > 100) {
    logEntries[0].remove();
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initializeSimulator();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    addLog(`Application initialization failed: ${error}`, "error");
  }
});
