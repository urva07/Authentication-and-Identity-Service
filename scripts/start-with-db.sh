#!/usr/bin/env bash
set -euo pipefail

brew_prefix="$(brew --prefix)"
mongo_conf="${brew_prefix}/etc/mongod.conf"

find_mongod() {
  if command -v mongod >/dev/null 2>&1; then
    command -v mongod
    return
  fi
  local candidate
  for candidate in \
    "${HOME}/mongodb-community-8.0.4/bin/mongod" \
    "${brew_prefix}/opt/mongodb-community/bin/mongod" \
    "${brew_prefix}/bin/mongod"; do
    if [[ -x "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return
    fi
  done
  echo "mongod not found on PATH or in Homebrew/home install locations" >&2
  exit 1
}

is_listening() {
  local port="$1"
  lsof -nP -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
}

brew services start mysql
brew services start redis

if is_listening 27017; then
  echo "MongoDB already listening on port 27017"
else
  if [[ ! -f "${mongo_conf}" ]]; then
    echo "MongoDB config not found at ${mongo_conf}" >&2
    exit 1
  fi

  "$(find_mongod)" --config "${mongo_conf}" --fork
fi

exec npm start
