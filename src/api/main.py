# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-10 23:44:37
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-11 20:50:32
import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
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
    
    # Bus routes
    'M1': '#4D92FB',   # Manhattan Bus
    'M2': '#4D92FB',
    'M3': '#4D92FB',
    'M4': '#4D92FB',
    'M5': '#4D92FB',
    'M7': '#4D92FB',
    'M8': '#4D92FB',
    'M9': '#4D92FB',
    'M10': '#4D92FB',
    'M11': '#4D92FB',
    'M12': '#4D92FB',
    'M14': '#4D92FB',
    'M15': '#4D92FB',
    'M15+': '#4D92FB',
    'M20': '#4D92FB',
    'M21': '#4D92FB',
    'M22': '#4D92FB',
    'M23': '#4D92FB',
    'M31': '#4D92FB',
    'M34': '#4D92FB',
    'M35': '#4D92FB',
    'M42': '#4D92FB',
    'M50': '#4D92FB',
    'M55': '#4D92FB',
    'M57': '#4D92FB',
    'M60': '#4D92FB',
    'M66': '#4D92FB',
    'M72': '#4D92FB',
    'M79': '#4D92FB',
    'M86': '#4D92FB',
    'M96': '#4D92FB',
    'M98': '#4D92FB',
    'M100': '#4D92FB',
    'M101': '#4D92FB',
    'M102': '#4D92FB',
    'M103': '#4D92FB',
    'M104': '#4D92FB',
    'M106': '#4D92FB',
    'M116': '#4D92FB',
    'M125': '#4D92FB',
    
    'B1': '#F2C75C',   # Brooklyn Bus
    'B2': '#F2C75C',
    'B3': '#F2C75C',
    'B4': '#F2C75C',
    'B6': '#F2C75C',
    'B8': '#F2C75C',
    'B9': '#F2C75C',
    'B11': '#F2C75C',
    'B12': '#F2C75C',
    'B13': '#F2C75C',
    'B14': '#F2C75C',
    'B15': '#F2C75C',
    'B16': '#F2C75C',
    'B17': '#F2C75C',
    'B24': '#F2C75C',
    'B25': '#F2C75C',
    'B26': '#F2C75C',
    'B35': '#F2C75C',
    'B38': '#F2C75C',
    'B41': '#F2C75C',
    'B42': '#F2C75C',
    'B43': '#F2C75C',
    'B44': '#F2C75C',
    'B45': '#F2C75C',
    'B46': '#F2C75C',
    'B47': '#F2C75C',
    'B48': '#F2C75C',
    'B49': '#F2C75C',
    'B52': '#F2C75C',
    'B54': '#F2C75C',
    'B57': '#F2C75C',
    'B60': '#F2C75C',
    'B61': '#F2C75C',
    'B62': '#F2C75C',
    'B63': '#F2C75C',
    'B64': '#F2C75C',
    'B65': '#F2C75C',
    'B67': '#F2C75C',
    'B68': '#F2C75C',
    'B69': '#F2C75C',
    'B70': '#F2C75C',
    'B74': '#F2C75C',
    'B82': '#F2C75C',
    'B83': '#F2C75C',
    'B84': '#F2C75C',
    'B100': '#F2C75C',
    'B103': '#F2C75C',
    
    'Bx1': '#00AF87',   # Bronx Bus
    'Bx2': '#00AF87',
    'Bx3': '#00AF87',
    'Bx4': '#00AF87',
    'Bx5': '#00AF87',
    'Bx6': '#00AF87',
    'Bx7': '#00AF87',
    'Bx8': '#00AF87',
    'Bx9': '#00AF87',
    'Bx10': '#00AF87',
    'Bx11': '#00AF87',
    'Bx12': '#00AF87',
    'Bx13': '#00AF87',
    'Bx15': '#00AF87',
    'Bx16': '#00AF87',
    'Bx17': '#00AF87',
    'Bx18': '#00AF87',
    'Bx19': '#00AF87',
    'Bx20': '#00AF87',
    'Bx21': '#00AF87',
    'Bx22': '#00AF87',
    'Bx23': '#00AF87',
    'Bx24': '#00AF87',
    'Bx26': '#00AF87',
    'Bx27': '#00AF87',
    'Bx28': '#00AF87',
    'Bx29': '#00AF87',
    'Bx30': '#00AF87',
    'Bx31': '#00AF87',
    'Bx32': '#00AF87',
    'Bx33': '#00AF87',
    'Bx34': '#00AF87',
    'Bx35': '#00AF87',
    'Bx36': '#00AF87',
    'Bx38': '#00AF87',
    'Bx39': '#00AF87',
    'Bx40': '#00AF87',
    'Bx41': '#00AF87',
    'Bx42': '#00AF87',
    'Bx46': '#00AF87',
    'BxM1': '#00AF87',
    'BxM2': '#00AF87',
    'BxM3': '#00AF87',
    'BxM4': '#00AF87',
    'BxM6': '#00AF87',
    'BxM7': '#00AF87',
    'BxM8': '#00AF87',
    'BxM9': '#00AF87',
    'BxM10': '#00AF87',
    'BxM11': '#00AF87',
    
    'Q1': '#9467BD',   # Queens Bus
    'Q2': '#9467BD',
    'Q3': '#9467BD',
    'Q4': '#9467BD',
    'Q5': '#9467BD',
    'Q6': '#9467BD',
    'Q7': '#9467BD',
    'Q8': '#9467BD',
    'Q9': '#9467BD',
    'Q10': '#9467BD',
    'Q11': '#9467BD',
    'Q12': '#9467BD',
    'Q13': '#9467BD',
    'Q15': '#9467BD',
    'Q16': '#9467BD',
    'Q17': '#9467BD',
    'Q18': '#9467BD',
    'Q19': '#9467BD',
    'Q20': '#9467BD',
    'Q21': '#9467BD',
    'Q22': '#9467BD',
    'Q23': '#9467BD',
    'Q24': '#9467BD',
    'Q25': '#9467BD',
    'Q26': '#9467BD',
    'Q27': '#9467BD',
    'Q28': '#9467BD',
    'Q29': '#9467BD',
    'Q30': '#9467BD',
    'Q31': '#9467BD',
    'Q32': '#9467BD',
    'Q33': '#9467BD',
    'Q34': '#9467BD',
    'Q35': '#9467BD',
    'Q36': '#9467BD',
    'Q37': '#9467BD',
    'Q38': '#9467BD',
    'Q39': '#9467BD',
    'Q40': '#9467BD',
    'Q41': '#9467BD',
    'Q42': '#9467BD',
    'Q43': '#9467BD',
    'Q44': '#9467BD',
    'Q46': '#9467BD',
    'Q47': '#9467BD',
    'Q48': '#9467BD',
    'Q49': '#9467BD',
    'Q50': '#9467BD',
    'Q52': '#9467BD',
    'Q53': '#9467BD',
    'Q54': '#9467BD',
    'Q55': '#9467BD',
    'Q56': '#9467BD',
    'Q58': '#9467BD',
    'Q59': '#9467BD',
    'Q60': '#9467BD',
    'Q64': '#9467BD',
    'Q65': '#9467BD',
    'Q66': '#9467BD',
    'Q67': '#9467BD',
    'Q69': '#9467BD',
    'Q70': '#9467BD',
    'Q72': '#9467BD',
    'Q76': '#9467BD',
    'Q83': '#9467BD',
    'Q84': '#9467BD',
    'Q85': '#9467BD',
    'Q88': '#9467BD',
    'Q100': '#9467BD',
    'Q101': '#9467BD',
    'Q102': '#9467BD',
    'Q103': '#9467BD',
    'Q104': '#9467BD',
    'Q110': '#9467BD',
    'Q111': '#9467BD',
    'Q112': '#9467BD',
    'Q113': '#9467BD',
    
    'S40': '#D16BA5',   # Staten Island Bus
    'S42': '#D16BA5',
    'S44': '#D16BA5',
    'S46': '#D16BA5',
    'S48': '#D16BA5',
    'S51': '#D16BA5',
    'S52': '#D16BA5',
    'S53': '#D16BA5',
    'S54': '#D16BA5',
    'S55': '#D16BA5',
    'S56': '#D16BA5',
    'S57': '#D16BA5',
    'S59': '#D16BA5',
    'S61': '#D16BA5',
    'S62': '#D16BA5',
    'S66': '#D16BA5',
    'S74': '#D16BA5',
    'S76': '#D16BA5',
    'S78': '#D16BA5',
    'S79': '#D16BA5',
    'S81': '#D16BA5',
    'S84': '#D16BA5',
    'S86': '#D16BA5',
    'S89': '#D16BA5',
    'S90': '#D16BA5',
    'S91': '#D16BA5',
    'S92': '#D16BA5',
    'S93': '#D16BA5',
    'S94': '#D16BA5',
    'S96': '#D16BA5',
    'S98': '#D16BA5',
    'SIM1': '#D16BA5',
    'SIM2': '#D16BA5',
    'SIM3': '#D16BA5',
    'SIM4': '#D16BA5',
    'SIM5': '#D16BA5',
    'SIM6': '#D16BA5',
    'SIM7': '#D16BA5',
    'SIM8': '#D16BA5',
    'SIM9': '#D16BA5',
    'SIM10': '#D16BA5',
    'SIM11': '#D16BA5',
    'SIM15': '#D16BA5',
    'SIM22': '#D16BA5',
    'SIM25': '#D16BA5',
    'SIM26': '#D16BA5',
    'SIM30': '#D16BA5',
    'SIM31': '#D16BA5',
    'SIM32': '#D16BA5',
    'SIM33': '#D16BA5',
    'SIM34': '#D16BA5',
    'SIM35': '#D16BA5',
}

