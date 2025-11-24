// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  state;
  destinationFloors;
  element = null;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "IDLE" /* IDLE */;
    this.state = "IDLE" /* IDLE */;
    this.destinationFloors = new Set;
  }
  addDestination(floor) {
    this.destinationFloors.add(floor);
    if (this.state === "IDLE" /* IDLE */) {
      this.updateDirection();
    }
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
  }
  hasDestination(floor) {
    return this.destinationFloors.has(floor);
  }
  getNextFloor() {
    if (this.destinationFloors.size === 0) {
      return null;
    }
    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);
    if (this.direction === "UP" /* UP */) {
      const floorsAbove = destinations.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
      const floorsBelow = destinations.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
    } else if (this.direction === "DOWN" /* DOWN */) {
      const floorsBelow = destinations.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
      const floorsAbove = destinations.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
    } else {
      let nearestFloor = destinations[0];
      let minDistance = Math.abs(this.currentFloor - nearestFloor);
      for (const floor of destinations) {
        const distance = Math.abs(this.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          nearestFloor = floor;
        }
      }
      return nearestFloor;
    }
    return null;
  }
  updateDirection() {
    const nextFloor = this.getNextFloor();
    if (nextFloor === null) {
      this.direction = "IDLE" /* IDLE */;
      this.state = "IDLE" /* IDLE */;
    } else if (nextFloor > this.currentFloor) {
      this.direction = "UP" /* UP */;
    } else if (nextFloor < this.currentFloor) {
      this.direction = "DOWN" /* DOWN */;
    } else {
      this.direction = "IDLE" /* IDLE */;
    }
  }
  isMovingTowards(floor) {
    if (this.direction === "UP" /* UP */ && floor >= this.currentFloor) {
      return true;
    }
    if (this.direction === "DOWN" /* DOWN */ && floor <= this.currentFloor) {
      return true;
    }
    return false;
  }
  distanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  isIdle() {
    return this.state === "IDLE" /* IDLE */ && this.direction === "IDLE" /* IDLE */;
  }
  moveOneFloor() {
    if (this.direction === "UP" /* UP */) {
      this.currentFloor++;
    } else if (this.direction === "DOWN" /* DOWN */) {
      this.currentFloor--;
    }
    this.updateElement();
  }
  updateElement() {
    if (this.element) {
      const bottomOffset = this.currentFloor * 60 + 5;
      this.element.style.bottom = `${bottomOffset}px`;
      this.element.setAttribute("data-floor", this.currentFloor.toString());
    }
  }
  setElement(element) {
    this.element = element;
    this.updateElement();
  }
  openDoors() {
    this.state = "DOORS_OPEN" /* DOORS_OPEN */;
    if (this.element) {
      this.element.classList.add("doors-open");
    }
  }
  closeDoors() {
    this.state = this.destinationFloors.size > 0 ? "MOVING" /* MOVING */ : "IDLE" /* IDLE */;
    if (this.element) {
      this.element.classList.remove("doors-open");
    }
  }
}

// Floor.ts
class Floor {
  floorNumber;
  hasUpButton;
  hasDownButton;
  upButtonActive = false;
  downButtonActive = false;
  element = null;
  upButtonElement = null;
  downButtonElement = null;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.hasUpButton = floorNumber < totalFloors - 1;
    this.hasDownButton = floorNumber > 0;
  }
  pressUpButton() {
    if (!this.hasUpButton || this.upButtonActive) {
      return null;
    }
    this.upButtonActive = true;
    if (this.upButtonElement) {
      this.upButtonElement.classList.add("active");
    }
    return {
      floor: this.floorNumber,
      direction: "UP" /* UP */,
      timestamp: Date.now()
    };
  }
  pressDownButton() {
    if (!this.hasDownButton || this.downButtonActive) {
      return null;
    }
    this.downButtonActive = true;
    if (this.downButtonElement) {
      this.downButtonElement.classList.add("active");
    }
    return {
      floor: this.floorNumber,
      direction: "DOWN" /* DOWN */,
      timestamp: Date.now()
    };
  }
  clearUpButton() {
    this.upButtonActive = false;
    if (this.upButtonElement) {
      this.upButtonElement.classList.remove("active");
    }
  }
  clearDownButton() {
    this.downButtonActive = false;
    if (this.downButtonElement) {
      this.downButtonElement.classList.remove("active");
    }
  }
  setElements(floorElement, upButton, downButton) {
    this.element = floorElement;
    this.upButtonElement = upButton;
    this.downButtonElement = downButton;
  }
}

// Building.ts
var CONFIG = {
  TOTAL_FLOORS: 10,
  TOTAL_ELEVATORS: 4,
  FLOOR_TRAVEL_TIME: 800,
  DOOR_OPEN_TIME: 1500
};

