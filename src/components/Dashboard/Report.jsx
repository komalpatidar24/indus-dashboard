import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, CircularProgress, Button, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Checkbox, TextField, InputAdornment, Pagination,
    Chip, Menu, MenuItem
} from '@mui/material';
import { Download, Search, ChevronDown } from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import { T, R, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

// Map token names used in this file to the master tokens
const theme = {
    bg:           T.bg,
    surface:      T.surface,
    border:       T.border,
    primary:      T.primary,
    primaryLight: T.primaryLight,
    textMain:     T.text,
    textMuted:    T.textMuted,
    shadow:       SHADOW.sm,
};

const COLUMNS = [
    { label: 'Job Booking No', key: 'JobBookingNo' },
    { label: 'Client Name', key: 'ClientName' },
    { label: 'Job Name', key: 'JobName' },
    { label: 'Machine Name', key: 'MachineName' },
    { label: 'Booking Date', key: 'JobBookingDate' },
    { label: 'Start Time', key: 'ProductionStartTime' },
    { label: 'Days Diff', key: 'DaysDiff' },
    { label: 'Modified Date', key: 'ModifiedDate' },
    { label: 'Employee', key: 'Employee' }
];

export default function Report() {
    // 1. Core State
    const [loading, setLoading] = useState(false);

    // 2. Data & Selection State
    const [data, setData] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [page, setPage] = useState(1);
    const rowsPerPage = 15;
    
    // 3. Filters State
    const [searchQuery, setSearchQuery] = useState("");
    const [columnFilters, setColumnFilters] = useState({
        JobBookingNo: '',
        ClientName: '',
        JobName: '',
        MachineName: '',
        JobBookingDate: '',
        ProductionStartTime: '',
        DaysDiff: '',
        ModifiedDate: '',
        Employee: ''
    });

    // 4. Export Menu State
    const [exportAnchorEl, setExportAnchorEl] = useState(null);

    // Load Data Method from API
    const handleRefreshData = async () => {
        setLoading(true);
        try {
            const companyId = localStorage.getItem("CompanyID");
            const response = await postRequest('GetReport', { CompanyID: companyId });
            
            // FMS API typical mapping logic to extract data array payload
            const fetchedData = Array.isArray(response) ? response : (response?.data || []);
            
            // Re-map with unique IDs dynamically generated from indexing if "id" property sits missing (which usually is from raw sql sets)
            setData(fetchedData.map((item, i) => ({ ...item, id: item.id || `row_${i}` })));
        } catch (error) {
            console.error("Failed to load Report data:", error);
            setData([]);
        } finally {
            setLoading(false);
            setPage(1);
            setSelectedRows([]);
        }
    };

    useEffect(() => {
        handleRefreshData();
    }, []);

    // Helper to format Date for rendering/filtering
    const formatDate = (val) => val ? dayjs(val).format('DD-MM-YYYY') : '';

    // Process Data (Search + Filter)
    const processedData = useMemo(() => {
        return data.filter(row => {
            // Check global search query across all values
            const matchSearch = Object.values(row).some(v => 
                String(v).toLowerCase().includes(searchQuery.toLowerCase())
            );

            // Check inline column filters
            const matchColumns = COLUMNS.every(col => {
                const filterText = columnFilters[col.key];
                if (!filterText) return true; // No filter text applied for this column

                let cellValue = row[col.key];
                // Apply the same date formatting used in UI before comparing
                if (['JobBookingDate', 'ProductionStartTime', 'ModifiedDate'].includes(col.key)) {
                    cellValue = formatDate(cellValue);
                }

                return String(cellValue).toLowerCase().includes(filterText.toLowerCase());
            });
            
            return matchSearch && matchColumns;
        });
    }, [data, searchQuery, columnFilters]);

    // Paginate Data
    const paginatedData = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return processedData.slice(start, start + rowsPerPage);
    }, [processedData, page]);

    // Export Logic
    const exportCSV = (exportData, title) => {
        if (!exportData.length) return;
        
        // Exclude the 'id' field from CSV output
        const keys = Object.keys(exportData[0]).filter(k => k !== 'id');
        
        const csv = [
            keys.join(','),
            ...exportData.map(r => keys.map(k => {
                // Keep the exact exported date format looking identical to table UI
                let val = r[k] || '';
                if (['JobBookingDate', 'ProductionStartTime', 'ModifiedDate'].includes(k)) {
                    val = formatDate(val);
                }
                return `"${val}"`;
            }).join(','))
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${title}.csv`;
        link.click();
    };

    return (
        <Box sx={{ bgcolor: theme.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Component */}
            <DashboardHeader 
                title="Report" 
                loading={loading} 
                onRefresh={handleRefreshData}
                lastUpdated={dayjs().format('hh:mm A')}
            />

            <Box sx={{ mt: 3, width: '100%', px: { xs: 0, md: 1.5 }, flex: 1, display: 'flex', flexDirection: 'column', pb: 2 }}>
                
                {/* Clean Actions Toolbar */}
                <Box sx={{ px: 1.5, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
                    
                    {/* Left side: Global Search */}
                    <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Quick search across all columns..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{ bgcolor: theme.surface, width: { xs: '100%', md: 350 }, borderRadius: 1 }}
                            InputProps={{ 
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={18} color={theme.textMuted} />
                                    </InputAdornment>
                                ) 
                            }}
                        />
                    </Box>

                    {/* Right side: Single Export Dropdown Button */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            onClick={(e) => setExportAnchorEl(e.currentTarget)}
                            startIcon={<Download size={16}/>}
                            endIcon={<ChevronDown size={16}/>}
                            sx={{ bgcolor: theme.primary }}
                        >
                            Export
                        </Button>
                        <Menu
                            anchorEl={exportAnchorEl}
                            open={Boolean(exportAnchorEl)}
                            onClose={() => setExportAnchorEl(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <MenuItem 
                                disabled={!selectedRows.length}
                                onClick={() => {
                                    exportCSV(processedData.filter(d => selectedRows.includes(d.id)), 'Report_Selected');
                                    setExportAnchorEl(null);
                                }}
                            >
                                Export Selected ({selectedRows.length})
                            </MenuItem>
                            <MenuItem 
                                onClick={() => {
                                    exportCSV(processedData, 'Report_All');
                                    setExportAnchorEl(null);
                                }}
                            >
                                Export All Data
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>

                {/* Table Component */}
                <Paper sx={{ borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`, borderRadius: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TableContainer sx={{ flex: 1, bgcolor: theme.surface }}>
                        <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
                            <TableHead>
                                {/* Main Header Row */}
                                <TableRow>
                                    <TableCell padding="checkbox" sx={{ bgcolor: theme.surface, borderBottom: `2px solid ${theme.border}` }}>
                                        <Checkbox 
                                            checked={processedData.length > 0 && selectedRows.length === processedData.length}
                                            onChange={(e) => setSelectedRows(e.target.checked ? processedData.map(d => d.id) : [])}
                                            color="primary"
                                        />
                                    </TableCell>
                                    {COLUMNS.map(col => (
                                        <TableCell 
                                            key={col.key} 
                                            sx={{ 
                                                bgcolor: theme.surface, 
                                                fontWeight: 700, 
                                                color: theme.textMuted,
                                                borderBottom: `2px solid ${theme.border}`,
                                                textTransform: 'uppercase',
                                                fontSize: '0.75rem',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                                
                                {/* Inline Filter Row (Directly Below Headers) */}
                                <TableRow>
                                    <TableCell sx={{ bgcolor: theme.bg, py: 1, borderBottom: `1px solid ${theme.border}` }} />
                                    {COLUMNS.map(col => (
                                        <TableCell key={`filter-${col.key}`} sx={{ bgcolor: theme.bg, py: 1, px: 1, borderBottom: `1px solid ${theme.border}` }}>
                                            <TextField
                                                size="small"
                                                variant="outlined"
                                                placeholder={`Filter ${col.label}...`}
                                                value={columnFilters[col.key]}
                                                onChange={(e) => setColumnFilters({ ...columnFilters, [col.key]: e.target.value })}
                                                sx={{ 
                                                    minWidth: '110px', 
                                                    bgcolor: theme.surface, 
                                                    borderRadius: 1,
                                                    '& .MuiInputBase-input': { 
                                                        py: '6px', px: '8px', fontSize: '0.8rem' 
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center">
                                            <CircularProgress sx={{ my: 4 }} size={30} />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                                            <Typography color={theme.textMuted}>No data matches your filters.</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedData.map(row => (
                                        <TableRow 
                                            key={row.id} 
                                            hover 
                                            selected={selectedRows.includes(row.id)}
                                            sx={{ '&:hover': { bgcolor: theme.bg } }}
                                        >
                                            <TableCell padding="checkbox" sx={{ borderBottom: `1px solid ${theme.border}` }}>
                                                <Checkbox 
                                                    checked={selectedRows.includes(row.id)}
                                                    onChange={() => setSelectedRows(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])}
                                                    color="primary"
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, fontWeight: 700, color: theme.primary, whiteSpace: 'nowrap' }}>
                                                {row.JobBookingNo}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>{row.ClientName}</TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>{row.JobName}</TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}` }}>
                                                <Chip label={row.MachineName} size="small" sx={{ fontWeight: 600, bgcolor: theme.bg }} />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>
                                                {formatDate(row.JobBookingDate)}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>
                                                {formatDate(row.ProductionStartTime)}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, color: row.DaysDiff > 5 ? 'error.main' : row.DaysDiff > 3 ? 'warning.main' : 'success.main', fontWeight: 'bold', textAlign: 'center' }}>
                                                {row.DaysDiff}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>
                                                {formatDate(row.ModifiedDate)}
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: `1px solid ${theme.border}`, whiteSpace: 'nowrap' }}>{row.Employee}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Footer Pagination */}
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: theme.surface }}>
                        <Typography color={theme.textMuted} fontSize="0.85rem">
                            Showing {processedData.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, processedData.length)} of {processedData.length} entries
                        </Typography>
                        <Pagination 
                            count={Math.ceil(processedData.length / rowsPerPage)} 
                            page={page} 
                            onChange={(e, v) => setPage(v)} 
                            shape="rounded" 
                            color="primary" 
                        />
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
