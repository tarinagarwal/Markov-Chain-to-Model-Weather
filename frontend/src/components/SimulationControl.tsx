import { useState } from "react";

interface SimulationControlProps {
  onSimulate: (days: number, initialState: string) => void;
  isSimulating: boolean;
  disabled?: boolean;
}

/**
 * SimulationControl component provides controls for configuring and running weather simulations
 * Allows users to set the number of days and initial weather state
 */
function SimulationControl({
  onSimulate,
  isSimulating,
  disabled = false,
}: SimulationControlProps) {
  const [days, setDays] = useState<number>(30);
  const [initialState, setInitialState] = useState<string>("Sunny");
  const [validationError, setValidationError] = useState<string | null>(null);

  const weatherStates = ["Sunny", "Rainy", "Cloudy"];

  const handleDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    setDays(value);

    // Validate input
    if (isNaN(value)) {
      setValidationError("Please enter a valid number");
    } else if (value < 1) {
      setValidationError("Days must be at least 1");
    } else if (value > 365) {
      setValidationError("Days cannot exceed 365");
    } else {
      setValidationError(null);
    }
  };

  const handleInitialStateChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setInitialState(event.target.value);
  };

  const handleRunSimulation = () => {
    // Final validation before running
    if (days < 1 || days > 365) {
      setValidationError("Days must be between 1 and 365");
      return;
    }

    setValidationError(null);
    onSimulate(days, initialState);
  };

  const isDisabled = disabled || isSimulating || validationError !== null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Simulation Controls
      </h2>

      <div className="space-y-4">
        {/* Days Input */}
        <div>
          <label
            htmlFor="days-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Number of Days to Simulate
          </label>
          <input
            id="days-input"
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={handleDaysChange}
            disabled={isSimulating}
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter days (1-365)"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter a value between 1 and 365 days
          </p>
        </div>

        {/* Initial State Dropdown */}
        <div>
          <label
            htmlFor="initial-state-select"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Initial Weather State
          </label>
          <div className="relative">
            <select
              id="initial-state-select"
              value={initialState}
              onChange={handleInitialStateChange}
              disabled={isSimulating}
              className="block w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {weatherStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-yellow-800">{validationError}</p>
            </div>
          </div>
        )}

        {/* Run Simulation Button */}
        <button
          onClick={handleRunSimulation}
          disabled={isDisabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSimulating ? (
            <>
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Running Simulation...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Run Simulation
            </>
          )}
        </button>

        {disabled && !isSimulating && (
          <p className="text-sm text-gray-500 text-center">
            Please fetch weather data first to enable simulation
          </p>
        )}
      </div>
    </div>
  );
}

export default SimulationControl;
