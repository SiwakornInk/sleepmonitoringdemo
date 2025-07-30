import React from 'react';
import { Wind, AlertTriangle, Activity, TrendingUp, Shield, Info } from 'lucide-react';

export default function ApneaStats({ totalEvents, ahi, duration }) {
  const getSeverity = (ahi) => {
    if (ahi < 5) return { 
      level: 'Normal', 
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      icon: Shield,
      message: 'Your breathing is healthy'
    };
    if (ahi < 15) return { 
      level: 'Mild', 
      color: 'from-yellow-400 to-yellow-600',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      icon: Info,
      message: 'Minor breathing interruptions'
    };
    if (ahi < 30) return { 
      level: 'Moderate', 
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-400',
      icon: AlertTriangle,
      message: 'Noticeable breathing issues'
    };
    return { 
      level: 'Severe', 
      color: 'from-red-400 to-red-600',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      icon: AlertTriangle,
      message: 'Significant breathing disruption'
    };
  };

  const severity = getSeverity(ahi);
  const SeverityIcon = severity.icon;
  const eventsPerHour = ahi;
  const averageEventDuration = totalEvents > 0 ? Math.round((totalEvents * 15) / totalEvents) : 0;

  return (
    <div className="glass-card p-6 rounded-3xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Wind className="h-5 w-5 text-white" />
          </div>
          Sleep Apnea
        </h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${severity.bgColor} 
          ${severity.borderColor} border ${severity.textColor}`}>
          {severity.level}
        </div>
      </div>
      
      {/* Main metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Total Events */}
        <div className={`p-4 rounded-2xl ${severity.bgColor} border ${severity.borderColor}
          hover:scale-105 transition-transform cursor-pointer`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`h-5 w-5 ${severity.textColor}`} />
            <span className="text-xs text-gray-400">Events</span>
          </div>
          <div className={`text-3xl font-bold ${severity.textColor}`}>
            {totalEvents}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            total disruptions
          </div>
        </div>
        
        {/* AHI Score */}
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${severity.color} 
          hover:scale-105 transition-transform cursor-pointer`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-white" />
            <span className="text-xs text-white/80">AHI</span>
          </div>
          <div className="text-3xl font-bold text-white">
            {ahi.toFixed(1)}
          </div>
          <div className="text-xs text-white/70 mt-1">
            per hour
          </div>
        </div>
      </div>
      
      {/* Severity indicator with visual */}
      <div className={`p-4 rounded-2xl ${severity.bgColor} border ${severity.borderColor} mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-gray-400 mb-1">Severity Assessment</div>
            <div className={`text-xl font-bold ${severity.textColor} flex items-center gap-2`}>
              <SeverityIcon className="h-5 w-5" />
              {severity.level}
            </div>
          </div>
          <div className={`p-3 rounded-full bg-gradient-to-br ${severity.color}`}>
            <Wind className="h-8 w-8 text-white" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">{severity.message}</p>
      </div>
      
      {/* Additional metrics */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 
          hover:bg-white/10 transition-colors">
          <span className="text-sm text-gray-400">Events per hour</span>
          <span className="text-sm font-semibold text-white">{eventsPerHour.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 
          hover:bg-white/10 transition-colors">
          <span className="text-sm text-gray-400">Avg. duration</span>
          <span className="text-sm font-semibold text-white">~{averageEventDuration}s</span>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 
          hover:bg-white/10 transition-colors">
          <span className="text-sm text-gray-400">Sleep impact</span>
          <span className="text-sm font-semibold text-white">
            {totalEvents > 20 ? 'High' : totalEvents > 10 ? 'Moderate' : 'Low'}
          </span>
        </div>
      </div>
      
      {/* AHI Scale Reference */}
      <div className="p-3 rounded-xl bg-white/5">
        <div className="text-xs font-medium text-gray-400 mb-3">AHI Scale Reference</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600"></div>
            <span className="text-xs text-gray-500">Normal: &lt; 5 events/hr</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
            <span className="text-xs text-gray-500">Mild: 5-15 events/hr</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-600"></div>
            <span className="text-xs text-gray-500">Moderate: 15-30 events/hr</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600"></div>
            <span className="text-xs text-gray-500">Severe: &gt; 30 events/hr</span>
          </div>
        </div>
      </div>
      
      {/* Recommendation */}
      {ahi >= 5 && (
        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-primary-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-300">
                {ahi >= 15 
                  ? 'Consider consulting a sleep specialist for evaluation.' 
                  : 'Monitor your sleep patterns and consider lifestyle adjustments.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}