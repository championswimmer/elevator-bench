import { Building } from "./building";
import { Direction, ElevatorStatus } from "./elevator";

// ─── Simulation Constants ─────────────────────────────────────────────────────
const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;
const FLOOR_HEIGHT = 88;    // px — height of each floor row
const ELEVATOR_H = 70;      // px — elevator car height (< FLOOR_HEIGHT)
const SHAFT_W = 96;         // px — width of each shaft column
const MOVE_TIME = 800;      // ms per floor of travel
const DOOR_TIME = 1500;     // ms doors stay open

// ─── Bootstrap ────────────────────────────────────────────────────────────────
const building = new Building(NUM_FLOORS, NUM_ELEVATORS);
// Override timing on the elevator objects (constructor defaults already match,
// but exposing them here makes the constants authoritative)
building.elevators.forEach((e) => {
  (e as any).moveTime = MOVE_TIME;
  (e as any).doorTime = DOOR_TIME;
});

building.onUpdate = renderAll;
building.onLog = addLogEntry;

// ─── DOM References ───────────────────────────────────────────────────────────
const floorsCol = document.getElementById("floors-col")!;
const shaftsArea = document.getElementById("shafts-area")!;
const controlPanels = document.getElementById("control-panels")!;
const eventLog = document.getElementById("event-log")!;

// ─── Build UI ─────────────────────────────────────────────────────────────────

function buildUI(): void {
  buildFloorColumn();
  buildShafts();
  buildInteriorPanels();
}

/** Floor column: numbered rows with UP / DOWN hall-call buttons */
function buildFloorColumn(): void {
  for (let f = NUM_FLOORS - 1; f >= 0; f--) {
    const row = document.createElement("div");
    row.className = "floor-row";
    row.style.height = `${FLOOR_HEIGHT}px`;

    // Floor number badge
    const badge = document.createElement("span");
    badge.className = "floor-badge";
    badge.textContent = String(f);
    row.appendChild(badge);

    // Button group
    const grp = document.createElement("div");
    grp.className = "call-btn-group";

    const makeBtn = (dir: Direction, symbol: string, label: string) => {
      const btn = document.createElement("button");
      btn.className = `call-btn ${dir === Direction.UP ? "up" : "down"}`;
      btn.id = `call-${f}-${dir === Direction.UP ? "up" : "down"}`;
      btn.innerHTML = symbol;
      btn.title = `Call elevator — floor ${f} going ${label}`;
      btn.addEventListener("click", () => building.callElevator(f, dir));
      return btn;
    };

    // UP: every floor except top
    if (f < NUM_FLOORS - 1) {
      grp.appendChild(makeBtn(Direction.UP, "&#9650;", "up"));
    } else {
      grp.appendChild(spacer());
    }

    // DOWN: every floor except ground
    if (f > 0) {
      grp.appendChild(makeBtn(Direction.DOWN, "&#9660;", "down"));
    } else {
      grp.appendChild(spacer());
    }

    row.appendChild(grp);
    floorsCol.appendChild(row);
  }
}

