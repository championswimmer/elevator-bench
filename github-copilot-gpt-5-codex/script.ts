type Direction = "up" | "down";
type ElevatorDirection = Direction | "idle";

type ScheduleOutcome = "added" | "immediate" | "duplicate";

type CallButtonState = "idle" | "queued" | "active";

interface PendingRequest {
  floor: number;
  direction: Direction;
  button: HTMLButtonElement;
}

interface ActiveRequestEntry {
  button: HTMLButtonElement;
  elevatorId: number;
  floor: number;
  direction: Direction;
}

interface ElevatorCarRefs {
  car: HTMLElement;
  floorDisplay: HTMLElement;
  headerStatus: HTMLElement;
}

interface ElevatorPanelRefs {
  status: HTMLElement;
  buttons: Map<number, HTMLButtonElement>;
}

const FLOOR_COUNT = 10;
const ELEVATOR_COUNT = 4;
const FLOOR_HEIGHT = 70; // pixels; keep in sync with styles.css
const FLOOR_TRAVEL_TIME = 1.2; // seconds per floor
const DOOR_HOLD_TIME = 1.5; // seconds doors stay open

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.style.setProperty("--floor-count", String(FLOOR_COUNT));
  document.documentElement.style.setProperty("--floor-height", `${FLOOR_HEIGHT}px`);

  const controller = new ElevatorController();
  controller.bootstrap();
});

class ElevatorController {
  private readonly floorsContainer: HTMLElement;
  private readonly shaftsContainer: HTMLElement;
  private readonly panelsContainer: HTMLElement;

  private readonly floorButtons = new Map<string, HTMLButtonElement>();
  private readonly pendingRequests: PendingRequest[] = [];
  private readonly activeRequests = new Map<string, ActiveRequestEntry>();
  private readonly elevators: Elevator[] = [];

  constructor() {
    const floors = document.getElementById("floors");
    const shafts = document.getElementById("shafts");
    const panels = document.getElementById("interior-panels");

    if (!floors || !shafts || !panels) {
      throw new Error("Elevator simulator markup is missing expected containers.");
    }

    this.floorsContainer = floors;
    this.shaftsContainer = shafts;
    this.panelsContainer = panels;
  }

  bootstrap(): void {
    this.renderFloors();
    const carRefs = this.renderShafts();
    const panelRefs = this.renderPanels();

    for (let i = 0; i < ELEVATOR_COUNT; i += 1) {
      const carRef = carRefs[i];
      const panelRef = panelRefs[i];
      const elevator = new Elevator({
        id: i,
        controller: this,
        floorCount: FLOOR_COUNT,
        floorHeight: FLOOR_HEIGHT,
        carEl: carRef.car,
        floorDisplayEl: carRef.floorDisplay,
        headerStatusEl: carRef.headerStatus,
        panelStatusEl: panelRef.status,
        interiorButtons: panelRef.buttons,
      });
      this.elevators.push(elevator);
    }
  }

  handleCallRequest(floor: number, direction: Direction, button: HTMLButtonElement): void {
    const requestKey = this.composeKey(floor, direction);

    if (this.activeRequests.has(requestKey)) {
      return;
    }

    const existingQueued = this.pendingRequests.find((item) => item.floor === floor && item.direction === direction);
    if (existingQueued) {
      return;
    }

    button.disabled = true;

    const bestElevator = this.findBestElevator(floor, direction);

    if (bestElevator) {
      this.setCallButtonState(button, "active");
      this.activeRequests.set(requestKey, {
        button,
        elevatorId: bestElevator.id,
        floor,
        direction,
      });
      bestElevator.assignExternalRequest(floor, direction);
      return;
    }

    this.pendingRequests.push({ floor, direction, button });
    this.setCallButtonState(button, "queued");
  }

  handleElevatorArrival(elevator: Elevator, floor: number, direction: Direction): void {
    const key = this.composeKey(floor, direction);
    const activeEntry = this.activeRequests.get(key);

    if (activeEntry) {
      this.resetCallButton(activeEntry.button);
      this.activeRequests.delete(key);
    }

    const pendingIndex = this.pendingRequests.findIndex((item) => item.floor === floor && item.direction === direction);
    if (pendingIndex >= 0) {
      const pending = this.pendingRequests.splice(pendingIndex, 1)[0];
      this.resetCallButton(pending.button);
    }

    this.dispatchPendingRequests();
  }

