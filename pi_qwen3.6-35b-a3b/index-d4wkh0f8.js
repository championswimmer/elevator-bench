// elevator/config.ts
var TOTAL_FLOORS = 10;
var NUM_ELEVATORS = 4;
var ELEVATOR_SPEED_FLOORS_PER_SEC = 2;
var MIN_FLOOR = 0;
var MAX_FLOOR = TOTAL_FLOORS - 1;

// elevator/floor.ts
class Floor {
  number;
  upRequests = [];
  downRequests = [];
  constructor(number) {
    if (number < MIN_FLOOR || number > MAX_FLOOR) {
      throw new Error(`Invalid floor number: ${number}`);
    }
    this.number = number;
  }
  requestUp() {
    const existing = this.upRequests.find((r) => !r.queued);
    if (existing)
      return existing;
    const req = { floor: this.number, direction: "up", queued: false };
    this.upRequests.push(req);
    return req;
  }
  requestDown() {
    const existing = this.downRequests.find((r) => !r.queued);
    if (existing)
      return existing;
    const req = { floor: this.number, direction: "down", queued: false };
    this.downRequests.push(req);
    return req;
  }
  cancelRequest(direction) {
    const list = direction === "up" ? this.upRequests : this.downRequests;
    const idx = list.findIndex((r) => !r.queued);
    if (idx !== -1)
      list.splice(idx, 1);
  }
  hasPendingRequests() {
    return this.upRequests.some((r) => !r.queued) || this.downRequests.some((r) => !r.queued);
  }
  clearAllRequests() {
    this.upRequests = [];
    this.downRequests = [];
  }
}

// elevator/elevator.ts
class Elevator {
  id;
  currentFloor;
  state;
  direction;
  destinations;
  capacity;
  passengers;
  speed;
  progress;
  nextTargetFloor;
  doorTimer;
  _onUpdate;
  constructor(id, startFloor = MIN_FLOOR) {
    this.id = id;
    this.currentFloor = startFloor;
    this.state = "idle";
    this.direction = "none";
    this.destinations = [];
    this.capacity = 8;
    this.passengers = 0;
    this.speed = ELEVATOR_SPEED_FLOORS_PER_SEC;
    this.progress = 0;
    this.nextTargetFloor = startFloor;
    this.doorTimer = 0;
  }
  setOnUpdate(callback) {
    this._onUpdate = callback;
  }
  assignHallCall(floor, direction) {
    this.direction = direction;
    this.state = "moving";
    if (!this.destinations.find((d) => d.floor === floor)) {
      this.destinations.push({ floor, passengerCount: 0 });
    }
    this._notify();
  }
  addDestination(floor) {
    if (this.passengers >= this.capacity)
      return false;
    if (this.currentFloor === floor)
      return false;
    if (this.destinations.find((d) => d.floor === floor))
      return true;
    this.destinations.push({ floor, passengerCount: 0 });
    if (this.state === "idle") {
      this.state = "moving";
      this.direction = floor > this.currentFloor ? "up" : "down";
    }
    this._notify();
    return true;
  }
  removeDestination(floor) {
    this.destinations = this.destinations.filter((d) => d.floor !== floor);
    if (this.destinations.length === 0 && this.state !== "door-open") {
      this.state = "idle";
      this.direction = "none";
    }
    this._notify();
  }
  shouldStopAt(floor) {
    if (this.state === "idle")
      return false;
    const hallCallMatch = this.direction === "up" && floor >= this.currentFloor || this.direction === "down" && floor <= this.currentFloor;
    if (hallCallMatch && this.destinations.find((d) => d.floor === floor))
      return true;
    return this.destinations.some((d) => d.floor === floor);
  }
  tick(deltaTime) {
    if (this.state === "idle" || this.state === "door-open")
      return;
    if (this.state === "moving") {
      if (this.direction === "up") {
        const pending = this.destinations.filter((d) => d.floor >= this.currentFloor);
        if (pending.length > 0) {
          this.nextTargetFloor = Math.min(...pending.map((d) => d.floor));
        } else {
          this.direction = "down";
          this._notify();
          return;
        }
      } else {
        const pending = this.destinations.filter((d) => d.floor <= this.currentFloor);
        if (pending.length > 0) {
          this.nextTargetFloor = Math.max(...pending.map((d) => d.floor));
        } else {
          this.direction = "up";
          this._notify();
          return;
        }
      }
      const dist = this.nextTargetFloor - this.currentFloor;
      const travelTime = Math.abs(dist) / this.speed;
      const step = deltaTime / travelTime * dist;
      this.progress += step;
      if (dist > 0 && this.progress >= dist || dist < 0 && this.progress <= dist) {
        this.currentFloor = this.nextTargetFloor;
        this.progress = 0;
        this.state = "door-open";
        this.doorTimer = 1.5;
        this._notify();
      }
    }
    if (this.state === "door-open") {
      this.doorTimer -= deltaTime;
      if (this.doorTimer <= 0) {
        this._checkMoreDestinations();
      }
    }
  }
  _checkMoreDestinations() {
    let nextFloor = null;
    if (this.direction === "up") {
      const pending = this.destinations.filter((d) => d.floor > this.currentFloor);
      if (pending.length > 0)
        nextFloor = Math.min(...pending.map((d) => d.floor));
    } else if (this.direction === "down") {
      const pending = this.destinations.filter((d) => d.floor < this.currentFloor);
      if (pending.length > 0)
        nextFloor = Math.max(...pending.map((d) => d.floor));
    }
    if (nextFloor !== null) {
      this.state = "moving";
      this.progress = 0;
    } else {
      const remaining = this.destinations.filter((d) => d.floor !== this.currentFloor);
      if (remaining.length > 0) {
        this.direction = this.direction === "up" ? "down" : "up";
        this.state = "moving";
        this.progress = 0;
      } else {
        this.state = "idle";
        this.direction = "none";
        this.destinations = [];
      }
    }
    this._notify();
  }
  getProgressToNext() {
    if (this.state !== "moving")
      return 0;
    const dist = this.nextTargetFloor - this.currentFloor;
    if (dist === 0)
      return 1;
    return Math.min(1, Math.abs(this.progress) / Math.abs(dist));
  }
  _notify() {
    this._onUpdate?.(this);
  }
}

