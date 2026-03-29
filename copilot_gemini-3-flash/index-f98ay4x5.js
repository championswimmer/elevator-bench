// Floor.ts
class Floor {
  floorNumber;
  upButtonActive = false;
  downButtonActive = false;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
  }
  activateButton(direction) {
    if (direction === "UP" /* UP */) {
      this.upButtonActive = true;
    } else if (direction === "DOWN" /* DOWN */) {
      this.downButtonActive = true;
    }
  }
  deactivateButton(direction) {
    if (direction === "UP" /* UP */) {
      this.upButtonActive = false;
    } else if (direction === "DOWN" /* DOWN */) {
      this.downButtonActive = false;
    }
  }
}

// constants.ts
var DEFAULT_FLOORS = 10;
var DEFAULT_ELEVATORS = 4;
var FLOOR_HEIGHT = 100;
var ELEVATOR_SPEED = 1000;

// Elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  targetFloors = new Set;
  direction = "IDLE" /* IDLE */;
  isMoving = false;
  onFloorReached;
  constructor(id, onFloorReached) {
    this.id = id;
    this.onFloorReached = onFloorReached;
  }
  addRequest(floor) {
    this.targetFloors.add(floor);
    if (!this.isMoving) {
      this.processNextRequest();
    }
  }
  async processNextRequest() {
    if (this.targetFloors.size === 0) {
      this.direction = "IDLE" /* IDLE */;
      this.isMoving = false;
      return;
    }
    this.isMoving = true;
    const nextFloor = this.getNextFloor();
    if (nextFloor === null) {
      this.direction = "IDLE" /* IDLE */;
      this.isMoving = false;
      return;
    }
    if (nextFloor > this.currentFloor) {
      this.direction = "UP" /* UP */;
    } else if (nextFloor < this.currentFloor) {
      this.direction = "DOWN" /* DOWN */;
    } else {
      this.targetFloors.delete(this.currentFloor);
      this.onFloorReached(this, this.currentFloor);
      setTimeout(() => this.processNextRequest(), 2000);
      return;
    }
    await this.moveToFloor(nextFloor);
  }
  getNextFloor() {
    const targets = Array.from(this.targetFloors).sort((a, b) => a - b);
    if (this.direction === "UP" /* UP */) {
      const above = targets.filter((f) => f >= this.currentFloor);
      if (above.length > 0)
        return above[0];
      const below = targets.filter((f) => f < this.currentFloor);
      if (below.length > 0)
        return below[below.length - 1];
    } else if (this.direction === "DOWN" /* DOWN */) {
      const below = targets.filter((f) => f <= this.currentFloor);
      if (below.length > 0)
        return below[below.length - 1];
      const above = targets.filter((f) => f > this.currentFloor);
      if (above.length > 0)
        return above[0];
    } else {
      let closest = targets[0];
      let minDiff = Math.abs(targets[0] - this.currentFloor);
      for (const f of targets) {
        const diff = Math.abs(f - this.currentFloor);
        if (diff < minDiff) {
          minDiff = diff;
          closest = f;
        }
      }
      return closest;
    }
    return null;
  }
  async moveToFloor(targetFloor) {
    const step = targetFloor > this.currentFloor ? 1 : -1;
    while (this.currentFloor !== targetFloor) {
      await new Promise((resolve) => setTimeout(resolve, ELEVATOR_SPEED));
      this.currentFloor += step;
      if (this.targetFloors.has(this.currentFloor)) {
        this.targetFloors.delete(this.currentFloor);
        this.onFloorReached(this, this.currentFloor);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const next = this.getNextFloor();
        if (next === null)
          break;
        if (next !== targetFloor) {
          targetFloor = next;
        }
      }
    }
    this.processNextRequest();
  }
}

// Building.ts
class Building {
  floors;
  elevators;
  requestQueue = [];
  constructor(numFloors, numElevators, onFloorReached) {
    this.floors = Array.from({ length: numFloors }, (_, i) => new Floor(i));
    this.elevators = Array.from({ length: numElevators }, (_, i) => new Elevator(i, onFloorReached));
  }
  requestElevator(floor, direction) {
    const floorObj = this.floors[floor];
    if (direction === "UP" /* UP */ && floorObj.upButtonActive)
      return;
    if (direction === "DOWN" /* DOWN */ && floorObj.downButtonActive)
      return;
    floorObj.activateButton(direction);
    const bestElevator = this.findBestElevator(floor, direction);
    if (bestElevator) {
      bestElevator.addRequest(floor);
    } else {
      this.requestQueue.push({ floor, direction });
    }
  }
  findBestElevator(floor, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      const distance = Math.abs(elevator.currentFloor - floor);
      if (elevator.direction === "IDLE" /* IDLE */) {
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      } else if (elevator.direction === direction) {
        if (direction === "UP" /* UP */ && elevator.currentFloor <= floor) {
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        } else if (direction === "DOWN" /* DOWN */ && elevator.currentFloor >= floor) {
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }
    }
    return bestElevator;
  }
  processQueue() {
    if (this.requestQueue.length === 0)
      return;
    const remainingQueue = [];
    for (const request of this.requestQueue) {
      const bestElevator = this.findBestElevator(request.floor, request.direction);
      if (bestElevator) {
        bestElevator.addRequest(request.floor);
      } else {
        remainingQueue.push(request);
      }
    }
    this.requestQueue = remainingQueue;
  }
}

