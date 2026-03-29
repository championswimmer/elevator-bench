// button.ts
class Button {
  element;
  isPressed;
  constructor(element) {
    this.element = element;
    this.isPressed = false;
  }
  press() {
    if (!this.isPressed) {
      this.isPressed = true;
      this.element.classList.add("pressed");
      this.element.setAttribute("aria-pressed", "true");
    }
  }
  reset() {
    if (this.isPressed) {
      this.isPressed = false;
      this.element.classList.remove("pressed");
      this.element.setAttribute("aria-pressed", "false");
    }
  }
}
var button_default = Button;

// floor.ts
class Floor {
  floorNumber;
  upButton;
  downButton;
  element;
  building;
  constructor(floorNumber, element, building) {
    this.floorNumber = floorNumber;
    this.element = element;
    this.building = building;
    console.log(`Initializing floor ${floorNumber}`);
    const upButtonElement = element.querySelector('.floor-button[data-direction="up"]');
    const downButtonElement = element.querySelector('.floor-button[data-direction="down"]');
    console.log(`Floor ${floorNumber} - upButtonElement:`, upButtonElement);
    console.log(`Floor ${floorNumber} - downButtonElement:`, downButtonElement);
    this.upButton = upButtonElement ? new button_default(upButtonElement) : null;
    this.downButton = downButtonElement ? new button_default(downButtonElement) : null;
    console.log(`Floor ${floorNumber} - upButton:`, this.upButton);
    console.log(`Floor ${floorNumber} - downButton:`, this.downButton);
    if (this.upButton) {
      this.upButton.element.addEventListener("click", () => {
        console.log(`Up button clicked on floor ${floorNumber}`);
        this.requestElevator("up");
      });
    }
    if (this.downButton) {
      this.downButton.element.addEventListener("click", () => {
        console.log(`Down button clicked on floor ${floorNumber}`);
        this.requestElevator("down");
      });
    }
  }
  requestElevator(direction) {
    if (direction === "up" && this.upButton) {
      this.upButton.press();
    } else if (direction === "down" && this.downButton) {
      this.downButton.press();
    }
    this.building.handleFloorRequest(this.floorNumber, direction);
  }
}
var floor_default = Floor;

// elevator.ts
class Elevator {
  id;
  currentFloor;
  direction;
  targetFloors;
  status;
  element;
  building;
  floorDisplay;
  directionDisplay;
  constructor(id, element, building) {
    this.id = id;
    this.currentFloor = 0;
    this.direction = "idle";
    this.targetFloors = [];
    this.status = "idle" /* IDLE */;
    this.element = element;
    this.building = building;
    console.log(`Initializing elevator ${id}`);
    this.floorDisplay = element.querySelector(".elevator-floor span");
    this.directionDisplay = element.querySelector(".elevator-direction span");
    this.updateDisplay();
  }
  moveToFloor(floor) {
    console.log(`Elevator ${this.id} moving to floor ${floor}`);
    if (floor === this.currentFloor) {
      return;
    }
    this.direction = floor > this.currentFloor ? "up" : "down";
    this.status = this.direction === "up" ? "moving up" /* MOVING_UP */ : "moving down" /* MOVING_DOWN */;
    this.updateDisplay();
    this.animateMovement(floor);
  }
  addTargetFloor(floor) {
    console.log(`Elevator ${this.id} adding target floor ${floor}`);
    console.log(`Elevator ${this.id} current targets:`, this.targetFloors);
    if (!this.targetFloors.includes(floor)) {
      this.targetFloors.push(floor);
      if (this.direction === "up") {
        this.targetFloors.sort((a, b) => a - b);
      } else if (this.direction === "down") {
        this.targetFloors.sort((a, b) => b - a);
      }
    }
    console.log(`Elevator ${this.id} updated targets:`, this.targetFloors);
    if (this.status === "idle" /* IDLE */) {
      this.processNextTarget();
    }
  }
  processNextTarget() {
    if (this.targetFloors.length > 0) {
      const nextFloor = this.targetFloors[0];
      this.moveToFloor(nextFloor);
    } else {
      this.direction = "idle";
      this.status = "idle" /* IDLE */;
      this.updateDisplay();
    }
  }
  isAvailable() {
    return this.status === "idle" /* IDLE */ || this.status === "moving up" /* MOVING_UP */ || this.status === "moving down" /* MOVING_DOWN */;
  }
  animateMovement(targetFloor) {
    const floorHeight = 60;
    const buildingHeight = floorHeight * this.building.numFloors;
    const targetPosition = buildingHeight - targetFloor * floorHeight - floorHeight;
    this.element.style.transition = `bottom 2s linear`;
    this.element.style.bottom = `${targetPosition}px`;
    setTimeout(() => {
      this.currentFloor = targetFloor;
      this.updateDisplay();
      const index = this.targetFloors.indexOf(targetFloor);
      if (index > -1) {
        this.targetFloors.splice(index, 1);
      }
      this.status = "door opening" /* DOOR_OPENING */;
      this.updateDisplay();
      setTimeout(() => {
        this.status = "door closing" /* DOOR_CLOSING */;
        this.updateDisplay();
        setTimeout(() => {
          this.processNextTarget();
        }, 1000);
      }, 1000);
    }, 2000);
  }
  updateDisplay() {
    if (this.floorDisplay) {
      this.floorDisplay.textContent = this.currentFloor.toString();
    }
    if (this.directionDisplay) {
      this.directionDisplay.textContent = this.status;
    }
    this.updateButtonStates();
  }
  updateButtonStates() {
    const controlPanel = document.querySelector(`#control-panel-${this.id} .button-grid`);
    if (controlPanel) {
      const buttons = controlPanel.querySelectorAll(".elevator-button");
      buttons.forEach((button) => {
        const floor = parseInt(button.getAttribute("data-floor") || "0");
        if (floor === this.currentFloor) {
          button.classList.add("pressed");
        } else {
          button.classList.remove("pressed");
        }
      });
    }
  }
}
var elevator_default = Elevator;

