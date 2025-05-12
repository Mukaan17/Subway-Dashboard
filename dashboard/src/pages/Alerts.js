import React, { useState, useEffect } from 'react';
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
  TextField,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Warning as WarningIcon
} from '@mui/icons-material';
import moment from 'moment';

import { fetchAlerts, formatDate } from '../utils/api';

// Severity color mapping
const severityColors = {
  SEVERE: 'error',
  MODERATE: 'warning',
  LOW: 'success'
};

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
  
  // Bus routes by borough
  // Manhattan
  'M': '#4D92FB', // Manhattan Bus
  // Brooklyn
  'B': '#F2C75C', // Brooklyn Bus
  // Bronx
  'Bx': '#00AF87', // Bronx Bus
  // Queens
  'Q': '#9467BD', // Queens Bus
  // Express Bus
  'X': '#E60000', // Express Bus - Red
  // Staten Island Express Bus
  'SIM': '#FF9900', // Staten Island Express Bus - Orange
};

const Alerts = () => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [routeFilter, setRouteFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Available routes for filtering - Add bus routes
  const routes = [
    // Subway routes
    '1', '2', '3', '4', '5', '6', '7', 'A', 'C', 'E', 'B', 'D', 'F', 'M', 'G', 'J', 'Z', 'L', 'N', 'Q', 'R', 'W', 'S',
    // Staten Island Railway
    'SIR',
    // Bus routes - Manhattan
    'M1', 'M2', 'M3', 'M4', 'M5', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12', 'M14', 'M15', 'M20', 'M21', 'M22', 'M23', 
    'M31', 'M34', 'M35', 'M42', 'M50', 'M55', 'M57', 'M60', 'M66', 'M72', 'M79', 'M86', 'M96', 'M98', 'M100', 'M101',
    'M102', 'M103', 'M104', 'M106', 'M116',
    // Bus routes - Brooklyn
    'B1', 'B2', 'B3', 'B4', 'B6', 'B8', 'B9', 'B11', 'B12', 'B13', 'B14', 'B15', 'B16', 'B17', 'B24', 'B25', 'B26',
    'B35', 'B38', 'B41', 'B42', 'B43', 'B44', 'B45', 'B46', 'B47', 'B48', 'B49', 'B52', 'B54', 'B57', 'B60', 'B61',
    'B62', 'B63', 'B64', 'B65', 'B67', 'B68', 'B69',
    // Bus routes - Bronx
    'Bx1', 'Bx2', 'Bx3', 'Bx4', 'Bx5', 'Bx6', 'Bx7', 'Bx8', 'Bx9', 'Bx10', 'Bx11', 'Bx12', 'Bx13', 'Bx15', 'Bx16',
    'Bx17', 'Bx18', 'Bx19', 'Bx20',
    // Bus routes - Queens
    'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11', 'Q12', 'Q13', 'Q15', 'Q16', 'Q17', 'Q18',
    'Q19', 'Q20', 'Q21', 'Q22', 'Q23', 'Q24', 'Q25',
    // Express Bus Routes
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'X9', 'X10', 'X11', 'X12', 'X14', 'X17', 'X19', 'X27', 'X28', 'X30', 'X31', 'X37', 'X38', 'X42', 'X63',
    // Staten Island Express Bus Routes
    'SIM1', 'SIM2', 'SIM3', 'SIM4', 'SIM5', 'SIM6', 'SIM7', 'SIM8', 'SIM9', 'SIM10', 'SIM11', 'SIM15', 'SIM22', 'SIM23', 'SIM24', 'SIM25', 'SIM26', 'SIM30', 'SIM31', 'SIM32', 'SIM33', 'SIM34', 'SIM35'
  ];
  
  // Available severities for filtering
  const severities = ['SEVERE', 'MODERATE', 'LOW'];
  
  // Utility function to determine route type (subway or bus)
  const getRouteType = (route) => {
    if (!route) return 'subway';
    if (route === 'SIR') return 'railway';
    if (route.startsWith('M') && route.length > 1) return 'bus-manhattan';
    if (route.startsWith('B') && route.length > 1) return 'bus-brooklyn';
    if (route.startsWith('Bx')) return 'bus-bronx';
    if (route.startsWith('Q') && route.length > 1) return 'bus-queens';
    if (route.startsWith('X')) return 'bus-express';
    if (route.startsWith('SIM')) return 'bus-staten-island-express';
    return 'subway';
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
    
    return '#000000';
  };
  
  // Fetch alerts data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all alerts without server-side filtering to ensure we can properly filter on client side
        const data = await fetchAlerts(routeFilter, '');
        
        // Ensure all alerts have a valid severity value
        const processedAlerts = data.map(alert => {
          // If alert doesn't have a severity, assign a default based on alert content
          if (!alert.severity || alert.severity === 'UNKNOWN') {
            // Logic to determine severity based on alert content
            if (alert.header && alert.header.toLowerCase().includes('delay')) {
              return { ...alert, severity: 'MODERATE' };
            } else if (alert.header && (
              alert.header.toLowerCase().includes('suspend') || 
              alert.header.toLowerCase().includes('emergency')
            )) {
              return { ...alert, severity: 'SEVERE' };
            } else {
              return { ...alert, severity: 'LOW' };
            }
          }
          return alert;
        });
        
        setAlerts(processedAlerts);
        
        // Apply filters on client side
        let filtered = processedAlerts;
        
        // Apply route filter if provided
        if (routeFilter) {
          filtered = filtered.filter(alert => 
            alert.routes && alert.routes.includes(routeFilter)
          );
        }
        
        // Apply severity filter if provided
        if (severityFilter) {
          filtered = filtered.filter(alert => 
            alert.severity === severityFilter
          );
        }
        
        // Apply text search if provided
        if (searchFilter) {
          const search = searchFilter.toLowerCase();
          filtered = filtered.filter(alert => 
            (alert.header && alert.header.toLowerCase().includes(search)) || 
            (alert.description && alert.description.toLowerCase().includes(search))
          );
        }
        
        console.log('Severity filter:', severityFilter);
        console.log('Filtered alerts count:', filtered.length);
        
        setFilteredAlerts(filtered);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [routeFilter, severityFilter, searchFilter]);
  
  // Handle route filter change
  const handleRouteChange = (event) => {
    setRouteFilter(event.target.value);
  };
  
  // Handle severity filter change
  const handleSeverityChange = (event) => {
    setSeverityFilter(event.target.value);
  };
  
  // Handle search filter change
  const handleSearchChange = (event) => {
    setSearchFilter(event.target.value);
  };
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Service Alerts
      </Typography>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Route</InputLabel>
              <Select
                value={routeFilter}
                label="Route"
                onChange={handleRouteChange}
              >
                <MenuItem value="">All Routes</MenuItem>
                {routes.map((route) => {
                  const routeType = getRouteType(route);
                  let routeLabel = '';
                  
                  // Set appropriate label based on route type
                  switch(routeType) {
                    case 'railway':
                      routeLabel = 'Staten Island Railway';
                      break;
                    case 'bus-manhattan':
                    case 'bus-brooklyn': 
                    case 'bus-bronx':
                    case 'bus-queens':
                      routeLabel = `Bus ${route}`;
                      break;
                    case 'bus-express':
                      routeLabel = `Express Bus ${route}`;
                      break;
                    case 'bus-staten-island-express':
                      routeLabel = `Staten Island Express ${route}`;
                      break;
                    default:
                      routeLabel = `Line ${route}`;
                  }
                  
                  return (
                    <MenuItem key={route} value={route}>
                      <Box display="flex" alignItems="center">
                        <Chip 
                          label={route} 
                          size="small" 
                          sx={{ 
                            mr: 1, 
                            backgroundColor: getRouteColor(route),
                            color: '#FFFFFF'
                          }}
                        />
                        {routeLabel}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={handleSeverityChange}
              >
                <MenuItem value="">All Severities</MenuItem>
                {severities.map((severity) => (
                  <MenuItem key={severity} value={severity}>
                    <Chip 
                      label={severity} 
                      size="small" 
                      color={severityColors[severity] || 'default'}
                      sx={{ mr: 1 }}
                    />
                    {severity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              value={searchFilter}
              onChange={handleSearchChange}
              placeholder="Search alerts..."
            />
          </Grid>
        </Grid>
      </Paper>
      
      {loading && alerts.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box mb={2}>
            <Typography variant="body1">
              Showing {filteredAlerts.length} alerts
              {routeFilter && ` for route ${routeFilter}`}
              {severityFilter && ` with ${severityFilter.toLowerCase()} severity`}
              {searchFilter && ` matching "${searchFilter}"`}
            </Typography>
          </Box>
          
          {filteredAlerts.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <WarningIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">No alerts found</Typography>
              <Typography variant="body1" color="text.secondary">
                Try changing your filters or check back later
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {filteredAlerts.map((alert) => (
                <Grid item xs={12} key={alert.id}>
                  <Card sx={{ mb: 1 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6" component="div">
                          {alert.header}
                        </Typography>
                        <Chip 
                          label={alert.severity} 
                          size="small" 
                          color={severityColors[alert.severity] || 'default'}
                        />
                      </Box>
                      
                      <Box mb={2} display="flex" alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" color="text.secondary" mr={2}>
                          Type: {alert.alert_type || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mr={2}>
                          Effect: {alert.effect || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {alert.updated ? `Updated: ${formatDate(alert.updated)}` : ''}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body1" paragraph>
                        {alert.description}
                      </Typography>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Affected Routes:
                        </Typography>
                        <Box display="flex" flexWrap="wrap">
                          {alert.routes && alert.routes.map(route => (
                            <Chip 
                              key={route} 
                              label={route} 
                              size="small" 
                              sx={{ 
                                mr: 0.5, 
                                mb: 0.5, 
                                backgroundColor: getRouteColor(route), 
                                color: '#FFFFFF' 
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};

export default Alerts; 