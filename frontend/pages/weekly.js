import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getWeeklySummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, TrendingUp, Clock, Wind, Award, Target, Brain, Moon } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';

// Mock data for demo
const MOCK_WEEKLY_DATA = {
  week_start: startOfWeek(new Date()),
  week_end: endOfWeek(new Date()),
  daily_scores: [0, 82, 76, 85, 72, 80, 86],
  daily_dates: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  avg_score: 80.2,
  avg_duration: 456.5,
  avg_ahi: 5.8
};

export default function WeeklySummary() {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getWeeklySummary();
        setWeeklyData(data);
      } catch (error) {
        console.error('Error fetching weekly data:', error);
        // Use mock data on error
        setWeeklyData(MOCK_WEEKLY_DATA);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!weeklyData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">No data available</div>
        </div>
      </Layout>
    );
  }

  const chartData = weeklyData.daily_dates.map((day, index) => ({
    day,
    score: weeklyData.daily_scores[index],
    fullScore: 100
  }));

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#48BB78';
    if (score >= 60) return '#F6D55C';
    return '#EF4444';
  };

  const getBarColor = (score) => {
    if (score === 0) return '#374151';
    if (score >= 80) return '#8B5CF6';
    if (score >= 60) return '#6366F1';
    return '#3B82F6';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const score = payload[0].payload.score;
      return (
        <div className="glass-card p-4 rounded-xl shadow-2xl border border-white/20">
          <p className="text-sm font-medium text-white mb-1">{payload[0].payload.day}</p>
          <p className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
            {score > 0 ? `${score} pts` : 'No data'}
          </p>
          {score > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate insights
  const bestDay = weeklyData.daily_dates[weeklyData.daily_scores.indexOf(Math.max(...weeklyData.daily_scores))];
  const worstDay = weeklyData.daily_dates[weeklyData.daily_scores.indexOf(Math.min(...weeklyData.daily_scores.filter(s => s > 0)))];
  const daysWithData = weeklyData.daily_scores.filter(s => s > 0).length;
  const consistency = daysWithData >= 5 ? 'Good' : daysWithData >= 3 ? 'Fair' : 'Poor';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              </div>
              Weekly Sleep Score / Quality
            </h1>
            <p className="text-gray-400 mt-2">
              Track your sleep patterns and improvements over time
            </p>
          </div>
          
          <div className="px-4 py-2 glass-card rounded-xl text-sm text-gray-300">
            {format(new Date(weeklyData.week_start), 'MMM d')} - {format(new Date(weeklyData.week_end), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Main chart */}
        <div className="glass-card p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Daily Sleep Scores</h3>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary-400" />
              <span className="text-sm text-gray-400">{daysWithData} nights tracked</span>
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.05)" 
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="day" 
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                
                <YAxis 
                  domain={[0, 100]}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  ticks={[0, 25, 50, 75, 100]}
                />
                
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                
                <Bar 
                  dataKey="score" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-primary"></div>
              <span className="text-gray-400">Excellent (80+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary"></div>
              <span className="text-gray-400">Good (60-79)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-400">Fair (&lt;60)</span>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Average Score */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Average Score</h3>
                <p className="text-xs text-gray-400 mt-1">Weekly performance</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-primary animate-pulse-slow">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
            
            <div className="flex items-baseline gap-2 mb-4">
              <div className="text-5xl font-bold text-gradient">
                {Math.round(weeklyData.avg_score)}
              </div>
              <span className="text-sm text-gray-400">/ 100</span>
            </div>
            
            <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-primary rounded-full transition-all duration-1000"
                style={{ width: `${weeklyData.avg_score}%` }}
              />
            </div>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-400">Status:</span>
              <span className={`text-sm font-medium ${
                weeklyData.avg_score >= 80 ? 'text-green-400' : 
                weeklyData.avg_score >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {weeklyData.avg_score >= 80 ? 'Excellent sleep quality' : 
                 weeklyData.avg_score >= 60 ? 'Good sleep quality' : 'Needs improvement'}
              </span>
            </div>
          </div>

          {/* Average Duration */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Average Duration</h3>
                <p className="text-xs text-gray-400 mt-1">Sleep time per night</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            
            <div className="text-5xl font-bold text-blue-400 mb-4">
              {formatDuration(weeklyData.avg_duration)}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-400">Recommended</span>
                <span className="text-sm font-medium text-white">7-9h</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-gray-400">Your average</span>
                <span className="text-sm font-medium text-white">{formatDuration(weeklyData.avg_duration)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary-400" />
                <span className="text-xs text-gray-400">
                  {weeklyData.avg_duration >= 420 ? 'Meeting sleep goals' : 'Below recommended range'}
                </span>
              </div>
            </div>
          </div>

          {/* Average AHI */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Average AHI</h3>
                <p className="text-xs text-gray-400 mt-1">Apnea-Hypopnea Index</p>
              </div>
              <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
                <Wind className="h-6 w-6 text-orange-400" />
              </div>
            </div>
            
            <div className="text-5xl font-bold text-orange-400 mb-4">
              {weeklyData.avg_ahi.toFixed(1)}
            </div>
            
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
              ${weeklyData.avg_ahi < 5 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                weeklyData.avg_ahi < 15 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                weeklyData.avg_ahi < 30 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {weeklyData.avg_ahi < 5 ? 'Normal' : 
               weeklyData.avg_ahi < 15 ? 'Mild' :
               weeklyData.avg_ahi < 30 ? 'Moderate' : 'Severe'}
            </div>
            
            <div className="mt-4 p-3 rounded-lg bg-white/5">
              <p className="text-xs text-gray-400">
                Average breathing disruptions per hour of sleep
              </p>
            </div>
          </div>
        </div>

        {/* Weekly insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sleep Patterns */}
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary-400" />
              Sleep Patterns & Insights
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Best Night</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {bestDay} with the highest sleep quality score
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                  <Target className="h-4 w-4 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Room for Improvement</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {worstDay} had the lowest score - try maintaining consistent bedtime
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <Calendar className="h-4 w-4 text-primary-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Sleep Consistency</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {consistency} - tracked {daysWithData} out of 7 nights
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary-400" />
              Personalized Recommendations
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                <p className="text-sm text-white mb-2">🎯 Maintain Sleep Schedule</p>
                <p className="text-xs text-gray-400">
                  Keep consistent bedtime and wake times, even on weekends
                </p>
              </div>
              
              {weeklyData.avg_ahi >= 5 && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-sm text-white mb-2">💨 Address Sleep Apnea</p>
                  <p className="text-xs text-gray-400">
                    Consider sleeping position adjustments or consult a specialist
                  </p>
                </div>
              )}
              
              {weeklyData.avg_duration < 420 && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-sm text-white mb-2">⏰ Increase Sleep Duration</p>
                  <p className="text-xs text-gray-400">
                    Aim for at least 7-8 hours of sleep per night
                  </p>
                </div>
              )}
              
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-white mb-2">🌙 Optimize Sleep Environment</p>
                <p className="text-xs text-gray-400">
                  Keep room dark, quiet, and cool (60-67°F)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}