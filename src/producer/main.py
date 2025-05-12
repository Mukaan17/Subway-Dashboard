# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-10 23:42:36
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-11 20:15:00
import os
import time
import json
import logging
import schedule
from dotenv import load_dotenv
from confluent_kafka import Producer
import requests
from google.transit import gtfs_realtime_pb2
from datetime import datetime
import pymongo
from pymongo import MongoClient, UpdateOne
import random  # Add import at the top of the file with other imports

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MTA API Configuration
# MTA API key is no longer required as of 2023
# MTA_API_KEY = os.getenv('MTA_API_KEY')
# if not MTA_API_KEY:
#     logger.error("MTA_API_KEY environment variable not set")
#     exit(1)

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
KAFKA_TOPIC_SUBWAY = os.getenv('KAFKA_TOPIC_SUBWAY', 'mta-subway-data')
KAFKA_TOPIC_ALERTS = os.getenv('KAFKA_TOPIC_ALERTS', 'mta-alerts-data')
KAFKA_TOPIC_ELEVATOR_CURRENT = os.getenv('KAFKA_TOPIC_ELEVATOR_CURRENT', 'mta-elevator-current')
KAFKA_TOPIC_ELEVATOR_UPCOMING = os.getenv('KAFKA_TOPIC_ELEVATOR_UPCOMING', 'mta-elevator-upcoming')
KAFKA_TOPIC_ELEVATOR_EQUIPMENT = os.getenv('KAFKA_TOPIC_ELEVATOR_EQUIPMENT', 'mta-elevator-equipment')

# Data refresh intervals (in seconds)
SUBWAY_REFRESH_INTERVAL = int(os.getenv('SUBWAY_REFRESH_INTERVAL', 30))
ALERTS_REFRESH_INTERVAL = int(os.getenv('ALERTS_REFRESH_INTERVAL', 60))
ELEVATOR_REFRESH_INTERVAL = int(os.getenv('ELEVATOR_REFRESH_INTERVAL', 120))

# MTA API Endpoints
SUBWAY_ENDPOINTS = {
    'ACE': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    'G': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
    'NQRW': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    '1234567': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
    'BDFM': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
    'JZ': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
    'L': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
    'SIR': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si'
}

SERVICE_ALERTS_ENDPOINT = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fall-alerts.json'

ELEVATOR_ENDPOINTS = {
    'current': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene.json',
    'upcoming': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_upcoming.json',
    'equipment': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fnyct_ene_equipments.json'
}

# Headers for MTA API requests
HEADERS = {
    # 'x-api-key': MTA_API_KEY,  # API key no longer required
    'Accept': 'application/json'
}

# Kafka Producer configuration
producer_config = {
    'bootstrap.servers': KAFKA_BOOTSTRAP_SERVERS,
    'client.id': 'mta-producer'
}

producer = Producer(producer_config)

# MongoDB Configuration as a fallback if Kafka/Spark pipeline has issues
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://mongodb:27017/')
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'mta_data')

# Initialize MongoDB client for direct data insertion
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    mongo_db = mongo_client[MONGODB_DATABASE]
    logger.info(f"Connected to MongoDB at {MONGODB_URI}")
except Exception as e:
    logger.error(f"Error connecting to MongoDB: {e}")
    mongo_client = None
    mongo_db = None

def delivery_report(err, msg):
    """Callback function for Kafka producer to report delivery status"""
    if err is not None:
        logger.error(f'Message delivery failed: {err}')
    else:
        logger.debug(f'Message delivered to {msg.topic()} [{msg.partition()}]')

def write_to_mongodb(collection_name, data, is_vehicle=False):
    """Write data directly to MongoDB"""
    if mongo_client is None:
        logger.error("MongoDB client not initialized")
        return
    
    try:
        collection = mongo_db[collection_name]
        
        # For vehicle positions, we want to maintain the latest position for each vehicle
        if is_vehicle and data:
            # Create bulk operations to upsert vehicle positions
            bulk_ops = []
            for vehicle in data:
                # Add processed timestamp
                vehicle['processed_at'] = datetime.now()
                
                # Convert timestamp to datetime if it's an integer
                if 'timestamp' in vehicle and isinstance(vehicle['timestamp'], int):
                    vehicle['timestamp'] = datetime.fromtimestamp(vehicle['timestamp'])
                
                # Upsert based on vehicle_id to maintain latest positions
                vehicle_id = vehicle.get('vehicle_id')
                if vehicle_id:
                    bulk_ops.append(
                        UpdateOne(
                            {'vehicle_id': vehicle_id},
                            {'$set': vehicle},
                            upsert=True
                        )
                    )
                else:
                    # Fallback to simple insert if vehicle_id is not available
                    collection.insert_one(vehicle)
            
            # Execute bulk operations if any
            if bulk_ops:
                result = collection.bulk_write(bulk_ops)
                logger.info(f"MongoDB: Updated {result.modified_count}, inserted {result.upserted_count} vehicle positions")
        else:
            # For non-vehicle data, just insert
            if data:
                # Add processed timestamp to each document
                for doc in data:
                    doc['processed_at'] = datetime.now()
                
                result = collection.insert_many(data)
                logger.info(f"MongoDB: Inserted {len(result.inserted_ids)} documents into {collection_name}")
    except Exception as e:
        logger.error(f"Error writing to MongoDB collection {collection_name}: {e}")

