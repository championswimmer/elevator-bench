import { Building } from './Building';

const TOTAL_FLOORS = 10;
const NUMBER_OF_ELEVATORS = 4;

document.addEventListener('DOMContentLoaded', () => {
    new Building(TOTAL_FLOORS, NUMBER_OF_ELEVATORS);
});
