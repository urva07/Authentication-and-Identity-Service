#!/bin/bash
# Starts the application with docker compose and restarts it (no rebuild)
# when files in the application change. Requires fswatch (brew install fswatch).

cd "$(dirname "$0")/.." || exit 1

docker-compose up -d || exit 1

if ! command -v fswatch >/dev/null 2>&1; then
    echo "fswatch not found. Install it with: brew install fswatch" >&2
    exit 1
fi

echo "Watching application files for changes..."
# -o batches events; -l 2 debounces bursts of changes
fswatch -o -l 2 -e '(^|/)node_modules(/|$)' -e '(^|/)\.git(/|$)' . | while read -r _; do
    echo "Application files changed. Restarting..."
    docker-compose restart
done