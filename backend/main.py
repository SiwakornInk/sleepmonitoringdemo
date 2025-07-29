from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio
import json
import numpy as np
from typing import List, Dict, Optional
import logging
import os

from database import engine, get_db
from models import Base, SleepSession, SleepEpoch, WeeklySummary
from schemas import (
    EpochData, PredictionResponse, SessionSummary, 
    RealtimeUpdate, WeeklyData, SleepStage, ApneaSeverity
)
from model_loader import ModelManager
from data_simulator import DataSimulator
from shhs_data_loader import SHHSDataLoader  # New import

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="Sleep Monitoring API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
model_manager = ModelManager()
data_simulator = DataSimulator()

# Initialize SHHS data loader if path exists
SHHS_PATH = os.getenv("SHHS_PATH", "D:/SHHS")
shhs_loader = None
if os.path.exists(SHHS_PATH):
    try:
        shhs_loader = SHHSDataLoader(SHHS_PATH)
        logger.info("SHHS data loader initialized")
    except Exception as e:
        logger.warning(f"Could not initialize SHHS data loader: {e}")

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Startup event
@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    try:
        model_manager.load_sleep_stage_model()
        model_manager.load_apnea_model()
        logger.info("Models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        logger.warning("Running in demo mode with simulated predictions")

# API Endpoints
@app.get("/")
async def root():
    return {
        "message": "Sleep Monitoring API",
        "status": "running",
        "shhs_data_available": shhs_loader is not None
    }

@app.get("/api/subjects")
async def get_available_subjects():
    """Get list of available SHHS subjects"""
    if shhs_loader is None:
        return {"subjects": [], "message": "SHHS data not available"}
    
    subjects = shhs_loader.get_available_subjects()
    return {"subjects": subjects}

@app.post("/api/session/start")
async def start_session(
    subject_id: Optional[str] = None,
    use_real_data: bool = Query(False, description="Use real SHHS data if available"),
    db: Session = Depends(get_db)
):
    """Start a new sleep monitoring session"""
    session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Try to load real SHHS data if requested
    using_real_data = False
    if use_real_data and shhs_loader is not None:
        if subject_id:
            using_real_data = shhs_loader.load_subject(subject_id)
        else:
            using_real_data = shhs_loader.load_random_subject()
        
        if using_real_data:
            logger.info(f"Using real SHHS data for subject {shhs_loader.current_subject}")
    
    session = SleepSession(
        session_id=session_id,
        start_time=datetime.now(),
        is_active=True,
        user_id=subject_id if using_real_data else "demo_user"
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session_id,
        "start_time": session.start_time,
        "using_real_data": using_real_data,
        "subject_id": shhs_loader.current_subject if using_real_data else None
    }

@app.post("/api/session/{session_id}/end")
async def end_session(session_id: str, db: Session = Depends(get_db)):
    """End an active sleep session and calculate summary"""
    session = db.query(SleepSession).filter(
        SleepSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate summary statistics
    epochs = db.query(SleepEpoch).filter(
        SleepEpoch.session_id == session_id
    ).all()
    
    if epochs:
        # Calculate stage durations
        stage_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        apnea_count = 0
        
        for epoch in epochs:
            stage_counts[epoch.sleep_stage] += 1
            if epoch.is_apnea:
                apnea_count += 1
        
        # Convert to minutes (each epoch is 30 seconds)
        session.wake_duration = stage_counts[0] * 0.5
        session.n1_duration = stage_counts[1] * 0.5
        session.n2_duration = stage_counts[2] * 0.5
        session.n3_duration = stage_counts[3] * 0.5
        session.rem_duration = stage_counts[4] * 0.5
        
        session.total_duration_minutes = len(epochs) * 0.5
        session.apnea_events = apnea_count
        session.ahi_index = (apnea_count / (session.total_duration_minutes / 60)) if session.total_duration_minutes > 0 else 0
        
        # Calculate sleep score (simplified)
        total_sleep = session.n1_duration + session.n2_duration + session.n3_duration + session.rem_duration
        sleep_efficiency = (total_sleep / session.total_duration_minutes) if session.total_duration_minutes > 0 else 0
        deep_sleep_ratio = (session.n3_duration / total_sleep) if total_sleep > 0 else 0
        rem_ratio = (session.rem_duration / total_sleep) if total_sleep > 0 else 0
        
        # Score calculation
        score = int(
            sleep_efficiency * 40 +  # 40 points for efficiency
            deep_sleep_ratio * 30 +  # 30 points for deep sleep
            rem_ratio * 20 +         # 20 points for REM
            max(0, 10 - session.ahi_index)  # 10 points minus AHI penalty
        )
        session.sleep_score = max(0, min(100, score))
    
    session.end_time = datetime.now()
    session.is_active = False
    
    db.commit()
    db.refresh(session)
    
    return SessionSummary(
        session_id=session.session_id,
        start_time=session.start_time,
        end_time=session.end_time,
        duration_minutes=session.total_duration_minutes,
        sleep_score=session.sleep_score,
        wake_minutes=session.wake_duration,
        n1_minutes=session.n1_duration,
        n2_minutes=session.n2_duration,
        n3_minutes=session.n3_duration,
        rem_minutes=session.rem_duration,
        total_apnea_events=session.apnea_events,
        ahi=session.ahi_index,
        apnea_severity=ApneaSeverity.get_severity(session.ahi_index)
    )

@app.get("/api/session/{session_id}/summary", response_model=SessionSummary)
async def get_session_summary(session_id: str, db: Session = Depends(get_db)):
    """Get summary for a specific session"""
    session = db.query(SleepSession).filter(
        SleepSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return SessionSummary(
        session_id=session.session_id,
        start_time=session.start_time,
        end_time=session.end_time,
        duration_minutes=session.total_duration_minutes or 0,
        sleep_score=session.sleep_score or 0,
        wake_minutes=session.wake_duration,
        n1_minutes=session.n1_duration,
        n2_minutes=session.n2_duration,
        n3_minutes=session.n3_duration,
        rem_minutes=session.rem_duration,
        total_apnea_events=session.apnea_events,
        ahi=session.ahi_index,
        apnea_severity=ApneaSeverity.get_severity(session.ahi_index)
    )

@app.get("/api/weekly-summary", response_model=WeeklyData)
async def get_weekly_summary(db: Session = Depends(get_db)):
    """Get weekly sleep summary"""
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=6)
    
    sessions = db.query(SleepSession).filter(
        SleepSession.start_time >= start_date,
        SleepSession.start_time <= end_date + timedelta(days=1),
        SleepSession.is_active == False
    ).all()
    
    # Create daily scores dict
    daily_scores = {}
    daily_durations = []
    daily_ahis = []
    
    for i in range(7):
        date = start_date + timedelta(days=i)
        daily_scores[date.strftime("%a")] = 0
    
    # Fill in actual data
    for session in sessions:
        day_name = session.start_time.strftime("%a")
        if session.sleep_score:
            daily_scores[day_name] = session.sleep_score
            daily_durations.append(session.total_duration_minutes or 0)
            daily_ahis.append(session.ahi_index or 0)
    
    return WeeklyData(
        week_start=datetime.combine(start_date, datetime.min.time()),
        week_end=datetime.combine(end_date, datetime.min.time()),
        daily_scores=list(daily_scores.values()),
        daily_dates=list(daily_scores.keys()),
        avg_score=sum(daily_scores.values()) / 7 if daily_scores else 0,
        avg_duration=sum(daily_durations) / len(daily_durations) if daily_durations else 0,
        avg_ahi=sum(daily_ahis) / len(daily_ahis) if daily_ahis else 0
    )

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, db: Session = Depends(get_db)):
    """WebSocket for real-time monitoring"""
    await manager.connect(websocket)
    
    # Check if we're using real SHHS data
    session = db.query(SleepSession).filter(
        SleepSession.session_id == session_id
    ).first()
    
    using_real_data = session and session.user_id != "demo_user" and shhs_loader is not None
    
    try:
        epoch_number = 0
        stage_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        apnea_count = 0
        
        while True:
            logger.info(f"Processing epoch {epoch_number}")
            # Wait 30 seconds (or less for demo)
            await asyncio.sleep(2 if using_real_data else 5)
            
            if using_real_data:
                logger.info("Getting SHHS epoch data...")
                # Get real SHHS data
                epoch_data = shhs_loader.get_epoch_data()
                
                if epoch_data is None:
                    # No more data
                    logger.info("Reached end of SHHS data")
                    break
                
                eeg_signal = epoch_data['eeg_signal']
                hr_signal = epoch_data['hr_signal']
                
                # Use actual annotations if not using models
                if model_manager.sleep_stage_model and model_manager.apnea_model:
                    stage, stage_probs = model_manager.predict_sleep_stage(eeg_signal)
                    is_apnea, apnea_prob = model_manager.predict_apnea(eeg_signal, hr_signal)
                else:
                    # Use ground truth from SHHS
                    stage = epoch_data['sleep_stage']
                    is_apnea = epoch_data['is_apnea']
                    stage_probs = {SleepStage.get_name(i): (1.0 if i == stage else 0.0) 
                                   for i in range(5)}
                    apnea_prob = 0.9 if is_apnea else 0.1
                
            else:
                # Generate simulated signals
                eeg_signal, hr_signal = data_simulator.generate_epoch_data()
                
                # Make predictions or simulate
                if model_manager.sleep_stage_model and model_manager.apnea_model:
                    stage, stage_probs = model_manager.predict_sleep_stage(eeg_signal)
                    is_apnea, apnea_prob = model_manager.predict_apnea(eeg_signal, hr_signal)
                else:
                    # Demo mode with simulated predictions
                    stage = data_simulator.simulate_sleep_stage(epoch_number)
                    stage_probs = data_simulator.simulate_stage_probs(stage)
                    is_apnea = data_simulator.simulate_apnea(stage)
                    apnea_prob = 0.8 if is_apnea else 0.2
            
            # Update counts
            stage_counts[stage] += 1
            if is_apnea:
                apnea_count += 1
            
            # Save to database
            epoch = SleepEpoch(
                session_id=session_id,
                epoch_number=epoch_number,
                timestamp=datetime.now(),
                sleep_stage=stage,
                sleep_stage_prob=stage_probs,
                is_apnea=is_apnea,
                apnea_prob=apnea_prob
            )
            db.add(epoch)
            db.commit()
            
            # Calculate current AHI
            total_hours = (epoch_number + 1) * 0.5 / 60
            current_ahi = apnea_count / total_hours if total_hours > 0 else 0
            
            # Send update to client
            update = RealtimeUpdate(
            session_id=session_id,
            epoch_number=epoch_number,
            timestamp=datetime.now(),
            current_stage=SleepStage.get_name(stage),
            is_apnea=is_apnea,
            total_epochs=epoch_number + 1,
            stage_counts={
                "Wake": stage_counts[0],
                "N1": stage_counts[1],
                "N2": stage_counts[2],
                "N3": stage_counts[3],
                "REM": stage_counts[4]
            },
            apnea_count=apnea_count,
            current_ahi=current_ahi
        )
            logger.info(f"Update data: {update.model_dump()}")
            logger.info(f"Broadcasting update: Stage={update.current_stage}, Epoch={epoch_number}")
            await manager.broadcast(update.model_dump())
            epoch_number += 1
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)