import torch
import torch.nn as nn
import numpy as np
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Recreate model architectures (from your research)
class SEBlock(nn.Module):
    def __init__(self, channel, reduction=16):
        super(SEBlock, self).__init__()
        self.avg_pool = nn.AdaptiveAvgPool1d(1)
        self.fc = nn.Sequential(
            nn.Linear(channel, channel // reduction, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(channel // reduction, channel, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _ = x.size()
        y = self.avg_pool(x).view(b, c)
        y = self.fc(y).view(b, c, 1)
        return x * y.expand_as(x)


class ResidualBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size=3, stride=1, downsample=None):
        super(ResidualBlock, self).__init__()
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size, 
                               stride=stride, padding=kernel_size//2)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.relu = nn.ReLU(inplace=True)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size, 
                               stride=1, padding=kernel_size//2)
        self.bn2 = nn.BatchNorm1d(out_channels)
        self.se = SEBlock(out_channels)
        self.downsample = downsample
        
    def forward(self, x):
        identity = x
        
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        
        out = self.conv2(out)
        out = self.bn2(out)
        
        out = self.se(out)
        
        if self.downsample is not None:
            identity = self.downsample(x)
            
        out += identity
        out = self.relu(out)
        
        return out


class EnhancedCNNLSTM(nn.Module):
    def __init__(self, num_channels, num_demographics, num_classes, signal_length, dropout=0.4):
        super(EnhancedCNNLSTM, self).__init__()
        
        self.conv_block1 = nn.Sequential(
            nn.Conv1d(num_channels, 64, kernel_size=7, stride=1, padding=3, bias=False),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Conv1d(64, 64, kernel_size=7, stride=1, padding=3, bias=False),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=3, stride=2)
        )
        self.res_block1 = ResidualBlock(64, 64)

        self.conv_block2 = nn.Sequential(
            nn.Conv1d(64, 128, kernel_size=5, stride=1, padding=2, bias=False),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=3, stride=2)
        )
        self.res_block2 = ResidualBlock(128, 128)
        
        self.conv_block3 = nn.Sequential(
            nn.Conv1d(128, 256, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Conv1d(256, 256, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=3, stride=2)
        )
        self.res_block3 = ResidualBlock(256, 256)

        self.global_pool = nn.AdaptiveAvgPool1d(1)
        
        self.lstm = nn.LSTM(input_size=256, hidden_size=128, num_layers=2, batch_first=True, 
                            bidirectional=True, dropout=dropout)
        
        self.attention = nn.Sequential(
            nn.Linear(256, 128),
            nn.Tanh(),
            nn.Linear(128, 1)
        )
        
        self.use_demographics = num_demographics > 0
        if self.use_demographics:
            self.demographics_net = nn.Sequential(
                nn.Linear(num_demographics, 64),
                nn.ReLU(),
                nn.BatchNorm1d(64),
                nn.Dropout(dropout),
                nn.Linear(64, 32)
            )
        
        final_dim = 256 + (32 if self.use_demographics else 0)
        self.classifier = nn.Sequential(
            nn.Linear(final_dim, 128),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(dropout * 0.5),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, signal, demographics=None):
        x = self.conv_block1(signal)
        x = self.res_block1(x)
        x = self.conv_block2(x)
        x = self.res_block2(x)
        x = self.conv_block3(x)
        x = self.res_block3(x)
        
        x = x.transpose(1, 2)
        
        lstm_out, _ = self.lstm(x)
        
        attention_weights = torch.softmax(self.attention(lstm_out), dim=1)
        attended = torch.sum(attention_weights * lstm_out, dim=1)
        
        if self.use_demographics and demographics is not None:
            demo_features = self.demographics_net(demographics)
            attended = torch.cat([attended, demo_features], dim=1)
            
        return self.classifier(attended)


class ModelManager:
    def __init__(self, model_dir: str = "./models"):
        self.model_dir = Path(model_dir)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.sleep_stage_model = None
        self.apnea_model = None
        
    def load_sleep_stage_model(self, model_path: str = "4_sleep_stage_eeg_only_augmented/model.pth"):
        """Load sleep stage classification model (Experiment 4)"""
        try:
            full_path = self.model_dir / model_path
            checkpoint = torch.load(full_path, map_location=self.device)
            
            # Model config from experiment 4
            model = EnhancedCNNLSTM(
                num_channels=1,  # EEG only
                num_demographics=0,
                num_classes=5,  # Wake, N1, N2, N3, REM
                signal_length=3840,  # 30s * 128Hz
                dropout=0.4
            )
            
            model.load_state_dict(checkpoint['model_state_dict'])
            model.to(self.device)
            model.eval()
            
            self.sleep_stage_model = model
            logger.info("Sleep stage model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading sleep stage model: {e}")
            raise
    
    def load_apnea_model(self, model_path: str = "6_apnea_eeg_continuous_hr/model.pth"):
        """Load apnea detection model (Experiment 6)"""
        try:
            full_path = self.model_dir / model_path
            checkpoint = torch.load(full_path, map_location=self.device)
            
            # Model config from experiment 6
            model = EnhancedCNNLSTM(
                num_channels=2,  # EEG + HR
                num_demographics=0,
                num_classes=2,  # Normal, Apnea
                signal_length=3840,
                dropout=0.4
            )
            
            model.load_state_dict(checkpoint['model_state_dict'])
            model.to(self.device)
            model.eval()
            
            self.apnea_model = model
            logger.info("Apnea model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading apnea model: {e}")
            raise
    
    def predict_sleep_stage(self, eeg_signal: np.ndarray) -> tuple:
        """Predict sleep stage from EEG signal"""
        if self.sleep_stage_model is None:
            raise ValueError("Sleep stage model not loaded")
        
        # Prepare input
        input_tensor = torch.FloatTensor(eeg_signal).unsqueeze(0).unsqueeze(0)  # (1, 1, 3840)
        input_tensor = input_tensor.to(self.device)
        
        with torch.no_grad():
            output = self.sleep_stage_model(input_tensor, torch.empty(0))
            probs = torch.softmax(output, dim=1)
            stage = torch.argmax(output, dim=1).item()
            
        stage_probs = {
            "Wake": probs[0, 0].item(),
            "N1": probs[0, 1].item(),
            "N2": probs[0, 2].item(),
            "N3": probs[0, 3].item(),
            "REM": probs[0, 4].item()
        }
        
        return stage, stage_probs
    
    def predict_apnea(self, eeg_signal: np.ndarray, hr_signal: np.ndarray) -> tuple:
        """Predict apnea from EEG and HR signals"""
        if self.apnea_model is None:
            raise ValueError("Apnea model not loaded")
        
        # Prepare input
        signals = np.stack([eeg_signal, hr_signal])  # (2, 3840)
        input_tensor = torch.FloatTensor(signals).unsqueeze(0)  # (1, 2, 3840)
        input_tensor = input_tensor.to(self.device)
        
        with torch.no_grad():
            output = self.apnea_model(input_tensor, torch.empty(0))
            probs = torch.softmax(output, dim=1)
            is_apnea = torch.argmax(output, dim=1).item() == 1
            apnea_prob = probs[0, 1].item()
            
        return is_apnea, apnea_prob