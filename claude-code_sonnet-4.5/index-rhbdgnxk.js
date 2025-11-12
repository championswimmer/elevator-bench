// Elevator.ts
class Elevator {
  id;
  currentFloor;
  destinationFloors;
  direction;
  state;
  element;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.destinationFloors = new Set;
    this.direction = "idle";
    this.state = "idle";
    this.element = null;
  }
  addDestination(floor) {
    if (floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
    }
  }
  getNextDestination() {
    if (this.destinationFloors.size === 0) {
      return null;
    }
    const destinations = Array.from(this.destinationFloors).sort((a, b) => a - b);
    if (this.direction === "up") {
      const floorsAbove = destinations.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
      const floorsBelow = destinations.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
    } else if (this.direction === "down") {
      const floorsBelow = destinations.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
      const floorsAbove = destinations.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
    } else {
      return destinations.reduce((closest, floor) => {
        return Math.abs(floor - this.currentFloor) < Math.abs(closest - this.currentFloor) ? floor : closest;
      });
    }
    return null;
  }
  move() {
    const nextDestination = this.getNextDestination();
    if (nextDestination === null) {
      this.direction = "idle";
      this.state = "idle";
      return;
    }
    if (nextDestination > this.currentFloor) {
      this.direction = "up";
      this.currentFloor++;
    } else if (nextDestination < this.currentFloor) {
      this.direction = "down";
      this.currentFloor--;
    }
    this.state = "moving";
    if (this.destinationFloors.has(this.currentFloor)) {
      this.destinationFloors.delete(this.currentFloor);
      this.state = "doors_open";
      if (this.destinationFloors.size === 0) {
        this.direction = "idle";
      } else {
        const destinations = Array.from(this.destinationFloors);
        const hasFloorsAbove = destinations.some((f) => f > this.currentFloor);
        const hasFloorsBelow = destinations.some((f) => f < this.currentFloor);
        if (this.direction === "up" && !hasFloorsAbove) {
          this.direction = "down";
        } else if (this.direction === "down" && !hasFloorsBelow) {
          this.direction = "up";
        }
      }
    }
  }
  updatePosition() {
    if (this.element) {
      const floorHeight = 80;
      const bottomPosition = this.currentFloor * floorHeight;
      this.element.style.bottom = `${bottomPosition}px`;
    }
  }
  isIdle() {
    return this.state === "idle" && this.destinationFloors.size === 0;
  }
  isTravelingToward(floor, direction) {
    if (this.isIdle())
      return false;
    if (direction === "up" && this.direction === "up" && this.currentFloor <= floor) {
      return true;
    }
    if (direction === "down" && this.direction === "down" && this.currentFloor >= floor) {
      return true;
    }
    return false;
  }
  getDistanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
}

// Floor.ts
class Floor {
  floorNumber;
  upButtonPressed;
  downButtonPressed;
  element;
  upButton;
  downButton;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
    this.element = null;
    this.upButton = null;
    this.downButton = null;
  }
  pressUpButton() {
    this.upButtonPressed = true;
    this.updateButtonUI();
  }
  pressDownButton() {
    this.downButtonPressed = true;
    this.updateButtonUI();
  }
  clearUpButton() {
    this.upButtonPressed = false;
    this.updateButtonUI();
  }
  clearDownButton() {
    this.downButtonPressed = false;
    this.updateButtonUI();
  }
  updateButtonUI() {
    if (this.upButton) {
      if (this.upButtonPressed) {
        this.upButton.classList.add("pressed");
      } else {
        this.upButton.classList.remove("pressed");
      }
    }
    if (this.downButton) {
      if (this.downButtonPressed) {
        this.downButton.classList.add("pressed");
      } else {
        this.downButton.classList.remove("pressed");
      }
    }
  }
}

// Building.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var MOVE_INTERVAL = 1000;

