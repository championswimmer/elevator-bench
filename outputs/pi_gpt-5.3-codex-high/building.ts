import { Elevator, type Direction } from "./elevator";

type HallDirection = "up" | "down";

interface BuildingConfig {
  floorCount: number;
  elevatorCount: number;
  floorHeight: number;
  travelTimeMs: number;
  doorTimeMs: number;
  buildingContainer: HTMLElement;
  panelsContainer: HTMLElement;
  queueInfoElement: HTMLElement;
}

interface HallRequest {
  floor: number;
  direction: HallDirection;
  key: string;
}

export class Building {
  private readonly config: BuildingConfig;

  private elevators: Elevator[] = [];
  private hallButtons = new Map<string, HTMLButtonElement>();
  private panelButtons = new Map<number, Map<number, HTMLButtonElement>>();
  private statusElements = new Map<number, HTMLElement>();

  private activeHallRequests = new Set<string>();
  private pendingHallRequests: HallRequest[] = [];

  constructor(config: BuildingConfig) {
    this.config = config;
  }

  public init(): void {
    this.render();
    this.updateQueueInfo();
  }

  private render(): void {
    this.config.buildingContainer.innerHTML = "";
    this.config.panelsContainer.innerHTML = "";

    const shell = document.createElement("div");
    shell.className = "building-shell";

    const floorColumn = document.createElement("div");
    floorColumn.className = "floor-column";

    const shafts = document.createElement("div");
    shafts.className = "shafts";

    const shaftHeight = this.config.floorCount * this.config.floorHeight;

    for (let floor = this.config.floorCount - 1; floor >= 0; floor -= 1) {
      const row = document.createElement("div");
      row.className = "floor-row";
      row.style.height = `${this.config.floorHeight}px`;

      const label = document.createElement("span");
      label.className = "floor-label";
      label.textContent = `Floor ${floor}`;

      const buttonWrap = document.createElement("div");
      buttonWrap.className = "hall-buttons";

      if (floor < this.config.floorCount - 1) {
        const upBtn = this.createHallButton(floor, "up", "↑");
        buttonWrap.append(upBtn);
      }

      if (floor > 0) {
        const downBtn = this.createHallButton(floor, "down", "↓");
        buttonWrap.append(downBtn);
      }

      row.append(label, buttonWrap);
      floorColumn.append(row);
    }

    for (let i = 0; i < this.config.elevatorCount; i += 1) {
      const shaft = document.createElement("div");
      shaft.className = "shaft";
      shaft.style.height = `${shaftHeight}px`;

      const car = document.createElement("div");
      car.className = "elevator-car";
      car.style.height = `${this.config.floorHeight - 10}px`;
      car.textContent = `${i}`;
      shaft.append(car);

      const elevator = new Elevator({
        id: i,
        floorCount: this.config.floorCount,
        floorHeight: this.config.floorHeight,
        travelTimeMs: this.config.travelTimeMs,
        doorTimeMs: this.config.doorTimeMs,
        carElement: car,
        callbacks: {
          onStateChange: (lift) => this.updateElevatorPanelStatus(lift),
          onStop: (lift, floor) => this.onElevatorStop(lift, floor),
          onIdle: () => this.dispatchPendingRequests(),
          onQueueChange: (lift, pendingFloors) => this.updatePanelFloorButtons(lift.id, pendingFloors),
        },
      });

      this.elevators.push(elevator);
      shafts.append(shaft);

      this.createElevatorPanel(elevator);
      this.updateElevatorPanelStatus(elevator);
    }

    shell.append(floorColumn, shafts);
    this.config.buildingContainer.append(shell);
  }

  private createHallButton(floor: number, direction: HallDirection, label: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "hall-btn";
    btn.textContent = label;
    btn.title = `Request ${direction} at floor ${floor}`;

    const key = this.requestKey(floor, direction);
    this.hallButtons.set(key, btn);

    btn.addEventListener("click", () => {
      this.handleHallRequest(floor, direction);
    });

    return btn;
  }

