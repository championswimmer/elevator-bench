// types.ts
var CONFIG = {
  NUM_FLOORS: 10,
  NUM_ELEVATORS: 4,
  ELEVATOR_SPEED: 1.6,
  DOOR_OPEN_DURATION: 1.6,
  FLOOR_HEIGHT_PX: 60
};

// Elevator.ts
class Elevator {
  id;
  numFloors;
  speed;
  doorOpenDuration;
  position = 0;
  direction = "idle";
  pendingUp = new Set;
  pendingDown = new Set;
  carCalls = new Set;
  doorOpen = false;
  doorTimer = 0;
  constructor(id, numFloors, speed, doorOpenDuration) {
    this.id = id;
    this.numFloors = numFloors;
    this.speed = speed;
    this.doorOpenDuration = doorOpenDuration;
  }
  get currentFloor() {
    return Math.round(this.position);
  }
  hasAnyStops() {
    return this.pendingUp.size + this.pendingDown.size + this.carCalls.size > 0;
  }
  addHallCall(floor, dir) {
    if (dir === "up")
      this.pendingUp.add(floor);
    else
      this.pendingDown.add(floor);
  }
  addCarCall(floor) {
    if (floor < 0 || floor >= this.numFloors)
      return;
    this.carCalls.add(floor);
  }
  hasStopsAbove(floor) {
    for (const f of this.pendingUp)
      if (f > floor)
        return true;
    for (const f of this.pendingDown)
      if (f > floor)
        return true;
    for (const f of this.carCalls)
      if (f > floor)
        return true;
    return false;
  }
  hasStopsBelow(floor) {
    for (const f of this.pendingUp)
      if (f < floor)
        return true;
    for (const f of this.pendingDown)
      if (f < floor)
        return true;
    for (const f of this.carCalls)
      if (f < floor)
        return true;
    return false;
  }
  computeNextTarget() {
    const eps = 0.001;
    const pos = this.position;
    if (this.direction === "up") {
      let nextUp = Infinity;
      for (const f of this.pendingUp)
        if (f >= pos - eps && f < nextUp)
          nextUp = f;
      for (const f of this.carCalls)
        if (f >= pos - eps && f < nextUp)
          nextUp = f;
      if (nextUp !== Infinity)
        return nextUp;
      let topDown = -Infinity;
      for (const f of this.pendingDown)
        if (f >= pos - eps && f > topDown)
          topDown = f;
      if (topDown !== -Infinity)
        return topDown;
      if (this.hasAnyStops()) {
        this.direction = "down";
        return this.computeNextTarget();
      }
      this.direction = "idle";
      return null;
    }
    if (this.direction === "down") {
      let nextDown = -Infinity;
      for (const f of this.pendingDown)
        if (f <= pos + eps && f > nextDown)
          nextDown = f;
      for (const f of this.carCalls)
        if (f <= pos + eps && f > nextDown)
          nextDown = f;
      if (nextDown !== -Infinity)
        return nextDown;
      let bottomUp = Infinity;
      for (const f of this.pendingUp)
        if (f <= pos + eps && f < bottomUp)
          bottomUp = f;
      if (bottomUp !== Infinity)
        return bottomUp;
      if (this.hasAnyStops()) {
        this.direction = "up";
        return this.computeNextTarget();
      }
      this.direction = "idle";
      return null;
    }
    if (!this.hasAnyStops())
      return null;
    const all = [
      ...this.pendingUp,
      ...this.pendingDown,
      ...this.carCalls
    ];
    let closest = all[0];
    for (const f of all) {
      if (Math.abs(f - pos) < Math.abs(closest - pos))
        closest = f;
    }
    if (closest > pos + eps)
      this.direction = "up";
    else if (closest < pos - eps)
      this.direction = "down";
    else {
      if (this.pendingUp.has(closest))
        this.direction = "up";
      else if (this.pendingDown.has(closest))
        this.direction = "down";
      else
        this.direction = "up";
    }
    return closest;
  }
  onArrive(floor) {
    const wasUp = this.pendingUp.has(floor);
    const wasDown = this.pendingDown.has(floor);
    let servedUp = false;
    let servedDown = false;
    this.carCalls.delete(floor);
    if (this.direction === "up") {
      if (wasUp) {
        this.pendingUp.delete(floor);
        servedUp = true;
      }
      if (!this.hasStopsAbove(floor)) {
        if (wasDown) {
          this.pendingDown.delete(floor);
          servedDown = true;
          this.direction = "down";
        } else if (this.hasStopsBelow(floor)) {
          this.direction = "down";
        } else {
          this.direction = "idle";
        }
      }
    } else if (this.direction === "down") {
      if (wasDown) {
        this.pendingDown.delete(floor);
        servedDown = true;
      }
      if (!this.hasStopsBelow(floor)) {
        if (wasUp) {
          this.pendingUp.delete(floor);
          servedUp = true;
          this.direction = "up";
        } else if (this.hasStopsAbove(floor)) {
          this.direction = "up";
        } else {
          this.direction = "idle";
        }
      }
    } else {
      if (wasUp) {
        this.pendingUp.delete(floor);
        servedUp = true;
      }
      if (wasDown) {
        this.pendingDown.delete(floor);
        servedDown = true;
      }
    }
    if (!this.hasAnyStops())
      this.direction = "idle";
    this.doorOpen = true;
    this.doorTimer = this.doorOpenDuration;
    return { up: servedUp, down: servedDown };
  }
  tick(dt) {
    if (this.doorOpen) {
      this.doorTimer -= dt;
      if (this.doorTimer <= 0) {
        this.doorOpen = false;
        this.doorTimer = 0;
      }
      return null;
    }
    const target = this.computeNextTarget();
    if (target === null)
      return null;
    const eps = 0.005;
    if (Math.abs(this.position - target) < eps) {
      this.position = target;
      const { up, down } = this.onArrive(target);
      return { arrived: true, floor: target, servedUp: up, servedDown: down };
    }
    const delta = this.speed * dt;
    if (target > this.position) {
      this.position = Math.min(this.position + delta, target);
    } else {
      this.position = Math.max(this.position - delta, target);
    }
    return null;
  }
}

