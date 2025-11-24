#!/bin/bash

# Create dist directory
mkdir -p ./dist

# Build the project using bun
bun build ./index.html --outdir ./dist

echo "Build completed successfully!"