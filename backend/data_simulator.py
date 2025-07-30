import numpy as np
from scipy.signal import butter, filtfilt
from typing import Tuple, Dict
import logging

logger = logging.getLogger(__name__)

class DataSimulator:
    """Simulate realistic EEG and HR data for demo purposes"""
    
    def __init__(self, sampling_rate: int = 128):
        self.fs = sampling_rate
        self.epoch_duration = 30  # seconds
        self.n_samples = self.fs * self.epoch_duration
        
        # Reset state completely
        self.reset_state()
        
        # Individual variability - RANDOMIZED for each instance
        self.deep_sleep_tendency = np.random.uniform(0.7, 1.3)
        self.rem_tendency = np.random.uniform(0.8, 1.2)
        self.apnea_tendency = np.random.uniform(0.5, 1.5)  # Increased for demo visibility
        self.wake_time = np.random.randint(10, 25)  # 5-12.5 minutes before sleep
        
        # Add more randomization
        self.spindle_frequency = np.random.uniform(0.6, 1.2)
        self.delta_amplitude = np.random.uniform(0.8, 1.2)
        self.stage_stability = np.random.uniform(0.8, 1.2)  # How long to stay in stages
        
        logger.info(f"Simulator initialized: wake_time={self.wake_time}, apnea_tendency={self.apnea_tendency:.3f}")
    
    def reset_state(self):
        """Reset all tracking variables"""
        self.current_epoch = 0
        self.current_stage = 0  # Start with Wake
        self.last_stage = 0  # Track last stage for debugging
        self.stage_duration = 0
        self.sleep_onset_epoch = None
        
        # Stage tracking
        self.time_in_n1 = 0
        self.time_in_n2 = 0
        self.has_entered_n3 = False
        self.current_cycle = 0
        
        # Apnea tracking
        self.last_apnea_epoch = -20  # Allow first apnea after some time
        self.consecutive_apneas = 0
        self.total_apneas = 0
        
    def get_valid_next_stages(self, current: int) -> list:
        """Get strictly valid next stages based on sleep physiology"""
        # CRITICAL: Track if we've never slept yet
        never_slept = self.sleep_onset_epoch is None
        
        if current == 0:  # Wake
            return [0, 1]  # Can only stay wake or go to N1
            
        elif current == 1:  # N1
            # Must stay in N1 for minimum time
            if self.stage_duration < 2:
                return [1]
            # Can wake up, stay, or progress to N2
            return [0, 1, 2]
            
        elif current == 2:  # N2
            # Must stay in N2 for minimum time
            if self.stage_duration < 3:
                return [2]
            
            # Check time since sleep onset
            time_asleep = 0 if self.sleep_onset_epoch is None else (self.current_epoch - self.sleep_onset_epoch)
            
            # Valid transitions depend on sleep timing
            valid = [1, 2]  # Can always go back to N1 or stay
            
            # Can only go to N3 if we've been asleep long enough
            if time_asleep > 10:  # At least 5 minutes
                valid.append(3)
            
            # Can only go to REM after first sleep cycle (90 min) and if we've had N3
            if time_asleep > 180 and self.has_entered_n3:
                valid.append(4)
                
            return valid
            
        elif current == 3:  # N3
            # Must stay in N3 for minimum time
            if self.stage_duration < 10:
                return [3]
            # Can only go back to N2 or stay
            return [2, 3]
            
        elif current == 4:  # REM
            # Must stay in REM for minimum time
            if self.stage_duration < 5:
                return [4]
            # Can only go back to N2 or stay
            return [2, 4]
            
        return [current]  # Default: stay
    
    def get_next_stage(self) -> int:
        """Determine next stage with strict validation and realistic progression"""
        valid_stages = self.get_valid_next_stages(self.current_stage)
        
        # If only one option, use it
        if len(valid_stages) == 1:
            return valid_stages[0]
        
        # Calculate time metrics
        time_since_sleep = 0 if self.sleep_onset_epoch is None else (self.current_epoch - self.sleep_onset_epoch)
        
        # Wake stage logic
        if self.current_stage == 0:
            if self.sleep_onset_epoch is None:
                # Pre-sleep period
                if self.current_epoch >= self.wake_time:
                    logger.info(f"Time to fall asleep at epoch {self.current_epoch}")
                    self.sleep_onset_epoch = self.current_epoch
                    return 1  # Start falling asleep
                return 0  # Stay awake
            else:
                # Brief arousal from sleep
                if self.stage_duration >= 2:
                    return 1  # Go back to light sleep
                return 0
        
        # N1 stage logic
        elif self.current_stage == 1:
            if self.stage_duration < 2:
                return 1  # Minimum duration
            
            # Progress to N2 with some probability
            if self.stage_duration >= 3 and np.random.random() < 0.7:
                return 2
            elif self.stage_duration >= 6:
                return 2  # Force progress
            
            # Small chance to wake
            if np.random.random() < 0.05:
                return 0
                
            return 1
        
        # N2 stage logic  
        elif self.current_stage == 2:
            if self.stage_duration < 3:
                return 2  # Minimum duration
                
            # Early in night - tend toward deep sleep
            if time_since_sleep < 60 and not self.has_entered_n3:
                if 3 in valid_stages and self.stage_duration > 5:
                    if np.random.random() < 0.6 * self.deep_sleep_tendency:
                        return 3
            
            # Later in night - possible REM
            elif time_since_sleep > 200 and self.has_entered_n3:
                if 4 in valid_stages and self.stage_duration > 10:
                    if np.random.random() < 0.4 * self.rem_tendency:
                        return 4
            
            # Occasional return to N1
            if self.stage_duration > 20 and np.random.random() < 0.1:
                return 1
                
            return 2
        
        # N3 stage logic
        elif self.current_stage == 3:
            self.has_entered_n3 = True
            
            if self.stage_duration < 10:
                return 3  # Minimum duration
                
            # Eventually lighten to N2
            if self.stage_duration > 20 and np.random.random() < 0.2:
                return 2
            elif self.stage_duration > 40:
                return 2  # Force return
                
            return 3
        
        # REM stage logic
        elif self.current_stage == 4:
            if self.stage_duration < 5:
                return 4  # Minimum duration
                
            # REM periods get longer later in night
            min_rem = 10 + (time_since_sleep // 180) * 10  # Increase each cycle
            
            if self.stage_duration > min_rem and np.random.random() < 0.15:
                return 2
            elif self.stage_duration > min_rem + 20:
                return 2  # Force return
                
            return 4
        
        return self.current_stage
    
    def simulate_sleep_stage(self) -> int:
        """Get next sleep stage with strict validation"""
        # Store last stage for debugging
        self.last_stage = self.current_stage
        
        # Get next stage
        next_stage = self.get_next_stage()
        
        # Validate transition
        valid_stages = self.get_valid_next_stages(self.current_stage)
        if next_stage not in valid_stages:
            logger.error(f"INVALID transition: {self.current_stage} -> {next_stage}, valid={valid_stages}")
            next_stage = valid_stages[0] if valid_stages else self.current_stage
        
        # Update tracking
        if next_stage != self.current_stage:
            logger.info(f"Stage transition: {self.current_stage} -> {next_stage} at epoch {self.current_epoch}")
            self.current_stage = next_stage
            self.stage_duration = 0
            
            # Reset stage-specific counters
            if next_stage != 1:
                self.time_in_n1 = 0
            if next_stage != 2:
                self.time_in_n2 = 0
        else:
            self.stage_duration += 1
            if self.current_stage == 1:
                self.time_in_n1 += 1
            elif self.current_stage == 2:
                self.time_in_n2 += 1
        
        return self.current_stage
    
    def simulate_apnea(self, sleep_stage: int) -> bool:
        """Simulate apnea with realistic patterns"""
        # No apnea during wake
        if sleep_stage == 0:
            return False
        
        # Check consecutive apneas - MAX 2 in a row
        if self.consecutive_apneas >= 2:
            logger.debug(f"Blocking apnea: already had {self.consecutive_apneas} consecutive")
            return False
        
        # Minimum gap after apnea cluster
        if self.consecutive_apneas == 0:
            # Not in a cluster, check minimum gap (4-8 epochs = 2-4 minutes)
            min_gap = np.random.randint(4, 8)
            if self.current_epoch - self.last_apnea_epoch < min_gap:
                return False
        
        # For demo visibility - ensure some apneas in first 50 epochs
        if self.current_epoch < 50 and self.total_apneas < 2:
            # Increase probability if we haven't had enough apneas yet
            if self.current_epoch > 25 and self.total_apneas == 0:
                # Force at least one apnea after epoch 25
                if self.current_epoch - self.last_apnea_epoch >= 6:
                    logger.debug(f"Demo mode: Forcing first apnea at epoch {self.current_epoch}")
                    return True
            elif self.current_epoch > 35 and self.total_apneas == 1:
                # Try for second apnea
                if self.current_epoch - self.last_apnea_epoch >= 6:
                    if np.random.random() < 0.3:
                        logger.debug(f"Demo mode: Adding second apnea at epoch {self.current_epoch}")
                        return True
        
        # Base probabilities for realistic AHI (adjusted for demo)
        base_probs = {
            1: 0.01,   # N1 - 1%
            2: 0.015,  # N2 - 1.5%
            3: 0.005,  # N3 - 0.5% (least during deep sleep)
            4: 0.025   # REM - 2.5% (most during REM)
        }
        
        prob = base_probs.get(sleep_stage, 0.01) * self.apnea_tendency
        
        # Slightly increase probability if it's been a long time
        time_since_last = self.current_epoch - self.last_apnea_epoch
        if time_since_last > 20:  # 10+ minutes
            prob *= 2
        elif time_since_last > 10:  # 5+ minutes
            prob *= 1.5
        
        if np.random.random() < prob:
            logger.debug(f"Apnea at epoch {self.current_epoch}, consecutive={self.consecutive_apneas + 1}")
            return True
            
        return False
    
    def generate_eeg_signal(self, stage: int) -> np.ndarray:
        """Generate realistic EEG signal based on sleep stage"""
        t = np.linspace(0, self.epoch_duration, self.n_samples)
        
        # Base noise
        noise_amplitudes = {0: 0.15, 1: 0.12, 2: 0.10, 3: 0.08, 4: 0.13}
        noise_level = noise_amplitudes.get(stage, 0.1) * np.random.uniform(0.9, 1.1)
        signal = np.random.randn(self.n_samples) * noise_level
        
        if stage == 0:  # Wake
            # Alpha rhythm (8-13 Hz)
            signal += 0.6 * np.sin(2 * np.pi * np.random.uniform(9, 11) * t)
            # Beta activity
            signal += 0.3 * np.sin(2 * np.pi * np.random.uniform(18, 22) * t)
            signal += 0.2 * np.sin(2 * np.pi * np.random.uniform(24, 28) * t)
            
        elif stage == 1:  # N1
            # Theta activity (4-8 Hz)
            signal += 0.5 * np.sin(2 * np.pi * np.random.uniform(5, 7) * t)
            signal += 0.3 * np.sin(2 * np.pi * np.random.uniform(4, 6) * t)
            # Reduced alpha
            signal += 0.2 * np.sin(2 * np.pi * np.random.uniform(8, 10) * t)
            
        elif stage == 2:  # N2
            # Background theta/delta
            signal += 0.4 * np.sin(2 * np.pi * np.random.uniform(4, 6) * t)
            signal += 0.3 * np.sin(2 * np.pi * np.random.uniform(1, 3) * t)
            
            # Sleep spindles
            n_spindles = np.random.poisson(2)  # Average 2 spindles
            for _ in range(min(n_spindles, 4)):
                spindle_start = np.random.randint(0, max(1, self.n_samples - self.fs))
                spindle_duration = np.random.randint(int(self.fs * 0.5), int(self.fs * 1.5))
                spindle_freq = np.random.uniform(12, 14)
                t_spindle = np.arange(spindle_duration) / self.fs
                envelope = np.sin(np.pi * t_spindle / t_spindle[-1])
                spindle = 0.7 * envelope * np.sin(2 * np.pi * spindle_freq * t_spindle)
                end_idx = min(spindle_start + spindle_duration, self.n_samples)
                signal[spindle_start:end_idx] += spindle[:end_idx - spindle_start]
                
        elif stage == 3:  # N3
            # High amplitude delta waves
            signal += 0.8 * self.delta_amplitude * np.sin(2 * np.pi * np.random.uniform(0.5, 1.5) * t)
            signal += 0.7 * self.delta_amplitude * np.sin(2 * np.pi * np.random.uniform(1, 2) * t)
            signal += 0.5 * self.delta_amplitude * np.sin(2 * np.pi * np.random.uniform(1.5, 2.5) * t)
            
        else:  # REM
            # Mixed frequency, low amplitude
            signal += 0.4 * np.sin(2 * np.pi * np.random.uniform(6, 8) * t)
            signal += 0.3 * np.sin(2 * np.pi * np.random.uniform(9, 11) * t)
            signal += 0.2 * np.sin(2 * np.pi * np.random.uniform(15, 20) * t)
            
            # Occasional sawtooth waves
            if np.random.random() < 0.3:
                n_sawtooth = np.random.randint(1, 3)
                for _ in range(n_sawtooth):
                    st_start = np.random.randint(0, max(1, self.n_samples - self.fs//2))
                    st_duration = min(self.fs//2, self.n_samples - st_start)
                    signal[st_start:st_start + st_duration] += 0.4 * np.random.randn(st_duration)
        
        # Apply bandpass filter
        try:
            b, a = butter(4, [0.3, 35], btype='band', fs=self.fs)
            signal = filtfilt(b, a, signal)
        except:
            pass  # Skip filtering if it fails
        
        # Normalize
        if np.std(signal) > 0:
            signal = (signal - np.mean(signal)) / np.std(signal)
        
        return signal.astype(np.float32)
    
    def generate_hr_signal(self, stage: int, is_apnea: bool = False) -> np.ndarray:
        """Generate realistic HR signal"""
        t = np.linspace(0, self.epoch_duration, self.n_samples)
        
        # Base heart rates by stage
        base_adjustment = np.random.uniform(-3, 3)
        stage_hr = {
            0: 70 + base_adjustment,
            1: 65 + base_adjustment,
            2: 60 + base_adjustment,
            3: 58 + base_adjustment,
            4: 66 + base_adjustment
        }
        base_hr = stage_hr.get(stage, 62)
        
        # Breathing component
        breathing_rates = {0: 16, 1: 14, 2: 12, 3: 10, 4: 18}
        breathing_rate = (breathing_rates.get(stage, 12) + np.random.uniform(-1, 1)) / 60
        
        # Generate HR signal
        hr_signal = base_hr + 3 * np.sin(2 * np.pi * breathing_rate * t)
        hr_signal += 1.5 * np.sin(2 * np.pi * 0.1 * t)  # Slow variation
        
        # REM variations
        if stage == 4:
            hr_signal += 3 * np.sin(2 * np.pi * np.random.uniform(0.2, 0.3) * t)
        
        # Apnea effects
        if is_apnea and stage != 0:
            # Apnea typically in middle third of epoch
            apnea_start = self.n_samples // 3
            apnea_duration = self.n_samples // 3
            
            # Bradycardia during apnea
            brady_depth = np.random.uniform(4, 6)
            brady_curve = -brady_depth * np.hanning(apnea_duration)
            hr_signal[apnea_start:apnea_start + apnea_duration] += brady_curve
            
            # Tachycardia after apnea
            if apnea_start + apnea_duration + self.fs//3 < self.n_samples:
                tachy_height = np.random.uniform(6, 10)
                tachy_duration = self.fs // 3
                tachy_curve = tachy_height * np.exp(-np.arange(tachy_duration) / (self.fs//4))
                hr_signal[apnea_start + apnea_duration:apnea_start + apnea_duration + tachy_duration] += tachy_curve
        
        # Add realistic HR variability
        hr_signal += np.random.randn(self.n_samples) * 0.5
        
        # Ensure physiological limits
        hr_signal = np.clip(hr_signal, 45, 110)
        
        return hr_signal.astype(np.float32)
    
    def simulate_stage_probs(self, predicted_stage: int) -> Dict[str, float]:
        """Generate realistic probability distribution"""
        probs = np.zeros(5)
        
        # Main stage gets high probability
        probs[predicted_stage] = np.random.uniform(0.75, 0.85)
        
        # Add some probability to adjacent stages
        valid_next = self.get_valid_next_stages(predicted_stage)
        
        # Distribute remaining probability
        remaining = 1.0 - probs[predicted_stage]
        noise = np.random.random(5) * 0.1  # Small random noise
        
        for i in range(5):
            if i != predicted_stage:
                if i in valid_next:
                    probs[i] = remaining * 0.15 + noise[i]
                else:
                    probs[i] = noise[i] * 0.5
        
        # Normalize
        probs = probs / probs.sum()
        
        return {
            "Wake": float(probs[0]),
            "N1": float(probs[1]),
            "N2": float(probs[2]),
            "N3": float(probs[3]),
            "REM": float(probs[4])
        }
    
    def generate_epoch_data(self) -> Tuple[np.ndarray, np.ndarray, int, bool]:
        """Generate complete epoch data - RETURNS stage and apnea status"""
        # Get sleep stage
        stage = self.simulate_sleep_stage()
        
        # Simulate apnea
        is_apnea = self.simulate_apnea(stage)
        
        # Update apnea tracking
        if is_apnea:
            self.consecutive_apneas += 1
            self.last_apnea_epoch = self.current_epoch
            self.total_apneas += 1
        else:
            self.consecutive_apneas = 0
        
        # Generate signals
        eeg = self.generate_eeg_signal(stage)
        hr = self.generate_hr_signal(stage, is_apnea)
        
        # Log state periodically
        if self.current_epoch % 20 == 0:
            hours = self.current_epoch * 0.5 / 60
            ahi = self.total_apneas / hours if hours > 0 else 0
            logger.info(f"Epoch {self.current_epoch}: Stage={stage}, Total_apneas={self.total_apneas}, AHI={ahi:.1f}")
        
        # Increment epoch counter
        self.current_epoch += 1
        
        # IMPORTANT: Return stage and apnea status along with signals
        return eeg, hr, stage, is_apnea