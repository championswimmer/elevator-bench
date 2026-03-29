// Elevator.ts
class Elevator {
  id;
  currentFloor;
  destinationFloors;
  state;
  direction;
  element = null;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.destinationFloors = new Set;
    this.state = "idle" /* IDLE */;
    this.direction = "idle" /* IDLE */;
  }
  addDestination(floor) {
    this.destinationFloors.add(floor);
    this.updateDirection();
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
    this.updateDirection();
  }
  hasDestination(floor) {
    return this.destinationFloors.has(floor);
  }
  getNextDestination() {
    if (this.destinationFloors.size === 0) {
      return null;
    }
    if (this.direction === "up" /* UP */) {
      const destinations = Array.from(this.destinationFloors).filter((f) => f > this.currentFloor);
      if (destinations.length > 0) {
        return Math.min(...destinations);
      }
    } else if (this.direction === "down" /* DOWN */) {
      const destinations = Array.from(this.destinationFloors).filter((f) => f < this.currentFloor);
      if (destinations.length > 0) {
        return Math.max(...destinations);
      }
    }
    return Array.from(this.destinationFloors)[0];
  }
  updateDirection() {
    if (this.destinationFloors.size === 0) {
      this.state = "idle" /* IDLE */;
      this.direction = "idle" /* IDLE */;
      return;
    }
    const nextDestination = this.getNextDestination();
    if (nextDestination === null) {
      this.state = "idle" /* IDLE */;
      this.direction = "idle" /* IDLE */;
      return;
    }
    if (nextDestination > this.currentFloor) {
      this.state = "moving-up" /* MOVING_UP */;
      this.direction = "up" /* UP */;
    } else if (nextDestination < this.currentFloor) {
      this.state = "moving-down" /* MOVING_DOWN */;
      this.direction = "down" /* DOWN */;
    } else {
      this.state = "idle" /* IDLE */;
      this.direction = "idle" /* IDLE */;
    }
  }
  move() {
    const nextDestination = this.getNextDestination();
    if (nextDestination === null) {
      return false;
    }
    if (nextDestination > this.currentFloor) {
      this.currentFloor++;
    } else if (nextDestination < this.currentFloor) {
      this.currentFloor--;
    }
    if (this.currentFloor === nextDestination) {
      this.removeDestination(this.currentFloor);
    }
    this.updateDirection();
    return true;
  }
  canHandleRequest(request) {
    if (this.state === "idle" /* IDLE */) {
      return true;
    }
    if (this.direction === "up" /* UP */ && request.direction === "up" /* UP */ && request.floor >= this.currentFloor) {
      return true;
    }
    if (this.direction === "down" /* DOWN */ && request.direction === "down" /* DOWN */ && request.floor <= this.currentFloor) {
      return true;
    }
    return false;
  }
  getDistanceToRequest(request) {
    return Math.abs(this.currentFloor - request.floor);
  }
}

