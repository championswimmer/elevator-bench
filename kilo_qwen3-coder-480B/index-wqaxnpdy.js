// Elevator.ts
class Elevator {
  id;
  currentFloor;
  targetFloors;
  moving;
  direction;
  doorsOpen;
  busy;
  animationProgress;
  animationSpeed;
  constructor(id, floors) {
    try {
      this.id = id;
      this.currentFloor = 0;
      this.targetFloors = [];
      this.moving = false;
      this.direction = "idle";
      this.doorsOpen = false;
      this.busy = false;
      this.animationProgress = 0;
      this.animationSpeed = 0.02;
    } catch (error) {
      console.error(`Error initializing elevator ${id}:`, error);
      throw new Error(`Failed to initialize elevator ${id}`);
    }
  }
  addTargetFloor(floor) {
    if (!this.targetFloors.includes(floor)) {
      this.targetFloors.push(floor);
      this.sortTargetFloors();
    }
  }
  sortTargetFloors() {
    if (this.direction === "up") {
      this.targetFloors.sort((a, b) => a - b);
    } else if (this.direction === "down") {
      this.targetFloors.sort((a, b) => b - a);
    } else {
      this.targetFloors.sort((a, b) => Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor));
    }
    if (this.direction === "idle" && this.targetFloors.length > 0) {
      this.direction = this.targetFloors[0] > this.currentFloor ? "up" : "down";
    }
  }
  removeTargetFloor(floor) {
    this.targetFloors = this.targetFloors.filter((f) => f !== floor);
    if (this.targetFloors.length === 0) {
      this.direction = "idle";
    }
  }
  move() {
    if (this.targetFloors.length === 0) {
      this.moving = false;
      this.direction = "idle";
      this.animationProgress = 0;
      return;
    }
    this.moving = true;
    if (this.animationProgress < 1) {
      this.animationProgress += this.animationSpeed;
      return;
    }
    this.animationProgress = 0;
    const nextTarget = this.getNextTarget();
    if (nextTarget === null) {
      this.direction = "idle";
      return;
    }
    if (nextTarget > this.currentFloor) {
      this.currentFloor++;
      this.direction = "up";
    } else if (nextTarget < this.currentFloor) {
      this.currentFloor--;
      this.direction = "down";
    }
    if (this.targetFloors.includes(this.currentFloor)) {
      this.openDoors();
      this.removeTargetFloor(this.currentFloor);
      if (this.targetFloors.length > 0) {
        const maxTarget = Math.max(...this.targetFloors);
        const minTarget = Math.min(...this.targetFloors);
        if (this.direction === "up" && this.currentFloor >= maxTarget || this.direction === "down" && this.currentFloor <= minTarget) {
          this.direction = this.direction === "up" ? "down" : "up";
          this.sortTargetFloors();
        }
      }
    }
  }
  isMovingTowards(floor) {
    if (this.direction === "idle")
      return false;
    if (this.direction === "up" && floor > this.currentFloor)
      return true;
    if (this.direction === "down" && floor < this.currentFloor)
      return true;
    return false;
  }
  willServeFloor(floor) {
    if (this.targetFloors.includes(floor))
      return true;
    if (this.direction === "up" && floor > this.currentFloor)
      return true;
    if (this.direction === "down" && floor < this.currentFloor)
      return true;
    return false;
  }
  openDoors() {
    this.doorsOpen = true;
    this.busy = true;
    console.log(`Elevator ${this.id} doors opened at floor ${this.currentFloor}`);
    setTimeout(() => {
      this.closeDoors();
    }, 2000);
  }
  closeDoors() {
    this.doorsOpen = false;
    this.busy = false;
    console.log(`Elevator ${this.id} doors closed at floor ${this.currentFloor}`);
  }
  isIdle() {
    return this.direction === "idle" && !this.busy && this.targetFloors.length === 0;
  }
  getNextTarget() {
    if (this.targetFloors.length === 0)
      return null;
    if (this.direction === "up") {
      const aboveFloors = this.targetFloors.filter((floor) => floor >= this.currentFloor);
      return aboveFloors.length > 0 ? Math.min(...aboveFloors) : null;
    } else if (this.direction === "down") {
      const belowFloors = this.targetFloors.filter((floor) => floor <= this.currentFloor);
      return belowFloors.length > 0 ? Math.max(...belowFloors) : null;
    } else {
      return this.targetFloors.length > 0 ? this.targetFloors[0] : null;
    }
  }
}

