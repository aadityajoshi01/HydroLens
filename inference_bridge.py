import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import joblib
import pandas as pd
import time
import numpy as np
import threading

# Load the models
import os
base_dir = os.path.dirname(os.path.abspath(__file__))
stage1_path = os.path.join(base_dir, "ml", "hydrolens_virtual_ph.pkl")
stage2_path = os.path.join(base_dir, "ml", "hydrolens_toxicity_classifier.pkl")

print("Loading ML models...")
try:
    regressor = joblib.load(stage1_path)
    classifier = joblib.load(stage2_path)
    print("Models loaded successfully.")
except Exception as e:
    print(f"Error loading models: {e}")
    exit(1)

# Initialize Firebase Admin
print("Initializing Firebase...")
try:
    # Attempt to initialize with default credentials
    # Ensure you have set the GOOGLE_APPLICATION_CREDENTIALS environment variable
    # OR replace with credentials.Certificate('path/to/serviceAccountKey.json')
    cred = credentials.Certificate('serviceAccountKey.json')
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://iot-basics-5ba4b-default-rtdb.asia-southeast1.firebasedatabase.app'
    })
except Exception as e:
    # If serviceAccountKey.json is not found, fallback to default or prompt user
    print(f"Failed to load serviceAccountKey.json: {e}")
    print("Please ensure serviceAccountKey.json is present in the directory.")
    exit(1)

print("Firebase initialized.")

def listener_callback(event):
    # event.event_type can be 'put' or 'patch'
    # event.path is relative to the listener reference
    # event.data is the data
    
    if event.data is None:
        return
        
    data = event.data
    # If the root node is updated, data might be a dict with the keys
    if isinstance(data, dict):
        if 'tds' in data and 'turbidity' in data and 'temp' in data:
            process_data(data)
        else:
            # Maybe nested entries
            for key, val in data.items():
                if isinstance(val, dict) and 'tds' in val and 'turbidity' in val and 'temp' in val:
                    process_data(val)

def process_data(data):
    try:
        tds = float(data.get('tds', 0))
        turbidity = float(data.get('turbidity', 0))
        temp = float(data.get('temp', 25))
        
        # Stage 1: Predict Virtual pH
        # Assuming input shape is (1, 3)
        input_stage1 = np.array([[tds, turbidity, temp]])
        virtual_ph = float(regressor.predict(input_stage1)[0])
        
        # Stage 2: Predict Toxicity Risk Level
        input_stage2 = np.array([[tds, turbidity, virtual_ph]])
        risk_level = classifier.predict(input_stage2)[0]
        
        # Convert risk_level to string if it's numeric, or keep as is.
        # Assuming it outputs something that can map to Safe, Moderate, High Risk, Toxic
        # We will cast it to standard python types
        if isinstance(risk_level, np.generic):
            risk_level = risk_level.item()
            
        # Push to inference_results
        ref = db.reference('live_monitoring/inference_results')
        result_payload = {
            'virtual_ph': virtual_ph,
            'risk_level': risk_level,
            'timestamp': int(time.time() * 1000)
        }
        ref.push(result_payload)
        print(f"Inference complete. Virtual pH: {virtual_ph:.2f}, Risk Level: {risk_level}")
        
    except Exception as e:
        print(f"Error during inference: {e}")

# Start listening
listener_ref = db.reference('live_monitoring/raw_data')
listener = listener_ref.listen(listener_callback)

print("Listening for new data on live_monitoring/raw_data...")

# Keep the script running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("Shutting down listener...")
    listener.close()
