export type ElevatorDirection = 'up' | 'down' | 'idle';
export type ElevatorStatus = 'idle' | 'moving' | 'door-opening' | 'door-open' | 'door-closing';

export class Elevator {
    id: number;
    currentFloor: number;
    destinationFloors: number[];
    direction: ElevatorDirection;
    status: ElevatorStatus;
    element: HTMLElement | null;
    destinationButtons: HTMLButtonElement[] = [];

    constructor(id: number, totalFloors: number) {
        this.id = id;
        this.currentFloor = 0; // Start at ground floor
        this.destinationFloors = [];
        this.direction = 'idle';
        this.status = 'idle';
        this.element = null;
        
        this.createElevatorElement(totalFloors);
    }

    private createElevatorElement(totalFloors: number) {
        const elevatorsContainer = document.getElementById('elevators-container');
        if (!elevatorsContainer) return;

        const elevatorDiv = document.createElement('div');
        elevatorDiv.className = 'elevator';
        elevatorDiv.id = `elevator-${this.id}`;
        elevatorDiv.textContent = `E${this.id}`;
        
        // Create doors
        const leftDoor = document.createElement('div');
        leftDoor.className = 'door left';
        elevatorDiv.appendChild(leftDoor);
        
        const rightDoor = document.createElement('div');
        rightDoor.className = 'door right';
        elevatorDiv.appendChild(rightDoor);
        
        this.element = elevatorDiv;
        elevatorsContainer.appendChild(elevatorDiv);

        // Create destination buttons
        this.createDestinationButtons(totalFloors);
    }

    private createDestinationButtons(totalFloors: number) {
        if (!this.element) return;

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'elevator-controls';
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'destination-buttons';
        
        for (let i = 0; i < totalFloors; i++) {
            const button = document.createElement('button');
            button.className = 'destination-button';
            button.textContent = i.toString();
            button.onclick = () => this.selectFloor(i);
            buttonsDiv.appendChild(button);
            this.destinationButtons.push(button);
        }
        
        controlsDiv.appendChild(buttonsDiv);
        this.element.appendChild(controlsDiv);
    }

    private selectFloor(floor: number) {
        if (floor === this.currentFloor) return;
        
        // Add floor to destination list if not already there
        if (!this.destinationFloors.includes(floor)) {
            this.destinationFloors.push(floor);
            this.destinationFloors.sort((a, b) => a - b);
            
            // Update button style
            if (this.destinationButtons[floor]) {
                this.destinationButtons[floor].classList.add('active');
            }
            
            // If elevator is idle, start moving
            if (this.status === 'idle') {
                this.move();
            }
        }
    }

    public move() {
        if (this.destinationFloors.length === 0) {
            this.status = 'idle';
            this.direction = 'idle';
            return;
        }

        this.status = 'moving';
        
        // Determine direction based on next destination
        const nextFloor = this.getNextDestination();
        if (nextFloor > this.currentFloor) {
            this.direction = 'up';
        } else if (nextFloor < this.currentFloor) {
            this.direction = 'down';
        } else {
            this.direction = 'idle';
        }

        // Move to next floor
        if (this.direction === 'up') {
            this.moveToFloor(this.currentFloor + 1);
        } else if (this.direction === 'down') {
            this.moveToFloor(this.currentFloor - 1);
        }
    }

    private moveToFloor(floor: number) {
        // Update UI position (this is a simplified animation)
        if (this.element) {
            const floorHeight = 70; // Approximate height of a floor in pixels
            const newPosition = floor * floorHeight;
            this.element.style.transform = `translateY(-${newPosition}px)`;
        }

        // Simulate movement delay
        setTimeout(() => {
            this.currentFloor = floor;
            
            // Check if we've reached a destination
            const destinationIndex = this.destinationFloors.indexOf(floor);
            if (destinationIndex !== -1) {
                this.destinationFloors.splice(destinationIndex, 1);
                if (this.destinationButtons[floor]) {
                    this.destinationButtons[floor].classList.remove('active');
                }
                this.openDoors();
            } else {
                // Continue moving
                this.move();
            }
        }, 1000);
    }

    private openDoors() {
        this.status = 'door-opening';
        
        if (this.element) {
            this.element.classList.add('doors-open');
        }
        
        setTimeout(() => {
            this.status = 'door-open';
            setTimeout(() => {
                this.closeDoors();
            }, 2000);
        }, 500);
    }

    private closeDoors() {
        this.status = 'door-closing';
        
        if (this.element) {
            this.element.classList.remove('doors-open');
        }
        
        setTimeout(() => {
            this.status = 'idle';
            if (this.destinationFloors.length > 0) {
                this.move();
            }
        }, 500);
    }

    private getNextDestination(): number {
        if (this.destinationFloors.length === 0) return this.currentFloor;
        
        if (this.direction === 'up') {
            // Return the first destination that is >= current floor
            return this.destinationFloors.find(floor => floor >= this.currentFloor) || 
                   this.destinationFloors[this.destinationFloors.length - 1];
        } else if (this.direction === 'down') {
            // Return the first destination that is <= current floor (from the end)
            for (let i = this.destinationFloors.length - 1; i >= 0; i--) {
                if (this.destinationFloors[i] <= this.currentFloor) {
                    return this.destinationFloors[i];
                }
            }
            return this.destinationFloors[0];
        } else {
            // If idle, return the closest destination
            return this.destinationFloors.reduce((closest, floor) => {
                const closestDistance = Math.abs(closest - this.currentFloor);
                const floorDistance = Math.abs(floor - this.currentFloor);
                return floorDistance < closestDistance ? floor : closest;
            }, this.destinationFloors[0]);
        }
    }

    public addDestination(floor: number) {
        if (!this.destinationFloors.includes(floor)) {
            this.destinationFloors.push(floor);
            this.destinationFloors.sort((a, b) => a - b);
            
            if (this.status === 'idle') {
                this.move();
            }
        }
    }

    public isIdle(): boolean {
        return this.status === 'idle';
    }

    public getDistanceToFloor(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }
}