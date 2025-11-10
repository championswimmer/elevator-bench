// script.ts
var FLOORS_IN_BUILDING = 10;
var NUMBER_OF_ELEVATORS = 4;
var ANIMATION_SPEED = 500;
var elevators = [];
var floorRequests = new Map;
var isPaused = false;
var statusLog = [];
function initializeSimulation() {
  elevators = [];
  for (let i = 0;i < NUMBER_OF_ELEVATORS; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloor: 0,
      direction: "idle",
      status: "idle",
      requests: new Set,
      isMoving: false
    });
  }
  floorRequests.clear();
  for (let i = 0;i < FLOORS_IN_BUILDING; i++) {
    floorRequests.set(i, []);
  }
  createFloorsUI();
  createElevatorButtons();
  updateDisplay();
  addStatusLog("Simulation initialized. All elevators at ground floor.", "movement");
}
function createFloorsUI() {
  const floorsContainer = document.getElementById("floors-container");
  if (!floorsContainer)
    return;
  floorsContainer.innerHTML = "";
  for (let floor = FLOORS_IN_BUILDING - 1;floor >= 0; floor--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${floor}`;
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = floor.toString();
    const floorButtons = document.createElement("div");
    floorButtons.className = "floor-buttons";
    if (floor < FLOORS_IN_BUILDING - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-btn up";
      upButton.textContent = "↑";
      upButton.onclick = () => requestElevator(floor, "up");
      floorButtons.appendChild(upButton);
    }
    if (floor > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-btn down";
      downButton.textContent = "↓";
      downButton.onclick = () => requestElevator(floor, "down");
      floorButtons.appendChild(downButton);
    }
    floorDiv.appendChild(floorNumber);
    floorDiv.appendChild(floorButtons);
    floorsContainer.appendChild(floorDiv);
  }
}
function createElevatorButtons() {
  for (let elevatorId = 0;elevatorId < NUMBER_OF_ELEVATORS; elevatorId++) {
    const floorButtonsContainer = document.getElementById(`floor-buttons-${elevatorId}`);
    if (!floorButtonsContainer)
      continue;
    floorButtonsContainer.innerHTML = "";
    for (let floor = 0;floor < FLOORS_IN_BUILDING; floor++) {
      const button = document.createElement("button");
      button.className = "elevator-floor-btn";
      button.textContent = floor.toString();
      button.onclick = () => requestFloor(elevatorId, floor);
      floorButtonsContainer.appendChild(button);
    }
  }
}
function requestElevator(floor, direction) {
  if (isPaused)
    return;
  const requests = floorRequests.get(floor) || [];
  if (!requests.includes(direction)) {
    requests.push(direction);
    floorRequests.set(floor, requests);
    updateFloorButton(floor, direction, true);
    addStatusLog(`Floor ${floor}: ${direction} button pressed`, "request");
    assignElevatorToRequest(floor, direction);
  }
}
function requestFloor(elevatorId, floor) {
  if (isPaused)
    return;
  const elevator = elevators[elevatorId];
  if (elevator.status === "idle") {
    moveElevatorToFloor(elevatorId, floor);
  } else {
    elevator.requests.add(floor);
    updateElevatorButton(elevatorId, floor, true);
    addStatusLog(`Elevator ${elevatorId}: Floor ${floor} requested`, "request");
  }
}
function assignElevatorToRequest(floor, direction) {
  const availableElevator = findBestElevator(floor, direction);
  if (availableElevator !== -1) {
    moveElevatorToFloor(availableElevator, floor);
  } else {
    addStatusLog(`No available elevators for floor ${floor} ${direction} request. Queued.`, "request");
  }
}
function findBestElevator(requestFloor2, direction) {
  let bestElevator = -1;
  let minDistance = Infinity;
  for (let i = 0;i < NUMBER_OF_ELEVATORS; i++) {
    const elevator = elevators[i];
    if (elevator.direction !== "idle" && elevator.direction !== direction) {
      continue;
    }
    let distance = Math.abs(elevator.currentFloor - requestFloor2);
    if (elevator.direction === direction) {
      if (direction === "up" && elevator.currentFloor > requestFloor2) {
        continue;
      }
      if (direction === "down" && elevator.currentFloor < requestFloor2) {
        continue;
      }
    }
    if (elevator.direction === "idle") {
      distance *= 0.8;
    }
    if (distance < minDistance) {
      minDistance = distance;
      bestElevator = i;
    }
  }
  return bestElevator;
}
function moveElevatorToFloor(elevatorId, targetFloor) {
  const elevator = elevators[elevatorId];
  if (elevator.currentFloor === targetFloor) {
    handleElevatorArrival(elevatorId);
    return;
  }
  elevator.targetFloor = targetFloor;
  elevator.direction = elevator.currentFloor < targetFloor ? "up" : "down";
  elevator.status = "moving";
  elevator.isMoving = true;
  addStatusLog(`Elevator ${elevatorId}: Moving ${elevator.direction} to floor ${targetFloor}`, "movement");
  animateElevatorMovement(elevatorId);
}
function animateElevatorMovement(elevatorId) {
  const elevator = elevators[elevatorId];
  const elevatorElement = document.getElementById(`elevator-${elevatorId}`);
  const floorIndicator = document.getElementById(`floor-indicator-${elevatorId}`);
  const directionIndicator = document.getElementById(`direction-indicator-${elevatorId}`);
  if (!elevatorElement || !floorIndicator || !directionIndicator)
    return;
  directionIndicator.className = `direction-indicator ${elevator.direction}`;
  const startFloor = elevator.currentFloor;
  const targetFloor = elevator.targetFloor;
  const distance = Math.abs(targetFloor - startFloor);
  const direction = targetFloor > startFloor ? 1 : -1;
  let currentFloor = startFloor;
  let step = 0;
  const moveStep = () => {
    if (isPaused) {
      setTimeout(moveStep, 100);
      return;
    }
    if (step < distance) {
      currentFloor += direction;
      elevator.currentFloor = currentFloor;
      const bottomPosition = currentFloor * 60;
      elevatorElement.style.bottom = `${bottomPosition}px`;
      floorIndicator.textContent = currentFloor.toString();
      step++;
      setTimeout(moveStep, ANIMATION_SPEED);
    } else {
      handleElevatorArrival(elevatorId);
    }
  };
  moveStep();
}
function handleElevatorArrival(elevatorId) {
  const elevator = elevators[elevatorId];
  const currentFloor = elevator.currentFloor;
  elevator.isMoving = false;
  elevator.status = "stopped";
  addStatusLog(`Elevator ${elevatorId}: Arrived at floor ${currentFloor}`, "arrival");
  const floorRequestsList = floorRequests.get(currentFloor) || [];
  const relevantRequests = floorRequestsList.filter((dir) => dir === "up" && elevator.direction === "up" || dir === "down" && elevator.direction === "down" || elevator.direction === "idle");
  if (relevantRequests.length > 0) {
    const remainingRequests = floorRequestsList.filter((dir) => !relevantRequests.includes(dir));
    floorRequests.set(currentFloor, remainingRequests);
    relevantRequests.forEach((dir) => updateFloorButton(currentFloor, dir, false));
  }
  elevator.requests.add(currentFloor);
  setTimeout(() => {
    processElevatorRequests(elevatorId);
  }, 1000);
}
function processElevatorRequests(elevatorId) {
  const elevator = elevators[elevatorId];
  if (elevator.requests.size === 0) {
    elevator.direction = "idle";
    elevator.status = "idle";
    updateDisplay();
    checkPendingRequests();
    return;
  }
  const currentFloor = elevator.currentFloor;
  const requests = Array.from(elevator.requests);
  let nextFloor = -1;
  if (elevator.direction === "up") {
    const upRequests = requests.filter((f) => f > currentFloor);
    nextFloor = upRequests.length > 0 ? Math.min(...upRequests) : -1;
    if (nextFloor === -1) {
      const downRequests = requests.filter((f) => f < currentFloor);
      nextFloor = downRequests.length > 0 ? Math.max(...downRequests) : -1;
      elevator.direction = nextFloor !== -1 ? "down" : "idle";
    }
  } else if (elevator.direction === "down") {
    const downRequests = requests.filter((f) => f < currentFloor);
    nextFloor = downRequests.length > 0 ? Math.max(...downRequests) : -1;
    if (nextFloor === -1) {
      const upRequests = requests.filter((f) => f > currentFloor);
      nextFloor = upRequests.length > 0 ? Math.min(...upRequests) : -1;
      elevator.direction = nextFloor !== -1 ? "up" : "idle";
    }
  } else {
    nextFloor = requests.reduce((closest, floor) => {
      const currentDistance = Math.abs(floor - currentFloor);
      const closestDistance = Math.abs(closest - currentFloor);
      return currentDistance < closestDistance ? floor : closest;
    }, requests[0]);
    elevator.direction = nextFloor > currentFloor ? "up" : "down";
  }
  if (nextFloor !== -1) {
    elevator.requests.delete(currentFloor);
    updateElevatorButton(elevatorId, currentFloor, false);
    moveElevatorToFloor(elevatorId, nextFloor);
  } else {
    elevator.direction = "idle";
    elevator.status = "idle";
    updateDisplay();
    checkPendingRequests();
  }
}
function checkPendingRequests() {
  for (let [floor, directions] of floorRequests) {
    if (directions.length > 0) {
      directions.forEach((direction) => {
        assignElevatorToRequest(floor, direction);
      });
    }
  }
}
function updateFloorButton(floor, direction, active) {
  const floorDiv = document.getElementById(`floor-${floor}`);
  if (!floorDiv)
    return;
  const button = floorDiv.querySelector(`.floor-btn.${direction}`);
  if (button) {
    if (active) {
      button.classList.add("active");
      button.disabled = true;
    } else {
      button.classList.remove("active");
      button.disabled = false;
    }
  }
}
function updateElevatorButton(elevatorId, floor, active) {
  const floorButtonsContainer = document.getElementById(`floor-buttons-${elevatorId}`);
  if (!floorButtonsContainer)
    return;
  const buttons = floorButtonsContainer.querySelectorAll(".elevator-floor-btn");
  const button = buttons[floor];
  if (button) {
    if (active) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}
function updateDisplay() {
  elevators.forEach((elevator, index) => {
    const floorIndicator = document.getElementById(`floor-indicator-${index}`);
    const directionIndicator = document.getElementById(`direction-indicator-${index}`);
    if (floorIndicator) {
      floorIndicator.textContent = elevator.currentFloor.toString();
    }
    if (directionIndicator) {
      if (elevator.direction === "idle") {
        directionIndicator.className = "direction-indicator";
      } else {
        directionIndicator.className = `direction-indicator ${elevator.direction}`;
      }
    }
  });
}
function addStatusLog(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${message}`;
  statusLog.push(logEntry);
  if (statusLog.length > 50) {
    statusLog = statusLog.slice(-50);
  }
  updateStatusDisplay();
}
function updateStatusDisplay() {
  const statusLogElement = document.getElementById("status-log");
  if (!statusLogElement)
    return;
  statusLogElement.innerHTML = statusLog.map((entry) => {
    const type = entry.includes("request") ? "request" : entry.includes("movement") ? "movement" : entry.includes("arrival") ? "arrival" : entry.includes("error") ? "error" : "info";
    return `<div class="status-entry ${type}">${entry}</div>`;
  }).join(`
`);
  statusLogElement.scrollTop = statusLogElement.scrollHeight;
}
function resetSimulation() {
  isPaused = false;
  initializeSimulation();
  addStatusLog("Simulation reset.", "movement");
}
function togglePause() {
  isPaused = !isPaused;
  addStatusLog(isPaused ? "Simulation paused." : "Simulation resumed.", "info");
}
document.addEventListener("DOMContentLoaded", () => {
  initializeSimulation();
  const resetBtn = document.getElementById("reset-btn");
  const pauseBtn = document.getElementById("pause-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetSimulation);
  }
  if (pauseBtn) {
    pauseBtn.addEventListener("click", togglePause);
  }
});
