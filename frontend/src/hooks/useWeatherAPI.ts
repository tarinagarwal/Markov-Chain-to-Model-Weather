import { useQuery } from "@tanstack/react-query";

interface WeatherAPIResponse {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        condition: {
          text: string;
        };
        avgtemp_c: number;
      };
    }>;
  };
}

interface UseWeatherAPIOptions {
  enabled?: boolean;
}

interface UseWeatherAPIReturn {
  data: WeatherAPIResponse | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching historical weather data from WeatherAPI
 * Uses React Query for caching, retry logic, and state management
 *
 * @param city - The city name to fetch weather data for
 * @param options - Optional configuration
 * @returns Weather data, loading state, and error state
 */
export function useWeatherAPI(
  city: string,
  options: UseWeatherAPIOptions = {}
): UseWeatherAPIReturn {
  const { enabled = true } = options;

  // Get API key from environment variable
  const apiKey = import.meta.env.VITE_WEATHER_API_KEY;

  // Calculate date range (365 days of historical data)
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const formatDate = (date: Date) => {
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    };

    return {
      start: formatDate(startDate),
      end: formatDate(endDate),
    };
  };

  // Fetch function for weather data
  const fetchWeatherData = async (): Promise<WeatherAPIResponse> => {
    if (!apiKey) {
      throw new Error(
        "Weather API key not found. Please set VITE_WEATHER_API_KEY in your .env file"
      );
    }

    if (!city) {
      throw new Error("City parameter is required");
    }

    const dateRange = getDateRange();

    // Construct API URL with city name and date range
    // Using WeatherAPI.com history endpoint
    const url = `https://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${encodeURIComponent(
      city
    )}&dt=${dateRange.start}&end_dt=${dateRange.end}`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Invalid API key. Please check your VITE_WEATHER_API_KEY"
        );
      } else if (response.status === 400) {
        throw new Error(`Invalid city name: ${city}`);
      } else if (response.status === 429) {
        throw new Error("API rate limit exceeded. Please try again later");
      } else {
        throw new Error(`Failed to fetch weather data: ${response.statusText}`);
      }
    }

    const data = await response.json();
    return data as WeatherAPIResponse;
  };

  // Use React Query's useQuery with retry logic
  const query = useQuery({
    queryKey: ["weather", city],
    queryFn: fetchWeatherData,
    enabled: enabled && !!city && !!apiKey,
    // Configure retry logic with exponential backoff (max 3 attempts)
    retry: 3,
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
    // Cache data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Keep unused data in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
