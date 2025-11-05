import { useState, useEffect, useCallback } from "react";

// WASM module types
interface WASMModule {
  init_markov_engine: () => void;
  process_weather_data: (jsonStr: string) => any;
  run_simulation: (days: number, initialState: string) => any;
  get_statistics: () => any;
}

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

interface StateProbabilities {
  sunny: number;
  rainy: number;
  cloudy: number;
}

interface Statistics {
  steady_state: StateProbabilities;
  distribution: StateProbabilities;
  average_streaks: StateProbabilities;
}

export interface UseMarkovChainReturn {
  processData: (jsonData: string) => Promise<MatrixData>;
  runSimulation: (
    days: number,
    initialState: string
  ) => Promise<SimulationDay[]>;
  getStatistics: () => Promise<Statistics>;
  isReady: boolean;
  error: Error | null;
}

/**
 * Custom hook for interacting with the Rust WASM Markov Chain engine
 * Handles module loading, initialization, and provides wrapper functions
 */
export function useMarkovChain(): UseMarkovChainReturn {
  const [wasmModule, setWasmModule] = useState<WASMModule | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load WASM module on mount
  useEffect(() => {
    let mounted = true;

    const loadWASM = async () => {
      try {
        // Dynamic import of the WASM module
        const wasm = await import("../wasm/rust_core.js");

        // Initialize the WASM module
        await wasm.default();

        // Call init_markov_engine after module loads
        wasm.init_markov_engine();

        if (mounted) {
          setWasmModule(wasm as unknown as WASMModule);
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          const error =
            err instanceof Error
              ? err
              : new Error("Failed to load WASM module");
          setError(error);
          setIsReady(false);
        }
      }
    };

    loadWASM();

    return () => {
      mounted = false;
    };
  }, []);

  // Wrapper function for process_weather_data
  const processData = useCallback(
    async (jsonData: string): Promise<MatrixData> => {
      if (!wasmModule || !isReady) {
        throw new Error("WASM module not ready");
      }

      try {
        const result = wasmModule.process_weather_data(jsonData);
        return result as MatrixData;
      } catch (err) {
        // Convert WASM errors to JavaScript Error objects
        const errorMessage =
          typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : "Failed to process weather data";
        throw new Error(errorMessage);
      }
    },
    [wasmModule, isReady]
  );

  // Wrapper function for run_simulation
  const runSimulation = useCallback(
    async (days: number, initialState: string): Promise<SimulationDay[]> => {
      if (!wasmModule || !isReady) {
        throw new Error("WASM module not ready");
      }

      try {
        const result = wasmModule.run_simulation(days, initialState);
        return result as SimulationDay[];
      } catch (err) {
        // Convert WASM errors to JavaScript Error objects
        const errorMessage =
          typeof err === "string"
            ? err
            : err instanceof Error
            ? err.message
            : "Failed to run simulation";
        throw new Error(errorMessage);
      }
    },
    [wasmModule, isReady]
  );

  // Wrapper function for get_statistics
  const getStatistics = useCallback(async (): Promise<Statistics> => {
    if (!wasmModule || !isReady) {
      throw new Error("WASM module not ready");
    }

    try {
      const result = wasmModule.get_statistics();
      return result as Statistics;
    } catch (err) {
      // Convert WASM errors to JavaScript Error objects
      const errorMessage =
        typeof err === "string"
          ? err
          : err instanceof Error
          ? err.message
          : "Failed to get statistics";
      throw new Error(errorMessage);
    }
  }, [wasmModule, isReady]);

  return {
    processData,
    runSimulation,
    getStatistics,
    isReady,
    error,
  };
}
