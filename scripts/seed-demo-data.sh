#!/usr/bin/env bash
exec "$(dirname "$0")/database/seed-demo-data.sh" "$@"
