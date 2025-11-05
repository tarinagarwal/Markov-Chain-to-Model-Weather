import { useState, useCallback } from "react";
import { useMarkovChain } from "./hooks/useMarkovChain";
import CitySelector from "./components/CitySelector";
import DataFetcher from "./components/DataFetcher";
import SimulationControl from "./components/SimulationControl";
import "./App.css";

interface MatrixData {
  matrix: number[];
  states: string[];
  rows: number;
  cols: number;
}

interface SimulationDay {
  day: number;
  state: string;
  timestamp: number;
}

interface SimulationResults {
  predictions: SimulationDay[];
  parameters: {
    days: number;
    initialState: string;
    city: string;
  };
}

function App() {
  // Global state
  const [selectedCity, setSelectedCity] = useState<string>("Mumbai");
  const [historicalData, setHistoricalData] = useState<any>(null);
  const [transitionMatrix, setTransitionMatrix] = useState<MatrixData | null>(
    null
  );
  const [simulationResults, setSimulationResults] =
    useState<SimulationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize WASM module
  const {
    processData,
    runSimulation,
    isReady,
    error: wasmError,
  } = useMarkovChain();

  // Handler for city selection
  const handleCityChange = useCallback((city: string) => {
    setSelectedCity(city);
    // Reset state when city changes
    setHistoricalData(null);
    setTransitionMatrix(null);
    setSimulationResults(null);
    setError(null);
  }, []);

  // Handler for data fetched callback
  const handleDataFetched = useCallback((matrix: MatrixData) => {
    setTransitionMatrix(matrix);
    setError(null);
  }, []);

  // Handler for simulation
  const handleSimulation = useCallback(
    async (days: number, initialState: string) => {
      if (!transitionMatrix) {
        setError("Please fetch weather data first");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const predictions = await runSimulation(days, initialState);
        setSimulationResults({
          predictions,
          parameters: {
            days,
            initialState,
            city: selectedCity,
          },
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to run simulation";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [runSimulation, transitionMatrix, selectedCity]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Weather Markov Chain Predictor
          </h1>
          <p className="text-gray-600">
            Predict weather patterns using Markov chain analysis
          </p>
        </header>

        {/* WASM Loading State */}
        {!isReady && !wasmError && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Initializing WASM module...</p>
            </div>
          </div>
        )}

        {/* WASM Error State */}
        {wasmError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">
              WASM Initialization Error
            </h3>
            <p className="text-red-700">{wasmError.message}</p>
          </div>
        )}

        {/* Main Content - Only show when WASM is ready */}
        {isReady && (
          <>
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <h3 className="text-red-800 font-semibold mb-2">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-700">Processing...</p>
                </div>
              </div>
            )}

            {/* Child components */}
            <div className="space-y-6">
              <CitySelector
                cities={["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata"]}
                selectedCity={selectedCity}
                onCityChange={handleCityChange}
              />

              <DataFetcher
                city={selectedCity}
                onDataFetched={handleDataFetched}
                processData={processData}
              />

              <SimulationControl
                onSimulate={handleSimulation}
                isSimulating={isLoading}
                disabled={!transitionMatrix}
              />

              {/* Debug Info */}
              <div className="bg-gray-100 rounded-lg p-4 text-sm">
                <h3 className="font-semibold mb-2">Debug Info:</h3>
                <p>WASM Ready: {isReady ? "Yes" : "No"}</p>
                <p>Has Matrix: {transitionMatrix ? "Yes" : "No"}</p>
                <p>Has Simulation: {simulationResults ? "Yes" : "No"}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
