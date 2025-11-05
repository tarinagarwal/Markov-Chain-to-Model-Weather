use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::sync::Mutex;
use ndarray::Array2;
use serde_json::Value;

// Global state storage for transition matrix and simulation results
static TRANSITION_MATRIX: Mutex<Option<TransitionMatrix>> = Mutex::new(None);
static SIMULATION_RESULTS: Mutex<Option<Vec<WeatherState>>> = Mutex::new(None);

// StateType enum with Sunny, Rainy, Cloudy variants
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum StateType {
    Sunny,
    Rainy,
    Cloudy,
}

// Implement Display trait for StateType
impl fmt::Display for StateType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StateType::Sunny => write!(f, "Sunny"),
            StateType::Rainy => write!(f, "Rainy"),
            StateType::Cloudy => write!(f, "Cloudy"),
        }
    }
}

// WeatherState struct with state and timestamp fields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeatherState {
    pub state: StateType,
    pub timestamp: i64,
}

impl WeatherState {
    pub fn new(state: StateType, timestamp: i64) -> Self {
        Self { state, timestamp }
    }
}

// TransitionMatrix struct wrapping ndarray Array2<f64>
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionMatrix {
    pub matrix: Array2<f64>,
    pub states: Vec<StateType>,
}

impl TransitionMatrix {
    // Constructor that initializes 3x3 matrix
    pub fn new() -> Self {
        let matrix = Array2::<f64>::zeros((3, 3));
        let states = vec![StateType::Sunny, StateType::Rainy, StateType::Cloudy];
        Self { matrix, states }
    }

    // Validation method to ensure matrix is stochastic (rows sum to 1.0)
    pub fn is_stochastic(&self) -> bool {
        const EPSILON: f64 = 1e-6;
        
        for row in self.matrix.rows() {
            let sum: f64 = row.sum();
            if (sum - 1.0).abs() > EPSILON {
                return false;
            }
        }
        true
    }

    // Get the index of a state in the states vector
    pub fn state_index(&self, state: StateType) -> Option<usize> {
        self.states.iter().position(|&s| s == state)
    }
}

impl Default for TransitionMatrix {
    fn default() -> Self {
        Self::new()
    }
}

// HistoricalData struct with states vector and location string
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalData {
    pub states: Vec<WeatherState>,
    pub location: String,
}

impl HistoricalData {
    pub fn new(location: String) -> Self {
        Self {
            states: Vec::new(),
            location,
        }
    }

    // Method to access data length
    pub fn len(&self) -> usize {
        self.states.len()
    }

    // Method to check if data is empty
    pub fn is_empty(&self) -> bool {
        self.states.is_empty()
    }

    // Method to validate completeness (at least 2 states for transitions)
    pub fn is_complete(&self) -> bool {
        self.states.len() >= 2
    }

    // Add a weather state to the historical data
    pub fn add_state(&mut self, state: WeatherState) {
        self.states.push(state);
    }

    // Iterator for sequential state access
    pub fn iter(&self) -> impl Iterator<Item = &WeatherState> {
        self.states.iter()
    }

    // Get consecutive state pairs for transition counting
    pub fn state_pairs(&self) -> impl Iterator<Item = (&WeatherState, &WeatherState)> {
        self.states.iter().zip(self.states.iter().skip(1))
    }
}

// Custom error type for parsing errors
#[derive(Debug, Clone)]
pub enum ParseError {
    JsonError(String),
    MissingField(String),
    InvalidData(String),
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::JsonError(msg) => write!(f, "JSON parsing error: {}", msg),
            ParseError::MissingField(field) => write!(f, "Missing required field: {}", field),
            ParseError::InvalidData(msg) => write!(f, "Invalid data: {}", msg),
        }
    }
}

impl std::error::Error for ParseError {}

