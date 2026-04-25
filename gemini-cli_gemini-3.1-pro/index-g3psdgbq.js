// Floor.ts
class Floor {
  floorNum;
  building;
  element;
  upBtn = null;
  downBtn = null;
  constructor(floorNum, building) {
    this.floorNum = floorNum;
    this.building = building;
    this.element = this.createElement();
  }
  createElement() {
    const el = document.createElement("div");
    el.className = "floor";
    const label = document.createElement("div");
    label.className = "floor-label";
    label.innerText = `F${this.floorNum}`;
    el.appendChild(label);
    const controls = document.createElement("div");
    controls.className = "floor-controls";
    if (this.floorNum < this.building.numFloors - 1) {
      this.upBtn = document.createElement("button");
      this.upBtn.className = "floor-btn up-btn";
      this.upBtn.innerText = "▲";
      this.upBtn.onclick = () => {
        if (this.upBtn)
          this.upBtn.classList.add("active");
        this.building.requestElevator(this.floorNum, "UP");
      };
      controls.appendChild(this.upBtn);
    }
    if (this.floorNum > 0) {
      this.downBtn = document.createElement("button");
      this.downBtn.className = "floor-btn down-btn";
      this.downBtn.innerText = "▼";
      this.downBtn.onclick = () => {
        if (this.downBtn)
          this.downBtn.classList.add("active");
        this.building.requestElevator(this.floorNum, "DOWN");
      };
      controls.appendChild(this.downBtn);
    }
    el.appendChild(controls);
    return el;
  }
  getElement() {
    return this.element;
  }
  clearRequest(direction) {
    if ((direction === "UP" || direction === "BOTH") && this.upBtn) {
      this.upBtn.classList.remove("active");
    }
    if ((direction === "DOWN" || direction === "BOTH") && this.downBtn) {
      this.downBtn.classList.remove("active");
    }
  }
}

