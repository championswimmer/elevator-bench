# Elevator Simulator

We want to build a Elevator Simulator that simulates the operation of elevators in a building.

### Features:
The Elevator Simulator should have the following features:

1. Each floor should have up and down buttons to request an elevator. The top and bottom floors will only have one button (down for top floor, up for bottom floor).

2. Floors start from 0 at bottom (ground floor) to N-1 at top (N is total number of floors).

3. Inside each elevator, there should be buttons for each floor to select the desired destination.

4. The simulation begins with all elevators idle at the ground floor (floor 0).

5. The simulation should show the animation of the elevators moving from floor to floor.
The elevator logic should optimise for the following: 

  1. When an elevator is requested from a floor, the closest idle elevator travelling in the direction of the request should respond first.

  2. If all elevators are busy, the request should be queued and assigned to the next available elevator.

  3. Elevator should not change direction until all requests in the current direction are fulfilled, or it reaches the end of the building on either side.

### Defaults: 
For the purpose of this simulation we will consider this configuration as defaults (should all be configurable constants): 

1. Floors in building: 10 (numbered from 0 to 9)
2. Number of Elevators: 4 (numbered from 0 to 3)


### Code Structure: 

Create 3 main files: 

1. index.html - This file will contain the HTML structure of the simulator. You can create divs for floors, elevators, and buttons here if you need.
  1. Include the model, tool, and provider information from info.json
  at the top after title in this HTML page.

2. styles.css - This file will contain the CSS styles for the simulator to make it visually appealing. Use plain CSS, no SASS/SCSS.

3. script.ts - This file will contain the TypeScript code to handle the elevator logic, button clicks, and state management of the elevators.
  1. Creating further .ts files for Elevator, Floor, and Building classes is encouraged for better organization.
  2. Make sure everything is imported directly/indirectly from script.ts so that bun build will include them in the final output.

### Project Setup

We want this project to run & build using bun, without any package.json or node_modules dependencies. 

We should be able to run the project using:

```sh 
bunx serve -p XXXX
```
Where port number `XXXX` is picked from info.json 

We should be able to build the project using:
```sh
mkdir -p ./dist
bun build ./index.html --outdir ./dist
```