// src/elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  destinationFloors;
  isIdle;
  isMoving;
  targetFloor;
  maxFloors;
  speed;
  constructor(id, maxFloors, speed = 0.5) {
    this.id = id;
    this.maxFloors = maxFloors;
    this.speed = speed;
    this.currentFloor = 0;
    this.direction = "idle";
    this.destinationFloors = new Set;
    this.isIdle = true;
    this.isMoving = false;
    this.targetFloor = null;
  }
  requestFloor(floor) {
    this.destinationFloors.add(floor);
    this.updateDirection();
  }
  updateDirection() {
    if (this.destinationFloors.size === 0) {
      this.direction = "idle";
      this.isIdle = true;
      this.isMoving = false;
      this.targetFloor = null;
      return;
    }
    this.isIdle = false;
    let closestFloor = null;
    let minDistance = Infinity;
    for (const floor of this.destinationFloors) {
      const distance = Math.abs(floor - this.currentFloor);
      if (distance < minDistance) {
        minDistance = distance;
        closestFloor = floor;
      }
    }
    if (closestFloor !== null) {
      this.targetFloor = closestFloor;
      if (closestFloor > this.currentFloor) {
        this.direction = "up";
      } else if (closestFloor < this.currentFloor) {
        this.direction = "down";
      } else {
        this.direction = "idle";
      }
      this.isMoving = this.direction !== "idle";
    }
  }
  step() {
    if (!this.isMoving || this.targetFloor === null) {
      return false;
    }
    const prevFloor = this.currentFloor;
    if (this.direction === "up") {
      this.currentFloor += this.speed;
      if (this.currentFloor >= this.targetFloor) {
        this.currentFloor = this.targetFloor;
        this.direction = "idle";
        this.isMoving = false;
        this.destinationFloors.delete(this.targetFloor);
        this.updateDirection();
      }
    } else if (this.direction === "down") {
      this.currentFloor -= this.speed;
      if (this.currentFloor <= this.targetFloor) {
        this.currentFloor = this.targetFloor;
        this.direction = "idle";
        this.isMoving = false;
        this.destinationFloors.delete(this.targetFloor);
        this.updateDirection();
      }
    }
    return this.currentFloor !== prevFloor;
  }
  getProgress() {
    if (this.targetFloor === null || !this.isMoving) {
      return 0;
    }
    const distanceToTarget = Math.abs(this.targetFloor - this.currentFloor);
    const totalDistance = Math.abs(this.targetFloor - (this.currentFloor - (this.direction === "up" ? this.speed : -this.speed)));
    if (totalDistance === 0)
      return 1;
    return Math.min(1, 1 - distanceToTarget / totalDistance);
  }
  getNormalizedPosition() {
    return this.currentFloor / (this.maxFloors - 1);
  }
  getFloor() {
    return Math.round(this.currentFloor);
  }
  canServeRequest(floor, requestedDirection) {
    if (this.direction === "idle") {
      return true;
    }
    if (requestedDirection === "up") {
      return this.direction === "up" && floor >= this.currentFloor;
    } else {
      return this.direction === "down" && floor <= this.currentFloor;
    }
  }
  isDirectionValid(floor) {
    if (this.direction === "idle") {
      return true;
    }
    if (this.direction === "up") {
      return floor >= this.currentFloor;
    } else {
      return floor <= this.currentFloor;
    }
  }
}

// src/floor.ts
class Floor {
  floorNumber;
  totalFloors;
  upButtonPressed;
  downButtonPressed;
  requests;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.totalFloors = totalFloors;
    this.upButtonPressed = false;
    this.downButtonPressed = false;
    this.requests = [];
  }
  isTopFloor() {
    return this.floorNumber === this.totalFloors - 1;
  }
  isBottomFloor() {
    return this.floorNumber === 0;
  }
  hasUpButton() {
    return !this.isTopFloor();
  }
  hasDownButton() {
    return !this.isBottomFloor();
  }
  pressUpButton() {
    if (this.hasUpButton() && !this.upButtonPressed) {
      this.upButtonPressed = true;
      this.requests.push({
        floor: this.floorNumber,
        direction: "up",
        timestamp: Date.now()
      });
    }
  }
  pressDownButton() {
    if (this.hasDownButton() && !this.downButtonPressed) {
      this.downButtonPressed = true;
      this.requests.push({
        floor: this.floorNumber,
        direction: "down",
        timestamp: Date.now()
      });
    }
  }
  releaseUpButton() {
    this.upButtonPressed = false;
  }
  releaseDownButton() {
    this.downButtonPressed = false;
  }
  resetButtons() {
    this.upButtonPressed = false;
    this.downButtonPressed = false;
  }
  getRequestDirection() {
    if (this.upButtonPressed)
      return "up";
    if (this.downButtonPressed)
      return "down";
    return null;
  }
}

