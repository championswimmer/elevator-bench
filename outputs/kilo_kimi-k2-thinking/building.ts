import { Elevator, ElevatorDirection } from './elevator';
import { Floor } from './floor';

export class Building {
    floors: Floor[];
    elevators: Elevator[];
    totalFloors: number;
    totalElevators: number;

    constructor(totalFloors: number = 10, totalElevators: number = 4) {
        this.totalFloors = totalFloors;
        this.totalElevators = totalElevators;
        this.floors = [];
        this.elevators = [];
        
        this.initializeBuilding();
    }

    private initializeBuilding() {
        // Create floors
        for (let i = 0; i < this.totalFloors; i++) {
            this.floors.push(new Floor(i, this.totalFloors));
        }
        
        // Create elevators
        for (let i = 0; i < this.totalElevators; i++) {
            this.elevators.push(new Elevator(i, this.totalFloors));
        }
    }

    public requestElevator(fromFloor: number, direction: 'up' | 'down') {
        console.log(`Elevator requested from floor ${fromFloor} going ${direction}`);
        
        // Find the best elevator to handle this request
        const bestElevator = this.findBestElevator(fromFloor, direction);
        
        if (bestElevator) {
            console.log(`Elevator ${bestElevator.id} assigned to floor ${fromFloor}`);
            bestElevator.addDestination(fromFloor);
        } else {
            // If no elevator is available, queue the request
            console.log(`No elevator available, queuing request for floor ${fromFloor}`);
            // In a more complete implementation, we would queue this request
            // and assign it when an elevator becomes available
        }
    }

    private findBestElevator(fromFloor: number, direction: 'up' | 'down'): Elevator | null {
        // First, look for an idle elevator
        const idleElevators = this.elevators.filter(elevator => elevator.isIdle());
        if (idleElevators.length > 0) {
            // Find the closest idle elevator
            return idleElevators.reduce((closest, elevator) => {
                const closestDistance = closest.getDistanceToFloor(fromFloor);
                const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
                return elevatorDistance < closestDistance ? elevator : closest;
            }, idleElevators[0]);
        }
        
        // If no idle elevators, find the best moving elevator
        // This should be an elevator that is:
        // 1. Moving in the same direction
        // 2. Hasn't passed the requested floor yet
        // 3. Is closest to the requested floor
        
        const movingElevators = this.elevators.filter(elevator => !elevator.isIdle());
        const suitableElevators = movingElevators.filter(elevator => {
            if (direction === 'up' && elevator.direction === 'up') {
                return elevator.currentFloor <= fromFloor;
            } else if (direction === 'down' && elevator.direction === 'down') {
                return elevator.currentFloor >= fromFloor;
            }
            return false;
        });
        
        if (suitableElevators.length > 0) {
            // Find the closest suitable elevator
            return suitableElevators.reduce((closest, elevator) => {
                const closestDistance = closest.getDistanceToFloor(fromFloor);
                const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
                return elevatorDistance < closestDistance ? elevator : closest;
            }, suitableElevators[0]);
        }
        
        // If no suitable moving elevator, return the closest elevator overall
        return this.elevators.reduce((closest, elevator) => {
            const closestDistance = closest.getDistanceToFloor(fromFloor);
            const elevatorDistance = elevator.getDistanceToFloor(fromFloor);
            return elevatorDistance < closestDistance ? elevator : closest;
        }, this.elevators[0]);
    }

    public reset() {
        // Reset all elevators to ground floor
        this.elevators.forEach(elevator => {
            elevator.destinationFloors = [];
            elevator.direction = 'idle';
            elevator.status = 'idle';
            elevator.currentFloor = 0;
            
            // Reset UI
            if (elevator.element) {
                elevator.element.style.transform = 'translateY(0px)';
                elevator.element.classList.remove('doors-open');
            }
            
            // Reset destination buttons
            elevator.destinationButtons.forEach(button => {
                button.classList.remove('active');
            });
        });
        
        // Re-enable all floor buttons
        this.floors.forEach(floor => {
            floor.enableButtons();
        });
    }
}