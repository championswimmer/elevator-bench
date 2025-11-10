// script.ts
class ElevatorSimulator {
  elevators;
  floorRequests;
  NUM_FLOORS = 10;
  NUM_ELEVATORS = 4;
  FLOOR_HEIGHT = 100;
  MOVE_DURATION = 2000;
  DOOR_DURATION = 1000;
  IDLE_RETURN_TIME = 1e4;
  constructor() {
    this.elevators = [];
    for (let i = 0;i < this.NUM_ELEVATORS; i++) {
      this.elevators.push({
        id: i,
        currentFloor: 0,
        targetFloors: [],
        isMoving: false,
        isGoingUp: null,
        doorOpen: false,
        idleTimer: null
      });
    }
    this.floorRequests = [];
    this.bindEvents();
    this.processRequests();
  }
  bindEvents() {
    document.querySelectorAll(".floor-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.target;
        const floor = parseInt(target.getAttribute("data-floor") || "0");
        const direction = target.classList.contains("up") ? "up" : "down";
        this.requestFloor(floor, direction);
      });
    });
    document.querySelectorAll(".elevator-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        const target = event.target;
        const floor = parseInt(target.getAttribute("data-floor") || "0");
        const elevatorId = parseInt(target.closest(".elevator")?.getAttribute("data-elevator") || "0");
        this.selectFloor(elevatorId, floor);
      });
    });
  }
  requestFloor(floor, direction) {
    console.log(`Floor ${floor} requested to go ${direction}`);
    const button = document.querySelector(`.floor-button[data-floor="${floor}"]${direction === "up" ? ".up" : ".down"}`);
    if (button) {
      button.classList.add("active");
      setTimeout(() => button.classList.remove("active"), 300);
    }
    this.floorRequests.push({ floor, direction });
    this.updateStatus(`Floor ${floor} requested to go ${direction}`);
    this.assignRequests();
  }
  selectFloor(elevatorId, floor) {
    console.log(`Elevator ${elevatorId} requested to go to floor ${floor}`);
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    const button = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-button[data-floor="${floor}"]`);
    if (button) {
      button.classList.add("active");
      setTimeout(() => button.classList.remove("active"), 300);
    }
    if (!elevator.targetFloors.includes(floor)) {
      elevator.targetFloors.push(floor);
      this.sortTargetFloors(elevator);
    }
    this.updateStatus(`Elevator ${elevatorId} requested to go to floor ${floor}`);
    if (elevator.idleTimer) {
      clearTimeout(elevator.idleTimer);
      elevator.idleTimer = null;
    }
  }
  sortTargetFloors(elevator) {
    if (elevator.isGoingUp === true) {
      elevator.targetFloors.sort((a, b) => a - b);
    } else if (elevator.isGoingUp === false) {
      elevator.targetFloors.sort((a, b) => b - a);
    } else {
      elevator.targetFloors.sort((a, b) => {
        const distanceA = Math.abs(elevator.currentFloor - a);
        const distanceB = Math.abs(elevator.currentFloor - b);
        return distanceA - distanceB;
      });
    }
  }
  assignRequests() {
    for (let i = this.floorRequests.length - 1;i >= 0; i--) {
      const request = this.floorRequests[i];
      const assignedElevator = this.findBestElevator(request.floor, request.direction);
      if (assignedElevator !== null) {
        const elevator = this.elevators[assignedElevator];
        if (!elevator.targetFloors.includes(request.floor)) {
          elevator.targetFloors.push(request.floor);
          this.sortTargetFloors(elevator);
        }
        this.updateStatus(`Request from floor ${request.floor} assigned to Elevator ${assignedElevator}`);
        this.floorRequests.splice(i, 1);
        if (elevator.idleTimer) {
          clearTimeout(elevator.idleTimer);
          elevator.idleTimer = null;
        }
      }
    }
  }
  findBestElevator(requestFloor, direction) {
    console.log(`Finding best elevator for floor ${requestFloor} going ${direction}`);
    let bestElevator = null;
    let bestScore = -1;
    for (const elevator of this.elevators) {
      console.log(`Elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, isMoving=${elevator.isMoving}, isGoingUp=${elevator.isGoingUp}, doorOpen=${elevator.doorOpen}`);
      if (elevator.doorOpen) {
        console.log(`Elevator ${elevator.id} skipping - door is open`);
        continue;
      }
      const distance = Math.abs(elevator.currentFloor - requestFloor);
      let score = 0;
      if (!elevator.isMoving) {
        score += 1000;
      }
      if (elevator.isMoving && elevator.isGoingUp !== null) {
        const goingCorrectDirection = direction === "up" && elevator.isGoingUp || direction === "down" && !elevator.isGoingUp;
        if (goingCorrectDirection) {
          score += 500;
        } else {
          score -= 1000;
        }
      }
      score += (10 - distance) * 10;
      console.log(`Elevator ${elevator.id} score: ${score}`);
      if (score > bestScore) {
        bestScore = score;
        bestElevator = elevator.id;
        console.log(`Elevator ${elevator.id} is now best candidate with score ${score}`);
      }
    }
    console.log(`Best elevator for floor ${requestFloor}: ${bestElevator} with score ${bestScore}`);
    return bestElevator;
  }
  processRequests() {
    setInterval(() => {
      this.assignRequests();
      this.processElevatorMovements();
    }, 100);
  }
  processElevatorMovements() {
    for (const elevator of this.elevators) {
      console.log(`Processing elevator ${elevator.id}: currentFloor=${elevator.currentFloor}, targetFloors=[${elevator.targetFloors}], isMoving=${elevator.isMoving}, doorOpen=${elevator.doorOpen}`);
      if (elevator.isMoving || elevator.doorOpen) {
        console.log(`Elevator ${elevator.id} skipping - currently moving or door is open`);
        continue;
      }
      if (elevator.targetFloors.length > 0) {
        if (elevator.idleTimer) {
          clearTimeout(elevator.idleTimer);
          elevator.idleTimer = null;
        }
        let nextFloor = null;
        if (elevator.isGoingUp !== null) {
          if (elevator.isGoingUp) {
            const upFloors = elevator.targetFloors.filter((floor) => floor >= elevator.currentFloor);
            if (upFloors.length > 0) {
              nextFloor = Math.min(...upFloors);
            }
          } else {
            const downFloors = elevator.targetFloors.filter((floor) => floor <= elevator.currentFloor);
            if (downFloors.length > 0) {
              nextFloor = Math.max(...downFloors);
            }
          }
        }
        if (nextFloor === null && elevator.targetFloors.length > 0) {
          nextFloor = elevator.targetFloors.reduce((closest, floor) => {
            const closestDistance = Math.abs(elevator.currentFloor - closest);
            const floorDistance = Math.abs(elevator.currentFloor - floor);
            return floorDistance < closestDistance ? floor : closest;
          }, elevator.targetFloors[0]);
        }
        if (nextFloor === null) {
          console.log(`Elevator ${elevator.id} has no valid target floors`);
          continue;
        }
        console.log(`Elevator ${elevator.id} has target floors, next floor is ${nextFloor}`);
        if (elevator.currentFloor < nextFloor) {
          elevator.isGoingUp = true;
        } else if (elevator.currentFloor > nextFloor) {
          elevator.isGoingUp = false;
        } else {
          console.log(`Elevator ${elevator.id} already at target floor ${nextFloor}`);
          const index = elevator.targetFloors.indexOf(nextFloor);
          if (index > -1) {
            elevator.targetFloors.splice(index, 1);
          }
          this.openDoor(elevator.id);
          continue;
        }
        console.log(`Moving elevator ${elevator.id} to floor ${nextFloor}`);
        this.moveElevator(elevator.id, nextFloor);
      } else if (elevator.currentFloor !== 0 && !elevator.idleTimer) {
        console.log(`Elevator ${elevator.id} is idle, starting idle timer`);
        elevator.idleTimer = window.setTimeout(() => {
          if (elevator.targetFloors.length === 0 && elevator.currentFloor !== 0) {
            console.log(`Elevator ${elevator.id} returning to floor 0 after being idle`);
            elevator.targetFloors.push(0);
            this.sortTargetFloors(elevator);
          }
          elevator.idleTimer = null;
        }, this.IDLE_RETURN_TIME);
      }
    }
  }
  moveElevator(elevatorId, targetFloor) {
    const elevator = this.elevators[elevatorId];
    if (!elevator || elevator.isMoving)
      return;
    elevator.isMoving = true;
    this.updateStatus(`Elevator ${elevatorId} moving from floor ${elevator.currentFloor} to floor ${targetFloor}`);
    const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
    if (statusElement) {
      statusElement.textContent = `Moving ${elevator.isGoingUp ? "Up" : "Down"} to Floor ${targetFloor}`;
      statusElement.className = "elevator-status";
      statusElement.classList.add("elevator-status", elevator.isGoingUp ? "moving-up" : "moving-down");
    }
    const elevatorElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"]`);
    if (elevatorElement) {
      const newPosition = (this.NUM_FLOORS - 1 - targetFloor) * this.FLOOR_HEIGHT;
      elevatorElement.style.transition = `transform ${this.MOVE_DURATION}ms ease-in-out`;
      elevatorElement.style.transform = `translateY(${-newPosition}px)`;
      setTimeout(() => {
        elevator.currentFloor = targetFloor;
        elevator.isMoving = false;
        const index = elevator.targetFloors.indexOf(targetFloor);
        if (index > -1) {
          elevator.targetFloors.splice(index, 1);
        }
        this.updateStatus(`Elevator ${elevatorId} arrived at floor ${targetFloor}`);
        this.openDoor(elevatorId);
        if (statusElement) {
          statusElement.textContent = `Stopped at Floor ${targetFloor}`;
          statusElement.className = "elevator-status";
          statusElement.classList.add("elevator-status", "stopped");
        }
      }, this.MOVE_DURATION);
    }
  }
  openDoor(elevatorId) {
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    elevator.doorOpen = true;
    const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
    if (statusElement) {
      statusElement.textContent = `Door Opening`;
      statusElement.className = "elevator-status";
      statusElement.classList.add("elevator-status", "door-opening");
    }
    setTimeout(() => {
      this.closeDoor(elevatorId);
    }, this.DOOR_DURATION);
  }
  closeDoor(elevatorId) {
    const elevator = this.elevators[elevatorId];
    if (!elevator)
      return;
    elevator.doorOpen = false;
    const statusElement = document.querySelector(`.elevator[data-elevator="${elevatorId}"] .elevator-status`);
    if (statusElement) {
      statusElement.textContent = `Idle at Floor ${elevator.currentFloor}`;
      statusElement.className = "elevator-status";
      statusElement.classList.add("elevator-status", "idle");
    }
    this.updateStatus(`Elevator ${elevatorId} door closed at floor ${elevator.currentFloor}`);
  }
  updateStatus(message) {
    const statusContent = document.querySelector(".status-content");
    if (statusContent) {
      const paragraph = document.createElement("p");
      paragraph.textContent = new Date().toLocaleTimeString() + ": " + message;
      if (statusContent.firstChild) {
        statusContent.insertBefore(paragraph, statusContent.firstChild);
      } else {
        statusContent.appendChild(paragraph);
      }
      while (statusContent.children.length > 20) {
        statusContent.removeChild(statusContent.lastChild);
      }
      statusContent.scrollTop = 0;
    }
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const simulator = new ElevatorSimulator;
  console.log("Elevator Simulator initialized");
  const statusContent = document.querySelector(".status-content");
  if (statusContent) {
    statusContent.innerHTML = "<p>System initialized. All elevators are idle at floor 0.</p>";
  }
});
