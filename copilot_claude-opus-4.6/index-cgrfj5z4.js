// script.ts
var CONFIG = {
  numFloors: 10,
  numElevators: 4,
  floorHeight: 80,
  moveSpeed: 500
};

class Building {
  floors = [];
  elevators = [];
  requestQueue = [];
  constructor(numFloors, numElevators) {
    for (let i = 0;i < numFloors; i++) {
      this.floors.push(new Floor(i));
    }
    for (let i = 0;i < numElevators; i++) {
      this.elevators.push(new Elevator(i, numFloors));
    }
  }
  requestElevator(floor, direction) {
    const request = { floor, direction };
    this.processRequest(request);
  }
  processRequest(request) {
    const idleElevator = this.findBestIdleElevator(request.floor, request.direction);
    if (idleElevator) {
      idleElevator.addRequest(request.floor);
    } else {
      this.requestQueue.push(request);
    }
  }
  findBestIdleElevator(floor, direction) {
    const idleElevators = this.elevators.filter((e) => e.state === "idle" && e.requestQueue.length === 0);
    if (idleElevators.length === 0) {
      return null;
    }
    let bestElevator = null;
    let minDistance = Infinity;
    for (const elevator of idleElevators) {
      const distance = Math.abs(elevator.currentFloor - floor);
      const isMovingInDirection = direction === "up" ? elevator.currentFloor < floor : elevator.currentFloor > floor;
      if (isMovingInDirection && distance < minDistance) {
        bestElevator = elevator;
        minDistance = distance;
      }
    }
    if (!bestElevator) {
      bestElevator = idleElevators[0];
      for (const elevator of idleElevators) {
        const distance = Math.abs(elevator.currentFloor - floor);
        if (distance < minDistance) {
          bestElevator = elevator;
          minDistance = distance;
        }
      }
    }
    return bestElevator;
  }
  processQueuedRequests() {
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue[0];
      const idleElevator = this.findBestIdleElevator(request.floor, request.direction || "up");
      if (idleElevator) {
        idleElevator.addRequest(request.floor);
        this.requestQueue.shift();
      } else {
        break;
      }
    }
  }
}

class Elevator {
  id;
  currentFloor = 0;
  targetFloors = [];
  requestQueue = [];
  state = "idle";
  direction = "idle";
  numFloors;
  constructor(id, numFloors) {
    this.id = id;
    this.numFloors = numFloors;
  }
  addRequest(floor) {
    if (!this.requestQueue.includes(floor)) {
      this.requestQueue.push(floor);
    }
    if (this.state === "idle") {
      this.processQueue();
    }
  }
  processQueue() {
    if (this.requestQueue.length === 0) {
      this.state = "idle";
      this.direction = "idle";
      return;
    }
    this.requestQueue.sort((a, b) => a - b);
    if (this.direction === "up") {
      const nextUp = this.requestQueue.find((f) => f > this.currentFloor);
      if (nextUp !== undefined) {
        this.moveTo(nextUp);
        return;
      } else {
        this.direction = "down";
        const nextDown = this.requestQueue.find((f) => f < this.currentFloor);
        if (nextDown !== undefined) {
          this.moveTo(nextDown);
          return;
        }
      }
    }
    if (this.direction === "down") {
      const nextDown = this.requestQueue.find((f) => f < this.currentFloor);
      if (nextDown !== undefined) {
        this.moveTo(nextDown);
        return;
      } else {
        this.direction = "up";
        const nextUp = this.requestQueue.find((f) => f > this.currentFloor);
        if (nextUp !== undefined) {
          this.moveTo(nextUp);
          return;
        }
      }
    }
    if (this.direction === "idle") {
      const nextFloor = this.requestQueue[0];
      this.direction = nextFloor > this.currentFloor ? "up" : "down";
      this.moveTo(nextFloor);
    }
  }
  moveTo(floor) {
    this.state = "moving";
    this.targetFloors = [floor];
  }
  async moveToFloor(floor) {
    return new Promise((resolve) => {
      const moveStep = () => {
        if (this.currentFloor < floor) {
          this.currentFloor++;
          setTimeout(moveStep, CONFIG.moveSpeed);
        } else if (this.currentFloor > floor) {
          this.currentFloor--;
          setTimeout(moveStep, CONFIG.moveSpeed);
        } else {
          if (this.requestQueue.includes(floor)) {
            this.requestQueue = this.requestQueue.filter((f) => f !== floor);
          }
          if (this.requestQueue.length === 0) {
            this.state = "idle";
            this.direction = "idle";
          } else {
            this.processQueue();
          }
          resolve();
        }
      };
      moveStep();
    });
  }
}

