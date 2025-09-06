// src/utils/weatherApi.ts
// OpenWeatherMap API integration

import { API_CONFIG } from '../config/apiKeys';

const WEATHER_API_KEY = API_CONFIG.OPENWEATHER.API_KEY;
const WEATHER_BASE_URL = API_CONFIG.OPENWEATHER.BASE_URL;

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  city: string;
  country: string;
  icon: string;
  timestamp: number;
}

export interface WeatherError {
  code: string;
  message: string;
}

// Get current weather by city name
export async function getCurrentWeather(city: string): Promise<WeatherData> {
  try {
    const response = await fetch(
      `${WEATHER_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      country: data.sys.country,
      icon: data.weather[0].icon,
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('Weather API error:', error);
    throw new Error(`Failed to fetch weather: ${error.message}`);
  }
}

// Get weather by coordinates
export async function getWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(
      `${WEATHER_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      city: data.name,
      country: data.sys.country,
      icon: data.weather[0].icon,
      timestamp: Date.now()
    };
  } catch (error: any) {
    console.error('Weather API error:', error);
    throw new Error(`Failed to fetch weather: ${error.message}`);
  }
}

// Get 5-day weather forecast
export async function getWeatherForecast(city: string): Promise<WeatherData[]> {
  try {
    const response = await fetch(
      `${WEATHER_BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric`
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Group by day and take one forecast per day
    const dailyForecasts: { [key: string]: any } = {};
    
    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toDateString();
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = item;
      }
    });
    
    return Object.values(dailyForecasts).map((item: any) => ({
      temperature: Math.round(item.main.temp),
      description: item.weather[0].description,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
      city: data.city.name,
      country: data.city.country,
      icon: item.weather[0].icon,
      timestamp: item.dt * 1000
    }));
  } catch (error: any) {
    console.error('Weather forecast error:', error);
    throw new Error(`Failed to fetch weather forecast: ${error.message}`);
  }
}

// Get weather icon URL
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

// Format weather data for display
export function formatWeatherData(weather: WeatherData): string {
  return `${weather.city}, ${weather.country}: ${weather.temperature}°C, ${weather.description}`;
}