  handleElevatorIdle(): void {
    this.dispatchPendingRequests();
  }

  notifyInteriorImmediate(_: Elevator, _floor: number): void {
    // Reserved for future UI hooks if needed.
  }

  private renderFloors(): void {
    this.floorsContainer.innerHTML = "";

    for (let floor = FLOOR_COUNT - 1; floor >= 0; floor -= 1) {
      const row = document.createElement("div");
      row.className = "floor-row";
      row.dataset.floor = String(floor);

      const label = document.createElement("div");
      label.className = "floor-label";
      label.textContent = `Floor ${floor}`;
      row.append(label);

      const buttonsWrapper = document.createElement("div");
      buttonsWrapper.className = "call-buttons";

      if (floor < FLOOR_COUNT - 1) {
        const upButton = this.createCallButton(floor, "up");
        buttonsWrapper.append(upButton);
      }

      if (floor > 0) {
        const downButton = this.createCallButton(floor, "down");
        buttonsWrapper.append(downButton);
      }

      row.append(buttonsWrapper);
      this.floorsContainer.append(row);
    }
  }

  private renderShafts(): ElevatorCarRefs[] {
    this.shaftsContainer.innerHTML = "";
    const refs: ElevatorCarRefs[] = [];

    for (let i = 0; i < ELEVATOR_COUNT; i += 1) {
      const wrapper = document.createElement("div");
      wrapper.className = "shaft-wrapper";

      const header = document.createElement("div");
      header.className = "shaft-header";

      const nameSpan = document.createElement("span");
      nameSpan.className = "elevator-name";
      nameSpan.textContent = `Elevator ${i}`;

      const statusSpan = document.createElement("span");
      statusSpan.className = "shaft-status";
      statusSpan.textContent = "Idle";

      header.append(nameSpan, statusSpan);
      wrapper.append(header);

      const shaft = document.createElement("div");
      shaft.className = "shaft";

      for (let floor = 1; floor < FLOOR_COUNT; floor += 1) {
        const marker = document.createElement("div");
        marker.className = "floor-marker";
        marker.style.bottom = `${floor * FLOOR_HEIGHT}px`;
        shaft.append(marker);
      }

      const car = document.createElement("div");
      car.className = "car";
      car.dataset.direction = "idle";
      car.style.bottom = "0px";
      car.style.transitionDuration = `${FLOOR_TRAVEL_TIME}s`;

      const info = document.createElement("div");
      info.className = "car-info";

      const idSpan = document.createElement("span");
      idSpan.className = "car-id";
      idSpan.textContent = `E${i}`;

      const floorSpan = document.createElement("span");
      floorSpan.className = "car-floor";
      floorSpan.textContent = "0";

      info.append(idSpan, floorSpan);
      car.append(info);
      shaft.append(car);

      wrapper.append(shaft);
      this.shaftsContainer.append(wrapper);

      refs.push({ car, floorDisplay: floorSpan, headerStatus: statusSpan });
    }

    return refs;
  }

  private renderPanels(): ElevatorPanelRefs[] {
    this.panelsContainer.innerHTML = "";
    const refs: ElevatorPanelRefs[] = [];

    for (let elevatorId = 0; elevatorId < ELEVATOR_COUNT; elevatorId += 1) {
      const panel = document.createElement("div");
      panel.className = "panel";

      const header = document.createElement("header");

      const title = document.createElement("h3");
      title.className = "panel-title";
      title.textContent = `Elevator ${elevatorId}`;

      const status = document.createElement("p");
      status.className = "panel-status";
      status.textContent = "Idle at floor 0";

      header.append(title, status);

      const grid = document.createElement("div");
      grid.className = "floor-grid";

      const buttonMap = new Map<number, HTMLButtonElement>();

      for (let floor = FLOOR_COUNT - 1; floor >= 0; floor -= 1) {
        const button = document.createElement("button");
        button.className = "floor-button";
        button.type = "button";
        button.textContent = String(floor);
        button.dataset.floor = String(floor);
        grid.append(button);
        buttonMap.set(floor, button);
      }

      panel.append(header, grid);
      this.panelsContainer.append(panel);

      refs.push({ status, buttons: buttonMap });
    }

    return refs;
  }

