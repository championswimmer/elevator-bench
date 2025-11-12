// Floor.ts
class Floor {
  floorNumber;
  upButton;
  downButton;
  upRequests;
  downRequests;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
    this.upButton = false;
    this.downButton = false;
    this.upRequests = [];
    this.downRequests = [];
  }
  requestUp() {
    this.upButton = true;
    const existingRequest = this.upRequests.find((req) => req.floor === this.floorNumber);
    if (!existingRequest) {
      this.upRequests.push({
        floor: this.floorNumber,
        direction: "up",
        timestamp: Date.now()
      });
    }
  }
  requestDown() {
    this.downButton = true;
    const existingRequest = this.downRequests.find((req) => req.floor === this.floorNumber);
    if (!existingRequest) {
      this.downRequests.push({
        floor: this.floorNumber,
        direction: "down",
        timestamp: Date.now()
      });
    }
  }
  hasUpRequest() {
    return this.upRequests.length > 0;
  }
  hasDownRequest() {
    return this.downRequests.length > 0;
  }
  hasAnyRequest() {
    return this.hasUpRequest() || this.hasDownRequest();
  }
  clearRequest(direction) {
    if (direction === "up") {
      this.upRequests = this.upRequests.filter((req) => req.floor !== this.floorNumber);
      if (this.upRequests.length === 0) {
        this.upButton = false;
      }
    } else if (direction === "down") {
      this.downRequests = this.downRequests.filter((req) => req.floor !== this.floorNumber);
      if (this.downRequests.length === 0) {
        this.downButton = false;
      }
    }
  }
  clearAllRequests() {
    this.upRequests = [];
    this.downRequests = [];
    this.upButton = false;
    this.downButton = false;
  }
  getNextRequest() {
    let nextRequest = null;
    if (this.upRequests.length > 0 && this.downRequests.length > 0) {
      const oldestUp = this.upRequests[0];
      const oldestDown = this.downRequests[0];
      nextRequest = oldestUp.timestamp <= oldestDown.timestamp ? oldestUp : oldestDown;
    } else if (this.upRequests.length > 0) {
      nextRequest = this.upRequests[0];
    } else if (this.downRequests.length > 0) {
      nextRequest = this.downRequests[0];
    }
    return nextRequest;
  }
  getRequestsByDirection(direction) {
    return direction === "up" ? [...this.upRequests] : [...this.downRequests];
  }
  getState() {
    return {
      floorNumber: this.floorNumber,
      upButton: this.upButton,
      downButton: this.downButton,
      upRequests: [...this.upRequests],
      downRequests: [...this.downRequests]
    };
  }
}

