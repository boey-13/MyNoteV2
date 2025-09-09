// src/components/WeatherWidget.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/Feather';
import { getCurrentWeather, getWeatherIconUrl, formatWeatherData, WeatherData } from '../utils/weatherApi';
import { showToast } from './Toast';

interface WeatherWidgetProps {
  city?: string;
  onWeatherData?: (weather: WeatherData) => void;
  onCityChange?: (city: string) => void;
  style?: any;
}

export default function WeatherWidget({ city = 'London', onWeatherData, onCityChange, style }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState(city);
  const [showCityInput, setShowCityInput] = useState(false);
  const [cityInput, setCityInput] = useState(city);

  const fetchWeather = async (cityName: string = currentCity) => {
    if (!cityName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const weatherData = await getCurrentWeather(cityName);
      setWeather(weatherData);
      onWeatherData?.(weatherData);
      showToast.success('Weather updated!');
    } catch (err: any) {
      let errorMessage = err.message;
      
      // Provide more specific error messages
      if (err.message.includes('404') || err.message.includes('city not found')) {
        errorMessage = 'City not found. Please check the spelling or try a different city.';
      } else if (err.message.includes('401') || err.message.includes('Invalid API key')) {
        errorMessage = 'API key error. Please check configuration.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please check your internet connection.';
      }
      
      setError(errorMessage);
      showToast.error(`Weather error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentCity(city);
    setCityInput(city);
    fetchWeather(city);
  }, [city]);

  const handleCityChange = () => {
    if (cityInput.trim()) {
      setCurrentCity(cityInput.trim());
      onCityChange?.(cityInput.trim());
      setError(null); // Clear any previous errors
      fetchWeather(cityInput.trim());
      setShowCityInput(false);
    }
  };

  const handleRefresh = () => {
    fetchWeather();
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#666" />
        <Text style={styles.loadingText}>Loading weather...</Text>
      </View>
    );
  }

  if (error && !showCityInput) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>
          {error.includes('city not found') || error.includes('404') 
            ? 'City not found. Please try a different city name.' 
            : 'Weather unavailable'}
        </Text>
        <View style={styles.errorButtons}>
          <TouchableOpacity 
            onPress={() => setShowCityInput(true)} 
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Search Other City</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* City Input */}
      {showCityInput ? (
        <View style={styles.cityInputContainer}>
          <TextInput
            style={styles.cityInput}
            value={cityInput}
            onChangeText={setCityInput}
            placeholder="Enter city name..."
            placeholderTextColor="#999"
            autoFocus
          />
          <View style={styles.cityInputButtons}>
            <TouchableOpacity
              onPress={() => {
                setShowCityInput(false);
                setError(null); // Clear error when canceling
              }}
              style={styles.cityInputButton}
            >
              <Text style={styles.cityInputButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCityChange}
              style={[styles.cityInputButton, styles.cityInputButtonPrimary]}
            >
              <Text style={[styles.cityInputButtonText, styles.cityInputButtonTextPrimary]}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.weatherInfo} onPress={handleRefresh}>
          <View style={styles.weatherMainInfo}>
            <View style={styles.temperatureContainer}>
              <Text style={styles.temperature}>{weather.temperature}°</Text>
              <Text style={styles.celsius}>C</Text>
            </View>
            <View style={styles.detailsContainer}>
              <View style={styles.cityRow}>
                <Text style={styles.city}>{weather.city}</Text>
                <TouchableOpacity
                  onPress={() => setShowCityInput(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.description}>{weather.description}</Text>
              <Text style={styles.details}>
                💧 {weather.humidity}% | 💨 {weather.windSpeed}m/s
              </Text>
            </View>
            <View style={styles.iconContainer}>
              <Image
                source={{ uri: getWeatherIconUrl(weather.icon) }}
                style={styles.weatherIcon}
                resizeMode="contain"
                onError={() => {
                  console.log('Weather icon failed to load:', getWeatherIconUrl(weather.icon));
                }}
              />
              {/* Fallback icon if image fails to load */}
              <View style={styles.fallbackIcon}>
                <Icon name="sun" size={30} color="#FFA500" />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderColor: '#fed7d7',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  cityInputContainer: {
    gap: 10,
  },
  cityInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cityInputButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cityInputButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  cityInputButtonPrimary: {
    backgroundColor: '#455B96',
  },
  cityInputButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  cityInputButtonTextPrimary: {
    color: 'white',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  editButton: {
    backgroundColor: '#455B96',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  temperature: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  celsius: {
    fontSize: 16,
    color: '#718096',
    marginLeft: 2,
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 16,
  },
  city: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  description: {
    fontSize: 14,
    color: '#718096',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  details: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 4,
  },
  iconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  weatherIcon: {
    width: 50,
    height: 50,
    position: 'absolute',
  },
  fallbackIcon: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    borderRadius: 25,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  searchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#455B96',
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e53e3e',
    borderRadius: 6,
    flex: 1,
    alignItems: 'center',
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
