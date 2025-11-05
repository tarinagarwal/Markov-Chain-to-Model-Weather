import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SimulationDay {
  day: number;
  state: string;
  timestamp?: number;
}

interface WeatherTimelineProps {
  simulationData: SimulationDay[];
}

const WeatherTimeline = ({ simulationData }: WeatherTimelineProps) => {
  // Map state names to colors
  const stateColors: Record<string, string> = {
    Sunny: "#FCD34D",
    Rainy: "#3B82F6",
    Cloudy: "#9CA3AF",
  };

  // Map state names to numeric values for Y-axis
  const stateToValue: Record<string, number> = {
    Sunny: 3,
    Rainy: 2,
    Cloudy: 1,
  };

  const valueToState: Record<number, string> = {
    3: "Sunny",
    2: "Rainy",
    1: "Cloudy",
  };

  // Transform data for Recharts
  const chartData = simulationData.map((item) => ({
    day: item.day,
    state: item.state,
    value: stateToValue[item.state] || 0,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">Day {data.day}</p>
          <p className="text-sm text-gray-700">
            Weather: <span className="font-medium">{data.state}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom Y-axis tick
  const CustomYAxisTick = ({ x, y, payload }: any) => {
    const state = valueToState[payload.value];
    if (!state) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={4}
          textAnchor="end"
          fill="#374151"
          className="text-sm font-medium"
        >
          {state}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Weather Prediction Timeline
      </h2>
      <p className="text-gray-600 mb-6">
        Simulated weather states over {simulationData.length} days
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="day"
            label={{
              value: "Day",
              position: "insideBottom",
              offset: -10,
              style: { fill: "#374151", fontWeight: 600 },
            }}
            tick={{ fill: "#6B7280", fontSize: 12 }}
          />
          <YAxis
            domain={[0, 4]}
            ticks={[1, 2, 3]}
            tick={<CustomYAxisTick />}
            label={{
              value: "Weather State",
              angle: -90,
              position: "insideLeft",
              style: { fill: "#374151", fontWeight: 600 },
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0, 0, 0, 0.1)" }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={stateColors[entry.state]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 flex justify-center space-x-6">
        {Object.entries(stateColors).map(([state, color]) => (
          <div key={state} className="flex items-center space-x-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: color }}
            ></div>
            <span className="text-sm font-medium text-gray-700">{state}</span>
          </div>
        ))}
      </div>

      {/* Summary statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {Object.keys(stateColors).map((state) => {
          const count = simulationData.filter((d) => d.state === state).length;
          const percentage = ((count / simulationData.length) * 100).toFixed(1);
          return (
            <div
              key={state}
              className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200"
            >
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-sm text-gray-600">{state} days</div>
              <div className="text-xs text-gray-500 mt-1">{percentage}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherTimeline;
