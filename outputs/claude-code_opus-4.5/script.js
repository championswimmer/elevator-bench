// types.ts
var CONFIG = {
  NUM_FLOORS: 10,
  NUM_ELEVATORS: 4,
  FLOOR_TRAVEL_TIME: 1000,
  DOOR_OPEN_TIME: 2000,
  ANIMATION_DURATION: 800
};

// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  state;
  destinationFloors;
  element = null;
  floorButtonElements = new Map;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle" /* IDLE */;
    this.state = "idle" /* IDLE */;
    this.destinationFloors = new Set;
  }
  setElement(element) {
    this.element = element;
  }
  setFloorButtonElement(floor, element) {
    this.floorButtonElements.set(floor, element);
  }
  addDestination(floor) {
    if (floor >= 0 && floor < CONFIG.NUM_FLOORS && floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
      this.updateFloorButtonState(floor, true);
    }
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
    this.updateFloorButtonState(floor, false);
  }
  updateFloorButtonState(floor, active) {
    const button = this.floorButtonElements.get(floor);
    if (button) {
      if (active) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    }
  }
  hasDestinations() {
    return this.destinationFloors.size > 0;
  }
  getNextDestination() {
    if (!this.hasDestinations())
      return null;
    const floors = Array.from(this.destinationFloors);
    if (this.direction === "up" /* UP */) {
      const floorsAbove = floors.filter((f) => f > this.currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0)
        return floorsAbove[0];
      const floorsBelow = floors.filter((f) => f < this.currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0)
        return floorsBelow[0];
    } else if (this.direction === "down" /* DOWN */) {
      const floorsBelow = floors.filter((f) => f < this.currentFloor).sort((a, b) => b - a);
      if (floorsBelow.length > 0)
        return floorsBelow[0];
      const floorsAbove = floors.filter((f) => f > this.currentFloor).sort((a, b) => a - b);
      if (floorsAbove.length > 0)
        return floorsAbove[0];
    } else {
      floors.sort((a, b) => Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor));
      return floors[0];
    }
    return null;
  }
  updateDirection() {
    const nextDest = this.getNextDestination();
    if (nextDest === null) {
      this.direction = "idle" /* IDLE */;
    } else if (nextDest > this.currentFloor) {
      this.direction = "up" /* UP */;
    } else if (nextDest < this.currentFloor) {
      this.direction = "down" /* DOWN */;
    }
  }
  isIdle() {
    return this.state === "idle" /* IDLE */ && this.direction === "idle" /* IDLE */;
  }
  distanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  canServeRequest(floor, requestDirection) {
    if (this.isIdle())
      return true;
    if (this.direction === "up" /* UP */) {
      if (floor >= this.currentFloor && requestDirection === "up" /* UP */)
        return true;
    } else if (this.direction === "down" /* DOWN */) {
      if (floor <= this.currentFloor && requestDirection === "down" /* DOWN */)
        return true;
    }
    return false;
  }
  updateVisualPosition() {
    if (this.element) {
      const bottomPosition = this.currentFloor * 80;
      this.element.style.bottom = `${bottomPosition}px`;
    }
  }
  updateStateDisplay() {
    if (this.element) {
      const stateIndicator = this.element.querySelector(".elevator-state");
      if (stateIndicator) {
        let symbol = "●";
        if (this.direction === "up" /* UP */)
          symbol = "▲";
        else if (this.direction === "down" /* DOWN */)
          symbol = "▼";
        stateIndicator.textContent = symbol;
      }
      const floorDisplay = this.element.querySelector(".elevator-floor");
      if (floorDisplay) {
        floorDisplay.textContent = this.currentFloor.toString();
      }
      this.element.classList.remove("idle", "moving", "doors-open");
      if (this.state === "idle" /* IDLE */) {
        this.element.classList.add("idle");
      } else if (this.state === "moving" /* MOVING */) {
        this.element.classList.add("moving");
      } else if (this.state === "doors_open" /* DOORS_OPEN */) {
        this.element.classList.add("doors-open");
      }
    }
  }
}

// Floor.ts
class Floor {
  number;
  upButtonActive = false;
  downButtonActive = false;
  upButton = null;
  downButton = null;
  constructor(number) {
    this.number = number;
  }
  setUpButton(element) {
    this.upButton = element;
  }
  setDownButton(element) {
    this.downButton = element;
  }
  hasUpButton() {
    return this.number < CONFIG.NUM_FLOORS - 1;
  }
  hasDownButton() {
    return this.number > 0;
  }
  activateUpButton() {
    if (this.hasUpButton()) {
      this.upButtonActive = true;
      if (this.upButton) {
        this.upButton.classList.add("active");
      }
    }
  }
  activateDownButton() {
    if (this.hasDownButton()) {
      this.downButtonActive = true;
      if (this.downButton) {
        this.downButton.classList.add("active");
      }
    }
  }
  deactivateUpButton() {
    this.upButtonActive = false;
    if (this.upButton) {
      this.upButton.classList.remove("active");
    }
  }
  deactivateDownButton() {
    this.downButtonActive = false;
    if (this.downButton) {
      this.downButton.classList.remove("active");
    }
  }
  deactivateButton(direction) {
    if (direction === "up" /* UP */) {
      this.deactivateUpButton();
    } else if (direction === "down" /* DOWN */) {
      this.deactivateDownButton();
    }
  }
  isButtonActive(direction) {
    if (direction === "up" /* UP */)
      return this.upButtonActive;
    if (direction === "down" /* DOWN */)
      return this.downButtonActive;
    return false;
  }
}

