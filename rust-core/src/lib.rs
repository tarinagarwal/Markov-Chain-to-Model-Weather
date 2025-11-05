use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::fmt;
use ndarray::Array2;

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
