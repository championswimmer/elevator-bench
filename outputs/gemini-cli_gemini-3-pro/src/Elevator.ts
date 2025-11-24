import { CONFIG } from './Config';

export type ElevatorState = 'IDLE' | 'MOVING' | 'DOOR_OPEN';
export type Direction = 'UP' | 'DOWN' | 'IDLE';

export class Elevator {
    public readonly id: number;
    public currentFloor: number = 0;
    public state: ElevatorState = 'IDLE';
    public direction: Direction = 'IDLE';
    
    // Destination Queue: Sorted set of floors to visit
    // We need to separate requests by direction to implement "scan" algorithm properly
    private requests: Set<number> = new Set();
    
    private element: HTMLElement;
    private controlPanel: HTMLElement;
    private doorLeft: HTMLElement;
    private doorRight: HTMLElement;
    private infoDisplay: HTMLElement;
    private panelButtons: Map<number, HTMLButtonElement> = new Map();

    private updateCallback: () => void; // To notify Building of state changes

    constructor(id: number, updateCallback: () => void) {
        this.id = id;
        this.updateCallback = updateCallback;
        this.element = this.createDOM();
        this.controlPanel = this.createControlPanel();
    }

    private createControlPanel(): HTMLElement {
        const panel = document.createElement('div');
        panel.className = 'elevator-panel';
        
        for (let i = 0; i < CONFIG.FLOOR_COUNT; i++) {
            const btn = document.createElement('button');
            btn.className = 'panel-btn';
            btn.textContent = `${i}`;
            btn.onclick = () => {
                this.addRequest(i);
                btn.classList.add('active');
            };
            this.panelButtons.set(i, btn);
            panel.appendChild(btn);
        }
        return panel;
    }

    private createDOM(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'elevator';
        
        this.doorLeft = document.createElement('div');
        this.doorLeft.className = 'door-left';
        this.doorRight = document.createElement('div');
        this.doorRight.className = 'door-right';
        
        const doors = document.createElement('div');
        doors.className = 'elevator-doors';
        doors.appendChild(this.doorLeft);
        doors.appendChild(this.doorRight);

        this.infoDisplay = document.createElement('div');
        this.infoDisplay.className = 'elevator-info';
        this.infoDisplay.textContent = `${this.id}`;

        el.appendChild(doors);
        el.appendChild(this.infoDisplay);
        
        return el;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public getControlPanel(): HTMLElement {
        return this.controlPanel;
    }

    public addRequest(floor: number) {
        if (this.requests.has(floor)) return;
        
        this.requests.add(floor);
        this.updateState();
    }

    public isIdle(): boolean {
        return this.state === 'IDLE';
    }

    public getDistanceTo(floor: number): number {
        return Math.abs(this.currentFloor - floor);
    }

    private updateState() {
        if (this.state !== 'IDLE') return; // Already busy
        if (this.requests.size === 0) return; // Nothing to do

        this.processNextMove();
    }

    private getNextFloor(): number | null {
        if (this.requests.size === 0) return null;

        const floors = Array.from(this.requests).sort((a, b) => a - b);
        
        // Simple logic: If moving UP, find closest floor above. If DOWN, closest below.
        // If IDLE, just go to closest.
        
        if (this.direction === 'UP') {
            const nextAbove = floors.find(f => f >= this.currentFloor);
            if (nextAbove !== undefined) return nextAbove;
            // No more above, switch direction if needed
            return floors[floors.length - 1]; // Go to highest request (which is below now)
        } else if (this.direction === 'DOWN') {
            const nextBelow = floors.slice().reverse().find(f => f <= this.currentFloor);
            if (nextBelow !== undefined) return nextBelow;
            return floors[0]; // Go to lowest request
        } else {
            // IDLE, pick closest
            return floors.reduce((prev, curr) => 
                Math.abs(curr - this.currentFloor) < Math.abs(prev - this.currentFloor) ? curr : prev
            );
        }
    }

    private async processNextMove() {
        const nextFloor = this.getNextFloor();
        
        if (nextFloor === null) {
            this.state = 'IDLE';
            this.direction = 'IDLE';
            this.element.classList.remove('busy');
            this.updateCallback();
            return;
        }

        this.state = 'MOVING';
        this.element.classList.add('busy');

        if (nextFloor > this.currentFloor) {
            this.direction = 'UP';
        } else if (nextFloor < this.currentFloor) {
            this.direction = 'DOWN';
        } else {
            // Already at floor
            this.direction = this.direction === 'IDLE' ? 'IDLE' : this.direction; // Keep direction if we were moving
            await this.openDoors(nextFloor);
            return;
        }

        // Calculate duration
        const floorsToTravel = Math.abs(nextFloor - this.currentFloor);
        const duration = floorsToTravel * CONFIG.SPEED_PER_FLOOR;

        // Animate
        this.element.style.transition = `bottom ${duration}ms linear`;
        this.element.style.bottom = `${nextFloor * CONFIG.FLOOR_HEIGHT}px`;

        // Wait for arrival
        setTimeout(async () => {
            this.currentFloor = nextFloor;
            this.element.style.transition = ''; // Reset transition
            await this.openDoors(nextFloor);
        }, duration);
    }

    private async openDoors(floor: number) {
        this.state = 'DOOR_OPEN';
        this.element.classList.add('open');
        this.requests.delete(floor);
        
        // Clear internal button
        const btn = this.panelButtons.get(floor);
        if (btn) btn.classList.remove('active');

        // Notify building to clear floor button
        // We need a way to tell building "I arrived at X"
        // We can use a custom event or callback. 
        // For now, we will emit a custom event on the window or call a method if passed.
        // Let's dispatch a custom event.
        const event = new CustomEvent('elevatorArrived', { 
            detail: { floor: floor, direction: this.direction, elevatorId: this.id } 
        });
        window.dispatchEvent(event);

        setTimeout(() => {
            this.element.classList.remove('open');
            // After doors close, check next
            this.state = 'IDLE'; 
            // Re-evaluate state immediately
            this.updateState(); 
            
            // If no more requests, go truly idle
            if (this.requests.size === 0) {
                this.direction = 'IDLE';
                this.element.classList.remove('busy');
                this.updateCallback();
            }
        }, CONFIG.DOOR_OPEN_TIME);
    }
}
