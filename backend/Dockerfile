FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    netcat-openbsd \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Make entrypoints executable
RUN chmod +x /app/scripts/entrypoint.sh /app/scripts/celery-entrypoint.sh

EXPOSE 8000

CMD ["/app/scripts/entrypoint.sh"]
