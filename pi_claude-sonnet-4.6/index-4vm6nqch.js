// elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  status;
  stops;
  onUpdate = null;
  numFloors;
  moveTime;
  doorTime;
  running = false;
  constructor(id, numFloors, moveTime = 800, doorTime = 1500) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = 0 /* IDLE */;
    this.status = "idle" /* IDLE */;
    this.stops = new Set;
    this.numFloors = numFloors;
    this.moveTime = moveTime;
    this.doorTime = doorTime;
  }
  isIdle() {
    return !this.running && this.stops.size === 0;
  }
  willPass(floor, direction) {
    if (!this.running || this.direction === 0 /* IDLE */)
      return false;
    if (this.direction !== direction)
      return false;
    if (direction === 1 /* UP */ && floor > this.currentFloor)
      return true;
    if (direction === -1 /* DOWN */ && floor < this.currentFloor)
      return true;
    return false;
  }
  addStop(floor) {
    if (floor < 0 || floor >= this.numFloors)
      return;
    this.stops.add(floor);
    if (!this.running) {
      this.run().catch(console.error);
    }
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async run() {
    this.running = true;
    while (true) {
      if (this.stops.has(this.currentFloor)) {
        this.stops.delete(this.currentFloor);
        this.status = "doors_open" /* DOORS_OPEN */;
        this.onUpdate?.(this);
        await this.sleep(this.doorTime);
      }
      if (this.stops.size === 0)
        break;
      const stopsArr = [...this.stops];
      const hasAbove = stopsArr.some((f) => f > this.currentFloor);
      const hasBelow = stopsArr.some((f) => f < this.currentFloor);
      if (this.direction === 1 /* UP */) {
        if (!hasAbove && hasBelow)
          this.direction = -1 /* DOWN */;
      } else if (this.direction === -1 /* DOWN */) {
        if (!hasBelow && hasAbove)
          this.direction = 1 /* UP */;
      } else {
        if (hasAbove && hasBelow) {
          const nearestAbove = Math.min(...stopsArr.filter((f) => f > this.currentFloor));
          const nearestBelow = Math.max(...stopsArr.filter((f) => f < this.currentFloor));
          this.direction = nearestAbove - this.currentFloor <= this.currentFloor - nearestBelow ? 1 /* UP */ : -1 /* DOWN */;
        } else if (hasAbove) {
          this.direction = 1 /* UP */;
        } else {
          this.direction = -1 /* DOWN */;
        }
      }
      if (this.direction === 0 /* IDLE */)
        break;
      this.currentFloor += this.direction;
      this.status = "moving" /* MOVING */;
      this.onUpdate?.(this);
      await this.sleep(this.moveTime);
    }
    this.direction = 0 /* IDLE */;
    this.status = "idle" /* IDLE */;
    this.running = false;
    this.onUpdate?.(this);
  }
}

// building.ts
class Building {
  numFloors;
  numElevators;
  elevators;
  pendingRequests = [];
  activeCallButtons = new Set;
  onUpdate = null;
  onLog = null;
  constructor(numFloors, numElevators) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    this.elevators = Array.from({ length: numElevators }, (_, i) => {
      const e = new Elevator(i, numFloors);
      e.onUpdate = (elevator) => this.handleElevatorUpdate(elevator);
      return e;
    });
  }
  callElevator(floor, direction) {
    const key = callKey(floor, direction);
    if (this.activeCallButtons.has(key))
      return;
    const label = direction === 1 /* UP */ ? "▲" : "▼";
    this.log(`Floor ${floor}: call button ${label} pressed`);
    this.activeCallButtons.add(key);
    const request = { floor, direction };
    if (!this.tryAssign(request)) {
      this.pendingRequests.push(request);
      this.log(`Floor ${floor}: request queued — all elevators busy`);
    }
    this.onUpdate?.();
  }
  pressFloorButton(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (elevator.stops.has(floor)) {
      this.log(`E${elevatorId}: floor ${floor} already queued`);
      return;
    }
    this.log(`E${elevatorId}: floor ${floor} selected (inside)`);
    elevator.addStop(floor);
    this.onUpdate?.();
  }
  tryAssign(request) {
    const { floor, direction } = request;
    let best = null;
    let bestScore = Infinity;
    for (const elevator of this.elevators) {
      let score = null;
      if (elevator.isIdle()) {
        score = Math.abs(elevator.currentFloor - floor);
      } else if (elevator.willPass(floor, direction)) {
        score = Math.abs(elevator.currentFloor - floor) + 0.5;
      }
      if (score !== null && score < bestScore) {
        bestScore = score;
        best = elevator;
      }
    }
    if (best) {
      this.log(`Assigned floor ${floor} request to E${best.id}`);
      best.addStop(floor);
      return true;
    }
    return false;
  }
  handleElevatorUpdate(elevator) {
    if (elevator.status === "doors_open" /* DOORS_OPEN */) {
      const upKey = callKey(elevator.currentFloor, 1 /* UP */);
      const downKey = callKey(elevator.currentFloor, -1 /* DOWN */);
      const clearedUp = this.activeCallButtons.delete(upKey);
      const clearedDn = this.activeCallButtons.delete(downKey);
      if (clearedUp || clearedDn) {
        this.log(`E${elevator.id}: arrived at floor ${elevator.currentFloor} — doors open`);
      }
    }
    if (elevator.status === "idle" /* IDLE */) {
      this.log(`E${elevator.id}: idle at floor ${elevator.currentFloor}`);
    }
    if (this.pendingRequests.length > 0) {
      const stillPending = [];
      for (const req of this.pendingRequests) {
        if (!this.tryAssign(req)) {
          stillPending.push(req);
        }
      }
      this.pendingRequests = stillPending;
    }
    this.onUpdate?.();
  }
  log(msg) {
    this.onLog?.(msg);
  }
}
function callKey(floor, direction) {
  return `${floor}-${direction}`;
}

// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var FLOOR_HEIGHT = 88;
var ELEVATOR_H = 70;
var SHAFT_W = 96;
var MOVE_TIME = 800;
var DOOR_TIME = 1500;
var building = new Building(NUM_FLOORS, NUM_ELEVATORS);
building.elevators.forEach((e) => {
  e.moveTime = MOVE_TIME;
  e.doorTime = DOOR_TIME;
});
building.onUpdate = renderAll;
building.onLog = addLogEntry;
var floorsCol = document.getElementById("floors-col");
var shaftsArea = document.getElementById("shafts-area");
var controlPanels = document.getElementById("control-panels");
var eventLog = document.getElementById("event-log");
function buildUI() {
  buildFloorColumn();
  buildShafts();
  buildInteriorPanels();
}
function buildFloorColumn() {
  for (let f = NUM_FLOORS - 1;f >= 0; f--) {
    const row = document.createElement("div");
    row.className = "floor-row";
    row.style.height = `${FLOOR_HEIGHT}px`;
    const badge = document.createElement("span");
    badge.className = "floor-badge";
    badge.textContent = String(f);
    row.appendChild(badge);
    const grp = document.createElement("div");
    grp.className = "call-btn-group";
    const makeBtn = (dir, symbol, label) => {
      const btn = document.createElement("button");
      btn.className = `call-btn ${dir === 1 /* UP */ ? "up" : "down"}`;
      btn.id = `call-${f}-${dir === 1 /* UP */ ? "up" : "down"}`;
      btn.innerHTML = symbol;
      btn.title = `Call elevator — floor ${f} going ${label}`;
      btn.addEventListener("click", () => building.callElevator(f, dir));
      return btn;
    };
    if (f < NUM_FLOORS - 1) {
      grp.appendChild(makeBtn(1 /* UP */, "&#9650;", "up"));
    } else {
      grp.appendChild(spacer());
    }
    if (f > 0) {
      grp.appendChild(makeBtn(-1 /* DOWN */, "&#9660;", "down"));
    } else {
      grp.appendChild(spacer());
    }
    row.appendChild(grp);
    floorsCol.appendChild(row);
  }
}
function buildShafts() {
  const labelRow = document.createElement("div");
  labelRow.className = "shaft-labels-row";
  const body = document.createElement("div");
  body.className = "shafts-body";
  body.style.height = `${NUM_FLOORS * FLOOR_HEIGHT}px`;
  body.style.width = `${NUM_ELEVATORS * SHAFT_W}px`;
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const lbl = document.createElement("div");
    lbl.className = "shaft-lbl";
    lbl.style.width = `${SHAFT_W}px`;
    lbl.textContent = `E${i}`;
    labelRow.appendChild(lbl);
    const shaft = document.createElement("div");
    shaft.className = "shaft";
    shaft.style.width = `${SHAFT_W}px`;
    for (let f = 0;f <= NUM_FLOORS; f++) {
      const line = document.createElement("div");
      line.className = "shaft-guide";
      line.style.bottom = `${f * FLOOR_HEIGHT}px`;
      shaft.appendChild(line);
    }
    const car = document.createElement("div");
    car.className = "elevator-car idle";
    car.id = `car-${i}`;
    car.style.cssText = [
      `bottom: ${carBottom(0)}px`,
      `width: ${SHAFT_W - 14}px`,
      `height: ${ELEVATOR_H}px`,
      `transition: bottom ${MOVE_TIME}ms linear`
    ].join("; ");
    car.innerHTML = `
      <div class="car-doors">
        <div class="door-panel left"></div>
        <div class="door-panel right"></div>
      </div>
      <div class="car-hud">
        <span class="hud-id">E${i}</span>
        <span class="hud-floor" id="hud-floor-${i}">0</span>
        <span class="hud-dir"   id="hud-dir-${i}">&#8226;</span>
      </div>`;
    shaft.appendChild(car);
    body.appendChild(shaft);
  }
  shaftsArea.appendChild(labelRow);
  shaftsArea.appendChild(body);
}
function buildInteriorPanels() {
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const panel = document.createElement("div");
    panel.className = "interior-panel";
    panel.innerHTML = `
      <div class="panel-title">Elevator ${i}</div>
      <div class="panel-status" id="pstatus-${i}">IDLE &nbsp;·&nbsp; Floor 0</div>`;
    const grid = document.createElement("div");
    grid.className = "floor-btn-grid";
    for (let f = NUM_FLOORS - 1;f >= 0; f--) {
      const btn = document.createElement("button");
      btn.className = "floor-btn";
      btn.id = `ibtn-${i}-${f}`;
      btn.textContent = String(f);
      btn.title = `Select floor ${f} inside elevator ${i}`;
      btn.addEventListener("click", () => building.pressFloorButton(i, f));
      grid.appendChild(btn);
    }
    panel.appendChild(grid);
    controlPanels.appendChild(panel);
  }
}
function spacer() {
  const d = document.createElement("div");
  d.className = "btn-spacer";
  return d;
}
function renderAll() {
  renderElevators();
  renderCallButtons();
}
function renderElevators() {
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const elev = building.elevators[i];
    const car = document.getElementById(`car-${i}`);
    const hudFloor = document.getElementById(`hud-floor-${i}`);
    const hudDir = document.getElementById(`hud-dir-${i}`);
    const pstatus = document.getElementById(`pstatus-${i}`);
    car.style.bottom = `${carBottom(elev.currentFloor)}px`;
    car.className = `elevator-car ${elev.status}`;
    hudFloor.textContent = String(elev.currentFloor);
    hudDir.innerHTML = elev.direction === 1 /* UP */ ? "&#9650;" : elev.direction === -1 /* DOWN */ ? "&#9660;" : "&#8226;";
    const mvLabel = elev.status === "idle" /* IDLE */ ? "IDLE" : elev.status === "moving" /* MOVING */ ? `MOVING ${elev.direction === 1 /* UP */ ? "▲" : "▼"}` : "DOORS OPEN";
    pstatus.textContent = `${mvLabel}  ·  Floor ${elev.currentFloor}`;
    for (let f = 0;f < NUM_FLOORS; f++) {
      const btn = document.getElementById(`ibtn-${i}-${f}`);
      btn.className = "floor-btn";
      if (elev.stops.has(f))
        btn.classList.add("queued");
      if (elev.currentFloor === f && elev.status === "doors_open" /* DOORS_OPEN */) {
        btn.classList.add("open");
      }
    }
  }
}
function renderCallButtons() {
  for (let f = 0;f < NUM_FLOORS; f++) {
    const up = document.getElementById(`call-${f}-up`);
    const dn = document.getElementById(`call-${f}-down`);
    if (up)
      up.classList.toggle("active", building.activeCallButtons.has(`${f}-${1 /* UP */}`));
    if (dn)
      dn.classList.toggle("active", building.activeCallButtons.has(`${f}-${-1 /* DOWN */}`));
  }
}
function addLogEntry(msg) {
  const ts = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-ts">${ts}</span> <span class="log-msg">${msg}</span>`;
  eventLog.insertBefore(entry, eventLog.firstChild);
  while (eventLog.children.length > 80) {
    eventLog.removeChild(eventLog.lastChild);
  }
}
function carBottom(floor) {
  return floor * FLOOR_HEIGHT + Math.floor((FLOOR_HEIGHT - ELEVATOR_H) / 2);
}
buildUI();
renderAll();
