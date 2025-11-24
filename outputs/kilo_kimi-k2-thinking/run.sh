#!/bin/bash

# Get port from info.json
PORT=$(jq -r '.config.port' info.json)

# Run the project using bunx serve
bunx serve -p $PORT