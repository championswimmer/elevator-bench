import { Building } from './Building.ts';

document.addEventListener('DOMContentLoaded', () => {
    const building = new Building(10, 4);
    building.init('building-container');
});