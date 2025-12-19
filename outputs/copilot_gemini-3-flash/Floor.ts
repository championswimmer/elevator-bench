export enum Direction {
    UP = 'UP',
    DOWN = 'DOWN',
    IDLE = 'IDLE'
}

export class Floor {
    public floorNumber: number;
    public upButtonActive: boolean = false;
    public downButtonActive: boolean = false;

    constructor(floorNumber: number) {
        this.floorNumber = floorNumber;
    }

    public activateButton(direction: Direction) {
        if (direction === Direction.UP) {
            this.upButtonActive = true;
        } else if (direction === Direction.DOWN) {
            this.downButtonActive = true;
        }
    }

    public deactivateButton(direction: Direction) {
        if (direction === Direction.UP) {
            this.upButtonActive = false;
        } else if (direction === Direction.DOWN) {
            this.downButtonActive = false;
        }
    }
}
