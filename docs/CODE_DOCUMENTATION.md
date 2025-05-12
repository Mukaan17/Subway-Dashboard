# Subway Dash Code Documentation

This document provides detailed documentation for the codebase of the Subway Dash project, a real-time data processing pipeline for MTA transit data.

## Project Structure

The project is organized into several key components:

```
subway-dash/
├── src/
│   ├── api/            # FastAPI backend service
│   ├── producer/       # MTA data fetcher and Kafka producer
│   └── processor/      # Spark Structured Streaming processor
├── dashboard/          # React frontend application
├── docs/               # Documentation
└── docker-compose.yml  # Docker Compose configuration
```

## Core Components

### 1. Data Producer (`src/producer/`)

The producer component is responsible for fetching data from MTA API endpoints and publishing it to Kafka topics.

#### Key Files:
- `main.py`: Main producer application
- `Dockerfile`: Docker configuration for the producer

#### Key Functions:

- `fetch_gtfs_feed(endpoint, line_id)`: Fetches GTFS protobuf data from MTA API and parses into JSON
- `fetch_json_feed(endpoint)`: Fetches JSON data from MTA API endpoints
- `fetch_and_publish_subway_data()`: Main function to fetch subway data and publish to Kafka
- `fetch_and_publish_alerts()`: Fetches service alerts and publishes to Kafka
- `fetch_and_publish_elevator_data()`: Fetches elevator/escalator data and publishes to Kafka
- `write_to_mongodb(collection_name, data, is_vehicle=False)`: Backup function to write directly to MongoDB

#### Data Sources:

- GTFS Realtime feeds for subway lines (ACE, BDFM, G, JZ, L, NQRW, 1234567, SIR)
- JSON feed for service alerts
- JSON feeds for elevator/escalator outages (current and upcoming) and equipment information

### 2. Data Processor (`src/processor/`)

The processor component uses Apache Spark Structured Streaming to process data from Kafka and store it in MongoDB.

#### Key Files:
- `main.py`: Main processor application
- `Dockerfile`: Docker configuration for the processor

#### Key Functions:

- `start_processing()`: Sets up and starts Spark streaming jobs
- `write_to_mongodb(dataframe, epoch_id, collection_name)`: Writes processed data to MongoDB
- `process_service_alerts(df, epoch_id)`: Processes service alerts data
- `process_elevator_data(df, epoch_id, data_type)`: Processes elevator/escalator data

#### Data Schemas:

- Vehicle schema: Structure for subway vehicle position data
- Alert schema: Structure for service alert data
- Elevator outage schema: Structure for elevator outage data
- Elevator equipment schema: Structure for elevator equipment inventory

### 3. API Layer (`src/api/`)

The API layer provides a RESTful interface for accessing the processed data stored in MongoDB.

#### Key Files:
- `main.py`: FastAPI application defining all API endpoints
- `Dockerfile`: Docker configuration for the API service

#### Key Endpoints:

- `/`: Health check endpoint
- `/stats/summary`: Summary statistics of the transit system
- `/vehicles`: Vehicle positions with filtering options
- `/alerts`: Service alerts with filtering options
- `/elevators/outages`: Elevator/escalator outages with filtering options
- `/elevators/equipment`: Elevator/escalator equipment information
- `/system/status`: System components health status
- `/routes/stats`: Statistics about active routes

#### Data Models:

- `Position`: Geographical position data (latitude, longitude, bearing)
- `SubwayVehicle`: Vehicle position data model
- `RouteStats`: Statistics for subway routes
- `ServiceAlert`: Service alert data model
- `ElevatorOutage`: Elevator/escalator outage data model
- `StatsSummary`: Summary statistics model

### 4. Dashboard (`dashboard/`)

The frontend dashboard is built with React and Material UI, providing visualizations of the transit data.

#### Key Files:
- `src/App.js`: Main application component
- `src/components/Layout.js`: Application layout component
- `src/pages/`: Dashboard pages (Dashboard, Vehicles, Alerts, Elevators)
- `src/utils/api.js`: API client for fetching data from the backend

#### Key Components:

- `Dashboard`: Main dashboard with summary statistics and charts
- `Vehicles`: Interactive map and table of vehicle positions
- `Alerts`: Service alerts display with filtering
- `Elevators`: Elevator/escalator outage information

## Color Schemes

The project uses the official MTA color scheme for subway lines and buses:

- Subway lines (1, 2, 3): Red (`#EE352E`)
- Subway lines (4, 5, 6): Green (`#00933C`)
- Subway line 7: Purple (`#B933AD`)
- Subway lines (A, C, E): Blue (`#0039A6`)
- Subway lines (B, D, F, M): Orange (`#FF6319`)
- Subway line G: Light Green (`#6CBE45`)
- Subway lines (J, Z): Brown (`#996633`)
- Subway line L: Grey (`#A7A9AC`)
- Subway lines (N, Q, R, W): Yellow (`#FCCC0A`)
- Shuttle (S): Dark Grey (`#808183`)
- Staten Island Railway: Blue (`#0039A6`)
- Manhattan Buses: Light Blue (`#4D92FB`)
- Brooklyn Buses: Light Yellow (`#F2C75C`)
- Bronx Buses: Teal (`#00AF87`)
- Queens Buses: Purple (`#9467BD`) 
- Staten Island Buses: Pink (`#D16BA5`)

## Configuration

The project uses environment variables for configuration, loaded via `.env` file:

### Kafka Configuration
- `KAFKA_BOOTSTRAP_SERVERS`: Kafka broker addresses
- `KAFKA_TOPIC_*`: Topic names for different data types

### MongoDB Configuration
- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DATABASE`: Database name

### Data Refresh Intervals
- `SUBWAY_REFRESH_INTERVAL`: Refresh interval for subway data (seconds)
- `ALERTS_REFRESH_INTERVAL`: Refresh interval for alerts (seconds)
- `ELEVATOR_REFRESH_INTERVAL`: Refresh interval for elevator data (seconds)

## Error Handling and Logging

The application uses Python's standard logging module for logging:

- `INFO` level logging for normal operations
- `ERROR` level logging for exceptions and errors
- File handlers for persistent logs
- Console handlers for development

Exception handling includes:
- Try/except blocks for API calls with error logging
- Graceful degradation when data sources are unavailable
- HTTP exception responses with appropriate status codes 