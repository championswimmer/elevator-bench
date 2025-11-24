# Elevator Simulator

This is an elevator simulator that demonstrates the operation of elevators in a building with optimized scheduling algorithms.

## Features

1. Each floor has up and down buttons to request an elevator (top and bottom floors have only one button)
2. Floors are numbered from 0 (ground floor) to N-1 (top floor)
3. Each elevator has buttons for each floor to select the desired destination
4. The simulation begins with all elevators idle at the ground floor (floor 0)
5. The simulation shows animation of elevators moving from floor to floor
6. Elevator logic optimizes for:
   - Closest idle elevator travelling in the direction of the request responds first
   - If all elevators are busy, requests are queued and assigned to the next available elevator
   - Elevators do not change direction until all requests in the current direction are fulfilled

## Default Configuration

- Floors in building: 10 (numbered from 0 to 9)
- Number of Elevators: 4 (numbered from 0 to 3)

## Project Setup

This project uses Bun for running and building without any package.json or node_modules dependencies.

### Running the Project

```bash
# Make the run script executable (if not already)
chmod +x run.sh

# Run the project
./run.sh
```

Or manually:
```bash
bunx serve -p 8967
```

### Building the Project

```bash
# Make the build script executable (if not already)
chmod +x build.sh

# Build the project
./build.sh
```

Or manually:
```bash
mkdir -p ./dist
bun build ./script.ts --outdir ./dist
cp index.html styles.css ./dist/
```

The built files will be in the `dist` directory.

## Code Structure

- `index.html` - Main HTML structure
- `styles.css` - CSS styling
- `script.ts` - Main TypeScript file
- `elevator.ts` - Elevator class implementation
- `floor.ts` - Floor class implementation
- `building.ts` - Building class that manages elevators and floors
- `tsconfig.json` - TypeScript configuration
- `info.json` - Configuration file with model, tool, provider, and port information
- `build.sh` - Build script
- `run.sh` - Run script
- `README.md` - This file

## How It Works

1. The simulation starts with all elevators at the ground floor (floor 0)
2. When a user clicks an up/down button on a floor, an elevator is requested
3. The system finds the best elevator to handle the request based on:
   - Closest idle elevator
   - Elevator travelling in the same direction that hasn't passed the floor yet
   - Closest elevator overall if none are suitable
4. Elevators move to requested floors, open doors, and then continue to any other destinations
5. Users can select destinations from inside the elevators using the floor buttons
6. The reset button returns all elevators to the ground floor and re-enables all floor buttons

## Implementation Details

The code is organized into classes:
- `Elevator`: Manages individual elevator state, movement, and door operations
- `Floor`: Manages floor buttons and requests
- `Building`: Manages the overall system, including elevator scheduling

The UI is built with plain HTML/CSS and uses CSS transitions for elevator movement animations.