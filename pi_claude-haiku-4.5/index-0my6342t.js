// script.ts
var CONFIG = {
  TOTAL_FLOORS: 10,
  TOTAL_ELEVATORS: 4,
  MOVE_SPEED: 800,
  DOOR_OPEN_TIME: 1000
};
class Elevator {
  id;
  currentFloor = 0;
  direction = "IDLE" /* IDLE */;
  destinationQueue = new Set;
  isMoving = false;
  isDoorOpen = false;
  constructor(id) {
    this.id = id;
  }
  addDestination(floor) {
    this.destinationQueue.add(floor);
    this.updateDirection();
  }
  removeDestination(floor) {
    this.destinationQueue.delete(floor);
  }
  updateDirection() {
    if (this.destinationQueue.size === 0) {
      this.direction = "IDLE" /* IDLE */;
      return;
    }
    const minFloor = Math.min(...Array.from(this.destinationQueue));
    const maxFloor = Math.max(...Array.from(this.destinationQueue));
    if (this.direction === "IDLE" /* IDLE */) {
      this.direction = this.currentFloor <= minFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    }
    if (this.direction === "UP" /* UP */ && this.currentFloor === maxFloor) {
      this.direction = "DOWN" /* DOWN */;
    }
    if (this.direction === "DOWN" /* DOWN */ && this.currentFloor === minFloor) {
      this.direction = "UP" /* UP */;
    }
  }
  getNextFloor() {
    if (this.destinationQueue.size === 0)
      return null;
    const destinations = Array.from(this.destinationQueue);
    if (this.direction === "UP" /* UP */) {
      const nextFloor = destinations.find((f) => f > this.currentFloor);
      return nextFloor !== undefined ? nextFloor : Math.min(...destinations);
    } else {
      const nextFloor = destinations.find((f) => f < this.currentFloor);
      return nextFloor !== undefined ? nextFloor : Math.max(...destinations);
    }
  }
  hasDestination(floor) {
    return this.destinationQueue.has(floor);
  }
  getState() {
    if (this.isDoorOpen)
      return "DOOR OPEN";
    if (this.isMoving)
      return `MOVING ${this.direction}`;
    return "IDLE";
  }
}

class Floor {
  floorNumber;
  upButtonActive = false;
  downButtonActive = false;
  waitingUp = 0;
  waitingDown = 0;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
  }
  pressUpButton() {
    if (this.floorNumber < CONFIG.TOTAL_FLOORS - 1) {
      this.upButtonActive = true;
      this.waitingUp++;
    }
  }
  pressDownButton() {
    if (this.floorNumber > 0) {
      this.downButtonActive = true;
      this.waitingDown++;
    }
  }
  clearUpButton() {
    this.upButtonActive = false;
    this.waitingUp = Math.max(0, this.waitingUp - 1);
  }
  clearDownButton() {
    this.downButtonActive = false;
    this.waitingDown = Math.max(0, this.waitingDown - 1);
  }
}

