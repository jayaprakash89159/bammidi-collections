#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! nc -z ${DB_HOST:-db} ${DB_PORT:-5432}; do
  sleep 2
done
echo "PostgreSQL is up!"

# Wait for DB to fully initialize
sleep 3

echo "Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-redis} 6379; do sleep 1; done
echo "Redis is up!"

echo "Starting Celery worker..."
exec celery -A config worker -l info
