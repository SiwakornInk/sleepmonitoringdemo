# Troubleshooting Guide

## 🔧 Common Issues and Solutions

### Backend Issues

#### 1. PostgreSQL Connection Error
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**Solution:**
- Check if Docker is running: `docker ps`
- Check if PostgreSQL container is up: `docker-compose ps`
- Restart containers: `docker-compose restart`
- Check port 5432 is not already in use

#### 2. Model Loading Error
```
FileNotFoundError: [Errno 2] No such file or directory: './models/...'
```

**Solution:**
- Create model directories:
  ```bash
  mkdir -p backend/models/4_sleep_stage_eeg_only_augmented
  mkdir -p backend/models/6_apnea_eeg_continuous_hr
  ```
- Copy your .pth files to these directories
- The app will run in demo mode if models are not found

#### 3. Python Dependencies Error
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution:**
- Activate virtual environment:
  - Windows: `venv\Scripts\activate`
  - Mac/Linux: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

#### 4. Port Already in Use
```
[Errno 48] Address already in use
```

**Solution:**
- Kill the process using port 8000:
  - Windows: `netstat -ano | findstr :8000` then `taskkill /PID <PID> /F`
  - Mac/Linux: `lsof -ti:8000 | xargs kill -9`

### Frontend Issues

#### 1. npm install Fails
```
npm ERR! code ERESOLVE
```

**Solution:**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json
- Run: `npm install --legacy-peer-deps`

#### 2. WebSocket Connection Failed
```
WebSocket connection to 'ws://localhost:8000/ws/...' failed
```

**Solution:**
- Check backend is running on port 8000
- Check CORS settings in backend
- Try using http://127.0.0.1:8000 instead of localhost

#### 3. Blank Page or Components Not Rendering
```
Error: Cannot find module '../components/Layout'
```

**Solution:**
- Check file paths are correct (case-sensitive on Linux/Mac)
- Restart Next.js dev server: `npm run dev`

### Docker Issues

#### 1. Docker Daemon Not Running
```
Cannot connect to the Docker daemon
```

**Solution:**
- Windows: Start Docker Desktop
- Mac: Start Docker Desktop
- Linux: `sudo systemctl start docker`

#### 2. Container Keeps Restarting
```
postgres_container | FATAL: password authentication failed
```

**Solution:**
- Remove volumes and restart:
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

### Database Issues

#### 1. Cannot Access pgAdmin
**Solution:**
- Check if pgAdmin container is running: `docker ps`
- Try http://localhost:5050 (not https)
- Default credentials:
  - Email: admin@sleep.com
  - Password: admin123

#### 2. Database Migration Error
```
Table 'sleep_sessions' already exists
```

**Solution:**
- This is normal on first run
- Tables are created automatically

## 🧪 Testing the Setup

### 1. Test Backend API
```bash
# Test root endpoint
curl http://localhost:8000

# Start a session
curl -X POST http://localhost:8000/api/session/start
```

### 2. Test Database Connection
```python
# Run in Python console
from backend.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(text("SELECT 1"))
    print(result.fetchone())
```

### 3. Test WebSocket
Open browser console at http://localhost:3000 and run:
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/test_session');
ws.onmessage = (event) => console.log('Received:', event.data);
```

## 📞 Getting Help

1. Check error logs:
   - Backend: Terminal running `python main.py`
   - Frontend: Terminal running `npm run dev`
   - Docker: `docker-compose logs`

2. Common fixes:
   - Restart all services
   - Clear browser cache
   - Update dependencies

3. Demo mode:
   - The app works without model files
   - Uses simulated data for testing