#!/usr/bin/env bash
set -o errexit
echo "Starting Celery worker..."
exec celery -A config.celery worker --loglevel=info
