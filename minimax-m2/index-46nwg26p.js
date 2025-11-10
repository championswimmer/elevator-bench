// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var ELEVATOR_SPEED = 2000;

class Elevator {
  id;
  currentFloor;
  targetFloor;
  state;
  direction;
  requests;
  isMoving;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.targetFloor = 0;
    this.state = "idle";
    this.direction = "idle";
    this.requests = [];
    this.isMoving = false;
  }
  addRequest(floor) {
    if (!this.requests.includes(floor)) {
      this.requests.push(floor);
      this.requests.sort((a, b) => {
        if (this.direction === "up") {
          return a - b;
        } else if (this.direction === "down") {
          return b - a;
        } else {
          return Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor);
        }
      });
    }
  }
  canAcceptRequest(floor) {
    if (this.state === "idle")
      return true;
    if (this.state === "moving") {
      if (this.direction === "up" && floor >= this.currentFloor)
        return true;
      if (this.direction === "down" && floor <= this.currentFloor)
        return true;
    }
    return false;
  }
  processNextRequest() {
    if (this.requests.length === 0) {
      this.state = "idle";
      this.direction = "idle";
      this.isMoving = false;
      return;
    }
    const nextFloor = this.requests[0];
    this.targetFloor = nextFloor;
    this.state = "moving";
    this.isMoving = true;
    if (nextFloor > this.currentFloor) {
      this.direction = "up";
    } else if (nextFloor < this.currentFloor) {
      this.direction = "down";
    }
    this.moveToFloor(nextFloor);
  }
  async moveToFloor(floor) {
    const floorsToMove = Math.abs(floor - this.currentFloor);
    const totalTime = floorsToMove * (ELEVATOR_SPEED / floorsToMove);
    this.log(`Elevator ${this.id} moving from floor ${this.currentFloor} to floor ${floor}`);
    const stepTime = totalTime / floorsToMove;
    for (let i = 1;i <= floorsToMove; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepTime));
      if (this.direction === "up") {
        this.currentFloor++;
      } else {
        this.currentFloor--;
      }
      this.updateDisplay();
    }
    this.requests.shift();
    this.state = "doors_open";
    this.updateDisplay();
    this.log(`Elevator ${this.id} arrived at floor ${this.currentFloor}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.state = "moving";
    if (this.requests.length > 0) {
      setTimeout(() => this.processNextRequest(), 500);
    } else {
      this.state = "idle";
      this.direction = "idle";
      this.isMoving = false;
      this.log(`Elevator ${this.id} is now idle`);
    }
    this.updateDisplay();
  }
  updateDisplay() {
    const elevatorElement = document.querySelector(`.elevator-${this.id}`);
    if (elevatorElement) {
      const display = elevatorElement.querySelector(".elevator-display");
      if (display) {
        display.textContent = `Floor: ${this.currentFloor}`;
      }
    }
  }
  log(message) {
    StatusLogger.log(`[Elevator ${this.id}] ${message}`);
  }
}

class ElevatorSystem {
  elevators;
  requestQueue;
  floorRequests;
  constructor() {
    this.elevators = [];
    this.requestQueue = [];
    this.floorRequests = new Map;
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
    for (let floor = 0;floor < NUM_FLOORS; floor++) {
      this.floorRequests.set(floor, new Set);
    }
  }
  requestElevator(floor, direction) {
    const existingRequest = this.requestQueue.find((req) => req.floor === floor && req.direction === direction);
    if (!existingRequest) {
      this.requestQueue.push({
        floor,
        direction,
        timestamp: Date.now()
      });
      this.floorRequests.get(floor)?.add(direction);
      this.updateFloorButtons();
      this.log(`Floor ${floor} requested elevator going ${direction}`);
      this.processRequestQueue();
    }
  }
  requestElevatorFromInside(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (elevator && !elevator.isMoving) {
      elevator.addRequest(floor);
      this.log(`Elevator ${elevatorId} internal request to floor ${floor}`);
      elevator.processNextRequest();
    }
  }
  processRequestQueue() {
    if (this.requestQueue.length === 0)
      return;
    const request = this.requestQueue[0];
    const suitableElevator = this.findBestElevator(request);
    if (suitableElevator) {
      suitableElevator.addRequest(request.floor);
      this.log(`Assigned elevator ${suitableElevator.id} to floor ${request.floor} going ${request.direction}`);
      this.requestQueue.shift();
      this.floorRequests.get(request.floor)?.delete(request.direction);
      if (this.floorRequests.get(request.floor)?.size === 0) {
        this.floorRequests.get(request.floor)?.clear();
      }
      this.updateFloorButtons();
      if (!suitableElevator.isMoving) {
        suitableElevator.processNextRequest();
      }
    } else {
      this.log("No suitable elevator found, request queued");
      setTimeout(() => this.processRequestQueue(), 1000);
    }
  }
  findBestElevator(request) {
    let bestElevator = null;
    let bestDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.canAcceptRequest(request.floor)) {
        const distance = Math.abs(elevator.currentFloor - request.floor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestElevator = elevator;
        }
      }
    }
    return bestElevator;
  }
  updateFloorButtons() {
    for (let floor = 0;floor < NUM_FLOORS; floor++) {
      const floorElement = document.querySelector(`.floor-${floor}`);
      if (floorElement) {
        const requests = this.floorRequests.get(floor);
        const upBtn = floorElement.querySelector(".up-btn");
        const downBtn = floorElement.querySelector(".down-btn");
        if (upBtn) {
          if (requests?.has("up")) {
            upBtn.classList.add("pressed");
          } else {
            upBtn.classList.remove("pressed");
          }
        }
        if (downBtn) {
          if (requests?.has("down")) {
            downBtn.classList.add("pressed");
          } else {
            downBtn.classList.remove("pressed");
          }
        }
      }
    }
  }
  log(message) {
    StatusLogger.log(message);
  }
}

class StatusLogger {
  static statusElement = null;
  static init() {
    this.statusElement = document.getElementById("status-log");
  }
  static log(message, isImportant = false) {
    if (this.statusElement) {
      const entry = document.createElement("div");
      entry.className = `status-entry${isImportant ? " important" : ""}`;
      entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
      this.statusElement.appendChild(entry);
      this.statusElement.scrollTop = this.statusElement.scrollHeight;
      while (this.statusElement.children.length > 50) {
        this.statusElement.removeChild(this.statusElement.firstChild);
      }
    }
  }
}
var elevatorSystem;
function initializeElevatorSystem() {
  StatusLogger.init();
  elevatorSystem = new ElevatorSystem;
  elevatorSystem.elevators.forEach((elevator) => {
    elevator.updateDisplay();
  });
  StatusLogger.log("Elevator system initialized", true);
  StatusLogger.log(`System ready with ${NUM_ELEVATORS} elevators and ${NUM_FLOORS} floors`, true);
}
function setupEventListeners() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target.classList.contains("up-btn") || target.classList.contains("down-btn")) {
      const floor = parseInt(target.dataset.floor);
      const direction = target.dataset.direction;
      elevatorSystem.requestElevator(floor, direction);
    }
    if (target.classList.contains("elevator-btn")) {
      const elevatorId = parseInt(target.dataset.elevator);
      const floor = parseInt(target.dataset.floor);
      elevatorSystem.requestElevatorFromInside(elevatorId, floor);
    }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  initializeElevatorSystem();
  setupEventListeners();
});
