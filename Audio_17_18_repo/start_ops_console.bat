@echo off
cd /d "%~dp0backend"
if not exist .venv python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cd /d "%~dp0"
python scripts\fetch_real_samples.py
cd backend
python run.py
