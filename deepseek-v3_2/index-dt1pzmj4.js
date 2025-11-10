// script.ts
var TOTAL_FLOORS = 10;
var TOTAL_ELEVATORS = 4;
var GROUND_FLOOR = 0;
var TOP_FLOOR = TOTAL_FLOORS - 1;
var MOVE_DELAY = 1000;
var elevators = [];
var floorRequests = [];
var animationInterval = null;
function initializeSimulator() {
  createElevators();
  createFloors();
  createElevatorControls();
  startAnimation();
  addStatusMessage("Simulator started. All elevators are idle at ground floor.");
}
function createElevators() {
  elevators = Array.from({ length: TOTAL_ELEVATORS }, (_, i) => ({
    id: i,
    currentFloor: GROUND_FLOOR,
    targetFloors: [],
    direction: "idle",
    status: "idle",
    floorRequests: new Set
  }));
}
function createFloors() {
  const floorsList = document.getElementById("floors-list");
  floorsList.innerHTML = "";
  for (let floor = TOP_FLOOR;floor >= 0; floor--) {
    const floorItem = document.createElement("div");
    floorItem.className = "floor-item";
    floorItem.innerHTML = `
            <div class="floor-label">Floor ${floor}</div>
            <div class="floor-buttons">
                ${floor < TOP_FLOOR ? `<button class="btn btn-up" data-floor="${floor}" data-direction="up">↑</button>` : ""}
                ${floor > GROUND_FLOOR ? `<button class="btn btn-down" data-floor="${floor}" data-direction="down">↓</button>` : ""}
            </div>
        `;
    floorsList.appendChild(floorItem);
  }
  document.querySelectorAll(".btn-up, .btn-down").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const floor = parseInt(target.dataset.floor);
      const direction = target.dataset.direction;
      requestElevator(floor, direction);
    });
  });
}
function createElevatorControls() {
  const elevatorsList = document.getElementById("elevators-list");
  elevatorsList.innerHTML = "";
  elevators.forEach((elevator) => {
    const elevatorItem = document.createElement("div");
    elevatorItem.className = "elevator-item idle";
    elevatorItem.id = `elevator-${elevator.id}`;
    let floorButtons = "";
    for (let floor = 0;floor < TOTAL_FLOORS; floor++) {
      floorButtons += `<button class="btn btn-floor" data-elevator="${elevator.id}" data-floor="${floor}">${floor}</button>`;
    }
    elevatorItem.innerHTML = `
            <div class="elevator-header">
                <div class="elevator-label">Elevator ${elevator.id}</div>
                <div class="elevator-status status-idle">IDLE</div>
            </div>
            <div class="elevator-position">${elevator.currentFloor}</div>
            <div class="elevator-controls">
                ${floorButtons}
            </div>
        `;
    elevatorsList.appendChild(elevatorItem);
  });
  document.querySelectorAll(".btn-floor").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const elevatorId = parseInt(target.dataset.elevator);
      const floor = parseInt(target.dataset.floor);
      requestFloor(elevatorId, floor);
    });
  });
}
function requestElevator(floor, direction) {
  const existingRequest = floorRequests.find((req) => req.floor === floor && req.direction === direction);
  if (existingRequest) {
    addStatusMessage(`Floor ${floor} ${direction.toUpperCase()} request already pending`);
    return;
  }
  const request = {
    floor,
    direction,
    timestamp: Date.now()
  };
  floorRequests.push(request);
  addStatusMessage(`Floor ${floor} requested elevator going ${direction.toUpperCase()}`);
  assignElevatorToRequest(request);
}
function requestFloor(elevatorId, floor) {
  const elevator = elevators[elevatorId];
  if (elevator.floorRequests.has(floor)) {
    addStatusMessage(`Elevator ${elevatorId}: Floor ${floor} already requested`);
    return;
  }
  elevator.floorRequests.add(floor);
  if (!elevator.targetFloors.includes(floor)) {
    elevator.targetFloors.push(floor);
    sortTargetFloors(elevator);
  }
  addStatusMessage(`Elevator ${elevatorId}: Floor ${floor} requested`);
  updateElevatorDisplay(elevatorId);
}
function assignElevatorToRequest(request) {
  const { floor, direction } = request;
  const bestElevator = findBestElevatorForRequest(request);
  if (bestElevator) {
    floorRequests = floorRequests.filter((req) => !(req.floor === floor && req.direction === direction));
    bestElevator.floorRequests.add(floor);
    if (!bestElevator.targetFloors.includes(floor)) {
      bestElevator.targetFloors.push(floor);
      sortTargetFloors(bestElevator);
    }
    addStatusMessage(`Elevator ${bestElevator.id} assigned to floor ${floor} ${direction.toUpperCase()} request`);
    updateElevatorDisplay(bestElevator.id);
  }
}
function findBestElevatorForRequest(request) {
  const { floor, direction } = request;
  let bestElevator = null;
  let bestScore = Infinity;
  for (const elevator of elevators) {
    const score = calculateElevatorScore(elevator, request);
    if (score < bestScore) {
      bestScore = score;
      bestElevator = elevator;
    }
  }
  return bestElevator;
}
function calculateElevatorScore(elevator, request) {
  const { floor, direction } = request;
  if (elevator.status === "idle") {
    return Math.abs(elevator.currentFloor - floor);
  }
  if (elevator.direction === direction) {
    if (direction === "up" && elevator.currentFloor <= floor) {
      return floor - elevator.currentFloor;
    }
    if (direction === "down" && elevator.currentFloor >= floor) {
      return elevator.currentFloor - floor;
    }
  }
  let remainingDistance = 0;
  if (elevator.direction === "up") {
    const highestTarget = Math.max(...elevator.targetFloors);
    remainingDistance = highestTarget - elevator.currentFloor;
  } else if (elevator.direction === "down") {
    const lowestTarget = Math.min(...elevator.targetFloors);
    remainingDistance = elevator.currentFloor - lowestTarget;
  }
  return remainingDistance + Math.abs(elevator.currentFloor - floor);
}
function sortTargetFloors(elevator) {
  if (elevator.direction === "up") {
    elevator.targetFloors.sort((a, b) => a - b);
  } else if (elevator.direction === "down") {
    elevator.targetFloors.sort((a, b) => b - a);
  }
}
function updateElevatorMovement() {
  elevators.forEach((elevator) => {
    if (elevator.targetFloors.length === 0) {
      if (elevator.status !== "idle") {
        elevator.status = "idle";
        elevator.direction = "idle";
        addStatusMessage(`Elevator ${elevator.id} is now idle at floor ${elevator.currentFloor}`);
        updateElevatorDisplay(elevator.id);
      }
      return;
    }
    const nextFloor = elevator.targetFloors[0];
    if (nextFloor > elevator.currentFloor) {
      elevator.direction = "up";
      elevator.status = "moving";
    } else if (nextFloor < elevator.currentFloor) {
      elevator.direction = "down";
      elevator.status = "moving";
    } else {
      elevator.targetFloors.shift();
      elevator.floorRequests.delete(elevator.currentFloor);
      elevator.status = "stopped";
      addStatusMessage(`Elevator ${elevator.id} arrived at floor ${elevator.currentFloor}`);
      updateElevatorDisplay(elevator.id);
      setTimeout(() => {
        elevator.status = "moving";
        updateElevatorDisplay(elevator.id);
      }, 1000);
      return;
    }
    if (elevator.direction === "up") {
      elevator.currentFloor++;
    } else if (elevator.direction === "down") {
      elevator.currentFloor--;
    }
    updateElevatorDisplay(elevator.id);
  });
  processPendingRequests();
}
function processPendingRequests() {
  const unassignedRequests = [...floorRequests];
  for (const request of unassignedRequests) {
    assignElevatorToRequest(request);
  }
}
function updateElevatorDisplay(elevatorId) {
  const elevator = elevators[elevatorId];
  const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
  const positionElement = elevatorElement.querySelector(".elevator-position");
  const statusElement = elevatorElement.querySelector(".elevator-status");
  positionElement.classList.add("elevator-moving");
  setTimeout(() => {
    positionElement.textContent = elevator.currentFloor.toString();
    positionElement.classList.remove("elevator-moving");
  }, 250);
  elevatorElement.className = `elevator-item ${elevator.status}`;
  statusElement.textContent = elevator.status.toUpperCase();
  statusElement.className = `elevator-status status-${elevator.status}`;
  if (elevator.status === "moving") {
    statusElement.textContent = `${elevator.direction.toUpperCase()}`;
  }
  elevatorElement.querySelectorAll(".btn-floor").forEach((button) => {
    const floor = parseInt(button.dataset.floor);
    if (elevator.floorRequests.has(floor)) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}
function addStatusMessage(message) {
  const statusContainer = document.getElementById("status-container");
  const messageElement = document.createElement("div");
  messageElement.className = "status-message new";
  messageElement.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  statusContainer.appendChild(messageElement);
  statusContainer.scrollTop = statusContainer.scrollHeight;
  setTimeout(() => {
    messageElement.classList.remove("new");
  }, 1000);
}
function startAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
  }
  animationInterval = setInterval(updateElevatorMovement, MOVE_DELAY);
}
document.addEventListener("DOMContentLoaded", initializeSimulator);
