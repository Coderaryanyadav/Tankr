#!/usr/bin/env bash
exec "$(dirname "$0")/database/run-migrations.sh" "$@"
