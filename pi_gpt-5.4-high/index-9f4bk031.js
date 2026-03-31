// script.ts
var CONFIG = Object.freeze({
  totalFloors: 10,
  elevatorCount: 4,
  floorHeightPx: 72,
  travelTimeMs: 700,
  doorOpenMs: 900,
  maxLogEntries: 12
});
var DIRECTION = Object.freeze({
  up: "up",
  down: "down",
  idle: "idle"
});
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Elevator {
  constructor(id) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = DIRECTION.idle;
    this.status = "idle";
    this.processing = false;
    this.doorOpen = false;
    this.scheduledFloors = new Set;
    this.carRequestFloors = new Set;
    this.hallRequestsByFloor = new Map;
  }
  isIdle() {
    return !this.processing && this.direction === DIRECTION.idle && this.scheduledFloors.size === 0;
  }
  scheduleHallRequest(request) {
    const existing = this.hallRequestsByFloor.get(request.floor) ?? [];
    existing.push(request);
    this.hallRequestsByFloor.set(request.floor, existing);
    this.scheduledFloors.add(request.floor);
  }
  scheduleCarRequest(floor) {
    const alreadyScheduled = this.carRequestFloors.has(floor);
    this.carRequestFloors.add(floor);
    this.scheduledFloors.add(floor);
    return !alreadyScheduled;
  }
  hasScheduledAbove() {
    for (const floor of this.scheduledFloors) {
      if (floor > this.currentFloor) {
        return true;
      }
    }
    return false;
  }
  hasScheduledBelow() {
    for (const floor of this.scheduledFloors) {
      if (floor < this.currentFloor) {
        return true;
      }
    }
    return false;
  }
  hasCurrentFloorStop() {
    return this.scheduledFloors.has(this.currentFloor);
  }
  chooseDirectionFromIdle() {
    let nearestAbove = Infinity;
    let nearestBelow = Infinity;
    for (const floor of this.scheduledFloors) {
      if (floor > this.currentFloor) {
        nearestAbove = Math.min(nearestAbove, floor - this.currentFloor);
      } else if (floor < this.currentFloor) {
        nearestBelow = Math.min(nearestBelow, this.currentFloor - floor);
      } else {
        return DIRECTION.idle;
      }
    }
    if (nearestAbove === Infinity && nearestBelow === Infinity) {
      return DIRECTION.idle;
    }
    if (nearestAbove < nearestBelow) {
      return DIRECTION.up;
    }
    if (nearestBelow < nearestAbove) {
      return DIRECTION.down;
    }
    return nearestAbove !== Infinity ? DIRECTION.up : DIRECTION.down;
  }
  directionLabel() {
    if (this.direction === DIRECTION.up) {
      return "Up";
    }
    if (this.direction === DIRECTION.down) {
      return "Down";
    }
    return "Idle";
  }
  statusLabel() {
    if (this.status === "moving") {
      return "Moving";
    }
    if (this.status === "doors") {
      return "Doors open";
    }
    return "Idle";
  }
  directionSymbol() {
    if (this.direction === DIRECTION.up) {
      return "↑";
    }
    if (this.direction === DIRECTION.down) {
      return "↓";
    }
    return "•";
  }
}

