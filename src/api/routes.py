import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Query, Depends
from pymongo import MongoClient
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://mongodb:27017/')
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'mta_data')

# Subway line colors mapping
LINE_COLORS = {
    '1': '#EE352E',  # Red
    '2': '#EE352E',  # Red
    '3': '#EE352E',  # Red
    '4': '#00933C',  # Green
    '5': '#00933C',  # Green
    '6': '#00933C',  # Green
    '7': '#B933AD',  # Purple
    'A': '#0039A6',  # Blue
    'C': '#0039A6',  # Blue
    'E': '#0039A6',  # Blue
    'B': '#FF6319',  # Orange
    'D': '#FF6319',  # Orange
    'F': '#FF6319',  # Orange
    'M': '#FF6319',  # Orange
    'G': '#6CBE45',  # Light Green
    'J': '#996633',  # Brown
    'Z': '#996633',  # Brown
    'L': '#A7A9AC',  # Grey
    'N': '#FCCC0A',  # Yellow
    'Q': '#FCCC0A',  # Yellow
    'R': '#FCCC0A',  # Yellow
    'W': '#FCCC0A',  # Yellow
    'S': '#808183',  # Dark Grey
    'SI': '#0039A6',  # Blue (Staten Island Railway)
    
    # Bus routes - omitting long lists for brevity
}

# Create the router
router = APIRouter()

# Database connection
def get_db():
    """
    Create and return a MongoDB client connection.
    """
    try:
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DATABASE]
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

# Models
class Position(BaseModel):
    """
    Geographic position model for vehicle locations.
    """
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    bearing: Optional[float] = None

class SubwayVehicle(BaseModel):
    """
    Model representing a subway vehicle with its position and status.
    """
    id: str
    line_id: str
    trip_id: str
    route_id: str
    start_time: str
    start_date: str
    vehicle_id: Optional[str] = None
    current_status: Optional[int] = None
    current_stop_sequence: Optional[int] = None
    stop_id: Optional[str] = None
    position: Optional[Position] = None
    timestamp: int
    event_time: Optional[datetime] = None
    fetch_time: Optional[datetime] = None

class RouteStats(BaseModel):
    """
    Model for route statistics over a time window.
    """
    window_start: datetime
    window_end: datetime
    line_id: str
    route_id: str
    count: int

class ServiceAlert(BaseModel):
    """
    Model for service alerts affecting subway service.
    """
    id: str
    alert_type: str
    cause: Optional[str] = None
    effect: Optional[str] = None
    header_text: Optional[str] = None
    description_text: Optional[str] = None
    severity: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    affected_routes: List[str] = []

class ElevatorOutage(BaseModel):
    """
    Model for elevator/escalator outages at stations.
    """
    station_name: str
    equipment_id: str
    equipment_type: str
    serving: str
    outage_start: Optional[datetime] = None
    outage_end: Optional[datetime] = None
    reason: Optional[str] = None
    status: str
    type: str  # current or upcoming

class StatsSummary(BaseModel):
    """
    Model for system-wide summary statistics.
    """
    total_vehicles: int
    vehicles_by_line: Dict[str, int]
    vehicles_by_route: Dict[str, int]
    current_elevator_outages: int
    upcoming_elevator_outages: int
    active_alerts: int

