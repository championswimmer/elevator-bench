// elevator.ts
class Elevator {
  id;
  floorCount;
  currentFloor = 0;
  direction = 0;
  isMoving = false;
  upTargets = new Set;
  downTargets = new Set;
  constructor(id, floorCount) {
    this.id = id;
    this.floorCount = floorCount;
  }
  requestFloor(floor) {
    if (floor < 0 || floor >= this.floorCount || floor === this.currentFloor)
      return;
    if (floor > this.currentFloor)
      this.upTargets.add(floor);
    else
      this.downTargets.add(floor);
    if (!this.isMoving && this.direction === 0) {
      this.direction = floor > this.currentFloor ? 1 : -1;
    }
  }
  step() {
    this.updateDirectionIfNeeded();
    if (this.direction === 0) {
      this.isMoving = false;
      return;
    }
    this.isMoving = true;
    this.currentFloor += this.direction;
    this.currentFloor = Math.max(0, Math.min(this.floorCount - 1, this.currentFloor));
    this.upTargets.delete(this.currentFloor);
    this.downTargets.delete(this.currentFloor);
    this.updateDirectionIfNeeded();
  }
  canTakeHallCall(floor, direction) {
    if (this.direction === 0)
      return true;
    if (this.direction !== direction)
      return false;
    return direction === 1 ? floor >= this.currentFloor : floor <= this.currentFloor;
  }
  distanceTo(floor) {
    return Math.abs(this.currentFloor - floor);
  }
  hasPendingRequests() {
    return this.upTargets.size > 0 || this.downTargets.size > 0;
  }
  isIdle() {
    return this.direction === 0 && !this.hasPendingRequests() && !this.isMoving;
  }
  getSnapshot() {
    return {
      id: this.id,
      currentFloor: this.currentFloor,
      direction: this.direction,
      isMoving: this.isMoving,
      targetsUp: [...this.upTargets].sort((a, b) => a - b),
      targetsDown: [...this.downTargets].sort((a, b) => b - a)
    };
  }
  updateDirectionIfNeeded() {
    if (this.direction === 1) {
      const hasUpAhead = [...this.upTargets].some((f) => f >= this.currentFloor);
      if (hasUpAhead)
        return;
      if (this.downTargets.size > 0) {
        this.direction = -1;
        return;
      }
      this.direction = 0;
      this.isMoving = false;
      return;
    }
    if (this.direction === -1) {
      const hasDownAhead = [...this.downTargets].some((f) => f <= this.currentFloor);
      if (hasDownAhead)
        return;
      if (this.upTargets.size > 0) {
        this.direction = 1;
        return;
      }
      this.direction = 0;
      this.isMoving = false;
      return;
    }
    if (this.upTargets.size > 0 && this.downTargets.size > 0) {
      const nearestUp = Math.min(...this.upTargets);
      const nearestDown = Math.max(...this.downTargets);
      this.direction = Math.abs(nearestUp - this.currentFloor) <= Math.abs(this.currentFloor - nearestDown) ? 1 : -1;
    } else if (this.upTargets.size > 0) {
      this.direction = 1;
    } else if (this.downTargets.size > 0) {
      this.direction = -1;
    } else {
      this.direction = 0;
      this.isMoving = false;
    }
  }
}

// building.ts
class Building {
  floorCount;
  elevators;
  hallQueue = [];
  constructor(floorCount, elevatorCount) {
    this.floorCount = floorCount;
    this.elevators = Array.from({ length: elevatorCount }, (_, i) => new Elevator(i, floorCount));
  }
  requestElevator(floor, direction) {
    if (direction === 0)
      return;
    const idleCandidates = this.elevators.filter((e) => e.isIdle() && e.canTakeHallCall(floor, direction)).sort((a, b) => a.distanceTo(floor) - b.distanceTo(floor));
    if (idleCandidates.length > 0) {
      idleCandidates[0].requestFloor(floor);
      return;
    }
    const movingCandidates = this.elevators.filter((e) => e.canTakeHallCall(floor, direction)).sort((a, b) => a.distanceTo(floor) - b.distanceTo(floor));
    if (movingCandidates.length > 0) {
      movingCandidates[0].requestFloor(floor);
      return;
    }
    this.hallQueue.push({ floor, direction });
  }
  requestDestination(elevatorId, destinationFloor) {
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    elevator.requestFloor(destinationFloor);
  }
  tick() {
    for (const elevator of this.elevators)
      elevator.step();
    this.flushQueuedHallCalls();
  }
  getQueuedCalls() {
    return [...this.hallQueue];
  }
  flushQueuedHallCalls() {
    if (this.hallQueue.length === 0)
      return;
    const pending = [...this.hallQueue];
    this.hallQueue = [];
    for (const req of pending) {
      const candidates = this.elevators.filter((e) => e.isIdle() || e.canTakeHallCall(req.floor, req.direction)).sort((a, b) => a.distanceTo(req.floor) - b.distanceTo(req.floor));
      if (candidates.length > 0) {
        candidates[0].requestFloor(req.floor);
      } else {
        this.hallQueue.push(req);
      }
    }
  }
}

