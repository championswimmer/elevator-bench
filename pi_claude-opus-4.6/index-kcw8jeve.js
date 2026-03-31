// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  destinationFloors;
  moving;
  doorOpen;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle";
    this.destinationFloors = new Set;
    this.moving = false;
    this.doorOpen = false;
  }
  addDestination(floor) {
    if (floor !== this.currentFloor) {
      this.destinationFloors.add(floor);
    }
  }
  removeDestination(floor) {
    this.destinationFloors.delete(floor);
  }
  hasDestination(floor) {
    return this.destinationFloors.has(floor);
  }
  get isIdle() {
    return this.direction === "idle" && this.destinationFloors.size === 0 && !this.moving;
  }
  getNextFloor(totalFloors) {
    if (this.destinationFloors.size === 0)
      return null;
    const floors = Array.from(this.destinationFloors).sort((a, b) => a - b);
    if (this.direction === "up") {
      const floorsAbove = floors.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        return floorsAbove[0];
      }
      const floorsBelow = floors.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        this.direction = "down";
        return floorsBelow[floorsBelow.length - 1];
      }
    } else if (this.direction === "down") {
      const floorsBelow = floors.filter((f) => f < this.currentFloor);
      if (floorsBelow.length > 0) {
        return floorsBelow[floorsBelow.length - 1];
      }
      const floorsAbove = floors.filter((f) => f > this.currentFloor);
      if (floorsAbove.length > 0) {
        this.direction = "up";
        return floorsAbove[0];
      }
    } else {
      let closest = floors[0];
      let minDist = Math.abs(floors[0] - this.currentFloor);
      for (const f of floors) {
        const dist = Math.abs(f - this.currentFloor);
        if (dist < minDist) {
          minDist = dist;
          closest = f;
        }
      }
      this.direction = closest > this.currentFloor ? "up" : "down";
      return closest;
    }
    return null;
  }
  distanceTo(floor, totalFloors) {
    if (this.isIdle) {
      return Math.abs(this.currentFloor - floor);
    }
    if (this.direction === "up" && floor >= this.currentFloor) {
      return floor - this.currentFloor;
    }
    if (this.direction === "down" && floor <= this.currentFloor) {
      return this.currentFloor - floor;
    }
    if (this.direction === "up") {
      const maxDest = Math.max(...Array.from(this.destinationFloors), this.currentFloor);
      return maxDest - this.currentFloor + (maxDest - floor);
    }
    if (this.direction === "down") {
      const minDest = Math.min(...Array.from(this.destinationFloors), this.currentFloor);
      return this.currentFloor - minDest + (floor - minDest);
    }
    return Math.abs(this.currentFloor - floor);
  }
}

// Floor.ts
class Floor {
  number;
  upRequested;
  downRequested;
  isTopFloor;
  isBottomFloor;
  constructor(number, totalFloors) {
    this.number = number;
    this.upRequested = false;
    this.downRequested = false;
    this.isTopFloor = number === totalFloors - 1;
    this.isBottomFloor = number === 0;
  }
  requestUp() {
    if (this.isTopFloor)
      return false;
    this.upRequested = true;
    return true;
  }
  requestDown() {
    if (this.isBottomFloor)
      return false;
    this.downRequested = true;
    return true;
  }
  clearUp() {
    this.upRequested = false;
  }
  clearDown() {
    this.downRequested = false;
  }
}