// Elevator.ts
class Elevator {
  id;
  building;
  currentFloor = 0;
  direction = "IDLE";
  state = "IDLE";
  destinations = new Set;
  element;
  panelElement;
  doorsElement;
  constructor(id, building) {
    this.id = id;
    this.building = building;
    this.element = this.createElement();
    this.doorsElement = this.element.querySelector(".elevator-doors");
    this.panelElement = this.element.querySelector(".elevator-panel");
  }
  createElement() {
    const el = document.createElement("div");
    el.className = "elevator";
    el.style.bottom = "2px";
    const doors = document.createElement("div");
    doors.className = "elevator-doors";
    const doorLeft = document.createElement("div");
    doorLeft.className = "door-left";
    const doorRight = document.createElement("div");
    doorRight.className = "door-right";
    doors.appendChild(doorLeft);
    doors.appendChild(doorRight);
    el.appendChild(doors);
    const panel = document.createElement("div");
    panel.className = "elevator-panel";
    for (let i = this.building.numFloors - 1;i >= 0; i--) {
      const btn = document.createElement("div");
      btn.className = "elevator-btn";
      btn.innerText = i.toString();
      btn.onclick = () => {
        btn.classList.add("active");
        this.addStop(i);
      };
      panel.appendChild(btn);
    }
    el.appendChild(panel);
    return el;
  }
  getElement() {
    return this.element;
  }
  addStop(floorNum) {
    if (floorNum === this.currentFloor && this.state !== "MOVING") {
      this.openDoors();
      return;
    }
    this.destinations.add(floorNum);
    this.updateInnerButtons();
    if (this.state === "IDLE") {
      this.determineDirectionAndMove();
    }
  }
  updateInnerButtons() {
    const btns = this.panelElement.querySelectorAll(".elevator-btn");
    btns.forEach((btn) => {
      const floor = parseInt(btn.innerText);
      if (this.destinations.has(floor)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
  determineDirectionAndMove() {
    if (this.destinations.size === 0) {
      this.state = "IDLE";
      this.direction = "IDLE";
      return;
    }
    if (this.direction === "IDLE") {
      const dests = Array.from(this.destinations);
      let closest = dests[0];
      let minD = Math.abs(closest - this.currentFloor);
      for (const d of dests) {
        if (Math.abs(d - this.currentFloor) < minD) {
          closest = d;
          minD = Math.abs(d - this.currentFloor);
        }
      }
      this.direction = closest > this.currentFloor ? "UP" : "DOWN";
    }
    const destsInDir = Array.from(this.destinations).filter((f) => this.direction === "UP" ? f > this.currentFloor : f < this.currentFloor);
    if (destsInDir.length === 0) {
      const destsInOppositeDir = Array.from(this.destinations).filter((f) => this.direction === "UP" ? f < this.currentFloor : f > this.currentFloor);
      if (destsInOppositeDir.length > 0) {
        this.direction = this.direction === "UP" ? "DOWN" : "UP";
      } else {
        this.state = "IDLE";
        this.direction = "IDLE";
        return;
      }
    }
    this.moveOneFloor();
  }
  moveOneFloor() {
    if (this.destinations.size === 0) {
      this.state = "IDLE";
      this.direction = "IDLE";
      return;
    }
    this.state = "MOVING";
    const nextFloor = this.direction === "UP" ? this.currentFloor + 1 : this.currentFloor - 1;
    this.element.style.bottom = `${nextFloor * 100 + 2}px`;
    setTimeout(() => {
      this.currentFloor = nextFloor;
      if (this.destinations.has(this.currentFloor)) {
        this.destinations.delete(this.currentFloor);
        this.updateInnerButtons();
        this.building.clearFloorRequest(this.currentFloor, this.direction);
        this.openDoors();
      } else {
        this.determineDirectionAndMove();
      }
    }, 1000);
  }
  openDoors() {
    this.state = "DOORS_OPEN";
    this.element.classList.add("open");
    this.building.clearFloorRequest(this.currentFloor, "UP");
    this.building.clearFloorRequest(this.currentFloor, "DOWN");
    setTimeout(() => {
      this.element.classList.remove("open");
      setTimeout(() => {
        this.determineDirectionAndMove();
      }, 500);
    }, 2000);
  }
}

// Building.ts
class Building {
  floors = [];
  elevators = [];
  numFloors;
  numElevators;
  pendingRequests = [];
  constructor(numFloors = 10, numElevators = 4) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
  }
  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container)
      return;
    const buildingDiv = document.createElement("div");
    buildingDiv.className = "building";
    buildingDiv.style.height = `${this.numFloors * 100}px`;
    for (let i = this.numFloors - 1;i >= 0; i--) {
      const floor = new Floor(i, this);
      this.floors[i] = floor;
      buildingDiv.appendChild(floor.getElement());
    }
    const shaftsContainer = document.createElement("div");
    shaftsContainer.className = "shafts-container";
    for (let i = 0;i < this.numElevators; i++) {
      const shaft = document.createElement("div");
      shaft.className = "shaft";
      const elevator = new Elevator(i, this);
      this.elevators.push(elevator);
      shaft.appendChild(elevator.getElement());
      shaftsContainer.appendChild(shaft);
    }
    buildingDiv.appendChild(shaftsContainer);
    container.appendChild(buildingDiv);
    setInterval(() => this.processPendingRequests(), 500);
  }
  requestElevator(floorNum, direction) {
    const bestElevator = this.findBestElevator(floorNum, direction);
    if (bestElevator) {
      bestElevator.addStop(floorNum);
    } else {
      const exists = this.pendingRequests.some((r) => r.floor === floorNum && r.direction === direction);
      if (!exists) {
        this.pendingRequests.push({ floor: floorNum, direction });
      }
    }
  }
  processPendingRequests() {
    if (this.pendingRequests.length === 0)
      return;
    const remainingRequests = [];
    for (const req of this.pendingRequests) {
      const bestElevator = this.findBestElevator(req.floor, req.direction);
      if (bestElevator) {
        bestElevator.addStop(req.floor);
      } else {
        remainingRequests.push(req);
      }
    }
    this.pendingRequests = remainingRequests;
  }
  findBestElevator(floorNum, direction) {
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of this.elevators) {
      if (elevator.state === "IDLE") {
        const dist = Math.abs(elevator.currentFloor - floorNum);
        if (dist < minDistance) {
          minDistance = dist;
          bestElevator = elevator;
        }
      } else if (elevator.direction === direction) {
        if (direction === "UP" && elevator.currentFloor <= floorNum) {
          const dist = floorNum - elevator.currentFloor;
          if (dist < minDistance) {
            minDistance = dist;
            bestElevator = elevator;
          }
        } else if (direction === "DOWN" && elevator.currentFloor >= floorNum) {
          const dist = elevator.currentFloor - floorNum;
          if (dist < minDistance) {
            minDistance = dist;
            bestElevator = elevator;
          }
        }
      }
    }
    return bestElevator;
  }
  clearFloorRequest(floorNum, direction) {
    const floor = this.floors[floorNum];
    if (floor) {
      floor.clearRequest("BOTH");
    }
    this.pendingRequests = this.pendingRequests.filter((r) => r.floor !== floorNum);
  }
}

// script.ts
document.addEventListener("DOMContentLoaded", () => {
  const building = new Building(10, 4);
  building.init("building-container");
});