// script.ts
var FLOOR_COUNT = 10;
var ELEVATOR_COUNT = 4;
var TICK_MS = 900;
var building = new Building(FLOOR_COUNT, ELEVATOR_COUNT);
var buildingEl = document.getElementById("building");
var statusEl = document.getElementById("status");
var hallButtonMap = new Map;
var carButtonMap = new Map;
var elevatorEls = [];
initUI();
render();
window.setInterval(() => {
  building.tick();
  render();
}, TICK_MS);
function initUI() {
  document.documentElement.style.setProperty("--floors", String(FLOOR_COUNT));
  for (let floor = FLOOR_COUNT - 1;floor >= 0; floor--) {
    const floorRow = document.createElement("div");
    floorRow.className = "floor-row";
    const floorLabel = document.createElement("div");
    floorLabel.className = "floor-label";
    floorLabel.textContent = String(floor);
    const controls = document.createElement("div");
    controls.className = "floor-controls";
    if (floor < FLOOR_COUNT - 1) {
      const up = document.createElement("button");
      up.textContent = "↑ Up";
      up.addEventListener("click", () => {
        building.requestElevator(floor, 1);
        up.classList.add("active");
        render();
      });
      controls.appendChild(up);
      hallButtonMap.set(`${floor}:1`, up);
    }
    if (floor > 0) {
      const down = document.createElement("button");
      down.textContent = "↓ Down";
      down.addEventListener("click", () => {
        building.requestElevator(floor, -1);
        down.classList.add("active");
        render();
      });
      controls.appendChild(down);
      hallButtonMap.set(`${floor}:-1`, down);
    }
    floorRow.append(floorLabel, controls);
    buildingEl.appendChild(floorRow);
  }
  const shafts = document.createElement("div");
  shafts.className = "shafts";
  const floorHeight = 72;
  const carSize = 58;
  for (let i = 0;i < ELEVATOR_COUNT; i++) {
    const shaft = document.createElement("div");
    shaft.className = "shaft";
    const elevator = document.createElement("div");
    elevator.className = "elevator idle";
    elevator.style.top = `${(FLOOR_COUNT - 1) * floorHeight + (floorHeight - carSize) / 2}px`;
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `E${i}`;
    const at = document.createElement("div");
    at.className = "at";
    at.textContent = "F0";
    elevator.append(name, at);
    const panel = document.createElement("div");
    panel.className = "car-panel";
    for (let f = FLOOR_COUNT - 1;f >= 0; f--) {
      const b = document.createElement("button");
      b.textContent = String(f);
      b.addEventListener("click", () => {
        building.requestDestination(i, f);
        b.classList.add("active");
        render();
      });
      panel.appendChild(b);
      carButtonMap.set(`${i}:${f}`, b);
    }
    shaft.append(elevator, panel);
    shafts.appendChild(shaft);
    elevatorEls.push(elevator);
  }
  buildingEl.appendChild(shafts);
}
function render() {
  const floorHeight = 72;
  const carSize = 58;
  const snapshots = building.elevators.map((e) => e.getSnapshot());
  for (const s of snapshots) {
    const el = elevatorEls[s.id];
    el.classList.remove("idle", "up", "down");
    el.classList.add(s.direction === 1 ? "up" : s.direction === -1 ? "down" : "idle");
    const top = (FLOOR_COUNT - 1 - s.currentFloor) * floorHeight + (floorHeight - carSize) / 2;
    el.style.top = `${top}px`;
    el.querySelector(".at").textContent = `F${s.currentFloor}`;
    for (let f = 0;f < FLOOR_COUNT; f++) {
      const b = carButtonMap.get(`${s.id}:${f}`);
      if (!b)
        continue;
      const active = s.targetsUp.includes(f) || s.targetsDown.includes(f);
      b.classList.toggle("active", active);
    }
  }
  for (const btn of hallButtonMap.values())
    btn.classList.remove("active");
  for (const q of building.getQueuedCalls()) {
    hallButtonMap.get(`${q.floor}:${q.direction}`)?.classList.add("active");
  }
  const statusBlocks = snapshots.map((s) => {
    const state = s.direction === 1 ? "Up" : s.direction === -1 ? "Down" : "Idle";
    const queue = [...s.targetsUp, ...s.targetsDown].join(", ") || "none";
    return `<div class="elevator-status"><strong>Elevator ${s.id}</strong><br/>Floor: ${s.currentFloor}<br/>State: ${state}<br/>Targets: ${queue}</div>`;
  }).join("");
  const queued = building.getQueuedCalls();
  statusEl.innerHTML = `${statusBlocks}<div class="elevator-status"><strong>Queued hall calls:</strong> ${queued.length === 0 ? "none" : queued.map((q) => `F${q.floor}${q.direction === 1 ? "↑" : "↓"}`).join(", ")}</div>`;
}
