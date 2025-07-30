import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, Area, ComposedChart } from 'recharts';

const STAGE_LABELS = {
  0: 'Wake',
  1: 'Light 1',
  2: 'Light 2',
  3: 'Deep',
  4: 'Dream'
};

const STAGE_COLORS = {
  0: '#FB923C',
  1: '#A78BFA',
  2: '#60A5FA',
  3: '#6366F1',
  4: '#F472B6'
};

export default function Hypnogram({ data, showApnea = true, height = 200 }) {
  const chartData = useMemo(() => {
    return data.map((epoch, index) => ({
      time: index * 0.5, // Each epoch is 30 seconds = 0.5 minutes
      stage: epoch.stage,
      isApnea: epoch.isApnea,
      stageInverted: 4 - epoch.stage // Invert for visualization
    }));
  }, [data]);

  const formatXAxis = (value) => {
    const hours = Math.floor(value / 60);
    const minutes = Math.floor(value % 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="glass-card p-3 rounded-lg shadow-2xl border border-white/20">
          <p className="text-sm font-medium text-white">Time: {formatXAxis(data.time)}</p>
          <p className="text-sm text-gray-300 flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS[data.stage] }}></span>
            Stage: {STAGE_LABELS[data.stage]}
          </p>
          {data.isApnea && (
            <p className="text-sm text-red-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Apnea Event
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.isApnea && showApnea) {
      return (
        <g>
          <circle 
            cx={cx} 
            cy={cy} 
            r={4} 
            fill="#EF4444" 
            fillOpacity={0.8}
            className="animate-pulse"
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r={8} 
            fill="#EF4444" 
            fillOpacity={0.2}
            className="animate-ping"
          />
        </g>
      );
    }
    return null;
  };

  return (
    <div className="w-full chart-container p-4">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart 
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
            </linearGradient>
            
            {Object.entries(STAGE_COLORS).map(([stage, color]) => (
              <linearGradient key={stage} id={`stage${stage}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.05)" 
            vertical={false}
          />
          
          <XAxis 
            dataKey="time"
            tickFormatter={formatXAxis}
            stroke="rgba(255,255,255,0.5)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          
          <YAxis 
            domain={[0, 4]}
            ticks={[0, 1, 2, 3, 4]}
            tickFormatter={(value) => STAGE_LABELS[4 - value]}
            stroke="rgba(255,255,255,0.5)"
            fontSize={12}
            width={60}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(139, 92, 246, 0.3)', strokeWidth: 1 }}
          />
          
          {/* Area fill under the line */}
          <Area
            type="stepAfter"
            dataKey="stageInverted"
            fill="url(#sleepGradient)"
            stroke="none"
          />
          
          {/* Main sleep stage line */}
          <Line 
            type="stepAfter"
            dataKey="stageInverted"
            stroke="url(#gradientLine)"
            strokeWidth={3}
            dot={<CustomDot />}
            animationDuration={1500}
            animationEasing="ease-out"
          />
          
          {/* Gradient for line */}
          <defs>
            <linearGradient id="gradientLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs">
        {Object.entries(STAGE_LABELS).map(([stage, label]) => (
          <div key={stage} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: STAGE_COLORS[stage] }}
            ></div>
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
        {showApnea && (
          <div className="flex items-center gap-2 ml-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400">Apnea Event</span>
          </div>
        )}
      </div>
    </div>
  );
}