// Building.ts
class Building {
  elevators = [];
  floors = [];
  pendingRequests = [];
  isProcessing = false;
  constructor() {
    this.initializeFloors();
    this.initializeElevators();
  }
  initializeFloors() {
    for (let i = 0;i < CONFIG.NUM_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
  }
  initializeElevators() {
    for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  requestElevator(floor, direction) {
    const floorObj = this.floors[floor];
    if (floorObj.isButtonActive(direction)) {
      return;
    }
    if (direction === "up" /* UP */) {
      floorObj.activateUpButton();
    } else {
      floorObj.activateDownButton();
    }
    const bestElevator = this.findBestElevator(floor, direction);
    if (bestElevator) {
      bestElevator.addDestination(floor);
      this.processElevator(bestElevator);
    } else {
      this.pendingRequests.push({
        floor,
        direction,
        timestamp: Date.now()
      });
    }
  }
  selectFloorInElevator(elevatorId, targetFloor) {
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    elevator.addDestination(targetFloor);
    this.processElevator(elevator);
  }
  findBestElevator(floor, direction) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.state === "doors_open" /* DOORS_OPEN */)
        continue;
      const distance = elevator.distanceToFloor(floor);
      if (elevator.isIdle()) {
        if (distance < bestScore) {
          bestScore = distance;
          bestElevator = elevator;
        }
      } else if (elevator.canServeRequest(floor, direction)) {
        const score = distance + 0.5;
        if (score < bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }
    }
    return bestElevator;
  }
  async processElevator(elevator) {
    if (elevator.state === "moving" /* MOVING */ || elevator.state === "doors_open" /* DOORS_OPEN */) {
      return;
    }
    elevator.updateDirection();
    if (elevator.direction === "idle" /* IDLE */) {
      elevator.state = "idle" /* IDLE */;
      elevator.updateStateDisplay();
      this.processPendingRequests();
      return;
    }
    const nextFloor = elevator.getNextDestination();
    if (nextFloor === null) {
      elevator.direction = "idle" /* IDLE */;
      elevator.state = "idle" /* IDLE */;
      elevator.updateStateDisplay();
      this.processPendingRequests();
      return;
    }
    await this.moveElevatorToFloor(elevator, nextFloor);
  }
  async moveElevatorToFloor(elevator, targetFloor) {
    elevator.state = "moving" /* MOVING */;
    elevator.updateDirection();
    elevator.updateStateDisplay();
    while (elevator.currentFloor !== targetFloor) {
      await this.delay(CONFIG.FLOOR_TRAVEL_TIME);
      if (elevator.direction === "up" /* UP */) {
        elevator.currentFloor++;
      } else {
        elevator.currentFloor--;
      }
      elevator.updateVisualPosition();
      elevator.updateStateDisplay();
      if (elevator.destinationFloors.has(elevator.currentFloor)) {
        await this.stopAtFloor(elevator);
      }
    }
    if (elevator.destinationFloors.has(elevator.currentFloor)) {
      await this.stopAtFloor(elevator);
    }
    elevator.updateDirection();
    if (elevator.hasDestinations()) {
      await this.processElevator(elevator);
    } else {
      elevator.state = "idle" /* IDLE */;
      elevator.direction = "idle" /* IDLE */;
      elevator.updateStateDisplay();
      this.processPendingRequests();
    }
  }
  async stopAtFloor(elevator) {
    elevator.state = "doors_open" /* DOORS_OPEN */;
    elevator.removeDestination(elevator.currentFloor);
    elevator.updateStateDisplay();
    const floor = this.floors[elevator.currentFloor];
    if (elevator.direction === "up" /* UP */ || elevator.direction === "idle" /* IDLE */) {
      floor.deactivateUpButton();
    }
    if (elevator.direction === "down" /* DOWN */ || elevator.direction === "idle" /* IDLE */) {
      floor.deactivateDownButton();
    }
    await this.delay(CONFIG.DOOR_OPEN_TIME);
    elevator.state = "moving" /* MOVING */;
    elevator.updateStateDisplay();
  }
  processPendingRequests() {
    if (this.pendingRequests.length === 0)
      return;
    const remainingRequests = [];
    for (const request of this.pendingRequests) {
      const bestElevator = this.findBestElevator(request.floor, request.direction);
      if (bestElevator) {
        bestElevator.addDestination(request.floor);
        this.processElevator(bestElevator);
      } else {
        remainingRequests.push(request);
      }
    }
    this.pendingRequests = remainingRequests;
  }
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// script.ts
class ElevatorSimulator {
  building;
  buildingElement = null;
  constructor() {
    this.building = new Building;
  }
  initialize() {
    this.buildingElement = document.getElementById("building");
    if (!this.buildingElement) {
      console.error("Building element not found");
      return;
    }
    this.renderBuilding();
    this.renderElevatorPanels();
    this.initializeElevatorPositions();
  }
  renderBuilding() {
    if (!this.buildingElement)
      return;
    const floorsContainer = document.createElement("div");
    floorsContainer.className = "floors-container";
    for (let i = CONFIG.NUM_FLOORS - 1;i >= 0; i--) {
      const floor = this.building.floors[i];
      const floorElement = document.createElement("div");
      floorElement.className = "floor";
      floorElement.dataset.floor = i.toString();
      const floorLabel = document.createElement("div");
      floorLabel.className = "floor-label";
      floorLabel.textContent = i === 0 ? "G" : i.toString();
      floorElement.appendChild(floorLabel);
      const buttonsContainer = document.createElement("div");
      buttonsContainer.className = "floor-buttons";
      if (floor.hasUpButton()) {
        const upButton = document.createElement("button");
        upButton.className = "floor-button up-button";
        upButton.innerHTML = "▲";
        upButton.addEventListener("click", () => {
          this.building.requestElevator(i, "up" /* UP */);
        });
        buttonsContainer.appendChild(upButton);
        floor.setUpButton(upButton);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "button-placeholder";
        buttonsContainer.appendChild(placeholder);
      }
      if (floor.hasDownButton()) {
        const downButton = document.createElement("button");
        downButton.className = "floor-button down-button";
        downButton.innerHTML = "▼";
        downButton.addEventListener("click", () => {
          this.building.requestElevator(i, "down" /* DOWN */);
        });
        buttonsContainer.appendChild(downButton);
        floor.setDownButton(downButton);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "button-placeholder";
        buttonsContainer.appendChild(placeholder);
      }
      floorElement.appendChild(buttonsContainer);
      const shaftArea = document.createElement("div");
      shaftArea.className = "shaft-area";
      floorElement.appendChild(shaftArea);
      floorsContainer.appendChild(floorElement);
    }
    this.buildingElement.appendChild(floorsContainer);
    const shaftsContainer = document.createElement("div");
    shaftsContainer.className = "shafts-container";
    for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";
      shaft.dataset.elevator = i.toString();
      const car = document.createElement("div");
      car.className = "elevator-car";
      car.id = `elevator-${i}`;
      const stateIndicator = document.createElement("div");
      stateIndicator.className = "elevator-state";
      stateIndicator.textContent = "●";
      car.appendChild(stateIndicator);
      const floorDisplay = document.createElement("div");
      floorDisplay.className = "elevator-floor";
      floorDisplay.textContent = "0";
      car.appendChild(floorDisplay);
      const elevatorId = document.createElement("div");
      elevatorId.className = "elevator-id";
      elevatorId.textContent = `E${i}`;
      car.appendChild(elevatorId);
      shaft.appendChild(car);
      shaftsContainer.appendChild(shaft);
      this.building.elevators[i].setElement(car);
    }
    this.buildingElement.appendChild(shaftsContainer);
  }
  renderElevatorPanels() {
    const panelsContainer = document.getElementById("elevator-panels");
    if (!panelsContainer)
      return;
    for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
      const panel = document.createElement("div");
      panel.className = "elevator-panel";
      const panelTitle = document.createElement("div");
      panelTitle.className = "panel-title";
      panelTitle.textContent = `Elevator ${i}`;
      panel.appendChild(panelTitle);
      const buttonsGrid = document.createElement("div");
      buttonsGrid.className = "panel-buttons";
      for (let j = CONFIG.NUM_FLOORS - 1;j >= 0; j--) {
        const button = document.createElement("button");
        button.className = "panel-button";
        button.textContent = j === 0 ? "G" : j.toString();
        button.addEventListener("click", () => {
          this.building.selectFloorInElevator(i, j);
        });
        buttonsGrid.appendChild(button);
        this.building.elevators[i].setFloorButtonElement(j, button);
      }
      panel.appendChild(buttonsGrid);
      panelsContainer.appendChild(panel);
    }
  }
  initializeElevatorPositions() {
    for (const elevator of this.building.elevators) {
      elevator.updateVisualPosition();
      elevator.updateStateDisplay();
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const simulator = new ElevatorSimulator;
  simulator.initialize();
});