class Building {
  floors;
  elevators;
  pendingRequests;
  moveIntervalId;
  constructor() {
    this.floors = [];
    this.elevators = [];
    this.pendingRequests = [];
    this.moveIntervalId = null;
    for (let i = 0;i < NUM_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  requestElevator(floor, direction) {
    if (direction === "up") {
      this.floors[floor].pressUpButton();
    } else if (direction === "down") {
      this.floors[floor].pressDownButton();
    }
    const assigned = this.assignElevator(floor, direction);
    if (!assigned) {
      this.pendingRequests.push({ floor, direction });
    }
  }
  assignElevator(floor, direction) {
    const idleElevators = this.elevators.filter((e) => e.isIdle());
    if (idleElevators.length > 0) {
      const closestIdle = idleElevators.reduce((closest, elevator) => {
        return elevator.getDistanceToFloor(floor) < closest.getDistanceToFloor(floor) ? elevator : closest;
      });
      closestIdle.addDestination(floor);
      closestIdle.direction = direction;
      return true;
    }
    const travelingElevators = this.elevators.filter((e) => e.isTravelingToward(floor, direction));
    if (travelingElevators.length > 0) {
      const closestTraveling = travelingElevators.reduce((closest, elevator) => {
        return elevator.getDistanceToFloor(floor) < closest.getDistanceToFloor(floor) ? elevator : closest;
      });
      closestTraveling.addDestination(floor);
      return true;
    }
    return false;
  }
  selectFloorInElevator(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    elevator.addDestination(floor);
  }
  processPendingRequests() {
    const remainingRequests = [];
    for (const request of this.pendingRequests) {
      const assigned = this.assignElevator(request.floor, request.direction);
      if (!assigned) {
        remainingRequests.push(request);
      }
    }
    this.pendingRequests = remainingRequests;
  }
  clearFloorButton(floor, direction) {
    if (direction === "up") {
      this.floors[floor].clearUpButton();
    } else if (direction === "down") {
      this.floors[floor].clearDownButton();
    }
  }
  checkArrivals() {
    for (const elevator of this.elevators) {
      if (elevator.state === "doors_open") {
        const floor = elevator.currentFloor;
        if (elevator.direction === "up" || this.floors[floor].upButtonPressed) {
          this.clearFloorButton(floor, "up");
        }
        if (elevator.direction === "down" || this.floors[floor].downButtonPressed) {
          this.clearFloorButton(floor, "down");
        }
        if (elevator.direction === "idle") {
          this.clearFloorButton(floor, "up");
          this.clearFloorButton(floor, "down");
        }
      }
    }
  }
  startSimulation() {
    this.moveIntervalId = window.setInterval(() => {
      for (const elevator of this.elevators) {
        elevator.move();
        elevator.updatePosition();
      }
      this.checkArrivals();
      this.processPendingRequests();
      this.updateElevatorDisplay();
    }, MOVE_INTERVAL);
  }
  stopSimulation() {
    if (this.moveIntervalId !== null) {
      clearInterval(this.moveIntervalId);
      this.moveIntervalId = null;
    }
  }
  updateElevatorDisplay() {
    for (const elevator of this.elevators) {
      const elevatorElement = elevator.element;
      if (elevatorElement) {
        const floorDisplay = elevatorElement.querySelector(".elevator-floor");
        const statusDisplay = elevatorElement.querySelector(".elevator-status");
        const destinationsDisplay = elevatorElement.querySelector(".elevator-destinations");
        if (floorDisplay) {
          floorDisplay.textContent = `Floor ${elevator.currentFloor}`;
        }
        if (statusDisplay) {
          let status = "";
          if (elevator.state === "idle") {
            status = "Idle";
          } else if (elevator.state === "doors_open") {
            status = "Doors Open";
          } else if (elevator.direction === "up") {
            status = "↑ Going Up";
          } else if (elevator.direction === "down") {
            status = "↓ Going Down";
          }
          statusDisplay.textContent = status;
        }
        if (destinationsDisplay) {
          const destinations = Array.from(elevator.destinationFloors).sort((a, b) => a - b);
          destinationsDisplay.textContent = destinations.length > 0 ? `→ ${destinations.join(", ")}` : "No destinations";
        }
      }
    }
  }
}

// script.ts
var building = new Building;
function initializeUI() {
  const container = document.getElementById("simulator-container");
  if (!container)
    return;
  const buildingElement = document.createElement("div");
  buildingElement.className = "building";
  for (let i = NUM_FLOORS - 1;i >= 0; i--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.dataset.floor = i.toString();
    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `Floor ${i}`;
    const floorButtons = document.createElement("div");
    floorButtons.className = "floor-buttons";
    if (i < NUM_FLOORS - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-button up-button";
      upButton.textContent = "↑";
      upButton.onclick = () => handleFloorButtonClick(i, "up");
      floorButtons.appendChild(upButton);
      building.floors[i].upButton = upButton;
    }
    if (i > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-button down-button";
      downButton.textContent = "↓";
      downButton.onclick = () => handleFloorButtonClick(i, "down");
      floorButtons.appendChild(downButton);
      building.floors[i].downButton = downButton;
    }
    floorDiv.appendChild(floorLabel);
    floorDiv.appendChild(floorButtons);
    building.floors[i].element = floorDiv;
    buildingElement.appendChild(floorDiv);
  }
  const shaftsContainer = document.createElement("div");
  shaftsContainer.className = "elevator-shafts";
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.dataset.elevatorId = i.toString();
    const elevatorLabel = document.createElement("div");
    elevatorLabel.className = "elevator-label";
    elevatorLabel.textContent = `E${i}`;
    const elevatorFloor = document.createElement("div");
    elevatorFloor.className = "elevator-floor";
    elevatorFloor.textContent = "Floor 0";
    const elevatorStatus = document.createElement("div");
    elevatorStatus.className = "elevator-status";
    elevatorStatus.textContent = "Idle";
    const elevatorDestinations = document.createElement("div");
    elevatorDestinations.className = "elevator-destinations";
    elevatorDestinations.textContent = "No destinations";
    elevatorDiv.appendChild(elevatorLabel);
    elevatorDiv.appendChild(elevatorFloor);
    elevatorDiv.appendChild(elevatorStatus);
    elevatorDiv.appendChild(elevatorDestinations);
    shaft.appendChild(elevatorDiv);
    shaftsContainer.appendChild(shaft);
    building.elevators[i].element = elevatorDiv;
    building.elevators[i].updatePosition();
  }
  container.appendChild(buildingElement);
  container.appendChild(shaftsContainer);
  createControlPanels();
}
function createControlPanels() {
  const panelsContainer = document.getElementById("control-panels");
  if (!panelsContainer)
    return;
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const panel = document.createElement("div");
    panel.className = "control-panel";
    const panelTitle = document.createElement("div");
    panelTitle.className = "panel-title";
    panelTitle.textContent = `Elevator ${i} Controls`;
    const buttonsGrid = document.createElement("div");
    buttonsGrid.className = "panel-buttons";
    for (let floor = 0;floor < NUM_FLOORS; floor++) {
      const button = document.createElement("button");
      button.className = "panel-button";
      button.textContent = floor.toString();
      button.onclick = () => handleElevatorButtonClick(i, floor);
      buttonsGrid.appendChild(button);
    }
    panel.appendChild(panelTitle);
    panel.appendChild(buttonsGrid);
    panelsContainer.appendChild(panel);
  }
}
function handleFloorButtonClick(floor, direction) {
  building.requestElevator(floor, direction);
}
function handleElevatorButtonClick(elevatorId, floor) {
  building.selectFloorInElevator(elevatorId, floor);
}
document.addEventListener("DOMContentLoaded", () => {
  initializeUI();
  building.startSimulation();
});
window.addEventListener("beforeunload", () => {
  building.stopSimulation();
});
