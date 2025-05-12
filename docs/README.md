# Subway Dash Documentation

Welcome to the Subway Dash documentation. This project is a real-time data processing pipeline for MTA transit data, providing live tracking of subway trains, service alerts, and elevator/escalator status information.

## Documentation Index

### Overview Documents

1. [System Architecture](ARCHITECTURE.md)
   - System components and data flow
   - Setup and installation instructions
   - Monitoring and maintenance
   - Troubleshooting guide
   - Scaling considerations

2. [API Documentation](API_DOCUMENTATION.md)
   - API endpoints
   - Request parameters
   - Response formats
   - Data models
   - Error handling

3. [Code Documentation](CODE_DOCUMENTATION.md)
   - Project structure
   - Core components
   - Technologies used
   - Configuration options
   - Error handling and logging

## Quick Start

To get the system up and running:

1. Ensure you have Docker and Docker Compose installed
2. Clone the repository
3. Create a `.env` file with configuration variables
4. Run `docker-compose up -d`
5. Access the dashboard at `http://localhost:3000`

For detailed instructions, see the [System Architecture](ARCHITECTURE.md) document.

## System Components

The Subway Dash system consists of the following components:

1. **Data Producer**: Fetches data from MTA API endpoints
2. **Kafka**: Message broker for real-time data streaming
3. **Spark**: Data processing using Spark Structured Streaming
4. **MongoDB**: Storage for processed data
5. **API Layer**: FastAPI backend to serve data to the dashboard
6. **Dashboard**: React frontend with interactive visualizations

## Available Services

When running the system, the following services are available:

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Kafka UI**: http://localhost:8080
- **Spark Master UI**: http://localhost:8090

## License

This project is licensed under the MIT License. 