// Building.ts
class Building {
  totalFloors;
  totalElevators;
  floors;
  elevators;
  pendingRequests;
  tickInterval = null;
  onUpdate = null;
  static FLOOR_TRAVEL_TIME = 600;
  static DOOR_OPEN_TIME = 1200;
  static TICK_INTERVAL = 100;
  constructor(totalFloors = 10, totalElevators = 4) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.pendingRequests = [];
    for (let i = 0;i < totalFloors; i++) {
      this.floors.push(new Floor(i, totalFloors));
    }
    for (let i = 0;i < totalElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  setUpdateCallback(callback) {
    this.onUpdate = callback;
  }
  triggerUpdate() {
    if (this.onUpdate)
      this.onUpdate();
  }
  requestFromFloor(floorNum, direction) {
    const floor = this.floors[floorNum];
    if (!floor)
      return;
    if (direction === "up" && !floor.requestUp())
      return;
    if (direction === "down" && !floor.requestDown())
      return;
    const assigned = this.assignElevator(floorNum, direction);
    if (!assigned) {
      this.pendingRequests.push({
        floor: floorNum,
        direction,
        timestamp: Date.now()
      });
    }
    this.triggerUpdate();
  }
  selectFloorInElevator(elevatorId, floorNum) {
    const elevator = this.elevators[elevatorId];
    if (!elevator || floorNum < 0 || floorNum >= this.totalFloors)
      return;
    if (floorNum === elevator.currentFloor && !elevator.moving)
      return;
    elevator.addDestination(floorNum);
    if (elevator.direction === "idle") {
      elevator.direction = floorNum > elevator.currentFloor ? "up" : "down";
      this.startElevatorMovement(elevator);
    }
    this.triggerUpdate();
  }
  assignElevator(floor, direction) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      let score;
      if (elevator.isIdle) {
        score = Math.abs(elevator.currentFloor - floor);
      } else if (elevator.direction === "up" && direction === "up" && elevator.currentFloor <= floor || elevator.direction === "down" && direction === "down" && elevator.currentFloor >= floor) {
        score = Math.abs(elevator.currentFloor - floor) + 0.5;
      } else {
        score = elevator.distanceTo(floor, this.totalFloors) + this.totalFloors;
      }
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }
    if (bestElevator) {
      bestElevator.addDestination(floor);
      if (bestElevator.direction === "idle") {
        bestElevator.direction = floor > bestElevator.currentFloor ? "up" : floor < bestElevator.currentFloor ? "down" : "idle";
        if (bestElevator.direction !== "idle") {
          this.startElevatorMovement(bestElevator);
        }
      }
      return true;
    }
    return false;
  }
  startElevatorMovement(elevator) {
    if (elevator.moving)
      return;
    const moveStep = () => {
      const nextFloor = elevator.getNextFloor(this.totalFloors);
      if (nextFloor === null) {
        elevator.direction = "idle";
        elevator.moving = false;
        this.processPendingRequests();
        this.triggerUpdate();
        return;
      }
      elevator.moving = true;
      const direction = nextFloor > elevator.currentFloor ? 1 : -1;
      elevator.direction = direction > 0 ? "up" : "down";
      const moveOneFloor = () => {
        elevator.currentFloor += direction;
        this.triggerUpdate();
        if (this.shouldStopAtFloor(elevator, elevator.currentFloor)) {
          this.arriveAtFloor(elevator, elevator.currentFloor);
          setTimeout(() => {
            elevator.doorOpen = false;
            this.triggerUpdate();
            const next = elevator.getNextFloor(this.totalFloors);
            if (next !== null) {
              setTimeout(moveStep, 200);
            } else {
              elevator.direction = "idle";
              elevator.moving = false;
              this.processPendingRequests();
              this.triggerUpdate();
            }
          }, Building.DOOR_OPEN_TIME);
        } else if (elevator.currentFloor !== nextFloor) {
          setTimeout(moveOneFloor, Building.FLOOR_TRAVEL_TIME);
        } else {
          this.arriveAtFloor(elevator, elevator.currentFloor);
          setTimeout(() => {
            elevator.doorOpen = false;
            this.triggerUpdate();
            const next = elevator.getNextFloor(this.totalFloors);
            if (next !== null) {
              setTimeout(moveStep, 200);
            } else {
              elevator.direction = "idle";
              elevator.moving = false;
              this.processPendingRequests();
              this.triggerUpdate();
            }
          }, Building.DOOR_OPEN_TIME);
        }
      };
      setTimeout(moveOneFloor, Building.FLOOR_TRAVEL_TIME);
    };
    moveStep();
  }
  shouldStopAtFloor(elevator, floor) {
    if (elevator.hasDestination(floor))
      return true;
    const floorObj = this.floors[floor];
    if (elevator.direction === "up" && floorObj.upRequested)
      return true;
    if (elevator.direction === "down" && floorObj.downRequested)
      return true;
    if (floor === this.totalFloors - 1 && floorObj.downRequested)
      return true;
    if (floor === 0 && floorObj.upRequested)
      return true;
    return false;
  }
  arriveAtFloor(elevator, floor) {
    elevator.doorOpen = true;
    elevator.removeDestination(floor);
    const floorObj = this.floors[floor];
    if (elevator.direction === "up" || floor === 0) {
      if (floorObj.upRequested) {
        floorObj.clearUp();
        this.removePendingRequest(floor, "up");
      }
    }
    if (elevator.direction === "down" || floor === this.totalFloors - 1) {
      if (floorObj.downRequested) {
        floorObj.clearDown();
        this.removePendingRequest(floor, "down");
      }
    }
    this.triggerUpdate();
  }
  removePendingRequest(floor, direction) {
    this.pendingRequests = this.pendingRequests.filter((r) => !(r.floor === floor && r.direction === direction));
  }
  processPendingRequests() {
    const remaining = [];
    for (const request of this.pendingRequests) {
      const floor = this.floors[request.floor];
      const isStillActive = request.direction === "up" ? floor.upRequested : floor.downRequested;
      if (isStillActive) {
        const assigned = this.assignElevator(request.floor, request.direction);
        if (!assigned) {
          remaining.push(request);
        }
      }
    }
    this.pendingRequests = remaining;
  }
}