// Weather classification function that maps API conditions to StateType
pub fn classify_weather(conditions: &str) -> StateType {
    let conditions_lower = conditions.to_lowercase();
    
    // Check for rainy conditions
    if conditions_lower.contains("rain") 
        || conditions_lower.contains("drizzle")
        || conditions_lower.contains("shower")
        || conditions_lower.contains("thunderstorm")
        || conditions_lower.contains("storm") {
        return StateType::Rainy;
    }
    
    // Check for cloudy conditions
    if conditions_lower.contains("cloud")
        || conditions_lower.contains("overcast")
        || conditions_lower.contains("fog")
        || conditions_lower.contains("mist")
        || conditions_lower.contains("haze") {
        return StateType::Cloudy;
    }
    
    // Check for sunny/clear conditions
    if conditions_lower.contains("clear")
        || conditions_lower.contains("sunny")
        || conditions_lower.contains("fair") {
        return StateType::Sunny;
    }
    
    // Default to Cloudy for unknown conditions
    StateType::Cloudy
}

// Parse weather API JSON response into HistoricalData
pub fn parse_weather_data(json_data: &str) -> Result<HistoricalData, ParseError> {
    // Parse the JSON string
    let data: Value = serde_json::from_str(json_data)
        .map_err(|e| ParseError::JsonError(e.to_string()))?;
    
    // Extract location information
    let location_obj = data.get("location")
        .ok_or_else(|| ParseError::MissingField("location".to_string()))?;
    
    let location_name = location_obj.get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ParseError::MissingField("location.name".to_string()))?
        .to_string();
    
    // Create HistoricalData container
    let mut historical_data = HistoricalData::new(location_name);
    
    // Extract forecast data
    let forecast = data.get("forecast")
        .ok_or_else(|| ParseError::MissingField("forecast".to_string()))?;
    
    let forecast_days = forecast.get("forecastday")
        .and_then(|v| v.as_array())
        .ok_or_else(|| ParseError::MissingField("forecast.forecastday".to_string()))?;
    
    // Process each day's weather data
    for day_data in forecast_days {
        // Extract date and convert to timestamp
        let date_str = day_data.get("date")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ParseError::MissingField("date".to_string()))?;
        
        // Parse date string (format: YYYY-MM-DD) to timestamp
        let timestamp = parse_date_to_timestamp(date_str)
            .map_err(|e| ParseError::InvalidData(format!("Invalid date format: {}", e)))?;
        
        // Extract weather condition
        let day_obj = day_data.get("day")
            .ok_or_else(|| ParseError::MissingField("day".to_string()))?;
        
        let condition_obj = day_obj.get("condition")
            .ok_or_else(|| ParseError::MissingField("day.condition".to_string()))?;
        
        let condition_text = condition_obj.get("text")
            .and_then(|v| v.as_str())
            .ok_or_else(|| ParseError::MissingField("day.condition.text".to_string()))?;
        
        // Classify weather and create WeatherState
        let state = classify_weather(condition_text);
        let weather_state = WeatherState::new(state, timestamp);
        
        historical_data.add_state(weather_state);
    }
    
    // Validate that we have enough data
    if !historical_data.is_complete() {
        return Err(ParseError::InvalidData(
            "Insufficient weather data (need at least 2 days)".to_string()
        ));
    }
    
    Ok(historical_data)
}

// Helper function to parse date string to Unix timestamp
fn parse_date_to_timestamp(date_str: &str) -> Result<i64, String> {
    // Parse YYYY-MM-DD format
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() != 3 {
        return Err("Invalid date format, expected YYYY-MM-DD".to_string());
    }
    
    let year: i32 = parts[0].parse()
        .map_err(|_| "Invalid year".to_string())?;
    let month: u32 = parts[1].parse()
        .map_err(|_| "Invalid month".to_string())?;
    let day: u32 = parts[2].parse()
        .map_err(|_| "Invalid day".to_string())?;
    
    // Simple timestamp calculation (days since Unix epoch)
    // This is a simplified calculation for demonstration
    // In production, you'd use a proper date library like chrono
    let days_since_epoch = calculate_days_since_epoch(year, month, day);
    Ok(days_since_epoch * 86400) // Convert days to seconds
}

// Helper function to calculate days since Unix epoch (1970-01-01)
fn calculate_days_since_epoch(year: i32, month: u32, day: u32) -> i64 {
    // Simplified calculation - counts days from 1970-01-01
    let mut days: i64 = 0;
    
    // Add days for complete years
    for y in 1970..year {
        days += if is_leap_year(y) { 366 } else { 365 };
    }
    
    // Add days for complete months in current year
    let days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for m in 1..month {
        days += days_in_month[(m - 1) as usize] as i64;
        if m == 2 && is_leap_year(year) {
            days += 1;
        }
    }
    
    // Add remaining days
    days += day as i64 - 1;
    
    days
}