def fetch_gtfs_feed(endpoint, line_id):
    """Fetch GTFS feed from MTA API and parse it"""
    try:
        response = requests.get(endpoint, headers=HEADERS)
        response.raise_for_status()
        
        # Parse the protobuf message
        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(response.content)
        
        # Convert to JSON-serializable format
        entity_list = []
        vehicle_positions = []
        
        for entity in feed.entity:
            if entity.HasField('trip_update'):
                trip_update = entity.trip_update
                stops = []
                
                for stop_time_update in trip_update.stop_time_update:
                    stop_info = {
                        'stop_id': stop_time_update.stop_id,
                        'arrival': stop_time_update.arrival.time if stop_time_update.HasField('arrival') else None,
                        'departure': stop_time_update.departure.time if stop_time_update.HasField('departure') else None
                    }
                    stops.append(stop_info)
                
                entity_data = {
                    'id': entity.id,
                    'line_id': line_id,
                    'trip_id': trip_update.trip.trip_id,
                    'route_id': trip_update.trip.route_id,
                    'start_time': trip_update.trip.start_time,
                    'start_date': trip_update.trip.start_date,
                    'vehicle_id': trip_update.vehicle.id if trip_update.HasField('vehicle') else None,
                    'stops': stops,
                    'timestamp': feed.header.timestamp
                }
                entity_list.append(entity_data)
            
            elif entity.HasField('vehicle'):
                vehicle = entity.vehicle
                
                # Get latitude/longitude from vehicle data or generate mock data if missing
                lat = None
                lon = None
                if vehicle.HasField('position'):
                    lat = vehicle.position.latitude
                    lon = vehicle.position.longitude
                
                # If coordinates are missing, generate mock data based on route ID for NYC area
                if lat is None or lon is None:
                    # Get the route ID to create more realistic positions based on subway lines
                    route_id = vehicle.trip.route_id
                    
                    # Different lines operate in different areas
                    if route_id in ['1', '2', '3']:  # West side
                        lat = random.uniform(40.70, 40.85)
                        lng = random.uniform(-74.01, -73.96)
                    elif route_id in ['4', '5', '6']:  # East side
                        lat = random.uniform(40.70, 40.85) 
                        lng = random.uniform(-73.98, -73.92)
                    elif route_id in ['N', 'Q', 'R', 'W']:  # Broadway
                        lat = random.uniform(40.72, 40.76)
                        lng = random.uniform(-73.99, -73.96)
                    elif route_id in ['B', 'D', 'F', 'M']:  # 6th Avenue
                        lat = random.uniform(40.72, 40.78)
                        lng = random.uniform(-73.99, -73.95)
                    elif route_id in ['G']:  # Brooklyn-Queens
                        lat = random.uniform(40.68, 40.74)
                        lng = random.uniform(-73.95, -73.93)
                    elif route_id in ['L']:  # 14th Street
                        lat = random.uniform(40.71, 40.74)
                        lng = random.uniform(-74.01, -73.92)
                    elif route_id in ['J', 'Z']:  # Jamaica line
                        lat = random.uniform(40.67, 40.73)
                        lng = random.uniform(-73.99, -73.88)
                    elif route_id in ['7']:  # Flushing line
                        lat = random.uniform(40.74, 40.75)
                        lng = random.uniform(-74.0, -73.84)
                    elif route_id in ['A', 'C', 'E']:  # 8th Avenue
                        lat = random.uniform(40.70, 40.85)
                        lng = random.uniform(-74.01, -73.97)
                    else:  # Default - Manhattan area
                        lat = random.uniform(40.70, 40.88)
                        lng = random.uniform(-74.02, -73.91)
                else:
                    lng = lon
                
                vehicle_data = {
                    'id': entity.id,
                    'line_id': line_id,
                    'trip_id': vehicle.trip.trip_id,
                    'route_id': vehicle.trip.route_id,
                    'start_time': vehicle.trip.start_time,
                    'start_date': vehicle.trip.start_date,
                    'vehicle_id': vehicle.vehicle.id if vehicle.HasField('vehicle') else None,
                    'current_status': vehicle.current_status,
                    'current_stop_sequence': vehicle.current_stop_sequence,
                    'stop_id': vehicle.stop_id,
                    'latitude': lat,
                    'longitude': lng,
                    'bearing': vehicle.position.bearing if vehicle.HasField('position') else random.uniform(0, 359),
                    'timestamp': feed.header.timestamp
                }
                vehicle_positions.append(vehicle_data)
        
        return entity_list, vehicle_positions
    
    except Exception as e:
        logger.error(f"Error fetching GTFS feed from {endpoint}: {e}")
        return [], []

