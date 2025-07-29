import React from 'react';
import { Moon, Zap, Brain, Heart } from 'lucide-react';

export default function SleepScore({ score, size = 'large' }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  if (size === 'small') {
    return (
      <div className="flex items-center gap-2">
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-sm text-gray-500">
          / 100
        </div>
      </div>
    );
  }

  return (
    <div className="sleep-score-gradient rounded-2xl p-8 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium opacity-90">Sleep</h3>
          <h2 className="text-2xl font-bold">Score / Quality</h2>
        </div>
        <Moon className="h-8 w-8 opacity-80" />
      </div>
      
      <div className="flex items-end gap-3 mb-6">
        <div className="text-6xl font-bold">
          {score}
        </div>
        <div className="text-2xl opacity-80 mb-2">
          / 100
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-6">
        <div className={`px-3 py-1 rounded-full bg-white/20 text-sm font-medium`}>
          {getScoreMessage(score)}
        </div>
        <div className="text-sm opacity-80">
          Avg: {score}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
        <div className="text-center">
          <Brain className="h-5 w-5 mx-auto mb-1 opacity-70" />
          <div className="text-xs opacity-70">Deep Sleep</div>
          <div className="text-sm font-medium">Good</div>
        </div>
        <div className="text-center">
          <Heart className="h-5 w-5 mx-auto mb-1 opacity-70" />
          <div className="text-xs opacity-70">Heart Rate</div>
          <div className="text-sm font-medium">Normal</div>
        </div>
        <div className="text-center">
          <Zap className="h-5 w-5 mx-auto mb-1 opacity-70" />
          <div className="text-xs opacity-70">Recovery</div>
          <div className="text-sm font-medium">High</div>
        </div>
      </div>
    </div>
  );
}