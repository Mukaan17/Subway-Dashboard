# Subway Dash API Documentation

This document provides detailed information about the Subway Dash API endpoints, request parameters, and response formats.

## Base URL

All API endpoints are accessible via the base URL: `http://localhost:8000`

## Authentication

Currently, the API does not require authentication for access.

## Data Models

### Position
```json
{
  "latitude": 40.7128,      // Latitude coordinate
  "longitude": -74.0060,    // Longitude coordinate
  "bearing": 45             // Direction in degrees (0-359)
}
```

### Vehicle
```json
{
  "id": "01234",                  // Vehicle identifier
  "line_id": "1234567",           // Line group identifier
  "trip_id": "123456_A_1",        // Trip identifier
  "route_id": "A",                // Route identifier (e.g., subway line)
  "start_time": "10:30:00",       // Trip start time
  "start_date": "20250510",       // Trip start date
  "vehicle_id": "1234",           // Physical vehicle identifier
  "current_status": 2,            // Status code (0=incoming, 1=stopped, 2=in transit)
  "current_stop_sequence": 12,    // Stop sequence number 
  "stop_id": "R31",               // Current/next stop ID
  "position": {                   // Position object
    "latitude": 40.7128,
    "longitude": -74.0060,
    "bearing": 45
  },
  "timestamp": 1715382661,        // Unix timestamp
  "color": "#0039A6"              // Route color for display
}
```

### Service Alert
```json
{
  "id": "alert-123",                        // Alert identifier
  "header": "Service Change",               // Alert title
  "description": "Trains running with delays", // Alert details
  "cause": "MAINTENANCE",                   // Cause of the alert
  "effect": "SIGNIFICANT_DELAYS",           // Effect type
  "severity": "MODERATE",                   // Severity level
  "routes": ["A", "C", "E"],                // Affected routes
  "route_colors": {                         // Colors for affected routes
    "A": "#0039A6",
    "C": "#0039A6",
    "E": "#0039A6"
  },
  "updated": 1715382661,                    // Last update timestamp
  "start": 1715382000,                      // Start timestamp (optional)
  "end": 1715389200                         // End timestamp (optional)
}
```

### Elevator/Escalator Outage
```json
{
  "station": "Times Sq-42 St",               // Station name
  "equipment_id": "ES123",                   // Equipment identifier
  "equipment_type": "EL",                    // Equipment type (EL=elevator, ES=escalator)
  "serving": "Platform to Mezzanine",        // Area served by equipment
  "outage_start": "2025-05-10T12:00:00",     // Outage start time
  "outage_end": "2025-05-12T12:00:00",       // Expected end time
  "reason": "Scheduled Maintenance",         // Reason for outage
  "status": "OUT OF SERVICE",                // Current status
  "borough": "MANHATTAN",                    // Borough location
  "is_current": true                         // Current or upcoming
}
```

## API Endpoints

### Health Check
```
GET /
```

Returns the API status.

**Response**
```json
{
  "message": "MTA Real-Time Data API",
  "status": "running"
}
```

### Summary Statistics
```
GET /stats/summary
```

Returns summary statistics about the transit system.

**Response**
```json
{
  "active_vehicles": 423,
  "active_lines": 26,
  "active_alerts": 15,
  "elevator_escalator_stats": {
    "active_outages": 48,
    "total_equipment": 342,
    "in_service_percentage": 85.96
  }
}
```

### Vehicle Positions
```
GET /vehicles
```

Returns positions of subway trains and buses.

**Query Parameters**
- `route_id` (optional): Filter by specific route (e.g., "A")
- `route_type` (optional): Filter by route type ("bus", "xbus", "simbus")
- `limit` (optional): Maximum number of records to return (default: 100, max: 1000)

**Response**
Array of Vehicle objects as defined above.

### Service Alerts
```
GET /alerts
```

Returns service alerts affecting subway service.

**Query Parameters**
- `route_id` (optional): Filter alerts affecting a specific route
- `severity` (optional): Filter by severity level
- `limit` (optional): Maximum number of records to return (default: 100, max: 1000)

**Response**
Array of Service Alert objects as defined above.

### Elevator/Escalator Outages
```
GET /elevators/outages
```

Returns information about elevator and escalator outages.

**Query Parameters**
- `station` (optional): Filter by station name (fuzzy match)
- `borough` (optional): Filter by borough
- `equipment_type` (optional): Filter by equipment type ("EL" or "ES")
- `type` (optional): "current" (default) or "upcoming"
- `limit` (optional): Maximum number of records to return (default: 100, max: 1000)

**Response**
Array of Elevator/Escalator Outage objects as defined above.

### Elevator/Escalator Equipment
```
GET /elevators/equipment
```

Returns information about all elevator and escalator equipment.

**Query Parameters**
- `station` (optional): Filter by station name (fuzzy match)
- `borough` (optional): Filter by borough
- `equipment_type` (optional): Filter by equipment type ("EL" or "ES")
- `ada` (optional): Filter by ADA compliance (true/false)
- `limit` (optional): Maximum number of records to return (default: 100, max: 1000)

**Response**
Array of elevator/escalator equipment objects.

### System Status
```
GET /system/status
```

Returns information about the status of different system components.

**Response**
```json
{
  "status": "OPERATIONAL",
  "components": {
    "vehicles_tracking": "OPERATIONAL",
    "service_alerts": "OPERATIONAL",
    "elevator_monitoring": "OPERATIONAL"
  },
  "databases": {
    "collections": ["vehicle_positions", "service_alerts", "elevator_outages", "elevator_equipment"]
  }
}
```

### Route Statistics
```
GET /routes/stats
```

Returns statistics about active routes.

**Query Parameters**
- `line_id` (optional): Filter by line ID
- `limit` (optional): Maximum number of records to return (default: 100, max: 1000)

**Response**
```json
[
  {
    "route_id": "A",
    "line_id": "ACE",
    "count": 56
  },
  {
    "route_id": "7",
    "line_id": "7",
    "count": 43
  }
]
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a detail message:

```json
{
  "detail": "Error message"
}
``` 