class Building {
  floors;
  elevators;
  requestQueue;
  isRunning = false;
  buildingElement = null;
  constructor(totalFloors = CONFIG.TOTAL_FLOORS, totalElevators = CONFIG.TOTAL_ELEVATORS) {
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    for (let i = 0;i < totalFloors; i++) {
      this.floors.push(new Floor(i, totalFloors));
    }
    for (let i = 0;i < totalElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  requestElevator(floorNumber, direction) {
    const floor = this.floors[floorNumber];
    if (!floor)
      return;
    let request = null;
    if (direction === "UP" /* UP */) {
      request = floor.pressUpButton();
    } else if (direction === "DOWN" /* DOWN */) {
      request = floor.pressDownButton();
    }
    if (request) {
      this.assignElevator(request);
    }
  }
  selectFloor(elevatorId, floorNumber) {
    const elevator = this.elevators[elevatorId];
    if (!elevator || floorNumber < 0 || floorNumber >= this.floors.length)
      return;
    if (elevator.currentFloor === floorNumber && elevator.isIdle()) {
      return;
    }
    elevator.addDestination(floorNumber);
    const buttonElement = document.querySelector(`.elevator-panel[data-elevator="${elevatorId}"] .floor-btn[data-floor="${floorNumber}"]`);
    if (buttonElement) {
      buttonElement.classList.add("active");
    }
    if (elevator.state === "IDLE" /* IDLE */) {
      elevator.state = "MOVING" /* MOVING */;
      elevator.updateDirection();
    }
  }
  assignElevator(request) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      const score = this.calculateElevatorScore(elevator, request);
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }
    if (bestElevator && bestScore < Infinity) {
      bestElevator.addDestination(request.floor);
      if (bestElevator.state === "IDLE" /* IDLE */) {
        bestElevator.state = "MOVING" /* MOVING */;
        bestElevator.updateDirection();
      }
    } else {
      this.requestQueue.push(request);
    }
  }
  calculateElevatorScore(elevator, request) {
    const distance = elevator.distanceTo(request.floor);
    if (elevator.isIdle()) {
      return distance;
    }
    if (elevator.direction === request.direction) {
      if (request.direction === "UP" /* UP */ && elevator.currentFloor <= request.floor) {
        return distance;
      }
      if (request.direction === "DOWN" /* DOWN */ && elevator.currentFloor >= request.floor) {
        return distance;
      }
    }
    if (elevator.direction === "UP" /* UP */ && request.direction === "DOWN" /* DOWN */) {
      if (elevator.currentFloor < request.floor) {
        const maxDest = Math.max(...Array.from(elevator.destinationFloors), elevator.currentFloor);
        return maxDest - elevator.currentFloor + (maxDest - request.floor) + 100;
      }
    }
    if (elevator.direction === "DOWN" /* DOWN */ && request.direction === "UP" /* UP */) {
      if (elevator.currentFloor > request.floor) {
        const minDest = Math.min(...Array.from(elevator.destinationFloors), elevator.currentFloor);
        return elevator.currentFloor - minDest + (request.floor - minDest) + 100;
      }
    }
    return distance + 200;
  }
  processQueue() {
    const pendingRequests = [];
    for (const request of this.requestQueue) {
      let assigned = false;
      for (const elevator of this.elevators) {
        if (elevator.isIdle()) {
          elevator.addDestination(request.floor);
          elevator.state = "MOVING" /* MOVING */;
          elevator.updateDirection();
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        pendingRequests.push(request);
      }
    }
    this.requestQueue = pendingRequests;
  }
  onElevatorArrival(elevator) {
    const floor = this.floors[elevator.currentFloor];
    const wasDestination = elevator.hasDestination(elevator.currentFloor);
    const shouldPickUp = this.shouldPickUpPassengers(elevator, floor);
    if (wasDestination || shouldPickUp) {
      elevator.removeDestination(elevator.currentFloor);
      elevator.openDoors();
      if (elevator.direction === "UP" /* UP */ || elevator.isIdle()) {
        floor.clearUpButton();
      }
      if (elevator.direction === "DOWN" /* DOWN */ || elevator.isIdle()) {
        floor.clearDownButton();
      }
      const buttonElement = document.querySelector(`.elevator-panel[data-elevator="${elevator.id}"] .floor-btn[data-floor="${elevator.currentFloor}"]`);
      if (buttonElement) {
        buttonElement.classList.remove("active");
      }
      setTimeout(() => {
        elevator.closeDoors();
        elevator.updateDirection();
        this.processQueue();
      }, CONFIG.DOOR_OPEN_TIME);
    }
  }
  shouldPickUpPassengers(elevator, floor) {
    if (elevator.direction === "UP" /* UP */ && floor.upButtonActive) {
      return true;
    }
    if (elevator.direction === "DOWN" /* DOWN */ && floor.downButtonActive) {
      return true;
    }
    if (elevator.direction === "IDLE" /* IDLE */ && (floor.upButtonActive || floor.downButtonActive)) {
      return true;
    }
    return false;
  }
  async runSimulation() {
    if (this.isRunning)
      return;
    this.isRunning = true;
    const tick = async () => {
      if (!this.isRunning)
        return;
      for (const elevator of this.elevators) {
        if (elevator.state === "MOVING" /* MOVING */ && elevator.direction !== "IDLE" /* IDLE */) {
          const nextFloor = elevator.getNextFloor();
          if (nextFloor !== null) {
            if (nextFloor > elevator.currentFloor) {
              elevator.direction = "UP" /* UP */;
              elevator.moveOneFloor();
            } else if (nextFloor < elevator.currentFloor) {
              elevator.direction = "DOWN" /* DOWN */;
              elevator.moveOneFloor();
            }
            if (elevator.hasDestination(elevator.currentFloor) || this.shouldPickUpPassengers(elevator, this.floors[elevator.currentFloor])) {
              this.onElevatorArrival(elevator);
            }
          } else {
            elevator.direction = "IDLE" /* IDLE */;
            elevator.state = "IDLE" /* IDLE */;
          }
        } else if (elevator.state === "IDLE" /* IDLE */ && elevator.destinationFloors.size > 0) {
          elevator.state = "MOVING" /* MOVING */;
          elevator.updateDirection();
        }
      }
      setTimeout(tick, CONFIG.FLOOR_TRAVEL_TIME);
    };
    tick();
  }
  stopSimulation() {
    this.isRunning = false;
  }
  initializeUI(container) {
    this.buildingElement = container;
    const buildingHTML = this.createBuildingHTML();
    container.innerHTML = buildingHTML;
    this.setupElementReferences();
    this.setupEventListeners();
  }
  createBuildingHTML() {
    let html = '<div class="building">';
    html += '<div class="elevator-shaft-area">';
    html += '<div class="floors-container">';
    for (let i = this.floors.length - 1;i >= 0; i--) {
      const floor = this.floors[i];
      html += `<div class="floor" data-floor="${i}">`;
      html += `<div class="floor-number">Floor ${i}</div>`;
      html += '<div class="floor-buttons">';
      if (floor.hasUpButton) {
        html += `<button class="call-btn up-btn" data-floor="${i}" data-direction="up">▲</button>`;
      }
      if (floor.hasDownButton) {
        html += `<button class="call-btn down-btn" data-floor="${i}" data-direction="down">▼</button>`;
      }
      html += "</div>";
      html += '<div class="floor-line"></div>';
      html += "</div>";
    }
    html += "</div>";
    html += '<div class="elevator-shafts">';
    for (let i = 0;i < this.elevators.length; i++) {
      html += `<div class="elevator-shaft" data-elevator="${i}">`;
      html += `<div class="elevator" data-elevator="${i}">`;
      html += `<div class="elevator-number">${i}</div>`;
      html += '<div class="elevator-doors"></div>';
      html += "</div>";
      html += "</div>";
    }
    html += "</div>";
    html += "</div>";
    html += '<div class="elevator-panels">';
    for (let i = 0;i < this.elevators.length; i++) {
      html += `<div class="elevator-panel" data-elevator="${i}">`;
      html += `<div class="panel-title">Elevator ${i}</div>`;
      html += '<div class="panel-buttons">';
      for (let j = this.floors.length - 1;j >= 0; j--) {
        html += `<button class="floor-btn" data-elevator="${i}" data-floor="${j}">${j}</button>`;
      }
      html += "</div>";
      html += "</div>";
    }
    html += "</div>";
    html += "</div>";
    return html;
  }
  setupElementReferences() {
    for (const floor of this.floors) {
      const floorElement = document.querySelector(`.floor[data-floor="${floor.floorNumber}"]`);
      const upButton = document.querySelector(`.up-btn[data-floor="${floor.floorNumber}"]`);
      const downButton = document.querySelector(`.down-btn[data-floor="${floor.floorNumber}"]`);
      floor.setElements(floorElement, upButton, downButton);
    }
    for (const elevator of this.elevators) {
      const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevator.id}"]`);
      elevator.setElement(elevatorElement);
    }
  }
  setupEventListeners() {
    document.querySelectorAll(".call-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const floor = parseInt(target.dataset.floor || "0");
        const direction = target.dataset.direction === "up" ? "UP" /* UP */ : "DOWN" /* DOWN */;
        this.requestElevator(floor, direction);
      });
    });
    document.querySelectorAll(".floor-btn").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const elevatorId = parseInt(target.dataset.elevator || "0");
        const floor = parseInt(target.dataset.floor || "0");
        this.selectFloor(elevatorId, floor);
      });
    });
  }
}

// script.ts
class ElevatorSimulator {
  building;
  constructor() {
    this.building = new Building(CONFIG.TOTAL_FLOORS, CONFIG.TOTAL_ELEVATORS);
  }
  initialize() {
    const container = document.getElementById("simulator-container");
    if (!container) {
      console.error("Simulator container not found");
      return;
    }
    this.building.initializeUI(container);
    this.building.runSimulation();
    console.log("Elevator Simulator initialized");
    console.log(`Floors: ${CONFIG.TOTAL_FLOORS}, Elevators: ${CONFIG.TOTAL_ELEVATORS}`);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const simulator = new ElevatorSimulator;
  simulator.initialize();
});
