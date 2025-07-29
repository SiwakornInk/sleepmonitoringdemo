import numpy as np
import pandas as pd
from pathlib import Path
import mne
import lxml.etree as ET
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime, timedelta
import random

logger = logging.getLogger(__name__)

class SHHSDataLoader:
    """Load and stream real SHHS data for demo"""
    
    def __init__(self, shhs_path: str = "D:/SHHS"):
        self.base_path = Path(shhs_path)
        self.edf_directory = self.base_path / "shhs/polysomnography/edfs/shhs1"
        self.annotation_directory = self.base_path / "shhs/polysomnography/annotations-events-nsrr/shhs1"
        
        self.fs = 128  # Resampling frequency
        self.epoch_duration = 30  # seconds
        self.n_samples = self.fs * self.epoch_duration
        
        self.current_subject = None
        self.current_data = None
        self.current_annotations = None
        self.current_epoch = 0
        
        # Cache loaded subjects
        self.subject_cache = {}
        
    def get_available_subjects(self) -> List[str]:
        """Get list of available subject IDs"""
        edf_files = list(self.edf_directory.glob("shhs1-*.edf"))
        subject_ids = []
        
        for edf_file in edf_files[:10]:  # Limit to first 10 for demo
            subject_id = edf_file.stem.split('-')[1]
            annotation_file = self.annotation_directory / f"shhs1-{subject_id}-nsrr.xml"
            
            if annotation_file.exists():
                subject_ids.append(subject_id)
        
        return subject_ids
    
    def load_subject(self, subject_id: str) -> bool:
        """Load a specific subject's data"""
        if subject_id in self.subject_cache:
            logger.info(f"Loading subject {subject_id} from cache")
            cached = self.subject_cache[subject_id]
            self.current_subject = subject_id
            self.current_data = cached['data']
            self.current_annotations = cached['annotations']
            self.current_epoch = 0
            return True
        
        try:
            edf_path = self.edf_directory / f"shhs1-{subject_id}.edf"
            annotation_path = self.annotation_directory / f"shhs1-{subject_id}-nsrr.xml"
            
            if not edf_path.exists() or not annotation_path.exists():
                logger.error(f"Files not found for subject {subject_id}")
                return False
            
            # Load EDF
            logger.info(f"Loading EDF for subject {subject_id}")
            raw = mne.io.read_raw_edf(edf_path, preload=False, verbose=False)
            
            # Get channels
            eeg_ch = None
            ecg_ch = None
            
            for ch in raw.ch_names:
                if 'EEG' in ch and eeg_ch is None:
                    eeg_ch = ch
                elif 'ECG' in ch and ecg_ch is None:
                    ecg_ch = ch
            
            if not eeg_ch:
                logger.error(f"No EEG channel found for subject {subject_id}")
                return False
            
            # Pick channels
            channels = [eeg_ch]
            if ecg_ch:
                channels.append(ecg_ch)
            
            raw.pick(channels)
            raw.load_data()
            
            # Resample if needed
            if raw.info['sfreq'] != self.fs:
                raw.resample(self.fs, npad="auto")
            
            # Get data
            data = raw.get_data()
            
            # Normalize
            for i in range(data.shape[0]):
                if np.std(data[i]) > 0:
                    data[i] = (data[i] - np.mean(data[i])) / np.std(data[i])
            
            # Parse annotations
            annotations = self._parse_annotations(annotation_path, data.shape[1])
            
            # Store in cache
            self.subject_cache[subject_id] = {
                'data': data,
                'annotations': annotations,
                'channels': channels
            }
            
            self.current_subject = subject_id
            self.current_data = data
            self.current_annotations = annotations
            self.current_epoch = 0
            
            logger.info(f"Successfully loaded subject {subject_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error loading subject {subject_id}: {e}")
            return False
    
    def _parse_annotations(self, file_path: Path, n_samples: int) -> Dict:
        """Parse sleep stages and apnea events"""
        annotations = {
            'sleep_stages': [],
            'apnea_events': []
        }
        
        try:
            root = ET.parse(file_path).getroot()
            scored_events = root.find('ScoredEvents')
            
            if scored_events is None:
                return annotations
            
            # Sleep stages
            stage_mapping = {
                'Wake|0': 0,
                'Stage 1 sleep|1': 1,
                'Stage 2 sleep|2': 2,
                'Stage 3 sleep|3': 3,
                'Stage 4 sleep|4': 3,
                'REM sleep|5': 4
            }
            
            # Apnea event types
            apnea_types = [
                'Hypopnea|Hypopnea',
                'Obstructive apnea|Obstructive Apnea',
                'Central apnea|Central Apnea',
                'Mixed apnea|Mixed Apnea'
            ]
            
            for event in scored_events.findall('ScoredEvent'):
                event_concept = event.find('EventConcept')
                if event_concept is None:
                    continue
                
                event_text = event_concept.text
                
                # Sleep stage
                if event_text in stage_mapping:
                    start_elem = event.find('Start')
                    duration_elem = event.find('Duration')
                    
                    if start_elem is not None and duration_elem is not None:
                        start = float(start_elem.text)
                        duration = float(duration_elem.text)
                        stage = stage_mapping[event_text]
                        
                        annotations['sleep_stages'].append({
                            'start': start,
                            'duration': duration,
                            'stage': stage
                        })
                
                # Apnea event
                elif event_text in apnea_types:
                    start_elem = event.find('Start')
                    duration_elem = event.find('Duration')
                    
                    if start_elem is not None and duration_elem is not None:
                        start = float(start_elem.text)
                        duration = float(duration_elem.text)
                        
                        annotations['apnea_events'].append({
                            'start': start,
                            'duration': duration,
                            'type': event_text
                        })
            
            return annotations
            
        except Exception as e:
            logger.error(f"Error parsing annotations: {e}")
            return annotations
    
    def get_epoch_data(self, epoch_number: Optional[int] = None) -> Optional[Dict]:
        """Get data for a specific epoch or the next epoch"""
        if self.current_data is None:
            return None
        
        if epoch_number is not None:
            self.current_epoch = epoch_number
        
        # Calculate epoch boundaries
        start_sample = self.current_epoch * self.n_samples
        end_sample = start_sample + self.n_samples
        
        # Check if we have enough data
        if end_sample > self.current_data.shape[1]:
            return None
        
        # Get epoch data
        epoch_data = self.current_data[:, start_sample:end_sample]
        
        # Get sleep stage for this epoch
        epoch_time = self.current_epoch * self.epoch_duration
        sleep_stage = self._get_stage_at_time(epoch_time)
        
        # Check for apnea events
        is_apnea = self._has_apnea_at_time(epoch_time)
        
        # Prepare result
        result = {
            'epoch_number': self.current_epoch,
            'eeg_signal': epoch_data[0],
            'sleep_stage': sleep_stage,
            'is_apnea': is_apnea
        }
        
        # Add ECG/HR if available
        if epoch_data.shape[0] > 1:
            # Convert ECG to HR (simplified)
            result['hr_signal'] = self._ecg_to_hr(epoch_data[1])
        else:
            # Generate simulated HR
            result['hr_signal'] = self._generate_hr(sleep_stage, is_apnea)
        
        # Move to next epoch
        self.current_epoch += 1
        
        return result
    
    def _get_stage_at_time(self, time_seconds: float) -> int:
        """Get sleep stage at specific time"""
        for stage_event in self.current_annotations['sleep_stages']:
            if (stage_event['start'] <= time_seconds < 
                stage_event['start'] + stage_event['duration']):
                return stage_event['stage']
        return 0  # Default to Wake
    
    def _has_apnea_at_time(self, time_seconds: float) -> bool:
        """Check if there's an apnea event at specific time"""
        for apnea_event in self.current_annotations['apnea_events']:
            if (apnea_event['start'] <= time_seconds < 
                apnea_event['start'] + apnea_event['duration']):
                return True
        return False
    
    def _ecg_to_hr(self, ecg_signal: np.ndarray) -> np.ndarray:
        """Convert ECG to continuous HR (simplified)"""
        # This is a simplified version
        # In real implementation, use the function from your research
        from scipy.signal import find_peaks
        
        peaks, _ = find_peaks(ecg_signal, height=np.std(ecg_signal) * 0.5, 
                              distance=self.fs * 0.5)
        
        if len(peaks) < 2:
            return np.full(len(ecg_signal), 70.0, dtype=np.float32)
        
        # Simple interpolation
        hr_signal = np.full(len(ecg_signal), 70.0, dtype=np.float32)
        
        for i in range(len(peaks) - 1):
            rr_interval = (peaks[i+1] - peaks[i]) / self.fs
            instant_hr = 60.0 / rr_interval
            
            # Fill the signal
            start = peaks[i]
            end = peaks[i+1]
            hr_signal[start:end] = instant_hr
        
        return hr_signal
    
    def _generate_hr(self, sleep_stage: int, is_apnea: bool) -> np.ndarray:
        """Generate HR signal based on sleep stage and apnea"""
        t = np.linspace(0, self.epoch_duration, self.n_samples)
        
        # Base HR by sleep stage
        base_hr_map = {0: 70, 1: 65, 2: 60, 3: 58, 4: 66}
        base_hr = base_hr_map.get(sleep_stage, 65)
        
        # Add variation
        hr = base_hr + 3 * np.sin(2 * np.pi * 0.25 * t)
        
        if is_apnea:
            # Add apnea pattern
            hr[self.n_samples//4:self.n_samples//2] -= 8
            hr[self.n_samples//2:3*self.n_samples//4] += 12
        
        return hr.astype(np.float32)
    
    def get_session_info(self) -> Dict:
        """Get information about current session"""
        if self.current_subject is None:
            return {}
        
        total_epochs = self.current_data.shape[1] // self.n_samples
        total_duration = total_epochs * self.epoch_duration / 60  # minutes
        
        return {
            'subject_id': self.current_subject,
            'total_epochs': total_epochs,
            'total_duration_minutes': total_duration,
            'current_epoch': self.current_epoch,
            'remaining_epochs': total_epochs - self.current_epoch
        }
    
    def load_random_subject(self) -> bool:
        """Load a random available subject"""
        subjects = self.get_available_subjects()
        if not subjects:
            return False
        
        subject_id = random.choice(subjects)
        return self.load_subject(subject_id)