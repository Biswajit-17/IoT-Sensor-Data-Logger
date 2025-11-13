// src/App.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

// --- CONFIGURATION ---
// IMPORTANT: Replace this placeholder with your actual API Gateway GET endpoint URL
const API_ENDPOINT = "https://rcbe8w2aff.execute-api.us-east-1.amazonaws.com/data";

const SENSOR_IDS = {
  "temp_01": "Living Room Sensor",
  "temp_02": "Office Sensor",
  "temp_03": "Outdoor Sensor"
};

const REFRESH_INTERVAL_MS = 1800000; // 30 minutes

function App() {
  const [sensorData, setSensorData] = useState({});
  const [selectedSensor, setSelectedSensor] = useState(Object.keys(SENSOR_IDS)[0]);
  const [limit, setLimit] = useState(15);
  const [selectedDate, setSelectedDate] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // State for stats and status indicator
  const [stats, setStats] = useState({ minTemp: 0, maxTemp: 0, avgTemp: 0, minHum: 0, maxHum: 0, avgHum: 0 });
  const [currentReading, setCurrentReading] = useState({ temperature: 'N/A', humidity: 'N/A' });
  const [isFreshData, setIsFreshData] = useState(false);

  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.className = theme;
  }, [theme]);

  const fetchData = async () => {
    try {
      let apiUrl = `${API_ENDPOINT}?sensor_id=${selectedSensor}&limit=${limit}`;
      if (selectedDate) {
        apiUrl += `&date=${selectedDate}`;
      }
      
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.length > 0) {
        // Calculations for Stats and Current Reading
        const latestReading = response.data[0]; // Newest item is the first one before reversing
        setCurrentReading({ temperature: latestReading.temperature, humidity: latestReading.humidity });

        let minT = latestReading.temperature, maxT = latestReading.temperature, sumT = 0;
        let minH = latestReading.humidity, maxH = latestReading.humidity, sumH = 0;

        response.data.forEach(item => {
          if (item.temperature < minT) minT = item.temperature;
          if (item.temperature > maxT) maxT = item.temperature;
          sumT += item.temperature;
          
          if (item.humidity < minH) minH = item.humidity;
          if (item.humidity > maxH) maxH = item.humidity;
          sumH += item.humidity;
        });

        const count = response.data.length;
        setStats({
          minTemp: minT.toFixed(1), maxTemp: maxT.toFixed(1), avgTemp: (sumT / count).toFixed(1),
          minHum: minH, maxHum: maxH, avgHum: Math.round(sumH / count)
        });

        const formattedData = response.data.reverse().map(item => ({
          ...item,
          time: new Date(item.timestamp).toLocaleTimeString(),
        }));
        setSensorData(prevData => ({ ...prevData, [selectedSensor]: formattedData }));
        
        // Logic for status indicator
        setIsFreshData(true);
        setTimeout(() => setIsFreshData(false), 2000); // Set indicator to inactive after 2 seconds
      } else {
        // Handle case with no data
        setCurrentReading({ temperature: 'N/A', humidity: 'N/A' });
        setStats({ minTemp: 0, maxTemp: 0, avgTemp: 0, minHum: 0, maxHum: 0, avgHum: 0 });
        setSensorData(prevData => ({ ...prevData, [selectedSensor]: [] }));
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Error fetching sensor data:", err);
      setError(`Failed to fetch data. Check API/Lambda logs.`);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [selectedSensor, limit, selectedDate]);

  const currentData = sensorData[selectedSensor] || [];
  const currentSensorName = SENSOR_IDS[selectedSensor];

  return (
    <div className="App">
      <header className="App-header">
        <button className="theme-toggle-btn" onClick={toggleTheme}>
          Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
        <h1>IoT Sensor Dashboard</h1>
        <div className="controls-container">
          <div className="control-group">
            <label>Filter by Date: </label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)}
            />
            {selectedDate && <button className="clear-btn" onClick={() => setSelectedDate('')}>Clear</button>}
          </div>
          <div className="control-group">
            <label>Select Sensor: </label>
            <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}>
              {Object.entries(SENSOR_IDS).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label>Show Entries: </label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}>
              <option value={5}>Latest 5</option>
              <option value={10}>Latest 10</option>
              <option value={15}>Latest 15</option>
              <option value={20}>Latest 20</option>
            </select>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </header>
      
      <main className="dashboard-content">
        <div className="stats-container">
          <div className="stat-card current-reading">
            <h4>Latest Temperature</h4>
            <p>{currentReading.temperature}°C</p>
          </div>
          <div className="stat-card current-reading">
            <h4>Latest Humidity</h4>
            <p>{currentReading.humidity}%</p>
          </div>
          <div className="stat-card">
            <h4>Avg Temp</h4>
            <p>{stats.avgTemp}°C</p>
          </div>
          <div className="stat-card">
            <h4>Max Temp</h4>
            <p>{stats.maxTemp}°C</p>
          </div>
          <div className="stat-card">
            <h4>Min Temp</h4>
            <p>{stats.minTemp}°C</p>
          </div>
        </div>

        <div className="chart-container">
          <h3>Temperature (°C) for {currentSensorName}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" /> 
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="temperature" stroke="#ff7300" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="chart-container">
          <h3>Humidity (%) for {currentSensorName}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={currentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="humidity" stroke="#387908" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="footer">
          <span className={`status-dot ${isFreshData ? 'active' : ''}`}></span>
          Last Updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </main>
    </div>
  );
}

export default App;