from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict

# Sleep Stage Enums
class SleepStage:
    WAKE = 0
    N1 = 1
    N2 = 2
    N3 = 3
    REM = 4
    
    @classmethod
    def get_name(cls, stage: int) -> str:
        names = {0: "Wake", 1: "N1", 2: "N2", 3: "N3", 4: "REM"}
        return names.get(stage, "Unknown")

# Apnea Severity based on AHI
class ApneaSeverity:
    @staticmethod
    def get_severity(ahi: float) -> Dict[str, str]:
        if ahi < 5:
            return {"level": "Normal", "color": "#4CAF50"}
        elif ahi < 15:
            return {"level": "Mild", "color": "#FFC107"}
        elif ahi < 30:
            return {"level": "Moderate", "color": "#FF9800"}
        else:
            return {"level": "Severe", "color": "#F44336"}

# Request/Response Models
class EpochData(BaseModel):
    eeg_signal: List[float]  # 3840 points (30s * 128Hz)
    hr_signal: Optional[List[float]] = None
    
class PredictionResponse(BaseModel):
    sleep_stage: int
    sleep_stage_name: str
    sleep_stage_probs: Dict[str, float]
    is_apnea: bool
    apnea_probability: float
    timestamp: datetime

class SessionSummary(BaseModel):
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_minutes: float
    sleep_score: int
    
    # Stage durations
    wake_minutes: float
    n1_minutes: float
    n2_minutes: float
    n3_minutes: float
    rem_minutes: float
    
    # Apnea data
    total_apnea_events: int
    ahi: float
    apnea_severity: Dict[str, str]

class RealtimeUpdate(BaseModel):
    session_id: str
    epoch_number: int
    timestamp: datetime
    current_stage: str
    is_apnea: bool
    
    # Cumulative data
    total_epochs: int
    stage_counts: Dict[str, int]
    apnea_count: int
    current_ahi: float

class WeeklyData(BaseModel):
    week_start: datetime
    week_end: datetime
    daily_scores: List[int]
    daily_dates: List[str]
    avg_score: float
    avg_duration: float
    avg_ahi: float