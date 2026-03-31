// Elevator.ts
class Elevator {
  id;
  currentFloor = 0;
  direction = "IDLE" /* IDLE */;
  targetFloors = new Set;
  element;
  doorState = "CLOSED";
  constructor(id) {
    this.id = id;
    this.element = document.createElement("div");
    this.element.className = "elevator";
    this.element.id = `elevator-${id}`;
    this.element.innerHTML = `<div class="elevator-doors"></div><div class="elevator-label">${id}</div>`;
    this.updatePosition();
  }
  addRequest(floor) {
    this.targetFloors.add(floor);
    this.updateDirection();
  }
  updateDirection() {
    if (this.direction === "IDLE" /* IDLE */ && this.targetFloors.size > 0) {
      const targets = Array.from(this.targetFloors);
      const nextFloor = targets[0];
      this.direction = nextFloor > this.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
    }
  }
  updatePosition() {
    this.element.style.bottom = `${this.currentFloor * 100}px`;
    this.element.style.left = `${this.id * 80 + 100}px`;
  }
  step() {
    if (this.doorState === "OPEN")
      return;
    if (this.targetFloors.size === 0) {
      this.direction = "IDLE" /* IDLE */;
      return;
    }
    if (this.targetFloors.has(this.currentFloor)) {
      this.targetFloors.delete(this.currentFloor);
      this.openDoors();
      this.updateDirection();
      return;
    }
    let hasHigher = false;
    let hasLower = false;
    for (const f of this.targetFloors) {
      if (f > this.currentFloor)
        hasHigher = true;
      if (f < this.currentFloor)
        hasLower = true;
    }
    if (this.direction === "UP" /* UP */) {
      if (hasHigher) {
        this.currentFloor++;
      } else if (hasLower) {
        this.direction = "DOWN" /* DOWN */;
        this.currentFloor--;
      } else {
        this.direction = "IDLE" /* IDLE */;
      }
    } else if (this.direction === "DOWN" /* DOWN */) {
      if (hasLower) {
        this.currentFloor--;
      } else if (hasHigher) {
        this.direction = "UP" /* UP */;
        this.currentFloor++;
      } else {
        this.direction = "IDLE" /* IDLE */;
      }
    }
    this.updatePosition();
  }
  openDoors() {
    this.doorState = "OPEN";
    this.element.classList.add("open");
    setTimeout(() => {
      this.element.classList.remove("open");
      this.doorState = "CLOSED";
      this.updateDirection();
    }, 1000);
  }
}

// Building.ts
class Building {
  numFloors;
  numElevators;
  elevators = [];
  requestQueue = [];
  constructor(numFloors = 10, numElevators = 4) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    const shaftContainer = document.getElementById("shaft-container");
    if (shaftContainer) {
      for (let i = 0;i < numElevators; i++) {
        const el = new Elevator(i);
        this.elevators.push(el);
        shaftContainer.appendChild(el.element);
      }
    }
    this.renderFloors();
    this.renderInsideButtons();
    setInterval(() => this.step(), 1000);
  }
  renderFloors() {
    const floorsContainer = document.getElementById("floors-container");
    if (!floorsContainer)
      return;
    for (let i = this.numFloors - 1;i >= 0; i--) {
      const floorDiv = document.createElement("div");
      floorDiv.className = "floor";
      floorDiv.style.bottom = `${i * 100}px`;
      const label = document.createElement("div");
      label.className = "floor-label";
      label.innerText = `Floor ${i}`;
      floorDiv.appendChild(label);
      const buttons = document.createElement("div");
      buttons.className = "floor-buttons";
      if (i < this.numFloors - 1) {
        const upBtn = document.createElement("button");
        upBtn.innerText = "▲";
        upBtn.onclick = () => this.requestElevator(i, "UP" /* UP */);
        buttons.appendChild(upBtn);
      }
      if (i > 0) {
        const downBtn = document.createElement("button");
        downBtn.innerText = "▼";
        downBtn.onclick = () => this.requestElevator(i, "DOWN" /* DOWN */);
        buttons.appendChild(downBtn);
      }
      floorDiv.appendChild(buttons);
      floorsContainer.appendChild(floorDiv);
    }
  }
  renderInsideButtons() {
    const panel = document.getElementById("inside-panel");
    if (!panel)
      return;
    for (let i = 0;i < this.numElevators; i++) {
      const elPanel = document.createElement("div");
      elPanel.className = "elevator-panel";
      elPanel.innerHTML = `<h4>Elevator ${i}</h4>`;
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "elevator-buttons-grid";
      for (let f = this.numFloors - 1;f >= 0; f--) {
        const btn = document.createElement("button");
        btn.innerText = `${f}`;
        btn.onclick = () => this.elevators[i].addRequest(f);
        buttonsDiv.appendChild(btn);
      }
      elPanel.appendChild(buttonsDiv);
      panel.appendChild(elPanel);
    }
  }
  requestElevator(floor, direction) {
    const bestElevator = this.findBestElevator(floor, direction);
    if (bestElevator) {
      bestElevator.addRequest(floor);
    } else {
      this.requestQueue.push({ floor, direction });
    }
  }
  findBestElevator(floor, direction) {
    let best = null;
    let minDistance = Infinity;
    for (const el of this.elevators) {
      const dist = Math.abs(el.currentFloor - floor);
      if (el.direction === "IDLE" /* IDLE */) {
        if (dist < minDistance) {
          minDistance = dist;
          best = el;
        }
      } else if (el.direction === direction) {
        if (direction === "UP" /* UP */ && el.currentFloor <= floor) {
          if (dist < minDistance) {
            minDistance = dist;
            best = el;
          }
        } else if (direction === "DOWN" /* DOWN */ && el.currentFloor >= floor) {
          if (dist < minDistance) {
            minDistance = dist;
            best = el;
          }
        }
      }
    }
    return best;
  }
  step() {
    for (const el of this.elevators) {
      el.step();
    }
    if (this.requestQueue.length > 0) {
      const remainingQueue = [];
      for (const req of this.requestQueue) {
        const best = this.findBestElevator(req.floor, req.direction);
        if (best) {
          best.addRequest(req.floor);
        } else {
          remainingQueue.push(req);
        }
      }
      this.requestQueue = remainingQueue;
    }
  }
}

// script.ts
document.addEventListener("DOMContentLoaded", () => {
  const app = new Building;
});
