import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Hypnogram from '../components/Hypnogram';
import { sessionAPI, RealtimeMonitor, getSubjects } from '../services/api';
import { Play, Square, Clock, Brain, Wind, Calendar, Database, Zap, Wifi, WifiOff, Activity, Moon } from 'lucide-react';

export default function RealTimeMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentData, setCurrentData] = useState({
    currentStage: 'Wake',
    totalEpochs: 0,
    stageCounts: { Wake: 0, N1: 0, N2: 0, N3: 0, REM: 0 },
    apneaCount: 0,
    currentAHI: 0,
    hypnogramData: []
  });
  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  // SHHS data options
  const [useRealData, setUseRealData] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dataSourceAvailable, setDataSourceAvailable] = useState(false);
  
  const monitorRef = useRef(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
  }, []);

  // Check if SHHS data is available
  useEffect(() => {
    const checkDataSource = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        const data = await response.json();
        setDataSourceAvailable(data.shhs_data_available || false);
        
        if (data.shhs_data_available) {
          const subjects = await getSubjects();
          setAvailableSubjects(subjects.subjects || []);
        }
      } catch (error) {
        console.error('Error checking data source:', error);
        setDataSourceAvailable(false);
      }
    };
    
    if (mounted) {
      checkDataSource();
    }
  }, [mounted]);

  // Update current time every second
  useEffect(() => {
    if (!mounted) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [mounted]);

  // Calculate duration
  const getDuration = () => {
    if (!startTime || !currentTime) return '00:00:00';
    const diff = currentTime - new Date(startTime);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStageNumber = (stageName) => {
    const stageMap = { 'Wake': 0, 'N1': 1, 'N2': 2, 'N3': 3, 'REM': 4 };
    return stageMap[stageName] || 0;
  };

  const getStageColor = (stage) => {
    const colors = {
      'Wake': 'from-orange-400 to-orange-600',
      'N1': 'from-purple-400 to-purple-600',
      'N2': 'from-blue-400 to-blue-600',
      'N3': 'from-indigo-400 to-indigo-600',
      'REM': 'from-pink-400 to-pink-600'
    };
    return colors[stage] || 'from-gray-400 to-gray-600';
  };

  const getStageIcon = (stage) => {
    const icons = {
      'Wake': '☀️',
      'N1': '🌤️',
      'N2': '🌙',
      'N3': '💤',
      'REM': '✨'
    };
    return icons[stage] || '😴';
  };

  const handleStartMonitoring = async () => {
    try {
      console.log('Starting monitoring...');
      setConnectionStatus('connecting');
      
      // Start session
      const sessionData = await sessionAPI.start(useRealData, selectedSubject || null);
      console.log('Session started:', sessionData);
      
      setSessionId(sessionData.session_id);
      setStartTime(sessionData.start_time);
      setIsMonitoring(true);
      
      // Reset data
      setCurrentData({
        currentStage: 'Wake',
        totalEpochs: 0,
        stageCounts: { Wake: 0, N1: 0, N2: 0, N3: 0, REM: 0 },
        apneaCount: 0,
        currentAHI: 0,
        hypnogramData: []
      });
      setLastUpdateTime(null);
      
      // Create WebSocket connection
      console.log('Creating WebSocket monitor...');
      const monitor = new RealtimeMonitor(
        sessionData.session_id, 
        // onUpdate callback
        (update) => {
          console.log('Received update:', update);
          
          // Handle connection confirmation
          if (update.type === 'connected') {
            console.log('WebSocket connection confirmed');
            return;
          }
          
          setLastUpdateTime(new Date());
          
          // Update state with received data
          setCurrentData(prev => {
            // Create new hypnogram entry
            const newEntry = {
              stage: getStageNumber(update.current_stage),
              isApnea: update.is_apnea
            };
            
            // Create new array
            const newHypnogramData = [...prev.hypnogramData, newEntry];
            
            // Return new state
            return {
              currentStage: update.current_stage || 'Wake',
              totalEpochs: update.total_epochs || 0,
              stageCounts: update.stage_counts || { Wake: 0, N1: 0, N2: 0, N3: 0, REM: 0 },
              apneaCount: update.apnea_count || 0,
              currentAHI: update.current_ahi || 0,
              hypnogramData: newHypnogramData
            };
          });
        },
        // onConnectionChange callback
        (status) => {
          console.log('Connection status changed:', status);
          setConnectionStatus(status);
        }
      );
      
      monitorRef.current = monitor;
      monitor.connect();
      
    } catch (error) {
      console.error('Error starting monitoring:', error);
      alert('Failed to start monitoring: ' + error.message);
      setIsMonitoring(false);
      setConnectionStatus('error');
    }
  };

  const handleStopMonitoring = async () => {
    console.log('Stopping monitoring...');
    setIsMonitoring(false);
    setConnectionStatus('disconnected');
    
    // Disconnect WebSocket first
    if (monitorRef.current) {
      monitorRef.current.disconnect();
      monitorRef.current = null;
    }
    
    // End session
    if (sessionId) {
      try {
        await sessionAPI.end(sessionId);
        // Redirect to summary page
        window.location.href = `/summary?session=${sessionId}`;
      } catch (error) {
        console.error('Error stopping monitoring:', error);
        alert('Error stopping session: ' + error.message);
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (monitorRef.current) {
        monitorRef.current.disconnect();
      }
    };
  }, []);

  // Format time since last update
  const getTimeSinceUpdate = () => {
    if (!lastUpdateTime) return 'No data yet';
    const diff = new Date() - lastUpdateTime;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Don't render time-sensitive content until mounted
  if (!mounted) {
    return <Layout><div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary animate-pulse">
                <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              Sleep Real Time Monitoring
            </h1>
            <p className="text-gray-400 mt-2">
              Monitor your sleep patterns in real-time with AI analysis
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection status indicator */}
            {isMonitoring && (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm
                ${connectionStatus === 'connected' 
                  ? 'bg-green-500/20 border border-green-500/30' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-500/20 border border-yellow-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
                }`}>
                {connectionStatus === 'connected' ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-400 animate-pulse" />
                    <span className="text-green-400">Connected</span>
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <Wifi className="h-4 w-4 text-yellow-400 animate-pulse" />
                    <span className="text-yellow-400">Connecting...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">Disconnected</span>
                  </>
                )}
              </div>
            )}
            
            <button
              onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
              disabled={false}
              className={`
                flex items-center gap-3 px-6 py-3 rounded-xl font-medium
                transition-all duration-300 transform hover:scale-105
                ${isMonitoring 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/30' 
                  : 'btn-primary'
                }
              `}
            >
              {isMonitoring ? (
                <>
                  <Square className="h-5 w-5" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-5 w-5" />
                  Start Monitoring
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data source selection */}
        {!isMonitoring && dataSourceAvailable && (
          <div className="glass-card p-6 rounded-3xl animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary-400" />
              Data Source Selection
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`
                  relative flex items-center gap-3 p-4 rounded-xl cursor-pointer
                  border-2 transition-all duration-300
                  ${!useRealData 
                    ? 'border-primary bg-primary/10' 
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                  }
                `}>
                  <input
                    type="radio"
                    name="dataSource"
                    checked={!useRealData}
                    onChange={() => setUseRealData(false)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${!useRealData ? 'border-primary' : 'border-gray-500'}`}>
                    {!useRealData && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                  </div>
                  <div>
                    <span className="font-medium text-white">Demo Mode</span>
                    <p className="text-xs text-gray-400 mt-1">Simulated sleep data</p>
                  </div>
                </label>
                
                <label className={`
                  relative flex items-center gap-3 p-4 rounded-xl cursor-pointer
                  border-2 transition-all duration-300
                  ${useRealData 
                    ? 'border-primary bg-primary/10' 
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                  }
                `}>
                  <input
                    type="radio"
                    name="dataSource"
                    checked={useRealData}
                    onChange={() => setUseRealData(true)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${useRealData ? 'border-primary' : 'border-gray-500'}`}>
                    {useRealData && <div className="w-3 h-3 bg-primary rounded-full"></div>}
                  </div>
                  <div>
                    <span className="font-medium text-white">Real SHHS Data</span>
                    <p className="text-xs text-gray-400 mt-1">Actual sleep study data</p>
                  </div>
                </label>
              </div>
              
              {useRealData && availableSubjects.length > 0 && (
                <div className="animate-slide-down">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Subject (optional)
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl 
                      text-white placeholder-gray-500 focus:outline-none focus:border-primary
                      focus:bg-white/20 hover:bg-white/15 transition-all duration-200 cursor-pointer"
                    style={{
                      colorScheme: 'dark',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239CA3AF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="" className="bg-gray-900 text-white py-2">Random Subject</option>
                    {availableSubjects.map(subject => (
                      <option key={subject} value={subject} className="bg-gray-900 text-white py-2">
                        Subject {subject}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Hypnogram */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hypnogram card */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Sleep Stage and Sleep Apnea</h3>
                {isMonitoring && (
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-400">
                      Last update: {getTimeSinceUpdate()}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 
                      border border-green-500/30">
                      <Wifi className="h-4 w-4 text-green-400 animate-pulse" />
                      <span className="text-sm text-green-400">Live</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-64 sm:h-80">
                {currentData.hypnogramData.length > 0 ? (
                  <Hypnogram 
                    data={currentData.hypnogramData} 
                    showApnea={true}
                    height={window.innerWidth < 640 ? 250 : 320}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    {isMonitoring ? (
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 text-primary-400 animate-pulse" />
                        <div className="text-lg mb-2">Waiting for data...</div>
                        <div className="text-sm">Sleep analysis will begin shortly</div>
                        {connectionStatus === 'connecting' && (
                          <div className="text-xs mt-2 text-yellow-400">Establishing connection...</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <Moon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                        <div className="text-lg">Start monitoring to begin</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Status */}
              <div className="glass-card p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-400">Current Status</h4>
                  <div className={`px-4 py-2 rounded-xl text-sm font-bold text-white
                    bg-gradient-to-r ${getStageColor(currentData.currentStage)}`}>
                    <span className="mr-2">{getStageIcon(currentData.currentStage)}</span>
                    {currentData.currentStage}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Duration
                    </span>
                    <span className="font-mono font-semibold text-white">{getDuration()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Total Epochs
                    </span>
                    <span className="font-semibold text-white">{currentData.totalEpochs || 0}</span>
                  </div>
                </div>
              </div>

              {/* Apnea Events */}
              <div className="glass-card p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-400">Apnea Events</h4>
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Wind className="h-5 w-5 text-orange-400" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Total Events</span>
                    <span className="text-xl font-bold text-orange-400">{currentData.apneaCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Current AHI</span>
                    <span className="text-xl font-bold text-orange-400">
                      {currentData.currentAHI ? currentData.currentAHI.toFixed(1) : '0.0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Session info */}
          <div className="space-y-6">
            {/* Date/Time card */}
            <div className="glass-card p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-primary">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-white">Session Info</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Current Date</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {currentTime ? currentTime.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    }) : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Current Time</div>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-xl"></div>
                    <div className="relative text-2xl sm:text-3xl font-mono font-bold text-white bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-white/10">
                      {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
                    </div>
                  </div>
                </div>
                {sessionId && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2">Session ID</div>
                    <div className="text-xs font-mono bg-white/5 p-3 rounded-lg break-all text-gray-300 border border-white/10">
                      {sessionId}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sleep stages breakdown */}
            <div className="glass-card p-6 rounded-3xl">
              <h3 className="font-semibold text-white mb-4">Sleep Stages</h3>
              <div className="space-y-3">
                {Object.entries(currentData.stageCounts).map(([stage, count]) => {
                  const percentage = currentData.totalEpochs > 0 
                    ? Math.round((count / currentData.totalEpochs) * 100)
                    : 0;
                  
                  const stageColors = {
                    'Wake': 'from-orange-400 to-orange-600',
                    'N1': 'from-purple-400 to-purple-600',
                    'N2': 'from-blue-400 to-blue-600',
                    'N3': 'from-indigo-400 to-indigo-600',
                    'REM': 'from-pink-400 to-pink-600'
                  };
                  
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white flex items-center gap-2">
                          <span>{getStageIcon(stage)}</span>
                          {stage}
                        </span>
                        <span className="text-sm text-gray-400">
                          {Math.floor(count * 0.5)}m ({percentage}%)
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r 
                            ${stageColors[stage]} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {currentData.totalEpochs > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total epochs</span>
                  <span className="text-sm font-semibold text-white">{currentData.totalEpochs || 0}</span>
                </div>
              )}
            </div>

            {/* Debug info - only show in development */}
            {process.env.NODE_ENV === 'development' && isMonitoring && (
              <div className="glass-card p-4 rounded-xl text-xs">
                <h4 className="font-semibold text-white mb-2">Debug Info</h4>
                <div className="space-y-1 text-gray-400">
                  <div>Connection: {connectionStatus}</div>
                  <div>Epochs received: {currentData.totalEpochs}</div>
                  <div>Last update: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}</div>
                  <div>Session ID: {sessionId || 'None'}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}