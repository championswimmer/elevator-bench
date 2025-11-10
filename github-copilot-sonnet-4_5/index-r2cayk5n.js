// script.ts
var NUM_FLOORS = 10;
var NUM_ELEVATORS = 4;
var FLOOR_HEIGHT = 60;
var MOVE_SPEED = 1000;
var elevators = [];
var floorRequests = [];
function init() {
  createFloorButtons();
  createElevators();
  createElevatorPanels();
  updateStatusDisplay();
  setInterval(processRequests, 100);
}
function createFloorButtons() {
  const floorButtonsContainer = document.getElementById("floor-buttons");
  for (let floor = NUM_FLOORS - 1;floor >= 0; floor--) {
    const floorGroup = document.createElement("div");
    floorGroup.className = "floor-button-group";
    const label = document.createElement("span");
    label.className = "floor-label";
    label.textContent = `F${floor}`;
    floorGroup.appendChild(label);
    if (floor < NUM_FLOORS - 1) {
      const upBtn = document.createElement("button");
      upBtn.className = "floor-btn up";
      upBtn.textContent = "▲";
      upBtn.id = `floor-${floor}-up`;
      upBtn.onclick = () => requestElevator(floor, "UP" /* UP */);
      floorGroup.appendChild(upBtn);
    }
    if (floor > 0) {
      const downBtn = document.createElement("button");
      downBtn.className = "floor-btn down";
      downBtn.textContent = "▼";
      downBtn.id = `floor-${floor}-down`;
      downBtn.onclick = () => requestElevator(floor, "DOWN" /* DOWN */);
      floorGroup.appendChild(downBtn);
    }
    floorButtonsContainer.appendChild(floorGroup);
  }
}
function createElevators() {
  const elevatorsContainer = document.getElementById("elevators");
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const shaft = document.createElement("div");
    shaft.className = "elevator-shaft";
    const header = document.createElement("div");
    header.className = "elevator-shaft-header";
    header.textContent = `Elevator ${i}`;
    shaft.appendChild(header);
    const car = document.createElement("div");
    car.className = "elevator-car";
    car.id = `elevator-${i}`;
    car.innerHTML = `
            <div class="elevator-car-info">
                <span class="elevator-current-floor">0</span>
                <span class="elevator-direction">IDLE</span>
            </div>
        `;
    shaft.appendChild(car);
    elevatorsContainer.appendChild(shaft);
    elevators.push({
      id: i,
      currentFloor: 0,
      targetFloors: new Set,
      state: "IDLE" /* IDLE */,
      direction: "IDLE" /* IDLE */,
      element: car
    });
  }
}
function createElevatorPanels() {
  const panelsContainer = document.getElementById("elevator-panels");
  for (let i = 0;i < NUM_ELEVATORS; i++) {
    const panel = document.createElement("div");
    panel.className = "elevator-panel";
    const title = document.createElement("h3");
    title.textContent = `Elevator ${i}`;
    panel.appendChild(title);
    const grid = document.createElement("div");
    grid.className = "floor-buttons-grid";
    for (let floor = 0;floor < NUM_FLOORS; floor++) {
      const btn = document.createElement("button");
      btn.className = "floor-destination-btn";
      btn.textContent = floor.toString();
      btn.id = `elevator-${i}-floor-${floor}`;
      btn.onclick = () => selectDestination(i, floor);
      grid.appendChild(btn);
    }
    panel.appendChild(grid);
    panelsContainer.appendChild(panel);
  }
}
function requestElevator(floor, direction) {
  const exists = floorRequests.some((req) => req.floor === floor && req.direction === direction);
  if (!exists) {
    floorRequests.push({ floor, direction });
    highlightFloorButton(floor, direction, true);
  }
}
function selectDestination(elevatorId, floor) {
  const elevator = elevators[elevatorId];
  if (elevator.currentFloor !== floor) {
    elevator.targetFloors.add(floor);
    highlightDestinationButton(elevatorId, floor, true);
    if (elevator.state === "IDLE" /* IDLE */) {
      determineDirection(elevator);
    }
  }
}
function processRequests() {
  elevators.forEach((elevator) => {
    if (elevator.state === "IDLE" /* IDLE */ && elevator.targetFloors.size > 0) {
      determineDirection(elevator);
      moveElevator(elevator);
    } else if (elevator.state === "IDLE" /* IDLE */ && floorRequests.length > 0) {
      assignRequestToElevator();
    }
  });
  updateStatusDisplay();
}
function assignRequestToElevator() {
  if (floorRequests.length === 0)
    return;
  const request = floorRequests[0];
  let bestElevator = null;
  let minDistance = Infinity;
  for (const elevator of elevators) {
    if (elevator.state === "IDLE" /* IDLE */) {
      const distance = Math.abs(elevator.currentFloor - request.floor);
      if (distance < minDistance) {
        minDistance = distance;
        bestElevator = elevator;
      }
    } else if (elevator.direction === request.direction || elevator.direction === "IDLE" /* IDLE */) {
      const distance = Math.abs(elevator.currentFloor - request.floor);
      const willPassBy = elevator.direction === "UP" /* UP */ && elevator.currentFloor < request.floor || elevator.direction === "DOWN" /* DOWN */ && elevator.currentFloor > request.floor;
      if (willPassBy && distance < minDistance) {
        minDistance = distance;
        bestElevator = elevator;
      }
    }
  }
  if (bestElevator) {
    floorRequests.shift();
    bestElevator.targetFloors.add(request.floor);
    highlightFloorButton(request.floor, request.direction, false);
    if (bestElevator.state === "IDLE" /* IDLE */) {
      determineDirection(bestElevator);
    }
  }
}
function determineDirection(elevator) {
  if (elevator.targetFloors.size === 0) {
    elevator.direction = "IDLE" /* IDLE */;
    return;
  }
  const targets = Array.from(elevator.targetFloors).sort((a, b) => a - b);
  if (elevator.direction === "IDLE" /* IDLE */) {
    const nearest = targets.reduce((prev, curr) => {
      return Math.abs(curr - elevator.currentFloor) < Math.abs(prev - elevator.currentFloor) ? curr : prev;
    });
    elevator.direction = nearest > elevator.currentFloor ? "UP" /* UP */ : "DOWN" /* DOWN */;
  }
  if (elevator.direction === "UP" /* UP */) {
    const floorsAhead = targets.filter((f) => f > elevator.currentFloor);
    if (floorsAhead.length === 0) {
      elevator.direction = "DOWN" /* DOWN */;
    }
  } else if (elevator.direction === "DOWN" /* DOWN */) {
    const floorsAhead = targets.filter((f) => f < elevator.currentFloor);
    if (floorsAhead.length === 0) {
      elevator.direction = "UP" /* UP */;
    }
  }
}
function moveElevator(elevator) {
  if (elevator.state === "MOVING" /* MOVING */)
    return;
  const targets = Array.from(elevator.targetFloors);
  if (targets.length === 0) {
    elevator.state = "IDLE" /* IDLE */;
    elevator.direction = "IDLE" /* IDLE */;
    updateElevatorDisplay(elevator);
    return;
  }
  let nextFloor = null;
  if (elevator.direction === "UP" /* UP */) {
    const floorsAbove = targets.filter((f) => f > elevator.currentFloor).sort((a, b) => a - b);
    nextFloor = floorsAbove.length > 0 ? floorsAbove[0] : null;
  } else if (elevator.direction === "DOWN" /* DOWN */) {
    const floorsBelow = targets.filter((f) => f < elevator.currentFloor).sort((a, b) => b - a);
    nextFloor = floorsBelow.length > 0 ? floorsBelow[0] : null;
  }
  if (nextFloor === null) {
    determineDirection(elevator);
    if (elevator.targetFloors.size > 0) {
      moveElevator(elevator);
    }
    return;
  }
  elevator.state = "MOVING" /* MOVING */;
  const floorsToMove = Math.abs(nextFloor - elevator.currentFloor);
  let currentStep = 0;
  const moveInterval = setInterval(() => {
    if (currentStep < floorsToMove) {
      if (elevator.direction === "UP" /* UP */) {
        elevator.currentFloor++;
      } else {
        elevator.currentFloor--;
      }
      updateElevatorDisplay(elevator);
      currentStep++;
      if (elevator.targetFloors.has(elevator.currentFloor)) {
        elevator.targetFloors.delete(elevator.currentFloor);
        highlightDestinationButton(elevator.id, elevator.currentFloor, false);
        clearInterval(moveInterval);
        setTimeout(() => {
          elevator.state = "IDLE" /* IDLE */;
          if (elevator.targetFloors.size > 0) {
            determineDirection(elevator);
            moveElevator(elevator);
          } else {
            elevator.direction = "IDLE" /* IDLE */;
            updateElevatorDisplay(elevator);
          }
        }, 500);
      }
    } else {
      clearInterval(moveInterval);
      elevator.state = "IDLE" /* IDLE */;
      elevator.targetFloors.delete(elevator.currentFloor);
      highlightDestinationButton(elevator.id, elevator.currentFloor, false);
      if (elevator.targetFloors.size > 0) {
        determineDirection(elevator);
        moveElevator(elevator);
      } else {
        elevator.direction = "IDLE" /* IDLE */;
        updateElevatorDisplay(elevator);
      }
    }
  }, MOVE_SPEED);
}
function updateElevatorDisplay(elevator) {
  const position = elevator.currentFloor * FLOOR_HEIGHT;
  elevator.element.style.bottom = `${position}px`;
  const floorSpan = elevator.element.querySelector(".elevator-current-floor");
  const directionSpan = elevator.element.querySelector(".elevator-direction");
  floorSpan.textContent = elevator.currentFloor.toString();
  directionSpan.textContent = elevator.direction;
  if (elevator.state === "MOVING" /* MOVING */) {
    elevator.element.classList.add("moving");
  } else {
    elevator.element.classList.remove("moving");
  }
}
function highlightFloorButton(floor, direction, highlight) {
  const btnId = direction === "UP" /* UP */ ? `floor-${floor}-up` : `floor-${floor}-down`;
  const btn = document.getElementById(btnId);
  if (btn) {
    if (highlight) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}
function highlightDestinationButton(elevatorId, floor, highlight) {
  const btn = document.getElementById(`elevator-${elevatorId}-floor-${floor}`);
  if (btn) {
    if (highlight) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
}
function updateStatusDisplay() {
  const statusDisplay = document.getElementById("status-display");
  statusDisplay.innerHTML = "";
  elevators.forEach((elevator) => {
    const statusDiv = document.createElement("div");
    statusDiv.className = "elevator-status";
    const targets = Array.from(elevator.targetFloors).sort((a, b) => a - b).join(", ");
    const statusClass = elevator.state === "IDLE" /* IDLE */ ? "status-idle" : "status-moving";
    statusDiv.innerHTML = `
            <h4>Elevator ${elevator.id}</h4>
            <p>Current Floor: <strong>${elevator.currentFloor}</strong></p>
            <p>State: <span class="${statusClass}">${elevator.state}</span></p>
            <p>Direction: <strong>${elevator.direction}</strong></p>
            <p>Target Floors: ${targets || "None"}</p>
        `;
    statusDisplay.appendChild(statusDiv);
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
