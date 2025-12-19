# Elevator Simulator

An interactive elevator simulator built with TypeScript, HTML, and CSS that simulates the operation of elevators in a building.

## Features

- **Multi-floor building**: Configurable number of floors (default: 10, numbered 0-9)
- **Multiple elevators**: Configurable number of elevators (default: 4, numbered 0-3)
- **Smart elevator logic**: 
  - Closest idle elevator responds to requests first
  - Requests are queued when all elevators are busy
  - Elevators maintain direction until all requests in that direction are fulfilled
- **Interactive controls**: 
  - Floor buttons (up/down) on each floor
  - Elevator panel buttons for destination selection
  - Simulation controls (start/stop/reset)
- **Visual feedback**: Animated elevator movement and status indicators

## Configuration

The simulator uses the following default configuration (can be modified in `script.ts`):

```typescript
const TOTAL_FLOORS = 10;      // Floors numbered from 0 to 9
const TOTAL_ELEVATORS = 4;    // Elevators numbered from 0 to 3
```

## Running the Simulator

### Development Mode

To run the simulator in development mode:

```bash
bunx serve -p 8933
```

Then open your browser and navigate to `http://localhost:8933`

### Production Build

To build the simulator for production:

```bash
mkdir -p ./dist
bun build ./index.html --outdir ./dist
```

The built files will be placed in the `dist` directory and can be served by any web server.

## How to Use

1. **Start the simulation**: Click the "Start Simulation" button to begin
2. **Request elevators**: 
   - Click the up (▲) or down (▼) buttons on each floor to request an elevator
   - The top floor only has a down button, the bottom floor only has an up button
3. **Select destinations**: 
   - Hover over an elevator to see its control panel
   - Click floor buttons in the panel to select destination floors
4. **Monitor status**: 
   - Watch the status display for active requests
   - Observe elevator movement and state changes
5. **Control simulation**: 
   - Use "Stop Simulation" to pause
   - Use "Reset" to return all elevators to the ground floor

## File Structure

```
├── index.html          # Main HTML structure
├── styles.css          # CSS styling
├── script.ts           # Main application logic
├── Elevator.ts         # Elevator class definition
├── Floor.ts            # Floor class definition
├── Building.ts         # Building class definition
├── info.json           # Model and configuration information
└── README.md           # This documentation
```

## Technical Implementation

The simulator is built using object-oriented TypeScript with the following key components:

- **Elevator class**: Manages individual elevator state, movement, and floor requests
- **Floor class**: Handles floor UI and button interactions
- **Building class**: Coordinates elevators, processes requests, and manages the queue
- **Smart dispatch algorithm**: Optimizes elevator assignment based on distance and availability

## Browser Compatibility

The simulator works in all modern browsers that support:
- ES6 modules
- CSS Grid and Flexbox
- CSS transitions
- TypeScript compilation (handled by bun build)

---

**Model Information**: GLM-4.6 | Tool: Copilot | Provider: OpenRouter-Default