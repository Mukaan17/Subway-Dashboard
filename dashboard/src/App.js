import React, { Suspense, lazy, useEffect, createContext, useMemo, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';

// Layout components
import Layout from './components/Layout';

// Pages (with lazy loading)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Elevators = lazy(() => import('./pages/Elevators'));

// Create ThemeContext for mode toggle
export const ThemeContext = createContext({ toggleTheme: () => {}, mode: 'light' });

function App() {
  const [mode, setMode] = useState('light');

  // Toggle theme function
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Update body class when theme changes
  useEffect(() => {
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [mode]);

  // Create MTA-inspired theme with Apple design style
  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: {
        main: '#0039A6', // MTA Blue
        light: mode === 'light' ? '#4D78CA' : '#0050E6',
        dark: mode === 'light' ? '#002D80' : '#002D80',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FF6319', // MTA Orange
        light: mode === 'light' ? '#FF8552' : '#FF8552',
        dark: mode === 'light' ? '#CC4B00' : '#CC4B00',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#6CBE45', // MTA Green
      },
      error: {
        main: '#EE352E', // MTA Red
      },
      warning: {
        main: '#FCCC0A', // MTA Yellow
        contrastText: '#000000',
      },
      info: {
        main: '#00AEEF', // MTA Light Blue
      },
      background: {
        default: mode === 'light' ? '#F5F5F7' : '#111111',
        paper: mode === 'light' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(30, 30, 30, 0.85)',
      },
      text: {
        primary: mode === 'light' ? '#1D1D1F' : '#FFFFFF',
        secondary: mode === 'light' ? '#86868B' : '#ABABAF',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        'SF Pro Display',
        'SF Pro Text',
        'Helvetica Neue',
        'Helvetica',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontWeight: 700,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 500,
        fontSize: '1rem',
      },
      body1: {
        fontSize: '1rem',
      },
      button: {
        textTransform: 'none', // Apple buttons don't use uppercase
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12, // Apple uses rounded corners
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 20px',
            boxShadow: 'none',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            backdropFilter: 'blur(10px)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            backdropFilter: 'blur(10px)',
            backgroundColor: mode === 'light' 
              ? 'rgba(255, 255, 255, 0.8)' 
              : 'rgba(30, 30, 30, 0.8)',
            borderBottom: mode === 'light'
              ? '1px solid rgba(0, 0, 0, 0.05)'
              : '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: mode === 'light' 
              ? 'rgba(255, 255, 255, 0.8)' 
              : 'rgba(30, 30, 30, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRight: mode === 'light'
              ? '1px solid rgba(0, 0, 0, 0.05)'
              : '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            margin: '4px 8px',
            '&.Mui-selected': {
              backgroundColor: mode === 'light'
                ? 'rgba(0, 57, 166, 0.1)'
                : 'rgba(0, 57, 166, 0.2)',
              '&:hover': {
                backgroundColor: mode === 'light'
                  ? 'rgba(0, 57, 166, 0.15)'
                  : 'rgba(0, 57, 166, 0.25)',
              },
            },
          },
        },
      },
    },
  }), [mode]);

  // Loading component with Apple-inspired design
  const LoadingFallback = () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" flexDirection="column">
      <CircularProgress size={60} color="primary" />
      <Typography variant="h6" sx={{ mt: 2, color: theme.palette.text.secondary }}>Loading Subway Dash...</Typography>
    </Box>
  );

  // Error Boundary component
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      console.error('Error caught in ErrorBoundary:', error);
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error('React error boundary caught an error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <Box p={3}>
            <Alert severity="error" sx={{ mb: 2, borderRadius: theme.shape.borderRadius }}>
              Something went wrong. Please try refreshing the page.
            </Alert>
            <details style={{ whiteSpace: 'pre-wrap' }}>
              {this.state.error && this.state.error.toString()}
            </details>
          </Box>
        );
      }

      return this.props.children;
    }
  }

  // Simple component to render at the root path
  const Home = () => {
    useEffect(() => {
      console.log('Home component mounted, redirecting to Dashboard');
    }, []);
    
    return <Navigate to="/dashboard" replace />;
  };

  console.log('App component rendering...');
  
  useEffect(() => {
    console.log('App component mounted');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('API URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');
  }, []);
  
  const themeContextValue = useMemo(() => ({ toggleTheme, mode }), [mode]);
  
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <Router>
            <Layout>
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/elevators" element={<Elevators />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export default App; 