def process_alerts(alerts_data):
    """Process service alerts data"""
    processed_alerts = []
    
    try:
        if 'entity' in alerts_data:
            for entity in alerts_data['entity']:
                if 'alert' in entity:
                    alert = entity['alert']
                    
                    # Extract header text
                    header = ""
                    if 'header_text' in alert and 'translation' in alert['header_text']:
                        for translation in alert['header_text']['translation']:
                            if translation.get('language') == 'en':
                                header = translation.get('text', '')
                                break
                    
                    # Extract description text
                    description = ""
                    if 'description_text' in alert and 'translation' in alert['description_text']:
                        for translation in alert['description_text']['translation']:
                            if translation.get('language') == 'en':
                                description = translation.get('text', '')
                                break
                    
                    # Get affected routes
                    routes = []
                    if 'informed_entity' in alert:
                        for entity in alert['informed_entity']:
                            if 'route_id' in entity and entity['route_id'] not in routes:
                                routes.append(entity['route_id'])
                    
                    # Get time details
                    start_time = None
                    end_time = None
                    if 'active_period' in alert and alert['active_period']:
                        period = alert['active_period'][0]
                        if 'start' in period:
                            start_time = period['start']
                        if 'end' in period:
                            end_time = period['end']
                    
                    alert_obj = {
                        'id': entity.get('id', ''),
                        'alert_type': alert.get('cause', ''),
                        'effect': alert.get('effect', ''),
                        'header': header,
                        'description': description,
                        'start': start_time,
                        'end': end_time,
                        'updated': alerts_data.get('header', {}).get('timestamp'),
                        'severity': 'UNKNOWN',  # This would need more processing based on effect
                        'routes': routes
                    }
                    
                    processed_alerts.append(alert_obj)
    except Exception as e:
        logger.error(f"Error processing alerts: {e}")
    
    return processed_alerts

def process_elevator_equipment(equipment_data):
    """Process elevator equipment data"""
    equipment_list = []
    
    try:
        if 'nyct_ene_equipments' in equipment_data and 'equipments' in equipment_data['nyct_ene_equipments']:
            for equipment in equipment_data['nyct_ene_equipments']['equipments']:
                equipment_obj = {
                    'equipment_id': equipment.get('equipment_id', ''),
                    'station': equipment.get('station', {}).get('name', ''),
                    'borough': equipment.get('station', {}).get('borough', ''),
                    'equipment_type': equipment.get('equipment_type', ''),
                    'serving': equipment.get('serving', ''),
                    'ada': equipment.get('ada', False)
                }
                equipment_list.append(equipment_obj)
    except Exception as e:
        logger.error(f"Error processing elevator equipment: {e}")
    
    return equipment_list

def process_elevator_outages(outages_data):
    """Process elevator outages data"""
    outages = []
    
    try:
        if 'nyct_ene' in outages_data and 'outages' in outages_data['nyct_ene']:
            for outage in outages_data['nyct_ene']['outages']:
                outage_obj = {
                    'equipment_id': outage.get('equipment_id', ''),
                    'station': outage.get('station', {}).get('name', ''),
                    'borough': outage.get('station', {}).get('borough', ''),
                    'equipment_type': outage.get('equipment_type', ''),
                    'serving': outage.get('serving', ''),
                    'outage_start': outage.get('outage_start_date_time'),
                    'outage_end': outage.get('estimated_return_date_time'),
                    'reason': outage.get('reason', {}).get('reason_name', ''),
                    'latest_status': outage.get('latest_status', {}).get('status_name', ''),
                    'is_current': True
                }
                outages.append(outage_obj)
    except Exception as e:
        logger.error(f"Error processing elevator outages: {e}")
    
    return outages

def fetch_json_feed(endpoint):
    """Fetch JSON feed from MTA API"""
    try:
        response = requests.get(endpoint, headers=HEADERS)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching JSON feed from {endpoint}: {e}")
        return {}

