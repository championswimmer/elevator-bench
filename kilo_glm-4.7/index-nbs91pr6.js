// Floor.ts
class Floor {
  floorNumber;
  upButton;
  downButton;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
    this.upButton = false;
    this.downButton = false;
  }
  requestUp() {
    if (this.floorNumber > 0) {
      this.upButton = true;
    }
  }
  requestDown() {
    if (this.floorNumber < 9) {
      this.downButton = true;
    }
  }
  resetButtons() {
    this.upButton = false;
    this.downButton = false;
  }
}

// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  destinationFloors;
  state;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle";
    this.destinationFloors = new Set;
    this.state = "idle";
  }
  moveToFloor(floor) {
    this.addDestination(floor);
  }
  addDestination(floor) {
    this.destinationFloors.add(floor);
    if (this.state === "idle") {
      this.state = "moving";
      this.direction = floor > this.currentFloor ? "up" : "down";
    }
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
    if (this.destinationFloors.size === 0) {
      this.state = "idle";
      this.direction = "idle";
    }
  }
  getNextDestination() {
    if (this.direction === "up") {
      const candidates = Array.from(this.destinationFloors).filter((f) => f > this.currentFloor);
      return candidates.length > 0 ? Math.min(...candidates) : null;
    } else if (this.direction === "down") {
      const candidates = Array.from(this.destinationFloors).filter((f) => f < this.currentFloor);
      return candidates.length > 0 ? Math.max(...candidates) : null;
    }
    return null;
  }
  shouldStopAtFloor(floor) {
    return this.destinationFloors.has(floor);
  }
  updatePosition() {
    if (this.state === "moving") {
      const next = this.getNextDestination();
      if (next !== null) {
        const speed = 0.1;
        if (next > this.currentFloor) {
          this.currentFloor = Math.min(this.currentFloor + speed, next);
          if (this.currentFloor >= next) {
            this.currentFloor = next;
            this.state = "doors_open";
          }
        } else if (next < this.currentFloor) {
          this.currentFloor = Math.max(this.currentFloor - speed, next);
          if (this.currentFloor <= next) {
            this.currentFloor = next;
            this.state = "doors_open";
          }
        }
      } else {
        const oppositeDirection = this.direction === "up" ? "down" : "up";
        const candidates = Array.from(this.destinationFloors).filter((f) => oppositeDirection === "up" ? f > this.currentFloor : f < this.currentFloor);
        if (candidates.length > 0) {
          this.direction = oppositeDirection;
        } else {
          this.state = "idle";
          this.direction = "idle";
        }
      }
    }
  }
}

// Building.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
class Building {
  floors;
  elevators;
  requestQueue;
  constructor() {
    this.floors = Array.from({ length: NUM_FLOORS }, (_, i) => new Floor(i));
    this.elevators = Array.from({ length: NUM_ELEVATORS }, (_, i) => new Elevator(i));
    this.requestQueue = [];
  }
  requestElevator(floor, direction) {
    this.requestQueue.push({ floor, direction });
  }
  assignElevatorToRequest(floor, direction) {
    const elevator = this.findClosestIdleElevator(floor, direction);
    if (elevator) {
      elevator.addDestination(floor);
      return elevator;
    }
    return null;
  }
  findClosestIdleElevator(floor, direction) {
    const idleElevators = this.elevators.filter((e) => e.state === "idle");
    if (idleElevators.length === 0)
      return null;
    let closest = idleElevators[0];
    let minDistance = Math.abs(closest.currentFloor - floor);
    for (const elevator of idleElevators) {
      const distance = Math.abs(elevator.currentFloor - floor);
      if (distance < minDistance) {
        minDistance = distance;
        closest = elevator;
      }
    }
    return closest;
  }
  processQueue() {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    for (const request of queue) {
      const assigned = this.assignElevatorToRequest(request.floor, request.direction);
      if (!assigned) {
        this.requestQueue.push(request);
      }
    }
  }
  update() {
    this.processQueue();
    for (const elevator of this.elevators) {
      elevator.updatePosition();
    }
  }
}

