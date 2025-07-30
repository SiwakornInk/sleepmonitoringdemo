import React from 'react';
import { Moon, Zap, Brain, Heart, TrendingUp, Star } from 'lucide-react';

export default function SleepScore({ score, size = 'large' }) {
  const circumference = 2 * Math.PI * 70; // radius = 70
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (score) => {
    if (score >= 80) return '#48BB78';
    if (score >= 60) return '#F6D55C';
    return '#E53E3E';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getScoreEmoji = (score) => {
    if (score >= 80) return '😊';
    if (score >= 60) return '🙂';
    if (score >= 40) return '😐';
    return '😟';
  };

  if (size === 'small') {
    return (
      <div className="glass-card p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Sleep Score</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold`} style={{ color: getScoreColor(score) }}>
                {score}
              </span>
              <span className="text-sm text-gray-500">/ 100</span>
            </div>
          </div>
          <div className="text-3xl">{getScoreEmoji(score)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm text-gray-400 mb-1 flex items-center gap-2">
            <Star className="h-4 w-4" />
            Sleep Quality
          </h3>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Score / Quality</h2>
        </div>
        <div className="relative">
          <Moon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-400" />
          <div className="absolute inset-0 animate-pulse">
            <Moon className="h-8 w-8 sm:h-10 sm:w-10 text-primary-400 opacity-50" />
          </div>
        </div>
      </div>
      
      {/* Circular Progress */}
      <div className="relative mx-auto mb-6 w-48 h-48 sm:w-52 sm:h-52 lg:w-56 lg:h-56 transition-all duration-300">
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 200 200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r="70"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="12"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r="70"
            stroke="url(#scoreGradient)"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 70}
            strokeDashoffset={2 * Math.PI * 70 - (score / 100) * 2 * Math.PI * 70}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-1 transition-all duration-300">
            {score}
          </div>
          <div className="text-sm text-gray-400">out of 100</div>
          <div className="text-xl sm:text-2xl mt-2 transition-all duration-300">{getScoreEmoji(score)}</div>
        </div>
      </div>
      
      {/* Status Badge */}
      <div className="flex justify-center mb-6">
        <div className={`
          px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2
          ${score >= 80 ? 'badge-success' : 
            score >= 60 ? 'badge-warning' : 'badge-danger'}
        `}>
          <TrendingUp className="h-4 w-4" />
          {getScoreMessage(score)} Sleep Quality
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Brain className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-purple-400" />
          <div className="text-xs sm:text-sm text-gray-400">Deep Sleep</div>
          <div className="text-sm sm:text-base font-semibold text-white">Good</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Heart className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-red-400" />
          <div className="text-xs sm:text-sm text-gray-400">Heart Rate</div>
          <div className="text-sm sm:text-base font-semibold text-white">Normal</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <Zap className="h-5 w-5 sm:h-6 sm:w-6 mx-auto mb-2 text-yellow-400" />
          <div className="text-xs sm:text-sm text-gray-400">Recovery</div>
          <div className="text-sm sm:text-base font-semibold text-white">High</div>
        </div>
      </div>
      
      {/* Bottom info */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Weekly Average</span>
          <span className="font-semibold text-white flex items-center gap-2">
            {score}
            <span className="text-xs text-gray-500">pts</span>
          </span>
        </div>
      </div>
    </div>
  );
}