// elevator.ts
class Elevator {
  id;
  currentFloor;
  targetFloor;
  direction;
  state;
  destinations;
  doorOpenTimer;
  DOOR_OPEN_TIME = 2000;
  MOVE_TIME = 1000;
  lastMoveTime;
  onStateChange;
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.targetFloor = null;
    this.direction = "idle";
    this.state = "idle";
    this.destinations = new Set;
    this.doorOpenTimer = 0;
    this.lastMoveTime = 0;
    this.onStateChange = null;
  }
  setOnStateChange(callback) {
    this.onStateChange = callback;
  }
  notifyChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
  addDestination(floor) {
    if (floor === this.currentFloor && this.state === "idle") {
      this.openDoors();
      return true;
    }
    if (!this.destinations.has(floor)) {
      this.destinations.add(floor);
      this.updateDirection();
      this.notifyChange();
      return true;
    }
    return false;
  }
  canAcceptRequest(floor, direction) {
    if (this.state === "idle") {
      return true;
    }
    if (this.direction === "up" && direction === "up" && floor > this.currentFloor) {
      return true;
    }
    if (this.direction === "down" && direction === "down" && floor < this.currentFloor) {
      return true;
    }
    return false;
  }
  getDistanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  updateDirection() {
    if (this.destinations.size === 0) {
      this.direction = "idle";
      this.targetFloor = null;
      return;
    }
    const destinations = Array.from(this.destinations);
    if (this.direction === "idle") {
      let closest = destinations[0];
      let minDist = Math.abs(closest - this.currentFloor);
      for (const d of destinations) {
        const dist = Math.abs(d - this.currentFloor);
        if (dist < minDist) {
          minDist = dist;
          closest = d;
        }
      }
      this.targetFloor = closest;
      this.direction = this.targetFloor > this.currentFloor ? "up" : "down";
    } else if (this.direction === "up") {
      const upDests = destinations.filter((d) => d > this.currentFloor);
      if (upDests.length > 0) {
        this.targetFloor = Math.min(...upDests);
      } else {
        const downDests = destinations.filter((d) => d < this.currentFloor);
        if (downDests.length > 0) {
          this.targetFloor = Math.max(...downDests);
          this.direction = "down";
        } else {
          this.targetFloor = this.currentFloor;
        }
      }
    } else if (this.direction === "down") {
      const downDests = destinations.filter((d) => d < this.currentFloor);
      if (downDests.length > 0) {
        this.targetFloor = Math.max(...downDests);
      } else {
        const upDests = destinations.filter((d) => d > this.currentFloor);
        if (upDests.length > 0) {
          this.targetFloor = Math.min(...upDests);
          this.direction = "up";
        } else {
          this.targetFloor = this.currentFloor;
        }
      }
    }
  }
  openDoors() {
    this.state = "door_open";
    this.doorOpenTimer = this.DOOR_OPEN_TIME;
    this.destinations.delete(this.currentFloor);
    this.notifyChange();
  }
  update(deltaTime) {
    if (this.state === "door_open") {
      this.doorOpenTimer -= deltaTime;
      if (this.doorOpenTimer <= 0) {
        this.doorOpenTimer = 0;
        if (this.destinations.size > 0) {
          this.state = "moving";
          this.updateDirection();
        } else {
          this.state = "idle";
          this.direction = "idle";
          this.targetFloor = null;
        }
        this.notifyChange();
      }
      return;
    }
    if (this.state === "moving" && this.targetFloor !== null) {
      const now = Date.now();
      if (now - this.lastMoveTime >= this.MOVE_TIME) {
        this.lastMoveTime = now;
        if (this.currentFloor < this.targetFloor) {
          this.currentFloor++;
        } else if (this.currentFloor > this.targetFloor) {
          this.currentFloor--;
        }
        if (this.destinations.has(this.currentFloor)) {
          this.openDoors();
        } else {
          this.updateDirection();
          if (this.destinations.size === 0) {
            this.state = "idle";
            this.direction = "idle";
            this.targetFloor = null;
          }
        }
        this.notifyChange();
      }
    }
  }
  reset() {
    this.currentFloor = 0;
    this.targetFloor = null;
    this.direction = "idle";
    this.state = "idle";
    this.destinations.clear();
    this.doorOpenTimer = 0;
    this.lastMoveTime = 0;
    this.notifyChange();
  }
}