// elevator/building.ts
class Building {
  floors = [];
  elevators = [];
  hallCallQueue = [];
  constructor() {
    for (let i = 0;i < TOTAL_FLOORS; i++) {
      this.floors.push(new Floor(i));
    }
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      const elevator = new Elevator(i, MIN_FLOOR);
      this.elevators.push(elevator);
    }
  }
  requestElevator(floor, direction) {
    const req = direction === "up" ? this.floors[floor].requestUp() : this.floors[floor].requestDown();
    const dispatched = this._dispatchHallCall(floor, direction);
    if (!dispatched) {
      this.hallCallQueue.push({ floor, direction });
    }
  }
  dispatchHallCall(floor, direction) {
    const dispatched = this._dispatchHallCall(floor, direction);
    if (!dispatched) {
      this.hallCallQueue.push({ floor, direction });
    }
    return dispatched;
  }
  _dispatchHallCall(floor, direction) {
    let bestElevator = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      let score = 0;
      if (elevator.state === "idle") {
        const dist = Math.abs(elevator.currentFloor - floor);
        const dirBonus = direction === "up" && elevator.currentFloor <= floor || direction === "down" && elevator.currentFloor >= floor ? -10 : 10;
        score = dist + dirBonus;
      } else if (elevator.state === "moving" && elevator.direction !== "none") {
        const headingToFloor = direction === "up" && elevator.direction === "up" && elevator.currentFloor <= floor || direction === "down" && elevator.direction === "down" && elevator.currentFloor >= floor;
        if (headingToFloor) {
          const dist = Math.abs(elevator.currentFloor - floor);
          score = dist + 5;
        } else {
          continue;
        }
      } else {
        continue;
      }
      if (score < bestScore) {
        bestScore = score;
        bestElevator = elevator;
      }
    }
    if (bestElevator) {
      bestElevator.assignHallCall(floor, direction);
      return true;
    }
    return false;
  }
  processQueue() {
    const remaining = [];
    for (const req of this.hallCallQueue) {
      if (!this._dispatchHallCall(req.floor, req.direction)) {
        remaining.push(req);
      }
    }
    this.hallCallQueue = remaining;
  }
  passengerOff(elevator, floor) {
    elevator.removeDestination(floor);
    elevator.passengers = Math.max(0, elevator.passengers - 1);
  }
  passengerOn(elevator) {
    elevator.passengers = Math.min(elevator.capacity, elevator.passengers + 1);
  }
  tick(deltaTime) {
    for (const elevator of this.elevators) {
      elevator.tick(deltaTime);
    }
    this.processQueue();
  }
}

