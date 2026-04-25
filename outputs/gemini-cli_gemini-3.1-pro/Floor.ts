import { Building } from './Building.ts';

export class Floor {
    floorNum: number;
    building: Building;
    element: HTMLElement;
    upBtn: HTMLButtonElement | null = null;
    downBtn: HTMLButtonElement | null = null;

    constructor(floorNum: number, building: Building) {
        this.floorNum = floorNum;
        this.building = building;
        this.element = this.createElement();
    }

    createElement(): HTMLElement {
        const el = document.createElement('div');
        el.className = 'floor';
        
        const label = document.createElement('div');
        label.className = 'floor-label';
        label.innerText = `F${this.floorNum}`;
        el.appendChild(label);

        const controls = document.createElement('div');
        controls.className = 'floor-controls';
        
        if (this.floorNum < this.building.numFloors - 1) {
            this.upBtn = document.createElement('button');
            this.upBtn.className = 'floor-btn up-btn';
            this.upBtn.innerText = '▲';
            this.upBtn.onclick = () => {
                if (this.upBtn) this.upBtn.classList.add('active');
                this.building.requestElevator(this.floorNum, 'UP');
            };
            controls.appendChild(this.upBtn);
        }
        
        if (this.floorNum > 0) {
            this.downBtn = document.createElement('button');
            this.downBtn.className = 'floor-btn down-btn';
            this.downBtn.innerText = '▼';
            this.downBtn.onclick = () => {
                if (this.downBtn) this.downBtn.classList.add('active');
                this.building.requestElevator(this.floorNum, 'DOWN');
            };
            controls.appendChild(this.downBtn);
        }
        
        el.appendChild(controls);
        return el;
    }

    getElement() {
        return this.element;
    }
    
    clearRequest(direction: 'UP' | 'DOWN' | 'BOTH') {
        if ((direction === 'UP' || direction === 'BOTH') && this.upBtn) {
            this.upBtn.classList.remove('active');
        }
        if ((direction === 'DOWN' || direction === 'BOTH') && this.downBtn) {
            this.downBtn.classList.remove('active');
        }
    }
}