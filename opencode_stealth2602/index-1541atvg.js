// Elevator.ts
class Elevator {
  id;
  currentFloor;
  targetFloors;
  direction;
  state;
  element;
  buttonsElement;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.targetFloors = [];
    this.direction = "idle";
    this.state = "idle";
    this.element = null;
    this.buttonsElement = null;
  }
  get isIdle() {
    return this.state === "idle";
  }
  addTarget(floor) {
    if (!this.targetFloors.includes(floor)) {
      this.targetFloors.push(floor);
      this.targetFloors.sort((a, b) => {
        if (this.direction === "up")
          return a - b;
        if (this.direction === "down")
          return b - a;
        return a - b;
      });
    }
  }
  removeTarget(floor) {
    const index = this.targetFloors.indexOf(floor);
    if (index > -1) {
      this.targetFloors.splice(index, 1);
    }
    return this.targetFloors.length;
  }
  getNextTarget() {
    if (this.targetFloors.length === 0)
      return null;
    if (this.direction === "up") {
      const aboveFloors = this.targetFloors.filter((f) => f > this.currentFloor);
      if (aboveFloors.length > 0)
        return aboveFloors[0];
      return this.targetFloors[0];
    }
    if (this.direction === "down") {
      const belowFloors = this.targetFloors.filter((f) => f < this.currentFloor);
      if (belowFloors.length > 0)
        return belowFloors[0];
      return this.targetFloors[0];
    }
    return this.targetFloors[0];
  }
  setDirection(dir) {
    this.direction = dir;
    if (dir !== "idle") {
      this.state = "moving";
    }
  }
  updatePosition(totalFloors) {
    if (!this.element)
      return;
    const floorHeight = 75;
    const bottomPosition = this.currentFloor * floorHeight;
    this.element.style.bottom = `${bottomPosition}px`;
    this.element.classList.remove("moving-up", "moving-down");
    if (this.direction === "up") {
      this.element.classList.add("moving-up");
    } else if (this.direction === "down") {
      this.element.classList.add("moving-down");
    }
  }
  render(totalFloors, container) {
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    const elevator = document.createElement("div");
    elevator.className = "elevator";
    elevator.id = `elevator-${this.id}`;
    const numberDisplay = document.createElement("div");
    numberDisplay.className = "elevator-number";
    numberDisplay.textContent = String(this.id);
    const doors = document.createElement("div");
    doors.className = "elevator-doors";
    const leftDoor = document.createElement("div");
    leftDoor.className = "door";
    const rightDoor = document.createElement("div");
    rightDoor.className = "door";
    doors.appendChild(leftDoor);
    doors.appendChild(rightDoor);
    elevator.appendChild(numberDisplay);
    elevator.appendChild(doors);
    const buttons = document.createElement("div");
    buttons.className = "elevator-buttons";
    buttons.id = `elevator-${this.id}-buttons`;
    for (let i = 0;i < totalFloors; i++) {
      const btn = document.createElement("button");
      btn.className = "elevator-btn";
      btn.textContent = String(i);
      btn.addEventListener("click", () => {
        this.addTarget(i);
        btn.classList.add("lit");
        window.dispatchEvent(new CustomEvent("elevatorRequest", {
          detail: { elevatorId: this.id, floor: i }
        }));
      });
      buttons.appendChild(btn);
    }
    shaft.appendChild(elevator);
    shaft.appendChild(buttons);
    container.appendChild(shaft);
    this.element = elevator;
    this.buttonsElement = buttons;
    this.updatePosition(totalFloors);
  }
  clearFloorButton(floor) {
    if (!this.buttonsElement)
      return;
    const buttons = this.buttonsElement.querySelectorAll(".elevator-btn");
    buttons.forEach((btn) => {
      if (btn.textContent === String(floor)) {
        btn.classList.remove("lit");
      }
    });
  }
}

