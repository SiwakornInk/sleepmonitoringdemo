@echo off
echo ====================================
echo Sleep Monitoring Demo Setup (Windows)
echo ====================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/5] Starting PostgreSQL database...
docker-compose up -d
timeout /t 5 >nul

echo.
echo [2/5] Creating Python virtual environment...
cd backend
python -m venv venv
call venv\Scripts\activate

echo.
echo [3/5] Installing Python dependencies...
pip install -r requirements.txt

echo.
echo [4/5] Creating model directories...
mkdir models\4_sleep_stage_eeg_only_augmented 2>nul
mkdir models\6_apnea_eeg_continuous_hr 2>nul

echo.
echo ====================================
echo IMPORTANT: Model Files Required
echo ====================================
echo Please copy your .pth model files to:
echo - backend\models\4_sleep_stage_eeg_only_augmented\model.pth
echo - backend\models\6_apnea_eeg_continuous_hr\model.pth
echo.
echo The app will run in DEMO MODE if models are not found.
echo ====================================
echo.

echo [5/5] Starting backend server...
start cmd /k "cd backend && venv\Scripts\activate && python main.py"

echo.
echo Waiting for backend to start...
timeout /t 5 >nul

echo.
echo Now setting up frontend...
cd ..\frontend

echo Installing frontend dependencies...
call npm install

echo.
echo Starting frontend server...
start cmd /k "cd frontend && npm run dev"

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo Backend API: http://localhost:8000
echo Frontend: http://localhost:3000
echo pgAdmin: http://localhost:5050
echo.
echo Press any key to exit...
pause >nul