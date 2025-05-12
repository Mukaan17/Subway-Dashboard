# -*- coding: utf-8 -*-
# @Author: Mukhil Sundararaj
# @Date:   2025-05-11 15:25:30
# @Last Modified by:   Mukhil Sundararaj
# @Last Modified time: 2025-05-11 21:01:38
import os
import json
import time
import logging
from datetime import datetime
from dotenv import load_dotenv
from pyspark.sql import SparkSession
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, 
    FloatType, ArrayType, TimestampType, BooleanType, MapType
)
from pyspark.sql.functions import (
    col, from_json, explode, to_timestamp, unix_timestamp, 
    expr, lit, current_timestamp, window
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
KAFKA_TOPIC_VEHICLES = os.getenv('KAFKA_TOPIC_VEHICLES', 'subway_vehicles')
KAFKA_TOPIC_ALERTS = os.getenv('KAFKA_TOPIC_ALERTS', 'service_alerts')
KAFKA_TOPIC_ELEVATOR_OUTAGES = os.getenv('KAFKA_TOPIC_ELEVATOR_OUTAGES', 'elevator_outages')
KAFKA_TOPIC_ELEVATOR_EQUIPMENT = os.getenv('KAFKA_TOPIC_ELEVATOR_EQUIPMENT', 'elevator_equipment')

# MongoDB Configuration
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://mongodb:27017/')
MONGODB_DATABASE = os.getenv('MONGODB_DATABASE', 'mta_data')

# Configure Spark Session with improved MongoDB connector settings
spark = SparkSession.builder \
    .appName("MTA Data Processor") \
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.1,org.mongodb.spark:mongo-spark-connector_2.12:10.1.1") \
    .config("spark.mongodb.output.uri", MONGODB_URI) \
    .config("spark.mongodb.output.database", MONGODB_DATABASE) \
    .config("spark.mongodb.database", MONGODB_DATABASE) \
    .config("spark.mongodb.write.connection.uri", MONGODB_URI) \
    .config("spark.mongodb.write.database", MONGODB_DATABASE) \
    .config("spark.mongodb.write.maxBatchSize", "512") \
    .config("spark.mongodb.write.ordered", "false") \
    .config("spark.mongodb.connection.timeout", "10000") \
    .config("spark.mongodb.socket.timeout", "10000") \
    .config("spark.mongodb.server.selection.timeout", "10000") \
    .getOrCreate()

# Set log level
spark.sparkContext.setLogLevel("WARN")

# Helper function to write MongoDB data with retries and error handling
def write_to_mongodb(batch_df, epoch_id, collection_name):
    try:
        # Skip empty batches
        if batch_df.isEmpty():
            logger.info(f"Empty batch for collection {collection_name}, skipping write")
            return
        
        # Convert to MongoDB format and write
        logger.info(f"Writing batch #{epoch_id} to MongoDB collection {collection_name}")
        
        # Convert DataFrame to MongoDB format and write
        batch_df.write.format("mongodb") \
            .mode("append") \
            .option("collection", collection_name) \
            .option("database", MONGODB_DATABASE) \
            .option("uri", MONGODB_URI) \
            .option("replaceDocument", "false") \
            .option("ordered", "false") \
            .option("maxBatchSize", "128") \
            .save()
            
        logger.info(f"Successfully wrote batch #{epoch_id} to MongoDB collection {collection_name}")
    except Exception as e:
        logger.error(f"Error writing to MongoDB collection {collection_name}: {str(e)}")

# Define schema for subway vehicle data
vehicle_schema = StructType([
    StructField("line_id", StringType(), True),
    StructField("vehicle_id", StringType(), True),
    StructField("trip_id", StringType(), True),
    StructField("route_id", StringType(), True),
    StructField("start_date", StringType(), True),
    StructField("latitude", FloatType(), True),
    StructField("longitude", FloatType(), True),
    StructField("bearing", FloatType(), True),
    StructField("status", StringType(), True),
    StructField("stop_id", StringType(), True),
    StructField("timestamp", TimestampType(), True),
    StructField("current_stop_sequence", IntegerType(), True),
])

# Define schema for service alerts
alert_schema = StructType([
    StructField("id", StringType(), True),
    StructField("alert_type", StringType(), True),
    StructField("effect", StringType(), True),
    StructField("header", StringType(), True),
    StructField("description", StringType(), True),
    StructField("start", TimestampType(), True),
    StructField("end", TimestampType(), True),
    StructField("updated", TimestampType(), True),
    StructField("severity", StringType(), True),
    StructField("routes", ArrayType(StringType()), True),
])

# Define schema for elevator/escalator outages
elevator_outage_schema = StructType([
    StructField("equipment_id", StringType(), True),
    StructField("station", StringType(), True),
    StructField("borough", StringType(), True),
    StructField("equipment_type", StringType(), True),
    StructField("serving", StringType(), True),
    StructField("outage_start", TimestampType(), True),
    StructField("outage_end", TimestampType(), True),
    StructField("reason", StringType(), True),
    StructField("latest_status", StringType(), True),
    StructField("is_current", BooleanType(), True),
])

# Define schema for elevator/escalator equipment
elevator_equipment_schema = StructType([
    StructField("equipment_id", StringType(), True),
    StructField("station", StringType(), True),
    StructField("borough", StringType(), True),
    StructField("equipment_type", StringType(), True),
    StructField("serving", StringType(), True),
    StructField("ada", BooleanType(), True),
])

def start_processing():
    logger.info("Setting up subway data stream processor...")
    
    # Read subway vehicle stream from Kafka
    vehicle_stream = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", KAFKA_TOPIC_VEHICLES) \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()
    
    # Parse JSON data from Kafka
    parsed_vehicle_stream = vehicle_stream \
        .selectExpr("CAST(value AS STRING) as json_data") \
        .select(from_json(col("json_data"), vehicle_schema).alias("data")) \
        .select("data.*") \
        .withColumn("processed_at", current_timestamp())
    
    # Stream to MongoDB
    vehicle_query = parsed_vehicle_stream \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "vehicle_positions")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/vehicle_positions") \
        .start()
    
    # Create a view of latest vehicle positions without using aggregations
    # Simply write directly to latest_vehicle_positions collection
    latest_vehicle_query = parsed_vehicle_stream \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "latest_vehicle_positions")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/latest_vehicle_positions") \
        .start()
    
    logger.info("Setting up service alerts stream processor...")
    
    # Read service alerts stream from Kafka
    alerts_stream = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", KAFKA_TOPIC_ALERTS) \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()
    
    # Parse JSON data from Kafka
    parsed_alerts_stream = alerts_stream \
        .selectExpr("CAST(value AS STRING) as json_data") \
        .select(from_json(col("json_data"), alert_schema).alias("data")) \
        .select("data.*") \
        .withColumn("processed_at", current_timestamp())
    
    # Stream to MongoDB
    alerts_query = parsed_alerts_stream \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "service_alerts")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/service_alerts") \
        .start()
    
    logger.info("Setting up elevator data stream processor...")
    
    # Read elevator outages stream from Kafka
    elevator_outages_stream = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", KAFKA_TOPIC_ELEVATOR_OUTAGES) \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()
    
    # Parse JSON data from Kafka
    parsed_elevator_outages_stream = elevator_outages_stream \
        .selectExpr("CAST(value AS STRING) as json_data") \
        .select(from_json(col("json_data"), elevator_outage_schema).alias("data")) \
        .select("data.*") \
        .withColumn("processed_at", current_timestamp())
    
    # Stream to MongoDB
    elevator_outages_query = parsed_elevator_outages_stream \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "elevator_outages")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/elevator_outages") \
        .start()
    
    # Stream filtered for current outages
    current_outages_query = parsed_elevator_outages_stream \
        .filter(col("is_current") == True) \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "current_elevator_outages")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/current_elevator_outages") \
        .start()
    
    # Read elevator equipment stream from Kafka
    elevator_equipment_stream = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS) \
        .option("subscribe", KAFKA_TOPIC_ELEVATOR_EQUIPMENT) \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()
    
    # Parse JSON data from Kafka
    parsed_elevator_equipment_stream = elevator_equipment_stream \
        .selectExpr("CAST(value AS STRING) as json_data") \
        .select(from_json(col("json_data"), elevator_equipment_schema).alias("data")) \
        .select("data.*") \
        .withColumn("processed_at", current_timestamp())
    
    # Stream to MongoDB
    elevator_equipment_query = parsed_elevator_equipment_stream \
        .writeStream \
        .foreachBatch(lambda df, epoch_id: write_to_mongodb(df, epoch_id, "elevator_equipment")) \
        .outputMode("append") \
        .option("checkpointLocation", "/tmp/checkpoints/elevator_equipment") \
        .start()
    
    # List of all queries to await termination
    queries = [
        vehicle_query,
        latest_vehicle_query,
        alerts_query,
        elevator_outages_query,
        current_outages_query,
        elevator_equipment_query
    ]
    
    logger.info(f"Started {len(queries)} streaming queries. Awaiting termination...")
    
    # Wait for any of the queries to terminate
    for query in queries:
        query.awaitTermination()

if __name__ == "__main__":
    try:
        start_processing()
    except Exception as e:
        logger.error(f"Error in main process: {str(e)}") 