# Hydrolens – Smart Water Quality Monitoring System

Hydrolens is a practical IoT-based system built to monitor water quality in real time and make the results easy to understand. Instead of just showing raw sensor values, it analyzes the data and tells whether the water is safe, moderate, or unsafe.

The idea behind this project is simple: water contamination is often invisible, and by the time people notice it, the damage is already done. Hydrolens aims to solve that by continuously tracking key parameters and giving instant feedback.

## What the project does

The system collects data from water quality sensors and processes it to determine the condition of the water. It does not stop at measurement — it interprets the data and can even take action when needed.

### Main features include:
* **Real-time monitoring** of water quality
* **Conversion of sensor data** into meaningful status (safe/unsafe)
* **Display of data** on an LCD and/or interface
* **Automatic response** (like triggering a relay when water is unsafe)
* **Basic tracking** of readings for analysis

## Core idea

Most people cannot judge water quality just by looking at it. This system removes that guesswork.

Hydrolens continuously reads sensor data, processes it, and classifies water quality. If the quality drops below a safe level, the system alerts the user and can also trigger a hardware response.

## System architecture

The project is divided into two main parts:

### 1. Hardware (IoT Layer)
* **ESP32 microcontroller**
* **TDS sensor** (measures dissolved solids)
* **Turbidity sensor** (measures clarity)
* **Relay module** (for control actions)
* **LCD display** (for local output)

### 2. Software Layer
* Embedded logic for processing sensor values
* Water quality classification logic
* Frontend interface (if used)
* Optional machine learning/data analysis module

## Project structure

* `Hydrolens ML/` → contains data processing or ML-related work
* `hydrolens update/` → contains main IoT code and application logic

## Parameters measured

* **TDS (Total Dissolved Solids)** – indicates the amount of dissolved substances in water
* **Turbidity** – indicates how clear or cloudy the water is

These values are used together to determine overall water quality.

## Water quality logic

The system classifies water into three categories:
1. **Safe** – normal levels, water is usable
2. **Moderate** – not ideal, but not critical
3. **Unsafe** – requires immediate attention

When water becomes unsafe, the system can trigger a relay or alert the user.

## Tech stack
* **ESP32** (IoT hardware)
* **Arduino/C++** for microcontroller programming
* **HTML, CSS, JavaScript** for frontend
* **Firebase** (optional)
* **Machine Learning** (Python/Scikit-learn in Hydrolens ML folder)

## How to run

### 1. Setup the hardware
Connect sensors to ESP32 as per the circuit diagram.

### 2. Upload Code
Open the Arduino IDE and upload the code from the `hydrolens update` folder.

### 3. Run Frontend
Open `index.html` in your browser or run using a local server.

### 4. Run ML module (optional)
Navigate to the `Hydrolens ML` folder and run scripts based on setup.

## Important notes
* **Do not upload sensitive files** like `service_key.json`
* **Calibrate sensors** properly before testing
* System should handle missing sensors gracefully

## Use cases
* Household water safety monitoring
* Hostels and college campuses
* Rural water quality tracking
* Small-scale smart infrastructure

## Future improvements
* Mobile app integration
* Cloud-based dashboard
* Advanced prediction using machine learning
* Location-based water monitoring

---
**Final note:**
Hydrolens focuses on making water quality easy to monitor and understand. The goal is not just to collect data, but to make it useful in real-world situations.
