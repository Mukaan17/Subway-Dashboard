import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Box, 
  CssBaseline,
  Toolbar, 
  Typography,
  useTheme,
  Avatar,
  IconButton,
  Container
} from '@mui/material';
import { SubwayOutlined as SubwayIcon } from '@mui/icons-material';
import { ThemeContext } from '../App';
import FloatingDock from './FloatingDock';

function Layout({ children }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useContext(ThemeContext);
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    console.log('Layout mounted, current path:', location.pathname);
    
    // Update time every minute
    const timer = setInterval(() => {
      setTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, [location.pathname]);

  // Format the time in a more readable way
  const formatTime = () => {
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return time.toLocaleDateString('en-US', options);
  };

  // Find the current page title based on the active path
  const getCurrentPageTitle = () => {
    const menuItems = [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Vehicles', path: '/vehicles' },
      { text: 'Alerts', path: '/alerts' },
      { text: 'Elevators', path: '/elevators' },
    ];
    
    const isPathActive = (menuPath) => {
      if (location.pathname === '/' && menuPath === '/dashboard') {
        return true;
      }
      return location.pathname === menuPath;
    };
    
    const activeItem = menuItems.find(item => isPathActive(item.path));
    return activeItem ? activeItem.text : 'Real-Time MTA Alerts Dashboard';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default', 
      minHeight: '100vh',
      width: '100%' 
    }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          width: '100%',
          backdropFilter: 'blur(10px)',
          backgroundColor: theme.palette.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.8)' 
            : 'rgba(30, 30, 30, 0.8)',
          borderBottom: theme.palette.mode === 'light'
            ? '1px solid rgba(0, 0, 0, 0.05)'
            : '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ justifyContent: 'space-between', px: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                component="div"
                onClick={() => navigate('/dashboard')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    mr: 2,
                    boxShadow: '0 4px 8px rgba(0, 57, 166, 0.25)'
                  }}
                >
                  <SubwayIcon />
                </Box>
                <Typography 
                  variant="h6" 
                  noWrap 
                  component="div"
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.primary',
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  Real-Time MTA Alerts Dashboard
                </Typography>
              </Box>
            </Box>
            
            {/* Current Page Title - show on mobile */}
            <Typography 
              variant="h6" 
              noWrap 
              component="div"
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                display: { xs: 'block', sm: 'none' }
              }}
            >
              {getCurrentPageTitle()}
            </Typography>
            
            {/* Time and Date */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {formatTime()}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
                {formatDate()}
              </Typography>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          pt: 11,
          pb: 10, // Add padding at the bottom for the dock
          width: '100%',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ 
            borderRadius: 4,
            overflow: 'hidden',
            py: 3,
            px: 2
          }}>
            {children}
          </Box>
        </Container>
      </Box>
      
      {/* Floating Dock Navigation */}
      <FloatingDock />
    </Box>
  );
}

export default Layout; 