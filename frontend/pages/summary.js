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

export default function SleepSummary() {
  const router = useRouter();
  const { session } = router.query;
  const [summaryData, setSummaryData] = useState(null);
  const [hypnogramData, setHypnogramData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!session) {
        setLoading(false);
        return;
      }

      try {
        // Get session summary
        const summary = await sessionAPI.getSummary(session);
        setSummaryData(summary);
        
        // Get epochs for hypnogram
        const epochsData = await sessionAPI.getEpochs(session);
        if (epochsData.epochs && epochsData.epochs.length > 0) {
          // Convert epochs to hypnogram format
          const hypnogramFormatted = epochsData.epochs.map(epoch => ({
            stage: epoch.sleep_stage,
            isApnea: epoch.is_apnea
          }));
          setHypnogramData(hypnogramFormatted);
        }
      } catch (error) {
        console.error('Error fetching session data:', error);
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

  if (!summaryData || !session) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-gray-500 mb-4">No session data available</div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary"
            >
              Start New Session
            </button>
          </div>
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

  // Calculate sleep latency (time to first non-wake stage)
  const calculateSleepLatency = () => {
    if (hypnogramData.length === 0) return 0;
    
    for (let i = 0; i < hypnogramData.length; i++) {
      if (hypnogramData[i].stage !== 0) { // Not wake
        return i * 0.5; // Each epoch is 0.5 minutes
      }
    }
    return 0;
  };

  // Generate assessment based on actual data
  const generateAssessment = () => {
    const efficiency = summaryData.duration_minutes > 0 
      ? Math.round(((summaryData.duration_minutes - summaryData.wake_minutes) / summaryData.duration_minutes) * 100)
      : 0;
    
    const deepSleepPercent = summaryData.duration_minutes > 0
      ? Math.round((summaryData.n3_minutes / summaryData.duration_minutes) * 100)
      : 0;
    
    const remPercent = summaryData.duration_minutes > 0
      ? Math.round((summaryData.rem_minutes / summaryData.duration_minutes) * 100)
      : 0;

    let qualityText = "";
    if (summaryData.sleep_score >= 80) qualityText = "excellent";
    else if (summaryData.sleep_score >= 60) qualityText = "good";
    else if (summaryData.sleep_score >= 40) qualityText = "fair";
    else qualityText = "poor";

    let apneaText = "";
    if (summaryData.ahi < 5) apneaText = "no significant sleep apnea";
    else if (summaryData.ahi < 15) apneaText = "mild sleep apnea";
    else if (summaryData.ahi < 30) apneaText = "moderate sleep apnea";
    else apneaText = "severe sleep apnea";

    return {
      overall: `Your sleep quality was ${qualityText} with ${apneaText} detected.`,
      efficiency: efficiency,
      deepSleepPercent: deepSleepPercent,
      remPercent: remPercent,
      points: []
    };
  };

  const assessment = generateAssessment();

  // Generate assessment points
  if (assessment.efficiency >= 85) {
    assessment.points.push({ status: 'good', text: `Excellent sleep efficiency (${assessment.efficiency}%)` });
  } else if (assessment.efficiency >= 70) {
    assessment.points.push({ status: 'okay', text: `Good sleep efficiency (${assessment.efficiency}%)` });
  } else {
    assessment.points.push({ status: 'bad', text: `Poor sleep efficiency (${assessment.efficiency}%)` });
  }

  if (assessment.deepSleepPercent >= 15) {
    assessment.points.push({ status: 'good', text: `Sufficient deep sleep (${assessment.deepSleepPercent}%)` });
  } else {
    assessment.points.push({ status: 'bad', text: `Insufficient deep sleep (${assessment.deepSleepPercent}%)` });
  }

  if (summaryData.ahi < 5) {
    assessment.points.push({ status: 'good', text: 'No significant sleep apnea' });
  } else if (summaryData.ahi < 15) {
    assessment.points.push({ status: 'okay', text: `Mild sleep apnea (AHI: ${summaryData.ahi.toFixed(1)})` });
  } else {
    assessment.points.push({ status: 'bad', text: `Significant sleep apnea (AHI: ${summaryData.ahi.toFixed(1)})` });
  }

  if (assessment.remPercent >= 20) {
    assessment.points.push({ status: 'good', text: `Good REM sleep (${assessment.remPercent}%)` });
  } else if (assessment.remPercent >= 15) {
    assessment.points.push({ status: 'okay', text: `Adequate REM sleep (${assessment.remPercent}%)` });
  } else {
    assessment.points.push({ status: 'bad', text: `Low REM sleep (${assessment.remPercent}%)` });
  }

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
                {hypnogramData.length > 0 ? (
                  <Hypnogram 
                    data={hypnogramData} 
                    showApnea={true}
                    height={300}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No epoch data available
                  </div>
                )}
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
                  <div className="text-xl font-bold">{calculateSleepLatency()}m</div>
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
                  {assessment.overall}
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {assessment.points.map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1 ${
                      point.status === 'good' ? 'bg-green-500' :
                      point.status === 'okay' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                    <span>{point.text}</span>
                  </div>
                ))}
              </div>
              
              {summaryData.ahi >= 5 && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Consider consulting a sleep specialist for your sleep apnea symptoms.
                  </div>
                </div>
              )}
              
              {summaryData.sleep_score < 60 && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-gray-500">
                    Your sleep quality needs improvement. Consider reviewing your sleep habits.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}