// script.ts
var TOTAL_FLOORS = 10;
var TOTAL_ELEVATORS = 4;
var building = new Building(TOTAL_FLOORS, TOTAL_ELEVATORS);
var buildingEl = document.getElementById("building");
var elevatorShaftsEl = document.getElementById("elevator-shafts");
var floorsEl = document.getElementById("floors");
var activePanelElevator = 0;
function initializeDOM() {
  for (let i = TOTAL_FLOORS - 1;i >= 0; i--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.dataset.floor = String(i);
    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `F${i}`;
    const floorButtons = document.createElement("div");
    floorButtons.className = "floor-buttons";
    if (i < TOTAL_FLOORS - 1) {
      const upBtn = document.createElement("button");
      upBtn.className = "hall-btn hall-btn-up";
      upBtn.dataset.floor = String(i);
      upBtn.dataset.direction = "up";
      upBtn.innerHTML = "▲";
      upBtn.title = `Call elevator up from floor ${i}`;
      upBtn.addEventListener("click", () => handleHallCall(i, "up"));
      floorButtons.appendChild(upBtn);
    }
    if (i > 0) {
      const downBtn = document.createElement("button");
      downBtn.className = "hall-btn hall-btn-down";
      downBtn.dataset.floor = String(i);
      downBtn.dataset.direction = "down";
      downBtn.innerHTML = "▼";
      downBtn.title = `Call elevator down from floor ${i}`;
      downBtn.addEventListener("click", () => handleHallCall(i, "down"));
      floorButtons.appendChild(downBtn);
    }
    floorDiv.appendChild(floorLabel);
    floorDiv.appendChild(floorButtons);
    floorsEl.appendChild(floorDiv);
  }
  for (let e = 0;e < TOTAL_ELEVATORS; e++) {
    const shaftDiv = document.createElement("div");
    shaftDiv.className = "shaft";
    shaftDiv.dataset.elevator = String(e);
    const shaftLabel = document.createElement("div");
    shaftLabel.className = "shaft-label";
    shaftLabel.textContent = `E${e}`;
    shaftDiv.appendChild(shaftLabel);
    for (let i = TOTAL_FLOORS - 1;i >= 0; i--) {
      const cell = document.createElement("div");
      cell.className = "shaft-cell";
      cell.dataset.elevator = String(e);
      cell.dataset.floor = String(i);
      shaftDiv.appendChild(cell);
    }
    const carDiv = document.createElement("div");
    carDiv.className = "elevator-car";
    carDiv.id = `elevator-${e}`;
    carDiv.dataset.elevator = String(e);
    carDiv.innerHTML = `<span class="car-id">E${e}</span><span class="car-direction"></span>`;
    carDiv.addEventListener("click", () => setActivePanelElevator(e));
    shaftDiv.appendChild(carDiv);
    elevatorShaftsEl.appendChild(shaftDiv);
  }
  buildElevatorPanel();
}
function buildElevatorPanel() {
  const panelEl = document.getElementById("elevator-panel");
  panelEl.innerHTML = "";
  const tabsDiv = document.createElement("div");
  tabsDiv.className = "panel-tabs";
  for (let e = 0;e < TOTAL_ELEVATORS; e++) {
    const tab = document.createElement("button");
    tab.className = `panel-tab${e === activePanelElevator ? " active" : ""}`;
    tab.textContent = `E${e}`;
    tab.addEventListener("click", () => setActivePanelElevator(e));
    tabsDiv.appendChild(tab);
  }
  panelEl.appendChild(tabsDiv);
  const displayDiv = document.createElement("div");
  displayDiv.className = "panel-display";
  displayDiv.id = "panel-display";
  displayDiv.textContent = "0";
  panelEl.appendChild(displayDiv);
  const gridDiv = document.createElement("div");
  gridDiv.className = "panel-grid";
  for (let i = TOTAL_FLOORS - 1;i >= 0; i--) {
    const btn = document.createElement("button");
    btn.className = "panel-btn";
    btn.dataset.floor = String(i);
    btn.textContent = String(i);
    btn.addEventListener("click", () => handleCarCall(activePanelElevator, i));
    gridDiv.appendChild(btn);
  }
  panelEl.appendChild(gridDiv);
}
function setActivePanelElevator(elevatorId) {
  activePanelElevator = elevatorId;
  buildElevatorPanel();
  updateDisplay();
}
function handleHallCall(floor, direction) {
  building.requestFromFloor(floor, direction);
}
function handleCarCall(elevatorId, floor) {
  building.selectFloorInElevator(elevatorId, floor);
}
function updateDisplay() {
  for (const floor of building.floors) {
    const upBtn = document.querySelector(`.hall-btn-up[data-floor="${floor.number}"]`);
    const downBtn = document.querySelector(`.hall-btn-down[data-floor="${floor.number}"]`);
    if (upBtn) {
      upBtn.classList.toggle("active", floor.upRequested);
    }
    if (downBtn) {
      downBtn.classList.toggle("active", floor.downRequested);
    }
  }
  for (const elevator of building.elevators) {
    const carEl = document.getElementById(`elevator-${elevator.id}`);
    if (!carEl)
      continue;
    const floorHeight = 52;
    const bottomOffset = elevator.currentFloor * floorHeight;
    carEl.style.bottom = `${bottomOffset}px`;
    const dirEl = carEl.querySelector(".car-direction");
    if (elevator.direction === "up") {
      dirEl.textContent = "▲";
    } else if (elevator.direction === "down") {
      dirEl.textContent = "▼";
    } else {
      dirEl.textContent = "●";
    }
    carEl.classList.toggle("door-open", elevator.doorOpen);
    carEl.classList.toggle("moving", elevator.moving && !elevator.doorOpen);
    const shaftCells = document.querySelectorAll(`.shaft-cell[data-elevator="${elevator.id}"]`);
    shaftCells.forEach((cell) => {
      const cellFloor = parseInt(cell.getAttribute("data-floor"));
      cell.classList.toggle("destination", elevator.hasDestination(cellFloor));
      cell.classList.toggle("current", cellFloor === elevator.currentFloor);
    });
  }
  const panelDisplay = document.getElementById("panel-display");
  if (panelDisplay) {
    const elevator = building.elevators[activePanelElevator];
    panelDisplay.textContent = String(elevator.currentFloor);
    panelDisplay.className = `panel-display ${elevator.direction}`;
  }
  const panelBtns = document.querySelectorAll(".panel-btn");
  panelBtns.forEach((btn) => {
    const floor = parseInt(btn.getAttribute("data-floor"));
    const elevator = building.elevators[activePanelElevator];
    btn.classList.toggle("active", elevator.hasDestination(floor));
    btn.classList.toggle("current", floor === elevator.currentFloor);
  });
}
building.setUpdateCallback(updateDisplay);
initializeDOM();
updateDisplay();