// Building.ts
class Building {
  numFloors;
  elevators;
  hallUp = new Set;
  hallDown = new Set;
  constructor(numFloors, numElevators, speed, doorOpenDuration) {
    this.numFloors = numFloors;
    this.elevators = [];
    for (let i = 0;i < numElevators; i++) {
      this.elevators.push(new Elevator(i, numFloors, speed, doorOpenDuration));
    }
  }
  requestHallCall(floor, dir) {
    if (floor < 0 || floor >= this.numFloors)
      return;
    if (dir === "up" && floor === this.numFloors - 1)
      return;
    if (dir === "down" && floor === 0)
      return;
    if (dir === "up") {
      if (this.hallUp.has(floor))
        return;
      this.hallUp.add(floor);
    } else {
      if (this.hallDown.has(floor))
        return;
      this.hallDown.add(floor);
    }
    const best = this.findBestElevator(floor, dir);
    if (best)
      best.addHallCall(floor, dir);
  }
  requestCarCall(elevatorId, floor) {
    const e = this.elevators[elevatorId];
    if (!e)
      return;
    e.addCarCall(floor);
  }
  findBestElevator(floor, dir) {
    let best = null;
    let bestCost = Infinity;
    for (const e of this.elevators) {
      const c = this.cost(e, floor, dir);
      if (c < bestCost) {
        bestCost = c;
        best = e;
      }
    }
    return best;
  }
  cost(e, floor, dir) {
    const pos = e.position;
    const N = this.numFloors;
    if (e.direction === "idle" && !e.hasAnyStops()) {
      return Math.abs(pos - floor);
    }
    const allStops = [...e.pendingUp, ...e.pendingDown, ...e.carCalls];
    let top = pos;
    let bottom = pos;
    for (const f of allStops) {
      if (f > top)
        top = f;
      if (f < bottom)
        bottom = f;
    }
    if (e.direction === "up") {
      if (dir === "up" && floor >= pos) {
        return floor - pos + 0.1;
      }
      if (dir === "down") {
        const finalTop = Math.max(top, floor);
        return finalTop - pos + (finalTop - floor) + 0.5;
      }
      const finalBottom = Math.min(bottom, floor);
      return top - pos + (top - finalBottom) + (floor - finalBottom) + 1;
    }
    if (e.direction === "down") {
      if (dir === "down" && floor <= pos) {
        return pos - floor + 0.1;
      }
      if (dir === "up") {
        const finalBottom = Math.min(bottom, floor);
        return pos - finalBottom + (floor - finalBottom) + 0.5;
      }
      const finalTop = Math.max(top, floor);
      return pos - bottom + (finalTop - bottom) + (finalTop - floor) + 1;
    }
    return Math.abs(pos - floor) + N;
  }
  tick(dt) {
    for (const e of this.elevators) {
      const event = e.tick(dt);
      if (event && event.arrived) {
        if (event.servedUp)
          this.hallUp.delete(event.floor);
        if (event.servedDown)
          this.hallDown.delete(event.floor);
      }
    }
  }
}

