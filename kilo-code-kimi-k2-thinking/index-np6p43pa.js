// elevator.ts
class Elevator {
  id;
  currentFloor;
  destinationFloors;
  direction;
  status;
  element;
  destinationButtons = [];
  constructor(id, totalFloors) {
    this.id = id;
    this.currentFloor = 0;
    this.destinationFloors = [];
    this.direction = "idle";
    this.status = "idle";
    this.element = null;
    this.createElevatorElement(totalFloors);
  }
  createElevatorElement(totalFloors) {
    const elevatorsContainer = document.getElementById("elevators-container");
    if (!elevatorsContainer)
      return;
    const elevatorDiv = document.createElement("div");
    elevatorDiv.className = "elevator";
    elevatorDiv.id = `elevator-${this.id}`;
    elevatorDiv.textContent = `E${this.id}`;
    const leftDoor = document.createElement("div");
    leftDoor.className = "door left";
    elevatorDiv.appendChild(leftDoor);
    const rightDoor = document.createElement("div");
    rightDoor.className = "door right";
    elevatorDiv.appendChild(rightDoor);
    this.element = elevatorDiv;
    elevatorsContainer.appendChild(elevatorDiv);
    this.createDestinationButtons(totalFloors);
  }
  createDestinationButtons(totalFloors) {
    if (!this.element)
      return;
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "elevator-controls";
    const buttonsDiv = document.createElement("div");
    buttonsDiv.className = "destination-buttons";
    for (let i = 0;i < totalFloors; i++) {
      const button = document.createElement("button");
      button.className = "destination-button";
      button.textContent = i.toString();
      button.onclick = () => this.selectFloor(i);
      buttonsDiv.appendChild(button);
      this.destinationButtons.push(button);
    }
    controlsDiv.appendChild(buttonsDiv);
    this.element.appendChild(controlsDiv);
  }
  selectFloor(floor) {
    if (floor === this.currentFloor)
      return;
    if (!this.destinationFloors.includes(floor)) {
      this.destinationFloors.push(floor);
      this.destinationFloors.sort((a, b) => a - b);
      if (this.destinationButtons[floor]) {
        this.destinationButtons[floor].classList.add("active");
      }
      if (this.status === "idle") {
        this.move();
      }
    }
  }
  move() {
    if (this.destinationFloors.length === 0) {
      this.status = "idle";
      this.direction = "idle";
      return;
    }
    this.status = "moving";
    const nextFloor = this.getNextDestination();
    if (nextFloor > this.currentFloor) {
      this.direction = "up";
    } else if (nextFloor < this.currentFloor) {
      this.direction = "down";
    } else {
      this.direction = "idle";
    }
    if (this.direction === "up") {
      this.moveToFloor(this.currentFloor + 1);
    } else if (this.direction === "down") {
      this.moveToFloor(this.currentFloor - 1);
    }
  }
  moveToFloor(floor) {
    if (this.element) {
      const floorHeight = 70;
      const newPosition = floor * floorHeight;
      this.element.style.transform = `translateY(-${newPosition}px)`;
    }
    setTimeout(() => {
      this.currentFloor = floor;
      const destinationIndex = this.destinationFloors.indexOf(floor);
      if (destinationIndex !== -1) {
        this.destinationFloors.splice(destinationIndex, 1);
        if (this.destinationButtons[floor]) {
          this.destinationButtons[floor].classList.remove("active");
        }
        this.openDoors();
      } else {
        this.move();
      }
    }, 1000);
  }
  openDoors() {
    this.status = "door-opening";
    if (this.element) {
      this.element.classList.add("doors-open");
    }
    setTimeout(() => {
      this.status = "door-open";
      setTimeout(() => {
        this.closeDoors();
      }, 2000);
    }, 500);
  }
  closeDoors() {
    this.status = "door-closing";
    if (this.element) {
      this.element.classList.remove("doors-open");
    }
    setTimeout(() => {
      this.status = "idle";
      if (this.destinationFloors.length > 0) {
        this.move();
      }
    }, 500);
  }
  getNextDestination() {
    if (this.destinationFloors.length === 0)
      return this.currentFloor;
    if (this.direction === "up") {
      return this.destinationFloors.find((floor) => floor >= this.currentFloor) || this.destinationFloors[this.destinationFloors.length - 1];
    } else if (this.direction === "down") {
      for (let i = this.destinationFloors.length - 1;i >= 0; i--) {
        if (this.destinationFloors[i] <= this.currentFloor) {
          return this.destinationFloors[i];
        }
      }
      return this.destinationFloors[0];
    } else {
      return this.destinationFloors.reduce((closest, floor) => {
        const closestDistance = Math.abs(closest - this.currentFloor);
        const floorDistance = Math.abs(floor - this.currentFloor);
        return floorDistance < closestDistance ? floor : closest;
      }, this.destinationFloors[0]);
    }
  }
  addDestination(floor) {
    if (!this.destinationFloors.includes(floor)) {
      this.destinationFloors.push(floor);
      this.destinationFloors.sort((a, b) => a - b);
      if (this.status === "idle") {
        this.move();
      }
    }
  }
  isIdle() {
    return this.status === "idle";
  }
  getDistanceToFloor(floor) {
    return Math.abs(this.currentFloor - floor);
  }
}

