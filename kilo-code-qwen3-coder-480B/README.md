# Elevator Simulator

A web-based elevator simulator built with HTML, CSS, and TypeScript.

## Features

- 10 floors (numbered 0-9)
- 4 elevators (numbered 0-3)
- Floor request buttons (up/down) on each floor
- Elevator selection buttons inside each elevator
- Visual status display for each elevator
- Responsive design that works on desktop and mobile
- Intelligent elevator assignment algorithm
- Queue management for multiple requests
- Elevators return to floor 0 when idle

## Files

- `index.html` - Main HTML structure
- `styles.css` - Styling for the simulator
- `script.ts` - TypeScript logic for elevator operations

## Running the Simulator

To run the simulator locally:

```bash
bun ./index.html
```

This will start a local server and provide a URL to access the simulator.

## Building the Project

To build the project for production:

```bash
mkdir -p ./dist && bun build ./index.html --outdir ./dist
```

This will create a `dist` folder with the bundled files.

## How to Use

1. Click the "Up" or "Down" buttons on each floor to request an elevator
2. Inside an elevator, click the floor number you want to go to
3. The status panel at the bottom shows elevator activity
4. Each elevator's current status is displayed in its header

## Implementation Details

- All elevators start idle at ground floor (floor 0)
- The UI is responsive and will adapt to different screen sizes
- Visual feedback is provided when buttons are pressed
- The status panel shows a log of elevator activities
- Elevators use a scoring algorithm to determine the best elevator for each request
- Elevators prioritize requests in their current direction of travel
- Elevators return to floor 0 after being idle for 10 seconds

## Future Enhancements

- Add door open/close animations
- Implement more sophisticated queuing system for elevator requests
- Add configuration options for elevator behavior
- Implement actual elevator movement algorithms with acceleration/deceleration