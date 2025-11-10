// script.ts
class Elevator {
  id;
  currentFloor = 0;
  direction = 0;
  queue = [];
  cabinEl;
  constructor(id) {
    this.id = id;
    const cabin = document.createElement("div");
    cabin.className = "elevator-cabin";
    cabin.dataset.id = String(id);
    for (let f = 0;f < FLOOR_COUNT; f++) {
      const btn = document.createElement("button");
      btn.textContent = String(f);
      btn.dataset.floor = String(f);
      btn.addEventListener("click", () => this.addDestination(f));
      cabin.appendChild(btn);
    }
    this.cabinEl = cabin;
    this.setPosition(0);
    const shaft = document.getElementById(`shaft-${id}`);
    shaft?.appendChild(cabin);
  }
  addDestination(floor) {
    if (!this.queue.includes(floor)) {
      this.queue.push(floor);
      this.processQueue();
    }
  }
  async processQueue() {
    if (this.direction !== 0)
      return;
    while (this.queue.length) {
      const target = this.queue.shift();
      this.direction = target > this.currentFloor ? 1 : -1;
      while (this.currentFloor !== target) {
        this.currentFloor += this.direction;
        this.setPosition(this.currentFloor);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    this.direction = 0;
    serveQueuedRequests();
  }
  setPosition(floor) {
    const percent = floor / (FLOOR_COUNT - 1) * 100;
    this.cabinEl.style.bottom = `${percent}%`;
  }
}
var FLOOR_COUNT = 10;
var ELEVATOR_COUNT = 4;
var elevators = [];
var externalQueue = [];
function init() {
  createFloorPanels();
  createElevatorShafts();
}
function createFloorPanels() {
  const container = document.getElementById("floors");
  for (let f = FLOOR_COUNT - 1;f >= 0; f--) {
    const panel = document.createElement("div");
    panel.className = "floor";
    const label = document.createElement("span");
    label.className = "floor-label";
    label.textContent = `Floor ${f}`;
    panel.appendChild(label);
    if (f < FLOOR_COUNT - 1) {
      const up = document.createElement("button");
      up.textContent = "↑";
      up.dataset.floor = String(f);
      up.dataset.dir = "up";
      up.addEventListener("click", () => handleFloorRequest(f, 1));
      panel.appendChild(up);
    }
    if (f > 0) {
      const down = document.createElement("button");
      down.textContent = "↓";
      down.dataset.floor = String(f);
      down.dataset.dir = "down";
      down.addEventListener("click", () => handleFloorRequest(f, -1));
      panel.appendChild(down);
    }
    container.appendChild(panel);
  }
}
function createElevatorShafts() {
  const container = document.getElementById("elevators");
  for (let i = 0;i < ELEVATOR_COUNT; i++) {
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    shaft.id = `shaft-${i}`;
    container.appendChild(shaft);
    elevators.push(new Elevator(i));
  }
}
function handleFloorRequest(floor, direction) {
  const candidate = elevators.filter((e) => e.direction === direction || e.direction === 0).reduce((best, e) => {
    if (!best)
      return e;
    const distBest = Math.abs(best.currentFloor - floor);
    const distE = Math.abs(e.currentFloor - floor);
    if (best.direction === 0 && e.direction !== 0)
      return best;
    if (best.direction !== 0 && e.direction === 0)
      return e;
    return distE < distBest ? e : best;
  }, null);
  if (candidate) {
    candidate.addDestination(floor);
  } else {
    externalQueue.push({ floor, direction });
  }
}
function serveQueuedRequests() {
  if (externalQueue.length === 0)
    return;
  const req = externalQueue.shift();
  const candidate = elevators.filter((e) => e.direction === 0).reduce((best, e) => {
    if (!best)
      return e;
    return Math.abs(e.currentFloor - req.floor) < Math.abs(best.currentFloor - req.floor) ? e : best;
  }, null);
  if (candidate)
    candidate.addDestination(req.floor);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