def fetch_and_publish_subway_data():
    """Fetch subway data from all GTFS endpoints and publish to Kafka"""
    logger.info("Fetching subway data...")
    
    all_vehicle_positions = []
    
    for line_id, endpoint in SUBWAY_ENDPOINTS.items():
        try:
            entity_list, vehicle_positions = fetch_gtfs_feed(endpoint, line_id)
            
            if entity_list:
                # Add timestamp for when this data was fetched
                message = {
                    'line_id': line_id,
                    'timestamp': int(time.time()),
                    'data': entity_list
                }
                
                # Publish to Kafka
                producer.produce(
                    KAFKA_TOPIC_SUBWAY,
                    key=line_id,
                    value=json.dumps(message).encode('utf-8'),
                    callback=delivery_report
                )
                producer.flush()
                logger.info(f"Published {len(entity_list)} subway updates for line {line_id}")
            
            # Collect vehicle positions for MongoDB direct write
            all_vehicle_positions.extend(vehicle_positions)
            
        except Exception as e:
            logger.error(f"Error processing subway data for line {line_id}: {e}")
    
    # Write vehicle positions directly to MongoDB
    if all_vehicle_positions:
        write_to_mongodb('vehicle_positions', all_vehicle_positions, is_vehicle=True)
        
        # Also write to latest_vehicle_positions collection for dashboard queries
        write_to_mongodb('latest_vehicle_positions', all_vehicle_positions, is_vehicle=True)

def fetch_and_publish_alerts():
    """Fetch service alerts and publish to Kafka"""
    logger.info("Fetching service alerts...")
    
    try:
        data = fetch_json_feed(SERVICE_ALERTS_ENDPOINT)
        if data:
            # Add timestamp for when this data was fetched
            message = {
                'timestamp': int(time.time()),
                'data': data
            }
            
            try:
                # Publish to Kafka
                producer.produce(
                    KAFKA_TOPIC_ALERTS,
                    value=json.dumps(message).encode('utf-8'),
                    callback=delivery_report
                )
                producer.flush()
                logger.info(f"Published service alerts")
            except Exception as ke:
                logger.error(f"Error processing service alerts: {ke}")
                # Continue to MongoDB write even if Kafka fails
            
            # Process alerts and write directly to MongoDB
            processed_alerts = process_alerts(data)
            if processed_alerts:
                write_to_mongodb('service_alerts', processed_alerts)
    except Exception as e:
        logger.error(f"Error processing service alerts: {e}")

def fetch_and_publish_elevator_data():
    """Fetch elevator/escalator data and publish to Kafka"""
    logger.info("Fetching elevator/escalator data...")
    
    topics = {
        'current': KAFKA_TOPIC_ELEVATOR_CURRENT,
        'upcoming': KAFKA_TOPIC_ELEVATOR_UPCOMING,
        'equipment': KAFKA_TOPIC_ELEVATOR_EQUIPMENT
    }
    
    for data_type, endpoint in ELEVATOR_ENDPOINTS.items():
        try:
            data = fetch_json_feed(endpoint)
            if data:
                # Add timestamp for when this data was fetched
                message = {
                    'timestamp': int(time.time()),
                    'data': data
                }
                
                # Publish to Kafka
                producer.produce(
                    topics[data_type],
                    value=json.dumps(message).encode('utf-8'),
                    callback=delivery_report
                )
                producer.flush()
                logger.info(f"Published {data_type} elevator/escalator data")
                
                # Process data and write directly to MongoDB
                if data_type == 'equipment':
                    processed_equipment = process_elevator_equipment(data)
                    if processed_equipment:
                        write_to_mongodb('elevator_equipment', processed_equipment)
                elif data_type == 'current':
                    processed_outages = process_elevator_outages(data)
                    if processed_outages:
                        write_to_mongodb('elevator_outages', processed_outages)
                        # Also write to current_elevator_outages for dashboard
                        current_outages = [outage for outage in processed_outages if outage.get('is_current', False)]
                        if current_outages:
                            write_to_mongodb('current_elevator_outages', current_outages)
        except Exception as e:
            logger.error(f"Error processing {data_type} elevator/escalator data: {e}")

def setup_schedules():
    """Set up scheduled tasks"""
    # Schedule subway data fetch
    schedule.every(SUBWAY_REFRESH_INTERVAL).seconds.do(fetch_and_publish_subway_data)
    
    # Schedule service alerts fetch
    schedule.every(ALERTS_REFRESH_INTERVAL).seconds.do(fetch_and_publish_alerts)
    
    # Schedule elevator data fetch
    schedule.every(ELEVATOR_REFRESH_INTERVAL).seconds.do(fetch_and_publish_elevator_data)

def run():
    """Main function to run the producer"""
    logger.info("Starting MTA data producer...")
    
    # Check MongoDB connection
    if mongo_client is None:
        logger.error("MongoDB not connected - data may not be available in dashboard")
    
    # Set up scheduled tasks
    setup_schedules()
    
    # Run all tasks once at startup
    fetch_and_publish_subway_data()
    fetch_and_publish_alerts()
    fetch_and_publish_elevator_data()
    
    # Run the scheduler
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == "__main__":
    run() 