  private createCallButton(floor: number, direction: Direction): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "call-button";
    button.dataset.floor = String(floor);
    button.dataset.direction = direction;
    button.textContent = direction === "up" ? "Up" : "Down";

    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }
      this.handleCallRequest(floor, direction, button);
    });

    const key = this.composeKey(floor, direction);
    this.floorButtons.set(key, button);

    return button;
  }

  private findBestElevator(floor: number, direction: Direction): Elevator | undefined {
    let pick: { elevator: Elevator; score: number; distance: number } | undefined;

    for (const elevator of this.elevators) {
      const evaluation = elevator.evaluateRequest(floor, direction);
      if (!evaluation) {
        continue;
      }

      if (!pick) {
        pick = { elevator, score: evaluation.score, distance: evaluation.distance };
        continue;
      }

      if (evaluation.score < pick.score) {
        pick = { elevator, score: evaluation.score, distance: evaluation.distance };
        continue;
      }

      if (evaluation.score === pick.score && evaluation.distance < pick.distance) {
        pick = { elevator, score: evaluation.score, distance: evaluation.distance };
      }
    }

    return pick?.elevator;
  }

  private dispatchPendingRequests(): void {
    if (this.pendingRequests.length === 0) {
      return;
    }

    let assigned = true;

    while (assigned) {
      assigned = false;

      for (let i = 0; i < this.pendingRequests.length; i += 1) {
        const request = this.pendingRequests[i];
        const elevator = this.findBestElevator(request.floor, request.direction);

        if (!elevator) {
          continue;
        }

        const key = this.composeKey(request.floor, request.direction);
        this.activeRequests.set(key, {
          button: request.button,
          elevatorId: elevator.id,
          floor: request.floor,
          direction: request.direction,
        });

        this.setCallButtonState(request.button, "active");
        elevator.assignExternalRequest(request.floor, request.direction);
        this.pendingRequests.splice(i, 1);
        assigned = true;
        break;
      }
    }
  }

  private composeKey(floor: number, direction: Direction): string {
    return `${floor}-${direction}`;
  }

  private setCallButtonState(button: HTMLButtonElement, state: CallButtonState): void {
    button.classList.remove("active", "queued");

    if (state === "idle") {
      button.disabled = false;
      return;
    }

    if (state === "queued") {
      button.classList.add("queued");
      button.disabled = true;
      return;
    }

    button.classList.add("active");
    button.disabled = true;
  }

  private resetCallButton(button: HTMLButtonElement): void {
    this.setCallButtonState(button, "idle");
  }
}

interface ElevatorConfig {
  id: number;
  controller: ElevatorController;
  floorCount: number;
  floorHeight: number;
  carEl: HTMLElement;
  floorDisplayEl: HTMLElement;
  headerStatusEl: HTMLElement;
  panelStatusEl: HTMLElement;
  interiorButtons: Map<number, HTMLButtonElement>;
}

class Elevator {
  readonly id: number;

  private readonly controller: ElevatorController;
  private readonly floorCount: number;
  private readonly floorHeight: number;
  private readonly carEl: HTMLElement;
  private readonly floorDisplayEl: HTMLElement;
  private readonly headerStatusEl: HTMLElement;
  private readonly panelStatusEl: HTMLElement;
  private readonly interiorButtons: Map<number, HTMLButtonElement>;

  private readonly queueUp: number[] = [];
  private readonly queueDown: number[] = [];

  private direction: ElevatorDirection = "idle";
  private currentFloor = 0;
  private moving = false;
  private idleNotified = true;
  private doorTimer: number | null = null;
  private pendingDoorCallback: (() => void) | null = null;
  private movementTimer: number | null = null;

  private readonly travelTimeMs = FLOOR_TRAVEL_TIME * 1000;
  private readonly doorTimeMs = DOOR_HOLD_TIME * 1000;

