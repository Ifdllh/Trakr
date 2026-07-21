#!/bin/bash

# Function to add data-lenis-prevent="true" to overflow-y-auto divs
# We use sed to replace className="... overflow-y-auto ..." with data-lenis-prevent="true" className="..."

for file in $(grep -rl 'overflow-y-auto' src/); do
  # Skip files if they already have data-lenis-prevent
  if ! grep -q 'data-lenis-prevent' "$file"; then
    sed -i 's/\(className="[^"]*overflow-y-auto[^"]*"\)/data-lenis-prevent="true" \1/g' "$file"
  fi
done

for file in $(grep -rl 'overflow-x-auto' src/); do
  if ! grep -q 'data-lenis-prevent' "$file"; then
    sed -i 's/\(className="[^"]*overflow-x-auto[^"]*"\)/data-lenis-prevent="true" \1/g' "$file"
  fi
done

