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
  TablePagination,
  InputAdornment
} from '@mui/material';
import {
  AccessibleForward as AccessibleIcon,
  EscalatorWarning as EscalatorIcon,
  Search as SearchIcon
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
        console.log('Fetched elevator outage data:', data);
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
            (outage.station_name || '').toLowerCase().includes(search) || 
            (outage.serving || '').toLowerCase().includes(search) ||
            (outage.reason || '').toLowerCase().includes(search)
          );
        }
        
        // Apply sorting
        filtered = [...filtered].sort((a, b) => {
          // Handle potentially missing values safely
          const aValue = a[orderBy] || '';
          const bValue = b[orderBy] || '';
          
          if (order === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
          }
        });
        
        console.log('Filtered and sorted outages:', filtered.slice(0, 5));
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
      <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
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
              variant="outlined"
              value={searchFilter}
              onChange={handleSearchChange}
              placeholder="Search by station, reason, etc."
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Results */}
      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
          <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading outage data...
            </Typography>
        </Box>
        ) : filteredOutages.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No elevator or escalator outages found.
            </Typography>
          </Box>
          ) : (
          <>
            <TableContainer>
              <Table>
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
                        key={outage.equipment_id + index}
                          hover
                        >
                          <TableCell>{outage.station_name}</TableCell>
                          <TableCell>
                          {outage.equipment_type === 'ELEVATOR' ? (
                            <AccessibleIcon color="primary" />
                          ) : (
                            <EscalatorIcon color="secondary" />
                          )}
                          {' ' + outage.equipment_type}
                          </TableCell>
                          <TableCell>{outage.serving}</TableCell>
                          <TableCell>{outage.reason}</TableCell>
                          <TableCell>
                          {outage.outage_start ? formatDate(outage.outage_start, 'MMM D, YYYY') : 'N/A'}
                          </TableCell>
                          <TableCell>
                          {outage.outage_end ? formatDate(outage.outage_end, 'MMM D, YYYY') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                            label={outageType === 'current' ? 'Out of Service' : 'Planned'}
                            color={outageType === 'current' ? 'error' : 'warning'}
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={filteredOutages.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
        </>
      )}
      </Paper>
    </Box>
  );
};

export default Elevators; 