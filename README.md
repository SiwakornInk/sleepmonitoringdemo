# Sleep Monitoring Frontend

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Frontend will be available at: http://localhost:3000

## 📱 Pages

1. **Real-time Monitoring** (`/`)
   - Start/stop monitoring
   - Live hypnogram visualization
   - Current sleep stage display
   - Real-time apnea detection

2. **Sleep Summary** (`/summary`)
   - Detailed session analysis
   - Sleep score visualization
   - Stage duration breakdown
   - Apnea statistics

3. **Weekly Report** (`/weekly`)
   - 7-day sleep score chart
   - Weekly averages
   - Sleep insights

## 🎨 Features

- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: WebSocket connection for live data
- **Interactive Charts**: Recharts for data visualization
- **Tailwind CSS**: Modern, utility-first styling

## 🔧 Configuration

Environment variables (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## 📁 Project Structure
```
frontend/
├── pages/
│   ├── index.js         # Real-time monitoring
│   ├── summary.js       # Sleep summary
│   ├── weekly.js        # Weekly report
│   └── _app.js          # App wrapper
├── components/
│   ├── Layout.js        # Main layout
│   ├── Hypnogram.js     # Sleep stage chart
│   ├── SleepScore.js    # Score display
│   ├── StageChart.js    # Duration bars
│   └── ApneaStats.js    # Apnea statistics
├── services/
│   └── api.js           # API client
└── styles/
    └── globals.css      # Global styles
```

## 🚀 Deployment

### Deploy to Vercel
```bash
npm run build
vercel
```

### Environment Variables on Vercel
Add these in Vercel dashboard:
- `NEXT_PUBLIC_API_URL`: Your backend API URL
- `NEXT_PUBLIC_WS_URL`: Your WebSocket URL

## 🧪 Demo Mode

The app includes mock data for demonstration when:
- No session ID is provided
- Backend is not available
- API calls fail

This allows testing the UI without the backend.