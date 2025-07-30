import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Hypnogram from '../components/Hypnogram';
import SleepScore from '../components/SleepScore';
import StageChart from '../components/StageChart';
import ApneaStats from '../components/ApneaStats';
import { sessionAPI } from '../services/api';
import { Calendar, Clock, FileText, Download, Share2, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!summaryData || !session) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="h-16 w-16 text-gray-600 mb-4" />
          <div className="text-gray-400 mb-6">No session data available</div>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Start New Session
          </button>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              Sleep Summary
            </h1>
            <p className="text-gray-400 mt-2">
              Detailed analysis of your sleep session
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl">
              <Calendar className="h-4 w-4 text-primary-400" />
              <span className="text-gray-300">{format(new Date(summaryData.start_time), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl">
              <Clock className="h-4 w-4 text-primary-400" />
              <span className="text-gray-300">{formatTime(summaryData.start_time)} - {formatTime(summaryData.end_time)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hypnogram - spans 2 columns */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 rounded-3xl h-full">
              <h3 className="text-lg font-semibold text-white mb-4">Sleep Pattern Analysis</h3>
              <div className="mb-6">
                {hypnogramData.length > 0 ? (
                  <Hypnogram 
                    data={hypnogramData} 
                    showApnea={true}
                    height={window.innerWidth < 640 ? 250 : 350}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    No epoch data available
                  </div>
                )}
              </div>
              
              {/* Sleep metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white/5">
                <div className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="text-xs text-gray-400 mb-2">Total Duration</div>
                  <div className="text-2xl font-bold text-white">{formatDuration(summaryData.duration_minutes)}</div>
                </div>
                <div className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="text-xs text-gray-400 mb-2">Sleep Efficiency</div>
                  <div className="text-2xl font-bold text-primary-400">
                    {Math.round(((summaryData.duration_minutes - summaryData.wake_minutes) / summaryData.duration_minutes) * 100)}%
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="text-xs text-gray-400 mb-2">Sleep Latency</div>
                  <div className="text-2xl font-bold text-white">{calculateSleepLatency()}m</div>
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
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-400" />
              Sleep Assessment
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <div className="text-sm font-medium text-gray-300 mb-2">Overall Quality</div>
                <div className="text-base text-white">
                  {assessment.overall}
                </div>
              </div>
              
              <div className="space-y-3">
                {assessment.points.map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {point.status === 'good' ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : point.status === 'okay' ? (
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                    <span className="text-sm text-gray-300">{point.text}</span>
                  </div>
                ))}
              </div>
              
              {summaryData.ahi >= 5 && (
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-300">
                    💡 Consider consulting a sleep specialist for your apnea symptoms.
                  </p>
                </div>
              )}
              
              {summaryData.sleep_score < 60 && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-300">
                    💡 Try maintaining a consistent sleep schedule and creating a relaxing bedtime routine.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}