// Elevator.ts
class Elevator {
  id;
  currentFloor;
  targetFloor;
  direction;
  isMoving;
  isIdle;
  requests;
  passengers;
  speed;
  floorHeight;
  position;
  constructor(id, startingFloor = 1) {
    this.id = id;
    this.currentFloor = startingFloor;
    this.targetFloor = startingFloor;
    this.direction = "idle";
    this.isMoving = false;
    this.isIdle = true;
    this.requests = [];
    this.passengers = [];
    this.speed = 2;
    this.floorHeight = 100;
    this.position = startingFloor * this.floorHeight;
  }
  move() {
    if (!this.isMoving || this.direction === "idle") {
      return;
    }
    const targetPosition = this.targetFloor * this.floorHeight;
    const currentPosition = this.position;
    if (Math.abs(targetPosition - currentPosition) < 1) {
      this.stop();
      return;
    }
    const moveDirection = this.direction === "up" ? 1 : -1;
    this.position += moveDirection * this.speed * 2;
    const newFloor = Math.round(this.position / this.floorHeight);
    if (newFloor !== this.currentFloor) {
      this.currentFloor = newFloor;
    }
  }
  stop() {
    this.isMoving = false;
    this.isIdle = true;
    this.direction = "idle";
    this.position = this.targetFloor * this.floorHeight;
    this.currentFloor = this.targetFloor;
    this.requests = this.requests.filter((request) => request.floor !== this.currentFloor);
    this.passengers = this.passengers.filter((passenger) => passenger.targetFloor !== this.currentFloor);
  }
  addRequest(floor, direction) {
    const existingRequest = this.requests.find((req) => req.floor === floor && req.direction === direction);
    if (!existingRequest) {
      this.requests.push({
        floor,
        direction,
        timestamp: Date.now()
      });
      this.sortRequests();
    }
  }
  sortRequests() {
    this.requests.sort((a, b) => {
      if (a.direction !== b.direction) {
        return a.direction === this.direction ? -1 : 1;
      }
      if (this.direction === "up") {
        return a.floor - b.floor;
      } else {
        return b.floor - a.floor;
      }
    });
  }
  processRequests() {
    if (this.requests.length === 0) {
      this.isMoving = false;
      this.isIdle = true;
      this.direction = "idle";
      return;
    }
    const nextRequest = this.requests[0];
    if (nextRequest.floor === this.currentFloor) {
      this.stop();
      return;
    }
    this.direction = nextRequest.floor > this.currentFloor ? "up" : "down";
    this.targetFloor = nextRequest.floor;
    this.isMoving = true;
    this.isIdle = false;
  }
  getDistanceToFloor(floor) {
    return Math.abs(floor - this.currentFloor);
  }
  canServeRequest(floor, direction) {
    if (this.isIdle) {
      return true;
    }
    if (this.direction === direction) {
      if (direction === "up" && floor >= this.currentFloor) {
        return true;
      }
      if (direction === "down" && floor <= this.currentFloor) {
        return true;
      }
    }
    return false;
  }
  addPassenger(passenger) {
    this.passengers.push(passenger);
  }
  getPosition() {
    return this.position;
  }
  getState() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      direction: this.direction,
      isMoving: this.isMoving,
      isIdle: this.isIdle,
      requests: [...this.requests],
      passengers: [...this.passengers]
    };
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  totalFloors;
  totalElevators;
  constructor(totalFloors, totalElevators) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.initializeBuilding();
  }
  initializeBuilding() {
    for (let i = 0;i < this.totalFloors; i++) {
      this.floors.push(new Floor(i));
    }
    for (let i = 0;i < this.totalElevators; i++) {
      this.elevators.push(new Elevator(i, 0));
    }
  }
  findBestElevator(floor, direction) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      let score = Infinity;
      if (elevator.isIdle) {
        score = elevator.getDistanceToFloor(floor);
      } else if (elevator.canServeRequest(floor, direction)) {
        const distance = elevator.getDistanceToFloor(floor);
        const loadFactor = elevator.requests.length + elevator.passengers.length;
        score = distance + loadFactor * 0.5;
      }
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }
    return bestElevator;
  }
  processRequests() {
    for (const floor of this.floors) {
      if (floor.hasAnyRequest()) {
        const nextRequest = floor.getNextRequest();
        if (nextRequest) {
          const bestElevator = this.findBestElevator(nextRequest.floor, nextRequest.direction);
          if (bestElevator) {
            bestElevator.addRequest(nextRequest.floor, nextRequest.direction);
            floor.clearRequest(nextRequest.direction);
          }
        }
      }
    }
    for (const elevator of this.elevators) {
      elevator.processRequests();
      elevator.move();
    }
  }
  getFloorRequests() {
    const requests = [];
    for (const floor of this.floors) {
      if (floor.hasUpRequest()) {
        requests.push({ floor: floor.floorNumber, direction: "up" });
      }
      if (floor.hasDownRequest()) {
        requests.push({ floor: floor.floorNumber, direction: "down" });
      }
    }
    return requests;
  }
  requestElevator(floor, direction) {
    if (floor < 0 || floor >= this.totalFloors) {
      return false;
    }
    const floorObj = this.floors[floor];
    if (direction === "up") {
      floorObj.requestUp();
    } else {
      floorObj.requestDown();
    }
    return true;
  }
  getElevatorRequests(floor) {
    const requests = [];
    for (const elevator of this.elevators) {
      requests.push(...elevator.requests.filter((req) => req.floor === floor));
    }
    return requests;
  }
  getElevatorById(id) {
    return this.elevators.find((elevator) => elevator.id === id) || null;
  }
  getFloorByNumber(floorNumber) {
    return this.floors.find((floor) => floor.floorNumber === floorNumber) || null;
  }
  getBuildingState() {
    return {
      floors: this.floors.map((floor) => floor.getState()),
      elevators: this.elevators.map((elevator) => elevator.getState()),
      totalFloors: this.totalFloors,
      totalElevators: this.totalElevators
    };
  }
  canAnyElevatorServeRequest(floor, direction) {
    return this.elevators.some((elevator) => elevator.canServeRequest(floor, direction) || elevator.isIdle);
  }
  getAllPendingRequests() {
    const allRequests = [];
    for (const floor of this.floors) {
      allRequests.push(...floor.upRequests);
      allRequests.push(...floor.downRequests);
    }
    return allRequests;
  }
  getElevatorMetrics() {
    const metrics = this.elevators.map((elevator) => ({
      id: elevator.id,
      isIdle: elevator.isIdle,
      currentFloor: elevator.currentFloor,
      direction: elevator.direction,
      requestCount: elevator.requests.length,
      passengerCount: elevator.passengers.length,
      distanceToTarget: elevator.isMoving ? Math.abs(elevator.targetFloor - elevator.currentFloor) : 0
    }));
    return metrics;
  }
}

