import { Building } from "./building";

const DEFAULTS = {
  floorCount: 10,
  elevatorCount: 4,
  floorHeight: 56,
  travelTimeMs: 850,
  doorTimeMs: 600,
} as const;

function bootstrap(): void {
  const buildingContainer = document.getElementById("building");
  const panelsContainer = document.getElementById("control-panels");
  const queueInfoElement = document.getElementById("queue-info");

  if (!buildingContainer || !panelsContainer || !queueInfoElement) {
    throw new Error("Missing required root elements in index.html");
  }

  document.documentElement.style.setProperty("--floor-height", `${DEFAULTS.floorHeight}px`);

  const building = new Building({
    floorCount: DEFAULTS.floorCount,
    elevatorCount: DEFAULTS.elevatorCount,
    floorHeight: DEFAULTS.floorHeight,
    travelTimeMs: DEFAULTS.travelTimeMs,
    doorTimeMs: DEFAULTS.doorTimeMs,
    buildingContainer,
    panelsContainer,
    queueInfoElement,
  });

  building.init();
}

bootstrap();
