import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

const STAGE_LABELS = {
  0: 'Wake',
  1: 'Light 1',
  2: 'Light 2',
  3: 'Deep',
  4: 'Dream'
};

const STAGE_COLORS = {
  0: '#FFE4B5',
  1: '#E6E6FA',
  2: '#B0E0E6',
  3: '#4682B4',
  4: '#FF6347'
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
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium">Time: {formatXAxis(data.time)}</p>
          <p className="text-sm">Stage: {STAGE_LABELS[data.stage]}</p>
          {data.isApnea && (
            <p className="text-sm text-red-500">Apnea Event</p>
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
        <circle 
          cx={cx} 
          cy={cy} 
          r={3} 
          fill="#FF0000" 
          fillOpacity={0.6}
        />
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart 
          data={chartData}
          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="time"
            tickFormatter={formatXAxis}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            domain={[0, 4]}
            ticks={[0, 1, 2, 3, 4]}
            tickFormatter={(value) => STAGE_LABELS[4 - value]}
            stroke="#666"
            fontSize={12}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Background areas for each stage */}
          <defs>
            {Object.entries(STAGE_COLORS).map(([stage, color]) => (
              <linearGradient key={stage} id={`stage${stage}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          
          <Line 
            type="stepAfter"
            dataKey="stageInverted"
            stroke="#6366F1"
            strokeWidth={2}
            dot={<CustomDot />}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}