/** Shaft area: one vertical column per elevator, cars are absolute children */
function buildShafts(): void {
  // ── Shaft-label row ──
  const labelRow = document.createElement("div");
  labelRow.className = "shaft-labels-row";

  // ── Shaft body ──
  const body = document.createElement("div");
  body.className = "shafts-body";
  body.style.height = `${NUM_FLOORS * FLOOR_HEIGHT}px`;
  body.style.width = `${NUM_ELEVATORS * SHAFT_W}px`;

  for (let i = 0; i < NUM_ELEVATORS; i++) {
    // Label
    const lbl = document.createElement("div");
    lbl.className = "shaft-lbl";
    lbl.style.width = `${SHAFT_W}px`;
    lbl.textContent = `E${i}`;
    labelRow.appendChild(lbl);

    // Shaft column
    const shaft = document.createElement("div");
    shaft.className = "shaft";
    shaft.style.width = `${SHAFT_W}px`;

    // Horizontal floor-line guides
    for (let f = 0; f <= NUM_FLOORS; f++) {
      const line = document.createElement("div");
      line.className = "shaft-guide";
      line.style.bottom = `${f * FLOOR_HEIGHT}px`;
      shaft.appendChild(line);
    }

    // Elevator car
    const car = document.createElement("div");
    car.className = "elevator-car idle";
    car.id = `car-${i}`;
    car.style.cssText = [
      `bottom: ${carBottom(0)}px`,
      `width: ${SHAFT_W - 14}px`,
      `height: ${ELEVATOR_H}px`,
      `transition: bottom ${MOVE_TIME}ms linear`,
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

/** Interior control panel per elevator — passengers select destinations here */
function buildInteriorPanels(): void {
  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const panel = document.createElement("div");
    panel.className = "interior-panel";

    panel.innerHTML = `
      <div class="panel-title">Elevator ${i}</div>
      <div class="panel-status" id="pstatus-${i}">IDLE &nbsp;·&nbsp; Floor 0</div>`;

    const grid = document.createElement("div");
    grid.className = "floor-btn-grid";

    // Render buttons 9→0 so highest floor is at top (natural reading order)
    for (let f = NUM_FLOORS - 1; f >= 0; f--) {
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

function spacer(): HTMLElement {
  const d = document.createElement("div");
  d.className = "btn-spacer";
  return d;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderAll(): void {
  renderElevators();
  renderCallButtons();
}

function renderElevators(): void {
  for (let i = 0; i < NUM_ELEVATORS; i++) {
    const elev = building.elevators[i];
    const car = document.getElementById(`car-${i}`) as HTMLElement;
    const hudFloor = document.getElementById(`hud-floor-${i}`) as HTMLElement;
    const hudDir = document.getElementById(`hud-dir-${i}`) as HTMLElement;
    const pstatus = document.getElementById(`pstatus-${i}`) as HTMLElement;

    // ── Position ──
    // Transition is always "bottom Xms linear" — changing bottom triggers it.
    car.style.bottom = `${carBottom(elev.currentFloor)}px`;

    // ── Status class (controls colour + door animation) ──
    car.className = `elevator-car ${elev.status}`;

    // ── HUD ──
    hudFloor.textContent = String(elev.currentFloor);
    hudDir.innerHTML =
      elev.direction === Direction.UP
        ? "&#9650;"
        : elev.direction === Direction.DOWN
        ? "&#9660;"
        : "&#8226;";

    // ── Interior panel status line ──
    const mvLabel =
      elev.status === ElevatorStatus.IDLE
        ? "IDLE"
        : elev.status === ElevatorStatus.MOVING
        ? `MOVING ${elev.direction === Direction.UP ? "▲" : "▼"}`
        : "DOORS OPEN";
    pstatus.textContent = `${mvLabel}  ·  Floor ${elev.currentFloor}`;

    // ── Interior floor buttons: highlight queued stops ──
    for (let f = 0; f < NUM_FLOORS; f++) {
      const btn = document.getElementById(`ibtn-${i}-${f}`) as HTMLElement;
      btn.className = "floor-btn";
      if (elev.stops.has(f)) btn.classList.add("queued");
      if (
        elev.currentFloor === f &&
        elev.status === ElevatorStatus.DOORS_OPEN
      ) {
        btn.classList.add("open");
      }
    }
  }
}

function renderCallButtons(): void {
  for (let f = 0; f < NUM_FLOORS; f++) {
    const up = document.getElementById(`call-${f}-up`);
    const dn = document.getElementById(`call-${f}-down`);
    if (up) up.classList.toggle("active", building.activeCallButtons.has(`${f}-${Direction.UP}`));
    if (dn) dn.classList.toggle("active", building.activeCallButtons.has(`${f}-${Direction.DOWN}`));
  }
}

// ─── Event Log ────────────────────────────────────────────────────────────────

function addLogEntry(msg: string): void {
  const ts = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-ts">${ts}</span> <span class="log-msg">${msg}</span>`;
  eventLog.insertBefore(entry, eventLog.firstChild);
  // Cap log at 80 lines
  while (eventLog.children.length > 80) {
    eventLog.removeChild(eventLog.lastChild!);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Bottom offset (px) of an elevator car sitting on `floor` */
function carBottom(floor: number): number {
  return floor * FLOOR_HEIGHT + Math.floor((FLOOR_HEIGHT - ELEVATOR_H) / 2);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
buildUI();
renderAll();