@router.get("/")
def read_root():
    """
    Root endpoint that returns basic API info.
    """
    return {
        "message": "MTA Real-Time Data API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@router.get("/stats/summary")
def get_summary_stats(db = Depends(get_db)):
    """
    Get summary statistics for the entire system.
    """
    try:
        # Count vehicles by line and route
        vehicle_collection = db.vehicles
        total_vehicles = vehicle_collection.count_documents({})
        
        # Get counts by line
        pipeline = [
            {"$group": {"_id": "$line_id", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        line_counts = {doc["_id"]: doc["count"] for doc in vehicle_collection.aggregate(pipeline)}
        
        # Get counts by route
        pipeline = [
            {"$group": {"_id": "$route_id", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        route_counts = {doc["_id"]: doc["count"] for doc in vehicle_collection.aggregate(pipeline)}
        
        # Count current and upcoming elevator outages
        elevator_collection = db.elevator_outages
        current_outages = elevator_collection.count_documents({"type": "current"})
        upcoming_outages = elevator_collection.count_documents({"type": "upcoming"})
        
        # Count active alerts
        alert_collection = db.alerts
        active_alerts = alert_collection.count_documents({})
        
        return StatsSummary(
            total_vehicles=total_vehicles,
            vehicles_by_line=line_counts,
            vehicles_by_route=route_counts,
            current_elevator_outages=current_outages,
            upcoming_elevator_outages=upcoming_outages,
            active_alerts=active_alerts
        )
    except Exception as e:
        logger.error(f"Error fetching summary stats: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/vehicles")
def get_vehicles(
    route_id: Optional[str] = None,
    route_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get current vehicle positions with optional filtering.
    """
    try:
        collection = db.vehicles
        query = {}
        
        if route_id:
            query["route_id"] = route_id
            
        if route_type:
            # Filter by subway or bus
            if route_type.lower() == "subway":
                query["route_id"] = {"$in": list("123456789ACEGJLMNQRSWZ")}
            elif route_type.lower() == "bus":
                query["route_id"] = {"$regex": "^[BMQSBx]"}
        
        cursor = collection.find(query).limit(limit)
        vehicles = []
        
        for doc in cursor:
            # Convert MongoDB document to SubwayVehicle model
            # Handle datetime conversion
            if 'event_time' in doc and doc['event_time']:
                doc['event_time'] = datetime.fromisoformat(doc['event_time']) if isinstance(doc['event_time'], str) else doc['event_time']
            if 'fetch_time' in doc and doc['fetch_time']:
                doc['fetch_time'] = datetime.fromisoformat(doc['fetch_time']) if isinstance(doc['fetch_time'], str) else doc['fetch_time']
            
            # Handle nested position object
            if 'position' in doc and doc['position']:
                doc['position'] = Position(**doc['position'])
            
            # Remove MongoDB _id field
            doc.pop('_id', None)
            
            vehicle = SubwayVehicle(**doc)
            vehicles.append(vehicle)
        
        return vehicles
    except Exception as e:
        logger.error(f"Error fetching vehicles: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/alerts")
def get_alerts(
    route_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get service alerts with optional filtering.
    """
    try:
        collection = db.alerts
        query = {}
        
        if route_id:
            query["affected_routes"] = route_id
            
        if severity:
            query["severity"] = severity
        
        cursor = collection.find(query).limit(limit)
        alerts = []
        
        for doc in cursor:
            # Convert MongoDB document to ServiceAlert model
            # Handle datetime conversion
            if 'created_at' in doc and doc['created_at']:
                doc['created_at'] = datetime.fromisoformat(doc['created_at']) if isinstance(doc['created_at'], str) else doc['created_at']
            if 'updated_at' in doc and doc['updated_at']:
                doc['updated_at'] = datetime.fromisoformat(doc['updated_at']) if isinstance(doc['updated_at'], str) else doc['updated_at']
            
            # Remove MongoDB _id field
            doc.pop('_id', None)
            
            alert = ServiceAlert(**doc)
            alerts.append(alert)
        
        return alerts
    except Exception as e:
        logger.error(f"Error fetching alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/elevators/outages")
def get_elevator_outages(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    type: str = 'current',
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get elevator and escalator outage information.
    """
    try:
        collection = db.elevator_outages
        query = {"type": type}
        
        if station:
            query["station_name"] = {"$regex": f".*{station}.*", "$options": "i"}
            
        if borough:
            query["borough"] = {"$regex": f".*{borough}.*", "$options": "i"}
            
        if equipment_type:
            query["equipment_type"] = {"$regex": f".*{equipment_type}.*", "$options": "i"}
        
        cursor = collection.find(query).limit(limit)
        outages = []
        
        for doc in cursor:
            # Convert MongoDB document to ElevatorOutage model
            # Handle datetime conversion
            if 'outage_start' in doc and doc['outage_start']:
                doc['outage_start'] = datetime.fromisoformat(doc['outage_start']) if isinstance(doc['outage_start'], str) else doc['outage_start']
            if 'outage_end' in doc and doc['outage_end']:
                doc['outage_end'] = datetime.fromisoformat(doc['outage_end']) if isinstance(doc['outage_end'], str) else doc['outage_end']
            
            # Remove MongoDB _id field
            doc.pop('_id', None)
            
            outage = ElevatorOutage(**doc)
            outages.append(outage)
        
        return outages
    except Exception as e:
        logger.error(f"Error fetching elevator outages: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/elevator/outages")
def get_elevator_outages_alias(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    type: str = 'current',
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Alias for /elevators/outages for backward compatibility.
    """
    return get_elevator_outages(station, borough, equipment_type, type, limit, db)

@router.get("/elevators/equipment")
def get_elevator_equipment(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    ada: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get information about elevator and escalator equipment.
    """
    try:
        collection = db.elevator_equipment
        query = {}
        
        if station:
            query["station_name"] = {"$regex": f".*{station}.*", "$options": "i"}
            
        if borough:
            query["borough"] = {"$regex": f".*{borough}.*", "$options": "i"}
            
        if equipment_type:
            query["equipment_type"] = {"$regex": f".*{equipment_type}.*", "$options": "i"}
            
        if ada is not None:
            query["ada"] = ada
        
        cursor = collection.find(query).limit(limit)
        equipment_list = []
        
        for doc in cursor:
            # Remove MongoDB _id field
            doc.pop('_id', None)
            equipment_list.append(doc)
        
        return equipment_list
    except Exception as e:
        logger.error(f"Error fetching elevator equipment: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/system/status")
def get_system_status(db = Depends(get_db)):
    """
    Get overall system status including alert counts by route.
    """
    try:
        alert_collection = db.alerts
        
        # Get all subway routes
        subway_routes = list("123456789ACEGJLMNQRSWZ")
        
        status_data = {}
        
        # Get status for each route based on alerts
        for route in subway_routes:
            # Check for alerts affecting this route
            route_alerts_count = alert_collection.count_documents({"affected_routes": route})
            route_alerts_severe = alert_collection.count_documents({"affected_routes": route, "severity": "severe"})
            
            # Determine status based on alerts
            if route_alerts_severe > 0:
                status = "delay"
            elif route_alerts_count > 0:
                status = "caution"
            else:
                status = "good"
                
            # Add color for visualization
            color = LINE_COLORS.get(route, "#000000")
            
            status_data[route] = {
                "status": status,
                "color": color,
                "alerts_count": route_alerts_count
            }
        
        return {
            "timestamp": datetime.now(),
            "routes": status_data
        }
    except Exception as e:
        logger.error(f"Error fetching system status: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/routes/stats")
def get_route_stats(
    line_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get statistics about routes over time.
    """
    try:
        collection = db.route_stats
        query = {}
        
        if line_id:
            query["line_id"] = line_id
        
        # Get stats from the last 24 hours
        start_time = datetime.now() - timedelta(hours=24)
        query["window_start"] = {"$gte": start_time}
        
        # Sort by time
        cursor = collection.find(query).sort("window_start", -1).limit(limit)
        stats = []
        
        for doc in cursor:
            # Convert MongoDB document to RouteStats model
            # Handle datetime conversion
            if 'window_start' in doc and doc['window_start']:
                doc['window_start'] = datetime.fromisoformat(doc['window_start']) if isinstance(doc['window_start'], str) else doc['window_start']
            if 'window_end' in doc and doc['window_end']:
                doc['window_end'] = datetime.fromisoformat(doc['window_end']) if isinstance(doc['window_end'], str) else doc['window_end']
            
            # Remove MongoDB _id field
            doc.pop('_id', None)
            
            stat = RouteStats(**doc)
            stats.append(stat)
        
        return stats
    except Exception as e:
        logger.error(f"Error fetching route stats: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}") 