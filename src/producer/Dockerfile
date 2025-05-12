FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY src/producer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/producer/ .

# Run the producer
CMD ["python", "main.py"] 