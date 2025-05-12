# Subway Dash: System Architecture

This document describes the system architecture, components, data flow, and setup instructions for the Subway Dash project.

## System Overview

Subway Dash is a real-time data processing pipeline for MTA (Metropolitan Transportation Authority) transit data. It ingests data from various MTA API endpoints, processes it using a distributed streaming architecture, and presents it via a web dashboard.

The system follows a microservices architecture with containerized components that communicate through Kafka message streams and MongoDB for persistence.

## Architecture Diagram

```
┌───────────┐    ┌──────────┐    ┌─────────────┐    ┌─────────┐    ┌───────────┐
│ MTA Feeds │ -> │  Kafka   │ -> │ Spark       │ -> │ MongoDB │ -> │ Dashboard │
│ Producer  │    │  Broker  │    │ Structured  │    │         │    │ (React)   │
└───────────┘    └──────────┘    │ Streaming   │    └─────────┘    └───────────┘
                                 └─────────────┘
```

## Component Details

### 1. Data Producer

**Purpose**: Fetches real-time data from MTA API endpoints and publishes it to Kafka topics.

**Technologies**:
- Python 3.8+
- Google Transit GTFS Realtime library
- Schedule library for periodic tasks
- Confluent Kafka Python client

**Data Sources**:
- GTFS Realtime feeds for subway vehicle positions
- JSON feeds for service alerts
- JSON feeds for elevator/escalator status

**Key Features**:
- Periodically polls MTA endpoints based on configurable intervals
- Parses binary protobuf GTFS data into structured JSON
- Publishes data to specific Kafka topics
- Implements direct MongoDB write as a fallback mechanism
- Handles API failures gracefully with error logging

### 2. Kafka Message Broker

**Purpose**: Provides a scalable, fault-tolerant message queue for decoupling data producers and consumers.

**Technologies**:
- Apache Kafka
- Zookeeper for coordination

**Key Features**:
- Maintains separate topics for different data types:
  - `subway_vehicles`: Subway train positions
  - `service_alerts`: Service disruptions and alerts
  - `elevator_outages`: Elevator/escalator outage information
  - `elevator_equipment`: Equipment inventory data
- Provides buffering for handling load spikes
- Enables multiple consumers to process data independently
- Kafka UI for monitoring and debugging

### 3. Spark Data Processor

**Purpose**: Processes streaming data from Kafka and transforms it for storage in MongoDB.

**Technologies**:
- Apache Spark Structured Streaming
- Spark SQL
- MongoDB Spark Connector

**Key Features**:
- Reads streams from Kafka topics using Spark Structured Streaming
- Applies transformations to normalize and enrich data
- Maintains latest state of vehicle positions
- Calculates aggregated statistics
- Writes processed data to MongoDB collections
- Handles late-arriving and out-of-order data

### 4. MongoDB Database

**Purpose**: Provides persistent storage for processed data with flexible schema support.

**Key Collections**:
- `vehicle_positions`: Historical vehicle position data
- `latest_vehicle_positions`: Current vehicle positions (overwritten)
- `service_alerts`: Current service alerts
- `elevator_outages`: Elevator and escalator outage information
- `elevator_equipment`: Equipment inventory and metadata

**Key Features**:
- Document-oriented storage ideal for JSON data
- Geospatial indexing for location queries
- Query capabilities for filtering and aggregation
- Optimized for read-heavy workloads

### 5. FastAPI Backend

**Purpose**: Provides a RESTful API to access data from MongoDB for the frontend dashboard.

**Technologies**:
- FastAPI
- Pydantic for data validation
- PyMongo for MongoDB access

**Key Endpoints**:
- Vehicle positions with filtering
- Service alerts with filtering
- Elevator/escalator status
- System statistics
- Health check and monitoring

**Key Features**:
- Async request handling for high concurrency
- Automatic API documentation with Swagger UI
- Input validation and type checking
- CORS support for browser access
- Error handling with consistent HTTP status codes

### 6. React Dashboard

**Purpose**: Provides a user-friendly interface for visualizing the transit data.

**Technologies**:
- React
- Material UI for components
- Leaflet for maps
- Chart.js for data visualization
- Axios for API requests

**Key Features**:
- Interactive map showing vehicle positions
- Real-time updates of vehicle locations
- Service alert notifications
- Elevator/escalator status visualization
- Responsive design for mobile and desktop
- Lazy loading for performance optimization

