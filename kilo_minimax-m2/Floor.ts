import { ElevatorDirection, ElevatorRequest } from './Elevator';

export interface FloorRequest {
    elevatorId: number;
    assignedAt: number;
    estimatedArrival?: number;
}

export class Floor {
    public floorNumber: number;
    public isTopFloor: boolean;
    public isBottomFloor: boolean;
    public upButton: HTMLElement | null;
    public downButton: HTMLElement | null;
    public onRequest?: (request: ElevatorRequest) => void;
    
    private requestQueue: ElevatorRequest[];
    private activeRequests: Map<string, FloorRequest>;
    private isActive: boolean;
    private activeDirection: ElevatorDirection | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.isTopFloor = floorNumber === totalFloors - 1;
        this.isBottomFloor = floorNumber === 0;
        this.upButton = null;
        this.downButton = null;
        this.requestQueue = [];
        this.activeRequests = new Map();
        this.isActive = false;
        this.activeDirection = null;
    }

    /**
     * Create floor button elements
     */
    public createButtonElements(): { upBtn: HTMLElement; downBtn: HTMLElement } {
        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.setAttribute('data-floor', this.floorNumber.toString());

        const label = document.createElement('div');
        label.className = 'floor-label';
        label.textContent = this.floorNumber.toString();
        floorDiv.appendChild(label);

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.display = 'flex';
        buttonsContainer.style.flexDirection = 'column';
        buttonsContainer.style.gap = '4px';

        // Create up button (except for top floor)
        if (!this.isTopFloor) {
            const upBtn = document.createElement('button');
            upBtn.className = 'floor-btn up';
            upBtn.textContent = '↑';
            upBtn.setAttribute('data-direction', 'up');
            upBtn.setAttribute('data-floor', this.floorNumber.toString());
            upBtn.addEventListener('click', () => this.requestElevator(ElevatorDirection.UP));
            buttonsContainer.appendChild(upBtn);
            this.upButton = upBtn;
        }

        // Create down button (except for bottom floor)
        if (!this.isBottomFloor) {
            const downBtn = document.createElement('button');
            downBtn.className = 'floor-btn down';
            downBtn.textContent = '↓';
            downBtn.setAttribute('data-direction', 'down');
            downBtn.setAttribute('data-floor', this.floorNumber.toString());
            downBtn.addEventListener('click', () => this.requestElevator(ElevatorDirection.DOWN));
            buttonsContainer.appendChild(downBtn);
            this.downButton = downBtn;
        }

        floorDiv.appendChild(buttonsContainer);

        return {
            upBtn: this.upButton!,
            downBtn: this.downButton!
        };
    }

    /**
     * Request an elevator from this floor
     */
    public requestElevator(direction: ElevatorDirection): void {
        const request: ElevatorRequest = {
            floor: this.floorNumber,
            direction,
            timestamp: Date.now()
        };

        // Create unique key for this request
        const requestKey = `${this.floorNumber}-${direction}`;

        // Only add if not already in queue or actively being served
        if (!this.activeRequests.has(requestKey) && 
            !this.requestQueue.find(r => r.floor === this.floorNumber && r.direction === direction)) {
            
            this.requestQueue.push(request);
            this.activateButton(direction);
            
            if (this.onRequest) {
                this.onRequest(request);
            }

            this.logRequest(request);
        }
    }

    /**
     * Activate/deactivate floor button visual state
     */
    private activateButton(direction: ElevatorDirection): void {
        const button = direction === ElevatorDirection.UP ? this.upButton : this.downButton;
        if (button) {
            button.classList.add('active');
            this.isActive = true;
            this.activeDirection = direction;
        }
    }

    /**
     * Deactivate floor button
     */
    private deactivateButton(direction: ElevatorDirection): void {
        const button = direction === ElevatorDirection.UP ? this.upButton : this.downButton;
        if (button) {
            button.classList.remove('active');
        }

        // Check if this was the last active direction
        const otherDirection = direction === ElevatorDirection.UP ? ElevatorDirection.DOWN : ElevatorDirection.UP;
        const otherButton = otherDirection === ElevatorDirection.UP ? this.upButton : this.downButton;
        
        if (!otherButton || !otherButton.classList.contains('active')) {
            this.isActive = false;
            this.activeDirection = null;
        }
    }

    /**
     * Remove request from queue when elevator arrives
     */
    public removeRequest(request: ElevatorRequest): void {
        const requestKey = `${request.floor}-${request.direction}`;
        this.activeRequests.delete(requestKey);
        this.deactivateButton(request.direction);

        // Remove from queue if present
        this.requestQueue = this.requestQueue.filter(
            r => !(r.floor === request.floor && r.direction === request.direction)
        );
    }

    /**
     * Assign elevator to serve this request
     */
    public assignElevator(request: ElevatorRequest, elevatorId: number): void {
        const requestKey = `${request.floor}-${request.direction}`;
        this.activeRequests.set(requestKey, {
            elevatorId,
            assignedAt: Date.now()
        });
    }

    /**
     * Get pending requests for this floor
     */
    public getPendingRequests(): ElevatorRequest[] {
        return [...this.requestQueue];
    }

    /**
     * Check if floor has active requests
     */
    public hasActiveRequests(): boolean {
        return this.activeRequests.size > 0 || this.requestQueue.length > 0;
    }

    /**
     * Get all active requests
     */
    public getActiveRequests(): FloorRequest[] {
        return Array.from(this.activeRequests.values());
    }

    /**
     * Get elevator requests for a specific direction
     */
    public getRequestsForDirection(direction: ElevatorDirection): ElevatorRequest[] {
        return this.requestQueue.filter(r => r.direction === direction);
    }

    /**
     * Reset floor to initial state
     */
    public reset(): void {
        this.requestQueue = [];
        this.activeRequests.clear();
        this.isActive = false;
        this.activeDirection = null;

        // Reset button states
        if (this.upButton) {
            this.upButton.classList.remove('active');
        }
        if (this.downButton) {
            this.downButton.classList.remove('active');
        }
    }

    /**
     * Get floor info for display
     */
    public getInfo(): {
        floorNumber: number;
        isActive: boolean;
        activeDirection: ElevatorDirection | null;
        pendingRequests: number;
        activeRequests: number;
    } {
        return {
            floorNumber: this.floorNumber,
            isActive: this.isActive,
            activeDirection: this.activeDirection,
            pendingRequests: this.requestQueue.length,
            activeRequests: this.activeRequests.size
        };
    }

    /**
     * Log floor request activity
     */
    private logRequest(request: ElevatorRequest): void {
        const directionText = request.direction === ElevatorDirection.UP ? 'UP' : 'DOWN';
        console.log(`Floor ${this.floorNumber}: Elevator requested going ${directionText}`);
    }
}