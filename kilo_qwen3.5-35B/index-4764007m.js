// script.ts
var CONFIG = {
  FLOORS: 10,
  ELEVATORS: 4,
  MOVEMENT_SPEED_MS: 500
};
class Floor {
  number;
  upButton = null;
  downButton = null;
  upRequest = null;
  downRequest = null;
  constructor(number) {
    this.number = number;
  }
  hasUpRequest() {
    return this.upRequest !== null;
  }
  hasDownRequest() {
    return this.downRequest !== null;
  }
  clearUpRequest() {
    this.upRequest = null;
    if (this.upButton) {
      this.upButton.classList.remove("active");
    }
  }
  clearDownRequest() {
    this.downRequest = null;
    if (this.downButton) {
      this.downButton.classList.remove("active");
    }
  }
}

class Elevator {
  id;
  state;
  element = null;
  floorButtons = new Map;
  requestQueue = [];
  constructor(id) {
    this.id = id;
    this.state = {
      currentFloor: 0,
      direction: "IDLE" /* IDLE */,
      destinationFloors: new Set,
      isMoving: false
    };
  }
  updatePosition() {
    if (this.element) {
      const floorHeight = 70;
      const offset = 10;
      const topPosition = offset + this.state.currentFloor * floorHeight;
      this.element.style.top = `${topPosition}px`;
    }
  }
  addDestination(floor) {
    if (!this.state.destinationFloors.has(floor)) {
      this.state.destinationFloors.add(floor);
      this.updateDestinationDisplay();
    }
  }
  removeDestination(floor) {
    this.state.destinationFloors.delete(floor);
    this.updateDestinationDisplay();
  }
  updateDestinationDisplay() {
    if (this.element) {
      const destElement = this.element.querySelector(".elevator-destination");
      if (destElement) {
        if (this.state.destinationFloors.size > 0) {
          destElement.textContent = Array.from(this.state.destinationFloors).sort((a, b) => a - b).join(", ");
        } else {
          destElement.textContent = "";
        }
      }
    }
  }
  setMoving(moving) {
    this.state.isMoving = moving;
    if (this.element) {
      if (moving) {
        this.element.classList.remove("elevator-idle");
        this.element.classList.add("elevator-moving");
      } else {
        this.element.classList.remove("elevator-moving");
        this.element.classList.add("elevator-idle");
      }
    }
  }
  moveToFloor(floor) {
    return new Promise((resolve) => {
      const startFloor = this.state.currentFloor;
      const direction = floor > startFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
      this.state.direction = direction;
      this.setMoving(true);
      let currentFloor = startFloor;
      const step = direction === "UP" /* UP */ ? 1 : -1;
      const interval = setInterval(() => {
        currentFloor += step;
        this.state.currentFloor = currentFloor;
        this.updatePosition();
        if (currentFloor === floor) {
          clearInterval(interval);
          this.state.direction = "IDLE" /* IDLE */;
          this.setMoving(false);
          resolve();
        }
      }, CONFIG.MOVEMENT_SPEED_MS);
    });
  }
  async processRequests(building) {
    while (true) {
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        if (nextRequest) {
          this.addDestination(nextRequest.floor);
          await this.moveToFloor(nextRequest.floor);
          this.removeDestination(nextRequest.floor);
          this.state.currentFloor = nextRequest.floor;
          this.updatePosition();
        }
        continue;
      }
      const requestInDirection = this.findRequestInDirection(building);
      if (requestInDirection) {
        this.addDestination(requestInDirection.floor);
        await this.moveToFloor(requestInDirection.floor);
        this.removeDestination(requestInDirection.floor);
        this.state.currentFloor = requestInDirection.floor;
        this.updatePosition();
        continue;
      }
      const requestInOppositeDirection = this.findRequestInOppositeDirection(building);
      if (requestInOppositeDirection) {
        this.addDestination(requestInOppositeDirection.floor);
        await this.moveToFloor(requestInOppositeDirection.floor);
        this.removeDestination(requestInOppositeDirection.floor);
        this.state.currentFloor = requestInOppositeDirection.floor;
        this.updatePosition();
        continue;
      }
      this.state.direction = "IDLE" /* IDLE */;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  findRequestInDirection(building) {
    const floors = building.floors;
    const currentFloor = this.state.currentFloor;
    if (this.state.direction === "UP" /* UP */) {
      for (let i = currentFloor + 1;i < floors.length; i++) {
        if (floors[i].hasUpRequest()) {
          return floors[i].upRequest;
        }
        if (floors[i].hasDownRequest()) {
          return floors[i].downRequest;
        }
      }
    } else if (this.state.direction === "DOWN" /* DOWN */) {
      for (let i = currentFloor - 1;i >= 0; i--) {
        if (floors[i].hasUpRequest()) {
          return floors[i].upRequest;
        }
        if (floors[i].hasDownRequest()) {
          return floors[i].downRequest;
        }
      }
    }
    return null;
  }
  findRequestInOppositeDirection(building) {
    const floors = building.floors;
    const currentFloor = this.state.currentFloor;
    if (this.state.direction === "UP" /* UP */) {
      for (let i = currentFloor - 1;i >= 0; i--) {
        if (floors[i].hasDownRequest()) {
          return floors[i].downRequest;
        }
      }
    } else if (this.state.direction === "DOWN" /* DOWN */) {
      for (let i = currentFloor + 1;i < floors.length; i++) {
        if (floors[i].hasUpRequest()) {
          return floors[i].upRequest;
        }
      }
    }
    return null;
  }
}

class Building {
  floors = [];
  elevators = [];
  buildingElement = null;
  constructor(numFloors, numElevators) {
    this.createFloors(numFloors);
    this.createElevators(numElevators);
  }
  createFloors(numFloors) {
    for (let i = 0;i < numFloors; i++) {
      const floor = new Floor(i);
      this.floors.push(floor);
    }
  }
  createElevators(numElevators) {
    for (let i = 0;i < numElevators; i++) {
      const elevator = new Elevator(i);
      this.elevators.push(elevator);
    }
  }
  render() {
    this.buildingElement = document.getElementById("building");
    if (!this.buildingElement)
      return;
    this.buildingElement.innerHTML = "";
    const floorHeight = 70;
    const totalHeight = this.floors.length * floorHeight + 20;
    const shaftContainer = document.createElement("div");
    shaftContainer.style.cssText = `
            position: relative;
            width: 80px;
            height: ${totalHeight}px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            margin: 0 10px;
        `;
    this.elevators.forEach((elevator) => {
      const elevatorElement = document.createElement("div");
      elevatorElement.className = "elevator elevator-idle";
      elevatorElement.style.cssText = `
                width: 70px;
                height: 60px;
                background: linear-gradient(145deg, #4ecca3, #3db892);
                border-radius: 8px;
                position: absolute;
                left: 5px;
                top: 10px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 3px;
                transition: top 0.5s ease;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
                z-index: 10;
            `;
      const elevatorNumber = document.createElement("span");
      elevatorNumber.className = "elevator-number";
      elevatorNumber.textContent = `E${elevator.id}`;
      const elevatorDestination = document.createElement("span");
      elevatorDestination.className = "elevator-destination";
      elevatorDestination.textContent = "";
      elevatorElement.appendChild(elevatorNumber);
      elevatorElement.appendChild(elevatorDestination);
      shaftContainer.appendChild(elevatorElement);
      elevator.element = elevatorElement;
      elevator.updatePosition();
    });
    this.floors.forEach((floor, index) => {
      const floorRow = document.createElement("div");
      floorRow.className = "floor-row";
      floorRow.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                position: relative;
            `;
      const floorNumber = document.createElement("div");
      floorNumber.className = "floor-number";
      floorNumber.textContent = String(floor.number);
      const floorButtons = document.createElement("div");
      floorButtons.className = "floor-buttons";
      if (index < this.floors.length - 1) {
        const upButton = document.createElement("button");
        upButton.className = "floor-btn";
        upButton.textContent = "↑";
        upButton.title = "Request elevator to go up";
        upButton.addEventListener("click", () => this.handleUpRequest(floor));
        floorButtons.appendChild(upButton);
        floor.upButton = upButton;
      }
      if (index > 0) {
        const downButton = document.createElement("button");
        downButton.className = "floor-btn";
        downButton.textContent = "↓";
        downButton.title = "Request elevator to go down";
        downButton.addEventListener("click", () => this.handleDownRequest(floor));
        floorButtons.appendChild(downButton);
        floor.downButton = downButton;
      }
      floorRow.appendChild(floorNumber);
      floorRow.appendChild(floorButtons);
      if (this.buildingElement) {
        this.buildingElement.appendChild(floorRow);
      }
    });
    if (this.buildingElement) {
      this.buildingElement.appendChild(shaftContainer);
    }
  }
  handleUpRequest(floor) {
    if (floor.hasUpRequest())
      return;
    floor.upRequest = {
      floor: floor.number,
      direction: "UP" /* UP */,
      timestamp: Date.now()
    };
    if (floor.upButton) {
      floor.upButton.classList.add("active");
    }
    this.dispatchElevator(floor.number, "UP" /* UP */);
  }
  handleDownRequest(floor) {
    if (floor.hasDownRequest())
      return;
    floor.downRequest = {
      floor: floor.number,
      direction: "DOWN" /* DOWN */,
      timestamp: Date.now()
    };
    if (floor.downButton) {
      floor.downButton.classList.add("active");
    }
    this.dispatchElevator(floor.number, "DOWN" /* DOWN */);
  }
  dispatchElevator(floor, direction) {
    const bestElevator = this.findBestElevator(floor, direction);
    if (bestElevator) {
      bestElevator.requestQueue.push({
        floor,
        direction,
        timestamp: Date.now()
      });
    }
  }
  findBestElevator(floor, direction) {
    const idleElevators = this.elevators.filter((e) => e.state.direction === "IDLE" /* IDLE */);
    if (idleElevators.length > 0) {
      idleElevators.sort((a, b) => {
        const distA = Math.abs(a.state.currentFloor - floor);
        const distB = Math.abs(b.state.currentFloor - floor);
        return distA - distB;
      });
      return idleElevators[0];
    }
    const elevatorsInDirection = this.elevators.filter((e) => e.state.direction === direction);
    if (elevatorsInDirection.length > 0) {
      elevatorsInDirection.sort((a, b) => {
        const distA = Math.abs(a.state.currentFloor - floor);
        const distB = Math.abs(b.state.currentFloor - floor);
        return distA - distB;
      });
      return elevatorsInDirection[0];
    }
    this.elevators.sort((a, b) => {
      const distA = Math.abs(a.state.currentFloor - floor);
      const distB = Math.abs(b.state.currentFloor - floor);
      return distA - distB;
    });
    return this.elevators[0];
  }
  startElevatorProcesses() {
    this.elevators.forEach((elevator) => {
      elevator.processRequests(this);
    });
  }
  reset() {
    this.floors.forEach((floor) => {
      floor.clearUpRequest();
      floor.clearDownRequest();
    });
    this.elevators.forEach((elevator) => {
      elevator.state = {
        currentFloor: 0,
        direction: "IDLE" /* IDLE */,
        destinationFloors: new Set,
        isMoving: false
      };
      elevator.requestQueue = [];
      elevator.updatePosition();
      elevator.setMoving(false);
      elevator.updateDestinationDisplay();
    });
  }
}

class ElevatorSimulator {
  building = null;
  constructor() {
    this.initialize();
  }
  initialize() {
    this.building = new Building(CONFIG.FLOORS, CONFIG.ELEVATORS);
    this.building.render();
    this.building.startElevatorProcesses();
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.reset());
    }
  }
  reset() {
    if (this.building) {
      this.building.reset();
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  new ElevatorSimulator;
});