// floor.ts
class Floor {
  floorNumber;
  upPressed;
  downPressed;
  hasUpButton;
  hasDownButton;
  onStateChange;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.upPressed = false;
    this.downPressed = false;
    this.hasUpButton = floorNumber < totalFloors - 1;
    this.hasDownButton = floorNumber > 0;
    this.onStateChange = null;
  }
  setOnStateChange(callback) {
    this.onStateChange = callback;
  }
  notifyChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
  pressButton(direction) {
    if (direction === "up" && this.hasUpButton && !this.upPressed) {
      this.upPressed = true;
      this.notifyChange();
      return true;
    }
    if (direction === "down" && this.hasDownButton && !this.downPressed) {
      this.downPressed = true;
      this.notifyChange();
      return true;
    }
    return false;
  }
  clearButton(direction) {
    if (direction === "up") {
      this.upPressed = false;
    } else if (direction === "down") {
      this.downPressed = false;
    }
    this.notifyChange();
  }
  reset() {
    this.upPressed = false;
    this.downPressed = false;
    this.notifyChange();
  }
}

// building.ts
class Building {
  floors;
  elevators;
  requestQueue;
  onStateChange;
  constructor(numFloors, numElevators) {
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    this.onStateChange = null;
    for (let i = 0;i < numFloors; i++) {
      this.floors.push(new Floor(i, numFloors));
    }
    for (let i = 0;i < numElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  setOnStateChange(callback) {
    this.onStateChange = callback;
    for (const floor of this.floors) {
      floor.setOnStateChange(() => this.notifyChange());
    }
    for (const elevator of this.elevators) {
      elevator.setOnStateChange(() => this.notifyChange());
    }
  }
  notifyChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
  }
  requestElevator(floor, direction) {
    if (floor < 0 || floor >= this.floors.length) {
      return false;
    }
    const floorObj = this.floors[floor];
    if (!floorObj.pressButton(direction)) {
      return false;
    }
    const assigned = this.assignToBestElevator(floor, direction);
    if (!assigned) {
      this.requestQueue.push({ floor, direction });
      this.notifyChange();
    }
    return true;
  }
  assignToBestElevator(floor, direction) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.canAcceptRequest(floor, direction)) {
        const distance = elevator.getDistanceTo(floor);
        const score = elevator.state === "idle" ? distance : distance + 100;
        if (score < bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }
    }
    if (bestElevator) {
      bestElevator.addDestination(floor);
      return true;
    }
    return false;
  }
  selectDestination(elevatorId, floor) {
    if (elevatorId < 0 || elevatorId >= this.elevators.length) {
      return false;
    }
    if (floor < 0 || floor >= this.floors.length) {
      return false;
    }
    const elevator = this.elevators[elevatorId];
    return elevator.addDestination(floor);
  }
  update(deltaTime) {
    for (const elevator of this.elevators) {
      const prevFloor = elevator.currentFloor;
      elevator.update(deltaTime);
      if (elevator.state === "door_open" && prevFloor !== elevator.currentFloor) {}
      if (elevator.state === "door_open") {
        const floor = this.floors[elevator.currentFloor];
        if (elevator.direction === "up" || elevator.direction === "idle" && floor.upPressed) {
          floor.clearButton("up");
        }
        if (elevator.direction === "down" || elevator.direction === "idle" && floor.downPressed) {
          floor.clearButton("down");
        }
        if (elevator.destinations.size === 0 || !elevator.destinations.has(elevator.currentFloor)) {
          floor.clearButton("up");
          floor.clearButton("down");
        }
      }
    }
    this.processQueue();
  }
  processQueue() {
    const remaining = [];
    for (const request of this.requestQueue) {
      const assigned = this.assignToBestElevator(request.floor, request.direction);
      if (!assigned) {
        remaining.push(request);
      }
    }
    if (remaining.length !== this.requestQueue.length) {
      this.requestQueue = remaining;
      this.notifyChange();
    }
  }
  reset(numFloors, numElevators) {
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    for (let i = 0;i < numFloors; i++) {
      const floor = new Floor(i, numFloors);
      floor.setOnStateChange(() => this.notifyChange());
      this.floors.push(floor);
    }
    for (let i = 0;i < numElevators; i++) {
      const elevator = new Elevator(i);
      elevator.setOnStateChange(() => this.notifyChange());
      this.elevators.push(elevator);
    }
    this.notifyChange();
  }
}

