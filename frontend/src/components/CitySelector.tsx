interface CitySelectorProps {
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
}

/**
 * CitySelector component allows users to select a city from a dropdown
 * Displays the list of available cities and highlights the current selection
 */
function CitySelector({
  cities,
  selectedCity,
  onCityChange,
}: CitySelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onCityChange(event.target.value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <label
        htmlFor="city-select"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Select City
      </label>
      <div className="relative">
        <select
          id="city-select"
          value={selectedCity}
          onChange={handleChange}
          className="block w-full px-4 py-3 pr-8 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer transition-colors hover:border-gray-400"
        >
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
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
      <div className="mt-3 flex items-center text-sm text-gray-600">
        <svg
          className="h-4 w-4 mr-1.5 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          Currently selected: <strong>{selectedCity}</strong>
        </span>
      </div>
    </div>
  );
}

export default CitySelector;
