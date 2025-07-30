from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import asyncio
import json
import numpy as np
from typing import List, Dict, Optional
import logging
import os
import traceback

from database import engine, get_db, SessionLocal
from models import Base, SleepSession, SleepEpoch, WeeklySummary
from schemas import (
    EpochData, PredictionResponse, SessionSummary, 
    RealtimeUpdate, WeeklyData, SleepStage, ApneaSeverity
)
from model_loader import ModelManager
from data_simulator import DataSimulator
from shhs_data_loader import SHHSDataLoader  # New import

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(title="Sleep Monitoring API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
model_manager = ModelManager()

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
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session {session_id}")

    async def send_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_json(message)
                logger.debug(f"Sent message to session {session_id}")
            except Exception as e:
                logger.error(f"Error sending message to session {session_id}: {e}")
                # Remove disconnected client
                if "WebSocket" in str(e) or "closed" in str(e):
                    self.disconnect(session_id)

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
    
    logger.info(f"Session {session_id} started successfully, is_active: {session.is_active}")
    
    return {
        "session_id": session_id,
        "start_time": session.start_time,
        "using_real_data": using_real_data,
        "subject_id": shhs_loader.current_subject if using_real_data else None
    }

@app.post("/api/session/{session_id}/end")
async def end_session(session_id: str, db: Session = Depends(get_db)):
    """End an active sleep session and calculate summary"""
    logger.info(f"Ending session {session_id}")
    
    session = db.query(SleepSession).filter(
        SleepSession.session_id == session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Mark session as inactive IMMEDIATELY
    session.is_active = False
    db.commit()
    logger.info(f"Session {session_id} marked as inactive")
    
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
        wake_minutes=session.wake_duration or 0,
        n1_minutes=session.n1_duration or 0,
        n2_minutes=session.n2_duration or 0,
        n3_minutes=session.n3_duration or 0,
        rem_minutes=session.rem_duration or 0,
        total_apnea_events=session.apnea_events or 0,
        ahi=session.ahi_index or 0,
        apnea_severity=ApneaSeverity.get_severity(session.ahi_index or 0)
    )

@app.get("/api/session/{session_id}/epochs")
async def get_session_epochs(session_id: str, db: Session = Depends(get_db)):
    """Get all epochs for a session to create hypnogram"""
    epochs = db.query(SleepEpoch).filter(
        SleepEpoch.session_id == session_id
    ).order_by(SleepEpoch.epoch_number).all()
    
    if not epochs:
        return {"epochs": []}
    
    return {
        "epochs": [
            {
                "epoch_number": epoch.epoch_number,
                "timestamp": epoch.timestamp,
                "sleep_stage": epoch.sleep_stage,
                "is_apnea": epoch.is_apnea
            }
            for epoch in epochs
        ]
    }

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
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for real-time monitoring"""
    logger.info(f"WebSocket endpoint called for session {session_id}")
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Connect WebSocket
        await manager.connect(websocket, session_id)
        
        # Check if session exists
        session = db.query(SleepSession).filter(
            SleepSession.session_id == session_id
        ).first()
        
        if not session:
            logger.error(f"Session {session_id} not found")
            await websocket.close(code=1008, reason="Session not found")
            return
        
        logger.info(f"Session {session_id} found, is_active: {session.is_active}")
        
        # Check if we're using real SHHS data
        using_real_data = session.user_id != "demo_user" and shhs_loader is not None
        
        # Create a new data simulator instance for this session
        data_simulator = DataSimulator()
        data_simulator.reset_state()
        logger.info(f"Data simulator created for session {session_id}")
        
        # Send initial connection confirmation
        await manager.send_to_session(session_id, {"type": "connected", "message": "WebSocket connected"})
        
        # Start monitoring loop
        epoch_number = 0
        stage_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
        apnea_count = 0
        
        logger.info(f"Starting monitoring loop for session {session_id}")
        
        # Create a task to handle incoming messages (like heartbeat)
        async def handle_incoming():
            try:
                while True:
                    data = await websocket.receive_json()
                    if data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
            except WebSocketDisconnect:
                pass
            except Exception:
                pass
        
        # Start incoming message handler
        incoming_task = asyncio.create_task(handle_incoming())
        
        while True:
            try:
                # Check if session is still active
                db.refresh(session)
                if not session.is_active:
                    logger.info(f"Session {session_id} is no longer active, stopping")
                    break
                
                # Generate or get data
                if using_real_data and shhs_loader:
                    logger.info("Getting SHHS epoch data...")
                    epoch_data = shhs_loader.get_epoch_data()
                    
                    if epoch_data is None:
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
                    # Generate simulated data
                    logger.debug(f"Generating simulated data for epoch {epoch_number}")
                    eeg_signal, hr_signal, stage, is_apnea = data_simulator.generate_epoch_data()
                    
                    # Make predictions or simulate
                    if model_manager.sleep_stage_model and model_manager.apnea_model:
                        # Use models if available
                        predicted_stage, stage_probs = model_manager.predict_sleep_stage(eeg_signal)
                        predicted_apnea, apnea_prob = model_manager.predict_apnea(eeg_signal, hr_signal)
                        
                        # For demo, we trust the simulator's stage but could use model predictions
                        # stage = predicted_stage  # Uncomment to use model predictions
                        # is_apnea = predicted_apnea
                    else:
                        # Demo mode - use simulated values
                        stage_probs = data_simulator.simulate_stage_probs(stage)
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
                update_data = {
                    "session_id": session_id,
                    "epoch_number": epoch_number,
                    "timestamp": datetime.now().isoformat(),  # Convert to ISO string
                    "current_stage": SleepStage.get_name(stage),
                    "is_apnea": is_apnea,
                    "total_epochs": epoch_number + 1,
                    "stage_counts": {
                        "Wake": stage_counts[0],
                        "N1": stage_counts[1],
                        "N2": stage_counts[2],
                        "N3": stage_counts[3],
                        "REM": stage_counts[4]
                    },
                    "apnea_count": apnea_count,
                    "current_ahi": current_ahi
                }
                
                # Log and send update
                stage_name = update_data["current_stage"]
                apnea_status = "WITH APNEA" if is_apnea else "no apnea"
                logger.info(f"Epoch {epoch_number}: Stage={stage_name}, {apnea_status}, Total_apneas={apnea_count}, AHI={current_ahi:.1f}")
                
                # Check WebSocket state before sending
                if session_id not in manager.active_connections:
                    logger.warning(f"WebSocket disconnected for session {session_id}, stopping")
                    break
                
                await manager.send_to_session(session_id, update_data)
                
                epoch_number += 1
                
                # Wait before next epoch
                if using_real_data:
                    await asyncio.sleep(2)  # 2 seconds for real data
                else:
                    # For demo mode, make it much faster
                    if epoch_number < 22:
                        await asyncio.sleep(0.5)  # Very fast for first 20 epochs
                    elif epoch_number < 50:
                        await asyncio.sleep(7)    # Fast for next 30 epochs
                    else:
                        await asyncio.sleep(2)    # Normal speed after that
                
                # Optional: Auto-stop after many epochs in demo mode
                if not using_real_data and epoch_number >= 200:
                    logger.info(f"Demo mode: Reached {epoch_number} epochs, stopping")
                    break
                    
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session {session_id}")
                break
            except Exception as e:
                logger.error(f"Error in monitoring loop for session {session_id}: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Continue the loop despite errors
                await asyncio.sleep(1)
                
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
    finally:
        # Cancel incoming handler task
        if 'incoming_task' in locals():
            incoming_task.cancel()
        manager.disconnect(session_id)
        db.close()
        logger.info(f"WebSocket connection closed for session {session_id}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)