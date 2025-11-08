// script.ts
var CONFIG = {
  FLOORS: 10,
  ELEVATORS: 4,
  MOVE_TIME: 1000,
  DOOR_TIME: 500
};
var elevators = [];
var pendingRequests = [];
var isSimulationRunning = false;
var floorsContainer;
var elevatorsContainer;
var statusLog;
function init() {
  floorsContainer = document.getElementById("floors-container");
  elevatorsContainer = document.getElementById("elevators-container");
  statusLog = document.getElementById("status-log");
  for (let i = 0;i < CONFIG.ELEVATORS; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloor: 0,
      direction: "idle",
      status: "idle",
      requests: [],
      isMoving: false
    });
  }
  createFloorsUI();
  createElevatorsUI();
  document.getElementById("reset-btn").addEventListener("click", resetSimulation);
  document.getElementById("add-request-btn").addEventListener("click", addRandomRequest);
  isSimulationRunning = true;
  logStatus("Simulation started");
  setInterval(simulate, 100);
}
function createFloorsUI() {
  floorsContainer.innerHTML = "";
  for (let floor = CONFIG.FLOORS - 1;floor >= 0; floor--) {
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${floor}`;
    const floorInfo = document.createElement("div");
    floorInfo.className = "floor-info";
    const floorNumber = document.createElement("div");
    floorNumber.className = "floor-number";
    floorNumber.textContent = `Floor ${floor}`;
    const floorButtons = document.createElement("div");
    floorButtons.className = "floor-buttons";
    if (floor < CONFIG.FLOORS - 1) {
      const upBtn = document.createElement("button");
      upBtn.className = "floor-btn up";
      upBtn.textContent = "↑ UP";
      upBtn.addEventListener("click", () => requestElevator(floor, "up"));
      floorButtons.appendChild(upBtn);
    }
    if (floor > 0) {
      const downBtn = document.createElement("button");
      downBtn.className = "floor-btn down";
      downBtn.textContent = "↓ DOWN";
      downBtn.addEventListener("click", () => requestElevator(floor, "down"));
      floorButtons.appendChild(downBtn);
    }
    floorInfo.appendChild(floorNumber);
    floorInfo.appendChild(floorButtons);
    floorDiv.appendChild(floorInfo);
    floorsContainer.appendChild(floorDiv);
  }
}
function createElevatorsUI() {
  elevatorsContainer.innerHTML = "";
  elevators.forEach((elevator, index) => {
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${index}`;
    const header = document.createElement("div");
    header.className = "elevator-header";
    header.textContent = `Elevator ${index}`;
    const display = document.createElement("div");
    display.className = "elevator-display";
    const floorDisplay = document.createElement("div");
    floorDisplay.className = "elevator-floor";
    floorDisplay.id = `elevator-${index}-floor`;
    floorDisplay.textContent = elevator.currentFloor.toString();
    const directionDisplay = document.createElement("div");
    directionDisplay.className = "elevator-direction";
    directionDisplay.id = `elevator-${index}-direction`;
    directionDisplay.textContent = "●";
    display.appendChild(floorDisplay);
    display.appendChild(directionDisplay);
    const buttons = document.createElement("div");
    buttons.className = "elevator-buttons";
    for (let floor = 0;floor < CONFIG.FLOORS; floor++) {
      const btn = document.createElement("button");
      btn.className = "elevator-btn";
      btn.textContent = floor.toString();
      btn.addEventListener("click", () => selectFloor(index, floor));
      buttons.appendChild(btn);
    }
    elevatorDiv.appendChild(header);
    elevatorDiv.appendChild(display);
    elevatorDiv.appendChild(buttons);
    elevatorsContainer.appendChild(elevatorDiv);
  });
}
function requestElevator(floor, direction) {
  const request = {
    floor,
    direction,
    timestamp: Date.now()
  };
  pendingRequests.push(request);
  logStatus(`Request: Floor ${floor} going ${direction}`);
  const btn = document.querySelector(`#floor-${floor} .floor-btn.${direction}`);
  if (btn) {
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 200);
  }
}
function selectFloor(elevatorId, floor) {
  const elevator = elevators[elevatorId];
  if (elevator.requests.includes(floor)) {
    return;
  }
  elevator.requests.push(floor);
  logStatus(`Elevator ${elevatorId}: Floor ${floor} selected`);
  const btn = document.querySelector(`#elevator-${elevatorId} .elevator-btn:nth-child(${floor + 1})`);
  if (btn) {
    btn.classList.add("active", "pressed");
    setTimeout(() => btn.classList.remove("pressed"), 200);
  }
}
function findBestElevator(request) {
  let bestElevator = null;
  let bestScore = Infinity;
  elevators.forEach((elevator, index) => {
    if (elevator.status === "idle") {
      const distance = Math.abs(elevator.currentFloor - request.floor);
      if (distance < bestScore) {
        bestScore = distance;
        bestElevator = index;
      }
    } else if (elevator.direction === request.direction) {
      if (request.direction === "up" && elevator.currentFloor <= request.floor) {
        const distance = request.floor - elevator.currentFloor;
        if (distance < bestScore) {
          bestScore = distance;
          bestElevator = index;
        }
      } else if (request.direction === "down" && elevator.currentFloor >= request.floor) {
        const distance = elevator.currentFloor - request.floor;
        if (distance < bestScore) {
          bestScore = distance;
          bestElevator = index;
        }
      }
    }
  });
  return bestElevator;
}
function assignRequests() {
  const unassignedRequests = [];
  pendingRequests.forEach((request) => {
    const bestElevator = findBestElevator(request);
    if (bestElevator !== null) {
      const elevator = elevators[bestElevator];
      if (!elevator.requests.includes(request.floor)) {
        elevator.requests.push(request.floor);
        logStatus(`Assigned floor ${request.floor} to elevator ${bestElevator}`);
      }
    } else {
      unassignedRequests.push(request);
    }
  });
  pendingRequests = unassignedRequests;
}
function moveElevator(elevatorId) {
  const elevator = elevators[elevatorId];
  if (elevator.requests.length === 0) {
    elevator.status = "idle";
    elevator.direction = "idle";
    elevator.isMoving = false;
    return;
  }
  if (elevator.direction === "idle") {
    let closestFloor = elevator.requests[0];
    let minDistance = Math.abs(elevator.currentFloor - closestFloor);
    elevator.requests.forEach((floor) => {
      const distance = Math.abs(elevator.currentFloor - floor);
      if (distance < minDistance) {
        minDistance = distance;
        closestFloor = floor;
      }
    });
    elevator.targetFloor = closestFloor;
    elevator.direction = elevator.currentFloor < closestFloor ? "up" : "down";
  }
  if (elevator.currentFloor !== elevator.targetFloor) {
    elevator.status = "moving";
    elevator.isMoving = true;
    if (elevator.currentFloor < elevator.targetFloor) {
      elevator.currentFloor++;
      elevator.direction = "up";
    } else {
      elevator.currentFloor--;
      elevator.direction = "down";
    }
    logStatus(`Elevator ${elevatorId}: Moving to floor ${elevator.currentFloor}`);
    elevator.requests = elevator.requests.filter((floor) => floor !== elevator.currentFloor);
  } else {
    elevator.status = "stopped";
    elevator.isMoving = false;
    logStatus(`Elevator ${elevatorId}: Arrived at floor ${elevator.currentFloor}`);
    elevator.requests = elevator.requests.filter((floor) => floor !== elevator.currentFloor);
  }
}
function updateElevatorUI(elevatorId) {
  const elevator = elevators[elevatorId];
  const floorDisplay = document.getElementById(`elevator-${elevatorId}-floor`);
  if (floorDisplay) {
    floorDisplay.textContent = elevator.currentFloor.toString();
  }
  const directionDisplay = document.getElementById(`elevator-${elevatorId}-direction`);
  if (directionDisplay) {
    let directionSymbol = "●";
    if (elevator.direction === "up")
      directionSymbol = "↑";
    else if (elevator.direction === "down")
      directionSymbol = "↓";
    directionDisplay.textContent = directionSymbol;
  }
  const elevatorDiv = document.getElementById(`elevator-${elevatorId}`);
  if (elevatorDiv) {
    if (elevator.isMoving) {
      elevatorDiv.classList.add("moving");
    } else {
      elevatorDiv.classList.remove("moving");
    }
  }
  const buttons = document.querySelectorAll(`#elevator-${elevatorId} .elevator-btn`);
  buttons.forEach((btn, index) => {
    if (elevator.requests.includes(index)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}
function simulate() {
  if (!isSimulationRunning)
    return;
  assignRequests();
  elevators.forEach((elevator, index) => {
    moveElevator(index);
    updateElevatorUI(index);
  });
}
function addRandomRequest() {
  const floor = Math.floor(Math.random() * CONFIG.FLOORS);
  const direction = Math.random() > 0.5 ? "up" : "down";
  requestElevator(floor, direction);
}
function resetSimulation() {
  elevators.forEach((elevator, index) => {
    elevator.currentFloor = 0;
    elevator.targetFloor = 0;
    elevator.direction = "idle";
    elevator.status = "idle";
    elevator.requests = [];
    elevator.isMoving = false;
    updateElevatorUI(index);
  });
  pendingRequests = [];
  logStatus("Simulation reset");
}
function logStatus(message) {
  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "status-entry";
  entry.textContent = `[${timestamp}] ${message}`;
  statusLog.appendChild(entry);
  statusLog.scrollTop = statusLog.scrollHeight;
  while (statusLog.children.length > 50) {
    statusLog.removeChild(statusLog.firstChild);
  }
}
document.addEventListener("DOMContentLoaded", init);
