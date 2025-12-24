/**
 * Floor class representing a single floor in the building
 */
export class Floor {
    private floorNumber: number;
    private upButtonActive: boolean = false;
    private downButtonActive: boolean = false;

    constructor(floorNumber: number) {
        this.floorNumber = floorNumber;
    }

    /**
     * Get the floor number
     */
    getFloorNumber(): number {
        return this.floorNumber;
    }

    /**
     * Check if this is the ground floor (floor 0)
     */
    isGroundFloor(): boolean {
        return this.floorNumber === 0;
    }

    /**
     * Check if this is the top floor
     */
    isTopFloor(): boolean {
        return this.floorNumber === 9; // Assuming 10 floors (0-9)
    }

    /**
     * Get/Set up button state
     */
    getUpButtonActive(): boolean {
        return this.upButtonActive;
    }

    setUpButtonActive(active: boolean): void {
        this.upButtonActive = active;
    }

    /**
     * Get/Set down button state
     */
    getDownButtonActive(): boolean {
        return this.downButtonActive;
    }

    setDownButtonActive(active: boolean): void {
        this.downButtonActive = active;
    }

    /**
     * Reset all button states
     */
    resetButtons(): void {
        this.upButtonActive = false;
        this.downButtonActive = false;
    }
}
