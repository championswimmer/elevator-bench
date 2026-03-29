// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  state;
  destinationFloors;
  element = null;
  constructor(id, startFloor = 0) {
    this.id = id;
    this.currentFloor = startFloor;
    this.direction = "IDLE" /* IDLE */;
    this.state = "IDLE" /* IDLE */;
    this.destinationFloors = new Set;
  }
  setElement(element) {
    this.element = element;
  }
  addDestination(floor) {
    this.destinationFloors.add(floor);
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
  }
  hasDestinations() {
    return this.destinationFloors.size > 0;
  }
  getNextDestination() {
    if (this.destinationFloors.size === 0)
      return null;
    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);
    if (this.direction === "UP" /* UP */) {
      const upDestinations = destinations.filter((f) => f >= this.currentFloor);
      if (upDestinations.length > 0) {
        return upDestinations[0];
      }
      return destinations[destinations.length - 1];
    } else if (this.direction === "DOWN" /* DOWN */) {
      const downDestinations = destinations.filter((f) => f <= this.currentFloor).reverse();
      if (downDestinations.length > 0) {
        return downDestinations[0];
      }
      return destinations[0];
    } else {
      return destinations.reduce((prev, curr) => Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev);
    }
  }
  shouldChangeDirection() {
    if (this.destinationFloors.size === 0)
      return true;
    const destinations = Array.from(this.destinationFloors);
    if (this.direction === "UP" /* UP */) {
      return !destinations.some((f) => f > this.currentFloor);
    } else if (this.direction === "DOWN" /* DOWN */) {
      return !destinations.some((f) => f < this.currentFloor);
    }
    return false;
  }
  updateDirection() {
    if (this.destinationFloors.size === 0) {
      this.direction = "IDLE" /* IDLE */;
      return;
    }
    const nextFloor = this.getNextDestination();
    if (nextFloor === null) {
      this.direction = "IDLE" /* IDLE */;
    } else if (nextFloor > this.currentFloor) {
      this.direction = "UP" /* UP */;
    } else if (nextFloor < this.currentFloor) {
      this.direction = "DOWN" /* DOWN */;
    } else {
      if (this.shouldChangeDirection()) {
        const destinations = Array.from(this.destinationFloors);
        const hasAbove = destinations.some((f) => f > this.currentFloor);
        const hasBelow = destinations.some((f) => f < this.currentFloor);
        if (hasAbove && !hasBelow) {
          this.direction = "UP" /* UP */;
        } else if (hasBelow && !hasAbove) {
          this.direction = "DOWN" /* DOWN */;
        }
      }
    }
  }
  moveToNextFloor() {
    if (this.direction === "UP" /* UP */) {
      this.currentFloor++;
    } else if (this.direction === "DOWN" /* DOWN */) {
      this.currentFloor--;
    }
    this.updateVisualPosition();
  }
  updateVisualPosition() {
    if (this.element) {
      this.element.style.bottom = `${this.currentFloor * 80 + 10}px`;
      this.element.setAttribute("data-floor", this.currentFloor.toString());
    }
  }
  updateVisualState() {
    if (this.element) {
      this.element.setAttribute("data-state", this.state);
      this.element.setAttribute("data-direction", this.direction);
      const directionIndicator = this.element.querySelector(".elevator-direction");
      if (directionIndicator) {
        if (this.direction === "UP" /* UP */) {
          directionIndicator.textContent = "↑";
        } else if (this.direction === "DOWN" /* DOWN */) {
          directionIndicator.textContent = "↓";
        } else {
          directionIndicator.textContent = "•";
        }
      }
      const floorDisplay = this.element.querySelector(".elevator-floor");
      if (floorDisplay) {
        floorDisplay.textContent = this.currentFloor.toString();
      }
    }
  }
}

// Floor.ts
class Floor {
  number;
  hasUpButton;
  hasDownButton;
  upButtonPressed;
  downButtonPressed;
  upButtonElement = null;
  downButtonElement = null;
  constructor(number, totalFloors) {
    this.number = number;
    this.hasUpButton = number < totalFloors - 1;
    this.hasDownButton = number > 0;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
  }
  setUpButtonElement(element) {
    this.upButtonElement = element;
  }
  setDownButtonElement(element) {
    this.downButtonElement = element;
  }
  pressUpButton() {
    if (this.hasUpButton) {
      this.upButtonPressed = true;
      this.updateButtonVisuals();
    }
  }
  pressDownButton() {
    if (this.hasDownButton) {
      this.downButtonPressed = true;
      this.updateButtonVisuals();
    }
  }
  clearUpButton() {
    this.upButtonPressed = false;
    this.updateButtonVisuals();
  }
  clearDownButton() {
    this.downButtonPressed = false;
    this.updateButtonVisuals();
  }
  updateButtonVisuals() {
    if (this.upButtonElement) {
      if (this.upButtonPressed) {
        this.upButtonElement.classList.add("pressed");
      } else {
        this.upButtonElement.classList.remove("pressed");
      }
    }
    if (this.downButtonElement) {
      if (this.downButtonPressed) {
        this.downButtonElement.classList.add("pressed");
      } else {
        this.downButtonElement.classList.remove("pressed");
      }
    }
  }
}

