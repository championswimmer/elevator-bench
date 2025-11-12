// Elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  destinationQueue;
  element;
  panelElement;
  floorButtons;
  constructor(id, totalFloors) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle";
    this.destinationQueue = [];
    this.floorButtons = new Map;
    this.element = document.createElement("div");
    this.element.classList.add("elevator");
    this.element.innerHTML = `<div class="elevator-info">E${id} [${this.currentFloor}]</div>`;
    this.panelElement = this.createPanel(totalFloors);
    this.element.appendChild(this.panelElement);
  }
  createPanel(totalFloors) {
    const panel = document.createElement("div");
    panel.classList.add("elevator-panel");
    const title = document.createElement("h4");
    title.innerText = `Elevator ${this.id}`;
    panel.appendChild(title);
    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add("elevator-panel-buttons");
    for (let i = totalFloors - 1;i >= 0; i--) {
      const button = document.createElement("button");
      button.classList.add("elevator-button");
      button.innerText = `${i}`;
      button.addEventListener("click", () => this.addDestination(i));
      buttonsContainer.appendChild(button);
      this.floorButtons.set(i, button);
    }
    panel.appendChild(buttonsContainer);
    return panel;
  }
  addDestination(floor) {
    if (this.destinationQueue.includes(floor)) {
      return;
    }
    this.destinationQueue.push(floor);
    this.floorButtons.get(floor)?.classList.add("active");
    if (this.direction === "up") {
      this.destinationQueue.sort((a, b) => a - b);
    } else if (this.direction === "down") {
      this.destinationQueue.sort((a, b) => b - a);
    }
    if (this.isIdle()) {
      this.updateDirection();
    }
  }
  moveTo(floor) {
    this.currentFloor = floor;
    this.element.style.transform = `translateY(-${floor * 100}px)`;
    this.element.querySelector(".elevator-info").innerHTML = `E${this.id} [${this.currentFloor}]`;
  }
  update() {
    if (this.isIdle()) {
      this.updateDirection();
      return;
    }
    while (this.destinationQueue.length > 0 && this.destinationQueue[0] === this.currentFloor) {
      this.destinationQueue.shift();
      this.floorButtons.get(this.currentFloor)?.classList.remove("active");
    }
    if (this.destinationQueue.length === 0) {
      this.direction = "idle";
      return;
    }
    this.updateDirection();
    if (this.destinationQueue.length > 0) {
      if (this.currentFloor < this.destinationQueue[0]) {
        this.moveTo(this.currentFloor + 1);
      } else if (this.currentFloor > this.destinationQueue[0]) {
        this.moveTo(this.currentFloor - 1);
      }
    }
  }
  updateDirection() {
    if (this.destinationQueue.length === 0) {
      this.direction = "idle";
      return;
    }
    if (this.direction === "idle") {
      if (this.destinationQueue[0] > this.currentFloor) {
        this.direction = "up";
      } else {
        this.direction = "down";
      }
    }
    if (this.direction === "up") {
      this.destinationQueue.sort((a, b) => a - b);
    } else if (this.direction === "down") {
      this.destinationQueue.sort((a, b) => b - a);
    }
    const stopsInCurrentDir = this.destinationQueue.filter((floor) => {
      return this.direction === "up" ? floor > this.currentFloor : floor < this.currentFloor;
    });
    if (stopsInCurrentDir.length === 0) {
      this.direction = this.direction === "up" ? "down" : "up";
      if (this.direction === "up") {
        this.destinationQueue.sort((a, b) => a - b);
      } else if (this.direction === "down") {
        this.destinationQueue.sort((a, b) => b - a);
      }
    }
  }
  isIdle() {
    return this.direction === "idle" && this.destinationQueue.length === 0;
  }
}

