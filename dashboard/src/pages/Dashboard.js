import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Grid, 
  Typography, 
  Button,
  CircularProgress,
  Chip,
  Container,
  Divider,
  Alert,
  useTheme
} from '@mui/material';
import {
  DirectionsSubway as SubwayIcon,
  Warning as AlertIcon,
  Accessible as AccessibleIcon,
  TrendingUp as TrendingUpIcon,
  MoreHoriz as MoreHorizIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { fetchSummaryStats, fetchRouteStats, fetchAlerts, fetchElevatorOutages, formatDate } from '../utils/api';
import AppleCard from '../components/AppleCard';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const StatCard = ({ title, value, icon, color, onClick }) => (
  <AppleCard
    title={title}
    icon={icon}
    iconColor={color}
    onClick={onClick}
    gradient
    sx={{ height: '100%' }}
  >
    <Typography 
      variant="h3" 
      component="div" 
      align="center" 
      sx={{ 
        my: 2, 
        fontWeight: 700,
        background: `linear-gradient(135deg, ${color}, ${color}CC)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      {value}
    </Typography>
    
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
      <Button 
        endIcon={<ArrowForwardIcon />}
        sx={{ 
          textTransform: 'none', 
          fontWeight: 600, 
          color: color,
          '&:hover': {
            backgroundColor: `${color}10`,
          }
        }}
      >
        View Details
      </Button>
    </Box>
  </AppleCard>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [routeStats, setRouteStats] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [elevatorOutages, setElevatorOutages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Dashboard: Starting to fetch data...');
        setLoading(true);
        setError(null);
        
        // Fetch all required data in parallel
        const [summaryStats, routeStatsData, alertsData, elevatorData] = await Promise.all([
          fetchSummaryStats(),
          fetchRouteStats().catch(err => {
            console.error('Error fetching route stats:', err);
            return [];
          }),
          fetchAlerts().catch(err => {
            console.error('Error fetching alerts:', err);
            return [];
          }),
          fetchElevatorOutages().catch(err => {
            console.error('Error fetching elevator outages:', err);
            return [];
          })
        ]);
        
        console.log('Dashboard: All data fetched successfully');
        console.log('Summary Stats:', summaryStats);
        console.log('Route Stats:', routeStatsData);
        console.log('Alerts:', alertsData);
        console.log('Elevator Outages:', elevatorData);
        
        setStats(summaryStats);
        setRouteStats(Array.isArray(routeStatsData) ? routeStatsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
        setElevatorOutages(Array.isArray(elevatorData) ? elevatorData : []);
      } catch (error) {
        console.error('Dashboard: Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again later.');
        // Set default data if there was an error
        if (!stats) {
          setStats({
            total_vehicles: 0,
            vehicles_by_line: {},
            vehicles_by_route: {},
            current_elevator_outages: 0,
            upcoming_elevator_outages: 0,
            active_alerts: 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      console.log('Dashboard: Refreshing data...');
      fetchData();
    }, 60000); // Refresh every minute

    return () => clearInterval(intervalId);
  }, []);

  const getChartData = () => {
    // Format chart data...
    // Make sure routeStats is an array and not empty
    if (!Array.isArray(routeStats) || routeStats.length === 0) {
      console.log('Dashboard: No route stats data for chart');
      return {
        labels: [],
        datasets: [{
          label: 'Active Vehicles',
          data: [],
          backgroundColor: [],
        }]
      };
    }
    
    console.log('Dashboard: Preparing chart data from routeStats:', routeStats);
    
    // Sort route stats by count in descending order and take top 10
    const sortedRoutes = [...routeStats].sort((a, b) => b.count - a.count).slice(0, 10);
    
    console.log('Dashboard: Top 10 sorted routes:', sortedRoutes);
    
    // Group similar routes or assign more meaningful labels
    const formattedRoutes = sortedRoutes.map(route => {
      const routeId = route._id;
      
      // Handle unknown/missing route IDs
      if (!routeId || routeId === 'Unknown') {
        // Check if there are any patterns in the data that could help identify the route type
        if (route.line_id && route.line_id !== 'Unknown') {
          return { ...route, _id: `${route.line_id} Line` };
        }
        
        // For truly unidentified routes, use a more specific term
        return { ...route, _id: 'Non-revenue' };
      }
      
      // Handle special route types
      if (routeId === 'SIR') {
        return { ...route, _id: 'Staten Island Railway' };
      }
      
      // Format SIM or X bus routes to be more readable in the chart
      if (routeId.startsWith('SIM')) {
        return { ...route, _id: `SIM ${routeId.substring(3)}` };
      }
      
      return route;
    });
    
    // MTA line colors for the chart
    const lineColors = {
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
      'M': '#4D92FB', // Manhattan Bus (prefix for M1, M2, etc.)
      'B': '#F2C75C', // Brooklyn Bus (prefix for B1, B2, etc.)
      'Bx': '#00AF87', // Bronx Bus (prefix for Bx1, Bx2, etc.)
      'Q': '#9467BD', // Queens Bus (prefix for Q1, Q2, etc.)
      'X': '#E60000', // Express Bus (prefix for X1, X2, etc.)
      'SIM': '#FF9900', // Staten Island Express Bus
    };

    return {
      labels: formattedRoutes.map(route => route._id),
      datasets: [{
        label: 'Active Vehicles',
        data: formattedRoutes.map(route => route.count || 0),
        backgroundColor: formattedRoutes.map(route => {
          // Try to get color by route ID
          const color = lineColors[route._id];
          if (color) return color;
          
          // If not found but the ID starts with a prefix that has a color, use that
          const routeId = route._id || '';
          if (routeId.startsWith('M') && routeId.length > 1) return lineColors['M'];
          if (routeId.startsWith('B') && routeId.length > 1) return lineColors['B'];
          if (routeId.startsWith('Bx')) return lineColors['Bx'];
          if (routeId.startsWith('Q') && routeId.length > 1) return lineColors['Q'];
          if (routeId.startsWith('X')) return lineColors['X'];
          if (routeId.startsWith('SIM')) return lineColors['SIM'];
          
          // If still not found, try the first character
          const firstChar = routeId.charAt(0);
          if (lineColors[firstChar]) return lineColors[firstChar];
          
          // Default fallback color
          return '#007AFF';
        }),
        borderRadius: 6,
        maxBarThickness: 35,
      }]
    };
  };

  const getChartOptions = () => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.secondary,
          borderColor: 'rgba(0, 0, 0, 0.05)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            labelTextColor: (context) => theme.palette.text.secondary
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            drawBorder: false,
          },
          ticks: {
            color: theme.palette.text.secondary,
            font: {
              family: theme.typography.fontFamily,
              size: 12,
              weight: '500',
            },
          },
        },
        y: {
          grid: {
            drawBorder: false,
            color: 'rgba(0, 0, 0, 0.05)',
            lineWidth: 1,
          },
          ticks: {
            color: theme.palette.text.secondary,
            font: {
              family: theme.typography.fontFamily,
              size: 12,
              weight: '500',
            },
            padding: 10,
          },
        },
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart',
      },
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress size={60} sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ 
            borderRadius: 3, 
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            mb: 2 
          }}
        >
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary">
          Real-Time MTA Alerts Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Real-time monitoring of MTA subway system
        </Typography>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Vehicles" 
            value={stats?.total_vehicles || 0} 
            icon={<SubwayIcon />} 
            color={theme.palette.primary.main}
            onClick={() => navigate('/vehicles')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Active Alerts" 
            value={stats?.active_alerts || 0} 
            icon={<AlertIcon />}
            color="#FF3B30"
            onClick={() => navigate('/alerts')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Elevator Outages" 
            value={stats?.current_elevator_outages || 0} 
            icon={<AccessibleIcon />} 
            color="#FF9500"
            onClick={() => navigate('/elevators')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Routes" 
            value={routeStats.length} 
            icon={<TrendingUpIcon />} 
            color="#34C759"
            onClick={() => navigate('/vehicles')}
          />
        </Grid>
      </Grid>

      {/* Chart Section */}
      <AppleCard 
        title="Active Vehicles by Route" 
        icon={<TrendingUpIcon />}
        sx={{ mb: 4, p: 0 }}
        hoverable={false}
      >
        <Box sx={{ height: 400, p: 2, pt: 0 }}>
          <Bar data={getChartData()} options={getChartOptions()} height={400} />
        </Box>
      </AppleCard>

      {/* Recent Alerts */}
      <AppleCard title="Recent Alerts" icon={<AlertIcon />} iconColor="#FF3B30" sx={{ mb: 4 }}>
        {alerts.length > 0 ? (
          <>
            <Box>
              {alerts.slice(0, 5).map((alert, index) => (
                <Box key={alert._id || index} sx={{ mb: 2, pb: 2, borderBottom: index < 4 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {alert.header || 'Service Alert'}
                    </Typography>
                    <Chip 
                      label={alert.severity || 'MODERATE'} 
                      size="small" 
                      color={
                        alert.severity === 'SEVERE' ? 'error' :
                        alert.severity === 'MODERATE' ? 'warning' :
                        alert.severity === 'LOW' ? 'success' :
                        'default'
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {alert.description?.length > 120 
                      ? `${alert.description.substring(0, 120)}...` 
                      : alert.description || 'No description available.'}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(alert.created_at) || 'Unknown date'}
                    </Typography>
                    <Box>
                      {alert.routes?.map(line => {
                        // Get color based on line
                        let bgColor = '#555555'; // Default color
                        
                        // MTA line colors
                        const lineColors = {
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
                        };
                        
                        if (lineColors[line]) {
                          bgColor = lineColors[line];
                        }
                        
                        return (
                          <Chip 
                            key={line} 
                            label={line} 
                            size="small" 
                            sx={{ 
                              ml: 0.5, 
                              minWidth: 32, 
                              height: 24,
                              bgcolor: bgColor,
                              color: ['N', 'Q', 'R', 'W'].includes(line) ? '#000' : '#FFF'
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button 
                variant="text" 
                color="primary" 
                onClick={() => navigate('/alerts')}
                endIcon={<ArrowForwardIcon />}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                View All Alerts
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No active alerts at this time
            </Typography>
          </Box>
        )}
      </AppleCard>
    </Container>
  );
};

export default Dashboard; 