class Floor {
  floorNumber;
  upButtonActive = false;
  downButtonActive = false;
  constructor(floorNumber) {
    this.floorNumber = floorNumber;
  }
}
var building;
function initializeUI() {
  building = new Building(CONFIG.numFloors, CONFIG.numElevators);
  renderFloors();
  renderElevators();
  startElevatorAnimation();
}
function renderFloors() {
  const floorsContainer = document.getElementById("floorsContainer");
  if (!floorsContainer)
    return;
  floorsContainer.innerHTML = "";
  for (let i = CONFIG.numFloors - 1;i >= 0; i--) {
    const floor = building.floors[i];
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    const floorNumberDiv = document.createElement("div");
    floorNumberDiv.className = "floor-number";
    floorNumberDiv.textContent = `F${floor.floorNumber}`;
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "floor-buttons";
    if (floor.floorNumber < CONFIG.numFloors - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-button";
      upButton.textContent = "↑";
      upButton.onclick = () => {
        floor.upButtonActive = true;
        upButton.classList.add("active");
        building.requestElevator(floor.floorNumber, "up");
      };
      buttonsDiv.appendChild(upButton);
    }
    if (floor.floorNumber > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-button";
      downButton.textContent = "↓";
      downButton.onclick = () => {
        floor.downButtonActive = true;
        downButton.classList.add("active");
        building.requestElevator(floor.floorNumber, "down");
      };
      buttonsDiv.appendChild(downButton);
    }
    floorDiv.appendChild(floorNumberDiv);
    floorDiv.appendChild(buttonsDiv);
    floorsContainer.appendChild(floorDiv);
  }
}
function renderElevators() {
  const elevatorsContainer = document.getElementById("elevatorsContainer");
  if (!elevatorsContainer)
    return;
  elevatorsContainer.innerHTML = "";
  for (const elevator of building.elevators) {
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${elevator.id}`;
    const headerDiv = document.createElement("div");
    headerDiv.className = "elevator-header";
    const idDiv = document.createElement("div");
    idDiv.className = "elevator-id";
    idDiv.textContent = `Elevator ${elevator.id}`;
    const statusDiv = document.createElement("div");
    statusDiv.className = "elevator-status";
    statusDiv.id = `status-${elevator.id}`;
    statusDiv.textContent = "Idle";
    headerDiv.appendChild(idDiv);
    headerDiv.appendChild(statusDiv);
    const displayDiv = document.createElement("div");
    displayDiv.className = "elevator-display";
    const floorDisplay = document.createElement("div");
    floorDisplay.className = "floor-display";
    floorDisplay.id = `floor-${elevator.id}`;
    floorDisplay.textContent = "0";
    const directionDisplay = document.createElement("div");
    directionDisplay.className = "direction-indicator";
    directionDisplay.id = `direction-${elevator.id}`;
    directionDisplay.textContent = "Idle";
    displayDiv.appendChild(floorDisplay);
    displayDiv.appendChild(directionDisplay);
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "elevator-buttons";
    for (let floor = 0;floor < CONFIG.numFloors; floor++) {
      const button = document.createElement("button");
      button.className = "elevator-button";
      button.textContent = floor.toString();
      button.id = `btn-${elevator.id}-${floor}`;
      button.onclick = () => {
        button.classList.add("active");
        elevator.addRequest(floor);
      };
      buttonsDiv.appendChild(button);
    }
    const queueDiv = document.createElement("div");
    queueDiv.className = "queue-info";
    queueDiv.id = `queue-${elevator.id}`;
    elevatorDiv.appendChild(headerDiv);
    elevatorDiv.appendChild(displayDiv);
    elevatorDiv.appendChild(buttonsDiv);
    elevatorDiv.appendChild(queueDiv);
    elevatorsContainer.appendChild(elevatorDiv);
  }
}
function updateElevatorDisplay() {
  for (const elevator of building.elevators) {
    const floorDisplay = document.getElementById(`floor-${elevator.id}`);
    if (floorDisplay) {
      floorDisplay.textContent = elevator.currentFloor.toString();
    }
    const statusDisplay = document.getElementById(`status-${elevator.id}`);
    if (statusDisplay) {
      statusDisplay.textContent = elevator.state.charAt(0).toUpperCase() + elevator.state.slice(1);
    }
    const directionDisplay = document.getElementById(`direction-${elevator.id}`);
    if (directionDisplay) {
      if (elevator.direction === "up")
        directionDisplay.textContent = "↑ Up";
      else if (elevator.direction === "down")
        directionDisplay.textContent = "↓ Down";
      else
        directionDisplay.textContent = "Idle";
    }
    const queueDisplay = document.getElementById(`queue-${elevator.id}`);
    if (queueDisplay) {
      if (elevator.requestQueue.length > 0) {
        queueDisplay.textContent = `Queue: ${elevator.requestQueue.sort((a, b) => a - b).join(", ")}`;
      } else {
        queueDisplay.textContent = "";
      }
    }
    for (let floor = 0;floor < CONFIG.numFloors; floor++) {
      const button = document.getElementById(`btn-${elevator.id}-${floor}`);
      if (button) {
        if (elevator.requestQueue.includes(floor) || elevator.currentFloor === floor) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      }
    }
  }
}
async function startElevatorAnimation() {
  while (true) {
    const promises = [];
    for (const elevator of building.elevators) {
      if (elevator.state === "idle" && elevator.requestQueue.length > 0) {
        elevator.processQueue();
      }
      if (elevator.state === "moving" && elevator.targetFloors.length > 0) {
        const targetFloor = elevator.targetFloors[0];
        promises.push(elevator.moveToFloor(targetFloor).then(() => {
          elevator.targetFloors.shift();
          if (elevator.requestQueue.length > 0) {
            elevator.processQueue();
          }
          updateElevatorDisplay();
          building.processQueuedRequests();
        }));
      }
    }
    updateElevatorDisplay();
    if (promises.length > 0) {
      await Promise.all(promises);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeUI);
} else {
  initializeUI();
}
