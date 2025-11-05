use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
use ndarray::Array2;
use serde_json::Value;

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

#[wasm_bindgen]
pub fn init_markov_engine() -> Result<(), JsValue> {
    // Initialize the Markov chain engine
    // This function will be called from JavaScript to set up the WASM module
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init() {
        assert!(init_markov_engine().is_ok());
    }
}
