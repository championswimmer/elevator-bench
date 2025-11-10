// script.ts
var CONFIG = {
  FLOORS: 10,
  ELEVATORS: 4,
  FLOOR_HEIGHT: 40,
  ANIMATION_SPEED: 500
};

class ElevatorSystem {
  elevators = [];
  floorRequests = [];
  pendingRequests = [];
  constructor() {
    this.initializeElevators();
    this.renderFloors();
    this.renderElevators();
    this.updateStatus();
  }
  initializeElevators() {
    for (let i = 0;i < CONFIG.ELEVATORS; i++) {
      this.elevators.push({
        id: i,
        currentFloor: 0,
        targetFloor: 0,
        direction: "idle",
        requests: new Set,
        isMoving: false
      });
    }
  }
  renderFloors() {
    const floorsContainer = document.getElementById("floors-container");
    if (!floorsContainer)
      return;
    floorsContainer.innerHTML = "";
    for (let floor = CONFIG.FLOORS - 1;floor >= 0; floor--) {
      const floorDiv = document.createElement("div");
      floorDiv.className = "floor";
      floorDiv.dataset.floor = floor.toString();
      const floorNumber = document.createElement("div");
      floorNumber.className = "floor-number";
      floorNumber.textContent = `Floor ${floor}`;
      const floorButtons = document.createElement("div");
      floorButtons.className = "floor-buttons";
      if (floor < CONFIG.FLOORS - 1) {
        const upButton = document.createElement("button");
        upButton.className = "floor-btn up";
        upButton.textContent = "↑";
        upButton.onclick = () => this.requestElevator(floor, "up");
        floorButtons.appendChild(upButton);
      }
      if (floor > 0) {
        const downButton = document.createElement("button");
        downButton.className = "floor-btn down";
        downButton.textContent = "↓";
        downButton.onclick = () => this.requestElevator(floor, "down");
        floorButtons.appendChild(downButton);
      }
      floorDiv.appendChild(floorNumber);
      floorDiv.appendChild(floorButtons);
      floorsContainer.appendChild(floorDiv);
    }
  }
  renderElevators() {
    const elevatorsContainer = document.getElementById("elevators-container");
    if (!elevatorsContainer)
      return;
    elevatorsContainer.innerHTML = "";
    this.elevators.forEach((elevator) => {
      const elevatorDiv = document.createElement("div");
      elevatorDiv.className = "elevator";
      elevatorDiv.dataset.elevatorId = elevator.id.toString();
      const shaftDiv = document.createElement("div");
      shaftDiv.className = "elevator-shaft";
      const carDiv = document.createElement("div");
      carDiv.className = "elevator-car";
      carDiv.style.bottom = "0px";
      const elevatorNumber = document.createElement("div");
      elevatorNumber.className = "elevator-number";
      elevatorNumber.textContent = `E${elevator.id}`;
      const elevatorFloor = document.createElement("div");
      elevatorFloor.className = "elevator-floor";
      elevatorFloor.textContent = `F${elevator.currentFloor}`;
      const controlsDiv = document.createElement("div");
      controlsDiv.className = "elevator-controls";
      for (let floor = 0;floor < CONFIG.FLOORS; floor++) {
        const btn = document.createElement("button");
        btn.className = "elevator-btn";
        btn.textContent = floor.toString();
        btn.onclick = () => this.selectFloor(elevator.id, floor);
        controlsDiv.appendChild(btn);
      }
      carDiv.appendChild(elevatorNumber);
      carDiv.appendChild(elevatorFloor);
      shaftDiv.appendChild(carDiv);
      elevatorDiv.appendChild(shaftDiv);
      elevatorDiv.appendChild(controlsDiv);
      elevatorsContainer.appendChild(elevatorDiv);
    });
  }
  requestElevator(floor, direction) {
    const request = { floor, direction };
    const assignedElevator = this.findBestElevator(floor, direction);
    if (assignedElevator !== null) {
      request.assignedElevator = assignedElevator;
      this.floorRequests.push(request);
      this.assignRequestToElevator(assignedElevator, floor);
      this.updateFloorButton(floor, direction, true);
    } else {
      this.pendingRequests.push(request);
    }
    this.updateStatus();
  }
  findBestElevator(floor, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (let i = 0;i < this.elevators.length; i++) {
      const elevator = this.elevators[i];
      if (elevator.isMoving && elevator.direction !== direction && elevator.direction !== "idle") {
        continue;
      }
      const distance = Math.abs(elevator.currentFloor - floor);
      const isMovingTowards = elevator.direction === "idle" || elevator.direction === "up" && elevator.currentFloor <= floor && direction === "up" || elevator.direction === "down" && elevator.currentFloor >= floor && direction === "down";
      if (isMovingTowards && distance < minDistance) {
        minDistance = distance;
        bestElevator = i;
      }
    }
    return bestElevator;
  }
  assignRequestToElevator(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    elevator.requests.add(floor);
    if (elevator.direction === "idle") {
      elevator.targetFloor = floor;
      elevator.direction = floor > elevator.currentFloor ? "up" : "down";
      this.moveElevator(elevatorId);
    }
  }
  selectFloor(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    if (floor === elevator.currentFloor)
      return;
    elevator.requests.add(floor);
    const elevatorElement = document.querySelector(`[data-elevator-id="${elevatorId}"]`);
    const button = elevatorElement?.querySelector(`.elevator-btn:nth-child(${floor + 1})`);
    if (button) {
      button.classList.add("active");
    }
    if (elevator.direction === "idle") {
      elevator.targetFloor = floor;
      elevator.direction = floor > elevator.currentFloor ? "up" : "down";
      this.moveElevator(elevatorId);
    }
    this.updateStatus();
  }
  moveElevator(elevatorId) {
    const elevator = this.elevators[elevatorId];
    if (elevator.requests.size === 0) {
      elevator.direction = "idle";
      elevator.isMoving = false;
      this.updateElevatorDisplay(elevatorId);
      this.processPendingRequests();
      return;
    }
    let nextFloor = null;
    const sortedRequests = Array.from(elevator.requests).sort((a, b) => a - b);
    if (elevator.direction === "up") {
      nextFloor = sortedRequests.find((f) => f > elevator.currentFloor) || sortedRequests.find((f) => f < elevator.currentFloor);
      if (nextFloor !== undefined && nextFloor < elevator.currentFloor) {
        elevator.direction = "down";
      }
    } else if (elevator.direction === "down") {
      nextFloor = sortedRequests.find((f) => f < elevator.currentFloor) || sortedRequests.find((f) => f > elevator.currentFloor);
      if (nextFloor !== undefined && nextFloor > elevator.currentFloor) {
        elevator.direction = "up";
      }
    }
    if (nextFloor === undefined || nextFloor === null) {
      elevator.direction = "idle";
      elevator.isMoving = false;
      this.updateElevatorDisplay(elevatorId);
      this.processPendingRequests();
      return;
    }
    elevator.targetFloor = nextFloor;
    elevator.isMoving = true;
    const elevatorElement = document.querySelector(`[data-elevator-id="${elevatorId}"]`);
    elevatorElement?.classList.add("elevator-moving");
    const targetPosition = nextFloor * CONFIG.FLOOR_HEIGHT;
    const carDiv = elevatorElement?.querySelector(".elevator-car");
    if (carDiv) {
      carDiv.style.bottom = `${targetPosition}px`;
    }
    const floorDisplay = elevatorElement?.querySelector(".elevator-floor");
    if (floorDisplay) {
      floorDisplay.textContent = `F${nextFloor}`;
    }
    setTimeout(() => {
      elevator.currentFloor = nextFloor;
      elevator.requests.delete(nextFloor);
      elevator.isMoving = false;
      elevatorElement?.classList.remove("elevator-moving");
      this.updateElevatorButtons(elevatorId);
      this.updateFloorButton(nextFloor, "up", false);
      this.updateFloorButton(nextFloor, "down", false);
      this.floorRequests = this.floorRequests.filter((req) => !(req.floor === nextFloor && req.assignedElevator === elevatorId));
      this.updateStatus();
      this.moveElevator(elevatorId);
    }, CONFIG.ANIMATION_SPEED);
  }
  updateElevatorDisplay(elevatorId) {
    const elevator = this.elevators[elevatorId];
    const elevatorElement = document.querySelector(`[data-elevator-id="${elevatorId}"]`);
    if (elevatorElement) {
      const floorDisplay = elevatorElement.querySelector(".elevator-floor");
      if (floorDisplay) {
        floorDisplay.textContent = `F${elevator.currentFloor}`;
      }
    }
  }
  updateElevatorButtons(elevatorId) {
    const elevator = this.elevators[elevatorId];
    const elevatorElement = document.querySelector(`[data-elevator-id="${elevatorId}"]`);
    if (elevatorElement) {
      const buttons = elevatorElement.querySelectorAll(".elevator-btn");
      buttons.forEach((btn, index) => {
        if (elevator.requests.has(index)) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
  }
  updateFloorButton(floor, direction, active) {
    const floorElement = document.querySelector(`[data-floor="${floor}"]`);
    if (floorElement) {
      const button = floorElement.querySelector(`.floor-btn.${direction}`);
      if (button) {
        if (active) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    }
  }
  processPendingRequests() {
    if (this.pendingRequests.length === 0)
      return;
    const request = this.pendingRequests[0];
    const assignedElevator = this.findBestElevator(request.floor, request.direction);
    if (assignedElevator !== null) {
      request.assignedElevator = assignedElevator;
      this.floorRequests.push(request);
      this.pendingRequests.shift();
      this.assignRequestToElevator(assignedElevator, request.floor);
      this.updateFloorButton(request.floor, request.direction, true);
    }
  }
  updateStatus() {
    const statusDisplay = document.getElementById("status-display");
    if (!statusDisplay)
      return;
    let statusHTML = "";
    this.elevators.forEach((elevator) => {
      const status = elevator.isMoving ? "Moving" : elevator.direction === "idle" ? "Idle" : "Busy";
      const direction = elevator.direction === "up" ? "↑" : elevator.direction === "down" ? "↓" : "—";
      statusHTML += `<p>Elevator ${elevator.id}: ${status} at Floor ${elevator.currentFloor} ${direction}</p>`;
    });
    if (this.pendingRequests.length > 0) {
      statusHTML += `<p style="color: #dc3545; margin-top: 10px;">Pending requests: ${this.pendingRequests.length}</p>`;
    }
    statusDisplay.innerHTML = statusHTML || "<p>All elevators idle at ground floor</p>";
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new ElevatorSystem;
});