class Building {
  elevators = [];
  floors = [];
  requestQueue = [];
  requestsServed = 0;
  moveInterval = null;
  constructor(totalFloors = CONFIG.TOTAL_FLOORS, totalElevators = CONFIG.TOTAL_ELEVATORS) {
    for (let i = 0;i < totalElevators; i++) {
      this.elevators.push(new Elevator(i));
    }
    for (let i = 0;i < totalFloors; i++) {
      this.floors.push(new Floor(i, totalFloors));
    }
  }
  requestElevator(floorNumber, direction) {
    const floor = this.floors[floorNumber];
    if (direction === "UP" /* UP */) {
      floor.pressUpButton();
    } else {
      floor.pressDownButton();
    }
    this.requestQueue.push({ floor: floorNumber, direction });
    this.assignElevators();
  }
  assignElevators() {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const elevator = this.findBestElevator(request.floor, request.direction);
      if (elevator) {
        elevator.addDestination(request.floor);
        this.requestQueue.shift();
      } else {
        break;
      }
    }
  }
  findBestElevator(floor, direction) {
    const idleOnFloor = this.elevators.filter((e) => e.direction === "IDLE" /* IDLE */ && e.currentFloor === floor);
    if (idleOnFloor.length > 0) {
      return idleOnFloor[0];
    }
    const idleElevators = this.elevators.filter((e) => e.direction === "IDLE" /* IDLE */);
    if (idleElevators.length > 0) {
      idleElevators.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
      return idleElevators[0];
    }
    const movingInDirection = this.elevators.filter((e) => e.direction === direction);
    if (direction === "UP" /* UP */) {
      const candidates = movingInDirection.filter((e) => e.currentFloor <= floor);
      if (candidates.length > 0) {
        candidates.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
        return candidates[0];
      }
    } else {
      const candidates = movingInDirection.filter((e) => e.currentFloor >= floor);
      if (candidates.length > 0) {
        candidates.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
        return candidates[0];
      }
    }
    const movingElevators = this.elevators.filter((e) => e.direction !== "IDLE" /* IDLE */);
    if (movingElevators.length > 0) {
      movingElevators.sort((a, b) => Math.abs(a.currentFloor - floor) - Math.abs(b.currentFloor - floor));
      return movingElevators[0];
    }
    return null;
  }
  moveElevators() {
    for (const elevator of this.elevators) {
      if (elevator.isDoorOpen) {
        continue;
      }
      const nextFloor = elevator.getNextFloor();
      if (nextFloor === null) {
        elevator.direction = "IDLE" /* IDLE */;
        elevator.isMoving = false;
        continue;
      }
      if (elevator.currentFloor === nextFloor) {
        elevator.isMoving = false;
        this.handleElevatorArrival(elevator);
      } else {
        elevator.isMoving = true;
        if (elevator.currentFloor < nextFloor) {
          elevator.currentFloor++;
        } else {
          elevator.currentFloor--;
        }
      }
    }
  }
  handleElevatorArrival(elevator) {
    const floor = this.floors[elevator.currentFloor];
    elevator.removeDestination(elevator.currentFloor);
    if (elevator.direction === "UP" /* UP */ && elevator.currentFloor < CONFIG.TOTAL_FLOORS - 1) {
      floor.clearUpButton();
    } else if (elevator.direction === "DOWN" /* DOWN */ && elevator.currentFloor > 0) {
      floor.clearDownButton();
    }
    elevator.isDoorOpen = true;
    this.requestsServed++;
    setTimeout(() => {
      elevator.isDoorOpen = false;
      if (elevator.destinationQueue.size === 0) {
        elevator.direction = "IDLE" /* IDLE */;
      }
      this.assignElevators();
    }, CONFIG.DOOR_OPEN_TIME);
  }
  start() {
    if (this.moveInterval)
      clearInterval(this.moveInterval);
    this.moveInterval = setInterval(() => this.moveElevators(), CONFIG.MOVE_SPEED);
  }
  stop() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }
  getStats() {
    return {
      totalFloors: this.floors.length,
      totalElevators: this.elevators.length,
      requestsServed: this.requestsServed,
      queueLength: this.requestQueue.length
    };
  }
}

