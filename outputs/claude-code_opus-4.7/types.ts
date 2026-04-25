export type Direction = 'up' | 'down' | 'idle';

export const CONFIG = {
  NUM_FLOORS: 10,
  NUM_ELEVATORS: 4,
  ELEVATOR_SPEED: 1.6,        // floors per second
  DOOR_OPEN_DURATION: 1.6,    // seconds
  FLOOR_HEIGHT_PX: 60,
} as const;