// Building.ts
class Building {
  config;
  floors;
  elevators;
  requestQueue;
  animationIntervalId = null;
  constructor(config) {
    this.config = config;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    for (let i = 0;i < config.totalFloors; i++) {
      this.floors.push(new Floor(i, config.totalFloors));
    }
    for (let i = 0;i < config.totalElevators; i++) {
      this.elevators.push(new Elevator(i, 0));
    }
  }
  requestElevator(floor, direction) {
    const floorObj = this.floors[floor];
    if (direction === "UP" /* UP */) {
      if (floorObj.upButtonPressed)
        return;
      floorObj.pressUpButton();
    } else {
      if (floorObj.downButtonPressed)
        return;
      floorObj.pressDownButton();
    }
    const elevator = this.findBestElevator(floor, direction);
    if (elevator) {
      this.assignElevatorToRequest(elevator, floor, direction);
    } else {
      this.requestQueue.push({ floor, direction });
    }
  }
  selectFloor(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    elevator.addDestination(floor);
    this.updateElevatorButtonVisuals(elevatorId);
    if (elevator.state === "IDLE" /* IDLE */) {
      elevator.updateDirection();
      this.startElevatorMovement(elevator);
    }
  }
  findBestElevator(floor, direction) {
    const idleElevators = this.elevators.filter((e) => e.state === "IDLE" /* IDLE */);
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, curr) => Math.abs(curr.currentFloor - floor) < Math.abs(closest.currentFloor - floor) ? curr : closest);
    }
    const suitableElevators = this.elevators.filter((e) => {
      if (e.state !== "MOVING" /* MOVING */)
        return false;
      if (direction === "UP" /* UP */ && e.direction === "UP" /* UP */) {
        return e.currentFloor <= floor;
      } else if (direction === "DOWN" /* DOWN */ && e.direction === "DOWN" /* DOWN */) {
        return e.currentFloor >= floor;
      }
      return false;
    });
    if (suitableElevators.length > 0) {
      return suitableElevators.reduce((closest, curr) => Math.abs(curr.currentFloor - floor) < Math.abs(closest.currentFloor - floor) ? curr : closest);
    }
    return null;
  }
  assignElevatorToRequest(elevator, floor, direction) {
    elevator.addDestination(floor);
    if (elevator.state === "IDLE" /* IDLE */) {
      elevator.updateDirection();
      this.startElevatorMovement(elevator);
    }
  }
  startElevatorMovement(elevator) {
    if (elevator.state === "MOVING" /* MOVING */)
      return;
    elevator.state = "MOVING" /* MOVING */;
    elevator.updateVisualState();
    this.moveElevator(elevator);
  }
  async moveElevator(elevator) {
    while (elevator.hasDestinations()) {
      const nextFloor = elevator.getNextDestination();
      if (nextFloor === null)
        break;
      while (elevator.currentFloor !== nextFloor) {
        await this.sleep(this.config.floorTravelTime);
        elevator.moveToNextFloor();
      }
      elevator.state = "STOPPED" /* STOPPED */;
      elevator.updateVisualState();
      elevator.removeDestination(nextFloor);
      this.updateElevatorButtonVisuals(elevator.id);
      const floor = this.floors[nextFloor];
      if (elevator.direction === "UP" /* UP */ && floor.upButtonPressed) {
        floor.clearUpButton();
      } else if (elevator.direction === "DOWN" /* DOWN */ && floor.downButtonPressed) {
        floor.clearDownButton();
      } else if (elevator.direction === "IDLE" /* IDLE */) {
        if (floor.upButtonPressed)
          floor.clearUpButton();
        if (floor.downButtonPressed)
          floor.clearDownButton();
      }
      await this.sleep(this.config.doorOpenTime);
      elevator.updateDirection();
      if (elevator.hasDestinations()) {
        elevator.state = "MOVING" /* MOVING */;
        elevator.updateVisualState();
      }
    }
    elevator.state = "IDLE" /* IDLE */;
    elevator.direction = "IDLE" /* IDLE */;
    elevator.updateVisualState();
    this.processQueue();
  }
  processQueue() {
    if (this.requestQueue.length === 0)
      return;
    const processedIndices = [];
    for (let i = 0;i < this.requestQueue.length; i++) {
      const request = this.requestQueue[i];
      const elevator = this.findBestElevator(request.floor, request.direction);
      if (elevator) {
        this.assignElevatorToRequest(elevator, request.floor, request.direction);
        processedIndices.push(i);
      }
    }
    this.requestQueue = this.requestQueue.filter((_, index) => !processedIndices.includes(index));
  }
  updateElevatorButtonVisuals(elevatorId) {
    const elevator = this.elevators[elevatorId];
    const panel = document.querySelector(`#elevator-${elevatorId}-panel`);
    if (panel) {
      const buttons = panel.querySelectorAll(".floor-button");
      buttons.forEach((button) => {
        const floor = parseInt(button.getAttribute("data-floor") || "0");
        if (elevator.destinationFloors.has(floor)) {
          button.classList.add("selected");
        } else {
          button.classList.remove("selected");
        }
      });
    }
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getStatus() {
    let status = `Elevator Status:
`;
    this.elevators.forEach((e) => {
      status += `Elevator ${e.id}: Floor ${e.currentFloor}, ${e.direction}, ${e.state}
`;
    });
    return status;
  }
}

