#!/bin/bash

# Pull latest changes
git pull

# Start essential services first
docker-compose up -d mongodb api dashboard

# Wait for them to stabilize
sleep 30

# Start data processing services
docker-compose up -d zookeeper kafka
sleep 10
docker-compose up -d producer

# Finally start Spark services
docker-compose up -d spark-master spark-worker processor
