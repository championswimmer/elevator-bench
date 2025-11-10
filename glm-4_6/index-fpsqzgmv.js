// script.ts
var FLOORS_COUNT = 10;
var ELEVATORS_COUNT = 4;
var FLOOR_HEIGHT = 62;
var ELEVATOR_MOVE_SPEED = 1000;

class ElevatorSimulator {
  elevators = [];
  floorRequests = [];
  queuedRequests = [];
  animationFrames = new Map;
  constructor() {
    this.initializeElevators();
    this.initializeDOM();
    this.bindEvents();
    this.startSimulation();
  }
  initializeElevators() {
    for (let i = 0;i < ELEVATORS_COUNT; i++) {
      this.elevators.push({
        id: i,
        currentFloor: 0,
        destinationFloor: 0,
        direction: "idle",
        isMoving: false,
        requests: [],
        isIdle: true
      });
    }
  }
  initializeDOM() {
    const floorsContainer = document.querySelector(".floors-container");
    const elevatorsContainer = document.querySelector(".elevators-container");
    for (let floor = FLOORS_COUNT - 1;floor >= 0; floor--) {
      const floorElement = document.createElement("div");
      floorElement.className = "floor";
      floorElement.id = `floor-${floor}`;
      const floorNumber = document.createElement("div");
      floorNumber.className = "floor-number";
      floorNumber.textContent = floor.toString();
      const floorButtons = document.createElement("div");
      floorButtons.className = "floor-buttons";
      if (floor < FLOORS_COUNT - 1) {
        const upButton = document.createElement("button");
        upButton.className = "floor-button up";
        upButton.textContent = "↑";
        upButton.dataset.floor = floor.toString();
        upButton.dataset.direction = "up";
        floorButtons.appendChild(upButton);
      }
      if (floor > 0) {
        const downButton = document.createElement("button");
        downButton.className = "floor-button down";
        downButton.textContent = "↓";
        downButton.dataset.floor = floor.toString();
        downButton.dataset.direction = "down";
        floorButtons.appendChild(downButton);
      }
      floorElement.appendChild(floorNumber);
      floorElement.appendChild(floorButtons);
      floorsContainer.appendChild(floorElement);
    }
    for (let i = 0;i < ELEVATORS_COUNT; i++) {
      const shaft = document.createElement("div");
      shaft.className = "elevator-shaft";
      shaft.id = `shaft-${i}`;
      const elevator = document.createElement("div");
      elevator.className = "elevator idle";
      elevator.id = `elevator-${i}`;
      elevator.textContent = `E${i}`;
      elevator.style.bottom = "10px";
      const status = document.createElement("div");
      status.className = "elevator-status";
      status.id = `status-${i}`;
      status.textContent = "Floor 0";
      const panel = document.createElement("div");
      panel.className = "elevator-panel";
      panel.id = `panel-${i}`;
      const panelTitle = document.createElement("h3");
      panelTitle.textContent = `Elevator ${i}`;
      const floorButtons = document.createElement("div");
      floorButtons.className = "elevator-floor-buttons";
      for (let floor = 0;floor < FLOORS_COUNT; floor++) {
        const button = document.createElement("button");
        button.className = "elevator-floor-button";
        button.textContent = floor.toString();
        button.dataset.elevator = i.toString();
        button.dataset.floor = floor.toString();
        floorButtons.appendChild(button);
      }
      panel.appendChild(panelTitle);
      panel.appendChild(floorButtons);
      elevator.appendChild(status);
      shaft.appendChild(elevator);
      shaft.appendChild(panel);
      elevatorsContainer.appendChild(shaft);
    }
  }
  bindEvents() {
    document.querySelectorAll(".floor-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const floor = parseInt(target.dataset.floor);
        const direction = target.dataset.direction;
        this.requestElevator(floor, direction);
      });
    });
    document.querySelectorAll(".elevator-floor-button").forEach((button) => {
      button.addEventListener("click", (e) => {
        const target = e.target;
        const elevatorId = parseInt(target.dataset.elevator);
        const floor = parseInt(target.dataset.floor);
        this.selectFloorInElevator(elevatorId, floor);
      });
    });
    document.getElementById("reset-btn")?.addEventListener("click", () => {
      this.resetSimulation();
    });
    document.getElementById("random-request-btn")?.addEventListener("click", () => {
      this.addRandomRequest();
    });
    document.querySelectorAll(".elevator").forEach((elevator) => {
      elevator.addEventListener("click", (e) => {
        const target = e.target;
        const elevatorId = parseInt(target.id.replace("elevator-", ""));
        this.toggleElevatorPanel(elevatorId);
      });
    });
  }
  toggleElevatorPanel(elevatorId) {
    const panel = document.getElementById(`panel-${elevatorId}`);
    const isShowing = panel.classList.contains("show");
    document.querySelectorAll(".elevator-panel").forEach((p) => {
      p.classList.remove("show");
    });
    if (!isShowing) {
      panel.classList.add("show");
    }
  }
  requestElevator(floor, direction) {
    const request = {
      floor,
      direction,
      timestamp: Date.now()
    };
    const existingRequest = this.floorRequests.find((r) => r.floor === floor && r.direction === direction);
    if (!existingRequest) {
      this.floorRequests.push(request);
      this.processRequest(request);
      this.updateStats();
    }
  }
  selectFloorInElevator(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (floor === elevator.currentFloor) {
      return;
    }
    if (!elevator.requests.includes(floor)) {
      elevator.requests.push(floor);
      this.processElevatorRequests(elevatorId);
    }
  }
  processRequest(request) {
    const bestElevator = this.findBestElevator(request);
    if (bestElevator !== -1) {
      this.assignRequestToElevator(bestElevator, request);
    } else {
      this.queuedRequests.push(request);
    }
  }
  findBestElevator(request) {
    let bestElevator = -1;
    let bestScore = Infinity;
    for (let i = 0;i < this.elevators.length; i++) {
      const elevator = this.elevators[i];
      if (!elevator.isIdle && !elevator.isMoving) {
        continue;
      }
      const distance = Math.abs(elevator.currentFloor - request.floor);
      let score = distance;
      if (elevator.isIdle) {
        score -= 10;
      }
      if (elevator.direction === request.direction) {
        if (request.direction === "up" && elevator.currentFloor <= request.floor || request.direction === "down" && elevator.currentFloor >= request.floor) {
          score -= 5;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        bestElevator = i;
      }
    }
    return bestElevator;
  }
  assignRequestToElevator(elevatorId, request) {
    const elevator = this.elevators[elevatorId];
    if (elevator.isIdle) {
      elevator.destinationFloor = request.floor;
      elevator.direction = request.direction;
      elevator.isIdle = false;
      this.moveElevator(elevatorId);
    } else {
      if (!elevator.requests.includes(request.floor)) {
        elevator.requests.push(request.floor);
      }
    }
  }
  processElevatorRequests(elevatorId) {
    const elevator = this.elevators[elevatorId];
    if (elevator.requests.length === 0) {
      return;
    }
    if (elevator.direction === "up") {
      elevator.requests.sort((a, b) => a - b);
    } else if (elevator.direction === "down") {
      elevator.requests.sort((a, b) => b - a);
    }
    const nextFloor = elevator.requests[0];
    elevator.destinationFloor = nextFloor;
    elevator.requests.shift();
    this.moveElevator(elevatorId);
  }
  moveElevator(elevatorId) {
    const elevator = this.elevators[elevatorId];
    const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
    const statusElement = document.getElementById(`status-${elevatorId}`);
    if (elevator.currentFloor === elevator.destinationFloor) {
      this.arriveAtFloor(elevatorId);
      return;
    }
    elevator.isMoving = true;
    if (elevator.destinationFloor > elevator.currentFloor) {
      elevator.direction = "up";
      elevatorElement.className = "elevator moving-up";
    } else if (elevator.destinationFloor < elevator.currentFloor) {
      elevator.direction = "down";
      elevatorElement.className = "elevator moving-down";
    }
    const targetPosition = 10 + elevator.destinationFloor * FLOOR_HEIGHT;
    const currentPosition = 10 + elevator.currentFloor * FLOOR_HEIGHT;
    const distance = Math.abs(targetPosition - currentPosition);
    const duration = distance / FLOOR_HEIGHT * ELEVATOR_MOVE_SPEED;
    elevatorElement.style.transition = `bottom ${duration}ms ease-in-out`;
    elevatorElement.style.bottom = `${targetPosition}px`;
    const updateStatus = () => {
      const progress = (Date.now() - startTime) / duration;
      if (progress < 1) {
        const currentPos = currentPosition + (targetPosition - currentPosition) * progress;
        const currentFloor = Math.round((currentPos - 10) / FLOOR_HEIGHT);
        statusElement.textContent = `Floor ${currentFloor}`;
        requestAnimationFrame(updateStatus);
      } else {
        statusElement.textContent = `Floor ${elevator.destinationFloor}`;
      }
    };
    const startTime = Date.now();
    requestAnimationFrame(updateStatus);
    setTimeout(() => {
      elevator.currentFloor = elevator.destinationFloor;
      this.arriveAtFloor(elevatorId);
    }, duration);
  }
  arriveAtFloor(elevatorId) {
    const elevator = this.elevators[elevatorId];
    const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
    elevator.isMoving = false;
    this.floorRequests = this.floorRequests.filter((request) => !(request.floor === elevator.currentFloor && (request.direction === elevator.direction || elevator.direction === "idle")));
    if (elevator.requests.length > 0) {
      this.processElevatorRequests(elevatorId);
    } else {
      elevator.isIdle = true;
      elevator.direction = "idle";
      elevatorElement.className = "elevator idle";
      this.processQueuedRequests();
    }
    this.updateStats();
    this.updateFloorButtons();
  }
  processQueuedRequests() {
    if (this.queuedRequests.length === 0) {
      return;
    }
    const request = this.queuedRequests.shift();
    this.processRequest(request);
  }
  updateStats() {
    document.getElementById("active-requests").textContent = this.floorRequests.length.toString();
    document.getElementById("queued-requests").textContent = this.queuedRequests.length.toString();
  }
  updateFloorButtons() {
    document.querySelectorAll(".floor-button").forEach((button) => {
      const buttonElement = button;
      const floor = parseInt(buttonElement.dataset.floor);
      const direction = buttonElement.dataset.direction;
      const hasRequest = this.floorRequests.some((request) => request.floor === floor && request.direction === direction);
      if (hasRequest) {
        buttonElement.classList.add("active");
      } else {
        buttonElement.classList.remove("active");
      }
    });
  }
  addRandomRequest() {
    const floor = Math.floor(Math.random() * FLOORS_COUNT);
    let direction;
    if (floor === 0) {
      direction = "up";
    } else if (floor === FLOORS_COUNT - 1) {
      direction = "down";
    } else {
      direction = Math.random() > 0.5 ? "up" : "down";
    }
    this.requestElevator(floor, direction);
  }
  resetSimulation() {
    this.floorRequests = [];
    this.queuedRequests = [];
    for (let i = 0;i < this.elevators.length; i++) {
      const elevator = this.elevators[i];
      const elevatorElement = document.getElementById(`elevator-${i}`);
      const statusElement = document.getElementById(`status-${i}`);
      elevator.currentFloor = 0;
      elevator.destinationFloor = 0;
      elevator.direction = "idle";
      elevator.isMoving = false;
      elevator.requests = [];
      elevator.isIdle = true;
      elevatorElement.className = "elevator idle";
      elevatorElement.style.bottom = "10px";
      statusElement.textContent = "Floor 0";
    }
    this.updateStats();
    this.updateFloorButtons();
  }
  startSimulation() {
    this.updateStats();
    this.updateFloorButtons();
    setInterval(() => {
      this.processQueuedRequests();
    }, 1000);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new ElevatorSimulator;
});