// script.ts
var building = new Building;
var lastTime = performance.now();
var buildingEl = document.getElementById("building");
var statusEl = document.getElementById("status");
function buildUI() {
  const headerRow = document.createElement("div");
  headerRow.className = "elevator-header-row";
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const header = document.createElement("div");
    header.className = "elevator-header";
    header.textContent = `E${i}`;
    headerRow.appendChild(header);
  }
  buildingEl.appendChild(headerRow);
  for (let f = MAX_FLOOR;f >= MIN_FLOOR; f--) {
    const floorRow = document.createElement("div");
    floorRow.className = "floor-row";
    floorRow.dataset.floor = String(f);
    const label = document.createElement("div");
    label.className = "floor-label";
    label.textContent = f;
    if (f === MIN_FLOOR)
      label.textContent += " (G)";
    floorRow.appendChild(label);
    for (let e = 0;e < NUM_ELEVATORS; e++) {
      const shaft = document.createElement("div");
      shaft.className = "shaft";
      shaft.dataset.elevator = String(e);
      const elevatorBox = document.createElement("div");
      elevatorBox.className = "elevator-box";
      elevatorBox.id = `elevator-${e}`;
      elevatorBox.dataset.currentFloor = "0";
      shaft.appendChild(elevatorBox);
      for (let d = MIN_FLOOR;d <= MAX_FLOOR; d++) {
        const destBtn = document.createElement("button");
        destBtn.className = "dest-btn";
        destBtn.dataset.floor = String(d);
        destBtn.dataset.elevator = String(e);
        destBtn.textContent = d;
        destBtn.title = `Go to floor ${d}`;
        destBtn.addEventListener("click", () => handleDestinationClick(e, d));
        elevatorBox.appendChild(destBtn);
      }
      floorRow.appendChild(shaft);
    }
    const hallButtons = document.createElement("div");
    hallButtons.className = "hall-buttons";
    const isTopFloor = f === MAX_FLOOR;
    const isBottomFloor = f === MIN_FLOOR;
    if (!isTopFloor) {
      const upBtn = document.createElement("button");
      upBtn.className = "hall-btn hall-up";
      upBtn.dataset.floor = String(f);
      upBtn.textContent = "▲";
      upBtn.title = `Request elevator up from floor ${f}`;
      upBtn.addEventListener("click", () => handleHallCall(f, "up"));
      hallButtons.appendChild(upBtn);
    }
    if (!isBottomFloor) {
      const downBtn = document.createElement("button");
      downBtn.className = "hall-btn hall-down";
      downBtn.dataset.floor = String(f);
      downBtn.textContent = "▼";
      downBtn.title = `Request elevator down from floor ${f}`;
      downBtn.addEventListener("click", () => handleHallCall(f, "down"));
      hallButtons.appendChild(downBtn);
    }
    floorRow.appendChild(hallButtons);
    buildingEl.appendChild(floorRow);
  }
}
function handleHallCall(floor, direction) {
  building.requestElevator(floor, direction);
}
function handleDestinationClick(elevatorId, floor) {
  const elevator = building.elevators[elevatorId];
  const destIdx = elevator.destinations.findIndex((d) => d.floor === floor);
  if (destIdx !== -1) {
    elevator.removeDestination(floor);
  } else {
    if (elevator.addDestination(floor)) {
      elevator.passengers = Math.min(elevator.capacity, elevator.passengers + 1);
    }
  }
}
function render() {
  for (let e = 0;e < NUM_ELEVATORS; e++) {
    const elevator = building.elevators[e];
    const box = document.getElementById(`elevator-${e}`);
    const progress = elevator.getProgressToNext();
    const floorHeight = getFloorHeight();
    const visualFloor = elevator.currentFloor + (elevator.state === "moving" ? progress * (elevator.direction === "up" ? 1 : -1) : 0);
    box.style.bottom = `${visualFloor / TOTAL_FLOORS * 100}%`;
    box.dataset.currentFloor = String(elevator.currentFloor);
    box.classList.toggle("idle", elevator.state === "idle");
    box.classList.toggle("moving", elevator.state === "moving");
    box.classList.toggle("door-open", elevator.state === "door-open");
    const dirIndicator = box.querySelector(".dir-indicator");
    if (!dirIndicator) {
      const di = document.createElement("div");
      di.className = "dir-indicator";
      box.appendChild(di);
    }
    box.querySelector(".dir-indicator").textContent = elevator.direction === "up" ? "▲" : elevator.direction === "down" ? "▼" : "";
    const destBtns = box.querySelectorAll(".dest-btn");
    destBtns.forEach((btn) => {
      const btnFloor = parseInt(btn.dataset.floor);
      const isActive = elevator.destinations.some((d) => d.floor === btnFloor);
      btn.classList.toggle("active", isActive);
    });
    let badge = box.querySelector(".passenger-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "passenger-badge";
      box.appendChild(badge);
    }
    badge.textContent = `${elevator.passengers}/${elevator.capacity}`;
  }
  document.querySelectorAll(".hall-btn").forEach((btn) => {
    const floor = parseInt(btn.dataset.floor);
    const direction = btn.classList.contains("hall-up") ? "up" : "down";
    const floorData = building.floors[floor];
    const list = direction === "up" ? floorData.upRequests : floorData.downRequests;
    const hasPending = list.some((r) => !r.queued);
    btn.classList.toggle("active", hasPending);
  });
  const idleCount = building.elevators.filter((e) => e.state === "idle").length;
  const movingCount = building.elevators.filter((e) => e.state === "moving").length;
  const doorCount = building.elevators.filter((e) => e.state === "door-open").length;
  const queueCount = building.hallCallQueue.length;
  statusEl.textContent = `Idle: ${idleCount} | Moving: ${movingCount} | Doors: ${doorCount} | Queue: ${queueCount}`;
}
function getFloorHeight() {
  const firstRow = buildingEl.querySelector(".floor-row");
  return firstRow ? firstRow.offsetHeight : 80;
}
function animate(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  building.tick(deltaTime);
  render();
  requestAnimationFrame(animate);
}
buildUI();
requestAnimationFrame(animate);