// Helper function to check if a year is a leap year
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

// Build transition matrix from historical data
pub fn build_transition_matrix(data: &HistoricalData) -> TransitionMatrix {
    // Initialize 3x3 count matrix to track state transitions
    let mut count_matrix = Array2::<f64>::zeros((3, 3));
    let states = vec![StateType::Sunny, StateType::Rainy, StateType::Cloudy];
    
    // Iterate through sequential state pairs and increment counts
    for (current_state, next_state) in data.state_pairs() {
        // Get indices for current and next states
        let current_idx = states.iter().position(|&s| s == current_state.state).unwrap();
        let next_idx = states.iter().position(|&s| s == next_state.state).unwrap();
        
        // Increment the count for this transition
        count_matrix[[current_idx, next_idx]] += 1.0;
    }
    
    // Normalize each row by dividing by row sum to get probabilities
    let mut transition_matrix = TransitionMatrix {
        matrix: count_matrix.clone(),
        states: states.clone(),
    };
    
    for i in 0..3 {
        let row_sum: f64 = count_matrix.row(i).sum();
        
        // If row sum is 0 (no transitions from this state), set uniform distribution
        if row_sum > 0.0 {
            for j in 0..3 {
                transition_matrix.matrix[[i, j]] = count_matrix[[i, j]] / row_sum;
            }
        } else {
            // Set uniform distribution (1/3 for each state)
            for j in 0..3 {
                transition_matrix.matrix[[i, j]] = 1.0 / 3.0;
            }
        }
    }
    
    // Validate that all rows sum to 1.0 within floating-point tolerance
    debug_assert!(
        transition_matrix.is_stochastic(),
        "Transition matrix is not stochastic"
    );
    
    transition_matrix
}

// Simulate weather using probabilistic sampling
pub fn simulate_weather(
    matrix: &TransitionMatrix,
    initial_state: StateType,
    days: usize,
) -> Vec<WeatherState> {
    
    // Initialize result vector with initial state
    let mut results = Vec::with_capacity(days);
    let initial_timestamp = 0; // Starting timestamp
    results.push(WeatherState::new(initial_state, initial_timestamp));
    
    let mut current_state = initial_state;
    
    // For each day, simulate the next state
    for day in 1..days {
        // Get current state's transition probabilities
        let current_idx = matrix.state_index(current_state).unwrap();
        let probabilities = matrix.matrix.row(current_idx);
        
        // Use weighted random sampling to select next state based on probabilities
        let next_state = weighted_random_sample(&matrix.states, probabilities.as_slice().unwrap());
        
        // Append selected state to results with timestamp
        let timestamp = initial_timestamp + (day as i64 * 86400); // Add days in seconds
        results.push(WeatherState::new(next_state, timestamp));
        
        current_state = next_state;
    }
    
    results
}

// Helper function for weighted random sampling
fn weighted_random_sample(states: &[StateType], probabilities: &[f64]) -> StateType {
    // Generate a random number between 0 and 1
    let mut buf = [0u8; 8];
    getrandom::getrandom(&mut buf).expect("Failed to generate random number");
    let random_value = u64::from_le_bytes(buf) as f64 / u64::MAX as f64;
    
    // Use cumulative probabilities to select a state
    let mut cumulative = 0.0;
    for (i, &prob) in probabilities.iter().enumerate() {
        cumulative += prob;
        if random_value <= cumulative {
            return states[i];
        }
    }
    
    // Fallback to last state (should not happen with valid probabilities)
    states[states.len() - 1]
}