// requestQueue.ts
class RequestQueue {
  queue;
  building;
  constructor(building) {
    this.queue = [];
    this.building = building;
  }
  addRequest(request) {
    console.log(`Adding request to queue: floor ${request.floor}, direction ${request.direction}`);
    const exists = this.queue.some((r) => r.floor === request.floor && r.direction === request.direction);
    if (!exists) {
      this.queue.push(request);
      console.log(`Request added to queue. Queue length: ${this.queue.length}`);
      this.processRequests();
    } else {
      console.log(`Request already exists in queue, not adding duplicate`);
    }
  }
  processRequests() {
    console.log(`Processing requests. Queue length: ${this.queue.length}`);
    for (let i = this.queue.length - 1;i >= 0; i--) {
      const request = this.queue[i];
      console.log(`Processing request: floor ${request.floor}, direction ${request.direction}`);
      const elevator = this.findBestElevator(request);
      if (elevator) {
        console.log(`Assigning request to elevator ${elevator.id}`);
        elevator.addTargetFloor(request.floor);
        this.queue.splice(i, 1);
      } else {
        console.log(`No elevator available for request`);
      }
    }
    console.log(`Finished processing requests. Queue length: ${this.queue.length}`);
  }
  findBestElevator(request) {
    console.log(`Finding best elevator for request: floor ${request.floor}, direction ${request.direction}`);
    for (const elevator of this.building.elevators) {
      console.log(`Checking elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, direction=${elevator.direction}, status=${elevator.status}`);
      if (elevator.isAvailable() && elevator.currentFloor === request.floor) {
        console.log(`Found idle elevator ${elevator.id} on same floor ${request.floor}`);
        return elevator;
      }
    }
    for (const elevator of this.building.elevators) {
      if (elevator.direction === request.direction) {
        if (request.direction === "up" && elevator.currentFloor < request.floor) {
          console.log(`Found elevator ${elevator.id} traveling in same direction (up) and below floor`);
          return elevator;
        }
        if (request.direction === "down" && elevator.currentFloor > request.floor) {
          console.log(`Found elevator ${elevator.id} traveling in same direction (down) and above floor`);
          return elevator;
        }
      }
    }
    for (const elevator of this.building.elevators) {
      if (elevator.isAvailable()) {
        console.log(`Found available elevator ${elevator.id}`);
        return elevator;
      }
    }
    return null;
  }
}
var requestQueue_default = RequestQueue;

