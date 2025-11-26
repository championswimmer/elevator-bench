import { DEFAULT_CONFIG } from "./config.ts";
import { Building } from "./building.ts";

declare global {
  interface Window {
    simulator?: Building;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const building = new Building(DEFAULT_CONFIG);
  building.init();
  window.simulator = building;
});
