#!/usr/bin/env bash
exec "$(dirname "$0")/database/create-demo-users.sh" "$@"
