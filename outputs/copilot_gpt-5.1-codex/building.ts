import { SimulatorConfig } from "./config.ts";
import { Direction, ElevatorState, FloorRequest } from "./types.ts";
import { Elevator } from "./elevator.ts";

interface FloorButtonGroup {
  up?: HTMLButtonElement;
  down?: HTMLButtonElement;
}

export class Building {
  private readonly config: SimulatorConfig;
  private elevators: Elevator[] = [];
  private floorButtons = new Map<number, FloorButtonGroup>();
  private pendingRequests: FloorRequest[] = [];
  private pendingKeys = new Set<string>();
  private tickHandle?: number;
  private floorsContainer!: HTMLElement;
  private shaftsContainer!: HTMLElement;
  private panelsContainer!: HTMLElement;

  constructor(config: SimulatorConfig) {
    this.config = config;
  }

  public init() {
    this.grabContainers();
    this.renderFloors();
    this.renderElevators();
    this.tickHandle = window.setInterval(() => this.tick(), this.config.tickMs);
  }

  public requestElevator(floor: number, direction: Direction) {
    const key = this.requestKey(floor, direction);
    if (this.pendingKeys.has(key)) {
      return;
    }
    this.pendingKeys.add(key);
    this.toggleFloorButton(floor, direction, true);

    const elevator = this.findBestElevator(floor, direction);
    if (elevator) {
      elevator.addStop(floor);
    } else {
      this.pendingRequests.push({ floor, direction });
    }
  }

  private tick() {
    const now = performance.now();
    this.elevators.forEach((elevator) => elevator.tick(now));
    this.dispatchPending();
  }

  private grabContainers() {
    const floors = document.getElementById("floor-stack");
    const shafts = document.getElementById("shaft-stack");
    const panels = document.getElementById("panels");

    if (!floors || !shafts || !panels) {
      throw new Error("Missing simulator containers in index.html");
    }

    this.floorsContainer = floors;
    this.shaftsContainer = shafts;
    this.panelsContainer = panels;

    const buildingShell = document.querySelector(".building-shell");
    if (buildingShell instanceof HTMLElement) {
      buildingShell.style.setProperty(
        "--floor-height",
        `${this.config.floorHeightPx}px`,
      );
      buildingShell.style.setProperty("--floors", `${this.config.floors}`);
    }
  }

  private renderFloors() {
    this.floorsContainer.innerHTML = "";
    this.floorButtons.clear();

    for (let floor = this.config.floors - 1; floor >= 0; floor -= 1) {
      const floorRow = document.createElement("div");
      floorRow.className = "floor-row";
      floorRow.dataset.floor = `${floor}`;

      const label = document.createElement("div");
      label.className = "floor-label";
      label.textContent = `Floor ${floor}`;

      const buttons = document.createElement("div");
      buttons.className = "floor-buttons";

      const group: FloorButtonGroup = {};
      if (floor < this.config.floors - 1) {
        const upBtn = document.createElement("button");
        upBtn.type = "button";
        upBtn.className = "call-button up";
        upBtn.textContent = "↑";
        upBtn.addEventListener("click", () =>
          this.requestElevator(floor, Direction.Up),
        );
        buttons.appendChild(upBtn);
        group.up = upBtn;
      }

      if (floor > 0) {
        const downBtn = document.createElement("button");
        downBtn.type = "button";
        downBtn.className = "call-button down";
        downBtn.textContent = "↓";
        downBtn.addEventListener("click", () =>
          this.requestElevator(floor, Direction.Down),
        );
        buttons.appendChild(downBtn);
        group.down = downBtn;
      }

      this.floorButtons.set(floor, group);

      floorRow.appendChild(label);
      floorRow.appendChild(buttons);
      this.floorsContainer.appendChild(floorRow);
    }
  }

  private renderElevators() {
    this.shaftsContainer.innerHTML = "";
    this.panelsContainer.innerHTML = "";

    this.elevators = [];
    for (let i = 0; i < this.config.elevators; i += 1) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";

      const car = document.createElement("div");
      car.className = "elevator-car";
      car.dataset.id = `${i}`;
      car.style.setProperty("bottom", "0px");

      const door = document.createElement("div");
      door.className = "door";
      car.appendChild(door);

      shaft.appendChild(car);
      this.shaftsContainer.appendChild(shaft);

      const panel = document.createElement("div");
      panel.className = "panel";

      const heading = document.createElement("h3");
      heading.textContent = `Elevator ${i}`;

      const status = document.createElement("p");
      status.className = "status";
      status.textContent = "Floor 0 • IDLE";

      const buttonsWrap = document.createElement("div");
      buttonsWrap.className = "panel-buttons";

      const panelButtons: HTMLButtonElement[] = [];
      for (let floor = this.config.floors - 1; floor >= 0; floor -= 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${floor}`;
        buttonsWrap.appendChild(button);
        panelButtons[floor] = button;
      }

      panel.appendChild(heading);
      panel.appendChild(status);
      panel.appendChild(buttonsWrap);
      this.panelsContainer.appendChild(panel);

      const elevator = new Elevator({
        id: i,
        totalFloors: this.config.floors,
        doorHoldMs: this.config.doorHoldMs,
        floorHeightPx: this.config.floorHeightPx,
        carElement: car,
        statusElement: status,
        panelButtons,
        onIdle: () => this.dispatchPending(),
        onArrive: (_, floor) => this.handleArrival(floor),
      });

      this.elevators.push(elevator);
    }
  }

  private dispatchPending() {
    if (!this.pendingRequests.length) {
      return;
    }

    const remaining: FloorRequest[] = [];
    for (const request of this.pendingRequests) {
      const elevator = this.findBestElevator(request.floor, request.direction);
      if (elevator) {
        elevator.addStop(request.floor);
      } else {
        remaining.push(request);
      }
    }

    this.pendingRequests = remaining;
  }

  private findBestElevator(floor: number, direction: Direction) {
    let best: Elevator | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const elevator of this.elevators) {
      if (!elevator.canServe(floor, direction)) {
        continue;
      }

      const distance = elevator.distanceToFloor(floor);
      const penalty =
        elevator.state === ElevatorState.Idle
          ? 0
          : elevator.direction === direction
          ? 0.5
          : 1;
      const score = distance + penalty;
      if (score < bestScore) {
        best = elevator;
        bestScore = score;
      }
    }

    return best;
  }

  private requestKey(floor: number, direction: Direction) {
    return `${floor}:${direction}`;
  }

  private toggleFloorButton(
    floor: number,
    direction: Direction,
    pending: boolean,
  ) {
    const group = this.floorButtons.get(floor);
    if (!group) return;
    const button = direction === Direction.Up ? group.up : group.down;
    if (!button) return;
    button.disabled = pending;
    button.classList.toggle("pending", pending);
  }

  private handleArrival(floor: number) {
    const keyUp = this.requestKey(floor, Direction.Up);
    const keyDown = this.requestKey(floor, Direction.Down);
    this.pendingKeys.delete(keyUp);
    this.pendingKeys.delete(keyDown);

    const group = this.floorButtons.get(floor);
    if (group?.up) {
      group.up.disabled = false;
      group.up.classList.remove("pending");
    }
    if (group?.down) {
      group.down.disabled = false;
      group.down.classList.remove("pending");
    }

    this.flashFloor(floor);
  }

  private flashFloor(floor: number) {
    const row = this.floorsContainer.querySelector(
      `.floor-row[data-floor="${floor}"]`,
    );
    if (!(row instanceof HTMLElement)) return;
    row.classList.add("arriving");
    window.setTimeout(() => row.classList.remove("arriving"), 800);
  }
}
