import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getWeeklySummary } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Clock, Wind } from 'lucide-react';
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
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!weeklyData) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No data available</div>
        </div>
      </Layout>
    );
  }

  const chartData = weeklyData.daily_dates.map((day, index) => ({
    day,
    score: weeklyData.daily_scores[index]
  }));

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium">{payload[0].payload.day}</p>
          <p className="text-lg font-bold" style={{ color: getScoreColor(payload[0].value) }}>
            Score: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Weekly Sleep Score / Quality
            </h1>
            <p className="text-gray-600 mt-1">
              Your sleep patterns over the past week
            </p>
          </div>
          
          <div className="text-sm text-gray-600">
            {format(new Date(weeklyData.week_start), 'MMM d')} - {format(new Date(weeklyData.week_end), 'MMM d, yyyy')}
          </div>
        </div>

        {/* Main chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-6">Daily Sleep Scores</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="day" 
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  domain={[0, 100]}
                  stroke="#666"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="score" 
                  fill="#6366F1"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Average Score */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Average Score</h3>
                <p className="text-sm text-gray-500">Weekly average</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
            
            <div className="text-4xl font-bold mb-2" style={{ color: getScoreColor(weeklyData.avg_score) }}>
              {Math.round(weeklyData.avg_score)}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${weeklyData.avg_score}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Your sleep quality is{' '}
              <span className="font-medium">
                {weeklyData.avg_score >= 80 ? 'excellent' : 
                 weeklyData.avg_score >= 60 ? 'good' : 'needs improvement'}
              </span>
            </div>
          </div>

          {/* Average Duration */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Average Duration</h3>
                <p className="text-sm text-gray-500">Sleep time per night</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
            
            <div className="text-4xl font-bold mb-2 text-blue-600">
              {formatDuration(weeklyData.avg_duration)}
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Recommended</span>
                <span className="font-medium">7-9h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your average</span>
                <span className="font-medium">{formatDuration(weeklyData.avg_duration)}</span>
              </div>
            </div>
          </div>

          {/* Average AHI */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Average AHI</h3>
                <p className="text-sm text-gray-500">Apnea-Hypopnea Index</p>
              </div>
              <Wind className="h-8 w-8 text-orange-500 opacity-20" />
            </div>
            
            <div className="text-4xl font-bold mb-2 text-orange-600">
              {weeklyData.avg_ahi.toFixed(1)}
            </div>
            
            <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full inline-block text-sm font-medium">
              {weeklyData.avg_ahi < 5 ? 'Normal' : 
               weeklyData.avg_ahi < 15 ? 'Mild' :
               weeklyData.avg_ahi < 30 ? 'Moderate' : 'Severe'}
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              Average events per hour of sleep
            </div>
          </div>
        </div>

        {/* Weekly insights */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Weekly Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Sleep Patterns</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1"></div>
                  <span>Most consistent sleep on weekdays</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1"></div>
                  <span>Weekend sleep schedule varies more</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                  <span>Best sleep quality on {weeklyData.daily_dates[weeklyData.daily_scores.indexOf(Math.max(...weeklyData.daily_scores))]}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Recommendations</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                  <span>Maintain consistent sleep schedule</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                  <span>Consider sleep position for apnea</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-1"></div>
                  <span>Avoid screens 1 hour before bed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}