class BuildingSimulator {
  constructor() {
    this.pendingHallRequests = [];
    this.activeHallRequests = new Map;
    this.logEntries = [];
    this.elevators = Array.from({ length: CONFIG.elevatorCount }, (_, id) => new Elevator(id));
    this.floorsPanel = document.querySelector("#floors-panel");
    this.shaftTitleRow = document.querySelector("#shaft-title-row");
    this.shaftsStage = document.querySelector("#shafts-stage");
    this.queueSummary = document.querySelector("#queue-summary");
    this.elevatorPanels = document.querySelector("#elevator-panels");
    this.activityLog = document.querySelector("#activity-log");
    this.resetButton = document.querySelector("#reset-button");
    this.applyCssVariables();
    this.renderStaticShafts();
    this.bindEvents();
    this.pushLog("Simulator ready. All elevators are idle at floor 0.");
    this.render();
  }
  applyCssVariables() {
    document.documentElement.style.setProperty("--floor-count", String(CONFIG.totalFloors));
    document.documentElement.style.setProperty("--elevator-count", String(CONFIG.elevatorCount));
    document.documentElement.style.setProperty("--floor-height", `${CONFIG.floorHeightPx}px`);
    document.documentElement.style.setProperty("--travel-time", `${CONFIG.travelTimeMs}ms`);
  }
  bindEvents() {
    this.floorsPanel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-floor][data-direction]");
      if (!button) {
        return;
      }
      const floor = Number(button.dataset.floor);
      const direction = button.dataset.direction;
      this.handleHallRequest(floor, direction);
    });
    this.elevatorPanels.addEventListener("click", (event) => {
      const button = event.target.closest("[data-elevator-id][data-target-floor]");
      if (!button) {
        return;
      }
      const elevatorId = Number(button.dataset.elevatorId);
      const floor = Number(button.dataset.targetFloor);
      this.handleCarRequest(elevatorId, floor);
    });
    this.resetButton.addEventListener("click", () => {
      window.location.reload();
    });
  }
  renderStaticShafts() {
    this.shaftTitleRow.innerHTML = this.elevators.map((elevator) => `<div class="shaft-label">E${elevator.id}</div>`).join("");
    this.shaftsStage.innerHTML = this.elevators.map((elevator) => `
          <div class="shaft-column">
            <div id="car-${elevator.id}" class="elevator-car" aria-label="Elevator ${elevator.id}">
              <div class="car-display">
                <span class="car-name">E${elevator.id}</span>
                <span class="car-floor">0</span>
                <span class="car-direction">•</span>
              </div>
            </div>
          </div>
        `).join("");
  }
  render() {
    this.renderFloors();
    this.renderQueue();
    this.renderCars();
    this.renderElevatorPanels();
    this.renderLog();
  }
  renderFloors() {
    const rows = [];
    for (let floor = CONFIG.totalFloors - 1;floor >= 0; floor -= 1) {
      const buttons = [];
      const floorLabel = floor === 0 ? "Ground floor" : floor === CONFIG.totalFloors - 1 ? "Top floor" : "Middle floor";
      if (floor < CONFIG.totalFloors - 1) {
        buttons.push(this.renderHallButton(floor, DIRECTION.up, "↑ Up"));
      }
      if (floor > 0) {
        buttons.push(this.renderHallButton(floor, DIRECTION.down, "↓ Down"));
      }
      rows.push(`
        <div class="floor-row">
          <div class="floor-title">
            <strong>Floor ${floor}</strong>
            <span>${floorLabel}</span>
          </div>
          <div class="call-button-group">${buttons.join("")}</div>
        </div>
      `);
    }
    this.floorsPanel.innerHTML = rows.join("");
  }
  renderHallButton(floor, direction, label) {
    const request = this.activeHallRequests.get(this.requestKey(floor, direction));
    const classes = ["call-button"];
    let suffix = "";
    if (request?.status === "pending") {
      classes.push("is-waiting");
      suffix = " · queued";
    }
    if (request?.status === "assigned") {
      classes.push("is-assigned");
      suffix = ` · E${request.assignedElevatorId}`;
    }
    return `
      <button
        type="button"
        class="${classes.join(" ")}"
        data-floor="${floor}"
        data-direction="${direction}"
        aria-label="${label} from floor ${floor}"
      >
        ${label}${suffix}
      </button>
    `;
  }
  renderQueue() {
    const pendingText = this.pendingHallRequests.length ? this.pendingHallRequests.map((request) => `F${request.floor} ${request.direction}`).join(" · ") : "No pending hall requests.";
    const assigned = Array.from(this.activeHallRequests.values()).filter((request) => request.status === "assigned").map((request) => `F${request.floor} ${request.direction} → E${request.assignedElevatorId}`);
    this.queueSummary.textContent = assigned.length ? `${pendingText} Assigned: ${assigned.join(" · ")}` : pendingText;
  }
  renderCars() {
    this.elevators.forEach((elevator) => {
      const car = document.querySelector(`#car-${elevator.id}`);
      const top = this.floorToTop(elevator.currentFloor);
      car.style.top = `${top}px`;
      car.classList.toggle("is-moving", elevator.status === "moving");
      car.classList.toggle("doors-open", elevator.doorOpen);
      car.querySelector(".car-floor").textContent = String(elevator.currentFloor);
      car.querySelector(".car-direction").textContent = elevator.directionSymbol();
      car.setAttribute("aria-label", `Elevator ${elevator.id}, floor ${elevator.currentFloor}, ${elevator.statusLabel()}, direction ${elevator.directionLabel()}`);
    });
  }
  renderElevatorPanels() {
    this.elevatorPanels.innerHTML = this.elevators.map((elevator) => {
      const activeStops = Array.from(elevator.scheduledFloors).sort((a, b) => b - a);
      const statusClass = elevator.status === "moving" ? "is-moving" : elevator.status === "doors" ? "is-doors" : "is-idle";
      return `
          <section class="elevator-panel">
            <div class="elevator-panel-header">
              <div>
                <strong>Elevator E${elevator.id}</strong>
                <span>Floor ${elevator.currentFloor} · ${elevator.directionLabel()}</span>
              </div>
              <span class="status-pill ${statusClass}">${elevator.statusLabel()}</span>
            </div>
            <p>Scheduled stops: ${activeStops.length ? activeStops.join(", ") : "none"}</p>
            <div class="floor-button-grid">
              ${this.renderCarButtons(elevator)}
            </div>
          </section>
        `;
    }).join("");
  }
  renderCarButtons(elevator) {
    const buttons = [];
    for (let floor = CONFIG.totalFloors - 1;floor >= 0; floor -= 1) {
      const isActive = elevator.carRequestFloors.has(floor);
      buttons.push(`
        <button
          type="button"
          class="car-button ${isActive ? "is-active" : ""}"
          data-elevator-id="${elevator.id}"
          data-target-floor="${floor}"
          aria-label="Send elevator ${elevator.id} to floor ${floor}"
        >
          ${floor}
        </button>
      `);
    }
    return buttons.join("");
  }
  renderLog() {
    if (!this.logEntries.length) {
      this.activityLog.innerHTML = '<li class="empty-log">No activity yet.</li>';
      return;
    }
    this.activityLog.innerHTML = this.logEntries.map((entry) => `
          <li>
            <span class="log-time">${entry.time}</span>
            <span class="log-message">${entry.message}</span>
          </li>
        `).join("");
  }
  requestKey(floor, direction) {
    return `${floor}:${direction}`;
  }
  handleHallRequest(floor, direction) {
    const key = this.requestKey(floor, direction);
    if (this.activeHallRequests.has(key)) {
      this.pushLog(`Hall call on floor ${floor} (${direction}) is already active.`);
      this.render();
      return;
    }
    const request = {
      key,
      floor,
      direction,
      status: "pending",
      assignedElevatorId: null,
      createdAt: Date.now()
    };
    this.activeHallRequests.set(key, request);
    this.pendingHallRequests.push(request);
    this.pushLog(`Registered ${direction} hall call at floor ${floor}.`);
    this.assignQueuedHallRequests();
    this.render();
  }
  handleCarRequest(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    const wasAdded = elevator.scheduleCarRequest(floor);
    if (!wasAdded) {
      this.pushLog(`Floor ${floor} is already scheduled inside E${elevator.id}.`);
      this.render();
      return;
    }
    this.pushLog(`Destination floor ${floor} selected inside E${elevator.id}.`);
    this.render();
    this.runElevator(elevator);
  }
  assignQueuedHallRequests() {
    if (!this.pendingHallRequests.length) {
      return;
    }
    const remaining = [];
    for (const request of this.pendingHallRequests) {
      const elevator = this.findClosestIdleElevator(request.floor);
      if (!elevator) {
        remaining.push(request);
        continue;
      }
      request.status = "assigned";
      request.assignedElevatorId = elevator.id;
      elevator.scheduleHallRequest(request);
      this.pushLog(`Assigned floor ${request.floor} (${request.direction}) to E${elevator.id}.`);
      this.runElevator(elevator);
    }
    this.pendingHallRequests = remaining;
  }
  findClosestIdleElevator(floor) {
    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
    if (!idleElevators.length) {
      return null;
    }
    idleElevators.sort((left, right) => {
      const distanceDifference = Math.abs(left.currentFloor - floor) - Math.abs(right.currentFloor - floor);
      if (distanceDifference !== 0) {
        return distanceDifference;
      }
      return left.id - right.id;
    });
    return idleElevators[0];
  }
  async runElevator(elevator) {
    if (elevator.processing) {
      return;
    }
    elevator.processing = true;
    while (elevator.scheduledFloors.size > 0) {
      if (elevator.hasCurrentFloorStop()) {
        await this.openDoors(elevator);
        continue;
      }
      if (elevator.direction === DIRECTION.idle) {
        elevator.direction = elevator.chooseDirectionFromIdle();
      }
      if (elevator.direction === DIRECTION.up && !elevator.hasScheduledAbove()) {
        elevator.direction = elevator.hasScheduledBelow() ? DIRECTION.down : DIRECTION.idle;
      }
      if (elevator.direction === DIRECTION.down && !elevator.hasScheduledBelow()) {
        elevator.direction = elevator.hasScheduledAbove() ? DIRECTION.up : DIRECTION.idle;
      }
      if (elevator.direction === DIRECTION.idle) {
        continue;
      }
      elevator.status = "moving";
      elevator.currentFloor += elevator.direction === DIRECTION.up ? 1 : -1;
      elevator.currentFloor = Math.max(0, Math.min(CONFIG.totalFloors - 1, elevator.currentFloor));
      this.render();
      await sleep(CONFIG.travelTimeMs);
      if (elevator.hasCurrentFloorStop()) {
        await this.openDoors(elevator);
      } else {
        this.render();
      }
    }
    elevator.direction = DIRECTION.idle;
    elevator.status = "idle";
    elevator.doorOpen = false;
    elevator.processing = false;
    this.render();
    this.assignQueuedHallRequests();
    this.render();
  }
  async openDoors(elevator) {
    const floor = elevator.currentFloor;
    const hallRequests = elevator.hallRequestsByFloor.get(floor) ?? [];
    elevator.status = "doors";
    elevator.doorOpen = true;
    elevator.scheduledFloors.delete(floor);
    elevator.carRequestFloors.delete(floor);
    elevator.hallRequestsByFloor.delete(floor);
    for (const request of hallRequests) {
      this.activeHallRequests.delete(request.key);
    }
    this.pushLog(hallRequests.length ? `E${elevator.id} opened at floor ${floor} for ${hallRequests.map((request) => request.direction).join(", ")} hall call${hallRequests.length > 1 ? "s" : ""}.` : `E${elevator.id} opened at floor ${floor}.`);
    this.render();
    await sleep(CONFIG.doorOpenMs);
    elevator.doorOpen = false;
    if (elevator.direction === DIRECTION.up && !elevator.hasScheduledAbove()) {
      elevator.direction = elevator.hasScheduledBelow() ? DIRECTION.down : DIRECTION.idle;
    } else if (elevator.direction === DIRECTION.down && !elevator.hasScheduledBelow()) {
      elevator.direction = elevator.hasScheduledAbove() ? DIRECTION.up : DIRECTION.idle;
    } else if (elevator.direction === DIRECTION.idle) {
      elevator.direction = elevator.chooseDirectionFromIdle();
    }
    elevator.status = elevator.scheduledFloors.size ? "moving" : "idle";
    this.render();
  }
  floorToTop(floor) {
    const carHeight = 54;
    return (CONFIG.totalFloors - 1 - floor) * CONFIG.floorHeightPx + (CONFIG.floorHeightPx - carHeight) / 2;
  }
  pushLog(message) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    this.logEntries.unshift({ time, message });
    this.logEntries = this.logEntries.slice(0, CONFIG.maxLogEntries);
  }
}
new BuildingSimulator;
window.__ELEVATOR_SIM_READY__ = true;