// Floor.ts
class Floor {
  floorNumber;
  hasUpRequest;
  hasDownRequest;
  upButtonElement;
  downButtonElement;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.hasUpRequest = false;
    this.hasDownRequest = false;
    this.upButtonElement = null;
    this.downButtonElement = null;
    this.createButtonElements(totalFloors);
  }
  createButtonElements(totalFloors) {
    try {
      if (this.floorNumber < totalFloors - 1) {
        this.upButtonElement = document.createElement("button");
        this.upButtonElement.className = "elevator-button up";
        this.upButtonElement.textContent = "↑";
        this.upButtonElement.addEventListener("click", () => {
          this.requestElevator("up");
        });
      }
      if (this.floorNumber > 0) {
        this.downButtonElement = document.createElement("button");
        this.downButtonElement.className = "elevator-button down";
        this.downButtonElement.textContent = "↓";
        this.downButtonElement.addEventListener("click", () => {
          this.requestElevator("down");
        });
      }
    } catch (error) {
      console.error(`Error creating button elements for floor ${this.floorNumber}:`, error);
      throw new Error(`Failed to create button elements for floor ${this.floorNumber}`);
    }
  }
  requestElevator(direction) {
    if (direction === "up") {
      this.hasUpRequest = true;
    } else {
      this.hasDownRequest = true;
    }
    const button = direction === "up" ? this.upButtonElement : this.downButtonElement;
    if (button) {
      button.classList.add("active");
      button.disabled = true;
    }
    const event = new CustomEvent("elevatorRequested", {
      detail: {
        floor: this.floorNumber,
        direction
      }
    });
    document.dispatchEvent(event);
  }
  resetRequest(direction) {
    if (direction === "up") {
      this.hasUpRequest = false;
    } else {
      this.hasDownRequest = false;
    }
    const button = direction === "up" ? this.upButtonElement : this.downButtonElement;
    if (button) {
      button.disabled = false;
      button.classList.remove("active");
    }
  }
  getButtonContainer() {
    const container = document.createElement("div");
    container.className = "button-container";
    if (this.upButtonElement) {
      container.appendChild(this.upButtonElement);
    }
    if (this.downButtonElement) {
      container.appendChild(this.downButtonElement);
    }
    return container;
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  totalFloors;
  totalElevators;
  pendingRequests;
  constructor(totalFloors, totalElevators) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.pendingRequests = [];
    try {
      for (let i = 0;i < totalFloors; i++) {
        this.floors.push(new Floor(i, totalFloors));
      }
    } catch (error) {
      console.error("Error initializing floors:", error);
      throw new Error("Failed to initialize floors");
    }
    try {
      for (let i = 0;i < totalElevators; i++) {
        this.elevators.push(new Elevator(i, totalFloors));
      }
    } catch (error) {
      console.error("Error initializing elevators:", error);
      throw new Error("Failed to initialize elevators");
    }
  }
  createBuildingUI() {
    try {
      const buildingElement = document.getElementById("building");
      const elevatorsElement = document.getElementById("elevators");
      if (!buildingElement || !elevatorsElement) {
        throw new Error("Building or elevators element not found in DOM");
      }
      buildingElement.innerHTML = "";
      elevatorsElement.innerHTML = "";
      for (let i = this.totalFloors - 1;i >= 0; i--) {
        const floorElement = document.createElement("div");
        floorElement.className = "floor";
        floorElement.id = `floor-${i}`;
        const floorLabel = document.createElement("div");
        floorLabel.className = "floor-label";
        floorLabel.textContent = `Floor ${i}`;
        floorElement.appendChild(floorLabel);
        floorElement.appendChild(this.floors[i].getButtonContainer());
        buildingElement.appendChild(floorElement);
      }
      for (let i = 0;i < this.totalElevators; i++) {
        const elevatorElement = document.createElement("div");
        elevatorElement.className = "elevator";
        elevatorElement.id = `elevator-${i}`;
        const elevatorLabel = document.createElement("div");
        elevatorLabel.className = "elevator-label";
        elevatorLabel.textContent = `Elevator ${i}`;
        const elevatorDoor = document.createElement("div");
        elevatorDoor.className = "elevator-door";
        const leftDoor = document.createElement("div");
        leftDoor.className = "elevator-door left";
        const rightDoor = document.createElement("div");
        rightDoor.className = "elevator-door right";
        elevatorDoor.appendChild(leftDoor);
        elevatorDoor.appendChild(rightDoor);
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "elevator-buttons";
        for (let j = 0;j < this.totalFloors; j++) {
          const button = document.createElement("button");
          button.className = "elevator-floor-button";
          button.textContent = j.toString();
          button.addEventListener("click", () => {
            this.selectFloor(i, j);
          });
          buttonsContainer.appendChild(button);
        }
        elevatorElement.appendChild(elevatorLabel);
        elevatorElement.appendChild(elevatorDoor);
        elevatorElement.appendChild(buttonsContainer);
        elevatorsElement.appendChild(elevatorElement);
      }
    } catch (error) {
      console.error("Error creating building UI:", error);
      throw new Error("Failed to create building UI");
    }
  }
  initEventListeners() {
    document.addEventListener("elevatorRequested", (e) => {
      const customEvent = e;
      const { floor, direction } = customEvent.detail;
      this.handleElevatorRequest(floor, direction);
    });
  }
  handleElevatorRequest(floor, direction) {
    try {
      if (floor < 0 || floor >= this.totalFloors) {
        throw new Error(`Invalid floor number: ${floor}`);
      }
      const bestElevator = this.findBestElevator(floor, direction);
      if (bestElevator) {
        bestElevator.addTargetFloor(floor);
        setTimeout(() => {
          try {
            this.floors[floor].resetRequest(direction);
          } catch (error) {
            console.error(`Error resetting request for floor ${floor}:`, error);
          }
        }, 3000);
      } else {
        console.log(`No elevator available for floor ${floor}, queuing request`);
        this.pendingRequests.push({ floor, direction });
      }
    } catch (error) {
      console.error(`Error handling elevator request for floor ${floor}:`, error);
      setTimeout(() => {
        try {
          this.floors[floor].resetRequest(direction);
        } catch (resetError) {
          console.error(`Error resetting request for floor ${floor}:`, resetError);
        }
      }, 3000);
    }
  }
  findBestElevator(floor, direction) {
    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, elevator) => {
        const closestDistance = Math.abs(closest.currentFloor - floor);
        const currentDistance = Math.abs(elevator.currentFloor - floor);
        return currentDistance < closestDistance ? elevator : closest;
      }, idleElevators[0]);
    }
    const movingElevators = this.elevators.filter((elevator) => elevator.direction === direction && (direction === "up" && elevator.currentFloor <= floor || direction === "down" && elevator.currentFloor >= floor));
    if (movingElevators.length > 0) {
      return movingElevators.reduce((closest, elevator) => {
        const closestDistance = Math.abs(closest.currentFloor - floor);
        const currentDistance = Math.abs(elevator.currentFloor - floor);
        return currentDistance < closestDistance ? elevator : closest;
      }, movingElevators[0]);
    }
    const busyElevators = this.elevators.filter((elevator) => !elevator.isIdle() && elevator.targetFloors.length > 0);
    if (busyElevators.length > 0) {
      return busyElevators.reduce((closest, elevator) => {
        const closestDistance = Math.abs(closest.currentFloor - floor);
        const currentDistance = Math.abs(elevator.currentFloor - floor);
        return currentDistance < closestDistance ? elevator : closest;
      }, busyElevators[0]);
    }
    return null;
  }
  selectFloor(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    elevator.addTargetFloor(floor);
  }
  update() {
    this.elevators.forEach((elevator) => {
      if (elevator.moving || elevator.targetFloors.length > 0) {
        elevator.move();
      }
    });
    if (this.pendingRequests.length > 0) {
      const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
      for (let i = 0;i < Math.min(idleElevators.length, this.pendingRequests.length); i++) {
        const elevator = idleElevators[i];
        const request = this.pendingRequests.shift();
        if (request) {
          elevator.addTargetFloor(request.floor);
          console.log(`Assigned pending request for floor ${request.floor} to elevator ${elevator.id}`);
        }
      }
    }
    this.updateUI();
  }
  updateUI() {
    try {
      this.elevators.forEach((elevator, index) => {
        try {
          const elevatorElement = document.getElementById(`elevator-${index}`);
          if (elevatorElement) {
            const label = elevatorElement.querySelector(".elevator-label");
            if (label) {
              label.textContent = `Elevator ${index} (Floor ${elevator.currentFloor})`;
            }
            const floorHeight = 100;
            const position = elevator.currentFloor * floorHeight + elevator.animationProgress * floorHeight * (elevator.direction === "up" ? 1 : elevator.direction === "down" ? -1 : 0);
            elevatorElement.style.transform = `translateY(-${position}px)`;
            const leftDoor = elevatorElement.querySelector(".elevator-door.left");
            const rightDoor = elevatorElement.querySelector(".elevator-door.right");
            if (leftDoor && rightDoor) {
              if (elevator.doorsOpen) {
                leftDoor.classList.add("open");
                rightDoor.classList.add("open");
              } else {
                leftDoor.classList.remove("open");
                rightDoor.classList.remove("open");
              }
            }
            const buttons = elevatorElement.querySelectorAll(".elevator-floor-button");
            buttons.forEach((button, buttonIndex) => {
              if (elevator.targetFloors.includes(buttonIndex)) {
                button.classList.add("active");
              } else {
                button.classList.remove("active");
              }
            });
          }
        } catch (elevatorError) {
          console.error(`Error updating elevator ${index} UI:`, elevatorError);
        }
      });
      this.floors.forEach((floor, floorIndex) => {
        try {
          const floorElement = document.getElementById(`floor-${floorIndex}`);
          if (floorElement) {
            const upButton = floorElement.querySelector(".elevator-button.up");
            const downButton = floorElement.querySelector(".elevator-button.down");
            if (upButton) {
              if (floor.hasUpRequest) {
                upButton.classList.add("active");
                upButton.setAttribute("disabled", "true");
              } else {
                upButton.classList.remove("active");
                upButton.removeAttribute("disabled");
              }
            }
            if (downButton) {
              if (floor.hasDownRequest) {
                downButton.classList.add("active");
                downButton.setAttribute("disabled", "true");
              } else {
                downButton.classList.remove("active");
                downButton.removeAttribute("disabled");
              }
            }
          }
        } catch (floorError) {
          console.error(`Error updating floor ${floorIndex} UI:`, floorError);
        }
      });
    } catch (error) {
      console.error("Error updating building UI:", error);
    }
  }
}