// script.ts
var building = new Building(CONFIG.NUM_FLOORS, CONFIG.NUM_ELEVATORS, CONFIG.ELEVATOR_SPEED, CONFIG.DOOR_OPEN_DURATION);
function floorLabel(f) {
  return f === 0 ? "G" : String(f);
}
function setupBuildingDOM() {
  const root = document.getElementById("building");
  root.style.setProperty("--floor-height", CONFIG.FLOOR_HEIGHT_PX + "px");
  root.style.setProperty("--num-floors", String(CONFIG.NUM_FLOORS));
  const floorsCol = document.createElement("div");
  floorsCol.className = "floors-column";
  floorsCol.style.height = CONFIG.NUM_FLOORS * CONFIG.FLOOR_HEIGHT_PX + "px";
  for (let f = CONFIG.NUM_FLOORS - 1;f >= 0; f--) {
    const row = document.createElement("div");
    row.className = "floor-row";
    row.dataset.floor = String(f);
    const label = document.createElement("div");
    label.className = "floor-label";
    label.textContent = floorLabel(f);
    row.appendChild(label);
    const buttons = document.createElement("div");
    buttons.className = "hall-buttons";
    if (f < CONFIG.NUM_FLOORS - 1) {
      const upBtn = document.createElement("button");
      upBtn.className = "hall-btn up";
      upBtn.textContent = "▲";
      upBtn.dataset.floor = String(f);
      upBtn.dataset.dir = "up";
      upBtn.title = `Call up from floor ${floorLabel(f)}`;
      upBtn.addEventListener("click", () => building.requestHallCall(f, "up"));
      buttons.appendChild(upBtn);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "hall-btn placeholder";
      buttons.appendChild(placeholder);
    }
    if (f > 0) {
      const downBtn = document.createElement("button");
      downBtn.className = "hall-btn down";
      downBtn.textContent = "▼";
      downBtn.dataset.floor = String(f);
      downBtn.dataset.dir = "down";
      downBtn.title = `Call down from floor ${floorLabel(f)}`;
      downBtn.addEventListener("click", () => building.requestHallCall(f, "down"));
      buttons.appendChild(downBtn);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "hall-btn placeholder";
      buttons.appendChild(placeholder);
    }
    row.appendChild(buttons);
    floorsCol.appendChild(row);
  }
  root.appendChild(floorsCol);
  for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
    const shaft = document.createElement("div");
    shaft.className = "shaft";
    shaft.dataset.shaft = String(i);
    shaft.style.height = CONFIG.NUM_FLOORS * CONFIG.FLOOR_HEIGHT_PX + "px";
    const shaftLabel = document.createElement("div");
    shaftLabel.className = "shaft-label";
    shaftLabel.textContent = `E${i}`;
    shaft.appendChild(shaftLabel);
    const elevator = document.createElement("div");
    elevator.className = "elevator idle";
    elevator.id = "elevator-" + i;
    elevator.style.height = CONFIG.FLOOR_HEIGHT_PX + "px";
    const car = document.createElement("div");
    car.className = "elevator-car";
    const indicator = document.createElement("div");
    indicator.className = "elevator-indicator";
    indicator.id = "indicator-" + i;
    indicator.textContent = "•";
    const elevId = document.createElement("div");
    elevId.className = "elevator-id";
    elevId.textContent = String(i);
    const doorL = document.createElement("div");
    doorL.className = "door door-left";
    const doorR = document.createElement("div");
    doorR.className = "door door-right";
    car.appendChild(indicator);
    car.appendChild(elevId);
    car.appendChild(doorL);
    car.appendChild(doorR);
    elevator.appendChild(car);
    shaft.appendChild(elevator);
    root.appendChild(shaft);
  }
}
function setupElevatorPanels() {
  const panelsEl = document.getElementById("elevator-panels");
  for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
    const card = document.createElement("div");
    card.className = "elevator-panel";
    card.id = "panel-" + i;
    const header = document.createElement("div");
    header.className = "panel-header";
    const title = document.createElement("span");
    title.className = "panel-title";
    title.textContent = `Elevator ${i}`;
    const status = document.createElement("span");
    status.className = "panel-status";
    status.id = "status-" + i;
    status.textContent = "Idle • G";
    header.appendChild(title);
    header.appendChild(status);
    card.appendChild(header);
    const grid = document.createElement("div");
    grid.className = "car-buttons";
    for (let f = CONFIG.NUM_FLOORS - 1;f >= 0; f--) {
      const btn = document.createElement("button");
      btn.className = "car-btn";
      btn.textContent = floorLabel(f);
      btn.dataset.elevator = String(i);
      btn.dataset.floor = String(f);
      btn.addEventListener("click", () => building.requestCarCall(i, f));
      grid.appendChild(btn);
    }
    card.appendChild(grid);
    panelsEl.appendChild(card);
  }
}
function render() {
  document.querySelectorAll(".hall-btn").forEach((btn) => {
    if (!btn.dataset.dir)
      return;
    const f = Number(btn.dataset.floor);
    const dir = btn.dataset.dir;
    const lit = dir === "up" ? building.hallUp.has(f) : building.hallDown.has(f);
    btn.classList.toggle("lit", lit);
  });
  for (let i = 0;i < CONFIG.NUM_ELEVATORS; i++) {
    const e = building.elevators[i];
    const elev = document.getElementById("elevator-" + i);
    const offsetPx = e.position * CONFIG.FLOOR_HEIGHT_PX;
    elev.style.transform = `translateY(-${offsetPx}px)`;
    elev.classList.toggle("moving-up", e.direction === "up" && !e.doorOpen);
    elev.classList.toggle("moving-down", e.direction === "down" && !e.doorOpen);
    elev.classList.toggle("idle", e.direction === "idle" && !e.doorOpen);
    elev.classList.toggle("door-open", e.doorOpen);
    const indicator = document.getElementById("indicator-" + i);
    if (e.doorOpen)
      indicator.textContent = "◇";
    else if (e.direction === "up")
      indicator.textContent = "▲";
    else if (e.direction === "down")
      indicator.textContent = "▼";
    else
      indicator.textContent = "•";
    const status = document.getElementById("status-" + i);
    let dirText;
    if (e.doorOpen)
      dirText = "Doors Open";
    else if (e.direction === "up")
      dirText = "Going Up";
    else if (e.direction === "down")
      dirText = "Going Down";
    else
      dirText = "Idle";
    status.textContent = `${dirText} • ${floorLabel(e.currentFloor)}`;
    const panel = document.getElementById("panel-" + i);
    panel.querySelectorAll(".car-btn").forEach((btn) => {
      const f = Number(btn.dataset.floor);
      btn.classList.toggle("lit", e.carCalls.has(f));
      btn.classList.toggle("current", e.currentFloor === f && e.doorOpen);
    });
  }
}
var lastTime = 0;
function loop(time) {
  const dt = lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;
  building.tick(dt);
  render();
  requestAnimationFrame(loop);
}
function init() {
  setupBuildingDOM();
  setupElevatorPanels();
  render();
  requestAnimationFrame(loop);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