// script.ts
class ElevatorSimulator {
  building;
  floorElements = [];
  elevatorElements = [];
  constructor() {
    this.building = new Building(DEFAULT_FLOORS, DEFAULT_ELEVATORS, this.onFloorReached.bind(this));
    this.initUI();
    this.startUpdateLoop();
  }
  initUI() {
    const app = document.getElementById("app");
    if (!app)
      return;
    const buildingContainer = document.createElement("div");
    buildingContainer.className = "building";
    buildingContainer.style.height = `${DEFAULT_FLOORS * FLOOR_HEIGHT}px`;
    for (let i = DEFAULT_FLOORS - 1;i >= 0; i--) {
      const floorDiv = document.createElement("div");
      floorDiv.className = "floor";
      floorDiv.style.height = `${FLOOR_HEIGHT}px`;
      floorDiv.innerHTML = `
                <div class="floor-label">Floor ${i}</div>
                <div class="floor-buttons">
                    ${i < DEFAULT_FLOORS - 1 ? `<button class="up-btn" data-floor="${i}">UP</button>` : ""}
                    ${i > 0 ? `<button class="down-btn" data-floor="${i}">DOWN</button>` : ""}
                </div>
            `;
      buildingContainer.appendChild(floorDiv);
      this.floorElements[i] = floorDiv;
    }
    const elevatorShaft = document.createElement("div");
    elevatorShaft.className = "elevator-shaft";
    for (let i = 0;i < DEFAULT_ELEVATORS; i++) {
      const elevatorDiv = document.createElement("div");
      elevatorDiv.className = "elevator";
      elevatorDiv.id = `elevator-${i}`;
      elevatorDiv.style.left = `${60 + i * 60}px`;
      elevatorDiv.style.bottom = "0px";
      const internalButtons = document.createElement("div");
      internalButtons.className = "internal-buttons";
      for (let j = 0;j < DEFAULT_FLOORS; j++) {
        const btn = document.createElement("button");
        btn.innerText = j.toString();
        btn.onclick = () => this.building.elevators[i].addRequest(j);
        internalButtons.appendChild(btn);
      }
      elevatorDiv.appendChild(internalButtons);
      elevatorShaft.appendChild(elevatorDiv);
      this.elevatorElements[i] = elevatorDiv;
    }
    buildingContainer.appendChild(elevatorShaft);
    app.appendChild(buildingContainer);
    app.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("up-btn")) {
        const floor = parseInt(target.getAttribute("data-floor"));
        this.building.requestElevator(floor, "UP" /* UP */);
      } else if (target.classList.contains("down-btn")) {
        const floor = parseInt(target.getAttribute("data-floor"));
        this.building.requestElevator(floor, "DOWN" /* DOWN */);
      }
    });
  }
  onFloorReached(elevator, floor) {
    console.log(`Elevator ${elevator.id} reached floor ${floor}`);
    this.building.floors[floor].deactivateButton(elevator.direction);
    this.building.processQueue();
  }
  startUpdateLoop() {
    const update = () => {
      this.updateUI();
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
  updateUI() {
    this.building.elevators.forEach((elevator, i) => {
      const el = this.elevatorElements[i];
      const targetBottom = elevator.currentFloor * FLOOR_HEIGHT;
      el.style.bottom = `${targetBottom}px`;
      el.setAttribute("data-direction", elevator.direction);
      const buttons = el.querySelectorAll(".internal-buttons button");
      buttons.forEach((btn, idx) => {
        if (elevator.targetFloors.has(idx)) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    });
    this.building.floors.forEach((floor, i) => {
      const floorDiv = this.floorElements[i];
      const upBtn = floorDiv.querySelector(".up-btn");
      const downBtn = floorDiv.querySelector(".down-btn");
      if (upBtn) {
        if (floor.upButtonActive)
          upBtn.classList.add("active");
        else
          upBtn.classList.remove("active");
      }
      if (downBtn) {
        if (floor.downButtonActive)
          downBtn.classList.add("active");
        else
          downBtn.classList.remove("active");
      }
    });
  }
}
new ElevatorSimulator;