// script.ts
var CONFIG = {
  totalFloors: 10,
  totalElevators: 4,
  floorTravelTime: 1000,
  doorOpenTime: 1500
};
var building;
function initializeBuilding() {
  building = new Building(CONFIG);
  renderBuilding();
  setupEventListeners();
}
function renderBuilding() {
  renderShaft();
  renderFloors();
  renderElevators();
  renderControlPanels();
}
function renderShaft() {
  const shaftContainer = document.getElementById("shaft-container");
  if (!shaftContainer)
    return;
  shaftContainer.innerHTML = "";
  shaftContainer.style.height = `${CONFIG.totalFloors * 80}px`;
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    shaft.id = `shaft-${i}`;
    shaftContainer.appendChild(shaft);
  }
}
function renderFloors() {
  const floorsContainer = document.getElementById("floors-container");
  if (!floorsContainer)
    return;
  floorsContainer.innerHTML = "";
  for (let i = CONFIG.totalFloors - 1;i >= 0; i--) {
    const floor = building.floors[i];
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${i}`;
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = `${i}`;
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "floor-buttons";
    if (floor.hasUpButton) {
      const upButton = document.createElement("button");
      upButton.className = "floor-call-button up-button";
      upButton.innerHTML = "↑";
      upButton.onclick = () => handleFloorRequest(i, "UP" /* UP */);
      buttonsDiv.appendChild(upButton);
      floor.setUpButtonElement(upButton);
    }
    if (floor.hasDownButton) {
      const downButton = document.createElement("button");
      downButton.className = "floor-call-button down-button";
      downButton.innerHTML = "↓";
      downButton.onclick = () => handleFloorRequest(i, "DOWN" /* DOWN */);
      buttonsDiv.appendChild(downButton);
      floor.setDownButtonElement(downButton);
    }
    floorDiv.appendChild(floorNumber);
    floorDiv.appendChild(buttonsDiv);
    floorsContainer.appendChild(floorDiv);
  }
}
function renderElevators() {
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const shaft = document.getElementById(`shaft-${i}`);
    if (!shaft)
      continue;
    const elevator = building.elevators[i];
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${i}`;
    elevatorDiv.setAttribute("data-floor", "0");
    elevatorDiv.setAttribute("data-state", "IDLE");
    elevatorDiv.setAttribute("data-direction", "IDLE");
    const elevatorInfo = document.createElement("div");
    elevatorInfo.className = "elevator-info";
    const elevatorId = document.createElement("div");
    elevatorId.className = "elevator-id";
    elevatorId.textContent = `E${i}`;
    const elevatorFloor = document.createElement("div");
    elevatorFloor.className = "elevator-floor";
    elevatorFloor.textContent = "0";
    const elevatorDirection = document.createElement("div");
    elevatorDirection.className = "elevator-direction";
    elevatorDirection.textContent = "•";
    elevatorInfo.appendChild(elevatorId);
    elevatorInfo.appendChild(elevatorFloor);
    elevatorInfo.appendChild(elevatorDirection);
    elevatorDiv.appendChild(elevatorInfo);
    shaft.appendChild(elevatorDiv);
    elevator.setElement(elevatorDiv);
    elevator.updateVisualPosition();
  }
}
function renderControlPanels() {
  const panelsContainer = document.getElementById("control-panels");
  if (!panelsContainer)
    return;
  panelsContainer.innerHTML = "";
  for (let i = 0;i < CONFIG.totalElevators; i++) {
    const panel = document.createElement("div");
    panel.className = "control-panel";
    panel.id = `elevator-${i}-panel`;
    const panelTitle = document.createElement("div");
    panelTitle.className = "panel-title";
    panelTitle.textContent = `Elevator ${i}`;
    const buttonsGrid = document.createElement("div");
    buttonsGrid.className = "panel-buttons";
    for (let floor = CONFIG.totalFloors - 1;floor >= 0; floor--) {
      const button = document.createElement("button");
      button.className = "floor-button";
      button.textContent = floor.toString();
      button.setAttribute("data-floor", floor.toString());
      button.onclick = () => handleElevatorFloorSelection(i, floor);
      buttonsGrid.appendChild(button);
    }
    panel.appendChild(panelTitle);
    panel.appendChild(buttonsGrid);
    panelsContainer.appendChild(panel);
  }
}
function handleFloorRequest(floor, direction) {
  building.requestElevator(floor, direction);
}
function handleElevatorFloorSelection(elevatorId, floor) {
  building.selectFloor(elevatorId, floor);
}
function setupEventListeners() {}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeBuilding);
} else {
  initializeBuilding();
}
