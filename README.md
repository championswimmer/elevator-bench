# Elevator Simulator Evaluation Project

## Project Overview

This repository contains an elevator simulator implementation created as part of an evaluation benchmark for testing various coding tools and models. The project serves as a standardized task to evaluate the capabilities of different AI coding assistants and development tools.

The simulator implements a multi-floor elevator system with visual representation, providing a practical scenario for assessing code generation, architectural design, and implementation skills.

## Elevator Simulator Requirements

The elevator simulator implements the following features:

- **Floor Controls**: Up/down buttons on each floor to request elevator service
- **Elevator Controls**: Floor selection buttons inside the elevator cabin
- **Visual Representation**: Animated display showing elevators moving between floors
- **Realistic Behavior**: Proper elevator logic including door operations, movement timing, and request queuing

## Technology Stack

- **Frontend**: HTML5, CSS3 (with animations)
- **Logic**: TypeScript
- **No Framework Dependencies**: Pure implementation without external libraries

## Project Structure

```
.
├── index.html          # Main HTML file with elevator UI
├── style.css           # Stylesheet for visual representation
├── script.ts           # TypeScript logic for elevator simulation
├── PROMPT.md           # Original evaluation prompt and requirements
├── README.md           # This file
└── .gitignore          # Git ignore rules
```

## Model Outputs

The `/outputs` folder contains the results from different coding tools and models used to generate implementations of the elevator simulator.

### Naming Convention

All outputs follow the naming pattern `<tool>_<model>` where:
- `tool` represents the coding assistant or development tool used
- `model` represents the specific AI model or version used

### Examples

- `kilo_minimax-m2` (minimax m2 model using kilo code)
- `cursor_claude-sonnet-45` (claude sonnet 4.5 using cursor)


## Evaluation Details

This project serves as a benchmark for evaluating:
- Code generation capabilities
- Understanding of state management
- Implementation of algorithms and logic
- UI/UX implementation skills
- Code organization and architecture

The original evaluation prompt can be found in [PROMPT.md](PROMPT.md).

## Implementation Notes

The simulator implements a realistic elevator algorithm that:
- Processes requests in an efficient manner
- Handles multiple simultaneous requests
- Shows visual feedback for elevator movement
- Manages door open/close operations
- Tracks elevator state (moving, idle, door open/closed)

## Customization

You can modify the following parameters in the TypeScript code:
- Number of floors
- Number of elevators
- Elevator speed
- Door operation timing

## Browser Support

The simulator works in all modern browsers that support:
- ES6 JavaScript features
- CSS animations
- Modern DOM APIs

Tested browsers:
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Development

To modify the simulator:

1. Edit `script.ts` for logic changes
2. Update `style.css` for visual changes
3. Modify `index.html` for structural changes

TypeScript compilation (if modifying):
```bash
tsc script.ts --outDir .
```

## License

This project is provided as part of an evaluation benchmark and is available for use in accordance with the terms specified in the repository.