// script.ts
var building;
var lastTime = 0;
var animationFrameId;
function init() {
  building = new Building;
  createFloorElements();
  createElevatorElements();
  setupEventListeners();
  animate(0);
}
function createFloorElements() {
  const buildingContainer = document.getElementById("building");
  if (!buildingContainer)
    return;
  for (let floorNum = NUM_FLOORS - 1;floorNum >= 0; floorNum--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.setAttribute("data-floor", floorNum.toString());
    const floorLabel = document.createElement("span");
    floorLabel.textContent = `Floor ${floorNum}`;
    floorDiv.appendChild(floorLabel);
    if (floorNum < NUM_FLOORS - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-button up";
      upButton.textContent = "↑";
      upButton.setAttribute("data-floor", floorNum.toString());
      upButton.setAttribute("data-direction", "up");
      floorDiv.appendChild(upButton);
    }
    if (floorNum > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-button down";
      downButton.textContent = "↓";
      downButton.setAttribute("data-floor", floorNum.toString());
      downButton.setAttribute("data-direction", "down");
      floorDiv.appendChild(downButton);
    }
    buildingContainer.appendChild(floorDiv);
  }
}
function createElevatorElements() {
  const buildingContainer = document.getElementById("building");
  if (!buildingContainer)
    return;
  for (let elevatorId = 0;elevatorId < NUM_ELEVATORS; elevatorId++) {
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.setAttribute("data-elevator", elevatorId.toString());
    const directionDiv = document.createElement("div");
    directionDiv.className = "direction";
    elevatorDiv.appendChild(directionDiv);
    for (let floorNum = NUM_FLOORS - 1;floorNum >= 0; floorNum--) {
      const button = document.createElement("button");
      button.className = "elevator-button";
      button.textContent = floorNum.toString();
      button.setAttribute("data-elevator", elevatorId.toString());
      button.setAttribute("data-floor", floorNum.toString());
      elevatorDiv.appendChild(button);
    }
    buildingContainer.appendChild(elevatorDiv);
  }
}
function setupEventListeners() {
  document.querySelectorAll(".floor-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const floor = parseInt(target.getAttribute("data-floor"));
      const direction = target.getAttribute("data-direction");
      handleFloorRequest(floor, direction);
    });
  });
  document.querySelectorAll(".elevator-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const elevatorId = parseInt(target.getAttribute("data-elevator"));
      const floor = parseInt(target.getAttribute("data-floor"));
      handleElevatorRequest(elevatorId, floor);
    });
  });
}
function handleFloorRequest(floor, direction) {
  if (direction === "up") {
    building.floors[floor].requestUp();
  } else {
    building.floors[floor].requestDown();
  }
  building.requestElevator(floor, direction);
}
function handleElevatorRequest(elevatorId, floor) {
  building.elevators[elevatorId].addDestination(floor);
}
function updateUI() {
  building.elevators.forEach((elevator, index) => {
    const elevatorDiv = document.querySelector(`.elevator[data-elevator="${index}"]`);
    if (elevatorDiv) {
      const yPosition = (NUM_FLOORS - 1 - elevator.currentFloor) * 100;
      elevatorDiv.style.transform = `translateY(${yPosition}px)`;
      const directionDiv = elevatorDiv.querySelector(".direction");
      if (directionDiv) {
        directionDiv.textContent = elevator.direction === "up" ? "↑" : elevator.direction === "down" ? "↓" : "—";
      }
      elevatorDiv.querySelectorAll(".elevator-button").forEach((button) => {
        const btnFloor = parseInt(button.getAttribute("data-floor"));
        if (elevator.destinationFloors.has(btnFloor)) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });
    }
  });
  document.querySelectorAll(".floor-button").forEach((button) => {
    const floor = parseInt(button.getAttribute("data-floor"));
    const direction = button.getAttribute("data-direction");
    const hasRequest = direction === "up" ? building.floors[floor].upButton : building.floors[floor].downButton;
    if (hasRequest) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}
function animate(currentTime) {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  building.update();
  updateUI();
  animationFrameId = requestAnimationFrame(animate);
}
document.addEventListener("DOMContentLoaded", init);
