export type Direction = 'up' | 'down' | 'idle';
export type ElevatorState = 'idle' | 'moving' | 'opening' | 'closing';

export class Elevator {
    public id: number;
    public currentFloor: number;
    public targetFloors: number[];
    public direction: Direction;
    public state: ElevatorState;
    private element: HTMLElement | null;
    private buttonsElement: HTMLElement | null;

    constructor(id: number) {
        this.id = id;
        this.currentFloor = 0;
        this.targetFloors = [];
        this.direction = 'idle';
        this.state = 'idle';
        this.element = null;
        this.buttonsElement = null;
    }

    public get isIdle(): boolean {
        return this.state === 'idle';
    }

    public addTarget(floor: number): void {
        if (!this.targetFloors.includes(floor)) {
            this.targetFloors.push(floor);
            this.targetFloors.sort((a, b) => {
                if (this.direction === 'up') return a - b;
                if (this.direction === 'down') return b - a;
                return a - b;
            });
        }
    }

    public removeTarget(floor: number): number {
        const index = this.targetFloors.indexOf(floor);
        if (index > -1) {
            this.targetFloors.splice(index, 1);
        }
        return this.targetFloors.length;
    }

    public getNextTarget(): number | null {
        if (this.targetFloors.length === 0) return null;
        
        if (this.direction === 'up') {
            const aboveFloors = this.targetFloors.filter(f => f > this.currentFloor);
            if (aboveFloors.length > 0) return aboveFloors[0];
            return this.targetFloors[0];
        }
        
        if (this.direction === 'down') {
            const belowFloors = this.targetFloors.filter(f => f < this.currentFloor);
            if (belowFloors.length > 0) return belowFloors[0];
            return this.targetFloors[0];
        }
        
        return this.targetFloors[0];
    }

    public setDirection(dir: Direction): void {
        this.direction = dir;
        if (dir !== 'idle') {
            this.state = 'moving';
        }
    }

    public updatePosition(totalFloors: number): void {
        if (!this.element) return;
        
        const floorHeight = 75;
        const bottomPosition = this.currentFloor * floorHeight;
        this.element.style.bottom = `${bottomPosition}px`;
        
        this.element.classList.remove('moving-up', 'moving-down');
        if (this.direction === 'up') {
            this.element.classList.add('moving-up');
        } else if (this.direction === 'down') {
            this.element.classList.add('moving-down');
        }
    }

    public render(totalFloors: number, container: HTMLElement): void {
        const shaft = document.createElement('div');
        shaft.className = 'elevator-shaft';
        
        const elevator = document.createElement('div');
        elevator.className = 'elevator';
        elevator.id = `elevator-${this.id}`;
        
        const numberDisplay = document.createElement('div');
        numberDisplay.className = 'elevator-number';
        numberDisplay.textContent = String(this.id);
        
        const doors = document.createElement('div');
        doors.className = 'elevator-doors';
        const leftDoor = document.createElement('div');
        leftDoor.className = 'door';
        const rightDoor = document.createElement('div');
        rightDoor.className = 'door';
        doors.appendChild(leftDoor);
        doors.appendChild(rightDoor);
        
        elevator.appendChild(numberDisplay);
        elevator.appendChild(doors);
        
        const buttons = document.createElement('div');
        buttons.className = 'elevator-buttons';
        buttons.id = `elevator-${this.id}-buttons`;
        
        for (let i = 0; i < totalFloors; i++) {
            const btn = document.createElement('button');
            btn.className = 'elevator-btn';
            btn.textContent = String(i);
            btn.addEventListener('click', () => {
                this.addTarget(i);
                btn.classList.add('lit');
                window.dispatchEvent(new CustomEvent('elevatorRequest', { 
                    detail: { elevatorId: this.id, floor: i } 
                }));
            });
            buttons.appendChild(btn);
        }
        
        shaft.appendChild(elevator);
        shaft.appendChild(buttons);
        container.appendChild(shaft);
        
        this.element = elevator;
        this.buttonsElement = buttons;
        
        this.updatePosition(totalFloors);
    }

    public clearFloorButton(floor: number): void {
        if (!this.buttonsElement) return;
        const buttons = this.buttonsElement.querySelectorAll('.elevator-btn');
        buttons.forEach(btn => {
            if (btn.textContent === String(floor)) {
                btn.classList.remove('lit');
            }
        });
    }
}
