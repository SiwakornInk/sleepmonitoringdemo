import React from 'react';
import { Wind, AlertTriangle, Activity } from 'lucide-react';

export default function ApneaStats({ totalEvents, ahi, duration }) {
  const getSeverity = (ahi) => {
    if (ahi < 5) return { level: 'Normal', color: 'bg-apnea-normal', textColor: 'text-green-700' };
    if (ahi < 15) return { level: 'Mild', color: 'bg-apnea-mild', textColor: 'text-yellow-700' };
    if (ahi < 30) return { level: 'Moderate', color: 'bg-apnea-moderate', textColor: 'text-orange-700' };
    return { level: 'Severe', color: 'bg-apnea-severe', textColor: 'text-red-700' };
  };

  const severity = getSeverity(ahi);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Wind className="h-5 w-5 text-primary" />
        Sleep Apnea
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="text-sm text-gray-600">Events</span>
          </div>
          <div className="text-2xl font-bold text-orange-700">
            {totalEvents}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            total events
          </div>
        </div>
        
        <div className={`${severity.color} bg-opacity-10 rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4" />
            <span className="text-sm text-gray-600">AHI</span>
          </div>
          <div className={`text-2xl font-bold ${severity.textColor}`}>
            {ahi.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            events/hour
          </div>
        </div>
      </div>
      
      <div className={`${severity.color} bg-opacity-20 rounded-lg p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium mb-1">Severity Level</div>
            <div className={`text-lg font-bold ${severity.textColor}`}>
              {severity.level}
            </div>
          </div>
          <div className={`${severity.color} rounded-full p-3`}>
            <Wind className={`h-6 w-6 text-white`} />
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-apnea-normal rounded-full"></div>
          <span>Normal: AHI &lt; 5</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-apnea-mild rounded-full"></div>
          <span>Mild: AHI 5-15</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 bg-apnea-moderate rounded-full"></div>
          <span>Moderate: AHI 15-30</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-apnea-severe rounded-full"></div>
          <span>Severe: AHI &gt; 30</span>
        </div>
      </div>
    </div>
  );
}