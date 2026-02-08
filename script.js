/**
 * EcoGuard Environmental Monitoring Dashboard
 * Pure Vanilla JavaScript Application
 * No frameworks - Pure HTML/CSS/JS Implementation
 */

// ======================
// CONFIGURATION
// ======================
const CONFIG = {
  OPENWEATHER_API_KEY: '4ab42ca2ecba122ff6a5bb273e990829',
  DEFAULT_LAT: 37.7749,
  DEFAULT_LON: -122.4194,
  UPDATE_INTERVAL_MS: 300000, // 5 minutes
  CAMERA_STATIC_INTERVAL_MS: 150
};

// ======================
// APPLICATION STATE
// ======================
const state = {
  isMonitoring: true,
  sensitivity: 'Medium',
  userCoords: null,
  locationName: 'Searching...',
  alerts: [],
  currentData: {
    temperature: 0,
    humidity: 0,
    windSpeed: 0,
    airDensity: 1.225,
    visibility: 0,
    timestamp: '--:--:--'
  },
  map: null,
  mapCircle: null,
  cameraStream: null,
  updateInterval: null
};

// ======================
// UTILITY FUNCTIONS
// ======================

/**
 * Calculate environmental risk metrics
 */
function calculateRiskMetrics(temp, humidity, wind) {
  const tempFactor = Math.max(0, (temp - 15) * 2);
  const humidityFactor = Math.max(0, (70 - humidity) * 1.5);
  const windFactor = wind * 1.2;
  const combinedRisk = (tempFactor + humidityFactor + windFactor) / 1.5;
  const finalScore = Math.min(100, Math.max(0, combinedRisk));
  
  let level = 'NORMAL';
  let color = 'emerald';
  if (finalScore > 70) {
    level = 'CRITICAL';
    color = 'red';
  } else if (finalScore > 40) {
    level = 'ELEVATED';
    color = 'amber';
  }
  
  return { score: Math.round(finalScore), level, color };
}

/**
 * Format time string
 */
function getTimeString() {
  return new Date().toLocaleTimeString();
}

/**
 * Generate unique ID
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ======================
// ALERT SYSTEM
// ======================

/**
 * Add alert to the system
 */
function addAlert(type, message, location) {
  const alert = {
    id: generateId(),
    type: type, // 'INFO', 'WARNING', 'ALERT'
    message: message,
    location: location,
    time: getTimeString()
  };
  
  state.alerts.unshift(alert);
  if (state.alerts.length > 10) {
    state.alerts = state.alerts.slice(0, 10);
  }
  
  renderAlerts();
}

/**
 * Clear all alerts
 */
function clearAlerts() {
  state.alerts = [];
  renderAlerts();
}

/**
 * Get icon SVG for alert type
 */
function getAlertIcon(type) {
  const icons = {
    'INFO': '<svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    'WARNING': '<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>',
    'ALERT': '<svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>'
  };
  return icons[type] || icons['INFO'];
}

/**
 * Render alerts to the UI
 */
