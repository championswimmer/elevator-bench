# Elevator Simulator

A simple web‑based elevator simulation built with **HTML**, **CSS**, and **TypeScript**.  
It demonstrates basic elevator scheduling logic:

* 10 floors (0‑9)  
* 4 elevators (0‑3)  
* Floor up/down request buttons (top/bottom have a single button)  
* Inside‑elevator floor selection buttons  
* Simple scheduler: the closest idle elevator serves a request, otherwise the request is queued.

## Project structure

```
/index.html      – HTML skeleton and script import
/styles.css      – styling and animation
/script.ts      – elevator logic and UI handling
/README.md       – this file
```

## Development

```sh
# Run the simulator (requires Bun)
bun ./index.html

# Build for production
mkdir -p ./dist
bun build ./index.html --outdir ./dist
```

Open `index.html` in a browser (or use the built files in `./dist`).  
Press the up/down buttons on each floor to request an elevator, then use the buttons inside an elevator to select a destination floor. The elevators will move with a smooth animation.

---

**Enjoy!**  