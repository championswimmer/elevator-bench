// script.ts
var TOTAL_FLOORS = 10;
var TOTAL_ELEVATORS = 4;
var FLOOR_HEIGHT = 10;
var MOVE_DURATION = 500;
var elevators = [];
var floorRequests = [];
var activeFloorButtons = new Set;
function initElevators() {
  for (let i = 0;i < TOTAL_ELEVATORS; i++) {
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloors: [],
      direction: "idle",
      status: "idle"
    });
  }
}
function initUI() {
  const floorButtonsContainer = document.getElementById("floorButtons");
  if (floorButtonsContainer) {
    for (let floor = TOTAL_FLOORS - 1;floor >= 0; floor--) {
      const floorRow = document.createElement("div");
      floorRow.className = "floor-button-row";
      const floorLabel = document.createElement("div");
      floorLabel.className = "floor-label";
      floorLabel.textContent = `Floor ${floor}`;
      floorRow.appendChild(floorLabel);
      const buttonGroup = document.createElement("div");
      buttonGroup.className = "floor-button-group";
      if (floor === TOTAL_FLOORS - 1) {
        const downBtn = createFloorButton(floor, "down");
        buttonGroup.appendChild(downBtn);
      } else if (floor === 0) {
        const upBtn = createFloorButton(floor, "up");
        buttonGroup.appendChild(upBtn);
      } else {
        const upBtn = createFloorButton(floor, "up");
        const downBtn = createFloorButton(floor, "down");
        buttonGroup.appendChild(upBtn);
        buttonGroup.appendChild(downBtn);
      }
      floorRow.appendChild(buttonGroup);
      floorButtonsContainer.appendChild(floorRow);
    }
  }
  for (let elevatorId = 0;elevatorId < TOTAL_ELEVATORS; elevatorId++) {
    const panelButtons = document.getElementById(`elevator-buttons-${elevatorId}`);
    if (panelButtons) {
      for (let floor = 0;floor < TOTAL_FLOORS; floor++) {
        const button = document.createElement("button");
        button.className = "elevator-button";
        button.textContent = `${floor}`;
        button.dataset.elevator = `${elevatorId}`;
        button.dataset.floor = `${floor}`;
        button.addEventListener("click", () => handleElevatorButtonClick(elevatorId, floor));
        panelButtons.appendChild(button);
      }
    }
  }
}
function createFloorButton(floor, direction) {
  const button = document.createElement("button");
  button.className = `floor-button ${direction}`;
  button.textContent = direction === "up" ? "↑" : "↓";
  button.dataset.floor = `${floor}`;
  button.dataset.direction = direction;
  button.addEventListener("click", () => handleFloorButtonClick(floor, direction));
  return button;
}
function handleFloorButtonClick(floor, direction) {
  const buttonKey = `${floor}-${direction}`;
  if (activeFloorButtons.has(buttonKey)) {
    return;
  }
  activeFloorButtons.add(buttonKey);
  updateFloorButtonState(floor, direction, true);
  const request = { floor, direction };
  const assignedElevator = findBestElevator(request);
  if (assignedElevator) {
    assignRequestToElevator(assignedElevator, floor);
  } else {
    floorRequests.push(request);
  }
}
function handleElevatorButtonClick(elevatorId, floor) {
  const elevator = elevators[elevatorId];
  if (elevator.currentFloor === floor) {
    return;
  }
  if (elevator.targetFloors.includes(floor)) {
    return;
  }
  assignRequestToElevator(elevator, floor);
  updateElevatorButtonState(elevatorId, floor, true);
}
function findBestElevator(request) {
  let bestElevator = null;
  let minDistance = Infinity;
  for (const elevator of elevators) {
    if (elevator.status === "idle") {
      const distance = Math.abs(elevator.currentFloor - request.floor);
      if (distance < minDistance) {
        minDistance = distance;
        bestElevator = elevator;
      }
    } else if (elevator.direction === request.direction) {
      if (request.direction === "up" && elevator.currentFloor < request.floor) {
        const distance = request.floor - elevator.currentFloor;
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      } else if (request.direction === "down" && elevator.currentFloor > request.floor) {
        const distance = elevator.currentFloor - request.floor;
        if (distance < minDistance) {
          minDistance = distance;
          bestElevator = elevator;
        }
      }
    }
  }
  return bestElevator;
}
function assignRequestToElevator(elevator, floor) {
  elevator.targetFloors.push(floor);
  sortTargetFloors(elevator);
  if (elevator.status === "idle") {
    startElevatorMovement(elevator);
  }
}
function sortTargetFloors(elevator) {
  const current = elevator.currentFloor;
  const floorsAbove = elevator.targetFloors.filter((f) => f > current).sort((a, b) => a - b);
  const floorsBelow = elevator.targetFloors.filter((f) => f < current).sort((a, b) => b - a);
  if (elevator.direction === "up" || elevator.direction === "idle" && floorsAbove.length > 0) {
    elevator.targetFloors = [...floorsAbove, ...floorsBelow];
    if (floorsAbove.length > 0) {
      elevator.direction = "up";
    }
  } else {
    elevator.targetFloors = [...floorsBelow, ...floorsAbove];
    if (floorsBelow.length > 0) {
      elevator.direction = "down";
    }
  }
}
function startElevatorMovement(elevator) {
  if (elevator.targetFloors.length === 0) {
    elevator.status = "idle";
    elevator.direction = "idle";
    updateElevatorUI(elevator);
    checkPendingRequests();
    return;
  }
  const nextFloor = elevator.targetFloors[0];
  const distance = Math.abs(nextFloor - elevator.currentFloor);
  elevator.status = "moving";
  if (nextFloor > elevator.currentFloor) {
    elevator.direction = "up";
  } else if (nextFloor < elevator.currentFloor) {
    elevator.direction = "down";
  }
  updateElevatorUI(elevator);
  const moveDuration = distance * MOVE_DURATION;
  setTimeout(() => {
    moveElevatorToFloor(elevator, nextFloor);
  }, moveDuration);
}
function moveElevatorToFloor(elevator, floor) {
  elevator.currentFloor = floor;
  elevator.targetFloors.shift();
  clearFloorRequest(floor, elevator.direction);
  updateElevatorButtonState(elevator.id, floor, false);
  updateElevatorUI(elevator);
  setTimeout(() => {
    startElevatorMovement(elevator);
  }, 500);
}
function clearFloorRequest(floor, direction) {
  if (direction === "idle")
    return;
  const buttonKey = `${floor}-${direction}`;
  if (activeFloorButtons.has(buttonKey)) {
    activeFloorButtons.delete(buttonKey);
    updateFloorButtonState(floor, direction, false);
  }
  const index = floorRequests.findIndex((r) => r.floor === floor && r.direction === direction);
  if (index !== -1) {
    floorRequests.splice(index, 1);
  }
}
function checkPendingRequests() {
  for (let i = floorRequests.length - 1;i >= 0; i--) {
    const request = floorRequests[i];
    const elevator = findBestElevator(request);
    if (elevator) {
      assignRequestToElevator(elevator, request.floor);
      floorRequests.splice(i, 1);
    }
  }
}
function updateElevatorUI(elevator) {
  const elevatorEl = document.getElementById(`elevator-${elevator.id}`);
  if (elevatorEl) {
    const bottomPosition = elevator.currentFloor * FLOOR_HEIGHT + 0.5;
    elevatorEl.style.bottom = `${bottomPosition}%`;
    const statusEl = elevatorEl.querySelector(".elevator-status");
    if (statusEl) {
      statusEl.textContent = elevator.status === "idle" ? "Idle" : `Moving ${elevator.direction}`;
    }
    const floorEl = elevatorEl.querySelector(".elevator-floor");
    if (floorEl) {
      floorEl.textContent = `Floor: ${elevator.currentFloor}`;
    }
    if (elevator.status === "moving") {
      elevatorEl.classList.add("moving");
    } else {
      elevatorEl.classList.remove("moving");
    }
  }
}
function updateFloorButtonState(floor, direction, active) {
  const buttons = document.querySelectorAll(`.floor-button[data-floor="${floor}"][data-direction="${direction}"]`);
  buttons.forEach((button) => {
    if (active) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });
}
function updateElevatorButtonState(elevatorId, floor, active) {
  const button = document.querySelector(`.elevator-button[data-elevator="${elevatorId}"][data-floor="${floor}"]`);
  if (button) {
    if (active) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  initElevators();
  initUI();
  elevators.forEach((elevator) => updateElevatorUI(elevator));
});