// Floor.ts
class Floor {
  id;
  element;
  upButton = null;
  downButton = null;
  constructor(id, totalFloors, requestElevator) {
    this.id = id;
    this.element = document.createElement("div");
    this.element.classList.add("floor");
    const floorLabel = document.createElement("div");
    floorLabel.classList.add("floor-label");
    floorLabel.innerText = `Floor ${id}`;
    this.element.appendChild(floorLabel);
    const buttonsContainer = document.createElement("div");
    buttonsContainer.classList.add("floor-buttons");
    if (id < totalFloors - 1) {
      this.upButton = this.createButton("Up", () => {
        requestElevator(this.id, "up");
        this.upButton?.classList.add("active");
      });
      buttonsContainer.appendChild(this.upButton);
    }
    if (id > 0) {
      this.downButton = this.createButton("Down", () => {
        requestElevator(this.id, "down");
        this.downButton?.classList.add("active");
      });
      buttonsContainer.appendChild(this.downButton);
    }
    this.element.appendChild(buttonsContainer);
  }
  createButton(text, onClick) {
    const button = document.createElement("button");
    button.classList.add("floor-button");
    button.innerText = text;
    button.addEventListener("click", onClick);
    return button;
  }
  clearButton(direction) {
    if (direction === "up") {
      this.upButton?.classList.remove("active");
    } else {
      this.downButton?.classList.remove("active");
    }
  }
}

// Building.ts
class Building {
  totalFloors;
  numElevators;
  buildingElement;
  floors = [];
  elevators = [];
  callQueue = [];
  constructor(totalFloors, numElevators, buildingElement) {
    this.totalFloors = totalFloors;
    this.numElevators = numElevators;
    this.buildingElement = buildingElement;
    this.initialize();
  }
  initialize() {
    const floorsContainer = document.createElement("div");
    floorsContainer.classList.add("floors-container");
    for (let i = this.totalFloors - 1;i >= 0; i--) {
      const floor = new Floor(i, this.totalFloors, this.requestElevator.bind(this));
      this.floors.push(floor);
      floorsContainer.appendChild(floor.element);
    }
    this.buildingElement.appendChild(floorsContainer);
    for (let i = 0;i < this.numElevators; i++) {
      const elevator = new Elevator(i, this.totalFloors);
      this.elevators.push(elevator);
      const shaft = document.createElement("div");
      shaft.classList.add("elevator-shaft");
      shaft.appendChild(elevator.element);
      this.buildingElement.appendChild(shaft);
    }
    setInterval(() => this.updateElevators(), 1000);
    setInterval(() => this.dispatchElevator(), 100);
  }
  requestElevator(floor, direction) {
    if (!this.callQueue.some((req) => req.floor === floor && req.direction === direction)) {
      this.callQueue.push({ floor, direction });
    }
  }
  dispatchElevator() {
    if (this.callQueue.length === 0) {
      return;
    }
    this.callQueue = this.callQueue.filter((request) => {
      let bestElevator = null;
      let bestScore = -1;
      for (const elevator of this.elevators) {
        let score = 0;
        const distance = Math.abs(elevator.currentFloor - request.floor);
        if (elevator.isIdle()) {
          score = 100 - distance;
        } else if (elevator.direction === request.direction) {
          if (request.direction === "up" && elevator.currentFloor <= request.floor || request.direction === "down" && elevator.currentFloor >= request.floor) {
            score = 50 - distance;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestElevator = elevator;
        }
      }
      if (bestElevator) {
        bestElevator.addDestination(request.floor);
        this.floors.find((f) => f.id === request.floor)?.clearButton(request.direction);
        return false;
      }
      return true;
    });
  }
  updateElevators() {
    this.elevators.forEach((elevator) => elevator.update());
  }
}

// script.ts
document.addEventListener("DOMContentLoaded", () => {
  const buildingElement = document.getElementById("building");
  if (buildingElement) {
    const NUM_FLOORS = 10;
    const NUM_ELEVATORS = 4;
    new Building(NUM_FLOORS, NUM_ELEVATORS, buildingElement);
  }
});