  private createElevatorPanel(elevator: Elevator): void {
    const panel = document.createElement("section");
    panel.className = "panel";

    const title = document.createElement("h3");
    title.textContent = `Elevator ${elevator.id}`;

    const status = document.createElement("p");
    status.className = "status";

    const floorGrid = document.createElement("div");
    floorGrid.className = "floor-grid";

    const floorButtonMap = new Map<number, HTMLButtonElement>();

    for (let floor = this.config.floorCount - 1; floor >= 0; floor -= 1) {
      const btn = document.createElement("button");
      btn.className = "floor-btn";
      btn.textContent = `${floor}`;
      btn.title = `Send Elevator ${elevator.id} to floor ${floor}`;

      btn.addEventListener("click", () => {
        elevator.requestFloor(floor);
      });

      floorGrid.append(btn);
      floorButtonMap.set(floor, btn);
    }

    this.panelButtons.set(elevator.id, floorButtonMap);
    this.statusElements.set(elevator.id, status);

    panel.append(title, status, floorGrid);
    this.config.panelsContainer.append(panel);
  }

  private handleHallRequest(floor: number, direction: HallDirection): void {
    const key = this.requestKey(floor, direction);

    if (this.activeHallRequests.has(key)) return;

    this.activeHallRequests.add(key);
    this.hallButtons.get(key)?.classList.add("active");

    const request: HallRequest = { floor, direction, key };

    const assigned = this.assignRequestToIdleElevator(request);
    if (!assigned) {
      this.pendingHallRequests.push(request);
    }

    this.updateQueueInfo();
  }

  private assignRequestToIdleElevator(request: HallRequest): boolean {
    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());

    if (idleElevators.length === 0) {
      return false;
    }

    idleElevators.sort((a, b) => {
      const distanceDiff = a.distanceTo(request.floor) - b.distanceTo(request.floor);
      return distanceDiff !== 0 ? distanceDiff : a.id - b.id;
    });

    const selected = idleElevators[0];
    selected.requestFloor(request.floor);
    return true;
  }

  private dispatchPendingRequests(): void {
    if (this.pendingHallRequests.length === 0) return;

    const remaining: HallRequest[] = [];

    for (const request of this.pendingHallRequests) {
      const assigned = this.assignRequestToIdleElevator(request);
      if (!assigned) {
        remaining.push(request);
      }
    }

    this.pendingHallRequests = remaining;
    this.updateQueueInfo();
  }

  private onElevatorStop(_elevator: Elevator, floor: number): void {
    for (const direction of ["up", "down"] as const) {
      const key = this.requestKey(floor, direction);
      if (!this.activeHallRequests.has(key)) continue;

      this.activeHallRequests.delete(key);
      this.hallButtons.get(key)?.classList.remove("active");
      this.pendingHallRequests = this.pendingHallRequests.filter((request) => request.key !== key);
    }

    this.updateQueueInfo();
  }

  private updateElevatorPanelStatus(elevator: Elevator): void {
    const statusElement = this.statusElements.get(elevator.id);
    if (!statusElement) return;

    const direction = this.prettyDirection(elevator.getDirection());
    const pending = elevator.getPendingFloors();
    statusElement.textContent = `Floor ${elevator.getCurrentFloor()} · ${direction} · Queue [${pending.join(", ") || "empty"}]`;
  }

  private updatePanelFloorButtons(elevatorId: number, pendingFloors: number[]): void {
    const buttons = this.panelButtons.get(elevatorId);
    if (!buttons) return;

    const active = new Set<number>(pendingFloors);
    for (const [floor, button] of buttons.entries()) {
      button.classList.toggle("active", active.has(floor));
    }
  }

  private updateQueueInfo(): void {
    if (this.pendingHallRequests.length === 0) {
      this.config.queueInfoElement.textContent = "Queued hall requests: none";
      return;
    }

    const summary = this.pendingHallRequests
      .map((request) => `F${request.floor}${request.direction === "up" ? "↑" : "↓"}`)
      .join(", ");

    this.config.queueInfoElement.textContent = `Queued hall requests: ${summary}`;
  }

  private requestKey(floor: number, direction: HallDirection): string {
    return `${floor}:${direction}`;
  }

  private prettyDirection(direction: Direction): string {
    if (direction === "up") return "moving up";
    if (direction === "down") return "moving down";
    return "idle";
  }
}
