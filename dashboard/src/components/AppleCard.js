import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';

/**
 * An Apple-inspired card component with frosted glass effect
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.iconColor - Icon color
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.sx - Additional style props
 * @param {boolean} props.hoverable - Whether the card should have hover effects
 * @param {boolean} props.gradient - Whether to add a subtle gradient
 * @param {Function} props.onClick - Click handler
 */
const AppleCard = ({ 
  title, 
  icon, 
  iconColor, 
  children, 
  sx = {}, 
  hoverable = true,
  gradient = false,
  onClick,
  ...rest 
}) => {
  const theme = useTheme();
  
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        backgroundColor: 'background.paper',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': hoverable ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        } : {},
        ...sx
      }}
      {...rest}
    >
      {/* Optional gradient overlay */}
      {gradient && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'linear-gradient(to bottom right, rgba(255,255,255,0.1), rgba(255,255,255,0))',
            zIndex: 0,
          }}
        />
      )}
      
      {/* Card content */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        {/* Card header with title and icon */}
        {title && (
          <Box display="flex" alignItems="center" p={2} pb={1}>
            {icon && (
              <Box sx={{ mr: 1.5, color: iconColor || 'primary.main' }}>
                {icon}
              </Box>
            )}
            <Typography variant="h6" fontWeight={600} color="text.primary">
              {title}
            </Typography>
          </Box>
        )}
        
        {/* Card content */}
        <Box p={title ? 2 : 0} pt={title ? 0 : 2}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppleCard; 