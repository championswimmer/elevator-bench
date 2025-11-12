import { Building } from './Building.ts';

document.addEventListener('DOMContentLoaded', () => {
    const buildingElement = document.getElementById('building');
    if (buildingElement) {
        const NUM_FLOORS = 10;
        const NUM_ELEVATORS = 4;
        new Building(NUM_FLOORS, NUM_ELEVATORS, buildingElement);
    }
});
