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
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination
} from '@mui/material';
import {
  Accessible as AccessibleIcon,
  EscalatorWarning as EscalatorIcon
} from '@mui/icons-material';
import moment from 'moment';

import { fetchElevatorOutages, formatDate } from '../utils/api';

const Elevators = () => {
  const [loading, setLoading] = useState(true);
  const [outages, setOutages] = useState([]);
  const [filteredOutages, setFilteredOutages] = useState([]);
  const [outageType, setOutageType] = useState('current');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Sorting state
  const [orderBy, setOrderBy] = useState('station_name');
  const [order, setOrder] = useState('asc');
  
  // Equipment types for filtering
  const equipmentTypes = ['ELEVATOR', 'ESCALATOR'];
  
  // Fetch outage data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchElevatorOutages(outageType, stationFilter);
        setOutages(data);
        
        // Apply filters
        let filtered = data;
        
        // Filter by equipment type
        if (equipmentFilter) {
          filtered = filtered.filter(outage => outage.equipment_type === equipmentFilter);
        }
        
        // Apply text search if provided
        if (searchFilter) {
          const search = searchFilter.toLowerCase();
          filtered = filtered.filter(outage => 
            outage.station_name.toLowerCase().includes(search) || 
            outage.serving.toLowerCase().includes(search) ||
            outage.reason.toLowerCase().includes(search)
          );
        }
        
        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
          const aValue = a[orderBy];
          const bValue = b[orderBy];
          
          if (order === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
          }
        });
        
        setFilteredOutages(filtered);
      } catch (error) {
        console.error('Error fetching elevator outages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    
    return () => clearInterval(interval);
  }, [outageType, equipmentFilter, stationFilter, searchFilter, orderBy, order]);
  
  // Handle outage type change
  const handleOutageTypeChange = (event, newValue) => {
    setOutageType(newValue);
    setPage(0); // Reset pagination when changing type
  };
  
  // Handle equipment filter change
  const handleEquipmentChange = (event) => {
    setEquipmentFilter(event.target.value);
    setPage(0); // Reset pagination when changing filter
  };
  
  // Handle station filter change
  const handleStationChange = (event) => {
    setStationFilter(event.target.value);
    setPage(0); // Reset pagination when changing filter
  };
  
  // Handle search filter change
  const handleSearchChange = (event) => {
    setSearchFilter(event.target.value);
    setPage(0); // Reset pagination when searching
  };
  
  // Handle sort request
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Create sort handler
  const createSortHandler = (property) => () => {
    handleRequestSort(property);
  };
  
  // Table headers
  const headCells = [
    { id: 'station_name', label: 'Station' },
    { id: 'equipment_type', label: 'Type' },
    { id: 'serving', label: 'Serving' },
    { id: 'reason', label: 'Reason' },
    { id: 'outage_start', label: 'Start Date' },
    { id: 'outage_end', label: 'End Date' },
    { id: 'status', label: 'Status' }
  ];
  
  // Get stations for filtering (derived from actual data)
  const stations = [...new Set(outages.map(outage => outage.station_name))].sort();
  
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Elevator & Escalator Outages
      </Typography>
      
      {/* Outage Type Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={outageType}
          onChange={handleOutageTypeChange}
          aria-label="outage type tabs"
          variant="fullWidth"
        >
          <Tab 
            icon={<AccessibleIcon />} 
            iconPosition="start" 
            label="Current Outages" 
            value="current" 
          />
          <Tab 
            icon={<EscalatorIcon />} 
            iconPosition="start" 
            label="Upcoming Outages" 
            value="upcoming" 
          />
        </Tabs>
      </Paper>
      
      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Equipment Type</InputLabel>
              <Select
                value={equipmentFilter}
                label="Equipment Type"
                onChange={handleEquipmentChange}
              >
                <MenuItem value="">All Equipment</MenuItem>
                {equipmentTypes.map((type) => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Station</InputLabel>
              <Select
                value={stationFilter}
                label="Station"
                onChange={handleStationChange}
              >
                <MenuItem value="">All Stations</MenuItem>
                {stations.map((station) => (
                  <MenuItem key={station} value={station}>{station}</MenuItem>
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
              placeholder="Search outages..."
            />
          </Grid>
        </Grid>
      </Paper>
      
      {loading && outages.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1">
              Showing {Math.min(rowsPerPage, filteredOutages.length)} of {filteredOutages.length} outages
              {equipmentFilter && ` for ${equipmentFilter.toLowerCase()}`}
              {stationFilter && ` at ${stationFilter}`}
              {searchFilter && ` matching "${searchFilter}"`}
            </Typography>
            
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => {
                setEquipmentFilter('');
                setStationFilter('');
                setSearchFilter('');
              }}
            >
              Clear Filters
            </Button>
          </Box>
          
          {filteredOutages.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <EscalatorIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6">No outages found</Typography>
              <Typography variant="body1" color="text.secondary">
                Try changing your filters or check back later
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader aria-label="outages table">
                  <TableHead>
                    <TableRow>
                      {headCells.map((headCell) => (
                        <TableCell
                          key={headCell.id}
                          sortDirection={orderBy === headCell.id ? order : false}
                        >
                          <TableSortLabel
                            active={orderBy === headCell.id}
                            direction={orderBy === headCell.id ? order : 'asc'}
                            onClick={createSortHandler(headCell.id)}
                          >
                            {headCell.label}
                          </TableSortLabel>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredOutages
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((outage, index) => (
                        <TableRow
                          hover
                          key={index}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                        >
                          <TableCell>{outage.station_name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={outage.equipment_type} 
                              size="small" 
                              color={outage.equipment_type === 'ELEVATOR' ? 'primary' : 'secondary'}
                              icon={outage.equipment_type === 'ELEVATOR' ? <AccessibleIcon /> : <EscalatorIcon />}
                            />
                          </TableCell>
                          <TableCell>{outage.serving}</TableCell>
                          <TableCell>{outage.reason}</TableCell>
                          <TableCell>
                            {formatDate(outage.outage_start, 'MMM DD, YYYY h:mm A')}
                          </TableCell>
                          <TableCell>
                            {outage.outage_end ? formatDate(outage.outage_end, 'MMM DD, YYYY h:mm A') : 'Indefinite'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={outage.status} 
                              size="small" 
                              color={outage.status === 'OUT_OF_SERVICE' ? 'error' : 'warning'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredOutages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default Elevators; 