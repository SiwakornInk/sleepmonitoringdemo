# 🚀 Quick Start Guide

## Option 1: Automatic Setup (Recommended)

### Windows
```bash
# Double-click or run:
setup-windows.bat
```

### Mac/Linux
```bash
chmod +x setup.sh
./setup.sh
```

## Option 2: Manual Setup

### 1️⃣ Start Database
```bash
docker-compose up -d
```

### 2️⃣ Setup Backend
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

### 3️⃣ Setup Frontend
Open new terminal:
```bash
cd frontend
npm install
npm run dev
```

## 📱 Access the App

1. Open http://localhost:3000
2. Click "Start Monitoring"
3. Watch real-time updates!

## 🧪 Verify Setup

```bash
# Install test dependencies
pip install colorama websocket-client

# Run test script
python test_setup.py
```

## 📁 Model Files

Place your .pth files here:
```
backend/models/
├── 4_sleep_stage_eeg_only_augmented/
│   └── model.pth
└── 6_apnea_eeg_continuous_hr/
    └── model.pth
```

**Note:** App works in demo mode without models!

## 🎯 Quick Commands

**Start everything:**
```bash
# Terminal 1: Database
docker-compose up -d

# Terminal 2: Backend
cd backend && venv\Scripts\activate && python main.py

# Terminal 3: Frontend
cd frontend && npm run dev
```

**Stop everything:**
```bash
# Stop frontend: Ctrl+C in terminal
# Stop backend: Ctrl+C in terminal
# Stop database:
docker-compose down
```

## 🔍 Troubleshooting

**Port already in use?**
- Backend (8000): Change in main.py
- Frontend (3000): Change in package.json
- Database (5432): Change in docker-compose.yml

**Can't connect to database?**
```bash
docker-compose down -v
docker-compose up -d
```

**WebSocket not working?**
- Check backend is running
- Try http://127.0.0.1 instead of localhost

## 📚 Documentation

- API Docs: http://localhost:8000/docs
- pgAdmin: http://localhost:5050
  - Email: admin@sleep.com
  - Password: admin123

That's it! Enjoy monitoring your sleep! 😴