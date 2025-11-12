// Elevator class to manage elevator state and behavior
export class Elevator {
    id: number;
    currentFloor: number;
    targetFloors: number[];
    moving: boolean;
    direction: 'up' | 'down' | 'idle'; // 'up', 'down', or 'idle'
    doorsOpen: boolean;
    busy: boolean;
    animationProgress: number; // For smooth animation
    animationSpeed: number; // Animation speed factor

    constructor(id: number, floors: number) {
        try {
            this.id = id;
            this.currentFloor = 0; // All elevators start at ground floor
            this.targetFloors = [];
            this.moving = false;
            this.direction = 'idle';
            this.doorsOpen = false;
            this.busy = false;
            this.animationProgress = 0;
            this.animationSpeed = 0.02; // Adjust for smoother animation
        } catch (error) {
            console.error(`Error initializing elevator ${id}:`, error);
            throw new Error(`Failed to initialize elevator ${id}`);
        }
    }

    // Add a floor to the target list
    addTargetFloor(floor: number): void {
        if (!this.targetFloors.includes(floor)) {
            this.targetFloors.push(floor);
            this.sortTargetFloors();
        }
    }

    // Sort target floors based on current direction
    sortTargetFloors(): void {
        if (this.direction === 'up') {
            // For up direction, sort ascending but only process floors above current
            this.targetFloors.sort((a, b) => a - b);
        } else if (this.direction === 'down') {
            // For down direction, sort descending but only process floors below current
            this.targetFloors.sort((a, b) => b - a);
        } else {
            // If idle, sort by closest floor first
            this.targetFloors.sort((a, b) => Math.abs(a - this.currentFloor) - Math.abs(b - this.currentFloor));
        }
        
        // Set direction based on first target if currently idle
        if (this.direction === 'idle' && this.targetFloors.length > 0) {
            this.direction = this.targetFloors[0] > this.currentFloor ? 'up' : 'down';
        }
    }

    // Remove a floor from the target list
    removeTargetFloor(floor: number): void {
        this.targetFloors = this.targetFloors.filter(f => f !== floor);
        
        // If no more targets, set to idle
        if (this.targetFloors.length === 0) {
            this.direction = 'idle';
        }
    }

    // Move to the next floor with animation support
    move(): void {
        if (this.targetFloors.length === 0) {
            this.moving = false;
            this.direction = 'idle';
            this.animationProgress = 0;
            return;
        }

        this.moving = true;
        
        // Animate movement between floors
        if (this.animationProgress < 1) {
            this.animationProgress += this.animationSpeed;
            return; // Still animating, don't change floors yet
        }
        
        // Animation complete, move to next floor
        this.animationProgress = 0;
        
        // Determine next target floor based on direction
        const nextTarget = this.getNextTarget();
        
        if (nextTarget === null) {
            this.direction = 'idle';
            return;
        }
        
        // Move toward the target floor
        if (nextTarget > this.currentFloor) {
            this.currentFloor++;
            this.direction = 'up';
        } else if (nextTarget < this.currentFloor) {
            this.currentFloor--;
            this.direction = 'down';
        }
        
        // Check if we've reached a target floor
        if (this.targetFloors.includes(this.currentFloor)) {
            this.openDoors();
            this.removeTargetFloor(this.currentFloor);
            
            // If no more targets in current direction, check if we need to change direction
            if (this.targetFloors.length > 0) {
                // Check if we've reached the end of our current direction
                const maxTarget = Math.max(...this.targetFloors);
                const minTarget = Math.min(...this.targetFloors);
                
                // If going up and reached highest target, or going down and reached lowest target
                if ((this.direction === 'up' && this.currentFloor >= maxTarget) ||
                    (this.direction === 'down' && this.currentFloor <= minTarget)) {
                    // Change direction
                    this.direction = this.direction === 'up' ? 'down' : 'up';
                    this.sortTargetFloors();
                }
            }
        }
    }

    // Check if elevator is moving in a specific direction
    isMovingTowards(floor: number): boolean {
        if (this.direction === 'idle') return false;
        if (this.direction === 'up' && floor > this.currentFloor) return true;
        if (this.direction === 'down' && floor < this.currentFloor) return true;
        return false;
    }

    // Check if elevator will serve a floor in its current path
    willServeFloor(floor: number): boolean {
        if (this.targetFloors.includes(floor)) return true;
        if (this.direction === 'up' && floor > this.currentFloor) return true;
        if (this.direction === 'down' && floor < this.currentFloor) return true;
        return false;
    }

    // Open elevator doors
    openDoors(): void {
        this.doorsOpen = true;
        this.busy = true;
        console.log(`Elevator ${this.id} doors opened at floor ${this.currentFloor}`);
        
        // Close doors after delay
        setTimeout(() => {
            this.closeDoors();
        }, 2000); // 2 seconds
    }

    // Close elevator doors
    closeDoors(): void {
        this.doorsOpen = false;
        this.busy = false;
        console.log(`Elevator ${this.id} doors closed at floor ${this.currentFloor}`);
    }

    // Check if elevator is idle
    isIdle(): boolean {
        return this.direction === 'idle' && !this.busy && this.targetFloors.length === 0;
    }

    // Get the next target floor
    getNextTarget(): number | null {
        if (this.targetFloors.length === 0) return null;
        
        if (this.direction === 'up') {
            // Find the next floor above current floor
            const aboveFloors = this.targetFloors.filter(floor => floor >= this.currentFloor);
            return aboveFloors.length > 0 ? Math.min(...aboveFloors) : null;
        } else if (this.direction === 'down') {
            // Find the next floor below current floor
            const belowFloors = this.targetFloors.filter(floor => floor <= this.currentFloor);
            return belowFloors.length > 0 ? Math.max(...belowFloors) : null;
        } else {
            // If idle, return the closest floor
            return this.targetFloors.length > 0 ? this.targetFloors[0] : null;
        }
    }
}