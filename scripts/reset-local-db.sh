#!/usr/bin/env bash
exec "$(dirname "$0")/database/reset-local-db.sh" "$@"
