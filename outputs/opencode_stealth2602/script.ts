import { Building } from './Building';

const NUM_FLOORS = 10;
const NUM_ELEVATORS = 4;

const building = new Building(NUM_FLOORS, NUM_ELEVATORS);
building.initialize();
building.render();
