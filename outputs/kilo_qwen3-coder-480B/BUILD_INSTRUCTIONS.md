# Elevator Simulator Build Process

This document outlines the build process for the Elevator Simulator project using Bun.

## Prerequisites

- Bun must be installed on your system
- No additional dependencies or package.json required

## Build Steps

1. **Run the development server:**
   ```sh
   bunx serve -p 8429
   ```
   The port number (8429) is read from info.json.

2. **Build the project:**
   ```sh
   mkdir -p ./dist
   bun build ./index.html --outdir ./dist
   ```

3. **Serve the built project:**
   ```sh
   bunx serve ./dist
   ```

## Build Output

The build process generates the following files in the `./dist` directory:
- `index.html` - The main HTML file
- `index-[hash].js` - The bundled JavaScript file containing all TypeScript code
- `index-[hash].css` - The bundled CSS file

## Key Requirements

- All TypeScript files are properly included in the build through script.ts
- The built project is fully functional when served from the dist directory
- No package.json or node_modules dependencies are required
- The port number is correctly read from info.json when running the development server

## Testing

To verify the build works correctly:
1. Run the development server and verify the application works
2. Execute the build commands
3. Serve the built project from the dist directory
4. Verify all functionality works in the built version