class SimulatorUI {
  building;
  constructor(building) {
    this.building = building;
    this.render();
    this.attachEventListeners();
  }
  render() {
    this.renderElevators();
    this.renderFloors();
    this.updateStats();
    setTimeout(() => this.updateStats(), 100);
  }
  renderElevators() {
    const container = document.getElementById("elevators-container");
    if (!container)
      return;
    container.innerHTML = "";
    for (const elevator of this.building.elevators) {
      const elevatorDiv = document.createElement("div");
      elevatorDiv.className = "elevator";
      elevatorDiv.id = `elevator-${elevator.id}`;
      const head = document.createElement("div");
      head.className = "elevator-head";
      head.textContent = `Elevator ${elevator.id}`;
      const display = document.createElement("div");
      display.className = "elevator-display";
      display.textContent = elevator.currentFloor.toString();
      display.id = `elevator-display-${elevator.id}`;
      const status = document.createElement("div");
      status.className = "elevator-status";
      status.textContent = elevator.getState();
      status.id = `elevator-status-${elevator.id}`;
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "elevator-buttons";
      for (let floor = 0;floor < CONFIG.TOTAL_FLOORS; floor++) {
        const btn = document.createElement("button");
        btn.className = "floor-btn";
        btn.textContent = floor.toString();
        btn.id = `btn-elevator-${elevator.id}-floor-${floor}`;
        btn.addEventListener("click", () => {
          elevator.addDestination(floor);
          this.building.assignElevators();
        });
        buttonsDiv.appendChild(btn);
      }
      elevatorDiv.appendChild(head);
      elevatorDiv.appendChild(display);
      elevatorDiv.appendChild(status);
      elevatorDiv.appendChild(buttonsDiv);
      container.appendChild(elevatorDiv);
    }
  }
  renderFloors() {
    const container = document.getElementById("floors-container");
    if (!container)
      return;
    container.innerHTML = "";
    for (let i = this.building.floors.length - 1;i >= 0; i--) {
      const floor = this.building.floors[i];
      const floorDiv = document.createElement("div");
      floorDiv.className = "floor";
      const label = document.createElement("div");
      label.className = "floor-label";
      label.textContent = `Floor ${floor.floorNumber}`;
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "floor-buttons";
      if (floor.floorNumber < CONFIG.TOTAL_FLOORS - 1) {
        const upBtn = document.createElement("button");
        upBtn.className = "request-btn up";
        upBtn.textContent = "Up";
        upBtn.id = `btn-floor-${floor.floorNumber}-up`;
        upBtn.addEventListener("click", () => {
          this.building.requestElevator(floor.floorNumber, "UP" /* UP */);
          this.updateFloorButtonState();
        });
        buttonsDiv.appendChild(upBtn);
      }
      if (floor.floorNumber > 0) {
        const downBtn = document.createElement("button");
        downBtn.className = "request-btn down";
        downBtn.textContent = "Down";
        downBtn.id = `btn-floor-${floor.floorNumber}-down`;
        downBtn.addEventListener("click", () => {
          this.building.requestElevator(floor.floorNumber, "DOWN" /* DOWN */);
          this.updateFloorButtonState();
        });
        buttonsDiv.appendChild(downBtn);
      }
      floorDiv.appendChild(label);
      floorDiv.appendChild(buttonsDiv);
      container.appendChild(floorDiv);
    }
  }
  attachEventListeners() {
    setInterval(() => {
      this.updateElevatorDisplays();
      this.updateFloorButtonState();
      this.updateStats();
    }, 100);
  }
  updateElevatorDisplays() {
    for (const elevator of this.building.elevators) {
      const display = document.getElementById(`elevator-display-${elevator.id}`);
      if (display) {
        display.textContent = elevator.currentFloor.toString();
      }
      const status = document.getElementById(`elevator-status-${elevator.id}`);
      if (status) {
        status.textContent = elevator.getState();
      }
      for (let floor = 0;floor < CONFIG.TOTAL_FLOORS; floor++) {
        const btn = document.getElementById(`btn-elevator-${elevator.id}-floor-${floor}`);
        if (btn) {
          btn.classList.remove("selected", "completed");
          if (elevator.currentFloor === floor && elevator.isDoorOpen) {
            btn.classList.add("completed");
          } else if (elevator.hasDestination(floor)) {
            btn.classList.add("selected");
          }
        }
      }
    }
  }
  updateFloorButtonState() {
    for (let i = 0;i < CONFIG.TOTAL_FLOORS; i++) {
      const floor = this.building.floors[i];
      const upBtn = document.getElementById(`btn-floor-${i}-up`);
      if (upBtn) {
        upBtn.classList.toggle("active", floor.upButtonActive);
      }
      const downBtn = document.getElementById(`btn-floor-${i}-down`);
      if (downBtn) {
        downBtn.classList.toggle("active", floor.downButtonActive);
      }
    }
  }
  updateStats() {
    const stats = this.building.getStats();
    document.getElementById("stat-floors").textContent = stats.totalFloors.toString();
    document.getElementById("stat-elevators").textContent = stats.totalElevators.toString();
    document.getElementById("stat-requests").textContent = stats.requestsServed.toString();
    document.getElementById("stat-queue").textContent = stats.queueLength.toString();
  }
}
var building = new Building(CONFIG.TOTAL_FLOORS, CONFIG.TOTAL_ELEVATORS);
var ui = new SimulatorUI(building);
building.start();
