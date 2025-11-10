// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var FLOOR_HEIGHT = 30;
var MOVEMENT_SPEED = 1000;
var elevators = [];
var floorRequests = [];
var requestQueue = [];
function initializeElevators() {
  elevators = [];
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloor: null,
      status: "idle",
      direction: null,
      queue: [],
      isMoving: false
    });
  }
}
function getElevatorPosition(floor) {
  return (NUM_FLOORS - 1 - floor) * FLOOR_HEIGHT;
}
function updateElevatorPosition(elevatorId, targetFloor) {
  return new Promise((resolve) => {
    const elevatorCar = document.querySelector(`.elevator-car[data-elevator="${elevatorId}"]`);
    if (!elevatorCar) {
      resolve();
      return;
    }
    elevatorCar.classList.add("moving");
    const targetPosition = getElevatorPosition(targetFloor);
    const currentPosition = parseInt(elevatorCar.style.bottom || "0");
    const distance = Math.abs(targetFloor - elevators[elevatorId].currentFloor);
    const duration = distance * MOVEMENT_SPEED;
    elevatorCar.style.transition = `bottom ${duration}ms ease-in-out`;
    elevatorCar.style.bottom = `${targetPosition}px`;
    elevators[elevatorId].currentFloor = targetFloor;
    elevators[elevatorId].isMoving = true;
    updateElevatorUI(elevatorId);
    setTimeout(() => {
      elevatorCar.classList.remove("moving");
      elevators[elevatorId].isMoving = false;
      updateElevatorUI(elevatorId);
      resolve();
    }, duration + 100);
  });
}
function updateElevatorUI(elevatorId) {
  const elevator = elevators[elevatorId];
  const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
  if (!elevatorElement)
    return;
  const currentFloorSpan = elevatorElement.querySelector(".current-floor");
  if (currentFloorSpan) {
    currentFloorSpan.textContent = `Floor: ${elevator.currentFloor}`;
  }
  const statusSpan = elevatorElement.querySelector(".status");
  if (statusSpan) {
    statusSpan.textContent = elevator.status;
    statusSpan.className = `status ${elevator.status}`;
  }
  const indicator = elevatorElement.querySelector(".elevator-indicator");
  if (indicator) {
    indicator.textContent = elevator.currentFloor.toString();
  }
}
function findBestElevator(floor, direction) {
  const idleElevators = elevators.filter((e) => e.status === "idle");
  if (idleElevators.length === 0)
    return null;
  if (floor === 0) {
    return idleElevators.reduce((best, current) => Math.abs(current.currentFloor - floor) < Math.abs(best.currentFloor - floor) ? current : best).id;
  }
  let candidates = idleElevators;
  if (direction) {
    const sameDirection = idleElevators.filter((e) => {
      if (e.direction === null)
        return true;
      return e.direction === direction;
    });
    if (sameDirection.length > 0) {
      candidates = sameDirection;
    }
  }
  return candidates.reduce((best, current) => Math.abs(current.currentFloor - floor) < Math.abs(best.currentFloor - floor) ? current : best).id;
}
function assignRequestToElevator(request) {
  const elevatorId = findBestElevator(request.floor, request.direction);
  if (elevatorId !== null) {
    const elevator = elevators[elevatorId];
    if (elevator.queue.length === 0 && elevator.status === "idle") {
      startElevatorToFloor(elevatorId, request.floor);
    } else {
      elevator.queue.push(request.floor);
      request.assigned = true;
      highlightDestinationButton(elevatorId, request.floor);
    }
  } else {
    requestQueue.push(request);
    updateRequestQueueDisplay();
  }
}
function startElevatorToFloor(elevatorId, targetFloor) {
  const elevator = elevators[elevatorId];
  if (elevator.status !== "idle" && !elevator.isMoving) {
    console.warn(`Elevator ${elevatorId} is busy`);
    return Promise.resolve();
  }
  elevator.targetFloor = targetFloor;
  elevator.status = "moving";
  elevator.direction = targetFloor > elevator.currentFloor ? "up" : "down";
  updateElevatorUI(elevatorId);
  return updateElevatorPosition(elevatorId, targetFloor).then(() => {
    processElevatorArrival(elevatorId, targetFloor);
  });
}
function processElevatorArrival(elevatorId, arrivedFloor) {
  const elevator = elevators[elevatorId];
  if (elevator.targetFloor === arrivedFloor) {
    elevator.targetFloor = null;
  }
  const queueIndex = elevator.queue.indexOf(arrivedFloor);
  if (queueIndex !== -1) {
    elevator.queue.splice(queueIndex, 1);
    clearDestinationButton(elevatorId, arrivedFloor);
  }
  processFloorRequests(arrivedFloor);
  if (elevator.queue.length > 0) {
    const nextFloor = elevator.queue[0];
    startElevatorToFloor(elevatorId, nextFloor);
  } else {
    elevator.status = "idle";
    elevator.direction = null;
    updateElevatorUI(elevatorId);
    processWaitingRequests();
  }
}
function processFloorRequests(floor) {
  const floorRow = document.querySelector(`.floor-row[data-floor="${floor}"]`);
  if (floorRow) {
    const buttons = floorRow.querySelectorAll(".floor-btn");
    buttons.forEach((btn) => {
      btn.classList.remove("requested");
    });
  }
  floorRequests = floorRequests.filter((req) => req.floor !== floor || req.assigned);
}
function processWaitingRequests() {
  if (requestQueue.length === 0)
    return;
  const availableElevator = elevators.find((e) => e.status === "idle");
  if (!availableElevator)
    return;
  const request = requestQueue.shift();
  if (request) {
    assignRequestToElevator(request);
    updateRequestQueueDisplay();
  }
}
function handleFloorButtonClick(floor, direction, button) {
  button.classList.add("requested");
  const request = {
    floor,
    direction,
    timestamp: Date.now(),
    assigned: false
  };
  floorRequests.push(request);
  assignRequestToElevator(request);
}
function handleElevatorControlClick(elevatorId, floor, button) {
  const elevator = elevators[elevatorId];
  button.classList.add("selected", "destination");
  if (elevator.status === "idle" && !elevator.isMoving) {
    startElevatorToFloor(elevatorId, floor);
  } else {
    if (!elevator.queue.includes(floor)) {
      elevator.queue.push(floor);
      highlightDestinationButton(elevatorId, floor);
    }
  }
}
function highlightDestinationButton(elevatorId, floor) {
  const button = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .control-btn[data-floor="${floor}"]`);
  if (button) {
    button.classList.add("destination");
  }
}
function clearDestinationButton(elevatorId, floor) {
  const button = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .control-btn[data-floor="${floor}"]`);
  if (button) {
    button.classList.remove("selected", "destination");
  }
}
function updateRequestQueueDisplay() {
  const queueContent = document.getElementById("queue-content");
  if (!queueContent)
    return;
  if (requestQueue.length === 0) {
    queueContent.innerHTML = '<span class="empty-queue">No pending requests</span>';
    return;
  }
  queueContent.innerHTML = requestQueue.map((req) => `<span class="queue-item">Floor ${req.floor} (${req.direction})</span>`).join("");
}
function setupEventListeners() {
  document.querySelectorAll(".floor-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const floor = parseInt(target.closest(".floor-row")?.getAttribute("data-floor") || "0");
      const direction = target.getAttribute("data-direction");
      handleFloorButtonClick(floor, direction, target);
    });
  });
  document.querySelectorAll(".control-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.target;
      const elevatorId = parseInt(target.closest(".elevator")?.getAttribute("data-elevator") || "0");
      const floor = parseInt(target.getAttribute("data-floor") || "0");
      handleElevatorControlClick(elevatorId, floor, target);
    });
  });
}
function initialize() {
  console.log("Initializing Elevator Simulator...");
  initializeElevators();
  setupEventListeners();
  elevators.forEach((elevator) => updateElevatorUI(elevator.id));
  console.log("Elevator Simulator initialized with:");
  console.log(`- ${NUM_FLOORS} floors (0-${NUM_FLOORS - 1})`);
  console.log(`- ${NUM_ELEVATORS} elevators`);
  console.log("All elevators start at ground floor (0) and are idle.");
}
document.addEventListener("DOMContentLoaded", initialize);
if (typeof window !== "undefined") {
  window.elevatorSimulator = {
    elevators,
    floorRequests,
    requestQueue,
    initialize,
    startElevatorToFloor,
    updateElevatorPosition,
    handleFloorButtonClick,
    handleElevatorControlClick
  };
}
