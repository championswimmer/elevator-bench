// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
class Elevator {
  id;
  currentFloor;
  state;
  direction;
  floorRequests;
  destinationRequests;
  doorOpen;
  movingToFloor;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.state = "IDLE" /* IDLE */;
    this.direction = "IDLE" /* IDLE */;
    this.floorRequests = new Set;
    this.destinationRequests = new Set;
    this.doorOpen = false;
    this.movingToFloor = null;
  }
  addFloorRequest(floor, direction) {
    this.floorRequests.add(floor);
    if (this.direction === "IDLE" /* IDLE */) {
      this.direction = floor > this.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    }
  }
  addDestinationRequest(floor) {
    this.destinationRequests.add(floor);
    if (this.direction === "IDLE" /* IDLE */) {
      this.direction = floor > this.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    }
  }
  getNextFloor() {
    if (this.direction === "UP" /* UP */) {
      const allRequests = [...this.floorRequests, ...this.destinationRequests].filter((floor) => floor > this.currentFloor);
      if (allRequests.length > 0) {
        return Math.min(...allRequests);
      }
    } else if (this.direction === "DOWN" /* DOWN */) {
      const allRequests = [...this.floorRequests, ...this.destinationRequests].filter((floor) => floor < this.currentFloor);
      if (allRequests.length > 0) {
        return Math.max(...allRequests);
      }
    }
    return null;
  }
  move() {
    if (this.state !== "MOVING" /* MOVING */)
      return;
    if (this.movingToFloor === null) {
      this.movingToFloor = this.getNextFloor();
      if (this.movingToFloor === null) {
        this.state = "IDLE" /* IDLE */;
        this.direction = "IDLE" /* IDLE */;
        return;
      }
    }
    if (this.currentFloor < this.movingToFloor) {
      this.currentFloor++;
      this.direction = "UP" /* UP */;
    } else if (this.currentFloor > this.movingToFloor) {
      this.currentFloor--;
      this.direction = "DOWN" /* DOWN */;
    }
    if (this.currentFloor === this.movingToFloor) {
      this.state = "DOOR_OPENING" /* DOOR_OPENING */;
      this.floorRequests.delete(this.currentFloor);
      this.destinationRequests.delete(this.currentFloor);
      this.movingToFloor = null;
    }
  }
  openDoor() {
    this.doorOpen = true;
    this.state = "DOOR_OPEN" /* DOOR_OPEN */;
  }
  closeDoor() {
    this.doorOpen = false;
    this.state = "IDLE" /* IDLE */;
    const nextFloor = this.getNextFloor();
    if (nextFloor !== null) {
      this.state = "MOVING" /* MOVING */;
      this.movingToFloor = nextFloor;
    } else {
      this.direction = "IDLE" /* IDLE */;
    }
  }
  isIdle() {
    return this.state === "IDLE" /* IDLE */;
  }
  isMoving() {
    return this.state === "MOVING" /* MOVING */;
  }
  isAtFloor(floor) {
    return this.currentFloor === floor;
  }
  isGoingUp() {
    return this.direction === "UP" /* UP */;
  }
  isGoingDown() {
    return this.direction === "DOWN" /* DOWN */;
  }
}

