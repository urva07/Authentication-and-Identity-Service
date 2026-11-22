#!/bin/bash
set -e

cd "$(dirname "$0")"

docker compose --env-file ./Auth_Service/.env up --build
docker image prune -f