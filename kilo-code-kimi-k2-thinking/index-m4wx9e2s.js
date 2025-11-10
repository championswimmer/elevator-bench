// script.js
var config = {
  numberOfFloors: 10,
  numberOfElevators: 4,
  elevatorMoveDuration: 2000
};
var elevators = [];
var requestQueue = [];
function initializeElevatorSystem() {
  for (let i = 0;i < config.numberOfElevators; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloors: [],
      state: "idle",
      direction: null
    });
  }
  setupEventListeners();
  setInterval(processElevatorMovement, 100);
}
function setupEventListeners() {
  document.querySelectorAll(".btn-floor-up, .btn-floor-down").forEach((button) => {
    button.addEventListener("click", handleFloorButtonClick);
  });
  document.querySelectorAll(".btn-elevator-floor").forEach((button) => {
    button.addEventListener("click", handleElevatorFloorButtonClick);
  });
}
function handleFloorButtonClick(event) {
  const button = event.target;
  const floor = parseInt(button.getAttribute("data-floor") || "0");
  const direction = button.getAttribute("data-direction");
  button.disabled = true;
  assignFloorRequest(floor, direction);
}
function handleElevatorFloorButtonClick(event) {
  const button = event.target;
  const elevatorId = parseInt(button.getAttribute("data-elevator") || "0");
  const floor = parseInt(button.getAttribute("data-floor") || "0");
  const elevator = elevators[elevatorId];
  if (!elevator.targetFloors.includes(floor)) {
    elevator.targetFloors.push(floor);
    button.classList.add("targeted");
    if (elevator.state === "idle") {
      updateElevatorState(elevatorId, floor > elevator.currentFloor ? "movingUp" : "movingDown");
    }
  }
}
function assignFloorRequest(floor, direction) {
  const eligibleElevators = elevators.filter((elevator) => {
    return elevator.state === "idle" || elevator.direction === direction && (direction === "up" && elevator.currentFloor <= floor || direction === "down" && elevator.currentFloor >= floor);
  });
  if (eligibleElevators.length > 0) {
    const distances = eligibleElevators.map((elevator) => {
      return {
        elevator,
        distance: Math.abs(elevator.currentFloor - floor)
      };
    });
    const closestElevator = distances.reduce((min, current) => current.distance < min.distance ? current : min).elevator;
    if (!closestElevator.targetFloors.includes(floor)) {
      closestElevator.targetFloors.push(floor);
      if (closestElevator.state === "idle") {
        closestElevator.direction = direction;
        updateElevatorState(closestElevator.id, direction === "up" ? "movingUp" : "movingDown");
      }
      updateElevatorUI(closestElevator.id);
    }
  } else {
    requestQueue.push({ floor, direction });
  }
}
function processElevatorMovement() {
  elevators.forEach((elevator) => {
    if (elevator.state === "movingUp") {
      moveElevatorUp(elevator);
    } else if (elevator.state === "movingDown") {
      moveElevatorDown(elevator);
    } else if (elevator.state === "idle") {
      processRequestQueue(elevator.id);
    }
  });
}
function moveElevatorUp(elevator) {
  const targetsInDirection = elevator.targetFloors.filter((floor) => floor > elevator.currentFloor);
  if (targetsInDirection.length > 0) {
    setTimeout(() => {
      elevator.currentFloor++;
      updateElevatorPosition(elevator.id, elevator.currentFloor);
      if (elevator.targetFloors.includes(elevator.currentFloor)) {
        stopAtFloor(elevator, elevator.currentFloor);
      }
    }, config.elevatorMoveDuration / (config.numberOfFloors - 1));
  } else {
    const targetsInOppositeDirection = elevator.targetFloors.filter((floor) => floor < elevator.currentFloor);
    if (targetsInOppositeDirection.length > 0) {
      updateElevatorState(elevator.id, "movingDown");
      elevator.direction = "down";
    } else {
      updateElevatorState(elevator.id, "idle");
      elevator.direction = null;
    }
  }
}
function moveElevatorDown(elevator) {
  const targetsInDirection = elevator.targetFloors.filter((floor) => floor < elevator.currentFloor);
  if (targetsInDirection.length > 0) {
    setTimeout(() => {
      elevator.currentFloor--;
      updateElevatorPosition(elevator.id, elevator.currentFloor);
      if (elevator.targetFloors.includes(elevator.currentFloor)) {
        stopAtFloor(elevator, elevator.currentFloor);
      }
    }, config.elevatorMoveDuration / (config.numberOfFloors - 1));
  } else {
    const targetsInOppositeDirection = elevator.targetFloors.filter((floor) => floor > elevator.currentFloor);
    if (targetsInOppositeDirection.length > 0) {
      updateElevatorState(elevator.id, "movingUp");
      elevator.direction = "up";
    } else {
      updateElevatorState(elevator.id, "idle");
      elevator.direction = null;
    }
  }
}
function stopAtFloor(elevator, floor) {
  elevator.targetFloors = elevator.targetFloors.filter((f) => f !== floor);
  updateElevatorUI(elevator.id);
  const floorUpButton = document.querySelector(`.btn-floor-up[data-floor="${floor}"]`);
  const floorDownButton = document.querySelector(`.btn-floor-down[data-floor="${floor}"]`);
  if (floorUpButton)
    floorUpButton.disabled = false;
  if (floorDownButton)
    floorDownButton.disabled = false;
}
function processRequestQueue(elevatorId) {
  const elevator = elevators[elevatorId];
  if (requestQueue.length > 0 && elevator.state === "idle") {
    const request = requestQueue.shift();
    if (request) {
      if (!elevator.targetFloors.includes(request.floor)) {
        elevator.targetFloors.push(request.floor);
        elevator.direction = request.direction;
        updateElevatorState(elevatorId, request.direction === "up" ? "movingUp" : "movingDown");
        updateElevatorUI(elevatorId);
      }
    }
  }
}
function updateElevatorState(elevatorId, state) {
  elevators[elevatorId].state = state;
  updateElevatorUI(elevatorId);
}
function updateElevatorPosition(elevatorId, floor) {
  const elevatorElement = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`);
  if (elevatorElement) {
    const floorHeight = 80;
    const position = (config.numberOfFloors - 1 - floor) * floorHeight;
    elevatorElement.style.top = `${position}px`;
  }
}
function updateElevatorUI(elevatorId) {
  const elevator = elevators[elevatorId];
  updateElevatorPosition(elevatorId, elevator.currentFloor);
  const elevatorElement = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`);
  if (elevatorElement) {
    const floorDisplay = elevatorElement.querySelector(".elevator-floor");
    const stateDisplay = elevatorElement.querySelector(".elevator-state");
    if (floorDisplay)
      floorDisplay.textContent = `Floor: ${elevator.currentFloor}`;
    if (stateDisplay)
      stateDisplay.textContent = `State: ${elevator.state}`;
  }
  document.querySelectorAll(`.btn-elevator-floor[data-elevator="${elevatorId}"]`).forEach((button) => {
    const floor = parseInt(button.getAttribute("data-floor") || "0");
    if (elevator.targetFloors.includes(floor)) {
      button.classList.add("targeted");
    } else {
      button.classList.remove("targeted");
    }
  });
}
document.addEventListener("DOMContentLoaded", initializeElevatorSystem);
