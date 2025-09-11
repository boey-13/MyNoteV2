// src/config/apiKeys.ts
// API Keys configuration

// OpenWeatherMap API Key
// Get your free API key from: https://openweathermap.org/api
export const OPENWEATHER_API_KEY = '08179ed34733004bdc1f31078bf7a375';


// Other API configurations can be added here
export const API_CONFIG = {
  OPENWEATHER: {
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    API_KEY: OPENWEATHER_API_KEY,
    UNITS: 'metric', // Celsius
  },
};