// script.ts
class SimulatorUI {
  building;
  buildingEl;
  elevatorPanelsEl;
  floorCountInput;
  elevatorCountInput;
  animationFrameId = null;
  lastTime = 0;
  constructor() {
    this.buildingEl = document.getElementById("building");
    this.elevatorPanelsEl = document.getElementById("elevatorPanels");
    this.floorCountInput = document.getElementById("floorCount");
    this.elevatorCountInput = document.getElementById("elevatorCount");
    const numFloors = parseInt(this.floorCountInput.value) || 10;
    const numElevators = parseInt(this.elevatorCountInput.value) || 4;
    this.building = new Building(numFloors, numElevators);
    this.building.setOnStateChange(() => this.render());
    this.setupEventListeners();
    this.render();
    this.startSimulation();
  }
  setupEventListeners() {
    document.getElementById("resetBtn").addEventListener("click", () => {
      const numFloors = parseInt(this.floorCountInput.value) || 10;
      const numElevators = parseInt(this.elevatorCountInput.value) || 4;
      this.building.reset(numFloors, numElevators);
    });
  }
  startSimulation() {
    this.lastTime = performance.now();
    const loop = (now) => {
      const deltaTime = now - this.lastTime;
      this.lastTime = now;
      this.building.update(deltaTime);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }
  render() {
    this.renderBuilding();
    this.renderElevatorPanels();
  }
  renderBuilding() {
    const numFloors = this.building.floors.length;
    const numElevators = this.building.elevators.length;
    const currentFloors = this.buildingEl.querySelectorAll(".floor").length;
    const currentShafts = this.buildingEl.querySelector(".shafts")?.querySelectorAll(".shaft").length || 0;
    if (currentFloors !== numFloors || currentShafts !== numElevators) {
      this.buildingEl.innerHTML = "";
      for (let i = numFloors - 1;i >= 0; i--) {
        const floorEl = document.createElement("div");
        floorEl.className = "floor";
        floorEl.dataset.floor = String(i);
        const labelEl = document.createElement("div");
        labelEl.className = "floor-label";
        labelEl.textContent = String(i);
        floorEl.appendChild(labelEl);
        const buttonsEl = document.createElement("div");
        buttonsEl.className = "floor-buttons";
        const floor = this.building.floors[i];
        if (floor.hasUpButton) {
          const upBtn = document.createElement("button");
          upBtn.className = "floor-btn up";
          upBtn.dataset.floor = String(i);
          upBtn.dataset.direction = "up";
          upBtn.addEventListener("click", () => {
            this.building.requestElevator(i, "up");
          });
          buttonsEl.appendChild(upBtn);
        }
        if (floor.hasDownButton) {
          const downBtn = document.createElement("button");
          downBtn.className = "floor-btn down";
          downBtn.dataset.floor = String(i);
          downBtn.dataset.direction = "down";
          downBtn.addEventListener("click", () => {
            this.building.requestElevator(i, "down");
          });
          buttonsEl.appendChild(downBtn);
        }
        floorEl.appendChild(buttonsEl);
        const shaftsEl = document.createElement("div");
        shaftsEl.className = "shafts";
        for (let e = 0;e < numElevators; e++) {
          const shaftEl = document.createElement("div");
          shaftEl.className = "shaft";
          shaftEl.dataset.shaft = String(e);
          const shaftLabel = document.createElement("div");
          shaftLabel.className = "shaft-label";
          shaftLabel.textContent = String(e);
          shaftEl.appendChild(shaftLabel);
          shaftsEl.appendChild(shaftEl);
        }
        floorEl.appendChild(shaftsEl);
        this.buildingEl.appendChild(floorEl);
      }
    }
    for (const floor of this.building.floors) {
      const floorEl = this.buildingEl.querySelector(`.floor[data-floor="${floor.floorNumber}"]`);
      if (!floorEl)
        continue;
      const upBtn = floorEl.querySelector(".floor-btn.up");
      const downBtn = floorEl.querySelector(".floor-btn.down");
      if (upBtn) {
        upBtn.classList.toggle("active", floor.upPressed);
      }
      if (downBtn) {
        downBtn.classList.toggle("active", floor.downPressed);
      }
    }
    const floorHeight = 70;
    for (const elevator of this.building.elevators) {
      let elevatorEl = this.buildingEl.querySelector(`.elevator[data-elevator="${elevator.id}"]`);
      if (!elevatorEl) {
        elevatorEl = document.createElement("div");
        elevatorEl.className = "elevator";
        elevatorEl.dataset.elevator = String(elevator.id);
        elevatorEl.textContent = String(elevator.id);
        const shaft = this.buildingEl.querySelector(`.shaft[data-shaft="${elevator.id}"]`);
        if (shaft) {
          shaft.appendChild(elevatorEl);
        }
      }
      const bottom = elevator.currentFloor * floorHeight;
      elevatorEl.style.bottom = `${bottom}px`;
      elevatorEl.className = "elevator";
      if (elevator.state === "door_open") {
        elevatorEl.classList.add("door-open");
      } else if (elevator.state === "moving") {
        elevatorEl.classList.add(elevator.direction === "up" ? "moving-up" : "moving-down");
      } else {
        elevatorEl.classList.add("idle");
      }
    }
  }
  renderElevatorPanels() {
    const numElevators = this.building.elevators.length;
    const numFloors = this.building.floors.length;
    const currentPanels = this.elevatorPanelsEl.querySelectorAll(".elevator-panel").length;
    if (currentPanels !== numElevators) {
      this.elevatorPanelsEl.innerHTML = "";
      for (let e = 0;e < numElevators; e++) {
        const panelEl = document.createElement("div");
        panelEl.className = "elevator-panel";
        panelEl.dataset.panel = String(e);
        const headerEl = document.createElement("div");
        headerEl.className = "elevator-panel-header";
        const titleEl = document.createElement("h3");
        titleEl.textContent = `Elevator ${e}`;
        headerEl.appendChild(titleEl);
        const statusEl = document.createElement("span");
        statusEl.className = "elevator-status";
        statusEl.dataset.status = String(e);
        headerEl.appendChild(statusEl);
        panelEl.appendChild(headerEl);
        const infoEl = document.createElement("div");
        infoEl.className = "elevator-info";
        infoEl.dataset.info = String(e);
        panelEl.appendChild(infoEl);
        const buttonsEl = document.createElement("div");
        buttonsEl.className = "elevator-buttons";
        buttonsEl.dataset.buttons = String(e);
        for (let f = numFloors - 1;f >= 0; f--) {
          const btn = document.createElement("button");
          btn.className = "elevator-btn";
          btn.textContent = String(f);
          btn.dataset.floor = String(f);
          btn.addEventListener("click", () => {
            this.building.selectDestination(e, f);
          });
          buttonsEl.appendChild(btn);
        }
        panelEl.appendChild(buttonsEl);
        const queueEl = document.createElement("div");
        queueEl.className = "queue-info";
        queueEl.dataset.queue = String(e);
        panelEl.appendChild(queueEl);
        this.elevatorPanelsEl.appendChild(panelEl);
      }
    }
    for (const elevator of this.building.elevators) {
      const statusEl = this.elevatorPanelsEl.querySelector(`.elevator-status[data-status="${elevator.id}"]`);
      const infoEl = this.elevatorPanelsEl.querySelector(`.elevator-info[data-info="${elevator.id}"]`);
      const queueEl = this.elevatorPanelsEl.querySelector(`.queue-info[data-queue="${elevator.id}"]`);
      if (statusEl) {
        statusEl.className = "elevator-status";
        if (elevator.state === "door_open") {
          statusEl.classList.add("door-open");
          statusEl.textContent = "Door Open";
        } else if (elevator.state === "moving") {
          statusEl.classList.add(elevator.direction === "up" ? "moving-up" : "moving-down");
          statusEl.textContent = elevator.direction === "up" ? "Moving Up" : "Moving Down";
        } else {
          statusEl.classList.add("idle");
          statusEl.textContent = "Idle";
        }
      }
      if (infoEl) {
        const dests = Array.from(elevator.destinations).sort((a, b) => a - b);
        infoEl.textContent = `Floor: ${elevator.currentFloor} | Dest: [${dests.join(", ")}]`;
      }
      if (queueEl) {
        const queued = this.building.requestQueue.filter((r) => {
          return elevator.canAcceptRequest(r.floor, r.direction);
        });
        if (queued.length > 0) {
          queueEl.textContent = `Queue: ${queued.map((r) => `${r.floor}${r.direction === "up" ? "▲" : "▼"}`).join(", ")}`;
        } else {
          queueEl.textContent = "";
        }
      }
      const buttonsEl = this.elevatorPanelsEl.querySelector(`.elevator-buttons[data-buttons="${elevator.id}"]`);
      if (buttonsEl) {
        for (const btn of buttonsEl.querySelectorAll(".elevator-btn")) {
          const floor = parseInt(btn.dataset.floor);
          btn.classList.toggle("active", elevator.destinations.has(floor));
        }
      }
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new SimulatorUI;
});