// request.ts
class ElevatorRequest {
  floor;
  direction;
  constructor(floor, direction) {
    this.floor = floor;
    this.direction = direction;
  }
}
var request_default = ElevatorRequest;

// building.ts
class Building {
  numFloors;
  numElevators;
  floors;
  elevators;
  requestQueue;
  constructor(numFloors = 10, numElevators = 4) {
    this.numFloors = numFloors;
    this.numElevators = numElevators;
    this.floors = [];
    this.elevators = [];
    this.requestQueue = new requestQueue_default(this);
    this.initialize();
  }
  initialize() {
    for (let i = 0;i < this.numFloors; i++) {
      const floorElement = document.getElementById(`floor-${i}`);
      if (floorElement) {
        console.log(`Initializing floor ${i}`);
        const floor = new floor_default(i, floorElement, this);
        this.floors.push(floor);
      } else {
        console.warn(`Floor element not found for floor ${i}`);
      }
    }
    for (let i = 0;i < this.numElevators; i++) {
      const elevatorElement = document.getElementById(`elevator-${i}`);
      if (elevatorElement) {
        console.log(`Initializing elevator ${i}`);
        const elevator = new elevator_default(i, elevatorElement, this);
        this.elevators.push(elevator);
      } else {
        console.warn(`Elevator element not found for elevator ${i}`);
      }
    }
    this.initializeControlPanels();
    this.updateStatusDisplay();
  }
  initializeControlPanels() {
    for (let i = 0;i < this.numElevators; i++) {
      const controlPanel = document.getElementById(`control-panel-${i}`);
      if (controlPanel) {
        const buttons = controlPanel.querySelectorAll(".elevator-button");
        buttons.forEach((button) => {
          button.addEventListener("click", () => {
            const floor = parseInt(button.getAttribute("data-floor") || "0");
            this.handleElevatorRequest(i, floor);
            button.classList.add("pressed");
            setTimeout(() => {
              button.classList.remove("pressed");
            }, 2000);
          });
        });
      }
    }
  }
  handleFloorRequest(floor, direction) {
    console.log(`Floor request: floor ${floor}, direction ${direction}`);
    const request = new request_default(floor, direction);
    this.requestQueue.addRequest(request);
    this.updateStatusDisplay();
  }
  handleElevatorRequest(elevatorId, floor) {
    console.log(`Elevator request: elevator ${elevatorId}, floor ${floor}`);
    const elevator = this.elevators[elevatorId];
    if (elevator) {
      elevator.addTargetFloor(floor);
    }
    this.updateStatusDisplay();
  }
  assignElevator(request) {
    const elevator = this.requestQueue.findBestElevator(request);
    if (elevator) {
      elevator.addTargetFloor(request.floor);
    } else {
      this.requestQueue.addRequest(request);
    }
  }
  updateElevatorPosition(elevatorId, floor) {
    const floorDisplay = document.getElementById(`elevator-${elevatorId}-floor`);
    if (floorDisplay) {
      floorDisplay.textContent = floor.toString();
    }
  }
  updateStatusDisplay() {
    const activeRequestsElement = document.getElementById("active-requests");
    if (activeRequestsElement) {
      activeRequestsElement.textContent = this.requestQueue.queue.length.toString();
    }
    const totalFloorsElement = document.getElementById("total-floors");
    if (totalFloorsElement) {
      totalFloorsElement.textContent = this.numFloors.toString();
    }
    const totalElevatorsElement = document.getElementById("total-elevators");
    if (totalElevatorsElement) {
      totalElevatorsElement.textContent = this.numElevators.toString();
    }
  }
}
var building_default = Building;

// script.ts
function initSimulator() {
  try {
    const building = new building_default(10, 4);
    console.log("Elevator Simulator initialized");
    console.log(`Building with ${building.numFloors} floors and ${building.numElevators} elevators`);
  } catch (error) {
    console.error("Error initializing elevator simulator:", error);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSimulator);
} else {
  initSimulator();
}