// src/building.ts
class Building {
  totalFloors;
  numElevators;
  floors;
  elevators;
  config;
  requestQueue;
  constructor(config) {
    this.config = config;
    this.totalFloors = config.totalFloors;
    this.numElevators = config.numElevators;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    for (let i = 0;i < this.totalFloors; i++) {
      this.floors.push(new Floor(i, this.totalFloors));
    }
    for (let i = 0;i < this.numElevators; i++) {
      this.elevators.push(new Elevator(i, this.totalFloors, config.elevatorSpeed));
    }
  }
  requestElevator(floor, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.direction === "idle") {
        const distance = Math.abs(elevator.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      } else if (elevator.direction === direction) {
        if (direction === "up" && elevator.currentFloor <= floor) {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        } else if (direction === "down" && elevator.currentFloor >= floor) {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }
    }
    if (bestElevator) {
      bestElevator.requestFloor(floor);
    } else {
      this.requestQueue.push({ floor, direction });
    }
    const floorObj = this.floors[floor];
    if (direction === "up") {
      floorObj.pressUpButton();
    } else {
      floorObj.pressDownButton();
    }
  }
  selectDestination(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (elevator) {
      elevator.requestFloor(floor);
    }
  }
  step() {
    for (const elevator of this.elevators) {
      elevator.step();
    }
    for (const floor of this.floors) {
      const hasUpRequest = this.elevators.some((e) => e.destinationFloors.has(floor.floorNumber) && e.direction === "up");
      const hasDownRequest = this.elevators.some((e) => e.destinationFloors.has(floor.floorNumber) && e.direction === "down");
      if (!hasUpRequest && !hasDownRequest) {
        floor.resetButtons();
      }
    }
    this.processQueue();
  }
  processQueue() {
    for (let i = this.requestQueue.length - 1;i >= 0; i--) {
      const { floor, direction } = this.requestQueue[i];
      let assigned = false;
      let bestElevator = null;
      let minDistance = Infinity;
      for (const elevator of this.elevators) {
        if (elevator.direction === "idle") {
          const distance = Math.abs(elevator.currentFloor - floor);
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }
      if (bestElevator) {
        bestElevator.requestFloor(floor);
        this.requestQueue.splice(i, 1);
        assigned = true;
      }
      if (assigned) {
        const floorObj = this.floors[floor];
        if (direction === "up") {
          floorObj.pressUpButton();
        } else {
          floorObj.pressDownButton();
        }
      }
    }
  }
  getElevatorState(id) {
    const elevator = this.elevators[id];
    if (!elevator)
      return null;
    return {
      id: elevator.id,
      currentFloor: elevator.currentFloor,
      direction: elevator.direction,
      destinationFloors: Array.from(elevator.destinationFloors),
      isIdle: elevator.isIdle,
      isMoving: elevator.isMoving,
      targetFloor: elevator.targetFloor
    };
  }
  getFloorState(floorNumber) {
    const floor = this.floors[floorNumber];
    if (!floor)
      return null;
    return {
      floorNumber: floor.floorNumber,
      upButtonPressed: floor.upButtonPressed,
      downButtonPressed: floor.downButtonPressed
    };
  }
}

// src/script.ts
var PORT = 8666;
var TOTAL_FLOORS = 10;
var NUM_ELEVATORS = 4;
var ELEVATOR_SPEED = 0.5;
var config = {
  totalFloors: TOTAL_FLOORS,
  numElevators: NUM_ELEVATORS,
  elevatorSpeed: ELEVATOR_SPEED
};
var building = new Building(config);
var simulationRunning = false;
var animationFrameId = null;
function initUI() {
  const container = document.getElementById("building-container");
  if (!container)
    return;
  for (let i = TOTAL_FLOORS - 1;i >= 0; i--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.dataset.floor = i.toString();
    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = `Floor ${i}`;
    floorDiv.appendChild(floorLabel);
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "floor-buttons";
    if (i < TOTAL_FLOORS - 1) {
      const upButton = document.createElement("button");
      upButton.className = "button up";
      upButton.innerHTML = "&#8593;";
      upButton.title = "Call Elevator Up";
      upButton.onclick = () => handleFloorRequest(i, "up");
      buttonContainer.appendChild(upButton);
    }
    if (i > 0) {
      const downButton = document.createElement("button");
      downButton.className = "button down";
      downButton.innerHTML = "&#8595;";
      downButton.title = "Call Elevator Down";
      downButton.onclick = () => handleFloorRequest(i, "down");
      buttonContainer.appendChild(downButton);
    }
    floorDiv.appendChild(buttonContainer);
    container.appendChild(floorDiv);
  }
  const shaftDiv = document.createElement("div");
  shaftDiv.className = "elevator-shaft";
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${i}`;
    elevatorDiv.dataset.elevator = i.toString();
    const displayDiv = document.createElement("div");
    displayDiv.className = "elevator-display";
    displayDiv.textContent = "0";
    elevatorDiv.appendChild(displayDiv);
    const doorsDiv = document.createElement("div");
    doorsDiv.className = "elevator-doors";
    elevatorDiv.appendChild(doorsDiv);
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "elevator-buttons";
    for (let f = 0;f < TOTAL_FLOORS; f++) {
      const btn = document.createElement("button");
      btn.className = "floor-button";
      btn.textContent = f.toString();
      btn.onclick = () => handleDestinationRequest(i, f);
      buttonsDiv.appendChild(btn);
    }
    elevatorDiv.appendChild(buttonsDiv);
    shaftDiv.appendChild(elevatorDiv);
  }
  container.appendChild(shaftDiv);
  const controlPanel = document.createElement("div");
  controlPanel.className = "control-panel";
  const startBtn = document.createElement("button");
  startBtn.textContent = "Start Simulation";
  startBtn.onclick = toggleSimulation;
  controlPanel.appendChild(startBtn);
  const resetBtn = document.createElement("button");
  resetBtn.textContent = "Reset";
  resetBtn.onclick = resetSimulation;
  controlPanel.appendChild(resetBtn);
  const infoDiv = document.createElement("div");
  infoDiv.className = "simulation-info";
  infoDiv.innerHTML = `
    <div>Port: ${PORT}</div>
    <div>Floors: ${TOTAL_FLOORS}</div>
    <div>Elevators: ${NUM_ELEVATORS}</div>
  `;
  controlPanel.appendChild(infoDiv);
  container.appendChild(controlPanel);
}
function handleFloorRequest(floor, direction) {
  building.requestElevator(floor, direction);
  updateUI();
}
function handleDestinationRequest(elevatorId, floor) {
  building.selectDestination(elevatorId, floor);
  updateUI();
}
function toggleSimulation() {
  simulationRunning = !simulationRunning;
  const btn = document.querySelector(".control-panel button:first-child");
  if (simulationRunning) {
    btn.textContent = "Pause Simulation";
    animate();
  } else {
    btn.textContent = "Start Simulation";
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
}
function resetSimulation() {
  simulationRunning = false;
  const btn = document.querySelector(".control-panel button:first-child");
  btn.textContent = "Start Simulation";
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  for (let i = 0;i < config.numElevators; i++) {
    building.elevators[i] = new Elevator(i, config.totalFloors, config.elevatorSpeed);
  }
  building.requestQueue = [];
  for (const floor of building.floors) {
    floor.resetButtons();
  }
  updateUI();
}
function animate() {
  if (!simulationRunning)
    return;
  building.step();
  updateUI();
  animationFrameId = requestAnimationFrame(animate);
}
function updateUI() {
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const elevator = building.elevators[i];
    const elevatorDiv = document.getElementById(`elevator-${i}`);
    if (elevatorDiv) {
      const normalizedPosition = elevator.getNormalizedPosition();
      const topPosition = 100 - normalizedPosition * 100 - 5;
      elevatorDiv.style.top = `${topPosition}%`;
      const display = elevatorDiv.querySelector(".elevator-display");
      if (display) {
        display.textContent = elevator.getFloor().toString();
      }
      if (elevator.direction === "up") {
        elevatorDiv.classList.add("moving-up");
        elevatorDiv.classList.remove("moving-down");
      } else if (elevator.direction === "down") {
        elevatorDiv.classList.add("moving-down");
        elevatorDiv.classList.remove("moving-up");
      } else {
        elevatorDiv.classList.remove("moving-up", "moving-down");
      }
    }
  }
  for (let i = 0;i < TOTAL_FLOORS; i++) {
    const floor = building.floors[i];
    const floorDiv = document.querySelector(`.floor[data-floor="${i}"]`);
    if (floorDiv) {
      const upButton = floorDiv.querySelector(".button.up");
      const downButton = floorDiv.querySelector(".button.down");
      if (upButton) {
        if (floor.upButtonPressed) {
          upButton.classList.add("active");
        } else {
          upButton.classList.remove("active");
        }
      }
      if (downButton) {
        if (floor.downButtonPressed) {
          downButton.classList.add("active");
        } else {
          downButton.classList.remove("active");
        }
      }
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  updateUI();
});