  constructor(config: ElevatorConfig) {
    this.id = config.id;
    this.controller = config.controller;
    this.floorCount = config.floorCount;
    this.floorHeight = config.floorHeight;
    this.carEl = config.carEl;
    this.floorDisplayEl = config.floorDisplayEl;
    this.headerStatusEl = config.headerStatusEl;
    this.panelStatusEl = config.panelStatusEl;
    this.interiorButtons = config.interiorButtons;

    this.interiorButtons.forEach((button, floor) => {
      button.addEventListener("click", () => {
        if (button.disabled) {
          return;
        }
        const outcome = this.scheduleFloor(floor);
        if (outcome === "duplicate") {
          return;
        }

        button.disabled = true;
        button.classList.add("active");

        if (outcome === "immediate") {
          this.releaseInteriorButton(floor);
          this.enterDoorCycle(() => this.startMovementCycle());
          this.controller.notifyInteriorImmediate(this, floor);
          return;
        }

        this.startMovementCycle();
      });
    });

    this.updateIndicators();
  }

  evaluateRequest(floor: number, direction: Direction): { score: number; distance: number } | null {
    if (this.isIdle()) {
      return { score: 1, distance: Math.abs(this.currentFloor - floor) };
    }

    if (this.direction === direction) {
      if (direction === "up" && floor >= this.currentFloor) {
        return { score: 2, distance: floor - this.currentFloor };
      }

      if (direction === "down" && floor <= this.currentFloor) {
        return { score: 2, distance: this.currentFloor - floor };
      }
    }

    return null;
  }

  assignExternalRequest(floor: number, requestDirection: Direction): void {
    const outcome = this.scheduleFloor(floor);

    if (outcome === "duplicate") {
      return;
    }

    if (outcome === "immediate") {
      this.controller.handleElevatorArrival(this, floor, requestDirection);
      this.enterDoorCycle(() => this.startMovementCycle());
      return;
    }

    this.startMovementCycle();
  }

  private scheduleFloor(floor: number): ScheduleOutcome {
    if (floor < 0 || floor >= this.floorCount) {
      return "duplicate";
    }

    if (floor === this.currentFloor && !this.moving) {
      this.idleNotified = false;
      this.updateIndicators();
      return "immediate";
    }

    if (floor > this.currentFloor) {
      if (this.queueUp.includes(floor)) {
        return "duplicate";
      }
      this.queueUp.push(floor);
      this.queueUp.sort((a, b) => a - b);
      this.idleNotified = false;
      this.updateIndicators();
      return "added";
    }

    if (floor < this.currentFloor) {
      if (this.queueDown.includes(floor)) {
        return "duplicate";
      }
      this.queueDown.push(floor);
      this.queueDown.sort((a, b) => b - a);
      this.idleNotified = false;
      this.updateIndicators();
      return "added";
    }

    // floor equals currentFloor but elevator is moving.
    if (this.direction === "up") {
      if (this.queueUp.includes(floor)) {
        return "duplicate";
      }
      this.queueUp.push(floor);
      this.queueUp.sort((a, b) => a - b);
    } else if (this.direction === "down") {
      if (this.queueDown.includes(floor)) {
        return "duplicate";
      }
      this.queueDown.push(floor);
      this.queueDown.sort((a, b) => b - a);
    } else {
      this.idleNotified = false;
      this.updateIndicators();
      return "immediate";
    }

    this.idleNotified = false;
    this.updateIndicators();
    return "added";
  }

  private startMovementCycle(): void {
    this.evaluateDirection();

    if (this.direction === "idle") {
      this.moving = false;
      if (!this.idleNotified) {
        this.idleNotified = true;
        this.controller.handleElevatorIdle();
      }
      this.updateIndicators();
      return;
    }

    this.idleNotified = false;

    if (!this.moving) {
      this.moveOneFloor();
    }
  }

  private evaluateDirection(): void {
    if (this.direction === "up" && this.queueUp.length > 0) {
      return;
    }

    if (this.direction === "down" && this.queueDown.length > 0) {
      return;
    }

    if (this.queueUp.length > 0) {
      this.direction = "up";
      return;
    }

    if (this.queueDown.length > 0) {
      this.direction = "down";
      return;
    }

    this.direction = "idle";
  }

  private moveOneFloor(): void {
    if (this.direction === "idle") {
      this.moving = false;
      return;
    }

  const travelDirection = this.direction as Direction; // Cache direction to stay consistent during the hop.
    const step = travelDirection === "up" ? 1 : -1;
    const nextFloor = this.currentFloor + step;

    if (nextFloor < 0 || nextFloor >= this.floorCount) {
      this.direction = "idle";
      this.startMovementCycle();
      return;
    }

    if (this.movementTimer !== null) {
      window.clearTimeout(this.movementTimer);
    }

    this.moving = true;
    this.carEl.classList.add("moving");
    this.setCarDirection(this.direction);
    this.animateToFloor(nextFloor);

    this.movementTimer = window.setTimeout(() => {
      this.currentFloor = nextFloor;
      this.updateIndicators();

      if (this.shouldStopHere(travelDirection)) {
        this.stopAtCurrentFloor(travelDirection);
        return;
      }

      this.moveOneFloor();
    }, this.travelTimeMs);
  }

