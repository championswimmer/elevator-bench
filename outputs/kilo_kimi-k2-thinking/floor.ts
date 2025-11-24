export class Floor {
    floorNumber: number;
    upButton: HTMLButtonElement | null;
    downButton: HTMLButtonElement | null;

    constructor(floorNumber: number, totalFloors: number) {
        this.floorNumber = floorNumber;
        this.upButton = null;
        this.downButton = null;
        
        // Create floor element
        this.createFloorElement(totalFloors);
    }

    private createFloorElement(totalFloors: number) {
        const building = document.getElementById('building');
        if (!building) return;

        const floorDiv = document.createElement('div');
        floorDiv.className = 'floor';
        floorDiv.id = `floor-${this.floorNumber}`;

        const floorNumberDiv = document.createElement('div');
        floorNumberDiv.className = 'floor-number';
        floorNumberDiv.textContent = this.floorNumber.toString();
        floorDiv.appendChild(floorNumberDiv);

        const floorButtonsDiv = document.createElement('div');
        floorButtonsDiv.className = 'floor-buttons';

        // Add up button for all floors except the top floor
        if (this.floorNumber < totalFloors - 1) {
            const upButton = document.createElement('button');
            upButton.className = 'floor-button up';
            upButton.textContent = '↑ Up';
            upButton.onclick = () => this.requestElevator('up');
            floorButtonsDiv.appendChild(upButton);
            this.upButton = upButton;
        }

        // Add down button for all floors except the ground floor
        if (this.floorNumber > 0) {
            const downButton = document.createElement('button');
            downButton.className = 'floor-button down';
            downButton.textContent = '↓ Down';
            downButton.onclick = () => this.requestElevator('down');
            floorButtonsDiv.appendChild(downButton);
            this.downButton = downButton;
        }

        floorDiv.appendChild(floorButtonsDiv);
        building.appendChild(floorDiv);
    }

    private requestElevator(direction: 'up' | 'down') {
        // Call the global function that will be handled by the building
        (window as any).requestElevator(this.floorNumber, direction);
        
        // Disable button temporarily
        const button = direction === 'up' ? this.upButton : this.downButton;
        if (button) {
            button.disabled = true;
            setTimeout(() => {
                if (button) button.disabled = false;
            }, 2000);
        }
    }

    public disableButtons() {
        if (this.upButton) this.upButton.disabled = true;
        if (this.downButton) this.downButton.disabled = true;
    }

    public enableButtons() {
        if (this.upButton) this.upButton.disabled = false;
        if (this.downButton) this.downButton.disabled = false;
    }
}