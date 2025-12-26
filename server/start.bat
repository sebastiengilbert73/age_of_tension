@echo off
echo Starting Age of Tension Backend Server...
echo.
echo Make sure you have:
echo 1. Activated your virtual environment
echo 2. Installed requirements: pip install -r requirements.txt
echo 3. Ollama is running: ollama serve
echo.

cd /d "%~dp0"
python main.py
pause
