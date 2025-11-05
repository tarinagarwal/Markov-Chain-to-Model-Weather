import { useEffect, useState } from "react";
import { useWeatherAPI } from "../hooks/useWeatherAPI";

interface MatrixData {
  matrix: number[];
  states: string[];
  rows: number;
  cols: number;
}

interface DataFetcherProps {
  city: string;
  onDataFetched: (matrix: MatrixData) => void;
  processData: (jsonData: string) => Promise<MatrixData>;
}

/**
 * DataFetcher component handles fetching weather data from the API
 * and processing it through the WASM module
 */
function DataFetcher({ city, onDataFetched, processData }: DataFetcherProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useWeatherAPI(city, {
    enabled: false,
  });

  // Handle data processing when data is fetched
  useEffect(() => {
    if (data && !isProcessing) {
      handleProcessData();
    }
  }, [data]);

  const handleProcessData = async () => {
    if (!data) return;

    setIsProcessing(true);
    setProcessingError(null);

    try {
      // Convert the API response to JSON string for WASM processing
      const jsonData = JSON.stringify(data);
      const matrix = await processData(jsonData);
      onDataFetched(matrix);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process weather data";
      setProcessingError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFetchData = () => {
    setProcessingError(null);
    refetch();
  };

  const handleRetry = () => {
    setProcessingError(null);
    if (data) {
      handleProcessData();
    } else {
      refetch();
    }
  };

  const showLoading = isLoading || isProcessing;
  const showError = error || processingError;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Weather Data</h2>

      {/* Fetch Button */}
      {!data && !showLoading && !showError && (
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">
            Fetch historical weather data for {city}
          </p>
          <button
            onClick={handleFetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Fetch Weather Data
          </button>
        </div>
      )}

      {/* Loading State */}
      {showLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
            <p className="text-gray-600">
              {isLoading ? "Fetching weather data..." : "Processing data..."}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-semibold mb-1">
                {error ? "Failed to fetch data" : "Failed to process data"}
              </h3>
              <p className="text-red-700 text-sm">
                {error?.message || processingError}
              </p>
              <button
                onClick={handleRetry}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {data && !showLoading && !showError && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-green-800 font-semibold mb-1">
                Data loaded successfully
              </h3>
              <p className="text-green-700 text-sm">
                Weather data for {city} has been processed and the transition
                matrix is ready.
              </p>
              <button
                onClick={handleFetchData}
                className="mt-3 bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors"
              >
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataFetcher;
