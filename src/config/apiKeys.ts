// src/config/apiKeys.ts
// API Keys configuration

// OpenWeatherMap API Key
// Get your free API key from: https://openweathermap.org/api
export const OPENWEATHER_API_KEY = '08179ed34733004bdc1f31078bf7a375';

// Instructions:
// 1. Visit https://openweathermap.org/api
// 2. Sign up for a free account
// 3. Go to "API keys" section
// 4. Copy your API key and replace 'YOUR_API_KEY_HERE' above
// 5. Free tier includes 1000 calls per day

// Other API configurations can be added here
export const API_CONFIG = {
  OPENWEATHER: {
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    API_KEY: OPENWEATHER_API_KEY,
    UNITS: 'metric', // Celsius
  },
  // Add more API configurations as needed
};
