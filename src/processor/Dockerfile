FROM bitnami/spark:3.3.1

USER root

# Install Python dependencies
RUN apt-get update && apt-get install -y python3-pip

WORKDIR /app

# Copy requirements file
COPY src/processor/requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/processor/. .

# Run the Spark processor
CMD ["spark-submit", "--packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.1,org.mongodb.spark:mongo-spark-connector_2.12:10.1.1", "main.py"] 
