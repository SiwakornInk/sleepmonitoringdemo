from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from database import Base

class SleepSession(Base):
    __tablename__ = "sleep_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True)
    user_id = Column(String, default="demo_user")
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Summary data
    total_duration_minutes = Column(Float, nullable=True)
    sleep_score = Column(Integer, nullable=True)
    
    # Sleep stages duration (minutes)
    wake_duration = Column(Float, default=0)
    n1_duration = Column(Float, default=0)
    n2_duration = Column(Float, default=0)
    n3_duration = Column(Float, default=0)
    rem_duration = Column(Float, default=0)
    
    # Apnea statistics
    apnea_events = Column(Integer, default=0)
    ahi_index = Column(Float, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class SleepEpoch(Base):
    __tablename__ = "sleep_epochs"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    epoch_number = Column(Integer)
    timestamp = Column(DateTime(timezone=True))
    
    # Predictions
    sleep_stage = Column(Integer)  # 0=Wake, 1=N1, 2=N2, 3=N3, 4=REM
    sleep_stage_prob = Column(JSON)  # Probabilities for each stage
    is_apnea = Column(Boolean, default=False)
    apnea_prob = Column(Float)
    
    # Raw signal data (optional, for visualization)
    eeg_data = Column(JSON, nullable=True)
    hr_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeeklySummary(Base):
    __tablename__ = "weekly_summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="demo_user")
    week_start = Column(DateTime(timezone=True))
    week_end = Column(DateTime(timezone=True))
    
    # Averages
    avg_sleep_score = Column(Float)
    avg_duration_minutes = Column(Float)
    avg_ahi = Column(Float)
    
    # Daily scores (JSON array)
    daily_scores = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())