export class Floor {
    public readonly level: number;
    private element: HTMLElement;
    private btnUp: HTMLButtonElement | null = null;
    private btnDown: HTMLButtonElement | null = null;
    private requestCallback: (floor: number, direction: 'UP' | 'DOWN') => void;

    constructor(level: number, requestCallback: (floor: number, direction: 'UP' | 'DOWN') => void) {
        this.level = level;
        this.requestCallback = requestCallback;
        this.element = this.createDOM();
    }

    private createDOM(): HTMLElement {
        const div = document.createElement('div');
        div.className = 'floor-control';
        
        const label = document.createElement('span');
        label.className = 'floor-label';
        label.textContent = `Floor ${this.level}`;
        div.appendChild(label);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'floor-buttons';

        // Up Button (not on top floor)
        if (this.level < 9) { // Hardcoded 9 based on config 10-1, can be passed in
            this.btnUp = document.createElement('button');
            this.btnUp.className = 'floor-btn btn-up';
            this.btnUp.innerHTML = '▲';
            this.btnUp.onclick = () => this.handleRequest('UP');
            btnGroup.appendChild(this.btnUp);
        }

        // Down Button (not on bottom floor)
        if (this.level > 0) {
            this.btnDown = document.createElement('button');
            this.btnDown.className = 'floor-btn btn-down';
            this.btnDown.innerHTML = '▼';
            this.btnDown.onclick = () => this.handleRequest('DOWN');
            btnGroup.appendChild(this.btnDown);
        }

        div.appendChild(btnGroup);
        return div;
    }

    private handleRequest(direction: 'UP' | 'DOWN') {
        this.requestCallback(this.level, direction);
        this.setButtonActive(direction, true);
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public setButtonActive(direction: 'UP' | 'DOWN', active: boolean) {
        if (direction === 'UP' && this.btnUp) {
            active ? this.btnUp.classList.add('active') : this.btnUp.classList.remove('active');
        } else if (direction === 'DOWN' && this.btnDown) {
            active ? this.btnDown.classList.add('active') : this.btnDown.classList.remove('active');
        }
    }
}
