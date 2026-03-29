// src/Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  requests;
  isMoving;
  element;
  constructor(id, totalFloors) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle";
    this.requests = [];
    this.isMoving = false;
    this.element = document.createElement("div");
    this.element.classList.add("elevator");
    this.element.id = `elevator-${id}`;
    this.element.innerHTML = `
            <div class="elevator-buttons">
                ${Array.from({ length: totalFloors }, (_, i) => `<button data-floor="${i}">${i}</button>`).join("")}
            </div>
        `;
    this.element.addEventListener("click", () => {
      this.element.classList.toggle("selected");
    });
  }
  moveTo(floor) {
    this.isMoving = true;
    this.direction = floor > this.currentFloor ? "up" : "down";
    this.element.style.bottom = `${floor * 100}px`;
    setTimeout(() => {
      this.currentFloor = floor;
      this.isMoving = false;
      const index = this.requests.indexOf(floor);
      if (index > -1) {
        this.requests.splice(index, 1);
      }
      if (this.requests.length === 0) {
        this.direction = "idle";
      }
    }, 500);
  }
  addRequest(floor) {
    if (!this.requests.includes(floor)) {
      this.requests.push(floor);
      if (this.direction === "up") {
        this.requests.sort((a, b) => a - b);
      } else if (this.direction === "down") {
        this.requests.sort((a, b) => b - a);
      }
    }
  }
}

// src/Floor.ts
class Floor {
  floorNumber;
  element;
  constructor(floorNumber, totalFloors, requestElevator) {
    this.floorNumber = floorNumber;
    this.element = document.createElement("div");
    this.element.classList.add("floor");
    this.element.id = `floor-${floorNumber}`;
    let buttons = "";
    if (floorNumber < totalFloors - 1) {
      buttons += `<button class="up-btn">Up</button>`;
    }
    if (floorNumber > 0) {
      buttons += `<button class="down-btn">Down</button>`;
    }
    this.element.innerHTML = `
            <div class="floor-label">Floor ${floorNumber}</div>
            <div class="floor-buttons">
                ${buttons}
            </div>
        `;
    const upButton = this.element.querySelector(".up-btn");
    if (upButton) {
      upButton.addEventListener("click", () => requestElevator(this.floorNumber, "up"));
    }
    const downButton = this.element.querySelector(".down-btn");
    if (downButton) {
      downButton.addEventListener("click", () => requestElevator(this.floorNumber, "down"));
    }
  }
}

// src/Building.ts
class Building {
  floors;
  elevators;
  requestQueue;
  totalFloors;
  numberOfElevators;
  constructor(totalFloors, numberOfElevators) {
    this.totalFloors = totalFloors;
    this.numberOfElevators = numberOfElevators;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = [];
    this.initialize();
  }
  initialize() {
    const buildingElement = document.getElementById("building");
    const floorsContainer = document.createElement("div");
    floorsContainer.classList.add("floors");
    buildingElement.appendChild(floorsContainer);
    for (let i = this.totalFloors - 1;i >= 0; i--) {
      const floor = new Floor(i, this.totalFloors, this.requestElevator.bind(this));
      this.floors.push(floor);
      floorsContainer.appendChild(floor.element);
    }
    for (let i = 0;i < this.numberOfElevators; i++) {
      const elevator = new Elevator(i, this.totalFloors);
      this.elevators.push(elevator);
      const elevatorShaft = document.createElement("div");
      elevatorShaft.classList.add("elevator-shaft");
      elevatorShaft.appendChild(elevator.element);
      buildingElement.appendChild(elevatorShaft);
      const elevatorButtons = elevator.element.querySelectorAll(".elevator-buttons button");
      elevatorButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const floor = parseInt(e.target.dataset.floor);
          this.requestElevatorFromInside(elevator.id, floor);
        });
      });
    }
    setInterval(() => this.processQueue(), 1000);
  }
  requestElevator(floor, direction) {
    this.requestQueue.push({ floor, direction });
  }
  requestElevatorFromInside(elevatorId, floor) {
    const elevator = this.elevators[elevatorId];
    elevator.addRequest(floor);
  }
  processQueue() {
    if (this.requestQueue.length === 0) {
      this.elevators.forEach((elevator) => {
        if (!elevator.isMoving && elevator.requests.length > 0) {
          const nextRequest = elevator.requests[0];
          elevator.moveTo(nextRequest);
        }
      });
      return;
    }
    const { floor, direction } = this.requestQueue.shift();
    const bestElevator = this.findBestElevator(floor, direction);
    if (bestElevator) {
      bestElevator.addRequest(floor);
    } else {
      this.requestQueue.push({ floor, direction });
    }
  }
  findBestElevator(floor, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.direction === "idle") {
        const distance = Math.abs(elevator.currentFloor - floor);
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      }
    }
    if (bestElevator) {
      return bestElevator;
    }
    for (const elevator of this.elevators) {
      if (elevator.direction === direction) {
        if (direction === "up" && elevator.currentFloor <= floor) {
          const distance = floor - elevator.currentFloor;
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        } else if (direction === "down" && elevator.currentFloor >= floor) {
          const distance = elevator.currentFloor - floor;
          if (distance < minDistance) {
            minDistance = distance;
            bestElevator = elevator;
          }
        }
      }
    }
    return bestElevator;
  }
}

// src/script.ts
var TOTAL_FLOORS = 10;
var NUMBER_OF_ELEVATORS = 4;
document.addEventListener("DOMContentLoaded", () => {
  new Building(TOTAL_FLOORS, NUMBER_OF_ELEVATORS);
});
