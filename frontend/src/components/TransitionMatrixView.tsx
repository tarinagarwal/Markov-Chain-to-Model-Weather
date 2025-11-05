interface TransitionMatrixViewProps {
  matrix: number[][];
  states: string[];
}

const TransitionMatrixView = ({
  matrix,
  states,
}: TransitionMatrixViewProps) => {
  // Helper function to get color based on probability value
  const getColorForProbability = (probability: number): string => {
    // Gradient from light blue (low) to dark blue (high)
    const intensity = Math.round(probability * 255);
    const r = 255 - intensity;
    const g = 255 - Math.round(intensity * 0.5);
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Helper function to get text color based on background
  const getTextColor = (probability: number): string => {
    return probability > 0.5 ? "text-white" : "text-gray-900";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        Transition Probability Matrix
      </h2>
      <p className="text-gray-600 mb-6">
        Shows the probability of transitioning from one weather state to another
      </p>

      {/* Matrix Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-700">
                  From / To
                </th>
                {states.map((state) => (
                  <th
                    key={state}
                    className="border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-700"
                  >
                    {state}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, rowIndex) => (
                <tr key={states[rowIndex]}>
                  <td className="border border-gray-300 bg-gray-100 p-3 text-sm font-semibold text-gray-700">
                    {states[rowIndex]}
                  </td>
                  {row.map((probability, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`border border-gray-300 p-3 text-center font-medium transition-colors ${getTextColor(
                        probability
                      )}`}
                      style={{
                        backgroundColor: getColorForProbability(probability),
                      }}
                    >
                      {probability.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Probability Scale
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Low (0.0)</span>
          <div
            className="flex-1 h-6 rounded"
            style={{
              background:
                "linear-gradient(to right, rgb(255, 255, 255), rgb(0, 127, 255))",
            }}
          ></div>
          <span className="text-xs text-gray-600">High (1.0)</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Each row represents the probability of transitioning from the current
          state to the next state. All probabilities in a row sum to 1.0.
        </p>
      </div>
    </div>
  );
};

export default TransitionMatrixView;
