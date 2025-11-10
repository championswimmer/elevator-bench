// script.ts
var NUM_ELEVATORS = 4;
var FLOOR_HEIGHT = 60;

class Elevator {
  id;
  currentFloor = 0;
  direction = "idle";
  queue = [];
  element;
  constructor(id) {
    this.id = id;
    this.element = document.querySelector(`.elevator[data-elevator="${id}"] .elevator-car`);
  }
  addDestination(floor) {
    if (!this.queue.includes(floor)) {
      this.queue.push(floor);
      this.sortQueue();
    }
  }
  sortQueue() {
    if (this.direction === "up") {
      this.queue = this.queue.filter((f) => f >= this.currentFloor).sort((a, b) => a - b);
    } else if (this.direction === "down") {
      this.queue = this.queue.filter((f) => f <= this.currentFloor).sort((a, b) => b - a);
    } else {
      this.queue = this.queue.sort((a, b) => Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor));
    }
  }
  move() {
    if (this.queue.length === 0) {
      this.direction = "idle";
      assignPendingRequests();
      return;
    }
    const nextFloor = this.queue.shift();
    this.direction = nextFloor > this.currentFloor ? "up" : nextFloor < this.currentFloor ? "down" : "idle";
    this.sortQueue();
    this.element.style.bottom = `${nextFloor * FLOOR_HEIGHT}px`;
    this.currentFloor = nextFloor;
    setTimeout(() => this.move(), 2000);
  }
}
var elevators = [];
var pendingRequests = [];
function init() {
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    elevators.push(new Elevator(i));
  }
  document.querySelectorAll(".up-btn").forEach((btn) => {
    const floor = parseInt(btn.parentElement.dataset.floor);
    btn.addEventListener("click", () => requestElevator(floor, "up"));
  });
  document.querySelectorAll(".down-btn").forEach((btn) => {
    const floor = parseInt(btn.parentElement.dataset.floor);
    btn.addEventListener("click", () => requestElevator(floor, "down"));
  });
  document.querySelectorAll(".elevator").forEach((elevDiv, elevId) => {
    elevDiv.querySelectorAll(".elevator-buttons button").forEach((btn) => {
      const floor = parseInt(btn.dataset.floor);
      btn.addEventListener("click", () => {
        elevators[elevId].addDestination(floor);
        if (elevators[elevId].direction === "idle") {
          elevators[elevId].move();
        }
      });
    });
  });
}
function requestElevator(floor, direction) {
  let closest = null;
  let minDist = Infinity;
  for (const elev of elevators) {
    if (elev.direction === "idle" || elev.direction === direction) {
      const dist = Math.abs(elev.currentFloor - floor);
      if (dist < minDist) {
        minDist = dist;
        closest = elev;
      }
    }
  }
  if (closest) {
    closest.addDestination(floor);
    if (closest.direction === "idle") {
      closest.direction = direction;
      closest.move();
    }
  } else {
    pendingRequests.push({ floor, direction });
  }
}
function assignPendingRequests() {
  if (pendingRequests.length === 0)
    return;
  pendingRequests.sort((a, b) => a.floor - b.floor);
  for (const req of pendingRequests.slice()) {
    let assigned = false;
    for (const elev of elevators) {
      if (elev.direction === "idle") {
        elev.addDestination(req.floor);
        elev.direction = req.direction;
        elev.move();
        pendingRequests.splice(pendingRequests.indexOf(req), 1);
        assigned = true;
        break;
      }
    }
    if (!assigned)
      break;
  }
}
document.addEventListener("DOMContentLoaded", init);
