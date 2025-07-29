import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Hypnogram from '../components/Hypnogram';
import SleepScore from '../components/SleepScore';
import StageChart from '../components/StageChart';
import ApneaStats from '../components/ApneaStats';
import { sessionAPI } from '../services/api';
import { Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

// Mock data for demo when no session ID
const MOCK_DATA = {
  session_id: "demo_session",
  start_time: new Date(new Date().setHours(22, 30, 0, 0)),
  end_time: new Date(new Date().setHours(6, 23, 0, 0)),
  duration_minutes: 473,
  sleep_score: 86,
  wake_minutes: 25,
  n1_minutes: 30,
  n2_minutes: 180,
  n3_minutes: 120,
  rem_minutes: 118,
  total_apnea_events: 41,
  ahi: 5.2,
  apnea_severity: { level: "Mild", color: "#FFC107" }
};

// Generate mock hypnogram data
const generateMockHypnogram = () => {
  const data = [];
  const stages = [0, 1, 2, 3, 2, 3, 2, 4, 2, 3, 2, 4, 1, 0];
  let stageIndex = 0;
  
  for (let i = 0; i < 946; i++) { // ~473 minutes / 0.5 minutes per epoch
    if (i % 90 === 0 && stageIndex < stages.length - 1) {
      stageIndex++;
    }
    data.push({
      stage: stages[stageIndex],
      isApnea: Math.random() < 0.05 && stages[stageIndex] !== 0
    });
  }
  
  return data;
};

export default function SleepSummary() {
  const router = useRouter();
  const { session } = router.query;
  const [summaryData, setSummaryData] = useState(null);
  const [hypnogramData, setHypnogramData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (session) {
        try {
          const data = await sessionAPI.getSummary(session);
          setSummaryData(data);
          // In real app, fetch hypnogram data from epochs
          setHypnogramData(generateMockHypnogram());
        } catch (error) {
          console.error('Error fetching session data:', error);
          // Use mock data on error
          setSummaryData(MOCK_DATA);
          setHypnogramData(generateMockHypnogram());
        }
      } else {
        // Use mock data for demo
        setSummaryData(MOCK_DATA);
        setHypnogramData(generateMockHypnogram());
      }
      setLoading(false);
    };

    fetchData();
  }, [session]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!summaryData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No data available</div>
        </div>
      </Layout>
    );
  }

  const formatTime = (date) => {
    return format(new Date(date), 'HH:mm');
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Sleep Summary
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed analysis of your sleep session
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Date: {format(new Date(summaryData.start_time), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Time: {formatTime(summaryData.start_time)} - {formatTime(summaryData.end_time)}</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hypnogram - spans 2 columns */}
          <div className="lg:col-span-2">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Sleep Stage and Sleep Apnea</h3>
              <div className="mb-6">
                <Hypnogram 
                  data={hypnogramData} 
                  showApnea={true}
                  height={300}
                />
              </div>
              
              {/* Sleep metrics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Duration</div>
                  <div className="text-xl font-bold">{formatDuration(summaryData.duration_minutes)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Sleep Efficiency</div>
                  <div className="text-xl font-bold">
                    {Math.round(((summaryData.duration_minutes - summaryData.wake_minutes) / summaryData.duration_minutes) * 100)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Sleep Latency</div>
                  <div className="text-xl font-bold">12m</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Sleep Score */}
          <div>
            <SleepScore score={summaryData.sleep_score} />
          </div>
        </div>

        {/* Bottom row - 3 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sleep Stages */}
          <StageChart 
            stages={{
              wake: summaryData.wake_minutes,
              n1: summaryData.n1_minutes,
              n2: summaryData.n2_minutes,
              n3: summaryData.n3_minutes,
              rem: summaryData.rem_minutes
            }}
          />
          
          {/* Apnea Statistics */}
          <ApneaStats 
            totalEvents={summaryData.total_apnea_events}
            ahi={summaryData.ahi}
            duration={summaryData.duration_minutes}
          />
          
          {/* Summary Card */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Summary</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Overall Assessment</div>
                <div className="text-lg font-medium">
                  Your sleep quality was <span className="text-green-600">good</span> with{' '}
                  <span className="text-yellow-600">mild sleep apnea</span> detected.
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                  <span>Good sleep efficiency (94%)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                  <span>Sufficient deep sleep (25%)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1"></div>
                  <span>Mild sleep apnea (AHI: {summaryData.ahi})</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                  <span>Good REM sleep (25%)</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <div className="text-xs text-gray-500">
                  Consider consulting a sleep specialist if apnea symptoms persist.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}