// Calculate steady-state distribution using power iteration method
pub fn calculate_steady_state(matrix: &TransitionMatrix) -> Vec<f64> {
    const MAX_ITERATIONS: usize = 1000;
    const CONVERGENCE_THRESHOLD: f64 = 1e-8;
    
    let n = matrix.matrix.nrows();
    let mut current_matrix = matrix.matrix.clone();
    let mut previous_matrix = matrix.matrix.clone();
    
    // Use power iteration method: multiply matrix by itself repeatedly
    for iteration in 0..MAX_ITERATIONS {
        // Multiply matrix by itself
        current_matrix = current_matrix.dot(&matrix.matrix);
        
        // Check for convergence when successive iterations differ by less than threshold
        if iteration > 0 {
            let mut max_diff = 0.0;
            for i in 0..n {
                for j in 0..n {
                    let diff = (current_matrix[[i, j]] - previous_matrix[[i, j]]).abs();
                    if diff > max_diff {
                        max_diff = diff;
                    }
                }
            }
            
            // If converged, extract stationary distribution
            if max_diff < CONVERGENCE_THRESHOLD {
                // Extract the first row (all rows should be identical at steady state)
                return current_matrix.row(0).to_vec();
            }
        }
        
        previous_matrix = current_matrix.clone();
    }
    
    // If we didn't converge, return the current approximation
    // Extract stationary distribution from converged matrix (first row)
    current_matrix.row(0).to_vec()
}

// WASM Bindings and JavaScript Interface

#[wasm_bindgen]
pub fn init_markov_engine() -> Result<(), JsValue> {
    // Set up panic hook for better error messages in browser console
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    // Initialize random number generator for WASM environment
    // getrandom is already configured with "js" feature in Cargo.toml
    
    // Clear any existing state
    *TRANSITION_MATRIX.lock().unwrap() = None;
    *SIMULATION_RESULTS.lock().unwrap() = None;
    
    Ok(())
}

#[wasm_bindgen]
pub fn process_weather_data(json_str: &str) -> Result<JsValue, JsValue> {
    // Call parse_weather_data to convert JSON to HistoricalData
    let historical_data = parse_weather_data(json_str)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse weather data: {}", e)))?;
    
    // Call build_transition_matrix to generate transition matrix
    let matrix = build_transition_matrix(&historical_data);
    
    // Validate the matrix is stochastic
    if !matrix.is_stochastic() {
        return Err(JsValue::from_str("Generated transition matrix is not stochastic"));
    }
    
    // Store matrix in static storage for later access
    *TRANSITION_MATRIX.lock().unwrap() = Some(matrix.clone());
    
    // Serialize matrix to JsValue using serde-wasm-bindgen
    let matrix_data = MatrixData {
        matrix: matrix.matrix.as_slice().unwrap().to_vec(),
        states: matrix.states.iter().map(|s| s.to_string()).collect(),
        rows: matrix.matrix.nrows(),
        cols: matrix.matrix.ncols(),
    };
    
    serde_wasm_bindgen::to_value(&matrix_data)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize matrix: {}", e)))
}

#[wasm_bindgen]
pub fn run_simulation(days: usize, initial_state_str: &str) -> Result<JsValue, JsValue> {
    // Parse initial state string to StateType enum
    let initial_state = match initial_state_str.to_lowercase().as_str() {
        "sunny" => StateType::Sunny,
        "rainy" => StateType::Rainy,
        "cloudy" => StateType::Cloudy,
        _ => return Err(JsValue::from_str(&format!("Invalid initial state: {}. Must be 'Sunny', 'Rainy', or 'Cloudy'", initial_state_str))),
    };
    
    // Retrieve stored transition matrix from static storage
    let matrix_guard = TRANSITION_MATRIX.lock().unwrap();
    let matrix = matrix_guard.as_ref()
        .ok_or_else(|| JsValue::from_str("No transition matrix available. Call process_weather_data first."))?;
    
    // Call simulate_weather with matrix, initial state, and days
    let simulation_results = simulate_weather(matrix, initial_state, days);
    
    // Store simulation results for statistics calculation
    *SIMULATION_RESULTS.lock().unwrap() = Some(simulation_results.clone());
    
    // Serialize simulation results to JsValue
    let results_data: Vec<SimulationDay> = simulation_results.iter().enumerate().map(|(idx, ws)| {
        SimulationDay {
            day: idx,
            state: ws.state.to_string(),
            timestamp: ws.timestamp,
        }
    }).collect();
    
    serde_wasm_bindgen::to_value(&results_data)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize simulation results: {}", e)))
}

