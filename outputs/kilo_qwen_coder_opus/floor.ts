import { Direction, ExternalRequest } from './types';

export class Floor {
    private floorNumber: number;
    private _hasUpButton: boolean;
    private _hasDownButton: boolean;
    private upRequestActive: boolean;
    private downRequestActive: boolean;
    
    // Callbacks
    private onUpRequest?: () => void;
    private onDownRequest?: () => void;
    private onRequestCleared?: (direction: Direction) => void;
    
    constructor(
        floorNumber: number,
        isGroundFloor: boolean,
        isTopFloor: boolean
    ) {
        this.floorNumber = floorNumber;
        this._hasUpButton = !isGroundFloor;  // Ground floor has no up button
        this._hasDownButton = !isTopFloor;   // Top floor has no down button
        this.upRequestActive = false;
        this.downRequestActive = false;
    }
    
    // Getters
    getFloorNumber(): number {
        return this.floorNumber;
    }
    
    hasUpButton(): boolean {
        return this._hasUpButton;
    }
    
    hasDownButton(): boolean {
        return this._hasDownButton;
    }
    
    isUpRequestActive(): boolean {
        return this.upRequestActive;
    }
    
    isDownRequestActive(): boolean {
        return this.downRequestActive;
    }
    
    // Set callbacks
    setUpRequestCallback(callback: () => void): void {
        this.onUpRequest = callback;
    }
    
    setDownRequestCallback(callback: () => void): void {
        this.onDownRequest = callback;
    }
    
    setRequestClearedCallback(callback: (direction: Direction) => void): void {
        this.onRequestCleared = callback;
    }
    
    // Activate up request
    activateUpRequest(): void {
        if (!this.upRequestActive && this._hasUpButton) {
            this.upRequestActive = true;
            this.onUpRequest?.();
        }
    }
    
    // Activate down request
    activateDownRequest(): void {
        if (!this.downRequestActive && this._hasDownButton) {
            this.downRequestActive = true;
            this.onDownRequest?.();
        }
    }
    
    // Clear up request
    clearUpRequest(): void {
        if (this.upRequestActive) {
            this.upRequestActive = false;
            this.onRequestCleared?.(Direction.UP);
        }
    }
    
    // Clear down request
    clearDownRequest(): void {
        if (this.downRequestActive) {
            this.downRequestActive = false;
            this.onRequestCleared?.(Direction.DOWN);
        }
    }
    
    // Get active requests as ExternalRequest objects
    getActiveRequests(): ExternalRequest[] {
        const requests: ExternalRequest[] = [];
        
        if (this.upRequestActive) {
            requests.push({
                floor: this.floorNumber,
                direction: Direction.UP,
                timestamp: Date.now(),
                assignedElevatorId: null
            });
        }
        
        if (this.downRequestActive) {
            requests.push({
                floor: this.floorNumber,
                direction: Direction.DOWN,
                timestamp: Date.now(),
                assignedElevatorId: null
            });
        }
        
        return requests;
    }
    
    // Check if any request is active
    hasActiveRequest(): boolean {
        return this.upRequestActive || this.downRequestActive;
    }
}
