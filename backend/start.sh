#!/usr/bin/env bash
set -o errexit
echo "Starting Bammidi Collections backend..."
exec daphne -b 0.0.0.0 -p $PORT config.asgi:application
