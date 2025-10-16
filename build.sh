#!/bin/bash
set -e

echo "Building frontend and backend..."
npm run build

echo "Copying migrations folder to dist..."
cp -r migrations dist/

echo "Build completed successfully!"
ls -la dist/