class ElevatorSimulator {
  elevators;
  floorRequests;
  animationId;
  constructor() {
    this.elevators = [];
    this.floorRequests = [];
    this.animationId = null;
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
    this.initUI();
  }
  initUI() {
    this.renderFloors();
    this.renderElevators();
    this.renderElevatorStatus();
    this.attachEventListeners();
  }
  renderFloors() {
    const floorsContainer = document.querySelector(".floors");
    if (!floorsContainer)
      return;
    floorsContainer.innerHTML = "";
    for (let i = NUM_FLOORS - 1;i >= 0; i--) {
      const floorElement = document.createElement("div");
      floorElement.className = "floor";
      floorElement.innerHTML = `
                <div class="floor-number">Floor ${i}</div>
                <div class="floor-buttons">
                    ${i < NUM_FLOORS - 1 ? `<button class="floor-button up" data-floor="${i}">↑</button>` : ""}
                    ${i > 0 ? `<button class="floor-button down" data-floor="${i}">↓</button>` : ""}
                </div>
            `;
      floorsContainer.appendChild(floorElement);
    }
  }
  renderElevators() {
    const elevatorsContainer = document.querySelector(".elevators");
    if (!elevatorsContainer)
      return;
    elevatorsContainer.innerHTML = "";
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      const elevatorElement = document.createElement("div");
      elevatorElement.className = "elevator";
      elevatorElement.innerHTML = `
                <div class="elevator-header">Elevator ${i}</div>
                <div class="elevator-content">
                    <div class="elevator-door" id="elevator-${i}-door">
                        ${this.elevators[i].doorOpen ? "DOOR OPEN" : "DOOR CLOSED"}
                    </div>
                </div>
                <div class="elevator-buttons">
                    ${Array.from({ length: NUM_FLOORS }, (_, j) => `<button class="elevator-button" data-elevator="${i}" data-floor="${j}">${j}</button>`).join("")}
                </div>
            `;
      elevatorsContainer.appendChild(elevatorElement);
    }
  }
  renderElevatorStatus() {
    const statusContainer = document.getElementById("elevator-status");
    if (!statusContainer)
      return;
    statusContainer.innerHTML = "";
    this.elevators.forEach((elevator) => {
      const statusElement = document.createElement("div");
      statusElement.className = "elevator-status-item";
      let directionClass = "";
      let directionText = "";
      switch (elevator.direction) {
        case "UP" /* UP */:
          directionClass = "moving-up";
          directionText = "Moving Up";
          break;
        case "DOWN" /* DOWN */:
          directionClass = "moving-down";
          directionText = "Moving Down";
          break;
        default:
          directionClass = "idle";
          directionText = "Idle";
      }
      statusElement.innerHTML = `
                <strong>Elevator ${elevator.id}:</strong> 
                <span class="${directionClass}">Floor ${elevator.currentFloor} - ${directionText}</span>
            `;
      statusContainer.appendChild(statusElement);
    });
  }
  attachEventListeners() {
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("floor-button")) {
        const floor = parseInt(target.getAttribute("data-floor") || "0");
        const direction = target.classList.contains("up") ? "UP" /* UP */ : "DOWN" /* DOWN */;
        this.requestElevator(floor, direction);
        const button = target;
        button.disabled = true;
        setTimeout(() => {
          button.disabled = false;
        }, 3000);
      }
      if (target.classList.contains("elevator-button")) {
        const elevatorId = parseInt(target.getAttribute("data-elevator") || "0");
        const floor = parseInt(target.getAttribute("data-floor") || "0");
        this.selectDestination(elevatorId, floor);
        target.classList.add("selected");
        const button = target;
        setTimeout(() => {
          target.classList.remove("selected");
        }, 3000);
      }
    });
    document.getElementById("start-btn")?.addEventListener("click", () => {
      this.startSimulation();
    });
    document.getElementById("reset-btn")?.addEventListener("click", () => {
      this.resetSimulation();
    });
  }
  findClosestElevator(floor, direction) {
    let closestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.isIdle() || direction === "UP" /* UP */ && elevator.isGoingUp() || direction === "DOWN" /* DOWN */ && elevator.isGoingDown()) {
        const distance = Math.abs(elevator.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          closestElevator = elevator;
        }
      }
    }
    return closestElevator;
  }
  requestElevator(floor, direction) {
    const closestElevator = this.findClosestElevator(floor, direction);
    if (closestElevator) {
      closestElevator.addFloorRequest(floor, direction);
      if (closestElevator.isIdle()) {
        closestElevator.state = "MOVING" /* MOVING */;
      }
    } else {
      this.floorRequests.push({ floor, direction });
    }
  }
  selectDestination(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    elevator.addDestinationRequest(floor);
    if (elevator.isIdle()) {
      elevator.state = "MOVING" /* MOVING */;
    }
  }
  processQueuedRequests() {
    if (this.floorRequests.length > 0) {
      const request = this.floorRequests[0];
      const closestElevator = this.findClosestElevator(request.floor, request.direction);
      if (closestElevator) {
        closestElevator.addFloorRequest(request.floor, request.direction);
        if (closestElevator.isIdle()) {
          closestElevator.state = "MOVING" /* MOVING */;
        }
        this.floorRequests.shift();
      }
    }
  }
  update() {
    this.elevators.forEach((elevator) => {
      if (elevator.isMoving()) {
        elevator.move();
      } else if (elevator.state === "DOOR_OPENING" /* DOOR_OPENING */) {
        elevator.openDoor();
      } else if (elevator.state === "DOOR_OPEN" /* DOOR_OPEN */) {
        setTimeout(() => {
          elevator.state = "DOOR_CLOSING" /* DOOR_CLOSING */;
        }, 2000);
      } else if (elevator.state === "DOOR_CLOSING" /* DOOR_CLOSING */) {
        elevator.closeDoor();
      }
    });
    this.processQueuedRequests();
    this.renderElevators();
    this.renderElevatorStatus();
  }
  startSimulation() {
    if (this.animationId)
      return;
    const animate = () => {
      this.update();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }
  stopSimulation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  resetSimulation() {
    this.stopSimulation();
    this.elevators = [];
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
    this.floorRequests = [];
    this.initUI();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const simulator = new ElevatorSimulator;
  window.simulator = simulator;
});