function renderAlerts() {
  const feedEl = document.getElementById('alert-feed');
  
  if (state.alerts.length === 0) {
    feedEl.innerHTML = `
      <div class="h-full flex items-center justify-center text-slate-600 italic text-sm">
        No active anomalies detected
      </div>
    `;
    return;
  }
  
  feedEl.innerHTML = state.alerts.map(alert => {
    const cardClass = {
      'INFO': 'alert-card-info',
      'WARNING': 'alert-card-warning',
      'ALERT': 'alert-card-alert'
    }[alert.type] || 'alert-card-info';
    
    const textClass = {
      'INFO': 'text-slate-400',
      'WARNING': 'text-amber-400',
      'ALERT': 'text-rose-400'
    }[alert.type] || 'text-slate-400';
    
    return `
      <div class="alert-card ${cardClass}">
        <div class="shrink-0 mt-0.5">
          ${getAlertIcon(alert.type)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start mb-0.5">
            <span class="text-[10px] font-bold uppercase tracking-wider ${textClass}">
              ${alert.type}
            </span>
            <span class="text-[10px] text-slate-500 font-mono">${alert.time}</span>
          </div>
          <p class="text-xs text-slate-200 font-medium leading-tight mb-1">${alert.message}</p>
          <p class="text-[10px] text-slate-500 font-mono truncate">${alert.location}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ======================
// LIVE STATS
// ======================

/**
 * Render live statistics
 */
function renderLiveStats() {
  const statsEl = document.getElementById('live-stats');
  const data = state.currentData;
  
  const stats = [
    {
      label: 'Temperature',
      value: data.temperature.toFixed(1),
      unit: '°C',
      color: 'orange',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 14.76V5a2 2 0 1 0-4 0v9.76A5 5 0 1 0 14 14.76z"/></svg>'
    },
    {
      label: 'Humidity',
      value: data.humidity.toFixed(0),
      unit: '%',
      color: 'sky',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2.69l.94 1.7A7 7 0 0 1 19 11.5a7 7 0 0 1-14 0A7 7 0 0 1 11.06 4.39L12 2.69z"/></svg>'
    },
    {
      label: 'Wind Speed',
      value: data.windSpeed.toFixed(1),
      unit: 'km/h',
      color: 'indigo',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.7 17.29A4 4 0 1 0 21 13H3"/><path d="M12.7 7.29A4 4 0 1 0 16 3H3"/></svg>'
    },
    {
      label: 'Air Density',
      value: data.airDensity.toFixed(3),
      unit: 'kg/m³',
      color: 'slate',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>'
    },
    {
      label: 'Visibility',
      value: data.visibility.toFixed(1),
      unit: '%',
      color: 'emerald',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/></svg>'
    },
    {
      label: 'Last Update',
      value: data.timestamp,
      unit: '',
      color: 'purple',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    }
  ];
  
  statsEl.innerHTML = stats.map(stat => `
    <div class="stat-card">
      <div class="flex justify-between items-start mb-2">
        <div class="p-2 bg-${stat.color}-500/10 rounded-lg border border-${stat.color}-500/20">
          ${stat.icon}
        </div>
      </div>
      <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium mb-1">${stat.label}</div>
      <div class="flex items-baseline gap-1">
        <span class="text-lg font-bold text-slate-100">${stat.value}</span>
        ${stat.unit ? `<span class="text-xs text-slate-500">${stat.unit}</span>` : ''}
      </div>
    </div>
  `).join('');
  
  // Update stats location name
  document.getElementById('stats-location-name').textContent = state.locationName;
}

/**
 * Update risk assessment display
 */
function updateRiskDisplay(riskData) {
  const levelText = document.getElementById('risk-level-text');
  const levelBar = document.getElementById('risk-level-bar');
  const scoreEl = document.getElementById('risk-score');
  
  levelText.textContent = riskData.level;
  levelBar.style.width = riskData.score + '%';
  scoreEl.textContent = riskData.score;
  
  // Update colors based on level
  levelText.className = `text-xs font-bold text-${riskData.color}-500`;
  levelBar.className = `h-full bg-${riskData.color}-500 transition-all duration-500`;
}

// ======================
// GEOLOCATION
// ======================

/**
 * Acquire device location
 */
function acquireLocation() {
  if (!("geolocation" in navigator)) {
    addAlert('WARNING', 'Geolocation not supported by this device', 'System Core');
    state.userCoords = { lat: CONFIG.DEFAULT_LAT, lon: CONFIG.DEFAULT_LON };
    state.locationName = 'Fallback Location';
    updateLocationUI();
    return;
  }
  
  addAlert('INFO', 'Acquiring device location...', 'GPS Module');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('Location acquired:', position.coords.latitude, position.coords.longitude);
      state.userCoords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      addAlert('INFO', 'Device location acquired successfully', 'GPS Module');
      updateLocationUI();
      fetchWeatherData();
      initializeMap();
    },
    (error) => {
      console.error('Geolocation error:', error);
      addAlert('WARNING', 'Location access denied. Using fallback coordinates.', 'GPS Module');
      state.userCoords = { lat: CONFIG.DEFAULT_LAT, lon: CONFIG.DEFAULT_LON };
      state.locationName = 'Fallback Location';
      updateLocationUI();
      fetchWeatherData();
      initializeMap();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Update location UI elements
 */
function updateLocationUI() {
  if (state.userCoords) {
    document.getElementById('location-status').textContent = 'Connected';
    document.getElementById('location-status').className = 'text-xs text-emerald-500';
    document.getElementById('gps-connection-status').textContent = 'CONNECTED';
    document.getElementById('gps-connection-status').className = 'text-emerald-500';
    
    const coordsText = `${state.userCoords.lat.toFixed(4)}, ${state.userCoords.lon.toFixed(4)}`;
    document.getElementById('gps-coords').textContent = `GPS: ${coordsText}`;
  }
  
  document.getElementById('location-name').textContent = state.locationName;
  document.getElementById('current-zone-name').textContent = state.locationName;
}

// ======================
// WEATHER API
// ======================

/**
 * Fetch weather data from OpenWeather API
 */
async function fetchWeatherData() {
  if (!state.isMonitoring || !state.userCoords) return;
  
  try {
    const { lat, lon } = state.userCoords;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.OPENWEATHER_API_KEY}&units=metric`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API failed');
    
    const data = await response.json();
    state.locationName = data.name || 'Detected Sector';
    
    state.currentData = {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed * 3.6, // m/s to km/h
      airDensity: 1.225,
      visibility: (data.visibility / 10000) * 100,
      timestamp: getTimeString()
    };
    
    // Update UI
    updateLocationUI();
    renderLiveStats();
    document.getElementById('last-update-time').textContent = state.currentData.timestamp;
    
    // Calculate and update risk
    const risk = calculateRiskMetrics(
      state.currentData.temperature,
      state.currentData.humidity,
      state.currentData.windSpeed
    );
    updateRiskDisplay(risk);
    
    // Add alert if risk is high
    if (risk.score > 60) {
      addAlert('ALERT', `Atmospheric Risk Detected: Index ${risk.score}%`, data.name || 'Local Sector');
    }
    
    // Update map if exists
    if (state.map && state.mapCircle) {
      state.mapCircle.bindPopup(`<div class="text-slate-900 font-bold text-xs">Sector: ${state.locationName}<br/>Risk: ${risk.score}%</div>`);
    }
    
  } catch (error) {
    console.warn('Weather fetch error:', error);
    addAlert('WARNING', 'Failed to fetch weather data', 'Weather API');
  }
}

// ======================
// MAP SYSTEM
// ======================

/**
 * Initialize Leaflet map
 */
function initializeMap() {
  if (state.map || !state.userCoords) return;
  
  // Hide loading overlay
  document.getElementById('map-loading-overlay').style.opacity = '0';
  setTimeout(() => {
    document.getElementById('map-loading-overlay').style.display = 'none';
  }, 500);
  
  // Create map
  const mapEl = document.getElementById('map');
  state.map = L.map(mapEl, {
    zoomControl: false,
    attributionControl: true
  }).setView([state.userCoords.lat, state.userCoords.lon], 12);
  
  // Add dark tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO &copy; OpenStreetMap',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(state.map);
  
  // Add zoom control to top right
  L.control.zoom({ position: 'topright' }).addTo(state.map);
  
  // Add monitoring circle with pulsing effect
  state.mapCircle = L.circle([state.userCoords.lat, state.userCoords.lon], {
    color: '#10b981',
    fillColor: '#10b981',
    fillOpacity: 0.15,
    radius: 3000,
    weight: 1,
    dashArray: '5, 10'
  }).addTo(state.map);
  
  state.mapCircle.bindPopup(`<div class="text-slate-900 font-bold text-xs">Sector: ${state.locationName}</div>`);
  
  // Update map status
  updateMapStatus();
}

/**
 * Update map visual status
 */
function updateMapStatus() {
  const statusIndicator = document.getElementById('map-status-indicator');
  const statusText = document.getElementById('map-status-text');
  
  if (!state.userCoords) {
    statusIndicator.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    statusText.textContent = 'Waiting for GPS...';
  } else if (state.isMonitoring) {
    statusIndicator.className = 'w-2 h-2 rounded-full bg-emerald-500 pulse-slow';
    statusText.textContent = 'Observation Active';
  } else {
    statusIndicator.className = 'w-2 h-2 rounded-full bg-red-500';
    statusText.textContent = 'Observation Suspended';
  }
  
  // Update map container opacity
  if (state.map) {
    const container = state.map.getContainer();
    if (state.isMonitoring) {
      container.style.filter = 'none';
      container.style.opacity = '1';
    } else {
      container.style.filter = 'grayscale(100%) brightness(0.6)';
      container.style.opacity = '0.8';
    }
  }
}

// ======================
// CAMERA SYSTEM
// ======================

/**
 * Start camera using WebRTC
 */
async function startCamera() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addAlert('WARNING', 'Camera access not supported by this browser', 'Camera Module');
      return;
    }
    
    // Request camera access
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment'
      },
      audio: false
    });
    
    state.cameraStream = stream;
    
    // Show video element
    const videoEl = document.getElementById('camera-video');
    const placeholder = document.getElementById('camera-placeholder');
    const startBtn = document.getElementById('camera-start-btn');
    const stopBtn = document.getElementById('camera-stop-btn');
    const recIndicator = document.getElementById('camera-rec-indicator');
    
    videoEl.srcObject = stream;
    videoEl.play();
    
    // Update UI
    videoEl.classList.remove('hidden');
    placeholder.style.display = 'none';
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    recIndicator.classList.remove('hidden');
    
    // Update camera label
    document.getElementById('camera-location-label').textContent = `Live Feed: ${state.locationName.toUpperCase()} 01`;
    
    addAlert('INFO', 'Camera feed activated successfully', 'Camera Module');
    
  } catch (error) {
    console.error('Camera error:', error);
    addAlert('WARNING', `Camera access denied: ${error.message}`, 'Camera Module');
  }
}