// floor.ts
class Floor {
  floorNumber;
  upButton;
  downButton;
  constructor(floorNumber, totalFloors) {
    this.floorNumber = floorNumber;
    this.upButton = null;
    this.downButton = null;
    this.createFloorElement(totalFloors);
  }
  createFloorElement(totalFloors) {
    const building = document.getElementById("building");
    if (!building)
      return;
    const floorDiv = document.createElement("div");
    floorDiv.className = "floor";
    floorDiv.id = `floor-${this.floorNumber}`;
    const floorNumberDiv = document.createElement("div");
    floorNumberDiv.className = "floor-number";
    floorNumberDiv.textContent = this.floorNumber.toString();
    floorDiv.appendChild(floorNumberDiv);
    const floorButtonsDiv = document.createElement("div");
    floorButtonsDiv.className = "floor-buttons";
    if (this.floorNumber < totalFloors - 1) {
      const upButton = document.createElement("button");
      upButton.className = "floor-button up";
      upButton.textContent = "↑ Up";
      upButton.onclick = () => this.requestElevator("up");
      floorButtonsDiv.appendChild(upButton);
      this.upButton = upButton;
    }
    if (this.floorNumber > 0) {
      const downButton = document.createElement("button");
      downButton.className = "floor-button down";
      downButton.textContent = "↓ Down";
      downButton.onclick = () => this.requestElevator("down");
      floorButtonsDiv.appendChild(downButton);
      this.downButton = downButton;
    }
    floorDiv.appendChild(floorButtonsDiv);
    building.appendChild(floorDiv);
  }
  requestElevator(direction) {
    window.requestElevator(this.floorNumber, direction);
    const button = direction === "up" ? this.upButton : this.downButton;
    if (button) {
      button.disabled = true;
      setTimeout(() => {
        if (button)
          button.disabled = false;
      }, 2000);
    }
  }
  disableButtons() {
    if (this.upButton)
      this.upButton.disabled = true;
    if (this.downButton)
      this.downButton.disabled = true;
  }
  enableButtons() {
    if (this.upButton)
      this.upButton.disabled = false;
    if (this.downButton)
      this.downButton.disabled = false;
  }
}

// building.ts
class Building {
  floors;
  elevators;
  totalFloors;
  totalElevators;
  constructor(totalFloors = 10, totalElevators = 4) {
    this.totalFloors = totalFloors;
    this.totalElevators = totalElevators;
    this.floors = [];
    this.elevators = [];
    this.initializeBuilding();
  }
  initializeBuilding() {
    for (let i = 0;i < this.totalFloors; i++) {
      this.floors.push(new Floor(i, this.totalFloors));
    }
    for (let i = 0;i < this.totalElevators; i++) {
      this.elevators.push(new Elevator(i, this.totalFloors));
    }
  }
  requestElevator(fromFloor, direction) {
    console.log(`Elevator requested from floor ${fromFloor} going ${direction}`);
    const bestElevator = this.findBestElevator(fromFloor, direction);
    if (bestElevator) {
      console.log(`Elevator ${bestElevator.id} assigned to floor ${fromFloor}`);
      bestElevator.addDestination(fromFloor);
    } else {
      console.log(`No elevator available, queuing request for floor ${fromFloor}`);
    }
  }
  findBestElevator(fromFloor, direction) {
    const idleElevators = this.elevators.filter((elevator) => elevator.isIdle());
    if (idleElevators.length > 0) {
      return idleElevators.reduce((closest, elevator) => {
        const closestDistance = closest.getDistanceToFloor(fromFloor);
        const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
        return elevatorDistance < closestDistance ? elevator : closest;
      }, idleElevators[0]);
    }
    const movingElevators = this.elevators.filter((elevator) => !elevator.isIdle());
    const suitableElevators = movingElevators.filter((elevator) => {
      if (direction === "up" && elevator.direction === "up") {
        return elevator.currentFloor <= fromFloor;
      } else if (direction === "down" && elevator.direction === "down") {
        return elevator.currentFloor >= fromFloor;
      }
      return false;
    });
    if (suitableElevators.length > 0) {
      return suitableElevators.reduce((closest, elevator) => {
        const closestDistance = closest.getDistanceToFloor(fromFloor);
        const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
        return elevatorDistance < closestDistance ? elevator : closest;
      }, suitableElevators[0]);
    }
    return this.elevators.reduce((closest, elevator) => {
      const closestDistance = closest.getDistanceToFloor(fromFloor);
      const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
      return elevatorDistance < closestDistance ? elevator : closest;
    }, this.elevators[0]);
  }
  reset() {
    this.elevators.forEach((elevator) => {
      elevator.destinationFloors = [];
      elevator.direction = "idle";
      elevator.status = "idle";
      elevator.currentFloor = 0;
      if (elevator.element) {
        elevator.element.style.transform = "translateY(0px)";
        elevator.element.classList.remove("doors-open");
      }
      elevator.destinationButtons.forEach((button) => {
        button.classList.remove("active");
      });
    });
    this.floors.forEach((floor) => {
      floor.enableButtons();
    });
  }
}

// script.ts
document.addEventListener("DOMContentLoaded", () => {
  if (window.modelInfo) {
    const modelInfoElement = document.getElementById("model-info");
    if (modelInfoElement)
      modelInfoElement.textContent = window.modelInfo;
  }
  if (window.toolInfo) {
    const toolInfoElement = document.getElementById("tool-info");
    if (toolInfoElement)
      toolInfoElement.textContent = window.toolInfo;
  }
  if (window.providerInfo) {
    const providerInfoElement = document.getElementById("provider-info");
    if (providerInfoElement)
      providerInfoElement.textContent = window.providerInfo;
  }
  const building = new Building(10, 4);
  const startButton = document.getElementById("start-btn");
  const resetButton = document.getElementById("reset-btn");
  if (startButton) {
    startButton.addEventListener("click", () => {
      alert("Simulation started! Click floor buttons to request elevators.");
    });
  }
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      building.reset();
    });
  }
  window.building = building;
});
window.requestElevator = (floor, direction) => {
  const building = window.building;
  if (building) {
    building.requestElevator(floor, direction);
  }
};