# Create FastAPI app
app = FastAPI(
    title="MTA Real-Time Data API",
    description="API for real-time MTA subway, service alerts, and elevator/escalator status",
    version="1.0.0",
)

# Configure CORS to allow requests from the dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
def get_db():
    """
    Creates and returns a MongoDB database connection.
    
    Returns:
        MongoDB database object
        
    Raises:
        HTTPException: If the database connection fails
    """
    # Connect to MongoDB
    try:
        client = MongoClient(MONGODB_URI)
        db = client[MONGODB_DATABASE]
        logger.info(f"Connected to MongoDB at {MONGODB_URI}")
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")

# Data models for API responses
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

# Routes
@app.get("/")
def read_root():
    """
    Root endpoint for API health check.
    
    Returns:
        dict: API status message
    """
    return {"message": "MTA Real-Time Data API", "status": "running"}

@app.get("/stats/summary")
def get_summary_stats(db = Depends(get_db)):
    """
    Get summary statistics of the transit system.
    
    Parameters:
        db: MongoDB database connection from dependency
        
    Returns:
        dict: Summary statistics including active vehicles, lines, alerts,
              and elevator/escalator status
              
    Raises:
        HTTPException: If there's an error getting the statistics
    """
    try:
        # Count of vehicles currently active
        active_vehicles = db.vehicle_positions.count_documents({})
        
        # Count of lines with active service
        pipeline = [
            {"$group": {"_id": "$route_id"}},
            {"$count": "count"}
        ]
        active_lines_result = list(db.vehicle_positions.aggregate(pipeline))
        active_lines = active_lines_result[0]['count'] if active_lines_result else 0
        
        # Count of active alerts
        active_alerts = db.service_alerts.count_documents({}) if "service_alerts" in db.list_collection_names() else 0
        
        # Count of elevator/escalator outages
        active_outages = db.elevator_outages.count_documents({"is_current": True}) if "elevator_outages" in db.list_collection_names() else 0
        
        # Total number of elevator/escalator equipment
        total_equipment = db.elevator_equipment.count_documents({}) if "elevator_equipment" in db.list_collection_names() else 0
        
        # Percentage of equipment in service
        outage_percentage = (active_outages / total_equipment * 100) if total_equipment > 0 else 0
        in_service_percentage = 100 - outage_percentage if total_equipment > 0 else 0
        
        return {
            "active_vehicles": active_vehicles,
            "active_lines": active_lines,
            "active_alerts": active_alerts,
            "elevator_escalator_stats": {
                "active_outages": active_outages,
                "total_equipment": total_equipment,
                "in_service_percentage": round(in_service_percentage, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting summary stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/vehicles")
def get_vehicles(
    route_id: Optional[str] = None,
    route_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get vehicle positions for all or specific routes.
    
    Parameters:
        route_id (Optional[str]): Filter vehicles by specific route ID
        route_type (Optional[str]): Filter by route type ('bus', 'xbus', 'simbus')
        limit (int): Maximum number of results to return (1-1000)
        db: MongoDB database connection from dependency
        
    Returns:
        list: List of vehicle position objects with geographical coordinates and metadata
        
    Raises:
        HTTPException: If there's an error retrieving vehicle data
    """
    try:
        query = {}
        if route_id:
            query["route_id"] = route_id
        
        # Filter by route type if provided
        if route_type:
            if route_type == 'bus':
                # Match Manhattan (M), Brooklyn (B), Bronx (Bx), and Queens (Q) buses
                query["$or"] = [
                    {"route_id": {"$regex": "^M\\d+"}},
                    {"route_id": {"$regex": "^B\\d+"}},
                    {"route_id": {"$regex": "^Bx"}},
                    {"route_id": {"$regex": "^Q\\d+"}}
                ]
            elif route_type == 'xbus':
                # Match Express buses starting with X
                query["route_id"] = {"$regex": "^X"}
            elif route_type == 'simbus':
                # Match Staten Island Express buses starting with SIM
                query["route_id"] = {"$regex": "^SIM"}
        
        vehicles = list(db.vehicle_positions.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit))
        
        # Transform data to match dashboard expectations
        for vehicle in vehicles:
            # Add position object with latitude, longitude, and bearing
            vehicle["position"] = {
                "latitude": vehicle.get("latitude"),
                "longitude": vehicle.get("longitude"),
                "bearing": vehicle.get("bearing")
            }
            
            # Convert timestamp to ISO format if it's a datetime object
            if isinstance(vehicle.get("timestamp"), datetime):
                # Keep the original timestamp field
                pass
            elif isinstance(vehicle.get("timestamp"), int):
                # Convert Unix timestamp to datetime
                vehicle["timestamp"] = datetime.fromtimestamp(vehicle.get("timestamp"))
            
            # Add color information
            route = vehicle.get("route_id", "")
            vehicle["color"] = LINE_COLORS.get(route, "#000000")
        
        return vehicles
    except Exception as e:
        logger.error(f"Error getting vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts")
def get_alerts(
    route_id: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get service alerts for all or specific routes and severity.
    
    Parameters:
        route_id (Optional[str]): Filter alerts by specific route ID
        severity (Optional[str]): Filter alerts by severity level
        limit (int): Maximum number of results to return (1-1000)
        db: MongoDB database connection from dependency
        
    Returns:
        list: List of service alert objects
        
    Raises:
        HTTPException: If there's an error retrieving alert data
    """
    try:
        query = {}
        
        # Filter by route if provided
        if route_id:
            query["routes"] = route_id
        
        # Filter by severity if provided
        if severity:
            query["severity"] = severity
        
        if "service_alerts" not in db.list_collection_names():
            return []
            
        alerts = list(db.service_alerts.find(query, {"_id": 0}).sort("updated", -1).limit(limit))
        
        # Process each alert to ensure proper data formatting
        for alert in alerts:
            # Add color information for each route in the alerts
            routes = alert.get("routes", [])
            route_colors = {}
            for route in routes:
                route_colors[route] = LINE_COLORS.get(route, "#000000")
            alert["route_colors"] = route_colors
            
            # Ensure timestamps are consistent
            # Some fields might be integers (Unix timestamps) - keep them as-is for front-end processing
            # If we get empty or null values for timestamps, set them to None
            if "updated" in alert and alert["updated"] is None:
                alert["updated"] = None
            
            if "start" in alert and alert["start"] is None:
                alert["start"] = None
                
            if "end" in alert and alert["end"] is None:
                alert["end"] = None
            
            # Ensure other fields exist to prevent front-end errors
            if "header" not in alert:
                alert["header"] = ""
                
            if "description" not in alert:
                alert["description"] = ""
                
            if "routes" not in alert:
                alert["routes"] = []
                
            if "severity" not in alert:
                alert["severity"] = "UNKNOWN"
        
        return alerts
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/elevators/outages")
def get_elevator_outages(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    type: str = 'current',
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get elevator and escalator outages with filtering options.
    
    Parameters:
        station (Optional[str]): Filter by station name (fuzzy match)
        borough (Optional[str]): Filter by borough
        equipment_type (Optional[str]): Filter by equipment type (EL, ES)
        type (str): Filter by outage type ('current' or 'upcoming')
        limit (int): Maximum number of results to return (1-1000)
        db: MongoDB database connection from dependency
        
    Returns:
        list: List of elevator/escalator outage objects
        
    Raises:
        HTTPException: If there's an error retrieving outage data
    """
    try:
        # Build query based on parameters
        query = {}
        
        if station:
            query["station"] = {"$regex": station, "$options": "i"}
        
        if borough:
            query["borough"] = {"$regex": borough, "$options": "i"}
            
        if equipment_type:
            query["equipment_type"] = equipment_type
            
        # Handle current vs upcoming outages
        if type == 'current':
            query["is_current"] = True
        else:
            query["is_current"] = False
        
        # Query MongoDB
        outages = list(db.elevator_outages.find(query).limit(limit))
        
        # Convert ObjectId to string
        for outage in outages:
            if "_id" in outage:
                outage["_id"] = str(outage["_id"])
                
        return outages
    except Exception as e:
        logger.error(f"Error getting elevator outages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add an alias to the original endpoint for backward compatibility
@app.get("/elevator/outages")
def get_elevator_outages_alias(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    type: str = 'current',
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Alias for the /elevators/outages endpoint for backward compatibility.
    
    See get_elevator_outages for parameter details.
    """
    return get_elevator_outages(station, borough, equipment_type, type, limit, db)

@app.get("/elevators/equipment")
def get_elevator_equipment(
    station: Optional[str] = None,
    borough: Optional[str] = None,
    equipment_type: Optional[str] = None,
    ada: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get elevator/escalator equipment information.
    
    Parameters:
        station (Optional[str]): Filter by station name (fuzzy match)
        borough (Optional[str]): Filter by borough
        equipment_type (Optional[str]): Filter by equipment type (EL, ES)
        ada (Optional[bool]): Filter by ADA compliance
        limit (int): Maximum number of results to return (1-1000)
        db: MongoDB database connection from dependency
        
    Returns:
        list: List of elevator/escalator equipment objects
        
    Raises:
        HTTPException: If there's an error retrieving equipment data
    """
    try:
        query = {}
        
        # Filter by station if provided
        if station:
            query["station"] = {"$regex": station, "$options": "i"}
        
        # Filter by borough if provided
        if borough:
            query["borough"] = borough
        
        # Filter by equipment type if provided
        if equipment_type:
            query["equipment_type"] = equipment_type
        
        # Filter by ADA compliance if provided
        if ada is not None:
            query["ada"] = ada
        
        if "elevator_equipment" not in db.list_collection_names():
            return []
            
        equipment = list(db.elevator_equipment.find(query, {"_id": 0}).limit(limit))
        return equipment
    except Exception as e:
        logger.error(f"Error getting elevator equipment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/status")
def get_system_status(db = Depends(get_db)):
    """
    Get overall system status for all components.
    
    Parameters:
        db: MongoDB database connection from dependency
        
    Returns:
        dict: System status information including component states
        
    Raises:
        HTTPException: If there's an error retrieving system status
    """
    try:
        collections = db.list_collection_names()
        
        # Check if essential collections exist and have data
        vehicles_status = "OPERATIONAL" if "vehicle_positions" in collections and db.vehicle_positions.count_documents({}) > 0 else "DEGRADED"
        alerts_status = "OPERATIONAL" if "service_alerts" in collections and db.service_alerts.count_documents({}) > 0 else "DEGRADED"
        elevators_status = "OPERATIONAL" if "elevator_outages" in collections and db.elevator_outages.count_documents({}) > 0 else "DEGRADED"
        
        # Overall system status is OPERATIONAL only if all services are operational
        overall_status = "OPERATIONAL" if all(status == "OPERATIONAL" for status in [vehicles_status, alerts_status, elevators_status]) else "DEGRADED"
        
        return {
            "status": overall_status,
            "components": {
                "vehicles_tracking": vehicles_status,
                "service_alerts": alerts_status,
                "elevator_monitoring": elevators_status
            },
            "databases": {
                "collections": collections
            }
        }
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return {
            "status": "ERROR",
            "error": str(e)
        }

@app.get("/routes/stats")
def get_route_stats(
    line_id: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    db = Depends(get_db)
):
    """
    Get statistics about vehicle counts by route.
    
    Parameters:
        line_id (Optional[str]): Filter by line ID
        limit (int): Maximum number of results to return (1-1000)
        db: MongoDB database connection from dependency
        
    Returns:
        list: List of route statistics objects with counts
        
    Raises:
        HTTPException: If there's an error retrieving route stats
    """
    try:
        # Get latest vehicle positions
        pipeline = [
            # Group by route_id
            {
                "$group": {
                    "_id": "$route_id",
                    "count": {"$sum": 1},
                    "line_id": {"$first": "$line_id"}
                }
            },
            # Sort by count descending
            {"$sort": {"count": -1}},
            # Limit results
            {"$limit": limit}
        ]
        
        # Add line_id filter if provided
        if line_id:
            pipeline.insert(0, {"$match": {"line_id": line_id}})
        
        # Execute aggregation
        results = list(db.latest_vehicle_positions.aggregate(pipeline))
        
        # Format results
        route_stats = [
            {
                "route_id": item["_id"],
                "line_id": item["line_id"],
                "count": item["count"]
            } for item in results
        ]
        
        return route_stats
    except Exception as e:
        logger.error(f"Error getting route stats: {str(e)}")
        return []  # Return empty list instead of error to prevent UI issues

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 