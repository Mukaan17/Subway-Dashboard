/**
 * @Author: Mukhil Sundararaj
 * @Date:   2025-05-10 23:46:23
 * @Last Modified by:   Mukhil Sundararaj
 * @Last Modified time: 2025-05-11 20:50:06
 */
import axios from 'axios';
import moment from 'moment';

// API base URL with fallback
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://mta-dashboard.real-time.work/api/api';

console.log('API Base URL configured as:', API_BASE_URL);

// Create axios instance with retry logic
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
  config => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, 
      config.params ? `params: ${JSON.stringify(config.params)}` : '');
    return config;
  },
  error => {
    console.error('API Request Error:', error.message);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  response => {
    const dataSize = response.data ? 
      (Array.isArray(response.data) ? `Array[${response.data.length}]` : 'Object') : 
      'Empty';
    console.log(`API Response: ${response.status} from ${response.config.url}`, dataSize);
    return response;
  },
  error => {
    if (error.response) {
      // Server responded with an error status code
      console.error(`API Error ${error.response.status}: ${error.response.statusText}`, 
        error.response.config.url);
    } else if (error.request) {
      // Request was made but no response received
      console.error('API Error: No response received', error.request._url || error.config.url);
    } else {
      // Error in setting up the request
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Utility function to safely format dates
export const formatDate = (timestamp, format = 'fromNow') => {
  if (!timestamp) return 'N/A';
  
  try {
    // Handle different timestamp formats
    let momentObj;
    
    if (typeof timestamp === 'number') {
      // If timestamp is in seconds (Unix timestamp), convert to milliseconds
      momentObj = timestamp > 10000000000 ? moment(timestamp) : moment.unix(timestamp);
    } else {
      // Handle string/Date object
      momentObj = moment(timestamp);
    }
      
    if (!momentObj.isValid()) {
      console.warn('Invalid date encountered:', timestamp);
      return 'Invalid date';
    }
    
    if (format === 'fromNow') return momentObj.fromNow();
    return momentObj.format(format);
  } catch (error) {
    console.error('Error formatting date:', error, timestamp);
    return 'Invalid date';
  }
};

// Helper function to handle API errors consistently
const safeApiCall = async (apiPromise, errorMessage, defaultValue) => {
  try {
    const response = await apiPromise;
    return response.data;
  } catch (error) {
    console.error(errorMessage, error);
    return defaultValue;
  }
};

// Define route colors for consistent usage
const LINE_COLORS = {
  // Subway routes
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E', // Red
  '4': '#00933C', '5': '#00933C', '6': '#00933C', // Green
  '7': '#B933AD', // Purple
  'A': '#0039A6', 'C': '#0039A6', 'E': '#0039A6', // Blue
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319', // Orange
  'G': '#6CBE45', // Light Green
  'J': '#996633', 'Z': '#996633', // Brown
  'L': '#A7A9AC', // Grey
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A', // Yellow
  'S': '#808183', // Dark Grey
  'SIR': '#0039A6', // Blue (Staten Island Railway)
  // Bus routes
  'M': '#4D92FB', // Manhattan Bus
  'B': '#F2C75C', // Brooklyn Bus
  'Bx': '#00AF87', // Bronx Bus
  'Q': '#9467BD', // Queens Bus
  'X': '#E60000', // Express Bus 
  'SIM': '#FF9900', // Staten Island Express Bus
};

// Get color for route
const getRouteColor = (route) => {
  if (!route) return '#000000';
  
  // Exact match in colors map
  if (LINE_COLORS[route]) return LINE_COLORS[route];
  
  // Check for bus routes by prefix
  if (route.startsWith('M') && route.length > 1) return LINE_COLORS['M'];
  if (route.startsWith('B') && route.length > 1) return LINE_COLORS['B'];
  if (route.startsWith('Bx')) return LINE_COLORS['Bx'];
  if (route.startsWith('Q') && route.length > 1) return LINE_COLORS['Q'];
  if (route.startsWith('X')) return LINE_COLORS['X'];
  if (route.startsWith('SIM')) return LINE_COLORS['SIM'];
  
  // If first character matches, use that
  const firstChar = route.charAt(0);
  if (LINE_COLORS[firstChar]) return LINE_COLORS[firstChar];
  
  return '#000000';
};

// API endpoints
export const fetchSummaryStats = async () => {
  try {
    console.log('Fetching summary stats...');
    const response = await api.get('/stats/summary');
    
    // Log the raw response for debugging
    console.log('Raw summary stats response:', response.data);
    
    if (!response.data) {
      throw new Error('No data received from API');
    }
    
    // Return with defaults for missing properties
    return {
      total_vehicles: response.data.active_vehicles || 0,
      vehicles_by_line: response.data.vehicles_by_line || {},
      vehicles_by_route: response.data.vehicles_by_route || {},
      current_elevator_outages: response.data.elevator_escalator_stats?.active_outages || 0,
      upcoming_elevator_outages: response.data.elevator_escalator_stats?.upcoming_outages || 0,
      active_alerts: response.data.active_alerts || 0
    };
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    // Return default values on error
    return {
      total_vehicles: 0,
      vehicles_by_line: {},
      vehicles_by_route: {},
      current_elevator_outages: 0,
      upcoming_elevator_outages: 0,
      active_alerts: 0
    };
  }
};

export const fetchVehicles = async (params = {}) => {
  return safeApiCall(
    api.get('/vehicles', { params }),
    'Error fetching vehicles:',
    []
  );
};

export const fetchRouteStats = async () => {
  return safeApiCall(
    api.get('/routes/stats'),
    'Error fetching route stats:',
    []
  );
};

export const fetchAlerts = async (routeId, severity) => {
  try {
    const params = {};
    if (routeId) params.route_id = routeId;
    // Only add severity parameter if it's a non-empty value
    if (severity && severity.trim() !== '') {
      params.severity = severity.toUpperCase();
    }
    
    console.log('Fetching alerts with parameters:', params);
    const response = await api.get('/alerts', { params });
    console.log('Received alert data length:', response.data ? response.data.length : 0);
    
    // Map the response data to match the expected structure in the Alerts component
    if (Array.isArray(response.data)) {
      const mappedAlerts = response.data.map(alert => {
        // Determine severity if not present or unknown
        let alertSeverity = alert.severity || 'MODERATE';
        
        // If severity is not one of the expected values, classify based on content
        if (!['SEVERE', 'MODERATE', 'LOW'].includes(alertSeverity)) {
          const headerText = (alert.header_text || alert.header || '').toLowerCase();
          const descriptionText = (alert.description_text || alert.description || '').toLowerCase();
          
          if (headerText.includes('suspend') || 
              headerText.includes('emergency') || 
              descriptionText.includes('suspend') || 
              descriptionText.includes('emergency') ||
              headerText.includes('closed')) {
            alertSeverity = 'SEVERE';
          } else if (headerText.includes('delay') || 
                    descriptionText.includes('delay') ||
                    headerText.includes('slow') ||
                    descriptionText.includes('slow')) {
            alertSeverity = 'MODERATE';
          } else {
            alertSeverity = 'LOW';
          }
        }
        
        // Ensure severity is consistently uppercase
        alertSeverity = alertSeverity.toUpperCase();
        
        // Determine better alert_type if missing
        let alertType = alert.alert_type;
        if (!alertType || alertType === 'N/A') {
          const headerText = (alert.header_text || alert.header || '').toLowerCase();
          if (headerText.includes('delay')) {
            alertType = 'Delay';
          } else if (headerText.includes('detour')) {
            alertType = 'Detour';
          } else if (headerText.includes('suspend')) {
            alertType = 'Suspension';
          } else if (headerText.includes('work') || headerText.includes('maintenance')) {
            alertType = 'Planned Work';
          } else {
            alertType = 'Service Change';
          }
        }
        
        // Determine better effect if missing
        let alertEffect = alert.effect;
        if (!alertEffect || alertEffect === 'N/A') {
          const headerText = (alert.header_text || alert.header || '').toLowerCase();
          if (headerText.includes('delay')) {
            alertEffect = 'Delays';
          } else if (headerText.includes('skip')) {
            alertEffect = 'Skip-Stop';
          } else if (headerText.includes('local') && headerText.includes('express')) {
            alertEffect = 'Local to Express';
          } else if (headerText.includes('suspend')) {
            alertEffect = 'Suspended';
          } else if (headerText.includes('reduce')) {
            alertEffect = 'Reduced Service';
          } else {
            alertEffect = 'Modified Service';
          }
        }
        
        // Get routes and add colors
        const routes = alert.affected_routes || alert.routes || [];
        const routeColors = {};
        
        // Generate route colors
        routes.forEach(route => {
          routeColors[route] = getRouteColor(route);
        });
        
        return {
          id: alert.id,
          header: alert.header_text || alert.header,
          description: alert.description_text || alert.description,
          severity: alertSeverity,
          alert_type: alertType,
          effect: alertEffect,
          updated: alert.updated_at || alert.updated,
          routes: routes,
          route_colors: routeColors
        };
      });
      
      // Apply severity filter if provided (for extra assurance)
      let filteredAlerts = mappedAlerts;
      if (severity && severity.trim() !== '') {
        const upperSeverity = severity.toUpperCase();
        console.log(`Filtering by severity: ${upperSeverity}`);
        filteredAlerts = mappedAlerts.filter(alert => {
          const matches = alert.severity === upperSeverity;
          if (!matches) {
            console.log(`Alert severity ${alert.severity} doesn't match filter ${upperSeverity}`);
          }
          return matches;
        });
        console.log(`Found ${filteredAlerts.length} alerts with severity ${upperSeverity}`);
      }
        
      return filteredAlerts;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
};

export const fetchElevatorOutages = async (type = 'current', station) => {
  try {
    const params = { type };
    if (station) params.station = station;
    
    const response = await api.get('/elevators/outages', { params });
    
    // If no data or empty array, return empty array
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return [];
    }
    
    // Map the response to match the component's expected structure
    return response.data.map(outage => ({
      station_name: outage.station || outage.station_name,
      equipment_id: outage.equipment_id,
      equipment_type: outage.equipment_type,
      serving: outage.serving,
      outage_start: outage.outage_start ? moment(outage.outage_start) : null,
      outage_end: outage.outage_end ? moment(outage.outage_end) : null,
      reason: outage.reason,
      borough: outage.borough,
      trains: outage.trains || []
    }));
  } catch (error) {
    console.error('Error fetching elevator outages:', error);
    return [];
  }
};

export default api; 