/**
 * Stop camera stream
 */
function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
    
    // Update UI
    const videoEl = document.getElementById('camera-video');
    const placeholder = document.getElementById('camera-placeholder');
    const startBtn = document.getElementById('camera-start-btn');
    const stopBtn = document.getElementById('camera-stop-btn');
    const recIndicator = document.getElementById('camera-rec-indicator');
    
    videoEl.srcObject = null;
    videoEl.classList.add('hidden');
    placeholder.style.display = 'flex';
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    recIndicator.classList.add('hidden');
    
    document.getElementById('camera-location-label').textContent = 'Live Feed: Standby';
    
    addAlert('INFO', 'Camera feed deactivated', 'Camera Module');
  }
}

/**
 * Initialize camera static effect
 */
function initCameraStaticEffect() {
  setInterval(() => {
    const staticEl = document.getElementById('camera-static');
    if (staticEl && staticEl.offsetParent !== null) {
      const opacity = 0.03 + Math.random() * 0.05;
      staticEl.style.opacity = opacity.toString();
    }
  }, CONFIG.CAMERA_STATIC_INTERVAL_MS);
}

// ======================
// CONTROL PANEL
// ======================

/**
 * Toggle monitoring status
 */
function toggleMonitoring() {
  state.isMonitoring = !state.isMonitoring;
  
  const btnText = document.getElementById('monitoring-btn-text');
  const btn = document.getElementById('monitoring-toggle');
  const indicator = document.getElementById('monitoring-indicator');
  const footerStatus = document.getElementById('footer-status');
  
  if (state.isMonitoring) {
    btnText.textContent = 'Stop Monitoring';
    btn.className = 'btn btn-primary w-full';
    indicator.className = 'w-2 h-2 rounded-full bg-emerald-500 pulse-slow';
    footerStatus.textContent = 'ONLINE';
    addAlert('INFO', 'Environmental monitoring resumed', 'Control Panel');
    
    // Resume weather updates
    if (!state.updateInterval) {
      fetchWeatherData();
      state.updateInterval = setInterval(fetchWeatherData, CONFIG.UPDATE_INTERVAL_MS);
    }
  } else {
    btnText.textContent = 'Start Monitoring';
    btn.className = 'btn btn-danger w-full';
    indicator.className = 'w-2 h-2 rounded-full bg-red-500';
    footerStatus.textContent = 'STANDBY';
    addAlert('WARNING', 'Environmental monitoring suspended', 'Control Panel');
    
    // Stop weather updates
    if (state.updateInterval) {
      clearInterval(state.updateInterval);
      state.updateInterval = null;
    }
  }
  
  updateMapStatus();
}