// script.ts
var building = new Building(10, 4);
var gameLoopId;
var lastTimestamp = 0;
var frameRate = 60;
var frameInterval = 1000 / frameRate;
function initSimulator() {
  try {
    building.createBuildingUI();
    building.initEventListeners();
    displayModelInfo();
    startGameLoop();
    console.log("Elevator Simulator initialized with 10 floors and 4 elevators");
  } catch (error) {
    console.error("Error initializing elevator simulator:", error);
    displayError("Failed to initialize elevator simulator. Please refresh the page.");
  }
}
function displayModelInfo() {
  fetch("info.json").then((response) => response.json()).then((data) => {
    const modelInfo = data.config;
    document.getElementById("tool-name").textContent = modelInfo.tool;
    document.getElementById("provider-name").textContent = modelInfo.provider;
    document.getElementById("model-name").textContent = modelInfo.model;
  }).catch((error) => {
    console.error("Error loading model info:", error);
    displayError("Failed to load model information");
  });
}
function displayError(message) {
  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.textContent = message;
  errorElement.style.position = "fixed";
  errorElement.style.top = "10px";
  errorElement.style.left = "50%";
  errorElement.style.transform = "translateX(-50%)";
  errorElement.style.backgroundColor = "#e74c3c";
  errorElement.style.color = "white";
  errorElement.style.padding = "10px 20px";
  errorElement.style.borderRadius = "5px";
  errorElement.style.zIndex = "1000";
  document.body.appendChild(errorElement);
  setTimeout(() => {
    if (errorElement.parentNode) {
      errorElement.parentNode.removeChild(errorElement);
    }
  }, 5000);
}
function startGameLoop() {
  lastTimestamp = performance.now();
  gameLoopId = requestAnimationFrame(gameLoop);
}
function gameLoop(timestamp) {
  const deltaTime = timestamp - lastTimestamp;
  if (deltaTime >= frameInterval) {
    lastTimestamp = timestamp - deltaTime % frameInterval;
    building.update();
  }
  gameLoopId = requestAnimationFrame(gameLoop);
}
document.addEventListener("DOMContentLoaded", () => {
  initSimulator();
});
window.addEventListener("resize", () => {
  building.createBuildingUI();
});
