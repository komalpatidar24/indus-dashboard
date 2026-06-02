import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Box,
    Typography,
    Snackbar,
    Alert,
    Tooltip,
    CircularProgress,
    keyframes,
    Dialog,
    IconButton,
    TextField,
    InputAdornment,
    Chip,
} from '@mui/material';
import {
    Layers,
    Activity,
    AlertCircle,
    Settings,
    TrendingUp,
    TrendingDown,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    AlertTriangle,
    Clock,
    BarChart2,
    Gauge,
    Zap,
    Info,
    Download,
    Search,
    Filter,
    X as XIcon,
    Calendar,
} from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(32px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const chartSlide = keyframes`
  from { opacity: 0; transform: translateY(40px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const shimmerKf = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;
const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const iconPop = keyframes`
  0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; }
  65%  { transform: scale(1.14) rotate(4deg); }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
`;
const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
const topBarSlide = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const scanLine = keyframes`
  0%   { transform: translateY(-100%); opacity: 0; }
  30%  { opacity: 0.5; }
  100% { transform: translateY(400%);  opacity: 0; }
`;

const injectStyles = () => {
    if (document.getElementById('pd-animations')) return;
    const s = document.createElement('style');
    s.id = 'pd-animations';
    s.textContent = `
        @keyframes pd-fadein  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pd-scalein { from { opacity:0; transform:scale(0.95); }     to { opacity:1; transform:scale(1); }     }
        .pd-fade  { animation: pd-fadein  0.42s ease both; }
        .pd-scale { animation: pd-scalein 0.32s ease both; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; transition: background 0.2s; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `;
    document.head.appendChild(s);
};

const smartFmt = (v) => {
    const n = parseFloat(v);
    if (isNaN(n) || n === null || n === undefined) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e7) return (n / 1e7).toFixed(2) + 'Cr';
    if (abs >= 1e5) return (n / 1e5).toFixed(2) + 'L';
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toFixed(0);
};

const fmt = (v) => smartFmt(v);
const shortFmt = (v) => smartFmt(v);
const axisFmt = (v) => {
    const n = parseFloat(v) || 0;
    const abs = Math.abs(n);
    if (abs >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
    if (abs >= 1e5) return (n / 1e5).toFixed(1) + 'L';
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'K';
    return String(n);
};
const GetDate = () => dayjs().format('YYYY-MM-DD');


const Shimmer = ({ width = 90, height = 24, mt = 0, radius = "6px" }) => (
    <Box sx={{
        width, height, mt, borderRadius: radius,
        background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%", animation: `${shimmerKf} 1.6s infinite`,
    }} />
);

const ChartOverlay = ({ loading }) => loading ? (
    <Box sx={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", bgcolor: "rgba(255,255,255,0.75)",
        borderRadius: T.radius, zIndex: 4, backdropFilter: "blur(8px)",
        animation: `${fadeIn} 0.2s ease`,
    }}>
        <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={30} thickness={3.5} sx={{ color: T.primary }} />
            <CircularProgress size={18} thickness={5} sx={{ color: T.amber, position: "absolute", animation: `${gradientShift} 1.5s ease infinite` }} />
        </Box>
    </Box>
) : null;

const PROD_COLUMNS = [
    { field: 'JobBookingNo', label: 'Job No' },
    { field: 'JobCardContentNo', label: 'Content No' },
    { field: 'JobName', label: 'Job Name' },
    { field: 'FromTime', label: 'From Time' },
    { field: 'ToTime', label: 'To Time' },
    { field: 'ItemName', label: 'Item Name' },
    { field: 'ClientName', label: 'Client' },
    { field: 'ProductionUnitName', label: 'Unit' },
    { field: 'MachineName', label: 'Machine' },
    { field: 'DepartmentName', label: 'Department' },
    { field: 'OrderQuantity', label: 'Order Qty' },
    { field: 'ProductionQuantity', label: 'Produced' },
    { field: 'WastageQuantity', label: 'Wastage' },
    { field: 'Status', label: 'Status' },
    { field: 'EndUnit', label: 'End Unit' },
];

const JOB_COLUMNS = [
    { field: 'SalesOrderNo', label: 'Sales Order' },
    { field: 'JobBookingNo', label: 'Job No' },
    { field: 'JobBookingDate', label: 'Booking Date' },
    { field: 'LedgerName', label: 'Client' },
    { field: 'CategoryName', label: 'Category' },
    { field: 'JobName', label: 'Job Name' },
    { field: 'OrderQuantity', label: 'Order Qty' },
    { field: 'ExpectedDeliveryDate', label: 'Expected Delivery' },
    { field: 'JobStatus', label: 'Status' },
];

const UTIL_COLUMNS = [
    { field: 'MachineName', label: 'Machine' },
    { field: 'TotalProductionMinutes', label: 'Production Mins' },
    { field: 'TotalBreakdownMinutes', label: 'Breakdown Mins' },
    { field: 'TotalShiftWorkingMinutes', label: 'Working Mins' },
    { field: 'Utilisation', label: 'Utilisation %', aggregate: 'avg' },
];

const DOWNTIME_COLUMNS = [
    { field: 'MachineName', label: 'Machine' },
    { field: 'MakeReadyMinutes', label: 'Make Ready Mins' },
    { field: 'MechanicalMinutes', label: 'Mechanical Mins' },
    { field: 'ElectricalMinutes', label: 'Electrical Mins' },
    { field: 'OperationalMinutes', label: 'Operational Mins' },
    { field: 'MaintenanceMinutes', label: 'Maintenance Mins' },
    { field: 'TotalDowntimeMinutes', label: 'Total Downtime Mins' },
];

const BREAKDOWN_COLUMNS = [
    { field: 'MachineName', label: 'Machine' },
    { field: 'BreakDownDate', label: 'Date' },
    { field: 'BreakDownTypeName', label: 'Type' },
    { field: 'TypeOfWork', label: 'Work Type' },
    { field: 'ReportedBy', label: 'Reported By' },
    { field: 'StartTime', label: 'Start Time' },
    { field: 'EndTime', label: 'End Time' },
    { field: 'MachineStatus', label: 'Status' },
    { field: 'BreakDownNo', label: 'BD No' },
];

const LOAD_COLUMNS = [
    { field: 'MachineId', label: 'Machine ID' },
    { field: 'MachineName', label: 'Machine' },
    { field: 'Shift', label: 'Shift' },
    { field: 'Capacityperday', label: 'Capacity/Day' },
    { field: 'Days', label: 'Days' },
    { field: 'TotalDaysProductionQuantity', label: 'Total Capacity' },
    { field: 'NoOfJobs', label: 'Jobs' },
    { field: 'ProductionQuantity', label: 'Produced' },
    { field: 'LoadPercent', label: 'Load %', aggregate: 'avg' },
];

const DetailModal = ({ open, onClose, title, columns, rows, loading, fromDate, toDate }) => {
    const [search, setSearch] = useState('');
    const [sortField, setSortField] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [groupByField, setGroupByField] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        if (!open) { setSearch(''); setSortField(null); setSortDir('asc'); setPage(1); setPageSize(15); setGroupByField(null); }
    }, [open]);

    useEffect(() => { setPage(1); }, [search, sortField, sortDir, pageSize]);

    const fyLabel = useMemo(() => {
        if (!fromDate) return null;
        const yr = parseInt(fromDate.substring(0, 4), 10);
        return `FY ${yr}-${yr + 1}`;
    }, [fromDate]);

    const filtered = useMemo(() => {
        let result = rows;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(row => columns.some(col => String(row[col.field] ?? '').toLowerCase().includes(q)));
        }
        if (sortField) {
            result = [...result].sort((a, b) => {
                const av = a[sortField] ?? '', bv = b[sortField] ?? '';
                const an = parseFloat(av), bn = parseFloat(bv);
                if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
                return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
            });
        }
        return result;
    }, [rows, search, sortField, sortDir, columns]);

    const flatList = useMemo(() => {
        if (!groupByField) return filtered;
        const map = new Map();
        filtered.forEach(r => {
            const k = String(r[groupByField] ?? '—');
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(r);
        });
        const out = [];
        map.forEach((rows, k) => {
            out.push({ _grp: true, _key: groupByField, _label: k, _count: rows.length });
            rows.forEach(r => out.push(r));
        });
        return out;
    }, [filtered, groupByField]);

    const totalPages = Math.max(1, Math.ceil(flatList.length / pageSize));
    const pageRows = flatList.slice((page - 1) * pageSize, page * pageSize);

    const totals = useMemo(() => {
        const t = {};
        columns.forEach(col => {
            const vals = filtered.map(r => {
                const v = r[col.field];
                if (v == null || v === '') return NaN;
                const str = String(v).trim();
                if (!/^-?\d+(\.\d+)?$/.test(str)) return NaN;
                return parseFloat(str);
            }).filter(v => !isNaN(v));
            if (vals.length > 0) {
                t[col.field] = col.aggregate === 'avg'
                    ? vals.reduce((a, b) => a + b, 0) / vals.length
                    : vals.reduce((a, b) => a + b, 0);
            }
        });
        return t;
    }, [filtered, columns]);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const handleDownload = () => {
        const headers = columns.map(c => c.label).join(',');
        const csvRows = filtered.map(row =>
            columns.map(col => `"${String(row[col.field] ?? '').replace(/"/g, '""')}"`).join(',')
        );
        const csv = [headers, ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
        if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, '...', page - 1, page, page + 1, '...', totalPages];
    };

    const hasTotals = Object.keys(totals).length > 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth
            PaperProps={{ sx: { borderRadius: { xs: 0, sm: '16px' }, overflow: 'hidden', m: { xs: 0, sm: 2 }, maxHeight: { xs: '100dvh', sm: '90vh' } } }}>
            {/* Header */}
            <Box sx={{ bgcolor: '#0f172a', px: 3, py: 1.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
                    <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem' }}>
                        Detailed View:{' '}
                        <Box component="span" sx={{ color: '#22d3ee' }}>{title}</Box>
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small"
                    sx={{ color: '#94a3b8', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
                    <XIcon size={16} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ p: 2.5, bgcolor: '#fff' }}>
                {/* Filter chips + download + search */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
                    {fyLabel && (
                        <Chip icon={<Calendar size={11} style={{ marginLeft: 6 }} />} label={fyLabel} size="small"
                            onDelete={onClose} deleteIcon={<XIcon size={11} />}
                            sx={{ bgcolor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.72rem', fontWeight: 600, '& .MuiChip-deleteIcon': { color: '#2563eb' } }} />
                    )}
                    {fromDate && toDate && (
                        <Chip icon={<Calendar size={11} style={{ marginLeft: 6 }} />} label={`${fromDate} → ${toDate}`} size="small"
                            sx={{ bgcolor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.72rem', fontWeight: 600 }} />
                    )}
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" onClick={handleDownload}
                        sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: 0.7, '&:hover': { bgcolor: '#f8fafc' } }}>
                        <Download size={15} color="#64748b" />
                    </IconButton>
                    <TextField size="small" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search size={13} color="#94a3b8" /></InputAdornment>, sx: { borderRadius: '8px', fontSize: '0.78rem' } }}
                        sx={{ width: 200 }} />
                </Box>

                {/* Group-by drop zone */}
                <Box
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.getData('colField'); if (f) setGroupByField(f); setDragOver(false); setPage(1); }}
                    sx={{
                        border: `1.5px dashed ${dragOver ? '#2e86ab' : '#e2e8f0'}`,
                        borderRadius: '8px', py: 0.9, px: 2, mb: 1.5,
                        bgcolor: dragOver ? '#f0f8ff' : 'transparent',
                        display: 'flex', alignItems: 'center', gap: 1,
                        transition: 'all 0.2s',
                    }}
                >
                    <Filter size={12} color={dragOver ? '#2e86ab' : '#cbd5e1'} />
                    {groupByField ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.73rem', color: '#334155', fontWeight: 600 }}>
                            Grouped by: <strong style={{ color: '#0f172a' }}>{columns.find(c => c.field === groupByField)?.label ?? groupByField}</strong>
                            <Box component="span" onClick={() => { setGroupByField(null); setPage(1); }}
                                sx={{ ml: 1, cursor: 'pointer', color: '#ef4444', fontWeight: 800, fontSize: '0.8rem' }}>✕</Box>
                        </Box>
                    ) : (
                        <Typography sx={{ color: '#94a3b8', fontSize: '0.73rem' }}>Drag a column header here to group</Typography>
                    )}
                </Box>

                {/* Table wrapper */}
                <Box sx={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                <CircularProgress size={30} />
                            </Box>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.77rem' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                        {columns.map(col => (
                                            <th key={col.field}
                                                draggable
                                                onDragStart={e => e.dataTransfer.setData('colField', col.field)}
                                                onClick={() => handleSort(col.field)} style={{
                                                    padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                                                    color: sortField === col.field ? '#2563eb' : '#475569',
                                                    borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap',
                                                    fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    cursor: 'grab', userSelect: 'none',
                                                    background: sortField === col.field ? '#eff6ff' : '#f8fafc',
                                                }}>
                                                {col.label}{' '}
                                                <span style={{ color: sortField === col.field ? '#2563eb' : '#cbd5e1', fontSize: '0.62rem' }}>
                                                    {sortField === col.field ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '0.82rem' }}>
                                                No data found
                                            </td>
                                        </tr>
                                    ) : pageRows.map((row, i) => {
                                        if (row._grp) return (
                                            <tr key={`g${i}`}>
                                                <td colSpan={columns.length} style={{ padding: '8px 14px', background: '#f1f5f9', borderTop: i > 0 ? '2px solid #e2e8f0' : 'none', borderBottom: '1px solid #e2e8f0' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e86ab', flexShrink: 0 }} />
                                                        <Typography sx={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                                                            {columns.find(c => c.field === row._key)?.label ?? row._key}:
                                                            <Box component="span" sx={{ color: '#2e86ab', ml: 0.5 }}>{row._label}</Box>
                                                        </Typography>
                                                        <Box sx={{ ml: 'auto', bgcolor: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700, px: 1, py: '2px', borderRadius: '5px' }}>
                                                            {row._count} rows
                                                        </Box>
                                                    </Box>
                                                </td>
                                            </tr>
                                        );
                                        return (
                                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                                {columns.map(col => (
                                                    <td key={col.field} style={{ padding: '9px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                                                        {row[col.field] ?? '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {hasTotals && filtered.length > 0 && !groupByField && (
                                    <tfoot>
                                        <tr style={{ background: '#1e293b' }}>
                                            {columns.map((col, ci) => (
                                                <td key={col.field} style={{
                                                    padding: '10px 14px', whiteSpace: 'nowrap', fontWeight: 700,
                                                    fontSize: '0.75rem', borderTop: '2px solid #334155',
                                                    color: totals[col.field] != null ? '#22d3ee' : (ci === 0 ? '#f1f5f9' : 'transparent'),
                                                }}>
                                                    {ci === 0 ? 'TOTAL' : totals[col.field] != null
                                                        ? totals[col.field].toLocaleString('en-IN', { maximumFractionDigits: 2 })
                                                        : ''}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        )}
                    </Box>

                    {/* Pagination bar */}
                    {!loading && filtered.length > 0 && (
                        <Box sx={{ bgcolor: '#fff', borderTop: '1px solid #e2e8f0', px: 2, py: 1.2, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {/* Page size buttons */}
                            {[15, 30, 50].map(s => (
                                <Box key={s} onClick={() => setPageSize(s)} sx={{
                                    width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                    bgcolor: pageSize === s ? '#1e293b' : 'transparent',
                                    color: pageSize === s ? '#fff' : '#64748b',
                                    border: pageSize === s ? '1px solid #1e293b' : '1px solid #e2e8f0',
                                    transition: 'all 0.15s',
                                    '&:hover': { bgcolor: pageSize === s ? '#0f172a' : '#f1f5f9' },
                                }}>{s}</Box>
                            ))}

                            <Box sx={{ flex: 1, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                                    Page {page} of {totalPages} ({filtered.length} items)
                                </Typography>
                            </Box>

                            {/* Page navigation */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <Box onClick={() => setPage(p => Math.max(1, p - 1))} sx={{
                                    width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', cursor: page === 1 ? 'default' : 'pointer',
                                    color: page === 1 ? '#cbd5e1' : '#475569',
                                    '&:hover': { bgcolor: page > 1 ? '#f1f5f9' : 'transparent' },
                                }}>«</Box>

                                {getPageNumbers().map((pg, i) => (
                                    <Box key={i} onClick={() => typeof pg === 'number' && setPage(pg)} sx={{
                                        minWidth: 28, height: 28, px: 0.5, borderRadius: '6px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: pg === page ? 700 : 400,
                                        cursor: typeof pg === 'number' ? 'pointer' : 'default',
                                        bgcolor: pg === page ? '#1e293b' : 'transparent',
                                        color: pg === page ? '#fff' : typeof pg === 'number' ? '#475569' : '#94a3b8',
                                        transition: 'all 0.15s',
                                        '&:hover': { bgcolor: typeof pg === 'number' && pg !== page ? '#f1f5f9' : undefined },
                                    }}>{pg}</Box>
                                ))}

                                <Box onClick={() => setPage(p => Math.min(totalPages, p + 1))} sx={{
                                    width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.8rem', cursor: page === totalPages ? 'default' : 'pointer',
                                    color: page === totalPages ? '#cbd5e1' : '#475569',
                                    '&:hover': { bgcolor: page < totalPages ? '#f1f5f9' : 'transparent' },
                                }}>»</Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

const KpiCard = ({ title, value, suffix = '', color = '#6366f1', icon: Icon, animDelay = 0, onInfoClick, compact = false }) => {
    const [hovered, setHovered] = useState(false);
    const accent = color;
    const bg = `${color}18`;
    const display = useMemo(() => {
        if (value == null) return "—";
        return fmt(value);
    }, [value]);
    const rawVal = (value !== null && value !== undefined && !isNaN(parseFloat(value)))
        ? parseFloat(value).toLocaleString('en-IN') + suffix : null;
    const delayS = animDelay / 1000;

    return (
        <Tooltip
            placement="top"
            arrow
            disableHoverListener={!rawVal}
            title={rawVal ? (
                <Box sx={{ textAlign: 'center', px: 0.5 }}>
                    <Typography sx={{
                        fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.1em', opacity: 0.75, mb: 0.6, color: 'inherit', lineHeight: 1,
                    }}>
                        {title}
                    </Typography>
                    <Typography sx={{
                        fontSize: '1.35rem', fontWeight: 800, fontFamily: T.fontMono,
                        letterSpacing: '-0.6px', color: 'inherit', lineHeight: 1,
                    }}>
                        {rawVal}
                    </Typography>
                </Box>
            ) : ''}
            componentsProps={{
                tooltip: {
                    sx: {
                        background: `linear-gradient(135deg, #0f172a 0%, ${accent}dd 100%)`,
                        color: '#ffffff',
                        borderRadius: '14px',
                        px: 2.5,
                        py: 1.6,
                        minWidth: 110,
                        boxShadow: `0 16px 40px ${accent}45, 0 4px 16px rgba(0,0,0,0.25)`,
                        border: `1px solid ${accent}70`,
                        backdropFilter: 'blur(10px)',
                    },
                },
                arrow: {
                    sx: { color: accent },
                },
            }}
        >
            <Box
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                sx={{
                    borderRadius: compact ? "14px" : "20px", overflow: "hidden",
                    p: compact ? "10px 10px 8px 12px" : { xs: "16px 16px 14px 18px", sm: "20px 20px 17px 22px" },
                    display: "flex", flexDirection: "column",
                    position: "relative", cursor: "default",
                    willChange: "transform, box-shadow",
                    background: hovered
                        ? `linear-gradient(150deg, #ffffff 0%, ${accent}09 100%)`
                        : `linear-gradient(150deg, #ffffff 0%, #f5f7fb 100%)`,
                    border: `1.5px solid ${hovered ? accent + "50" : T.border}`,
                    boxShadow: hovered
                        ? `0 22px 48px -8px ${accent}30, 0 6px 20px rgba(15,23,42,0.10), 0 0 0 4px ${accent}0e`
                        : `0 2px 0px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.05)`,
                    transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
                    transition: [
                        "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                        "box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1)",
                        "border-color 0.28s ease", "background 0.28s ease",
                    ].join(", "),
                    animation: `${fadeUp} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delayS}s both`,
                }}
            >
                <Box sx={{
                    position: "absolute", top: 0, left: 0, bottom: 0,
                    width: hovered ? "4px" : "3px",
                    background: `linear-gradient(180deg, ${accent} 0%, ${accent}60 100%)`,
                    borderRadius: "20px 0 0 20px",
                    boxShadow: hovered ? `3px 0 16px ${accent}60` : `2px 0 8px ${accent}30`,
                    transition: "width 0.25s ease, box-shadow 0.28s ease",
                }} />
                <Box sx={{
                    position: "absolute", top: 0, right: 0, width: 80, height: 80,
                    borderRadius: "0 20px 0 80%",
                    background: `linear-gradient(135deg, ${accent}08 0%, transparent 65%)`,
                    pointerEvents: "none", opacity: hovered ? 1.6 : 1, transition: "opacity 0.28s",
                }} />
                {hovered && (
                    <Box sx={{
                        position: "absolute", top: 0, left: 0, right: 0, height: "35%",
                        background: `linear-gradient(180deg, ${accent}0f 0%, transparent 100%)`,
                        pointerEvents: "none", zIndex: 0,
                        animation: `${scanLine} 1.1s ease forwards`, borderRadius: "20px 20px 0 0",
                    }} />
                )}
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: compact ? 0.8 : 1.5 }}>
                    <Box sx={{
                        width: compact ? 28 : { xs: 40, sm: 46 }, height: compact ? 28 : { xs: 40, sm: 46 },
                        borderRadius: compact ? "8px" : "13px", display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, position: "relative", bgcolor: bg,
                        border: `1.5px solid ${accent}${hovered ? "55" : "28"}`,
                        boxShadow: hovered ? `0 0 0 7px ${accent}12, 0 6px 18px ${accent}35` : `0 2px 8px ${accent}22, inset 0 1px 0 ${accent}15`,
                        transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
                        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.25s",
                        animation: `${iconPop} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delayS + 0.15}s both`,
                    }}>
                        {Icon && <Icon size={compact ? 13 : 19} color={color} strokeWidth={2.1} />}
                        {!compact && <Box sx={{ position: "absolute", top: "6px", left: "6px", width: 6, height: 6, borderRadius: "50%", bgcolor: "#ffffff", opacity: 0.55, pointerEvents: "none" }} />}
                    </Box>
                    {!compact && (
                        <Box
                            onClick={(e) => { e.stopPropagation(); onInfoClick && onInfoClick(); }}
                            sx={{
                                width: 22, height: 22, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                bgcolor: `${accent}18`, border: `1.5px solid ${accent}35`,
                                color: accent, opacity: hovered ? 1 : 0.7,
                                transition: "opacity 0.25s ease, transform 0.2s ease",
                                cursor: "pointer",
                                '&:hover': { transform: 'scale(1.15)', opacity: 1 },
                            }}>
                            <Info size={13} strokeWidth={2.2} />
                        </Box>
                    )}
                </Box>
                {/* Value */}
                <Typography sx={{
                    fontSize: compact ? "1.05rem" : { xs: "1.5rem", sm: "1.7rem" }, fontWeight: 800,
                    color: hovered ? accent : T.text, letterSpacing: "-0.9px",
                    fontFamily: T.fontMono, lineHeight: 1, mb: compact ? 0.4 : 0.65,
                    transition: "color 0.28s ease",
                    animation: `${countUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delayS + 0.22}s both`,
                }}>
                    {display}{display !== '—' && suffix ? <Box component="span" sx={{ fontSize: "0.85rem", ml: 0.3, fontWeight: 700, color: T.textFaint }}>{suffix}</Box> : null}
                </Typography>
                {/* Divider + label */}
                <Box sx={{
                    width: "100%", height: "1px",
                    background: `linear-gradient(90deg, ${accent}${hovered ? "30" : "18"} 0%, transparent 70%)`,
                    mb: compact ? 0.4 : 0.85, transition: "background 0.28s ease",
                }} />
                <Typography sx={{
                    fontSize: compact ? "0.52rem" : { xs: "0.6rem", sm: "0.64rem" }, fontWeight: 700,
                    color: hovered ? T.textMuted : T.textFaint, textTransform: "uppercase",
                    letterSpacing: "0.07em", lineHeight: 1.2, transition: "color 0.25s ease",
                    whiteSpace: compact ? 'nowrap' : undefined,
                    overflow: compact ? 'hidden' : undefined,
                    textOverflow: compact ? 'ellipsis' : undefined,
                }}>
                    {title}
                </Typography>
            </Box>
        </Tooltip>
    );
};

const ChartCard = ({ title, subtitle, children, actions, loading, animDelay = 0, accentA, accentB }) => (
    <Box sx={{
        background: "linear-gradient(160deg, #ffffff 0%, #f7f9ff 100%)",
        borderRadius: "20px",
        border: `1.5px solid ${T.border}`,
        p: { xs: "16px 14px 14px", sm: "22px 20px 20px" },
        boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 0 rgba(15,23,42,0.03), 0 4px 20px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)`,
        position: "relative", overflow: "hidden", minWidth: 0,
        display: "flex", flexDirection: "column",
        willChange: "transform, box-shadow",
        animation: `${chartSlide} 0.65s cubic-bezier(0.34,1.2,0.64,1) ${animDelay / 1000}s both`,
        transition: [
            "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            "box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1)",
            "border-color 0.28s ease",
        ].join(", "),
        "&::before": {
            content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px",
            background: `linear-gradient(90deg, ${accentA || T.primary}, ${accentB || "#3b82f6"}, ${accentA || T.primary})`,
            backgroundSize: "200% 100%",
            animation: `${shimmerKf} 4s linear infinite, ${topBarSlide} 0.7s cubic-bezier(0.34,1.56,0.64,1) ${animDelay / 1000}s both`,
            borderRadius: "20px 20px 0 0", transformOrigin: "left center",
            opacity: 0.6, transition: "opacity 0.3s ease, height 0.28s ease",
        },
        "&::after": {
            content: '""', position: "absolute", bottom: -60, right: -60, width: 140, height: 140, borderRadius: "50%",
            background: `radial-gradient(circle, ${(accentA || T.primary)}12 0%, transparent 68%)`,
            pointerEvents: "none", transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease", opacity: 0.6,
        },
        "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: [
                `0 1px 0 rgba(255,255,255,0.9) inset`,
                `0 24px 52px -8px ${(accentA || T.primary)}25`,
                `0 8px 24px rgba(15,23,42,0.10)`,
                `0 0 0 1.5px ${(accentA || T.primary)}28`,
            ].join(", "),
            borderColor: `${(accentA || T.primary)}38`,
            "&::before": { opacity: 1, height: "4px" },
            "&::after": { transform: "scale(2.6)", opacity: 1 },
        },
    }}>
        <ChartOverlay loading={loading} />
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: { xs: 1.5, sm: 2.5 }, gap: 1.25 }}>
            <Box>
                <Typography sx={{ fontSize: { xs: "0.79rem", sm: "0.85rem" }, fontWeight: 800, color: T.text, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography sx={{ fontSize: "0.62rem", color: T.textFaint, mt: 0.35, fontWeight: 500 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {actions && <Box sx={{ display: "flex", gap: 1 }}>{actions}</Box>}
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
            {children}
        </Box>
    </Box>
);

const MachineLoadChart = ({ data }) => {
    const [showAll, setShowAll] = useState(false);
    useEffect(() => { injectStyles(); }, []);
    if (!data?.length) return <div className="flex items-center justify-center h-[260px] text-slate-400 italic">No data available</div>;

    const sorted = [...data].sort((a, b) => {
        const valA = parseFloat(a.AverageLoadPercent ?? a.LoadPercent ?? 0);
        const valB = parseFloat(b.AverageLoadPercent ?? b.LoadPercent ?? 0);
        return valB - valA;
    });
    const displayList = showAll ? sorted : sorted.slice(0, 5);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md uppercase tracking-wider transition-all hover:bg-indigo-500 hover:text-white"
                >
                    {showAll ? 'Top 5' : 'All'}
                </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[340px] pr-2 flex flex-col gap-5">
                {displayList.map((m, i) => {
                    const val = parseFloat(m.AverageLoadPercent ?? m.LoadPercent ?? 0);
                    const target = 80;
                    const isHealthy = val >= target;
                    return (
                        <div key={i} className="animate-[pd-fadein_0.4s_ease_both]" style={{ animationDelay: `${i * 45}ms` }}>
                            <div className="flex justify-between items-center mb-1.5">
                                <Typography className="text-[13px] font-bold text-slate-700 tracking-tight">{m.MachineName}</Typography>
                                <Typography className="text-[12px] font-extrabold text-slate-900">{val.toFixed(0)}%</Typography>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full relative">
                                <div
                                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                    style={{ width: `${val}%` }}
                                />
                                <div className="absolute left-[80%] top-[-4px] bottom-[-4px] w-[3px] bg-slate-800 rounded-full z-10" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const MachineOEEBreakdownChart = ({ data }) => {
    const canvasRef = useRef(null);
    const chartInst = useRef(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
        const canvas = canvasRef.current;
        if (!canvas || !data?.labels?.length) return;

        // Map to objects for sorting
        const mapped = data.labels.map((l, i) => ({
            label: l,
            avail: data.availability[i],
            perf: data.performance[i],
            qual: data.quality[i],
            oee: data.oee[i]
        })).sort((a, b) => b.oee - a.oee);

        // Slice data for Top 5 or show All
        const displayList = showAll ? mapped : mapped.slice(0, 5);
        const labels = displayList.map(d => d.label);
        const availability = displayList.map(d => d.avail);
        const performance = displayList.map(d => d.perf);
        const quality = displayList.map(d => d.qual);
        const oee = displayList.map(d => d.oee);

        import('chart.js').then((mod) => {
            const { Chart, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } = mod;
            if (!Chart.registry.scales.get('category')) {
                Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);
            }
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            chartInst.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Availability', data: availability, backgroundColor: '#818cf8', stack: 's0', borderRadius: 0, borderSkipped: false, order: 1 },
                        { label: 'Performance', data: performance, backgroundColor: '#4f46e5', stack: 's0', borderRadius: 0, borderSkipped: false, order: 1 },
                        { label: 'Quality', data: quality, backgroundColor: '#312e81', stack: 's0', borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: false, order: 1 },
                        { label: 'Total OEE %', data: oee, type: 'line', borderColor: '#10b981', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2, tension: 0.3, yAxisID: 'y', order: 0 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { font: { size: 10, weight: 600 }, boxWidth: 10, padding: 15, usePointStyle: true, pointStyle: 'circle' } },
                        tooltip: { mode: 'index', intersect: false, padding: 12, backgroundColor: 'rgba(15,23,42,0.9)', callbacks: { label: (c) => ` ${c.dataset.label}: ${parseFloat(c.raw ?? 0).toFixed(1)}%` } },
                    },
                    scales: {
                        x: { stacked: true, grid: { display: false }, border: { color: 'rgba(0,0,0,0.08)' }, ticks: { font: { size: 10, weight: 500 }, color: '#64748b', maxRotation: 35, minRotation: 35, callback: function (value) { const l = this.getLabelForValue(value); return l && l.length > 13 ? l.substring(0, 12) + '…' : l; } } },
                        y: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)', drawTicks: false }, border: { display: false }, min: 0, max: 300, ticks: { font: { size: 10 }, color: '#94a3b8', stepSize: 75 } },
                    },
                },
            });
        });
        return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
    }, [data, showAll]);

    if (!data?.labels?.length) return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9ca3af', fontSize: 13 }}>No data available</Box>;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                <Box
                    component="button"
                    onClick={() => setShowAll(!showAll)}
                    sx={{
                        fontSize: '10px', fontWeight: 800, color: '#6366f1',
                        bgcolor: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.15)',
                        px: 1.2, py: 0.4, borderRadius: '6px', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.2s',
                        '&:hover': { bgcolor: '#6366f1', color: '#fff' }
                    }}
                >
                    {showAll ? 'Top 5' : 'All'}
                </Box>
            </Box>
            <Box sx={{ flex: 1, overflowX: showAll ? 'auto' : 'visible', minHeight: 260 }}>
                <Box sx={{ height: 260, minWidth: showAll ? Math.max(data.labels.length * 60, 400) : 'none' }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
                </Box>
            </Box>
        </Box>
    );
};

const SpeedGapChart = ({ data }) => {
    const [visible, setVisible] = useState(false);
    const [showAll, setShowAll] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), 100); return () => clearTimeout(t); }, [data]);

    if (!data?.labels?.length) return <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm italic">No data available</div>;

    const hasStd = data.standard?.some(v => parseFloat(v) > 0);
    const allVals = [...(data.actual ?? []), ...(data.standard ?? [])].map(parseFloat).filter(n => !isNaN(n));
    const maxVal = Math.max(...allVals, 1);

    const mapped = data.labels.map((l, i) => ({
        label: l,
        actual: parseFloat(data.actual?.[i] ?? 0),
        standard: parseFloat(data.standard?.[i] ?? 0)
    })).sort((a, b) => b.actual - a.actual);

    const displayList = showAll ? mapped : mapped.slice(0, 5);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md uppercase tracking-wider transition-all hover:bg-indigo-500 hover:text-white"
                >
                    {showAll ? 'Top 5' : 'All'}
                </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[320px] pr-2 flex flex-col gap-5">
                {displayList.map((d, i) => {
                    const actual = d.actual;
                    const standard = d.standard;
                    const aPct = Math.min((actual / maxVal) * 100, 100);
                    const sPct = Math.min((standard / maxVal) * 100, 100);
                    const isGap = hasStd && actual < standard;
                    return (
                        <div key={i} className={visible ? "animate-[pd-fadein_0.4s_ease_both]" : "opacity-0"} style={{ animationDelay: `${i * 40}ms` }}>
                            <div className="flex justify-between items-center mb-1.5">
                                <Typography className="text-[12px] font-bold text-slate-700">{d.label}</Typography>
                                <Typography className={`text-[11px] font-black ${isGap ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {shortFmt(actual)}{hasStd ? ` / ${shortFmt(standard)}` : ''}
                                </Typography>
                            </div>
                            <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                {hasStd && <div className="absolute left-0 top-0 h-full bg-indigo-50 rounded-full" style={{ width: `${sPct}%` }} />}
                                <div
                                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${isGap ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 'bg-gradient-to-r from-purple-500 to-indigo-600'}`}
                                    style={{ width: visible ? `${aPct}%` : '0%' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DowntimeAnalysisChart = ({ data }) => {
    const canvasRef = useRef(null);
    const chartInst = useRef(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
        const canvas = canvasRef.current;
        if (!canvas || !data?.labels?.length) return;

        const count = showAll ? data.labels.length : 5;
        const labels = data.labels.slice(0, count);
        const datasets = (data.datasets ?? []).map(ds => ({ ...ds, data: ds.data.slice(0, count), barThickness: 28 }));

        import('chart.js').then((mod) => {
            const { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } = mod;
            if (!Chart.registry.scales.get('category')) {
                Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            chartInst.current = new Chart(ctx, {
                type: 'bar',
                data: { labels, datasets },
                options: {
                    indexAxis: 'y',
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 900, easing: 'easeOutQuart' },
                    plugins: {
                        legend: { display: true, position: 'bottom', labels: { font: { size: 12, weight: 600 }, boxWidth: 12, padding: 20, color: '#475569', usePointStyle: true, pointStyle: 'circle' } },
                        tooltip: { mode: 'index', intersect: false, padding: 12, backgroundColor: 'rgba(15,23,42,0.9)' },
                    },
                    scales: {
                        x: { stacked: true, grid: { color: 'rgba(0,0,0,0.03)', drawTicks: false }, border: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
                        y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { font: { size: 12, weight: 500 }, color: '#64748b' } },
                    },
                },
            });
        });
        return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
    }, [data, showAll]);

    if (!data?.labels?.length) return <div className="flex items-center justify-center h-[220px] text-slate-400 italic">No data available</div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-3">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md uppercase tracking-wider transition-all hover:bg-indigo-500 hover:text-white"
                >
                    {showAll ? 'Top 5' : 'All'}
                </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[350px]">
                <div style={{ height: Math.max(data.labels.length * 48, 280) }}>
                    <canvas ref={canvasRef} />
                </div>
            </div>
        </div>
    );
};

const UtilisationVsTargetChart = ({ data }) => {
    const [showAll, setShowAll] = useState(false);
    if (!data?.length) return <div className="flex items-center justify-center h-[260px] text-slate-400 italic">No data available</div>;

    const sorted = [...data].sort((a, b) => (parseFloat(b['Utilisation %'] ?? 0)) - (parseFloat(a['Utilisation %'] ?? 0)));
    const displayList = showAll ? sorted : sorted.slice(0, 5);

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex justify-end mb-3 relative z-30">
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-[10px] font-black text-indigo-500 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-md uppercase tracking-wider hover:bg-indigo-500 hover:text-white transition-all"
                >
                    {showAll ? 'Top 5' : 'All'}
                </button>
            </div>
            <div className="custom-scrollbar flex-1 overflow-y-auto max-h-[340px] pr-2">
                <div className="flex flex-col gap-6 pt-2">
                    {displayList.map((m, i) => {
                        const val = parseFloat(m['Utilisation %'] ?? m['Utilisation'] ?? 0);
                        return (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-1.5">
                                    <Typography className="text-[13px] font-bold text-slate-600">{m.MachineName}</Typography>
                                    <Typography className="text-[12px] font-extrabold text-slate-900">{val.toFixed(0)}%</Typography>
                                </div>
                                <div className="h-3.5 w-full bg-slate-50 rounded-full relative overflow-hidden ring-1 ring-slate-100">
                                    <div
                                        className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all duration-1000 z-20"
                                        style={{ width: `${val}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const DowntimeTimelineChart = ({ data }) => {
    const canvasRef = useRef(null);
    const chartInst = useRef(null);

    useEffect(() => {
        if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
        const canvas = canvasRef.current;
        if (!canvas || !data?.length) return;

        const machineMap = {};
        data.forEach(d => {
            const name = d.MachineName || d.Machine || "Unknown";
            if (!machineMap[name]) machineMap[name] = { jobChange: 0 };
            machineMap[name].jobChange += parseFloat(d.TotalJobChangeMinutes || d.JobChangeTimeMinutes || 0);
        });

        const sorted = Object.entries(machineMap)
            .filter(([, v]) => v.jobChange > 0)
            .sort((a, b) => b[1].jobChange - a[1].jobChange);

        const labels = sorted.map(([name]) => name);
        const jobChanges = sorted.map(([, v]) => v.jobChange);

        const canvasW = canvas.parentElement?.offsetWidth ?? 600;
        const canvasH = labels.length * 36 + 60;
        canvas.width = canvasW;
        canvas.height = canvasH;

        import('chart.js').then((mod) => {
            const { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } = mod;
            Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
            const ctx = canvas.getContext('2d');
            chartInst.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Job Change',
                            data: jobChanges,
                            backgroundColor: '#10b981',
                            borderRadius: 20,
                            barThickness: 12,
                        }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true, position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', font: { size: 10, weight: 700 } } },
                        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw} mins` } }
                    },
                    scales: {
                        x: {
                            grid: { borderDash: [4, 4], color: 'rgba(0,0,0,0.05)' },
                            ticks: { font: { size: 10 }, color: '#94a3b8' },
                            title: { display: true, text: 'Minutes', font: { size: 10, weight: 600 } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { font: { size: 10, weight: 600 }, color: '#64748b' }
                        }
                    }
                }
            });
        });
        return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
    }, [data]);

    const machineCount = data?.filter(d => parseFloat(d.TotalJobChangeMinutes || d.JobChangeTimeMinutes || 0) > 0).length ?? 0;
    if (!machineCount) return <div className="flex items-center justify-center h-[280px] text-slate-400 italic">No timeline data available</div>;

    const ROW_H = 36;
    const MAX_VISIBLE = 8;
    const innerHeight = machineCount * ROW_H + 60;
    const outerHeight = Math.min(innerHeight, MAX_VISIBLE * ROW_H + 60);
    const needsScroll = machineCount > MAX_VISIBLE;

    return (
        <div
            style={{
                height: outerHeight,
                overflowY: needsScroll ? 'auto' : 'visible',
                overflowX: 'hidden',
                scrollbarWidth: 'thin',
            }}
        >
            <div style={{ height: innerHeight, position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
};

const MachineReliabilityTable = ({ data }) => {
    if (!data?.length) return (
        <div className="flex items-center justify-center h-[200px] text-slate-400 italic text-sm">
            No reliability data available
        </div>
    );

    const scoreColor = (val) => {
        const v = (val ?? '').toString().toLowerCase();
        if (v === 'high') return { bg: '#dcfce7', color: '#15803d' };
        if (v === 'low') return { bg: '#fee2e2', color: '#b91c1c' };
        return { bg: '#fef9c3', color: '#92400e' };
    };

    const actionColor = (val) => {
        const v = (val ?? '').toString().toLowerCase();
        if (v === 'overhaul') return { bg: '#fee2e2', color: '#b91c1c' };
        if (v === 'monitor') return { bg: '#fef9c3', color: '#92400e' };
        if (v === 'ok') return { bg: '#dcfce7', color: '#15803d' };
        return { bg: '#f1f5f9', color: '#475569' };
    };

    const cols = [
        { key: 'MachineId', label: 'Machine ID' },
        { key: 'MachineName', label: 'Machine Name' },
        { key: 'BreakdownsThisMonth', label: 'Breakdowns' },
        { key: 'AvgRepairTime', label: 'Avg Repair Time' },
        { key: 'TotalTimeLost', label: 'Total Time Lost' },
        { key: 'MaintenanceVisits', label: 'Maint. Visits' },
        { key: 'ReliabilityScore', label: 'Reliability Score' },
        { key: 'ActionRequired', label: 'Action Required' },
    ];

    return (
        <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {cols.map(c => (
                            <th key={c.key} style={{
                                padding: '8px 12px', textAlign: 'left', fontWeight: 700,
                                color: '#475569', whiteSpace: 'nowrap', fontSize: '0.72rem',
                                textTransform: 'uppercase', letterSpacing: '0.04em'
                            }}>{c.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i} style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: i % 2 === 0 ? '#fff' : '#fafbfc',
                            transition: 'background 0.15s'
                        }}>
                            {cols.map(c => {
                                const val = row[c.key] ?? '—';
                                if (c.key === 'ReliabilityScore') {
                                    const s = scoreColor(val);
                                    return (
                                        <td key={c.key} style={{ padding: '8px 12px' }}>
                                            <span style={{
                                                background: s.bg, color: s.color,
                                                borderRadius: 20, padding: '2px 10px',
                                                fontWeight: 700, fontSize: '0.72rem'
                                            }}>{val}</span>
                                        </td>
                                    );
                                }
                                if (c.key === 'ActionRequired') {
                                    const a = actionColor(val);
                                    return (
                                        <td key={c.key} style={{ padding: '8px 12px' }}>
                                            <span style={{
                                                background: a.bg, color: a.color,
                                                borderRadius: 20, padding: '2px 10px',
                                                fontWeight: 700, fontSize: '0.72rem'
                                            }}>{val}</span>
                                        </td>
                                    );
                                }
                                return (
                                    <td key={c.key} style={{
                                        padding: '8px 12px', color: c.key === 'MachineName' ? '#0f172a' : '#475569',
                                        fontWeight: c.key === 'MachineName' ? 600 : 400
                                    }}>{val}</td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </Box>
    );
};

const ProductionByProcessChart = ({ data, onBarClick }) => {
    const canvasRef = useRef(null);
    const chartInst = useRef(null);
    const axisRef = useRef(null);
    const tooltipRef = useRef(null);
    const wrapRef = useRef(null);

    const buildProcessAxis = useCallback(() => {
        const chart = chartInst.current;
        const container = axisRef.current;
        if (!chart || !container) return;
        const meta = chart.getDatasetMeta(0);
        const bars = meta?.data;
        if (!bars || bars.length === 0) return;
        const processList = data?._processList ?? [];
        if (!processList.length) return;
        container.innerHTML = '';
        processList.forEach((pg) => {
            const startBar = bars[pg.startIdx];
            const endBar = bars[pg.endIdx];
            if (!startBar || !endBar) return;
            const leftPx = startBar.x - startBar.width / 2;
            const rightPx = endBar.x + endBar.width / 2;
            const widthPx = rightPx - leftPx;
            if (widthPx < 4) return;
            const cell = document.createElement('div');
            cell.style.cssText = `position:absolute;left:${leftPx}px;width:${widthPx}px;box-sizing:border-box;padding:0 3px;display:flex;flex-direction:column;align-items:center;`;
            const bracket = document.createElement('div');
            bracket.style.cssText = `width:100%;height:10px;border-left:1.5px solid #cbd5e1;border-right:1.5px solid #cbd5e1;border-bottom:1.5px solid #cbd5e1;border-radius:0 0 4px 4px;margin-bottom:8px;`;
            const lbl = document.createElement('div');
            lbl.textContent = pg.label.toUpperCase();
            // vertical label to match reference image
            lbl.style.cssText = `font-size:10px;font-weight:800;color:#0f172a;letter-spacing:0.04em;writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;padding-top:4px;white-space:nowrap;`;
            cell.appendChild(bracket);
            cell.appendChild(lbl);
            container.appendChild(cell);
        });
    }, [data]);

    const handleMouseMove = useCallback((e) => {
        const chart = chartInst.current;
        const tooltip = tooltipRef.current;
        const wrap = wrapRef.current;
        if (!chart || !tooltip || !wrap) return;
        const active = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
        if (!active || active.length === 0) { tooltip.style.opacity = '0'; return; }
        const idx = active[0].index;
        const rawList = data?._rawList ?? [];
        const processList = data?._processList ?? [];
        const labels = data?.labels ?? [];
        let processName = '';
        processList.forEach((pg) => { if (idx >= pg.startIdx && idx <= pg.endIdx) processName = pg.label; });
        const machineName = (rawList[idx]?.MachineName ?? labels[idx] ?? '').replace(/\n/g, ' ');
        const s1 = parseFloat(data?.datasets?.[0]?.data?.[idx] ?? 0);
        const s2 = parseFloat(data?.datasets?.[1]?.data?.[idx] ?? 0);
        const s3 = parseFloat(data?.datasets?.[2]?.data?.[idx] ?? 0);
        const total = s1 + s2 + s3;
        const pct = (v) => total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
        tooltip.innerHTML = `
            <div style="padding:13px 15px;min-width:230px;font-family:'Inter',system-ui,sans-serif;">
                <div style="margin-bottom:9px;padding-bottom:9px;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94a3b8;margin-bottom:3px;">${processName}</div>
                    <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.3;">${machineName}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:7px;">
                    ${[{ label: 'Shift 1', color: '#ef4444', val: s1 }, { label: 'Shift 2', color: '#10b981', val: s2 }, { label: 'Shift 3', color: '#3b82f6', val: s3 }].map(({ label, color, val }) => `
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;">
                            <div style="display:flex;align-items:center;gap:7px;">
                                <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;display:inline-block;"></span>
                                <span style="font-size:12px;color:#374151;font-weight:500;">${label}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <span style="font-size:12px;font-weight:700;color:#111827;">${shortFmt(val)}</span>
                                <span style="font-size:10px;color:#9ca3af;background:#f8fafc;border-radius:4px;padding:1px 5px;">${pct(val)}%</span>
                            </div>
                        </div>`).join('')}
                </div>
                <div style="margin-top:9px;padding-top:9px;border-top:1px solid #f1f5f9;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
                        <span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Total</span>
                        <span style="font-size:14px;font-weight:800;color:#111827;">${shortFmt(total)}</span>
                    </div>
                    <div style="display:flex;height:6px;border-radius:4px;overflow:hidden;gap:1px;">
                        <div style="width:${pct(s1)}%;background:#ef4444;"></div>
                        <div style="width:${pct(s2)}%;background:#10b981;"></div>
                        <div style="width:${pct(s3)}%;background:#3b82f6;"></div>
                    </div>
                </div>
            </div>`;
        const wrapW = wrap.offsetWidth ?? 960;
        let left = e.offsetX + 18;
        let top = e.offsetY - 30;
        if (left + 248 > wrapW) left = e.offsetX - 252;
        if (top < 0) top = 0;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
        tooltip.style.opacity = '1';
    }, [data]);

    const handleMouseLeave = useCallback(() => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
    }, []);

    const handleCanvasClick = useCallback((e) => {
        const chart = chartInst.current;
        if (!chart) return;
        const activeElements = chart.getElementsAtEventForMode(e, 'index', { intersect: true }, true);
        if (!activeElements?.length) return;
        const idx = activeElements[0].index;
        const datasetIndex = activeElements[0].datasetIndex;
        const rawList = data?._rawList ?? [];
        const labels = data?.labels ?? [];
        const machineName = (rawList[idx]?.MachineName ?? labels[idx] ?? '').replace(/\n/g, ' ');
        const s1 = parseFloat(data?.datasets?.[0]?.data?.[idx] ?? 0);
        const s2 = parseFloat(data?.datasets?.[1]?.data?.[idx] ?? 0);
        const s3 = parseFloat(data?.datasets?.[2]?.data?.[idx] ?? 0);
        if (onBarClick) {
            onBarClick({
                machineName,
                shiftName: ['Shift 1', 'Shift 2', 'Shift 3'][datasetIndex] ?? '',
                shiftValue: shortFmt([s1, s2, s3][datasetIndex] ?? 0),
                shift1: shortFmt(s1), shift2: shortFmt(s2), shift3: shortFmt(s3),
                total: shortFmt(s1 + s2 + s3),
            });
        }
    }, [data, onBarClick]);

    useEffect(() => {
        if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; }
        const canvas = canvasRef.current;
        if (!canvas || !data?.labels?.length) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const labels = data.labels ?? [];
        const sums = labels.map((_, i) => {
            const s1 = parseFloat(data.datasets?.[0]?.data?.[i] ?? 0);
            const s2 = parseFloat(data.datasets?.[1]?.data?.[i] ?? 0);
            const s3 = parseFloat(data.datasets?.[2]?.data?.[i] ?? 0);
            return s1 + s2 + s3;
        });
        const maxValue = Math.max(...sums, 0);
        let yMax = Math.ceil(maxValue / 1000) * 1000;
        if (yMax < 10000) yMax = 10000;
        yMax = yMax * 1.15;

        const stepSize = (() => {
            if (yMax >= 1e7) return 2e6;
            if (yMax >= 1e6) return 2e5;
            if (yMax >= 5e5) return 1e5;
            if (yMax >= 1e5) return 25000;
            if (yMax >= 50000) return 10000;
            if (yMax >= 20000) return 5000;
            return 2500;
        })();

        import('chart.js').then((mod) => {
            const { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } = mod;
            if (!Chart.registry.scales.get('category')) {
                Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
            }
            const canvasEl = canvasRef.current;
            if (!canvasEl) return;
            const context = canvasEl.getContext('2d');
            if (!context) return;
            chartInst.current = new Chart(context, {
                type: 'bar',
                data: {
                    labels: data.labels,
                    datasets: [
                        { label: 'Shift 1', data: data.datasets?.[0]?.data ?? [], backgroundColor: '#ef4444', hoverBackgroundColor: '#dc2626', borderRadius: 0, borderSkipped: false, stack: 'stackSum', categoryPercentage: 0.6, barPercentage: 0.95 },
                        { label: 'Shift 2', data: data.datasets?.[1]?.data ?? [], backgroundColor: '#10b981', hoverBackgroundColor: '#059669', borderRadius: 0, borderSkipped: false, stack: 'stackSum', categoryPercentage: 0.6, barPercentage: 0.95 },
                        { label: 'Shift 3', data: data.datasets?.[2]?.data ?? [], backgroundColor: '#3b82f6', hoverBackgroundColor: '#2563eb', borderRadius: { topLeft: 2, topRight: 2, bottomLeft: 0, bottomRight: 0 }, borderSkipped: false, stack: 'stackSum', categoryPercentage: 0.6, barPercentage: 0.95 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    animation: { duration: 900, easing: 'easeOutQuart', onComplete: buildProcessAxis },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        x: { stacked: true, grid: { display: false }, border: { color: 'rgba(0,0,0,0.1)' }, ticks: { color: '#64748b', font: { size: 10, weight: 500 }, maxRotation: 90, minRotation: 90, autoSkip: false } },
                        y: { stacked: true, grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false }, border: { display: false }, min: 0, max: yMax, ticks: { color: '#64748b', font: { size: 10 }, callback: axisFmt, stepSize }, title: { display: true, text: 'Total Books Produced', color: '#94a3b8', font: { size: 11, weight: 600 } } },
                    },
                    layout: { padding: { bottom: 10 } },
                },
            });
        });
        return () => { if (chartInst.current) { chartInst.current.destroy(); chartInst.current = null; } };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseleave', handleMouseLeave);
        canvas.addEventListener('click', handleCanvasClick);
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            canvas.removeEventListener('click', handleCanvasClick);
        };
    }, [handleMouseMove, handleMouseLeave, handleCanvasClick]);

    useEffect(() => {
        const onResize = () => setTimeout(buildProcessAxis, 200);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [buildProcessAxis]);

    if (!data?.labels?.length) return <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340, color: '#9ca3af', fontSize: 13 }}>No data available</Box>;

    const minW = Math.max(data.labels.length * 48, 960);
    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5, justifyContent: 'flex-end' }}>
                {[{ color: '#ef4444', label: 'SHIFT 1' }, { color: '#10b981', label: 'SHIFT 2' }, { color: '#3b82f6', label: 'SHIFT 3' }].map((s) => (
                    <Box key={s.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: s.color }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em' }}>{s.label}</Typography>
                    </Box>
                ))}
            </Box>
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
                <Box ref={wrapRef} sx={{ minWidth: minW }}>
                    <Box sx={{ position: 'relative', height: 320 }}>
                        <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        <Box ref={tooltipRef} sx={{ position: 'absolute', opacity: 0, pointerEvents: 'none', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 999, minWidth: 230, transition: 'opacity 0.12s ease', overflow: 'hidden' }} />
                    </Box>
                    <Box ref={axisRef} sx={{ position: 'relative', height: 160, mt: 1 }} />
                </Box>
            </Box>
        </Box>
    );
};

/* ─────────────────────────────────────────────────────────
   Compare Mode helpers
   ───────────────────────────────────────────────────────── */
const processProductionResponses = ({ sheetsRes, booksRes, jobsRes, dailyRes, shiftRes, processMachRes, bindingRes, jobStatusRes }) => {
    const jcRow = (jobsRes?.data ?? [])[0] ?? {};
    const kpi = {
        sheetsProduced: (sheetsRes?.data ?? [])[0]?.SheetsProduced ?? 0,
        booksProduced: (booksRes?.data ?? [])[0]?.TotalBooks ?? 0,
        completed: jcRow.Completed ?? 0,
        inProgress: jcRow.InProgress ?? 0,
        pending: jcRow.Pending ?? 0,
    };

    const dpData = dailyRes?.data ?? [];
    const dailyProduction = {
        labels: dpData.map(r => r.MachineName),
        datasets: [
            { label: 'Production Qty', data: dpData.map(r => r.ProductionQuantity), backgroundColor: '#3b82f6', borderRadius: 6 },
            { label: 'Order Qty', data: dpData.map(r => r.OrderQuantity), backgroundColor: '#10b981', borderRadius: 6 },
        ]
    };

    const jsData = jobStatusRes?.data ?? [];
    const jobStatus = {
        labels: jsData.map(r => r.JobStatus),
        datasets: [{ data: jsData.map(r => r.NoOfJobs), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }]
    };

    const spData = shiftRes?.data ?? [];
    const shiftProduction = {
        labels: spData.map(r => r.Shifts),
        datasets: [{ label: 'Production', data: spData.map(r => r.ProductionQuantity), backgroundColor: '#6366f1', borderRadius: 6 }]
    };

    const pbpRaw = processMachRes?.data ?? [];
    const processList = [];
    let prevProc = null;
    pbpRaw.forEach((r, i) => {
        const proc = r.ProcessName || '';
        if (proc !== prevProc) { processList.push({ label: proc, startIdx: i, endIdx: i }); prevProc = proc; }
        else { processList[processList.length - 1].endIdx = i; }
    });
    const productionByProcess = {
        labels: pbpRaw.map(r => r.MachineName),
        _rawList: pbpRaw, _processList: processList,
        datasets: [
            { label: 'Shift 1', data: pbpRaw.map(r => r.Shift1), backgroundColor: '#ef4444' },
            { label: 'Shift 2', data: pbpRaw.map(r => r.Shift2), backgroundColor: '#10b981' },
            { label: 'Shift 3', data: pbpRaw.map(r => r.Shift3), backgroundColor: '#3b82f6' },
        ]
    };

    const bfData = bindingRes?.data ?? [];
    const makeReadyTime = {
        labels: bfData.map(r => r.MachineName),
        datasets: [{ label: 'Total Production', data: bfData.map(r => r.TotalProductionQuantity), backgroundColor: '#ec4899', borderRadius: 6 }]
    };

    return { kpi, charts: { dailyProduction, jobStatus, shiftProduction, productionByProcess, makeReadyTime } };
};

const ACCENT_THIS = { a: '#0284c7', b: '#38bdf8', label: 'This Month', pill: '#e0f2fe', text: '#0369a1' };
const ACCENT_LAST = { a: '#7c3aed', b: '#a78bfa', label: 'Last Month', pill: '#f5f3ff', text: '#6d28d9' };

/* Row-label pill shown at the left of each compare row */
const ComparePill = ({ accent }) => (
    <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: { xs: 28, md: 36 }, flexShrink: 0,
    }}>
        <Box sx={{
            writingMode: 'vertical-rl', textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            px: '5px', py: '10px', borderRadius: '8px',
            bgcolor: accent.pill, border: `1.5px solid ${accent.a}30`,
            fontSize: '0.55rem', fontWeight: 800, color: accent.text,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
        }}>
            {accent.label}
        </Box>
    </Box>
);

/* KPI card used inside compare single-row (desktop only) */
const CompareKpiCard = ({ label, value, color, icon: Icon, animDelay = 0 }) => {
    const display = useMemo(() => { if (value == null) return '—'; return fmt(value); }, [value]);
    const bg = `${color}18`;
    const delayS = animDelay / 1000;
    return (
        <Box sx={{
            borderRadius: '16px',
            p: '16px 16px 14px 18px',
            background: `linear-gradient(150deg, #ffffff 0%, #f5f7fb 100%)`,
            border: `1.5px solid ${T.border}`,
            boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
            display: 'flex', flexDirection: 'column',
            position: 'relative', overflow: 'hidden',
            animation: `${fadeUp} 0.45s ease ${delayS}s both`,
            height: '100%',
        }}>
            {/* left accent bar */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${color} 0%, ${color}60 100%)`, borderRadius: '16px 0 0 16px' }} />
            {/* top-right gradient blob */}
            <Box sx={{ position: 'absolute', top: 0, right: 0, width: 60, height: 60, borderRadius: '0 16px 0 60%', background: `linear-gradient(135deg, ${color}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
            {/* Icon */}
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: bg, border: `1.5px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25, flexShrink: 0 }}>
                {Icon && <Icon size={16} color={color} strokeWidth={2.1} />}
            </Box>
            {/* Value */}
            <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: T.text, fontFamily: T.fontMono, letterSpacing: '-0.8px', lineHeight: 1, mb: 0.6 }}>
                {display}
            </Typography>
            {/* Divider */}
            <Box sx={{ width: '100%', height: '1px', background: `linear-gradient(90deg, ${color}20 0%, transparent 70%)`, mb: 0.6 }} />
            {/* Label */}
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
            </Typography>
        </Box>
    );
};

/* Compact KPI tile for mobile compare rows */
const CompareKpiTile = ({ label, value, color, icon: Icon, animDelay = 0 }) => {
    const display = useMemo(() => { if (value == null) return '—'; return fmt(value); }, [value]);
    const bg = `${color}15`;
    const delayS = animDelay / 1000;
    return (
        <Box sx={{
            borderRadius: '10px', p: '8px 8px 7px 10px',
            bgcolor: '#fff', border: `1.5px solid ${T.border}`,
            boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
            display: 'flex', flexDirection: 'column',
            borderLeft: `3px solid ${color}`,
            animation: `${fadeUp} 0.4s ease ${delayS}s both`,
        }}>
            <Box sx={{ width: 20, height: 20, borderRadius: '6px', bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: '5px', flexShrink: 0 }}>
                {Icon && <Icon size={11} color={color} strokeWidth={2.2} />}
            </Box>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: T.text, fontFamily: T.fontMono, letterSpacing: '-0.4px', lineHeight: 1, mb: '3px' }}>
                {display}
            </Typography>
            <Typography sx={{ fontSize: '0.48rem', fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
            </Typography>
        </Box>
    );
};

/* A single compare row: pill + 5 compact KPI tiles (mobile) */
const CompareKpiRow = ({ accent, kpiDefs, loading }) => (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 0.75, md: 1 } }}>
        <ComparePill accent={accent} />
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: { xs: 0.75, md: 1 } }}>
            {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Box key={i} sx={{ borderRadius: '10px', bgcolor: '#f8fafc', border: `1.5px solid ${T.border}`, minHeight: { xs: 64, md: 52 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress size={14} sx={{ color: accent.a }} />
                    </Box>
                ))
                : kpiDefs.map((c, i) => (
                    <CompareKpiTile key={i} label={c.label} value={c.value} color={c.color} icon={c.icon} accent={accent} animDelay={i * 50} />
                ))
            }
        </Box>
    </Box>
);

/* A single chart-compare row: pill + This Month chart + VS badge + Last Month chart */
const CompareChartRow = ({ title, subtitle, thisData, lastData, type, onBarClick }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Section label */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box sx={{ flex: 1, height: '1px', bgcolor: T.borderLight }} />
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                {title}
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: T.borderLight }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: { xs: 1, md: 1.5 } }}>
            {/* This Month */}
            <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1 }, alignItems: 'stretch' }}>
                <ComparePill accent={ACCENT_THIS} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ChartCard title={title} subtitle={`${ACCENT_THIS.label} · ${subtitle}`} accentA={ACCENT_THIS.a} accentB={ACCENT_THIS.b} animDelay={0}>
                        {type === 'process'
                            ? <ProductionByProcessChart data={thisData} onBarClick={onBarClick ?? (() => {})} />
                            : <DashboardChart data={thisData} type={type} />
                        }
                    </ChartCard>
                </Box>
            </Box>
            {/* Last Month */}
            <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1 }, alignItems: 'stretch' }}>
                <ComparePill accent={ACCENT_LAST} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ChartCard title={title} subtitle={`${ACCENT_LAST.label} · ${subtitle}`} accentA={ACCENT_LAST.a} accentB={ACCENT_LAST.b} animDelay={80}>
                        {type === 'process'
                            ? <ProductionByProcessChart data={lastData} onBarClick={() => {}} />
                            : <DashboardChart data={lastData} type={type} />
                        }
                    </ChartCard>
                </Box>
            </Box>
        </Box>
    </Box>
);

/* Full compare view — row-based layout */
const CompareView = ({ compareData }) => {
    const { loading } = compareData;
    const td = compareData.thisMonth;
    const ld = compareData.lastMonth;

    const kpiDefs = [
        { label: 'Sheets', value: null, color: '#3b82f6', icon: Layers, thisVal: td?.kpi?.sheetsProduced, lastVal: ld?.kpi?.sheetsProduced },
        { label: 'Books', value: null, color: '#6366f1', icon: Activity, thisVal: td?.kpi?.booksProduced, lastVal: ld?.kpi?.booksProduced },
        { label: 'Completed', value: null, color: '#10b981', icon: CheckCircle2, thisVal: td?.kpi?.completed, lastVal: ld?.kpi?.completed },
        { label: 'In Progress', value: null, color: '#f59e0b', icon: Clock, thisVal: td?.kpi?.inProgress, lastVal: ld?.kpi?.inProgress },
        { label: 'Pending', value: null, color: '#8b5cf6', icon: AlertCircle, thisVal: td?.kpi?.pending, lastVal: ld?.kpi?.pending },
    ];
    const thisKpi = kpiDefs.map(k => ({ ...k, value: k.thisVal }));
    const lastKpi = kpiDefs.map(k => ({ ...k, value: k.lastVal }));

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, md: 2 }, animation: `${fadeUp} 0.4s ease both` }}>

            {/* ── Desktop: all 10 KPIs in one row with vertical VS divider ── */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, flexDirection: 'column', gap: 0.75 }}>
                {/* Period labels above each group */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ display: 'flex', flex: 5, gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACCENT_THIS.a, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: ACCENT_THIS.text, letterSpacing: '0.04em' }}>{compareData.thisMonthLabel || 'This Month'}</Typography>
                        </Box>
                    </Box>
                    <Box sx={{ width: 36, flexShrink: 0 }} /> {/* spacer for VS */}
                    <Box sx={{ display: 'flex', flex: 5, gap: 1, justifyContent: 'flex-end' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ACCENT_LAST.a, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: ACCENT_LAST.text, letterSpacing: '0.04em' }}>{compareData.lastMonthLabel || 'Last Month'}</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* 10 KPI cards + VS */}
                <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
                    {thisKpi.map((k, i) => (
                        <Box key={`t${i}`} sx={{ flex: 1, minWidth: 0 }}>
                            <CompareKpiCard label={k.label} value={k.value} color={k.color} icon={k.icon} animDelay={i * 50} />
                        </Box>
                    ))}
                    {/* Vertical VS divider */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: 36, gap: 0.5 }}>
                        <Box sx={{ width: '1px', flex: 1, background: 'linear-gradient(180deg, transparent, #c4b5fd)' }} />
                        <Box sx={{ px: 1.2, py: '5px', borderRadius: '20px', bgcolor: '#f5f3ff', border: '1.5px solid #c4b5fd', flexShrink: 0 }}>
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#7c3aed', letterSpacing: '0.05em' }}>VS</Typography>
                        </Box>
                        <Box sx={{ width: '1px', flex: 1, background: 'linear-gradient(180deg, #c4b5fd, transparent)' }} />
                    </Box>
                    {lastKpi.map((k, i) => (
                        <Box key={`l${i}`} sx={{ flex: 1, minWidth: 0 }}>
                            <CompareKpiCard label={k.label} value={k.value} color={k.color} icon={k.icon} animDelay={i * 50 + 250} />
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* ── Mobile: stacked rows ── */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 28, flexShrink: 0 }} />
                    {kpiDefs.map((k, i) => (
                        <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: '0.48rem', fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.2 }}>{k.label}</Typography>
                        </Box>
                    ))}
                </Box>
                <CompareKpiRow accent={ACCENT_THIS} kpiDefs={thisKpi} loading={loading} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #c4b5fd 40%, transparent)' }} />
                    <Box sx={{ px: 1.5, py: '3px', borderRadius: '20px', bgcolor: '#f5f3ff', border: '1.5px solid #c4b5fd' }}>
                        <Typography sx={{ fontSize: '0.58rem', fontWeight: 900, color: '#7c3aed', letterSpacing: '0.06em' }}>VS</Typography>
                    </Box>
                    <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, #c4b5fd 40%, transparent)' }} />
                </Box>
                <CompareKpiRow accent={ACCENT_LAST} kpiDefs={lastKpi} loading={loading} />
            </Box>

            {/* ── Chart rows ── */}
            {!loading && td && ld && (<>
                <CompareChartRow
                    title="Daily Production Summary" subtitle="Books produced"
                    thisData={td.charts.dailyProduction} lastData={ld.charts.dailyProduction}
                    type="bar"
                />
                <CompareChartRow
                    title="Operation Status" subtitle="Job distribution"
                    thisData={td.charts.jobStatus} lastData={ld.charts.jobStatus}
                    type="doughnut"
                />
                <CompareChartRow
                    title="Shift-wise Production" subtitle="Per shift output"
                    thisData={td.charts.shiftProduction} lastData={ld.charts.shiftProduction}
                    type="bar"
                />
                <CompareChartRow
                    title="Binding & Finishing" subtitle="Department output"
                    thisData={td.charts.makeReadyTime} lastData={ld.charts.makeReadyTime}
                    type="bar"
                />
                {/* Production by Process — stacked full-width rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ flex: 1, height: '1px', bgcolor: T.borderLight }} />
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                            Production by Process & Machine
                        </Typography>
                        <Box sx={{ flex: 1, height: '1px', bgcolor: T.borderLight }} />
                    </Box>
                    <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1 }, alignItems: 'stretch', mb: 1.5 }}>
                        <ComparePill accent={ACCENT_THIS} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <ChartCard title="Production by Process & Machine" subtitle={`${ACCENT_THIS.label} · Process breakdown`} accentA={ACCENT_THIS.a} accentB={ACCENT_THIS.b} animDelay={0}>
                                <ProductionByProcessChart data={td.charts.productionByProcess} onBarClick={() => {}} />
                            </ChartCard>
                        </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: { xs: 0.75, md: 1 }, alignItems: 'stretch' }}>
                        <ComparePill accent={ACCENT_LAST} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <ChartCard title="Production by Process & Machine" subtitle={`${ACCENT_LAST.label} · Process breakdown`} accentA={ACCENT_LAST.a} accentB={ACCENT_LAST.b} animDelay={80}>
                                <ProductionByProcessChart data={ld.charts.productionByProcess} onBarClick={() => {}} />
                            </ChartCard>
                        </Box>
                    </Box>
                </Box>
            </>)}
        </Box>
    );
};


const ProductionDashboard = () => {
    useEffect(() => { injectStyles(); }, []);

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [activeTab, setActiveTab] = useState('production');
    const [machineFilter, setMachineFilter] = useState('All');
    const [machineSearchOpen, setMachineSearchOpen] = useState(false);
    const [machineSearchText, setMachineSearchText] = useState('');
    const machineFilterRef = useRef(null);
    const machineBtnRef = useRef(null);
    const machineDropdownRef = useRef(null);
    const [machineDropdownPos, setMachineDropdownPos] = useState({ top: 0, left: 0 });
    const [productionUnits, setProductionUnits] = useState([]);
    const [selectedProductionUnit, setSelectedProductionUnit] = useState('All');
    const [showProductionUnitFilter, setShowProductionUnitFilter] = useState(false);
    const [puDropdownOpen, setPuDropdownOpen] = useState(false);
    const puFilterRef = useRef(null);
    const puBtnRef = useRef(null);
    const [puDropdownPos, setPuDropdownPos] = useState({ top: 0, left: 0 });
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [detailModal, setDetailModal] = useState({ open: false, title: '', columns: [], rows: [], loading: false });

    const _now = dayjs();
    const _cYear = (_now.month() >= 3) ? _now.year() : _now.year() - 1;
    const FY_FROM = useMemo(() => `${_cYear}-04-01`, [_cYear]);
    const FY_TO = useMemo(() => `${_cYear + 1}-03-31`, [_cYear]);

    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);
    const [isDateUserSelected, setIsDateUserSelected] = useState(false);
    const [companyId] = useState(() => localStorage.getItem('CompanyID') || '2');
    const [compareMode, setCompareMode] = useState(false);
    const [compareData, setCompareData] = useState({ thisMonth: null, lastMonth: null, loading: false });

    const [prodKpi, setProdKpi] = useState({
        sheetsProduced: { current: 0, growth: null },
        booksProduced: { current: 0, growth: null },
        completed: { current: 0 },
        inProgress: { current: 0 },
        pending: { current: 0 },
    });

    const [machKpi, setMachKpi] = useState({
        avgUtilisation: { current: 0 },
        totalDowntime: { current: 0 },
        breakdownCount: { current: 0 },
        machineLoad: { current: 0 },
    });

    const [charts, setCharts] = useState({
        dailyProduction: { labels: [], datasets: [] },
        jobStatus: { labels: [], datasets: [] },
        shiftProduction: { labels: [], datasets: [] },
        machineEfficiency: { labels: [], datasets: [] },
        productionByProcess: { labels: [], datasets: [], _processList: [], _rawList: [] },
        machineOeeBreakdown: { labels: [], availability: [], performance: [], quality: [], oee: [] },
        machineLoadData: [],
        downtimeAnalysis: { labels: [], datasets: [] },
        utilisationData: [],
        speedGapData: { labels: [], actual: [], standard: [] },
        topReasonsNph: { labels: [], datasets: [] },
        makeReadyTime: { labels: [], datasets: [] },
        downtimeTimeline: [],
        machineReliability: [],
    });

    const handleProcessBarClick = useCallback((clickData) => {
        const { machineName, shiftName, shiftValue, shift1, shift2, shift3, total } = clickData;
        setSnackbarMessage(`${machineName}\n${shiftName}: ${shiftValue} units\n─────────────────\nShift 1: ${shift1} | Shift 2: ${shift2} | Shift 3: ${shift3}\nTotal: ${total} units`);
        setSnackbarOpen(true);
    }, []);

    const handleSnackbarClose = () => setSnackbarOpen(false);

    const handleSetToDate = useCallback((date) => {
        setToDate(date);
        setIsDateUserSelected(true);
    }, []);

    /* ── Compare Mode fetch ── */
    const fetchCompareData = useCallback(async () => {
        setCompareData(prev => ({ ...prev, loading: true, thisMonth: null, lastMonth: null }));
        const now = dayjs();
        const thisMonthFrom = now.startOf('month').format('YYYY-MM-DD');
        const thisMonthTo = now.format('YYYY-MM-DD');
        const lastMonthFrom = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        const lastMonthTo = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

        const puFilter = selectedProductionUnit !== 'All' ? { ProductionUnitID: selectedProductionUnit } : {};

        const fetchPeriod = async (from, to) => {
            const p = { CompanyId: companyId, CompanyID: companyId, FromDate: from, Fromdate: from, ToDate: to, Todate: to, ...puFilter };
            const [sheetsRes, booksRes, jobsRes, dailyRes, shiftRes, processMachRes, bindingRes, jobStatusRes] = await Promise.all([
                postRequest('GetSheetsProduced', p),
                postRequest('GetBooksProduced', p),
                postRequest('GetJobsCompleted', p),
                postRequest('GetDailyProductionSummary', p),
                postRequest('GetShiftwiseProduction', p),
                postRequest('GetProductionbyProcessMachine', p),
                postRequest('GetBindingFinishing', p),
                postRequest('GetJobStatus', p),
            ]);
            return processProductionResponses({ sheetsRes, booksRes, jobsRes, dailyRes, shiftRes, processMachRes, bindingRes, jobStatusRes });
        };

        try {
            const [thisMonth, lastMonth] = await Promise.all([
                fetchPeriod(thisMonthFrom, thisMonthTo),
                fetchPeriod(lastMonthFrom, lastMonthTo),
            ]);
            setCompareData({
                thisMonth, lastMonth, loading: false,
                thisMonthLabel: `${now.startOf('month').format('DD MMM')} – ${now.format('DD MMM YYYY')}`,
                lastMonthLabel: `${now.subtract(1, 'month').startOf('month').format('DD MMM')} – ${now.subtract(1, 'month').endOf('month').format('DD MMM YYYY')}`,
            });
        } catch {
            setCompareData(prev => ({ ...prev, loading: false }));
        }
    }, [companyId, selectedProductionUnit]);

    const toggleCompareMode = useCallback(() => {
        setCompareMode(prev => {
            if (!prev) fetchCompareData();
            return !prev;
        });
    }, [fetchCompareData]);

    /* ── Fetch Production Units once on mount ── */
    useEffect(() => {
        const fetchProductionUnits = async () => {
            try {
                const res = await postRequest('GetProductionUnits', { CompanyID: companyId });
                const units = res?.data ?? [];
                if (units.length > 1) {
                    setProductionUnits(units);
                    setShowProductionUnitFilter(true);
                }
            } catch { /* silently ignore if table doesn't exist */ }
        };
        fetchProductionUnits();
    }, [companyId]);

    /* ── Close PU dropdown on outside click ── */
    useEffect(() => {
        const handler = (e) => {
            if (puFilterRef.current && !puFilterRef.current.contains(e.target))
                setPuDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const puFilter = selectedProductionUnit !== 'All' ? { ProductionUnitID: selectedProductionUnit } : {};

            const payload = {
                CompanyId: companyId,
                CompanyID: companyId,
                FromDate: fromDate,
                Fromdate: fromDate,
                ToDate: toDate,
                Todate: toDate,
                ...puFilter
            };

            const machineToDate = isDateUserSelected ? toDate : GetDate();
            const machinePayload = {
                CompanyId: companyId,
                CompanyID: companyId,
                FromDate: fromDate,
                Fromdate: fromDate,
                ToDate: machineToDate,
                Todate: machineToDate,
                ...puFilter
            };

            const [
                dailyProdRes, jobStatusRes, machineEffRes,
                prodByProcessRes, shiftProdRes, sheetsProducedRes, booksProducedRes,
                jobsCompletedRes, avgUtilisationRes, totalDowntimeRes,
                breakdownCountRes, machineLoadRes, machineOeeRes,
                speedGapRes, downtimeAnalysisRes, utilisationVsTargetRes,
                topReasonsNphRes, bindingFinishingRes, downtimeTimelineRes,
                machineReliabilityRes
            ] = await Promise.all([
                postRequest('GetDailyProductionSummary', payload),
                postRequest('GetJobStatus', payload),
                postRequest('GetMachineEfficiency', payload),
                postRequest('GetProductionbyProcessMachine', payload),
                postRequest('GetShiftwiseProduction', payload),
                postRequest('GetSheetsProduced', payload),
                postRequest('GetBooksProduced', payload),
                postRequest('GetJobsCompleted', payload),
                postRequest('GetAvgUtilisation', payload),
                postRequest('GetTotalDowntime', payload),
                postRequest('GetBreakdownCount', payload),
                postRequest('GetMachineLoad', machinePayload),
                postRequest('GetMachineOEEBreakdown', machinePayload),
                postRequest('GetSpeedGap', payload),
                postRequest('GetTopMachinesbyDowntime', payload),
                postRequest('GetUtilisationvsTarget', payload),
                postRequest('GetTopReasonsforNPH', payload),
                postRequest('GetBindingFinishing', payload),
                postRequest('GetDowntimeTimeline', payload),
                postRequest('GetMachineReliability', payload),
            ]);

            // Production KPIs
            const jcRow = (jobsCompletedRes?.data ?? [])[0] ?? {};
            setProdKpi({
                sheetsProduced: { current: (sheetsProducedRes?.data ?? [])[0]?.SheetsProduced ?? 0 },
                booksProduced: { current: (booksProducedRes?.data ?? [])[0]?.TotalBooks ?? 0 },
                completed: { current: jcRow.Completed ?? 0 },
                inProgress: { current: jcRow.InProgress ?? 0 },
                pending: { current: jcRow.Pending ?? 0 },
            });

            // Machine KPIs
            setMachKpi({
                avgUtilisation: { current: (avgUtilisationRes?.data ?? [])[0]?.AvgUtilization ?? 0 },
                totalDowntime: { current: (totalDowntimeRes?.data ?? [])[0]?.TotalDowntimeMinutes ?? 0 },
                breakdownCount: { current: (breakdownCountRes?.data ?? [])[0]?.TotalBreakDown ?? 0 },
                machineLoad: { current: (() => { const d = machineLoadRes?.data ?? []; const valid = d.filter(r => r.LoadPercent != null && !isNaN(parseFloat(r.LoadPercent))); return valid.length ? valid.reduce((s, r) => s + parseFloat(r.LoadPercent), 0) / valid.length : 0; })() },
            });

            // Production Charts
            const dpData = dailyProdRes?.data ?? [];
            const dailyProductionChart = {
                labels: dpData.map(r => r.MachineName),
                datasets: [
                    { label: 'Production Qty', data: dpData.map(r => r.ProductionQuantity), backgroundColor: '#3b82f6', borderRadius: 6 },
                    { label: 'Order Qty', data: dpData.map(r => r.OrderQuantity), backgroundColor: '#10b981', borderRadius: 6 }
                ]
            };

            const jsData = jobStatusRes?.data ?? [];
            const jobStatusChart = {
                labels: jsData.map(r => r.JobStatus),
                datasets: [{ data: jsData.map(r => r.NoOfJobs), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }]
            };



            const pbpRaw = prodByProcessRes?.data ?? [];
            const processList = [];
            let prevProc = null;
            pbpRaw.forEach((r, i) => {
                const proc = r.ProcessName || '';
                if (proc !== prevProc) { processList.push({ label: proc, startIdx: i, endIdx: i }); prevProc = proc; }
                else { processList[processList.length - 1].endIdx = i; }
            });
            const productionByProcessChart = {
                labels: pbpRaw.map(r => r.MachineName),
                _rawList: pbpRaw, _processList: processList,
                datasets: [
                    { label: 'Shift 1', data: pbpRaw.map(r => r.Shift1), backgroundColor: '#ef4444' },
                    { label: 'Shift 2', data: pbpRaw.map(r => r.Shift2), backgroundColor: '#10b981' },
                    { label: 'Shift 3', data: pbpRaw.map(r => r.Shift3), backgroundColor: '#3b82f6' }
                ]
            };

            const spData = shiftProdRes?.data ?? [];
            const shiftProductionChart = {
                labels: spData.map(r => r.Shifts),
                datasets: [{ label: 'Production', data: spData.map(r => r.ProductionQuantity), backgroundColor: '#6366f1', borderRadius: 6 }]
            };

            const bfData = bindingFinishingRes?.data ?? [];
            const bindingFinishingChart = {
                labels: bfData.map(r => r.MachineName),
                datasets: [{ label: 'Total Production', data: bfData.map(r => r.TotalProductionQuantity), backgroundColor: '#ec4899', borderRadius: 6 }]
            };

            // Machine Charts - Limited to Top 10 machines
            const meData = (machineEffRes?.data ?? []).slice(0, 10);
            const machineEfficiencyChart = {
                labels: meData.map(r => r.MachineName),
                datasets: [{ label: 'Efficiency %', data: meData.map(r => r.UtilisationPercent), backgroundColor: '#10b981', borderRadius: 6 }]
            };

            const oeeDataRaw = machineOeeRes?.data ?? [];
            const oeeDataSorted = [...oeeDataRaw].sort((a, b) => (b.OEEPercent || 0) - (a.OEEPercent || 0)).slice(0, 10);
            const machineOeeChart = {
                labels: oeeDataSorted.map(r => r.MachineName),
                availability: oeeDataSorted.map(r => r.AvailabilityPercent),
                performance: oeeDataSorted.map(r => r.PerformancePercent),
                quality: oeeDataSorted.map(r => r.QualityPercent),
                oee: oeeDataSorted.map(r => r.OEEPercent)
            };

            const sgDataRaw = speedGapRes?.data ?? [];
            const sgDataSorted = [...sgDataRaw].sort((a, b) => (b.ActualSpeed || 0) - (a.ActualSpeed || 0)).slice(0, 10);
            const speedGapChart = {
                labels: sgDataSorted.map(r => r.MachineName),
                actual: sgDataSorted.map(r => r.ActualSpeed),
                standard: sgDataSorted.map(r => r.CapacityperHour)
            };

            const dtDataRaw = downtimeAnalysisRes?.data ?? [];

            // Pivot flat [MachineName, BreakDownTypeName, Totalminutes] rows into chart datasets
            const dtMachineMap = {};
            const dtMachineTotals = {};
            const dtTypeSet = new Set();
            dtDataRaw.forEach(r => {
                const machine = r.MachineName || '';
                const type = r.BreakDownTypeName || 'Other';
                const mins = parseFloat(r.Totalminutes || 0);
                dtTypeSet.add(type);
                if (!dtMachineMap[machine]) dtMachineMap[machine] = {};
                dtMachineMap[machine][type] = (dtMachineMap[machine][type] || 0) + mins;
                dtMachineTotals[machine] = (dtMachineTotals[machine] || 0) + mins;
            });
            const dtTypeColors = ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#8b5cf6', '#10b981', '#ec4899', '#14b8a6'];
            const dtMachines = Object.keys(dtMachineTotals)
                .sort((a, b) => dtMachineTotals[b] - dtMachineTotals[a])
                .slice(0, 10);
            const dtTypes = Array.from(dtTypeSet);
            const downtimeAnalysisChart = {
                labels: dtMachines,
                datasets: dtTypes.map((type, idx) => ({
                    label: type,
                    data: dtMachines.map(m => dtMachineMap[m]?.[type] || 0),
                    backgroundColor: dtTypeColors[idx % dtTypeColors.length],
                }))
            };

            const nphData = topReasonsNphRes?.data ?? [];
            const topReasonsNphChart = {
                labels: nphData.slice(0, 10).map(r => r.Reason || r.TypeOfWork || ''),
                datasets: [{ data: nphData.slice(0, 10).map(r => r.Minutes || r.TotalMinutes || 0), backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#14b8a6'] }]
            };

            const utDataRaw = utilisationVsTargetRes?.data ?? [];
            const utDataSorted = [...utDataRaw].sort((a, b) => {
                const valA = parseFloat(a['Utilisation %'] ?? a['Utilisation'] ?? 0);
                const valB = parseFloat(b['Utilisation %'] ?? b['Utilisation'] ?? 0);
                return valB - valA;
            }).slice(0, 10);

            const getResData = (res) => {
                if (!res) return [];
                if (Array.isArray(res.data)) return res.data;
                if (Array.isArray(res.data?.data)) return res.data.data;
                if (Array.isArray(res.data?.Table)) return res.data.Table;
                return [];
            };

            const dtTimeline = getResData(downtimeTimelineRes);
            const machReliability = getResData(machineReliabilityRes);

            setCharts(prev => ({
                ...prev,
                dailyProduction: dailyProductionChart,
                jobStatus: jobStatusChart,
                shiftProduction: shiftProductionChart,
                machineEfficiency: machineEfficiencyChart,
                productionByProcess: productionByProcessChart,
                machineOeeBreakdown: machineOeeChart,
                machineLoadData: getResData(machineLoadRes),
                speedGapData: speedGapChart,
                downtimeAnalysis: downtimeAnalysisChart,
                topReasonsNph: topReasonsNphChart,
                utilisationData: utDataSorted,
                makeReadyTime: bindingFinishingChart,
                downtimeTimeline: dtTimeline,
                machineReliability: machReliability,
            }));

        } catch (e) {
            console.error('fetchData error', e);
        } finally {
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        }
    }, [companyId, fromDate, toDate, isDateUserSelected, selectedProductionUnit]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openDetailModal = useCallback(async (cardTitle) => {
        const payload = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate };
        let endpoint, columns;

        if (cardTitle === 'Sheets Produced') {
            endpoint = 'GetSheetsProducedDetail';
            columns = PROD_COLUMNS;
        } else if (cardTitle === 'Books Produced') {
            endpoint = 'GetBooksProducedDetail';
            columns = PROD_COLUMNS;
        } else if (cardTitle === 'Avg Utilisation') {
            endpoint = 'GetAvgUtilisationDetail';
            columns = UTIL_COLUMNS;
        } else if (cardTitle === 'Downtime (mins)') {
            endpoint = 'GetDowntimeDetail';
            columns = DOWNTIME_COLUMNS;
        } else if (cardTitle === 'Breakdown Count') {
            endpoint = 'GetBreakdownCountDetail';
            columns = BREAKDOWN_COLUMNS;
        } else if (cardTitle === 'Machine Load') {
            endpoint = 'GetMachineLoadDetail';
            columns = LOAD_COLUMNS;
            payload.ToDate = isDateUserSelected ? toDate : GetDate();
        } else {
            endpoint = 'GetJobStatusDetail';
            columns = JOB_COLUMNS;
            if (cardTitle === 'Jobs Completed') payload.Status = 'Completed';
            else if (cardTitle === 'Jobs In Progress') payload.Status = 'InProgress';
            else payload.Status = 'Pending';
        }

        setDetailModal({ open: true, title: cardTitle, columns, rows: [], loading: true });
        try {
            const res = await postRequest(endpoint, payload);
            setDetailModal(prev => ({ ...prev, rows: res?.data ?? [], loading: false }));
        } catch {
            setDetailModal(prev => ({ ...prev, loading: false }));
        }
    }, [companyId, fromDate, toDate, isDateUserSelected]);

    const prodCards = [
        { title: 'Sheets Produced', value: prodKpi.sheetsProduced.current, color: '#3b82f6', icon: Layers },
        { title: 'Books Produced', value: prodKpi.booksProduced.current, color: '#6366f1', icon: Activity },
        { title: 'Jobs Completed', value: prodKpi.completed.current, color: '#10b981', icon: CheckCircle2 },
        { title: 'Jobs In Progress', value: prodKpi.inProgress.current, color: '#f59e0b', icon: Clock },
        { title: 'Jobs Pending', value: prodKpi.pending.current, color: '#8b5cf6', icon: AlertCircle },
    ];

    const filteredMachineCharts = useMemo(() => {
        if (machineFilter === 'All') return charts;
        const filterArr = (arr) => arr.filter(m => (m.MachineName || m.Machine || '') === machineFilter);
        const oeeIdx = charts.machineOeeBreakdown.labels.indexOf(machineFilter);
        const sgIdx = charts.speedGapData.labels.indexOf(machineFilter);
        const dtIdx = charts.downtimeAnalysis.labels.indexOf(machineFilter);
        return {
            ...charts,
            machineLoadData: filterArr(charts.machineLoadData),
            machineOeeBreakdown: oeeIdx >= 0 ? {
                labels: [machineFilter],
                availability: [charts.machineOeeBreakdown.availability[oeeIdx]],
                performance: [charts.machineOeeBreakdown.performance[oeeIdx]],
                quality: [charts.machineOeeBreakdown.quality[oeeIdx]],
                oee: [charts.machineOeeBreakdown.oee[oeeIdx]],
            } : charts.machineOeeBreakdown,
            speedGapData: sgIdx >= 0 ? {
                labels: [machineFilter],
                actual: [charts.speedGapData.actual[sgIdx]],
                standard: [charts.speedGapData.standard[sgIdx]],
            } : charts.speedGapData,
            downtimeAnalysis: dtIdx >= 0 ? {
                labels: [machineFilter],
                datasets: charts.downtimeAnalysis.datasets.map(ds => ({ ...ds, data: [ds.data[dtIdx]] })),
            } : charts.downtimeAnalysis,
            utilisationData: filterArr(charts.utilisationData),
            downtimeTimeline: filterArr(charts.downtimeTimeline),
            machineReliability: filterArr(charts.machineReliability),
        };
    }, [charts, machineFilter]);

    const filteredMachKpi = useMemo(() => {
        if (machineFilter === 'All') return machKpi;

        const utilRow = filteredMachineCharts.utilisationData?.[0];
        const avgUtil = utilRow != null
            ? parseFloat(utilRow['Utilisation %'] ?? utilRow['Utilisation'] ?? utilRow.UtilisationPercent ?? 0)
            : machKpi.avgUtilisation.current;

        const downtime = (filteredMachineCharts.downtimeTimeline ?? [])
            .reduce((s, d) => s + parseFloat(d.TotalJobChangeMinutes ?? d.JobChangeTimeMinutes ?? 0), 0);

        const breakdown = (filteredMachineCharts.machineReliability ?? [])
            .reduce((s, d) => s + parseFloat(
                d.BreakdownCount ?? d.BreakDown ?? d.TotalBreakdowns ?? d.NumberOfBreakdowns ?? d.BreakDownCount ?? 0
            ), 0);

        const loadRow = filteredMachineCharts.machineLoadData?.[0];
        const load = loadRow != null
            ? parseFloat(loadRow.AverageLoadPercent ?? loadRow.LoadPercent ?? 0)
            : machKpi.machineLoad.current;

        return {
            avgUtilisation: { current: avgUtil },
            totalDowntime: { current: downtime },
            breakdownCount: { current: breakdown },
            machineLoad: { current: load },
        };
    }, [machineFilter, filteredMachineCharts, machKpi]);

    const machCards = [
        { title: 'Avg Utilisation', value: filteredMachKpi.avgUtilisation.current, color: '#10b981', icon: Gauge, suffix: '%' },
        { title: 'Downtime (mins)', value: filteredMachKpi.totalDowntime.current, color: '#ef4444', icon: Clock },
        { title: 'Breakdown Count', value: filteredMachKpi.breakdownCount.current, color: '#f59e0b', icon: AlertTriangle },
        { title: 'Machine Load', value: filteredMachKpi.machineLoad.current, color: '#6366f1', icon: Activity, suffix: '%' },
    ];

    /* ── Machine filter helpers ── */
    const machineNames = useMemo(() => {
        const names = new Set();
        // Collect from all chart sources that have machine names
        (charts.dailyProduction.labels ?? []).forEach(n => n && names.add(n));
        (charts.machineEfficiency.labels ?? []).forEach(n => n && names.add(n));
        (charts.machineOeeBreakdown.labels ?? []).forEach(n => n && names.add(n));
        (charts.speedGapData.labels ?? []).forEach(n => n && names.add(n));
        (charts.downtimeAnalysis.labels ?? []).forEach(n => n && names.add(n));
        charts.machineLoadData.forEach(m => { if (m.MachineName) names.add(m.MachineName); });
        return Array.from(names).sort();
    }, [charts.dailyProduction, charts.machineEfficiency, charts.machineOeeBreakdown, charts.speedGapData, charts.downtimeAnalysis, charts.machineLoadData]);

    const filteredMachineNames = useMemo(() =>
        machineSearchText.trim()
            ? machineNames.filter(n => n.toLowerCase().includes(machineSearchText.toLowerCase()))
            : machineNames,
        [machineNames, machineSearchText]
    );

    /* close dropdown on outside click */
    useEffect(() => {
        const handler = (e) => {
            if (
                machineFilterRef.current && !machineFilterRef.current.contains(e.target) &&
                machineDropdownRef.current && !machineDropdownRef.current.contains(e.target)
            )
                setMachineSearchOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <Box sx={{
            minHeight: "100vh", bgcolor: T.bg, fontFamily: T.font,
            backgroundImage: [
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,58,95,0.07) 0%, transparent 70%)",
                "radial-gradient(circle, #cbd5e133 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "100% 100%, 28px 28px",
        }}>
            <DashboardHeader
                title="Production Dashboard"
                lastUpdated={lastUpdated}
                onRefresh={fetchData}
                loading={loading}
                controls={
                    <>
                    {/* Tab Pills */}
                    <Box sx={{
                        display: "flex", gap: 0.5, flexShrink: 0,
                        background: "linear-gradient(145deg, #ffffff, #f8fafc)",
                        p: "5px", borderRadius: "14px",
                        border: `1.5px solid ${T.border}`,
                        boxShadow: T.shadowSm,
                    }}>
                        {[
                            { key: 'production', label: 'Production', color: T.primary },
                            { key: 'machine', label: 'Machine', color: T.amber },
                        ].map(tab => {
                            const active = activeTab === tab.key;
                            return (
                                <Box
                                    key={tab.key}
                                    component="button"
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        if (tab.key !== 'machine') {
                                            setMachineFilter('All');
                                            setMachineSearchOpen(false);
                                            setMachineSearchText('');
                                        }
                                    }}
                                    sx={{
                                        px: 4, py: 1, borderRadius: "10px",
                                        fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                                        border: "none", outline: "none",
                                        fontFamily: T.font, letterSpacing: "0.02em",
                                        transition: "all 0.28s cubic-bezier(0.34,1.56,0.64,1)",
                                        bgcolor: active ? tab.color : "transparent",
                                        color: active ? "#fff" : T.textMuted,
                                        boxShadow: active ? `0 4px 16px ${tab.color}40` : "none",
                                        transform: active ? "scale(1.02)" : "scale(1)",
                                        "&:hover": {
                                            bgcolor: active ? tab.color : "#f1f5f9",
                                            transform: active ? "scale(1.04)" : "scale(1.02)",
                                        },
                                    }}
                                >
                                    {tab.label}
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Production Unit + Compare Mode + Machine Wise — inline with tabs on desktop */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {/* ── Production Unit Filter ── visible on both tabs when data exists */}
                    {showProductionUnitFilter && (
                        <Box ref={puFilterRef} sx={{ position: 'relative', zIndex: 10, animation: `${fadeUp} 0.3s ease both` }}>
                            <Box
                                ref={puBtnRef}
                                component="button"
                                onClick={() => {
                                    if (puBtnRef.current) {
                                        const r = puBtnRef.current.getBoundingClientRect();
                                        setPuDropdownPos({ top: r.bottom + 8, left: r.left });
                                    }
                                    setPuDropdownOpen(p => !p);
                                }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    px: 2, py: '7px', borderRadius: '12px',
                                    border: `1.5px solid ${selectedProductionUnit !== 'All' ? T.teal : T.border}`,
                                    bgcolor: selectedProductionUnit !== 'All' ? `${T.teal}15` : '#ffffff',
                                    cursor: 'pointer', outline: 'none', fontFamily: T.font,
                                    maxWidth: { xs: '180px', sm: '220px' },
                                    minWidth: 0, overflow: 'hidden',
                                    boxShadow: selectedProductionUnit !== 'All'
                                        ? `0 0 0 3px ${T.teal}22, 0 2px 8px rgba(0,0,0,0.07)`
                                        : '0 2px 8px rgba(15,23,42,0.07)',
                                    transition: 'all 0.22s ease',
                                    '&:hover': { borderColor: T.teal, bgcolor: `${T.teal}10` },
                                }}
                            >
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                    <rect x="2" y="2" width="5" height="5" rx="1.5" fill={selectedProductionUnit !== 'All' ? T.teal : T.textMuted} />
                                    <rect x="9" y="2" width="5" height="5" rx="1.5" fill={selectedProductionUnit !== 'All' ? T.teal : T.textMuted} opacity="0.5" />
                                    <rect x="2" y="9" width="5" height="5" rx="1.5" fill={selectedProductionUnit !== 'All' ? T.teal : T.textMuted} opacity="0.5" />
                                    <rect x="9" y="9" width="5" height="5" rx="1.5" fill={selectedProductionUnit !== 'All' ? T.teal : T.textMuted} opacity="0.3" />
                                </svg>
                                <Typography sx={{
                                    fontSize: '0.74rem', fontWeight: 800,
                                    color: selectedProductionUnit !== 'All' ? T.teal : T.textMuted,
                                    letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: { xs: '110px', sm: '160px' },
                                }}>
                                    {selectedProductionUnit !== 'All'
                                        ? (productionUnits.find(u => String(u.ProductionUnitID) === String(selectedProductionUnit))?.ProductionUnitName ?? selectedProductionUnit)
                                        : 'Production Unit'}
                                </Typography>
                                {selectedProductionUnit !== 'All' && (
                                    <Box
                                        component="span"
                                        onClick={(e) => { e.stopPropagation(); setSelectedProductionUnit('All'); setPuDropdownOpen(false); }}
                                        sx={{
                                            ml: 0.5, width: 16, height: 16, borderRadius: '50%',
                                            bgcolor: T.teal, color: '#fff', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer', lineHeight: 1,
                                        }}
                                    >✕</Box>
                                )}
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, transition: 'transform 0.2s', transform: puDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <path d="M2 3.5L5 6.5L8 3.5" stroke={T.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Box>

                            {/* Dropdown rendered via portal — see below the DashboardHeader */}
                            {false && (
                                <Box sx={{ display: 'none' }}>
                                    <Box sx={{ px: 2, py: '10px', borderBottom: `1px solid ${T.borderLight}`, bgcolor: '#fafbfc' }}>
                                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                            Production Unit
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        maxHeight: 220, overflowY: 'auto', py: '6px',
                                        '&::-webkit-scrollbar': { width: '4px' },
                                        '&::-webkit-scrollbar-thumb': { bgcolor: T.border, borderRadius: '4px' },
                                    }}>
                                        <Box
                                            component="button"
                                            onClick={() => { setSelectedProductionUnit('All'); setPuDropdownOpen(false); }}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                width: '100%', px: 2, py: '9px',
                                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                                bgcolor: selectedProductionUnit === 'All' ? `${T.teal}12` : 'transparent',
                                                fontFamily: T.font,
                                                '&:hover': { bgcolor: `${T.teal}10` },
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selectedProductionUnit === 'All' ? T.teal : T.border }} />
                                            <Typography sx={{ fontSize: '0.73rem', fontWeight: selectedProductionUnit === 'All' ? 800 : 600, color: selectedProductionUnit === 'All' ? T.teal : T.textMuted }}>
                                                All Units
                                            </Typography>
                                        </Box>
                                        {productionUnits.map(unit => {
                                            const isActive = String(selectedProductionUnit) === String(unit.ProductionUnitID);
                                            return (
                                                <Box
                                                    key={unit.ProductionUnitID}
                                                    component="button"
                                                    onClick={() => { setSelectedProductionUnit(String(unit.ProductionUnitID)); setPuDropdownOpen(false); }}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                                        width: '100%', px: 2, py: '9px',
                                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        bgcolor: isActive ? `${T.teal}12` : 'transparent',
                                                        fontFamily: T.font,
                                                        '&:hover': { bgcolor: `${T.teal}10` },
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isActive ? T.teal : T.border }} />
                                                    <Typography sx={{ fontSize: '0.73rem', fontWeight: isActive ? 800 : 600, color: isActive ? T.teal : T.textMuted }}>
                                                        {unit.ProductionUnitName ?? unit.ProductionUnit ?? `Unit ${unit.ProductionUnitID}`}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    )}

                    {/* ── Compare Mode toggle ── only on Production tab */}
                    {activeTab === 'production' && (
                        <Box
                            component="button"
                            onClick={toggleCompareMode}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1,
                                px: 2, py: '7px', borderRadius: '12px', cursor: 'pointer',
                                border: `1.5px solid ${compareMode ? '#7c3aed' : T.border}`,
                                bgcolor: compareMode ? '#7c3aed' : '#ffffff',
                                outline: 'none', fontFamily: T.font,
                                boxShadow: compareMode
                                    ? '0 4px 16px rgba(124,58,237,0.35)'
                                    : '0 2px 8px rgba(15,23,42,0.07)',
                                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                                '&:hover': {
                                    borderColor: '#7c3aed',
                                    bgcolor: compareMode ? '#6d28d9' : '#f5f3ff',
                                },
                                animation: `${fadeUp} 0.3s ease both`,
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <rect x="1" y="2" width="6" height="12" rx="1.5" fill={compareMode ? '#fff' : '#7c3aed'} opacity="0.9" />
                                <rect x="9" y="2" width="6" height="12" rx="1.5" fill={compareMode ? '#fff' : '#7c3aed'} opacity="0.5" />
                            </svg>
                            <Typography sx={{
                                fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.02em', whiteSpace: 'nowrap',
                                color: compareMode ? '#fff' : '#7c3aed',
                            }}>
                                {compareMode ? 'Exit Compare' : 'Compare Mode'}
                            </Typography>
                            {compareMode && compareData.loading && (
                                <CircularProgress size={11} sx={{ color: '#fff', ml: 0.5 }} />
                            )}
                        </Box>
                    )}

                    {/* ── Machine Wise Filter ── visible only on Machine tab */}
                    {activeTab === 'machine' && (
                        <Box ref={machineFilterRef} sx={{ position: 'relative', zIndex: 10, animation: `${fadeUp} 0.3s ease both` }}>
                            {/* Trigger button */}
                            <Box
                                ref={machineBtnRef}
                                component="button"
                                onClick={() => {
                                    if (machineBtnRef.current) {
                                        const r = machineBtnRef.current.getBoundingClientRect();
                                        setMachineDropdownPos({ top: r.bottom + 8, left: r.left });
                                    }
                                    setMachineSearchOpen(p => !p);
                                }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    px: 2, py: '7px', borderRadius: '12px',
                                    border: `1.5px solid ${machineFilter !== 'All' ? T.amber : T.border}`,
                                    bgcolor: machineFilter !== 'All' ? `${T.amber}15` : '#ffffff',
                                    cursor: 'pointer', outline: 'none', fontFamily: T.font,
                                    boxShadow: machineFilter !== 'All'
                                        ? `0 0 0 3px ${T.amber}22, 0 2px 8px rgba(0,0,0,0.07)`
                                        : '0 2px 8px rgba(15,23,42,0.07)',
                                    transition: 'all 0.22s ease',
                                    "&:hover": { borderColor: T.amber, bgcolor: `${T.amber}10` },
                                }}
                            >
                                {/* Filter icon */}
                                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 4h12M5 8h6M7 12h2" stroke={machineFilter !== 'All' ? T.amber : T.textMuted} strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                                <Typography sx={{
                                    fontSize: '0.74rem', fontWeight: 800, color: machineFilter !== 'All' ? T.amber : T.textMuted,
                                    letterSpacing: '0.02em', whiteSpace: 'nowrap',
                                }}>
                                    {machineFilter !== 'All' ? machineFilter : 'Machine Wise'}
                                </Typography>
                                {machineFilter !== 'All' && (
                                    <Box
                                        component="span"
                                        onClick={(e) => { e.stopPropagation(); setMachineFilter('All'); setMachineSearchText(''); }}
                                        sx={{
                                            ml: 0.5, width: 16, height: 16, borderRadius: '50%',
                                            bgcolor: T.amber, color: '#fff', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer',
                                            lineHeight: 1,
                                        }}
                                    >
                                        ✕
                                    </Box>
                                )}
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, transition: 'transform 0.2s', transform: machineSearchOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <path d="M2 3.5L5 6.5L8 3.5" stroke={T.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Box>

                        </Box>
                    )}
                    </Box> {/* end sub-row 2 */}
                    </>
                }
            >
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={handleSetToDate}
                    onApply={() => { }}
                />
            </DashboardHeader>

            {/* ── Production Unit dropdown — portal so it escapes sticky header ── */}
            {puDropdownOpen && createPortal(
                <Box ref={puFilterRef} sx={{
                    position: 'fixed',
                    top: puDropdownPos.top,
                    left: puDropdownPos.left,
                    zIndex: 9999,
                    minWidth: 220,
                    bgcolor: '#ffffff',
                    borderRadius: '14px',
                    border: `1.5px solid ${T.border}`,
                    boxShadow: '0 16px 48px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.08)',
                    overflow: 'hidden',
                    animation: `${fadeUp} 0.2s ease both`,
                }}>
                    <Box sx={{ px: 2, py: '10px', borderBottom: `1px solid ${T.borderLight}`, bgcolor: '#fafbfc' }}>
                        <Typography sx={{ fontSize: '0.68rem', fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Production Unit
                        </Typography>
                    </Box>
                    <Box sx={{ maxHeight: 220, overflowY: 'auto', py: '6px', '&::-webkit-scrollbar': { width: '4px' }, '&::-webkit-scrollbar-thumb': { bgcolor: T.border, borderRadius: '4px' } }}>
                        <Box component="button"
                            onClick={() => { setSelectedProductionUnit('All'); setPuDropdownOpen(false); }}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', px: 2, py: '9px', border: 'none', cursor: 'pointer', textAlign: 'left', bgcolor: selectedProductionUnit === 'All' ? `${T.teal}12` : 'transparent', fontFamily: T.font, '&:hover': { bgcolor: `${T.teal}10` }, transition: 'background 0.15s' }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: selectedProductionUnit === 'All' ? T.teal : T.border }} />
                            <Typography sx={{ fontSize: '0.73rem', fontWeight: selectedProductionUnit === 'All' ? 800 : 600, color: selectedProductionUnit === 'All' ? T.teal : T.textMuted }}>All Units</Typography>
                        </Box>
                        {productionUnits.map(unit => {
                            const isActive = String(selectedProductionUnit) === String(unit.ProductionUnitID);
                            return (
                                <Box key={unit.ProductionUnitID} component="button"
                                    onClick={() => { setSelectedProductionUnit(String(unit.ProductionUnitID)); setPuDropdownOpen(false); }}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', px: 2, py: '9px', border: 'none', cursor: 'pointer', textAlign: 'left', bgcolor: isActive ? `${T.teal}12` : 'transparent', fontFamily: T.font, '&:hover': { bgcolor: `${T.teal}10` }, transition: 'background 0.15s' }}>
                                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isActive ? T.teal : T.border }} />
                                    <Typography sx={{ fontSize: '0.73rem', fontWeight: isActive ? 800 : 600, color: isActive ? T.teal : T.textMuted }}>
                                        {unit.ProductionUnitName ?? unit.ProductionUnit ?? `Unit ${unit.ProductionUnitID}`}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>,
                document.body
            )}

            {/* ── Machine Wise dropdown — portal so it escapes stacking contexts ── */}
            {machineSearchOpen && createPortal(
                <Box ref={machineDropdownRef} sx={{
                    position: 'fixed',
                    top: machineDropdownPos.top,
                    left: machineDropdownPos.left,
                    zIndex: 9999,
                    minWidth: 240,
                    bgcolor: '#ffffff',
                    borderRadius: '14px',
                    border: `1.5px solid ${T.border}`,
                    boxShadow: '0 16px 48px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.08)',
                    overflow: 'hidden',
                    animation: `${fadeUp} 0.2s ease both`,
                }}>
                    {/* Search input */}
                    <Box sx={{ p: '10px 12px', borderBottom: `1px solid ${T.borderLight}`, bgcolor: '#fafbfc' }}>
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            bgcolor: '#ffffff', borderRadius: '8px',
                            border: `1.5px solid ${T.border}`,
                            px: 1.2, py: '5px',
                            '&:focus-within': { borderColor: T.amber, boxShadow: `0 0 0 3px ${T.amber}20` },
                            transition: 'all 0.18s ease',
                        }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <circle cx="7" cy="7" r="4.5" stroke={T.textFaint} strokeWidth="1.6" />
                                <path d="M10.5 10.5L13.5 13.5" stroke={T.textFaint} strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                            <Box
                                component="input"
                                autoFocus
                                placeholder="Search machine..."
                                value={machineSearchText}
                                onChange={e => setMachineSearchText(e.target.value)}
                                sx={{
                                    border: 'none', outline: 'none', width: '100%',
                                    fontSize: '0.74rem', fontWeight: 600, color: T.text,
                                    fontFamily: T.font, bgcolor: 'transparent',
                                    '&::placeholder': { color: T.textFaint },
                                }}
                            />
                        </Box>
                    </Box>
                    {/* List */}
                    <Box sx={{
                        maxHeight: 220, overflowY: 'auto', py: '6px',
                        '&::-webkit-scrollbar': { width: '4px' },
                        '&::-webkit-scrollbar-thumb': { bgcolor: T.border, borderRadius: '4px' },
                    }}>
                        <Box
                            component="button"
                            onClick={() => { setMachineFilter('All'); setMachineSearchOpen(false); setMachineSearchText(''); }}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                width: '100%', px: 2, py: '9px',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                bgcolor: machineFilter === 'All' ? `${T.amber}12` : 'transparent',
                                fontFamily: T.font,
                                "&:hover": { bgcolor: `${T.amber}10` },
                                transition: 'background 0.15s',
                            }}
                        >
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: machineFilter === 'All' ? T.amber : T.border }} />
                            <Typography sx={{ fontSize: '0.73rem', fontWeight: machineFilter === 'All' ? 800 : 600, color: machineFilter === 'All' ? T.amber : T.textMuted }}>
                                All Machines
                            </Typography>
                        </Box>
                        {filteredMachineNames.length === 0 ? (
                            <Typography sx={{ fontSize: '0.7rem', color: T.textFaint, textAlign: 'center', py: 2 }}>No machines found</Typography>
                        ) : filteredMachineNames.map(name => (
                            <Box
                                key={name}
                                component="button"
                                onClick={() => { setMachineFilter(name); setMachineSearchOpen(false); setMachineSearchText(''); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    width: '100%', px: 2, py: '9px',
                                    border: 'none', cursor: 'pointer', textAlign: 'left',
                                    bgcolor: machineFilter === name ? `${T.amber}12` : 'transparent',
                                    fontFamily: T.font,
                                    "&:hover": { bgcolor: `${T.amber}10` },
                                    transition: 'background 0.15s',
                                }}
                            >
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: machineFilter === name ? T.amber : T.borderLight, flexShrink: 0 }} />
                                <Typography sx={{
                                    fontSize: '0.73rem', fontWeight: machineFilter === name ? 800 : 600,
                                    color: machineFilter === name ? T.amber : T.text,
                                    lineHeight: 1.3,
                                }}>
                                    {name}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>,
                document.body
            )}

            <Box sx={{ width: "100%", px: R.headerPx, pt: 1.5 }}>
                {activeTab === 'production' && compareMode ? (
                    /* ── Compare Mode: row-based layout ── */
                    <CompareView compareData={compareData} />
                ) : activeTab === 'production' ? (
                    /* ── Normal Production view ── */
                    <Box sx={{ animation: `${fadeUp} 0.45s ease both` }}>
                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.kpi5,
                            gap: R.gap,
                            mb: R.sectionMb,
                        }}>
                            {prodCards.map((c, i) => (
                                <KpiCard key={i} title={c.title} value={c.value} color={c.color} icon={c.icon} animDelay={i * 80} onInfoClick={() => openDetailModal(c.title)} />
                            ))}
                        </Box>

                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.main2side1,
                            gap: R.gapChart,
                            mb: R.sectionMb,
                        }}>
                            <ChartCard title="Daily Production Summary" subtitle="Total books produced over current period"
                                accentA="#3b82f6" accentB="#60a5fa" animDelay={350}>
                                <DashboardChart data={charts.dailyProduction} type="line"
                                    options={{ interaction: { mode: 'index', intersect: false } }} />
                            </ChartCard>
                            <ChartCard title="Operation Status" subtitle="Job distribution across stages"
                                accentA={T.green} accentB="#34d399" animDelay={420}>
                                <DashboardChart data={charts.jobStatus} type="doughnut" />
                            </ChartCard>
                        </Box>

                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.charts2,
                            gap: R.gapChart,
                            mb: R.sectionMb,
                        }}>
                            <ChartCard title="Shift-wise Production" subtitle="Output distribution per shift"
                                accentA={T.purple} accentB="#a78bfa" animDelay={490}>
                                <DashboardChart data={charts.shiftProduction} type="bar" />
                            </ChartCard>
                            <ChartCard title="Binding & Finishing" subtitle="Overall binding department output"
                                accentA="#ec4899" accentB="#f9a8d4" animDelay={560}>
                                <DashboardChart data={charts.makeReadyTime} type="bar" />
                            </ChartCard>
                        </Box>

                        <ChartCard title="Production by Process & Machine" subtitle="Detailed breakdown by process and shifts"
                            accentA={T.primary} accentB={T.sky} animDelay={630}>
                            <ProductionByProcessChart data={charts.productionByProcess} onBarClick={handleProcessBarClick} />
                        </ChartCard>
                    </Box>
                ) : (
                    <Box sx={{ animation: `${fadeUp} 0.45s ease both` }}>

                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.kpi4,
                            gap: R.gap,
                            mb: R.sectionMb,
                        }}>
                            {machCards.map((c, i) => (
                                <KpiCard key={i} title={c.title} value={c.value} color={c.color} icon={c.icon} suffix={c.suffix} animDelay={i * 80} onInfoClick={() => openDetailModal(c.title)} />
                            ))}
                        </Box>

                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.charts3,
                            gap: R.gapChart,
                            mb: R.sectionMb,
                        }}>
                            <ChartCard title="Machine Load (Target vs Actual)" subtitle="Load % across machines"
                                accentA={T.green} accentB="#34d399" animDelay={350}>
                                <MachineLoadChart data={filteredMachineCharts.machineLoadData} />
                            </ChartCard>
                            <ChartCard title="Machine OEE Breakdown" subtitle="Availability, Performance, Quality"
                                accentA={T.purple} accentB="#a78bfa" animDelay={420}>
                                <MachineOEEBreakdownChart data={filteredMachineCharts.machineOeeBreakdown} />
                            </ChartCard>
                            <ChartCard title="Speed Gap" subtitle="Actual vs Standard Speed"
                                accentA={T.amber} accentB="#fbbf24" animDelay={490}>
                                <SpeedGapChart data={filteredMachineCharts.speedGapData} />
                            </ChartCard>
                        </Box>

                        <Box sx={{
                            display: "grid",
                            gridTemplateColumns: GRID.charts2,
                            gap: R.gapChart,
                            mb: R.sectionMb,
                        }}>
                            <ChartCard title="Utilisation" subtitle="Machine utilisation across the period"
                                accentA="#3b82f6" accentB="#60a5fa" animDelay={560}>
                                <UtilisationVsTargetChart data={filteredMachineCharts.utilisationData} />
                            </ChartCard>
                            <ChartCard title="Downtime Analysis" subtitle="Root Cause Breakdown by Machine"
                                accentA={T.red} accentB="#f87171" animDelay={630}>
                                <DowntimeAnalysisChart data={filteredMachineCharts.downtimeAnalysis} />
                            </ChartCard>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                            <ChartCard title="Downtime Timeline (Gantt View)" subtitle="Breakdown duration and frequency across machines"
                                accentA="#f43f5e" accentB="#fb7185" animDelay={700}>
                                <DowntimeTimelineChart data={filteredMachineCharts.downtimeTimeline} />
                            </ChartCard>
                        </Box>

                        <ChartCard title="Machine Reliability Analysis" subtitle="Performance scoring based on breakdown frequency and repair time"
                            accentA={T.teal} accentB="#2dd4bf" animDelay={770}>
                            <MachineReliabilityTable data={filteredMachineCharts.machineReliability} />
                        </ChartCard>
                    </Box>
                )}
            </Box>

            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity="info" sx={{ width: "100%", borderRadius: "12px", boxShadow: T.shadowMd }}>{snackbarMessage}</Alert>
            </Snackbar>

            <DetailModal
                open={detailModal.open}
                onClose={() => setDetailModal(prev => ({ ...prev, open: false }))}
                title={detailModal.title}
                columns={detailModal.columns}
                rows={detailModal.rows}
                loading={detailModal.loading}
                fromDate={fromDate}
                toDate={toDate}
            />
        </Box>
    );
};

export default ProductionDashboard;