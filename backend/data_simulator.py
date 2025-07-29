import numpy as np
from scipy.signal import butter, filtfilt
from typing import Tuple, Dict

class DataSimulator:
    """Simulate EEG and HR data for demo purposes"""
    
    def __init__(self, sampling_rate: int = 128):
        self.fs = sampling_rate
        self.epoch_duration = 30  # seconds
        self.n_samples = self.fs * self.epoch_duration
        
    def generate_eeg_signal(self, stage: int = None) -> np.ndarray:
        """Generate simulated EEG signal based on sleep stage"""
        t = np.linspace(0, self.epoch_duration, self.n_samples)
        
        if stage is None:
            stage = np.random.randint(0, 5)
        
        # Base noise
        signal = np.random.randn(self.n_samples) * 0.1
        
        # Add stage-specific frequency components
        if stage == 0:  # Wake
            # Alpha (8-13 Hz) and Beta (13-30 Hz)
            signal += 0.5 * np.sin(2 * np.pi * 10 * t)
            signal += 0.3 * np.sin(2 * np.pi * 20 * t)
            
        elif stage == 1:  # N1
            # Theta (4-8 Hz) with reduced alpha
            signal += 0.6 * np.sin(2 * np.pi * 6 * t)
            signal += 0.2 * np.sin(2 * np.pi * 10 * t)
            
        elif stage == 2:  # N2
            # Sleep spindles (12-14 Hz) and K-complexes
            signal += 0.4 * np.sin(2 * np.pi * 5 * t)
            # Add spindles
            spindle_times = np.random.choice(range(0, self.n_samples-self.fs), 3)
            for st in spindle_times:
                spindle = 0.8 * np.sin(2 * np.pi * 13 * t[:self.fs])
                signal[st:st+self.fs] += spindle * np.hanning(self.fs)
                
        elif stage == 3:  # N3
            # Delta waves (0.5-4 Hz)
            signal += 0.8 * np.sin(2 * np.pi * 1 * t)
            signal += 0.5 * np.sin(2 * np.pi * 2 * t)
            
        else:  # REM
            # Mixed frequencies, similar to wake but with theta
            signal += 0.4 * np.sin(2 * np.pi * 6 * t)
            signal += 0.3 * np.sin(2 * np.pi * 10 * t)
            signal += 0.2 * np.sin(2 * np.pi * 15 * t)
        
        # Apply bandpass filter (0.5-50 Hz)
        b, a = butter(4, [0.5, 50], btype='band', fs=self.fs)
        signal = filtfilt(b, a, signal)
        
        # Normalize
        signal = (signal - np.mean(signal)) / np.std(signal)
        
        return signal.astype(np.float32)
    
    def generate_hr_signal(self, is_apnea: bool = False) -> np.ndarray:
        """Generate simulated continuous HR signal"""
        t = np.linspace(0, self.epoch_duration, self.n_samples)
        
        # Base HR around 60-70 bpm
        base_hr = 65 + 5 * np.sin(2 * np.pi * 0.1 * t)  # Slow variation
        
        # Add respiratory sinus arrhythmia
        base_hr += 2 * np.sin(2 * np.pi * 0.25 * t)  # ~15 breaths/min
        
        if is_apnea:
            # Add cyclic variation for apnea events
            apnea_cycles = 2  # 2 apnea events in 30s epoch
            for i in range(apnea_cycles):
                start = i * self.n_samples // apnea_cycles
                end = start + self.n_samples // (apnea_cycles * 2)
                
                # Bradycardia during apnea
                base_hr[start:end] -= 10
                
                # Tachycardia after apnea
                if end < self.n_samples - self.fs:
                    base_hr[end:end+self.fs] += 15
        
        # Add some noise
        base_hr += np.random.randn(self.n_samples) * 1
        
        return base_hr.astype(np.float32)
    
    def generate_epoch_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Generate a complete epoch of EEG and HR data"""
        # Randomly select sleep stage
        stage = self.simulate_sleep_stage(np.random.randint(0, 100))
        
        # Generate EEG
        eeg = self.generate_eeg_signal(stage)
        
        # Simulate apnea (more likely in certain stages)
        is_apnea = self.simulate_apnea(stage)
        
        # Generate HR
        hr = self.generate_hr_signal(is_apnea)
        
        return eeg, hr
    
    def simulate_sleep_stage(self, epoch_number: int) -> int:
        """Simulate realistic sleep stage progression"""
        # Simple sleep architecture simulation
        cycle_length = 90  # 90 epochs = 45 minutes
        position_in_cycle = epoch_number % cycle_length
        
        if position_in_cycle < 10:  # First 5 minutes
            return 0  # Wake
        elif position_in_cycle < 20:  # Next 5 minutes
            return 1  # N1
        elif position_in_cycle < 50:  # Next 15 minutes
            return 2  # N2
        elif position_in_cycle < 70:  # Next 10 minutes
            return 3  # N3
        else:  # Last 10 minutes
            return 4  # REM
    
    def simulate_stage_probs(self, predicted_stage: int) -> Dict[str, float]:
        """Generate realistic probability distribution for stages"""
        probs = np.random.dirichlet(np.ones(5) * 0.5)
        
        # Boost the predicted stage probability
        probs[predicted_stage] += 0.5
        
        # Normalize
        probs = probs / probs.sum()
        
        return {
            "Wake": float(probs[0]),
            "N1": float(probs[1]),
            "N2": float(probs[2]),
            "N3": float(probs[3]),
            "REM": float(probs[4])
        }
    
    def simulate_apnea(self, sleep_stage: int) -> bool:
        """Simulate apnea occurrence based on sleep stage"""
        # Apnea is more common in REM and light sleep
        apnea_probs = {
            0: 0.05,  # Wake
            1: 0.15,  # N1
            2: 0.20,  # N2
            3: 0.10,  # N3
            4: 0.30   # REM
        }
        
        return np.random.random() < apnea_probs.get(sleep_stage, 0.1)