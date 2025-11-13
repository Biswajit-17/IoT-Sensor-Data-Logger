import requests
import json
import time
import random
from datetime import datetime, timezone

API_ENDPOINT = "https://rcbe8w2aff.execute-api.us-east-1.amazonaws.com/log-data" 
SEND_INTERVAL_SECONDS = 1800
NUMBER_OF_SENSORS = 3 

# --- Data Generation ---
def generate_sensor_data(sensor_id_prefix="temp", sensor_num=1):
    """
    Generates a dictionary representing simulated sensor data.
    """
    sensor_id = f"{sensor_id_prefix}_{sensor_num:02d}"

    # Simulate temperature around a base, with small fluctuations
    base_temp = 25.0
    temperature = round(base_temp + random.uniform(-4.0, 4.0), 1)

    # Simulate humidity around a base, with small fluctuations
    base_humidity = 60
    humidity = int(base_humidity + random.uniform(-5, 5))

    # Get current UTC timestamp in ISO 8601 format
    timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    data = {
        "sensor_id": sensor_id,
        "temperature": temperature,
        "humidity": humidity,
        "timestamp": timestamp
    }
    return data

# --- Data Sending ---
def send_data_to_lambda(api_endpoint, data):
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(api_endpoint, data=json.dumps(data), headers=headers)
        response.raise_for_status() 
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Data sent successfully: {data['sensor_id']} - Temp: {data['temperature']}C, Hum: {data['humidity']}%")
        return True
    except requests.exceptions.ConnectionError:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Connection Error: Could not connect to {api_endpoint}. Is the backend running?")
        return False
    except requests.exceptions.Timeout:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Timeout Error: The request to {api_endpoint} timed out.")
        return False
    except requests.exceptions.HTTPError as err:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] HTTP Error {err.response.status_code}: {err.response.text}")
        return False
    except requests.exceptions.RequestException as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] An unexpected error occurred: {e}")
        return False

# --- Main Loop ---
def main():
    print(f"Starting sensor data simulator. Sending data every {SEND_INTERVAL_SECONDS} seconds to {API_ENDPOINT}")
    print(f"Simulating {NUMBER_OF_SENSORS} sensors cycling through.")
    
    current_sensor_idx = 1 # Start with sensor_01

    while True:
        sensor_data = generate_sensor_data(sensor_num=current_sensor_idx)
        
        send_data_to_lambda(API_ENDPOINT, sensor_data)
        
        # Cycle to the next sensor ID
        current_sensor_idx = (current_sensor_idx % NUMBER_OF_SENSORS) + 1
        
        time.sleep(SEND_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()