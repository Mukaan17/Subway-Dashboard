import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress,
  Chip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import moment from 'moment';

import { fetchVehicles, formatDate } from '../utils/api';

// Route color mapping
const routeColors = {
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

// Get color for route display
const getRouteColor = (route) => {
  if (!route) return '#000000';
  
  // Exact match in colors map
  if (routeColors[route]) return routeColors[route];
  
  // Check for bus routes by prefix
  if (route.startsWith('M') && route.length > 1) return routeColors['M'];
  if (route.startsWith('B') && route.length > 1) return routeColors['B'];
  if (route.startsWith('Bx')) return routeColors['Bx'];
  if (route.startsWith('Q') && route.length > 1) return routeColors['Q'];
  if (route.startsWith('X')) return routeColors['X'];
  if (route.startsWith('SIM')) return routeColors['SIM'];
  
  // If first character matches, use that
  const firstChar = route.charAt(0);
  if (routeColors[firstChar]) return routeColors[firstChar];
  
  return '#000000';
};

// Create custom subway icon for map markers
const getSubwayIcon = (route) => {
  const color = getRouteColor(route);
  
  return L.divIcon({
    className: 'custom-subway-icon',
    html: `<div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${route}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Determine if a route is a bus route based on its ID
const isBusRoute = (route) => {
  if (!route) return false;
  
  return (route.startsWith('M') && route.length > 1) || 
         (route.startsWith('B') && route.length > 1) || 
         route.startsWith('Bx') || 
         (route.startsWith('Q') && route.length > 1) ||
         route.startsWith('X') ||
         route.startsWith('SIM');
};

// Create appropriate vehicle icon based on route type
const getVehicleIcon = (route) => {
  const color = getRouteColor(route);
  
  // Use rectangle shape for buses, circle for subway/rail
  if (isBusRoute(route)) {
    return L.divIcon({
      className: 'custom-bus-icon',
      html: `<div style="background-color: ${color}; color: white; width: 24px; height: 18px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${route}</div>`,
      iconSize: [24, 18],
      iconAnchor: [12, 9]
    });
  } else {
    // Use circle for subway/rail routes
    return L.divIcon({
      className: 'custom-subway-icon',
      html: `<div style="background-color: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${route}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }
};

// Map centering component
const MapUpdater = ({ vehicles }) => {
  const map = useMap();
  
  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      // Create bounds based on all vehicle positions
      const bounds = L.latLngBounds(
        vehicles
          .filter(v => v.position && v.position.latitude && v.position.longitude)
          .map(v => [v.position.latitude, v.position.longitude])
      );
      
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [vehicles, map]);
  
  return null;
};

const Vehicles = () => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [view, setView] = useState('map');
  const [lineFilter, setLineFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Define subway lines with their respective routes
  const subwayLines = [
    { id: 'IRT', name: 'IRT Lines (1,2,3,4,5,6,7)', routes: ['1', '2', '3', '4', '5', '6', '7'] },
    { id: 'IND', name: 'IND Lines (A,C,E,B,D,F,M)', routes: ['A', 'C', 'E', 'B', 'D', 'F', 'M'] },
    { id: 'BMT', name: 'BMT Lines (L,N,Q,R,W,J,Z)', routes: ['L', 'N', 'Q', 'R', 'W', 'J', 'Z'] },
    { id: 'S', name: 'Shuttle Lines (S)', routes: ['S'] },
    { id: 'SIR', name: 'Staten Island Railway', routes: ['SIR'] },
    { id: 'BUS', name: 'Bus Routes', routes: [] },
    { id: 'EXPRESS', name: 'Express Bus Routes', routes: [] },
    { id: 'SIMEXPRESS', name: 'Staten Island Express Buses', routes: [] }
  ];
  
  // Fetch vehicle data
  const fetchVehicleData = async () => {
    try {
      console.log('Fetching vehicle data with filters:', { lineFilter, routeFilter });
      setLoading(true);
      
      // Determine which routes to request based on the line filter
      let routeParams = routeFilter;
      let requestParams = {};
      
      if (lineFilter && !routeFilter) {
        // If a line is selected but no specific route, get all routes for that line
        const selectedLine = subwayLines.find(line => line.id === lineFilter);
        
        if (selectedLine) {
          if (selectedLine.routes && selectedLine.routes.length > 0) {
            // Use predefined routes if available
            routeParams = '';
          } else if (selectedLine.id === 'BUS') {
            // For buses, we should get all bus routes (M, B, Bx, Q)
            // This will be handled server-side
            requestParams.route_type = 'bus';
          } else if (selectedLine.id === 'EXPRESS') {
            // For express buses (X)
            requestParams.route_type = 'xbus';
          } else if (selectedLine.id === 'SIMEXPRESS') {
            // For Staten Island express buses (SIM)
            requestParams.route_type = 'simbus';
          }
        }
      }
      
      if (routeParams) {
        requestParams.route_id = routeParams;
      }
      
      // Fetch data from API with the appropriate parameters
      const data = await fetchVehicles(requestParams);
      console.log('Received vehicle data:', data.length, 'vehicles');
      setVehicles(data);
      
      // Get list of available routes for the selected line
      if (lineFilter && !routeFilter && data.length > 0) {
        const routesInData = [...new Set(data.map(v => v.route_id))].sort();
        setAvailableRoutes(routesInData);
      }
      
      // Apply filtering
      let filtered = data;
      
      // Additional client-side filtering if needed
      if (lineFilter === 'BUS') {
        filtered = data.filter(vehicle => {
          const route = vehicle.route_id;
          return (route.startsWith('M') && route.length > 1) || 
                 (route.startsWith('B') && route.length > 1) || 
                 route.startsWith('Bx') || 
                 (route.startsWith('Q') && route.length > 1);
        });
      } else if (lineFilter === 'EXPRESS') {
        filtered = data.filter(vehicle => vehicle.route_id.startsWith('X'));
      } else if (lineFilter === 'SIMEXPRESS') {
        filtered = data.filter(vehicle => vehicle.route_id.startsWith('SIM'));
      }
      
      console.log('Filtered to', filtered.length, 'vehicles');
      setFilteredVehicles(filtered);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchVehicleData();
    
    // Set up polling for real-time updates
    intervalRef.current = setInterval(fetchVehicleData, 15000); // Refresh every 15 seconds
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lineFilter, routeFilter]);
  
  // Handle line filter change
  const handleLineChange = (event) => {
    setLineFilter(event.target.value);
    setRouteFilter(''); // Reset route filter when line changes
    setAvailableRoutes([]);
  };
  
  // Handle route filter change
  const handleRouteChange = (event) => {
    setRouteFilter(event.target.value);
  };
  
  // Handle view change
  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };
  
  // Default map center (NYC)
  const defaultCenter = [40.7128, -74.0060];
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
        Real-time Vehicle Tracking
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Subway Line</InputLabel>
              <Select
                value={lineFilter}
                label="Subway Line"
                onChange={handleLineChange}
              >
                <MenuItem value="">All Lines</MenuItem>
                {subwayLines.map((line) => (
                  <MenuItem key={line.id} value={line.id}>{line.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={!lineFilter}>
              <InputLabel>Route</InputLabel>
              <Select
                value={routeFilter}
                label="Route"
                onChange={handleRouteChange}
              >
                <MenuItem value="">All Routes</MenuItem>
                {availableRoutes.map((route) => (
                  <MenuItem key={route} value={route}>{route}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={handleViewChange}
              aria-label="view mode"
              fullWidth
            >
              <ToggleButton value="map" aria-label="map view">
                Map
              </ToggleButton>
              <ToggleButton value="list" aria-label="list view">
                List
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>
      
      {loading && vehicles.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box mb={2}>
            <Typography variant="body1">
              Showing {filteredVehicles.length} vehicles
              {lineFilter && ` for line ${lineFilter}`}
              {routeFilter && ` and route ${routeFilter}`}
            </Typography>
          </Box>
          
          {view === 'map' ? (
            <Paper sx={{ height: '70vh', width: '100%' }}>
              <MapContainer
                center={defaultCenter}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {filteredVehicles
                  .filter(v => v.position && v.position.latitude && v.position.longitude)
                  .map((vehicle) => (
                    <Marker
                      key={vehicle.id}
                      position={[vehicle.position.latitude, vehicle.position.longitude]}
                      icon={getVehicleIcon(vehicle.route_id)}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle1">
                            <strong>Route: </strong>
                            <Chip 
                              label={vehicle.route_id} 
                              size="small" 
                              sx={{ 
                                ml: 1,
                                backgroundColor: getRouteColor(vehicle.route_id),
                                color: '#FFFFFF'
                              }}
                            />
                          </Typography>
                          <Typography variant="body2">
                            <strong>Trip ID:</strong> {vehicle.trip_id}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Vehicle ID:</strong> {vehicle.vehicle_id || 'N/A'}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Status:</strong> {
                              vehicle.current_status === 0 ? 'Incoming at' :
                              vehicle.current_status === 1 ? 'Stopped at' :
                              vehicle.current_status === 2 ? 'In transit to' : 'Unknown'
                            } {vehicle.stop_id}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Updated:</strong> {formatDate(vehicle.timestamp)}
                          </Typography>
                        </Box>
                      </Popup>
                    </Marker>
                  ))}
                
                <MapUpdater vehicles={filteredVehicles} />
              </MapContainer>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2}>
                {filteredVehicles.slice(0, 20).map((vehicle) => (
                  <Grid item xs={12} md={6} lg={4} key={vehicle.id}>
                    <Paper elevation={3} sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Chip 
                          label={vehicle.route_id} 
                          size="small" 
                          sx={{ 
                            backgroundColor: getRouteColor(vehicle.route_id),
                            color: '#FFFFFF'
                          }}
                        />
                        <Typography variant="caption">
                          {formatDate(vehicle.timestamp)}
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        <strong>Trip ID:</strong> {vehicle.trip_id}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Vehicle ID:</strong> {vehicle.vehicle_id || 'N/A'}
                      </Typography>
                      {vehicle.position && (
                        <Typography variant="body2">
                          <strong>Position:</strong> {vehicle.position.latitude.toFixed(5)}, {vehicle.position.longitude.toFixed(5)}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>Status:</strong> {
                          vehicle.current_status === 0 ? 'Incoming at' :
                          vehicle.current_status === 1 ? 'Stopped at' :
                          vehicle.current_status === 2 ? 'In transit to' : 'Unknown'
                        } {vehicle.stop_id}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default Vehicles;
