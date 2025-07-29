import React from 'react';
import { Sun, CloudMoon, Moon, Bed, Sparkles } from 'lucide-react';

const STAGE_CONFIG = {
  wake: {
    label: 'Wake',
    icon: Sun,
    color: 'bg-wake',
    textColor: 'text-orange-700'
  },
  n1: {
    label: 'Light 1',
    icon: CloudMoon,
    color: 'bg-n1',
    textColor: 'text-purple-700'
  },
  n2: {
    label: 'Light 2', 
    icon: Moon,
    color: 'bg-n2',
    textColor: 'text-blue-700'
  },
  n3: {
    label: 'Deep',
    icon: Bed,
    color: 'bg-n3',
    textColor: 'text-blue-900'
  },
  rem: {
    label: 'Dream',
    icon: Sparkles,
    color: 'bg-rem',
    textColor: 'text-red-700'
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

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Moon className="h-5 w-5 text-primary" />
        Sleep Stages
      </h3>
      
      {/* Progress bars */}
      <div className="space-y-3 mb-6">
        {Object.entries(stages).map(([stage, minutes]) => {
          const config = STAGE_CONFIG[stage];
          const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
          const Icon = config.icon;
          
          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.textColor}`} />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <span className="text-sm text-gray-600">
                  {formatDuration(minutes)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${config.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <div className="text-sm text-gray-500">Total Sleep</div>
          <div className="text-lg font-semibold">
            {formatDuration(totalMinutes - stages.wake)}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">Sleep Efficiency</div>
          <div className="text-lg font-semibold">
            {totalMinutes > 0 
              ? `${Math.round(((totalMinutes - stages.wake) / totalMinutes) * 100)}%`
              : '0%'
            }
          </div>
        </div>
      </div>
    </div>
  );
}