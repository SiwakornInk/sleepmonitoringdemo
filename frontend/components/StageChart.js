import React from 'react';
import { Sun, CloudMoon, Moon, Bed, Sparkles, Clock, BarChart3 } from 'lucide-react';

const STAGE_CONFIG = {
  wake: {
    label: 'Wake',
    icon: Sun,
    color: 'from-orange-400 to-orange-600',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    percentage: 5
  },
  n1: {
    label: 'Light 1',
    icon: CloudMoon,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400',
    percentage: 5
  },
  n2: {
    label: 'Light 2', 
    icon: Moon,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    percentage: 45
  },
  n3: {
    label: 'Deep',
    icon: Bed,
    color: 'from-indigo-400 to-indigo-600',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/30',
    textColor: 'text-indigo-400',
    percentage: 25
  },
  rem: {
    label: 'Dream',
    icon: Sparkles,
    color: 'from-pink-400 to-pink-600',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    percentage: 20
  }
};

export default function StageChart({ stages }) {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const totalMinutes = Object.values(stages).reduce((sum, val) => sum + val, 0);
  const sleepMinutes = totalMinutes - stages.wake;
  const efficiency = totalMinutes > 0 ? Math.round((sleepMinutes / totalMinutes) * 100) : 0;

  return (
    <div className="glass-card p-6 rounded-3xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          Sleep Stages
        </h3>
        <div className="text-sm text-gray-400">
          Total: {formatDuration(totalMinutes)}
        </div>
      </div>
      
      {/* Stage bars */}
      <div className="space-y-4 mb-6">
        {Object.entries(stages).map(([stage, minutes]) => {
          const config = STAGE_CONFIG[stage];
          const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
          const Icon = config.icon;
          const isGoodPercentage = percentage >= config.percentage * 0.8;
          
          return (
            <div key={stage} className="group">
              {/* Stage info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor} 
                    group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-4 w-4 ${config.textColor}`} />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">{config.label}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round(percentage)}%)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">
                    {formatDuration(minutes)}
                  </span>
                  {isGoodPercentage && (
                    <span className="text-xs text-green-400 ml-2">✓</span>
                  )}
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${config.color}
                    transition-all duration-1000 ease-out group-hover:shadow-lg`}
                  style={{ 
                    width: `${percentage}%`,
                    boxShadow: `0 0 20px ${config.textColor.replace('text-', '')}40`
                  }}
                />
                {/* Recommended percentage indicator */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white/20"
                  style={{ left: `${config.percentage}%` }}
                  title={`Recommended: ${config.percentage}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5">
        <div className="text-center p-3 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">Sleep Time</span>
          </div>
          <div className="text-lg font-bold text-white">
            {formatDuration(sleepMinutes)}
          </div>
        </div>
        <div className="text-center p-3 rounded-lg hover:bg-white/5 transition-colors">
          <div className="flex items-center justify-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400">Efficiency</span>
          </div>
          <div className="text-lg font-bold text-white">
            {efficiency}%
          </div>
        </div>
      </div>
      
      {/* Sleep quality indicator */}
      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Sleep Quality</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                className={`h-3 w-3 rounded-full ${
                  star <= Math.ceil(efficiency / 20) 
                    ? 'bg-gradient-primary' 
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}