// Floor.ts
class Floor {
  floorNumber;
  hasUpButton;
  hasDownButton;
  upActive;
  downActive;
  element;
  upButton;
  downButton;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.hasUpButton = floorNumber < totalFloors - 1;
    this.hasDownButton = floorNumber > 0;
    this.upActive = false;
    this.downActive = false;
    this.element = null;
    this.upButton = null;
    this.downButton = null;
  }
  setActive(direction, active) {
    if (direction === "up" && this.hasUpButton) {
      this.upActive = active;
      this.updateButtonState();
    } else if (direction === "down" && this.hasDownButton) {
      this.downActive = active;
      this.updateButtonState();
    }
  }
  updateButtonState() {
    if (this.upButton) {
      if (this.upActive) {
        this.upButton.classList.add("active");
      } else {
        this.upButton.classList.remove("active");
      }
    }
    if (this.downButton) {
      if (this.downActive) {
        this.downButton.classList.add("active");
      } else {
        this.downButton.classList.remove("active");
      }
    }
  }
  render(container) {
    const floor = document.createElement("div");
    floor.className = "floor";
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = String(this.floorNumber);
    const buttons = document.createElement("div");
    buttons.className = "floor-buttons";
    if (this.hasUpButton) {
      this.upButton = document.createElement("button");
      this.upButton.className = "floor-btn up";
      this.upButton.textContent = "▲";
      this.upButton.title = "Call elevator up";
      this.upButton.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("floorRequest", {
          detail: { floor: this.floorNumber, direction: "up" }
        }));
      });
      buttons.appendChild(this.upButton);
    }
    if (this.hasDownButton) {
      this.downButton = document.createElement("button");
      this.downButton.className = "floor-btn down";
      this.downButton.textContent = "▼";
      this.downButton.title = "Call elevator down";
      this.downButton.addEventListener("click", () => {
        window.dispatchEvent(new CustomEvent("floorRequest", {
          detail: { floor: this.floorNumber, direction: "down" }
        }));
      });
      buttons.appendChild(this.downButton);
    }
    floor.appendChild(buttons);
    floor.appendChild(floorNumber);
    container.appendChild(floor);
    this.element = floor;
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  numFloors;
  numElevators;
  floorRequests;
  requestQueue;
  isProcessing;
  constructor(numFloors = 10, numElevators = 4) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    this.floors = [];
    this.elevators = [];
    this.floorRequests = new Map;
    this.requestQueue = [];
    this.isProcessing = false;
  }
  initialize() {
    for (let i = 0;i < this.numFloors; i++) {
      const floor = new Floor(i, this.numFloors);
      this.floors.push(floor);
    }
    for (let i = 0;i < this.numElevators; i++) {
      const elevator = new Elevator(i);
      this.elevators.push(elevator);
    }
    this.setupEventListeners();
  }
  setupEventListeners() {
    window.addEventListener("floorRequest", (e) => {
      const { floor, direction } = e.detail;
      this.handleFloorRequest(floor, direction);
    });
    window.addEventListener("elevatorRequest", (e) => {
      const { elevatorId, floor } = e.detail;
      const elevator = this.elevators[elevatorId];
      if (elevator && elevator.currentFloor !== floor) {
        this.processElevatorTargets(elevator);
      }
    });
  }
  handleFloorRequest(floor, direction) {
    const floorObj = this.floors[floor];
    floorObj.setActive(direction, true);
    if (!this.floorRequests.has(floor)) {
      this.floorRequests.set(floor, new Set);
    }
    this.floorRequests.get(floor).add(direction);
    const elevator = this.findBestElevator(floor, direction);
    if (elevator) {
      elevator.addTarget(floor);
      if (elevator.isIdle) {
        const dir = floor > elevator.currentFloor ? "up" : "down";
        elevator.setDirection(dir);
        this.animateElevator(elevator, floor);
      }
    } else {
      this.requestQueue.push({ floor, direction, timestamp: Date.now() });
      this.processQueue();
    }
  }
  findBestElevator(requestFloor, direction) {
    let bestElevator = null;
    let bestDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.isIdle) {
        const distance = Math.abs(elevator.currentFloor - requestFloor);
        let isGoodDirection = false;
        if (direction === "up" && elevator.currentFloor <= requestFloor) {
          isGoodDirection = true;
        } else if (direction === "down" && elevator.currentFloor >= requestFloor) {
          isGoodDirection = true;
        }
        if (isGoodDirection) {
          if (distance < bestDistance) {
            bestDistance = distance;
            bestElevator = elevator;
          }
        } else if (bestDistance === Infinity && distance < bestDistance) {
          bestDistance = distance;
          bestElevator = elevator;
        }
      }
    }
    if (!bestElevator) {
      for (const elevator of this.elevators) {
        const distance = Math.abs(elevator.currentFloor - requestFloor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestElevator = elevator;
        }
      }
    }
    return bestElevator;
  }
  processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0)
      return;
    this.isProcessing = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const elevator = this.findBestElevator(request.floor, request.direction);
      if (elevator) {
        this.requestQueue.shift();
        elevator.addTarget(request.floor);
        if (elevator.isIdle) {
          const dir = request.floor > elevator.currentFloor ? "up" : "down";
          elevator.setDirection(dir);
          this.animateElevator(elevator, request.floor);
        }
      } else {
        break;
      }
    }
    this.isProcessing = false;
  }
  animateElevator(elevator, targetFloor) {
    const moveStep = () => {
      if (elevator.currentFloor === targetFloor) {
        elevator.removeTarget(targetFloor);
        this.floors[targetFloor].setActive("up", false);
        this.floors[targetFloor].setActive("down", false);
        this.floorRequests.delete(targetFloor);
        elevator.clearFloorButton(targetFloor);
        if (elevator.targetFloors.length > 0) {
          this.processElevatorTargets(elevator);
        } else {
          elevator.setDirection("idle");
          elevator.state = "idle";
          this.processQueue();
        }
        return;
      }
      if (elevator.currentFloor < targetFloor) {
        elevator.currentFloor++;
        elevator.setDirection("up");
      } else {
        elevator.currentFloor--;
        elevator.setDirection("down");
      }
      elevator.updatePosition(this.numFloors);
      if (elevator.currentFloor === targetFloor) {
        elevator.removeTarget(targetFloor);
        this.floors[targetFloor].setActive("up", false);
        this.floors[targetFloor].setActive("down", false);
        this.floorRequests.delete(targetFloor);
        elevator.clearFloorButton(targetFloor);
      }
      if (elevator.targetFloors.length > 0) {
        const nextTarget = elevator.getNextTarget();
        if (nextTarget !== null && nextTarget !== targetFloor) {
          setTimeout(moveStep, 300);
        } else if (elevator.targetFloors.length > 0) {
          this.processElevatorTargets(elevator);
        } else {
          elevator.setDirection("idle");
          elevator.state = "idle";
          this.processQueue();
        }
      } else {
        elevator.setDirection("idle");
        elevator.state = "idle";
        this.processQueue();
      }
    };
    setTimeout(moveStep, 300);
  }
  processElevatorTargets(elevator) {
    if (elevator.targetFloors.length === 0) {
      elevator.setDirection("idle");
      elevator.state = "idle";
      this.processQueue();
      return;
    }
    const target = elevator.getNextTarget();
    if (target === null)
      return;
    if (elevator.currentFloor < target) {
      elevator.setDirection("up");
    } else if (elevator.currentFloor > target) {
      elevator.setDirection("down");
    }
    this.animateElevator(elevator, target);
  }
  render() {
    const floorsContainer = document.getElementById("floors-container");
    const elevatorsContainer = document.getElementById("elevators-container");
    if (!floorsContainer || !elevatorsContainer) {
      console.error("Required DOM elements not found");
      return;
    }
    floorsContainer.innerHTML = "";
    elevatorsContainer.innerHTML = "";
    this.floors.forEach((floor) => floor.render(floorsContainer));
    this.elevators.forEach((elevator) => elevator.render(this.numFloors, elevatorsContainer));
  }
}

// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var building = new Building(NUM_FLOORS, NUM_ELEVATORS);
building.initialize();
building.render();