## Data Flow

1. **Data Ingestion**:
   - Producer fetches data from MTA API endpoints
   - Data is published to Kafka topics
   - Metadata is added (fetch timestamp, source, etc.)

2. **Data Processing**:
   - Spark consumes data from Kafka topics
   - Applies transformations and normalization
   - Enriches data with additional context (e.g., color coding)
   - Handles late or duplicate data

3. **Data Storage**:
   - Processed data is stored in MongoDB collections
   - Latest state is maintained in dedicated collections
   - Historical data is preserved for analysis

4. **Data Access**:
   - FastAPI endpoints query MongoDB collections
   - Apply filtering and pagination
   - Transform data for frontend consumption

5. **Data Visualization**:
   - React dashboard fetches data from API endpoints
   - Updates UI components with latest data
   - Handles user interactions and filtering requests

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- Git
- At least 4GB of RAM for running all containers

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/username/subway-dash.git
   cd subway-dash
   ```

2. Create a `.env` file with the following variables:
   ```
   # Kafka Configuration
   KAFKA_BOOTSTRAP_SERVERS=kafka:9092
   
   # MongoDB Configuration  
   MONGODB_URI=mongodb://mongodb:27017/
   MONGODB_DATABASE=mta_data
   
   # Data Refresh Intervals (seconds)
   SUBWAY_REFRESH_INTERVAL=30
   ALERTS_REFRESH_INTERVAL=60
   ELEVATOR_REFRESH_INTERVAL=120
   ```

### Starting the System

Start all services using Docker Compose:

```bash
docker-compose up -d
```

This will start the following containers:
- Zookeeper
- Kafka
- MongoDB
- Kafka UI
- Data Producer
- Spark Master
- Spark Worker
- Data Processor
- API Backend
- React Dashboard

### Accessing the System

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Kafka UI**: http://localhost:8080
- **Spark Master UI**: http://localhost:8090

### Stopping the System

```bash
docker-compose down
```

To remove volumes (this will delete all data):

```bash
docker-compose down -v
```

## Monitoring and Maintenance

### Logs

Each component writes logs to stdout/stderr, which can be viewed with:

```bash
docker-compose logs -f [service_name]
```

Available service names:
- producer
- processor
- api
- dashboard
- kafka
- mongodb
- spark-master
- spark-worker

### Health Checks

The system status can be checked via:

```
GET http://localhost:8000/system/status
```

This returns the status of all system components.

## Scaling Considerations

### Horizontal Scaling

- **Producer**: Can be scaled to multiple instances with partitioned work
- **Kafka**: Supports partitioning for parallel processing
- **Spark**: Can add more worker nodes to process data in parallel
- **MongoDB**: Can be configured as a replica set for high availability
- **API**: Can be deployed behind a load balancer with multiple instances

### Vertical Scaling

For development environments, resource allocation can be adjusted in the `docker-compose.yml` file:

```yaml
services:
  spark-worker:
    environment:
      - SPARK_WORKER_MEMORY=4G
      - SPARK_WORKER_CORES=2
```

## Common Issues and Troubleshooting

### Kafka Connection Issues

If services cannot connect to Kafka:

1. Check if Kafka container is running:
   ```bash
   docker-compose ps kafka
   ```

2. Verify Kafka logs:
   ```bash
   docker-compose logs kafka
   ```

3. Ensure the correct broker address is configured in `.env`

### MongoDB Connection Issues

If services cannot connect to MongoDB:

1. Check if MongoDB container is running:
   ```bash
   docker-compose ps mongodb
   ```

2. Verify MongoDB logs:
   ```bash
   docker-compose logs mongodb
   ```

3. Ensure the correct connection string is configured in `.env`

### Data Not Appearing in Dashboard

If data is not appearing in the dashboard:

1. Check API endpoints directly:
   ```bash
   curl http://localhost:8000/vehicles
   ```

2. Verify producer logs for successful data fetching:
   ```bash
   docker-compose logs producer
   ```

3. Check processor logs for successful data processing:
   ```bash
   docker-compose logs processor
   ```

4. Inspect MongoDB collections:
   ```bash
   docker exec -it mongodb mongosh mta_data
   db.getCollectionNames()
   db.vehicle_positions.count()
   ``` 