  private shouldStopHere(direction: Direction): boolean {
    if (direction === "up") {
      return this.queueUp.length > 0 && this.queueUp[0] === this.currentFloor;
    }
    return this.queueDown.length > 0 && this.queueDown[0] === this.currentFloor;
  }

  private stopAtCurrentFloor(direction: Direction): void {
    if (direction === "up") {
      if (this.queueUp[0] === this.currentFloor) {
        this.queueUp.shift();
      } else {
        const index = this.queueUp.indexOf(this.currentFloor);
        if (index >= 0) {
          this.queueUp.splice(index, 1);
        }
      }
    } else {
      if (this.queueDown[0] === this.currentFloor) {
        this.queueDown.shift();
      } else {
        const index = this.queueDown.indexOf(this.currentFloor);
        if (index >= 0) {
          this.queueDown.splice(index, 1);
        }
      }
    }

    this.carEl.classList.remove("moving");
    this.moving = false;

    if (this.movementTimer !== null) {
      window.clearTimeout(this.movementTimer);
      this.movementTimer = null;
    }

    this.controller.handleElevatorArrival(this, this.currentFloor, direction);
    this.releaseInteriorButton(this.currentFloor);

    this.evaluateDirection();
    this.updateIndicators();

    this.enterDoorCycle(() => this.startMovementCycle());
  }

  private animateToFloor(floor: number): void {
    const pixels = floor * this.floorHeight;
    this.carEl.style.transitionDuration = `${FLOOR_TRAVEL_TIME}s`;
    this.carEl.style.bottom = `${pixels}px`;
  }

  private enterDoorCycle(onComplete: () => void): void {
    if (this.doorTimer !== null) {
      window.clearTimeout(this.doorTimer);
    }

    this.pendingDoorCallback = onComplete;
    this.carEl.classList.add("doors-open"); // Basic door animation cue.

    this.doorTimer = window.setTimeout(() => {
      this.carEl.classList.remove("doors-open");
      this.doorTimer = null;
      const callback = this.pendingDoorCallback;
      this.pendingDoorCallback = null;
      callback?.();
    }, this.doorTimeMs);
  }

  private isIdle(): boolean {
    const idleDirection = this.direction === "idle";
    const stationary = !this.moving;
    const noQueues = this.queueUp.length === 0 && this.queueDown.length === 0;
    return idleDirection && stationary && noQueues;
  }

  private setCarDirection(direction: ElevatorDirection): void {
    this.carEl.dataset.direction = direction;
  }

  private releaseInteriorButton(floor: number): void {
    const button = this.interiorButtons.get(floor);
    if (!button) {
      return;
    }
    button.disabled = false;
    button.classList.remove("active");
  }

  private updateIndicators(): void {
    this.floorDisplayEl.textContent = String(this.currentFloor);
    this.setCarDirection(this.direction);

    const directionLabel =
      this.direction === "idle"
        ? "Idle"
        : this.direction === "up"
        ? "Moving up"
        : "Moving down";

    const upcomingStops = this.buildQueuePreview();
    const stopsText = upcomingStops.length > 0 ? `Stops: ${upcomingStops.join(", ")}` : "No pending stops";

    this.headerStatusEl.textContent = `${directionLabel}`;
    this.panelStatusEl.textContent = `Floor ${this.currentFloor} • ${directionLabel} • ${stopsText}`;
  }

  private buildQueuePreview(): number[] {
    if (this.direction === "up") {
      return [...this.queueUp, ...[...this.queueDown].sort((a, b) => a - b)];
    }

    if (this.direction === "down") {
      return [...this.queueDown, ...[...this.queueUp].sort((a, b) => b - a)];
    }

    const combined = [...this.queueUp, ...this.queueDown];
    combined.sort((a, b) => a - b);
    return combined;
  }
}
