// Elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  targetFloors = new Set;
  direction = "IDLE" /* IDLE */;
  isMoving = false;
  constructor(id) {
    this.id = id;
  }
  addTarget(floor) {
    this.targetFloors.add(floor);
    this.updateDirection();
  }
  updateDirection() {
    if (this.targetFloors.size === 0) {
      this.direction = "IDLE" /* IDLE */;
      return;
    }
    if (this.direction === "IDLE" /* IDLE */) {
      const firstTarget = Array.from(this.targetFloors)[0];
      this.direction = firstTarget > this.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    }
  }
  getNextFloor() {
    if (this.targetFloors.size === 0)
      return null;
    const targets = Array.from(this.targetFloors);
    if (this.direction === "UP" /* UP */) {
      const above = targets.filter((f) => f > this.currentFloor).sort((a, b) => a - b);
      return above.length > 0 ? above[0] : null;
    } else if (this.direction === "DOWN" /* DOWN */) {
      const below = targets.filter((f) => f < this.currentFloor).sort((a, b) => b - a);
      return below.length > 0 ? below[0] : null;
    }
    return null;
  }
}

// Building.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;

class Building {
  elevators = [];
  floorRequests = [];
  constructor() {
    for (let i = 0;i < NUM_ELEVATORS; i++) {
      this.elevators.push(new Elevator(i));
    }
  }
  requestElevator(floor, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      const distance = Math.abs(elevator.currentFloor - floor);
      const isIdle = elevator.direction === "IDLE" /* IDLE */;
      const isGoingTowards = elevator.direction === "UP" /* UP */ && floor >= elevator.currentFloor || elevator.direction === "DOWN" /* DOWN */ && floor <= elevator.currentFloor;
      if ((isIdle || isGoingTowards) && distance < minDistance) {
        minDistance = distance;
        bestElevator = elevator;
      }
    }
    if (bestElevator) {
      bestElevator.addTarget(floor);
      this.updateElevatorStatus(bestElevator.id);
    } else {
      this.floorRequests.push({ floor, direction });
    }
  }
  updateElevatorStatus(id) {
    const elevator = this.elevators[id];
    if (elevator.isMoving)
      return;
    const nextTarget = elevator.getNextFloor();
    if (nextTarget !== null) {
      this.moveElevator(elevator, nextTarget);
    } else {
      if (this.floorRequests.length > 0) {
        const request = this.floorRequests.shift();
        elevator.addTarget(request.floor);
        this.updateElevatorStatus(id);
      }
    }
  }
  async moveElevator(elevator, targetFloor) {
    elevator.isMoving = true;
    const event = new CustomEvent("elevator-move", {
      detail: { id: elevator.id, floor: targetFloor }
    });
    window.dispatchEvent(event);
    const floorsToTravel = Math.abs(elevator.currentFloor - targetFloor);
    await new Promise((resolve) => setTimeout(resolve, floorsToTravel * 1000));
    elevator.currentFloor = targetFloor;
    elevator.targetFloors.delete(targetFloor);
    elevator.isMoving = false;
    elevator.updateDirection();
    this.updateElevatorStatus(elevator.id);
    window.dispatchEvent(new CustomEvent("elevator-stopped", {
      detail: { id: elevator.id, floor: targetFloor }
    }));
  }
}

// script.ts
var building = new Building;
document.addEventListener("DOMContentLoaded", () => {
  const floorsContainer = document.getElementById("floors");
  const elevatorsContainer = document.getElementById("elevators");
  for (let i = NUM_FLOORS - 1;i >= 0; i--) {
    const floorElement = document.createElement("div");
    floorElement.className = "floor";
    floorElement.innerHTML = `
            <div class="floor-num">Floor ${i}</div>
            <div class="floor-btns">
                ${i < NUM_FLOORS - 1 ? `<button class="floor-btn up" data-floor="${i}">UP</button>` : ""}
                ${i > 0 ? `<button class="floor-btn down" data-floor="${i}">DOWN</button>` : ""}
            </div>
        `;
    floorsContainer?.appendChild(floorElement);
  }
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const elevatorElement = document.createElement("div");
    elevatorElement.className = "elevator";
    elevatorElement.id = `elevator-${i}`;
    elevatorElement.style.bottom = "0px";
    let innerBtns = "";
    for (let j = 0;j < NUM_FLOORS; j++) {
      innerBtns += `<button class="inner-btn" data-elevator="${i}" data-floor="${j}">${j}</button>`;
    }
    elevatorElement.innerHTML = `<div class="inner-btns">${innerBtns}</div>`;
    elevatorsContainer?.appendChild(elevatorElement);
  }
  document.querySelectorAll(".floor-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const floor = parseInt(e.target.dataset.floor);
      const direction = e.target.classList.contains("up") ? "UP" /* UP */ : "DOWN" /* DOWN */;
      building.requestElevator(floor, direction);
      e.target.disabled = true;
    });
  });
  document.querySelectorAll(".inner-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const elevatorId = parseInt(e.target.dataset.elevator);
      const floor = parseInt(e.target.dataset.floor);
      building.elevators[elevatorId].addTarget(floor);
      building.updateElevatorStatus(elevatorId);
      e.target.classList.add("active");
    });
  });
  window.addEventListener("elevator-move", (e) => {
    const { id, floor } = e.detail;
    const elevator = document.getElementById(`elevator-${id}`);
    if (elevator) {
      elevator.style.transition = `bottom ${Math.abs(building.elevators[id].currentFloor - floor) * 1000}ms linear`;
      elevator.style.bottom = `${floor * 60}px`;
    }
  });
  window.addEventListener("elevator-stopped", (e) => {
    const { id, floor } = e.detail;
    const elevatorBtn = document.querySelector(`.inner-btn[data-elevator="${id}"][data-floor="${floor}"]`);
    if (elevatorBtn) {
      elevatorBtn.classList.remove("active");
    }
    const upBtn = document.querySelector(`.floor-btn.up[data-floor="${floor}"]`);
    const downBtn = document.querySelector(`.floor-btn.down[data-floor="${floor}"]`);
    if (upBtn)
      upBtn.disabled = false;
    if (downBtn)
      downBtn.disabled = false;
  });
});
