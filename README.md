# Subway Dash: Real-time MTA Data Processing Pipeline

A real-time big data processing pipeline for MTA subway data. The system ingests GTFS and JSON feeds from MTA, processes it through Kafka and Spark, stores it in MongoDB, and visualizes it through a React dashboard.

## System Architecture

```
┌───────────┐    ┌──────────┐    ┌─────────────┐    ┌─────────┐    ┌───────────┐
│ MTA Feeds │ -> │  Kafka   │ -> │ Spark       │ -> │ MongoDB │ -> │ Dashboard │
│ Producer  │    │  Broker  │    │ Structured  │    │         │    │ (React)   │
└───────────┘    └──────────┘    │ Streaming   │    └─────────┘    └───────────┘
                                 └─────────────┘
```

1. **Data Producer**: Fetches data from MTA GTFS and JSON feeds
2. **Kafka**: Message broker for real-time data streaming
3. **Spark**: Data processing using Spark Structured Streaming
4. **MongoDB**: Storage for processed data
5. **API Layer**: FastAPI backend to serve data to the dashboard
6. **Dashboard**: React frontend with interactive visualizations

## Features

- Real-time tracking of MTA vehicles (subway trains)
- Service alerts monitoring
- Elevator and escalator outage tracking
- Interactive dashboard with filtering capabilities
- Data analytics and visualization

## Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.8+
- Node.js 14+
- API key for MTA feeds

### Installation

1. Clone the repository
2. Set up your `.env` file
3. Run `docker-compose up` to start all services
4. Access the dashboard at `http://localhost:3000`

For detailed setup instructions, see the [Architecture Documentation](docs/ARCHITECTURE.md).

## Components

- **Producer**: Python app to fetch and publish MTA data to Kafka
- **Processor**: Spark Structured Streaming app for data processing
- **API**: FastAPI backend to serve data from MongoDB
- **Dashboard**: React frontend for data visualization

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- [Documentation Index](docs/README.md) - Overview of all documentation
- [System Architecture](docs/ARCHITECTURE.md) - Detailed architecture, setup and operation
- [API Documentation](docs/API_DOCUMENTATION.md) - API endpoints, parameters and responses
- [Code Documentation](docs/CODE_DOCUMENTATION.md) - Project codebase reference

## Available Services

When the system is running, you can access these services:

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Kafka UI**: http://localhost:8080
- **Spark Master UI**: http://localhost:8090

## Commands

Start the system:
```bash
docker-compose up -d
```

View logs:
```bash
docker-compose logs -f [service_name]
```

Stop the system:
```bash
docker-compose down
```

Reset data (clears all volumes):
```bash
docker-compose down -v
```

## License

MIT 
