import { Building } from './src/building.ts';
import type { BuildingOptions } from './src/types.ts';

declare global {
  interface Window {
    elevatorSimulator?: Building;
  }
}

function extractOptions(root: HTMLElement): Partial<BuildingOptions> {
  const { floors, elevators, secondsPerFloor, doorHoldSeconds } = root.dataset;

  const parsed: Partial<BuildingOptions> = {};

  if (floors) {
    const totalFloors = Number.parseInt(floors, 10);
    if (Number.isFinite(totalFloors) && totalFloors > 1) {
      parsed.totalFloors = totalFloors;
    }
  }

  if (elevators) {
    const elevatorCount = Number.parseInt(elevators, 10);
    if (Number.isFinite(elevatorCount) && elevatorCount > 0) {
      parsed.elevatorCount = elevatorCount;
    }
  }

  if (secondsPerFloor) {
    const value = Number.parseFloat(secondsPerFloor);
    if (Number.isFinite(value) && value > 0) {
      parsed.secondsPerFloor = value;
    }
  }

  if (doorHoldSeconds) {
    const value = Number.parseFloat(doorHoldSeconds);
    if (Number.isFinite(value) && value >= 0.3) {
      parsed.doorHoldSeconds = value;
    }
  }

  return parsed;
}

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('simulator-root');

  if (!root) {
    throw new Error('Simulator root element not found');
  }

  const options = extractOptions(root);
  const building = new Building(root, options);

  window.elevatorSimulator = building;

  window.addEventListener('beforeunload', () => {
    building.dispose();
  });
});