/**
 * Change sensitivity level
 */
function changeSensitivity(level) {
  state.sensitivity = level;
  
  // Update button styles
  const buttons = document.querySelectorAll('.sensitivity-btn');
  buttons.forEach(btn => {
    if (btn.dataset.level === level) {
      btn.className = 'sensitivity-btn flex-1 py-2 text-xs font-semibold rounded bg-emerald-600 text-white';
    } else {
      btn.className = 'sensitivity-btn flex-1 py-2 text-xs font-semibold rounded bg-slate-700 hover:bg-slate-600 transition-colors';
    }
  });
  
  addAlert('INFO', `Sensitivity level changed to ${level}`, 'Control Panel');
}

// ======================
// EVENT LISTENERS
// ======================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Clear alerts button
  document.getElementById('clear-alerts-btn').addEventListener('click', clearAlerts);
  
  // Monitoring toggle
  document.getElementById('monitoring-toggle').addEventListener('click', toggleMonitoring);
  
  // Sensitivity buttons
  document.querySelectorAll('.sensitivity-btn').forEach(btn => {
    btn.addEventListener('click', () => changeSensitivity(btn.dataset.level));
  });
  
  // GPS recalibration
  document.getElementById('recalibrate-gps-btn').addEventListener('click', () => {
    addAlert('INFO', 'Recalibrating GPS coordinates...', 'GPS Module');
    acquireLocation();
  });
  
  // Camera controls
  document.getElementById('camera-start-btn').addEventListener('click', startCamera);
  document.getElementById('camera-stop-btn').addEventListener('click', stopCamera);
  
  // Click on placeholder to start camera
  document.getElementById('camera-placeholder').addEventListener('click', startCamera);
}

// ======================
// INITIALIZATION
// ======================

/**
 * Initialize the application
 */
function init() {
  console.log('EcoGuard Dashboard Initializing...');
  
  // Add initial alert
  addAlert('INFO', 'EcoGuard System Initializing...', 'System Core');
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize camera static effect
  initCameraStaticEffect();
  
  // Render initial states
  renderAlerts();
  renderLiveStats();
  updateMapStatus();
  
  // Acquire location and start monitoring
  acquireLocation();
  
  // Start periodic updates
  state.updateInterval = setInterval(fetchWeatherData, CONFIG.UPDATE_INTERVAL_MS);
  
  // Update footer status
  document.getElementById('footer-status').textContent = 'ONLINE';
  
  console.log('EcoGuard Dashboard Ready');
  addAlert('INFO', 'System initialized successfully. All modules online.', 'System Core');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
