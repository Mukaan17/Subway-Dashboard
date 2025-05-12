import React, { useContext } from 'react';
import { 
  Box, 
  Paper, 
  IconButton, 
  Tooltip, 
  Zoom,
  useTheme
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  DirectionsSubway as SubwayIcon,
  Warning as AlertIcon,
  Accessible as AccessibleIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import { ThemeContext } from '../App';

const FloatingDock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { toggleTheme, mode } = useContext(ThemeContext);
  
  // Navigation items
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: <DashboardIcon fontSize="medium" /> 
    },
    { 
      path: '/vehicles', 
      label: 'Vehicles', 
      icon: <SubwayIcon fontSize="medium" /> 
    },
    { 
      path: '/alerts', 
      label: 'Alerts', 
      icon: <AlertIcon fontSize="medium" /> 
    },
    { 
      path: '/elevators', 
      label: 'Elevators', 
      icon: <AccessibleIcon fontSize="medium" /> 
    },
  ];
  
  // Helper to determine if a path is active
  const isPathActive = (path) => {
    if (location.pathname === '/' && path === '/dashboard') {
      return true;
    }
    return location.pathname === path;
  };
  
  // Function to handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
  };
  
  return (
    <Box
      className="floating-dock"
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        width: 'auto',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          borderRadius: 30,
          padding: '10px 12px',
          backdropFilter: 'blur(20px)',
          backgroundColor: theme.palette.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(30, 30, 30, 0.8)',
          boxShadow: theme.palette.mode === 'light'
            ? '0 10px 30px rgba(0, 0, 0, 0.1)'
            : '0 10px 30px rgba(0, 0, 0, 0.3)',
          border: theme.palette.mode === 'light'
            ? '1px solid rgba(255, 255, 255, 0.6)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }}
      >
        {/* Navigation Icons */}
        {navItems.map((item) => {
          const active = isPathActive(item.path);
          return (
            <Tooltip 
              key={item.path} 
              title={item.label}
              placement="top"
              TransitionComponent={Zoom}
              arrow
            >
              <IconButton
                onClick={() => navigate(item.path)}
                sx={{
                  color: active 
                    ? 'primary.main' 
                    : 'text.secondary',
                  backgroundColor: active 
                    ? theme.palette.mode === 'light'
                      ? 'rgba(0, 57, 166, 0.1)'
                      : 'rgba(0, 57, 166, 0.2)'
                    : 'transparent',
                  mx: 0.5,
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'light'
                      ? 'rgba(0, 57, 166, 0.15)'
                      : 'rgba(0, 57, 166, 0.25)',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
        
        {/* Divider */}
        <Box 
          sx={{ 
            width: '1px', 
            height: 24, 
            alignSelf: 'center',
            mx: 1,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.1)'
              : 'rgba(255, 255, 255, 0.1)'
          }} 
        />
        
        {/* Theme Toggle */}
        <Tooltip 
          title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          placement="top"
          TransitionComponent={Zoom}
          arrow
        >
          <IconButton
            onClick={handleThemeToggle}
            sx={{
              color: 'text.secondary',
              mx: 0.5,
              '&:hover': {
                backgroundColor: theme.palette.mode === 'light'
                  ? 'rgba(0, 0, 0, 0.04)'
                  : 'rgba(255, 255, 255, 0.04)',
              },
            }}
          >
            {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
};

export default FloatingDock; 