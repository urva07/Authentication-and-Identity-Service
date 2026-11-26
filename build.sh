#!/bin/bash
set -e

cd "$(dirname "$0")"

docker compose up --build
docker image prune -f