// Floor.ts
class Floor {
  number;
  upButtonPressed = false;
  downButtonPressed = false;
  element = null;
  upButton = null;
  downButton = null;
  constructor(number) {
    this.number = number;
  }
  pressUpButton() {
    if (this.number !== 9) {
      this.upButtonPressed = true;
      this.updateButtonVisuals();
    }
  }
  pressDownButton() {
    if (this.number !== 0) {
      this.downButtonPressed = true;
      this.updateButtonVisuals();
    }
  }
  releaseUpButton() {
    this.upButtonPressed = false;
    this.updateButtonVisuals();
  }
  releaseDownButton() {
    this.downButtonPressed = false;
    this.updateButtonVisuals();
  }
  hasActiveRequest() {
    return this.upButtonPressed || this.downButtonPressed;
  }
  getActiveRequests() {
    const requests = [];
    if (this.upButtonPressed)
      requests.push("up" /* UP */);
    if (this.downButtonPressed)
      requests.push("down" /* DOWN */);
    return requests;
  }
  updateButtonVisuals() {
    if (this.upButton) {
      if (this.upButtonPressed) {
        this.upButton.classList.add("active");
      } else {
        this.upButton.classList.remove("active");
      }
    }
    if (this.downButton) {
      if (this.downButtonPressed) {
        this.downButton.classList.add("active");
      } else {
        this.downButton.classList.remove("active");
      }
    }
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  pendingRequests = [];
  totalFloors;
  totalElevators;
  constructor(totalFloors = 10, totalElevators = 4) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = Array.from({ length: totalFloors }, (_, i) => new Floor(i));
    this.elevators = Array.from({ length: totalElevators }, (_, i) => new Elevator(i));
  }
  requestElevator(floorNumber, direction) {
    if (floorNumber < 0 || floorNumber >= this.totalFloors) {
      return;
    }
    if (floorNumber === 0 && direction === "down" /* DOWN */) {
      return;
    }
    if (floorNumber === this.totalFloors - 1 && direction === "up" /* UP */) {
      return;
    }
    const request = { floor: floorNumber, direction };
    this.pendingRequests.push(request);
    const floor = this.floors[floorNumber];
    if (direction === "up" /* UP */) {
      floor.pressUpButton();
    } else {
      floor.pressDownButton();
    }
    this.assignRequestToElevator(request);
  }
  assignRequestToElevator(request) {
    const availableElevators = this.elevators.filter((elevator) => elevator.canHandleRequest(request));
    if (availableElevators.length === 0) {
      return;
    }
    const bestElevator = availableElevators.reduce((best, current) => {
      const bestDistance = best.getDistanceToRequest(request);
      const currentDistance = current.getDistanceToRequest(request);
      if (currentDistance < bestDistance) {
        return current;
      } else if (currentDistance === bestDistance) {
        if (current.state === "idle" /* IDLE */ && best.state !== "idle" /* IDLE */) {
          return current;
        }
      }
      return best;
    });
    bestElevator.addDestination(request.floor);
    this.removePendingRequest(request);
  }
  removePendingRequest(request) {
    const index = this.pendingRequests.findIndex((r) => r.floor === request.floor && r.direction === request.direction);
    if (index !== -1) {
      this.pendingRequests.splice(index, 1);
    }
    const floor = this.floors[request.floor];
    const hasOtherRequests = this.pendingRequests.some((r) => r.floor === request.floor && r.direction === request.direction);
    if (!hasOtherRequests) {
      if (request.direction === "up" /* UP */) {
        floor.releaseUpButton();
      } else {
        floor.releaseDownButton();
      }
    }
  }
  requestElevatorFloor(elevatorId, floorNumber) {
    if (floorNumber < 0 || floorNumber >= this.totalFloors) {
      return;
    }
    const elevator = this.elevators[elevatorId];
    if (elevator) {
      elevator.addDestination(floorNumber);
    }
  }
  update() {
    this.elevators.forEach((elevator) => {
      elevator.move();
    });
    this.pendingRequests.forEach((request) => {
      this.assignRequestToElevator(request);
    });
    this.checkElevatorArrivals();
  }
  checkElevatorArrivals() {
    this.elevators.forEach((elevator) => {
      const floor = this.floors[elevator.currentFloor];
      if (floor.upButtonPressed && elevator.direction === "up" /* UP */) {
        floor.releaseUpButton();
        this.removePendingRequest({ floor: elevator.currentFloor, direction: "up" /* UP */ });
      }
      if (floor.downButtonPressed && elevator.direction === "down" /* DOWN */) {
        floor.releaseDownButton();
        this.removePendingRequest({ floor: elevator.currentFloor, direction: "down" /* DOWN */ });
      }
    });
  }
  reset() {
    this.floors.forEach((floor) => {
      floor.releaseUpButton();
      floor.releaseDownButton();
    });
    this.elevators.forEach((elevator) => {
      elevator.currentFloor = 0;
      elevator.destinationFloors.clear();
      elevator.state = "idle" /* IDLE */;
      elevator.direction = "idle" /* IDLE */;
    });
    this.pendingRequests = [];
  }
}

