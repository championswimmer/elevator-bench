# Elevator Simulator

We want to build an Elevator Simulator that simulates the operation of elevators in a building.

### Defaults: 
For the purpose of this simulation we will consider this configuration as defaults (should all be configurable constants): 

1. Floors in building: 10 (numbered from 0 to 9)
2. Number of Elevators: 4 (numbered from 0 to 3)

### Features:
The Elevator Simulator should have the following features:

1. Each floor should have up and down buttons to request an elevator. The top and bottom floors will only have one button (down for top floor, up for bottom floor). 

2. Inside each elevator, there should be buttons for each floor to select the desired destination.

3. The simulation begins with all elevators idle at the ground floor (floor 0).

4. The simulation should show the animation of the elevators moving from floor to floor.

The elevator logic should optimise for the following: 

1. When an elevator is requested from a floor, the closest idle elevator travelling in the direction of the request should respond first.

2. If all elevators are busy, the request should be queued and assigned to the next available elevator.

3. Elevator should not change direction until all requests in the current direction are fulfilled.


### Code Structure: 

Create 3 files: 

1. index.html - This file will contain the HTML structure of the simulator, including buttons for each floor and inside the elevators.

2. styles.css - This file will contain the CSS styles for the simulator to make it visually appealing.

3. script.ts - This file will contain the TypeScript code to handle the elevator logic, button clicks, and state management of the elevators.

### Development 

To run with bun 

```sh 
bun ./index.html
```

To build we will execute 

```sh
mkdir -p ./dist
bun build ./index.html --outdir ./dist
```