#[wasm_bindgen]
pub fn get_statistics() -> Result<JsValue, JsValue> {
    // Retrieve stored transition matrix
    let matrix_guard = TRANSITION_MATRIX.lock().unwrap();
    let matrix = matrix_guard.as_ref()
        .ok_or_else(|| JsValue::from_str("No transition matrix available. Call process_weather_data first."))?;
    
    // Calculate steady-state distribution using calculate_steady_state
    let steady_state = calculate_steady_state(matrix);
    
    // Compute state distribution from last simulation results
    let simulation_guard = SIMULATION_RESULTS.lock().unwrap();
    let state_distribution = if let Some(results) = simulation_guard.as_ref() {
        calculate_state_distribution(results)
    } else {
        // If no simulation has been run, return empty distribution
        vec![0.0, 0.0, 0.0]
    };
    
    // Calculate average streak lengths for each state
    let average_streaks = if let Some(results) = simulation_guard.as_ref() {
        calculate_average_streaks(results)
    } else {
        vec![0.0, 0.0, 0.0]
    };
    
    // Serialize all statistics to JsValue as structured object
    let statistics = Statistics {
        steady_state: StateProbabilities {
            sunny: steady_state[0],
            rainy: steady_state[1],
            cloudy: steady_state[2],
        },
        distribution: StateProbabilities {
            sunny: state_distribution[0],
            rainy: state_distribution[1],
            cloudy: state_distribution[2],
        },
        average_streaks: StateProbabilities {
            sunny: average_streaks[0],
            rainy: average_streaks[1],
            cloudy: average_streaks[2],
        },
    };
    
    serde_wasm_bindgen::to_value(&statistics)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize statistics: {}", e)))
}

// Helper structures for serialization

#[derive(Serialize, Deserialize)]
struct MatrixData {
    matrix: Vec<f64>,
    states: Vec<String>,
    rows: usize,
    cols: usize,
}

#[derive(Serialize, Deserialize)]
struct SimulationDay {
    day: usize,
    state: String,
    timestamp: i64,
}

#[derive(Serialize, Deserialize)]
struct StateProbabilities {
    sunny: f64,
    rainy: f64,
    cloudy: f64,
}

#[derive(Serialize, Deserialize)]
struct Statistics {
    steady_state: StateProbabilities,
    distribution: StateProbabilities,
    average_streaks: StateProbabilities,
}

// Helper function to calculate state distribution from simulation results
fn calculate_state_distribution(results: &[WeatherState]) -> Vec<f64> {
    let total = results.len() as f64;
    if total == 0.0 {
        return vec![0.0, 0.0, 0.0];
    }
    
    let mut counts = vec![0.0, 0.0, 0.0];
    for state in results {
        match state.state {
            StateType::Sunny => counts[0] += 1.0,
            StateType::Rainy => counts[1] += 1.0,
            StateType::Cloudy => counts[2] += 1.0,
        }
    }
    
    counts.iter().map(|&c| c / total).collect()
}

// Helper function to calculate average streak lengths for each state
fn calculate_average_streaks(results: &[WeatherState]) -> Vec<f64> {
    if results.is_empty() {
        return vec![0.0, 0.0, 0.0];
    }
    
    let states = [StateType::Sunny, StateType::Rainy, StateType::Cloudy];
    let mut average_streaks = vec![0.0, 0.0, 0.0];
    
    for (idx, &target_state) in states.iter().enumerate() {
        let mut streak_lengths = Vec::new();
        let mut current_streak = 0;
        
        for weather_state in results {
            if weather_state.state == target_state {
                current_streak += 1;
            } else if current_streak > 0 {
                streak_lengths.push(current_streak);
                current_streak = 0;
            }
        }
        
        // Don't forget the last streak if it ends at the end of results
        if current_streak > 0 {
            streak_lengths.push(current_streak);
        }
        
        // Calculate average
        if !streak_lengths.is_empty() {
            let sum: usize = streak_lengths.iter().sum();
            average_streaks[idx] = sum as f64 / streak_lengths.len() as f64;
        }
    }
    
    average_streaks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init() {
        assert!(init_markov_engine().is_ok());
    }
}