// script.ts
class ElevatorSimulator {
  building;
  animationInterval = null;
  constructor() {
    this.building = new Building(10, 4);
    this.initializeDOM();
    this.startAnimation();
    this.setupEventListeners();
  }
  initializeDOM() {
    const floorsContainer = document.getElementById("floors");
    const elevatorsContainer = document.getElementById("elevators");
    if (!floorsContainer || !elevatorsContainer) {
      return;
    }
    floorsContainer.innerHTML = "";
    elevatorsContainer.innerHTML = "";
    for (let i = this.building.totalFloors - 1;i >= 0; i--) {
      const floor = this.building.floors[i];
      const floorElement = this.createFloorElement(floor);
      floorsContainer.appendChild(floorElement);
    }
    for (let i = 0;i < this.building.totalElevators; i++) {
      const shaftElement = this.createElevatorShaftElement(i);
      elevatorsContainer.appendChild(shaftElement);
    }
    this.updateElevatorPositions();
  }
  createFloorElement(floor) {
    const floorElement = document.createElement("div");
    floorElement.className = "floor";
    floorElement.id = `floor-${floor.number}`;
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = `F${floor.number}`;
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "floor-buttons";
    if (floor.number < this.building.totalFloors - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-button up";
      upButton.textContent = "↑";
      upButton.addEventListener("click", () => {
        this.building.requestElevator(floor.number, "up" /* UP */);
      });
      buttonsContainer.appendChild(upButton);
      floor.upButton = upButton;
    }
    if (floor.number > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-button down";
      downButton.textContent = "↓";
      downButton.addEventListener("click", () => {
        this.building.requestElevator(floor.number, "down" /* DOWN */);
      });
      buttonsContainer.appendChild(downButton);
      floor.downButton = downButton;
    }
    floorElement.appendChild(floorNumber);
    floorElement.appendChild(buttonsContainer);
    floor.element = floorElement;
    return floorElement;
  }
  createElevatorShaftElement(elevatorId) {
    const shaftElement = document.createElement("div");
    shaftElement.className = "elevator-shaft";
    shaftElement.id = `shaft-${elevatorId}`;
    const elevatorElement = document.createElement("div");
    elevatorElement.className = "elevator idle";
    elevatorElement.id = `elevator-${elevatorId}`;
    elevatorElement.textContent = `E${elevatorId}`;
    const panelElement = document.createElement("div");
    panelElement.className = "elevator-panel";
    for (let i = 0;i < this.building.totalFloors; i++) {
      const floorButton = document.createElement("button");
      floorButton.className = "elevator-floor-button";
      floorButton.textContent = i.toString();
      floorButton.addEventListener("click", () => {
        this.building.requestElevatorFloor(elevatorId, i);
      });
      panelElement.appendChild(floorButton);
    }
    elevatorElement.appendChild(panelElement);
    shaftElement.appendChild(elevatorElement);
    const elevator = this.building.elevators[elevatorId];
    elevator.element = elevatorElement;
    return shaftElement;
  }
  updateElevatorPositions() {
    this.building.elevators.forEach((elevator) => {
      if (elevator.element) {
        const bottomPosition = elevator.currentFloor * 62;
        elevator.element.style.bottom = `${bottomPosition}px`;
        elevator.element.className = `elevator ${elevator.state}`;
        const floorButtons = elevator.element.querySelectorAll(".elevator-floor-button");
        floorButtons.forEach((button, index) => {
          if (elevator.hasDestination(index)) {
            button.classList.add("active");
          } else {
            button.classList.remove("active");
          }
        });
      }
    });
  }
  startAnimation() {
    this.animationInterval = window.setInterval(() => {
      this.building.update();
      this.updateElevatorPositions();
    }, 1000);
  }
  stopAnimation() {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
  }
  setupEventListeners() {
    const resetButton = document.getElementById("resetBtn");
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        this.reset();
      });
    }
  }
  reset() {
    this.stopAnimation();
    this.building.reset();
    this.updateElevatorPositions();
    this.startAnimation();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new ElevatorSimulator;
});