// script.ts
class ElevatorSimulator {
  building;
  isRunning = false;
  animationFrame = null;
  lastUpdateTime = 0;
  updateInterval = 16;
  constructor() {
    this.building = new Building(10, 4);
  }
  initialize() {
    console.log("Elevator Simulator initialized");
    console.log(`Building: ${this.building.totalFloors} floors, ${this.building.totalElevators} elevators`);
    this.setupDOMEventListeners();
    this.setupFloorButtonListeners();
    this.setupElevatorButtonListeners();
    this.initializeUI();
    this.start();
  }
  setupDOMEventListeners() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.attachEventListeners();
      });
    } else {
      this.attachEventListeners();
    }
  }
  attachEventListeners() {
    console.log("Attaching DOM event listeners...");
    document.querySelectorAll(".floor-button-up").forEach((button) => {
      button.addEventListener("click", (e) => {
        const floorElement = e.target.closest(".floor");
        if (floorElement) {
          const floorNumber = parseInt(floorElement.getAttribute("data-floor") || "0");
          this.handleFloorButtonPress(floorNumber, "up");
        }
      });
    });
    document.querySelectorAll(".floor-button-down").forEach((button) => {
      button.addEventListener("click", (e) => {
        const floorElement = e.target.closest(".floor");
        if (floorElement) {
          const floorNumber = parseInt(floorElement.getAttribute("data-floor") || "0");
          this.handleFloorButtonPress(floorNumber, "down");
        }
      });
    });
    document.querySelectorAll(".elevator-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const elevatorElement = e.target.closest(".elevator");
        const elevatorId = parseInt(elevatorElement?.getAttribute("data-elevator") || "0");
        const targetFloor = parseInt(e.target.getAttribute("data-floor") || "0");
        this.handleElevatorButtonPress(elevatorId, targetFloor);
      });
    });
    window.addEventListener("simulationUpdate", (event) => {
      const customEvent = event;
      this.updateVisualState(customEvent.detail);
    });
    console.log("DOM event listeners attached successfully");
  }
  setupFloorButtonListeners() {
    window.addEventListener("floorButtonPressed", (event) => {
      const customEvent = event;
      const { floor, direction } = customEvent.detail;
      this.handleFloorButtonPress(floor, direction);
    });
  }
  setupElevatorButtonListeners() {
    window.addEventListener("elevatorButtonPressed", (event) => {
      const customEvent = event;
      const { elevatorId, floor } = customEvent.detail;
      this.handleElevatorButtonPress(elevatorId, floor);
    });
  }
  initializeUI() {
    console.log("Initializing UI state...");
    for (let i = 0;i < this.building.totalElevators; i++) {
      const elevator = this.building.getElevatorById(i);
      if (elevator) {
        this.updateElevatorPosition(i, elevator.currentFloor);
      }
    }
    this.updateAllButtonStates();
    console.log("UI state initialized");
  }
  handleFloorButtonPress(floor, direction) {
    const success = this.building.requestElevator(floor, direction);
    if (success) {
      console.log(`Floor ${floor} ${direction} button pressed`);
      this.updateUI();
      this.updateFloorButtonState(floor, direction, true);
    }
    return success;
  }
  handleElevatorButtonPress(elevatorId, targetFloor) {
    const elevator = this.building.getElevatorById(elevatorId);
    if (!elevator) {
      console.error(`Elevator ${elevatorId} not found`);
      return false;
    }
    if (targetFloor < 0 || targetFloor >= this.building.totalFloors) {
      console.error(`Invalid floor number: ${targetFloor}`);
      return false;
    }
    const direction = targetFloor > elevator.currentFloor ? "up" : "down";
    elevator.addRequest(targetFloor, direction);
    const passenger = {
      id: `passenger_${Date.now()}_${Math.random()}`,
      currentFloor: elevator.currentFloor,
      targetFloor,
      direction
    };
    elevator.addPassenger(passenger);
    console.log(`Elevator ${elevatorId} requested to floor ${targetFloor}`);
    this.updateUI();
    this.updateElevatorButtonState(elevatorId, targetFloor, true);
    return true;
  }
  updateElevatorPosition(elevatorId, floor) {
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    if (elevatorElement) {
      const floorHeight = 120;
      const bottomPosition = floor * floorHeight;
      elevatorElement.style.bottom = `${bottomPosition}px`;
      elevatorElement.classList.add("moving");
      setTimeout(() => {
        elevatorElement.classList.remove("moving");
      }, 500);
    }
  }
  updateFloorButtonState(floor, direction, isActive) {
    const floorElement = document.querySelector(`.floor[data-floor="${floor}"]`);
    if (floorElement) {
      const buttonClass = direction === "up" ? ".floor-button-up" : ".floor-button-down";
      const button = floorElement.querySelector(buttonClass);
      if (button) {
        if (isActive) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    }
  }
  updateElevatorButtonState(elevatorId, floor, isActive) {
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    if (elevatorElement) {
      const button = elevatorElement.querySelector(`.elevator-button[data-floor="${floor}"]`);
      if (button) {
        if (isActive) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    }
  }
  updateAllButtonStates() {
    const state = this.getCurrentState();
    state.floors.forEach((floorState) => {
      this.updateFloorButtonState(floorState.floorNumber, "up", floorState.upButton);
      this.updateFloorButtonState(floorState.floorNumber, "down", floorState.downButton);
    });
    state.elevators.forEach((elevatorState) => {
      elevatorState.requests.forEach((request) => {
        this.updateElevatorButtonState(elevatorState.id, request.floor, true);
      });
    });
  }
  updateVisualState(state) {
    state.elevators.forEach((elevatorState) => {
      this.updateElevatorPosition(elevatorState.id, elevatorState.currentFloor);
    });
    this.updateAllButtonStates();
  }
  start() {
    if (this.isRunning)
      return;
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    const gameLoop = (currentTime) => {
      if (!this.isRunning)
        return;
      const deltaTime = currentTime - this.lastUpdateTime;
      if (deltaTime >= this.updateInterval) {
        this.update(deltaTime);
        this.lastUpdateTime = currentTime;
      }
      this.animationFrame = requestAnimationFrame(gameLoop);
    };
    this.animationFrame = requestAnimationFrame(gameLoop);
    console.log("Elevator simulation started");
  }
  stop() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    console.log("Elevator simulation stopped");
  }
  update(deltaTime) {
    this.building.processRequests();
    this.updateUI();
  }
  updateUI() {
    const event = new CustomEvent("simulationUpdate", {
      detail: this.getCurrentState()
    });
    window.dispatchEvent(event);
  }
  getCurrentState() {
    return this.building.getBuildingState();
  }
  getElevatorMetrics() {
    return this.building.getElevatorMetrics();
  }
  getPendingRequests() {
    return this.building.getAllPendingRequests();
  }
  moveElevatorToFloor(elevatorId, targetFloor) {
    const elevator = this.building.getElevatorById(elevatorId);
    if (!elevator)
      return false;
    const direction = targetFloor > elevator.currentFloor ? "up" : "down";
    elevator.addRequest(targetFloor, direction);
    return true;
  }
  getElevatorById(id) {
    return this.building.getElevatorById(id);
  }
  getFloorByNumber(floorNumber) {
    return this.building.getFloorByNumber(floorNumber);
  }
  reset() {
    this.stop();
    this.building = new Building(10, 4);
    this.start();
    console.log("Simulation reset");
  }
  getBuilding() {
    return this.building;
  }
}
var simulator = new ElevatorSimulator;
window.elevatorSimulator = simulator;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    simulator.initialize();
  });
} else {
  simulator.initialize();
}
