import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Statistics {
  distribution: Record<string, number>;
  steadyState: Record<string, number>;
  averageStreaks?: Record<string, number>;
}

interface StatisticsPanelProps {
  statistics: Statistics;
}

const StatisticsPanel = ({ statistics }: StatisticsPanelProps) => {
  // State colors
  const stateColors: Record<string, string> = {
    Sunny: "#FCD34D",
    Rainy: "#3B82F6",
    Cloudy: "#9CA3AF",
  };

  // Transform distribution data for pie chart
  const distributionData = Object.entries(statistics.distribution).map(
    ([state, value]) => ({
      name: state,
      value: value,
      percentage: (value * 100).toFixed(1),
    })
  );

  // Transform steady state data
  const steadyStateData = Object.entries(statistics.steadyState).map(
    ([state, value]) => ({
      name: state,
      value: value,
      percentage: (value * 100).toFixed(1),
    })
  );

  // Calculate average streaks if not provided
  const calculateAverageStreak = (state: string): number => {
    if (statistics.averageStreaks && statistics.averageStreaks[state]) {
      return statistics.averageStreaks[state];
    }
    // Estimate based on self-transition probability
    const selfProb = statistics.steadyState[state] || 0;
    return selfProb > 0 ? 1 / (1 - selfProb) : 1;
  };

  // Custom tooltip for pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">
            Percentage:{" "}
            <span className="font-medium">{data.payload.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Statistical Analysis
      </h2>
      <p className="text-gray-600 mb-6">
        Long-term weather patterns and probability distributions
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Distribution */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Simulation Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={distributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {distributionData.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={stateColors[entry.name]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Actual distribution from simulation results
          </p>
        </div>

        {/* Steady State Distribution */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Steady State Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={steadyStateData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {steadyStateData.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={stateColors[entry.name]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Long-term equilibrium probabilities
          </p>
        </div>
      </div>

      {/* Steady State Probabilities Table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Steady State Probabilities
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(statistics.steadyState).map(
            ([state, probability]) => (
              <div
                key={state}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: stateColors[state] }}
                  ></div>
                  <span className="font-semibold text-gray-900">{state}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {(probability * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Long-term probability
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Average Consecutive Days */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Expected Consecutive Days
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.keys(statistics.steadyState).map((state) => {
            const avgStreak = calculateAverageStreak(state);
            return (
              <div
                key={state}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center"
              >
                <div className="text-2xl font-bold text-gray-900">
                  {avgStreak.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 mt-1">{state}</div>
                <div className="text-xs text-gray-500 mt-1">days in a row</div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Average number of consecutive days expected for each weather state
        </p>
      </div>

      {/* Key Insights */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Key Insights
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • Most common state:{" "}
            <span className="font-semibold">
              {
                Object.entries(statistics.steadyState).reduce((a, b) =>
                  a[1] > b[1] ? a : b
                )[0]
              }
            </span>
          </li>
          <li>
            • Steady state represents the long-term equilibrium distribution
          </li>
          <li>
            • Simulation distribution may vary from steady state in short runs
          </li>
        </ul>
      </div>
    </div>
  );
};

export default StatisticsPanel;
