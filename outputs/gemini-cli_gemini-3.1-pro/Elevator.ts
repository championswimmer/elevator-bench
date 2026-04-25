import { Building } from './Building.ts';

export type Direction = 'UP' | 'DOWN' | 'IDLE';

export class Elevator {
    id: number;
    building: Building;
    currentFloor: number = 0;
    direction: Direction = 'IDLE';
    state: 'IDLE' | 'MOVING' | 'DOORS_OPEN' = 'IDLE';
    destinations: Set<number> = new Set();
    
    element: HTMLElement;
    panelElement: HTMLElement;
    doorsElement: HTMLElement;
    
    constructor(id: number, building: Building) {
        this.id = id;
        this.building = building;
        this.element = this.createElement();
        this.doorsElement = this.element.querySelector('.elevator-doors') as HTMLElement;
        this.panelElement = this.element.querySelector('.elevator-panel') as HTMLElement;
    }
    
    createElement(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'elevator';
        el.style.bottom = '2px';
        
        const doors = document.createElement('div');
        doors.className = 'elevator-doors';
        const doorLeft = document.createElement('div');
        doorLeft.className = 'door-left';
        const doorRight = document.createElement('div');
        doorRight.className = 'door-right';
        doors.appendChild(doorLeft);
        doors.appendChild(doorRight);
        el.appendChild(doors);

        const panel = document.createElement('div');
        panel.className = 'elevator-panel';
        
        for (let i = this.building.numFloors - 1; i >= 0; i--) {
            const btn = document.createElement('div');
            btn.className = 'elevator-btn';
            btn.innerText = i.toString();
            btn.onclick = () => {
                btn.classList.add('active');
                this.addStop(i);
            };
            panel.appendChild(btn);
        }
        el.appendChild(panel);
        
        return el;
    }
    
    getElement() {
        return this.element;
    }
    
    addStop(floorNum: number) {
        if (floorNum === this.currentFloor && this.state !== 'MOVING') {
            this.openDoors();
            return;
        }
        
        this.destinations.add(floorNum);
        this.updateInnerButtons();
        
        if (this.state === 'IDLE') {
            this.determineDirectionAndMove();
        }
    }
    
    updateInnerButtons() {
        const btns = this.panelElement.querySelectorAll('.elevator-btn');
        btns.forEach(btn => {
            const floor = parseInt((btn as HTMLElement).innerText);
            if (this.destinations.has(floor)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    determineDirectionAndMove() {
        if (this.destinations.size === 0) {
            this.state = 'IDLE';
            this.direction = 'IDLE';
            return;
        }

        if (this.direction === 'IDLE') {
             const dests = Array.from(this.destinations);
             let closest = dests[0];
             let minD = Math.abs(closest - this.currentFloor);
             for (const d of dests) {
                 if (Math.abs(d - this.currentFloor) < minD) {
                     closest = d;
                     minD = Math.abs(d - this.currentFloor);
                 }
             }
             this.direction = closest > this.currentFloor ? 'UP' : 'DOWN';
        }

        const destsInDir = Array.from(this.destinations).filter(f => 
            this.direction === 'UP' ? f > this.currentFloor : f < this.currentFloor
        );

        if (destsInDir.length === 0) {
            const destsInOppositeDir = Array.from(this.destinations).filter(f => 
                this.direction === 'UP' ? f < this.currentFloor : f > this.currentFloor
            );
            if (destsInOppositeDir.length > 0) {
                this.direction = this.direction === 'UP' ? 'DOWN' : 'UP';
            } else {
                this.state = 'IDLE';
                this.direction = 'IDLE';
                return;
            }
        }

        this.moveOneFloor();
    }
    
    moveOneFloor() {
        if (this.destinations.size === 0) {
            this.state = 'IDLE';
            this.direction = 'IDLE';
            return;
        }

        this.state = 'MOVING';
        
        const nextFloor = this.direction === 'UP' ? this.currentFloor + 1 : this.currentFloor - 1;
        
        this.element.style.bottom = `${(nextFloor * 100) + 2}px`;
        
        setTimeout(() => {
            this.currentFloor = nextFloor;
            
            if (this.destinations.has(this.currentFloor)) {
                this.destinations.delete(this.currentFloor);
                this.updateInnerButtons();
                this.building.clearFloorRequest(this.currentFloor, this.direction);
                this.openDoors();
            } else {
                this.determineDirectionAndMove();
            }
        }, 1000); 
    }
    
    openDoors() {
        this.state = 'DOORS_OPEN';
        this.element.classList.add('open');
        
        this.building.clearFloorRequest(this.currentFloor, 'UP');
        this.building.clearFloorRequest(this.currentFloor, 'DOWN');
        
        setTimeout(() => {
            this.element.classList.remove('open');
            setTimeout(() => {
                this.determineDirectionAndMove();
            }, 500); 
        }, 2000); 
    }
}