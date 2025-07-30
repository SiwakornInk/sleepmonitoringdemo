import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import Hypnogram from '../components/Hypnogram';
import { sessionAPI, RealtimeMonitor, getSubjects } from '../services/api';
import { Play, Square, Clock, Brain, Wind, Calendar, Database, Zap } from 'lucide-react';

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
  const [currentTime, setCurrentTime] = useState(null); // Changed to null initially
  const [mounted, setMounted] = useState(false); // Add mounted state
  
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
      'Wake': 'bg-wake text-orange-700',
      'N1': 'bg-n1 text-purple-700',
      'N2': 'bg-n2 text-blue-700',
      'N3': 'bg-n3 text-blue-900',
      'REM': 'bg-rem text-red-700'
    };
    return colors[stage] || 'bg-gray-200';
  };

  const handleStartMonitoring = async () => {
    try {
      console.log('Starting monitoring...');
      
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
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        // Start WebSocket connection
        console.log('Creating WebSocket monitor...');
        monitorRef.current = new RealtimeMonitor(sessionData.session_id, (update) => {
          console.log('Received update in component:', update);
          
          // Update state with received data
          setCurrentData(prev => {
            console.log('Previous data:', prev);
            
            // Create new hypnogram entry
            const newEntry = {
              stage: getStageNumber(update.current_stage),
              isApnea: update.is_apnea
            };
            
            // Create completely new array to ensure React detects change
            const newHypnogramData = [...prev.hypnogramData, newEntry];
            console.log('New hypnogram data length:', newHypnogramData.length);
            
            // Return new state object
            const newState = {
              currentStage: update.current_stage,
              totalEpochs: update.total_epochs,
              stageCounts: { ...update.stage_counts },
              apneaCount: update.apnea_count,
              currentAHI: update.current_ahi,
              hypnogramData: newHypnogramData
            };
            
            console.log('New state:', newState);
            return newState;
          });
        });
        
        monitorRef.current.connect();
        console.log('WebSocket connect called');
      }, 100);
      
    } catch (error) {
      console.error('Error starting monitoring:', error);
      alert('Failed to start monitoring: ' + error.message);
      setIsMonitoring(false);
    }
  };

  const handleStopMonitoring = async () => {
    console.log('Stopping monitoring...');
    setIsMonitoring(false);
    
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

  // Debug: Log when hypnogram data changes
  useEffect(() => {
    console.log('Hypnogram data updated, length:', currentData.hypnogramData.length);
  }, [currentData.hypnogramData]);

  // Don't render time-sensitive content until mounted
  if (!mounted) {
    return <Layout><div className="flex items-center justify-center h-64">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Sleep Real Time Monitoring
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor your sleep patterns in real-time
            </p>
          </div>
          
          <button
            onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            disabled={false}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-medium
              transition-all duration-200 shadow-md hover:shadow-lg
              ${isMonitoring 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-primary hover:bg-secondary text-white'
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

        {/* Data source selection */}
        {!isMonitoring && dataSourceAvailable && (
          <div className="card bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Data Source Selection
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dataSource"
                    checked={!useRealData}
                    onChange={() => setUseRealData(false)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="font-medium">Demo Mode</span>
                  <span className="text-sm text-gray-500">(Simulated data)</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="dataSource"
                    checked={useRealData}
                    onChange={() => setUseRealData(true)}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="font-medium">Real SHHS Data</span>
                  <span className="text-sm text-gray-500">(Actual sleep study data)</span>
                </label>
              </div>
              
              {useRealData && availableSubjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Subject (optional)
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Random Subject</option>
                    {availableSubjects.map(subject => (
                      <option key={subject} value={subject}>
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
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sleep Stage and Sleep Apnea</h3>
                {isMonitoring && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-500">Recording</span>
                  </div>
                )}
              </div>
              <div className="h-64">
                {currentData.hypnogramData.length > 0 ? (
                  <Hypnogram 
                    data={currentData.hypnogramData} 
                    showApnea={true}
                    height={250}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    {isMonitoring ? (
                      <div className="text-center">
                        <div className="animate-pulse mb-2">Waiting for data...</div>
                        <div className="text-sm">Data updates every few seconds</div>
                      </div>
                    ) : (
                      'Start monitoring to see data'
                    )}
                  </div>
                )}
              </div>
              
              {/* Legend */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>Sleep Stage</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Sleep Apnea</span>
                </div>
              </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Current Status</h4>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(currentData.currentStage)}`}>
                    {currentData.currentStage}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium">{getDuration()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Epochs</span>
                    <span className="font-medium">{currentData.totalEpochs}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-700">Apnea Events</h4>
                  <Wind className="h-5 w-5 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Events</span>
                    <span className="font-medium text-orange-600">{currentData.apneaCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Current AHI</span>
                    <span className="font-medium text-orange-600">{currentData.currentAHI.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Session info */}
          <div className="space-y-6">
            {/* Date/Time card */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Session Info</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">Current Date</div>
                  <div className="text-2xl font-bold">
                    {currentTime ? currentTime.toLocaleDateString() : '--/--/----'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Current Time</div>
                  <div className="text-2xl font-bold">
                    {currentTime ? currentTime.toLocaleTimeString() : '--:--:--'}
                  </div>
                </div>
                {sessionId && (
                  <div className="pt-3 border-t">
                    <div className="text-sm text-gray-500">Session ID</div>
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded mt-1 break-all">
                      {sessionId}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sleep stages breakdown */}
            <div className="card">
              <h3 className="font-semibold mb-4">Sleep Stages</h3>
              <div className="space-y-3">
                {Object.entries(currentData.stageCounts).map(([stage, count]) => {
                  const percentage = currentData.totalEpochs > 0 
                    ? Math.round((count / currentData.totalEpochs) * 100)
                    : 0;
                  
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{stage}</span>
                        <span className="text-sm text-gray-600">
                          {Math.floor(count * 0.5)}m ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            stage === 'Wake' ? 'bg-wake' :
                            stage === 'N1' ? 'bg-n1' :
                            stage === 'N2' ? 'bg-n2' :
                            stage === 'N3' ? 'bg-n3' :
                            'bg-rem'
                          }`}
                          style={{ 
                            width: `${percentage}%` 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {currentData.totalEpochs > 0 && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  Total epochs: {currentData.totalEpochs}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}