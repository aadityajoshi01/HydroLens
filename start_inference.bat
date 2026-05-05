@echo off
echo Starting ML Inference Bridge in the background...
start "" /B .venv\Scripts\pythonw.exe inference_bridge.py
echo Inference bridge is now running in the background.
