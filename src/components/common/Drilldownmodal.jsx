import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box, Typography, Dialog,
    IconButton, InputAdornment, TextField, CircularProgress,
    Tooltip
} from '@mui/material';
import { X, Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { T, R, FONT, SHADOW, SCROLLBAR } from './dashboardTokens';


const PAGE_SIZE_OPTIONS = [15, 30, 50];

/* ── small filter icon on column header ── */
const ColIcon = () => (
    <Box component="span" sx={{ ml: 0.4, opacity: 0.4, display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', lineHeight: 0 }}>
        <Filter size={10} strokeWidth={2} />
    </Box>
);

/* ── status badge colour map ── */
function statusStyle(status) {
    const s = (status ?? '').toLowerCase();
    if (s.includes('approv') || s.includes('paid') || s.includes('closed') || s === 'good')
        return { bgcolor: '#dcfce7', color: '#15803d' };
    if (s.includes('partial'))
        return { bgcolor: '#fef9c3', color: '#92400e' };
    if (s.includes('overdue') || s.includes('reject') || s.includes('delay'))
        return { bgcolor: '#fee2e2', color: '#dc2626' };
    if (s.includes('due soon'))
        return { bgcolor: '#fff7ed', color: '#c2410c' };
    if (s.includes('pending') || s.includes('hold') || s === 'low')
        return { bgcolor: '#fef3c7', color: '#b45309' };
    return { bgcolor: '#f1f5f9', color: '#475569' };
}

const DrillDownModal = ({ open, onClose, title, columns = [], rows = [], loading = false }) => {

    const [globalSearch, setGlobalSearch] = useState('');
    const [colSearch,    setColSearch]    = useState({});
    const [sortKey,      setSortKey]      = useState(null);
    const [sortDir,      setSortDir]      = useState('asc');
    const [pageSize,     setPageSize]     = useState(15);
    const [page,         setPage]         = useState(1);
    const [groupBy,      setGroupBy]      = useState(null);
    const [dropActive,   setDropActive]   = useState(false);

    /* reset every time modal opens fresh */
    useEffect(() => {
        if (open) {
            setGlobalSearch('');
            setColSearch({});
            setSortKey(null);
            setSortDir('asc');
            setPage(1);
            setPageSize(15);
            setGroupBy(null);
        }
    }, [open, title]);

    /* ── pipeline: filter → sort ── */
    const filtered = useMemo(() => {
        let d = [...rows];

        if (globalSearch.trim()) {
            const q = globalSearch.trim().toLowerCase();
            d = d.filter(row => columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(q)));
        }

        Object.entries(colSearch).forEach(([k, v]) => {
            if (!v.trim()) return;
            const q = v.trim().toLowerCase();
            d = d.filter(row => String(row[k] ?? '').toLowerCase().includes(q));
        });

        if (sortKey) {
            d.sort((a, b) => {
                const av = String(a[sortKey] ?? '');
                const bv = String(b[sortKey] ?? '');
                return sortDir === 'asc' ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true });
            });
        }

        return d;
    }, [rows, globalSearch, colSearch, sortKey, sortDir, columns]);

    /* ── Group rows when groupBy is active ── */
    const groupedRows = useMemo(() => {
        if (!groupBy) return null;
        const map = new Map();
        filtered.forEach(row => {
            const key = String(row[groupBy] ?? '(blank)');
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
        });
        // flatten into: [{_isGroupHeader, _groupKey, _groupCount}, ...rows, ...]
        const flat = [];
        map.forEach((rows, key) => {
            flat.push({ _isGroupHeader: true, _groupKey: key, _groupCount: rows.length });
            rows.forEach(r => flat.push(r));
        });
        return flat;
    }, [filtered, groupBy]);

    // when grouped, paginate the flat list; when not grouped, paginate filtered
    const displayRows = groupedRows ?? filtered;
    const totalPages = Math.max(1, Math.ceil(displayRows.length / pageSize));

    const pageRows = useMemo(() => {
        const s = (page - 1) * pageSize;
        return displayRows.slice(s, s + pageSize);
    }, [displayRows, page, pageSize]);

    /* ── Column totals: auto-detect numeric columns across ALL filtered rows ── */
    const columnTotals = useMemo(() => {
        if (!filtered.length) return {};
        const totals = {};
        columns.forEach(col => {
            const vals = filtered.map(r => r[col.key]).filter(v => v != null && v !== '');
            if (!vals.length) return;
            const nums = vals.map(v => parseFloat(String(v).replace(/,/g, '')));
            if (nums.every(n => !isNaN(n))) {
                totals[col.key] = nums.reduce((a, b) => a + b, 0);
            }
        });
        return totals;
    }, [filtered, columns]);

    const hasTotals = Object.keys(columnTotals).length > 0;

    const fmtTotal = (v) => {
        if (v == null) return '';
        if (Number.isInteger(v)) return v.toLocaleString('en-IN');
        return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleSort = useCallback((key) => {
        setSortKey(prev => {
            if (prev === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return key; }
            setSortDir('asc'); return key;
        });
        setPage(1);
    }, []);

    const handleColSearch = useCallback((key, val) => {
        setColSearch(prev => ({ ...prev, [key]: val }));
        setPage(1);
    }, []);

    /* ── CSV export ── */
    const handleExport = useCallback(() => {
        if (!filtered.length || !columns.length) return;
        const hdr  = columns.map(c => `"${c.label}"`).join(',');
        const body = filtered.map(r => columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([hdr + '\n' + body], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `${(title || 'export').replace(/\s+/g, '_')}_drilldown.csv`;
        a.click(); URL.revokeObjectURL(url);
    }, [filtered, columns, title]);

    /* page button range: current ±1, capped to [1, totalPages] */
    const pageRange = useMemo(() => {
        const start = Math.max(1, page - 1);
        const end   = Math.min(totalPages, start + 2);
        const r = [];
        for (let i = start; i <= end; i++) r.push(i);
        return r;
    }, [page, totalPages]);

    /* ── shared cell sx ── */
    const cellBase = {
        px: 1.5, py: 0.95,
        borderBottom: '1px solid #f1f5f9',
        borderRight:  '1px solid #f8fafc',
        fontSize: '0.78rem', color: '#334155', fontWeight: 500,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        '&:last-child': { borderRight: 'none' },
    };

    /* compute minimum table width so horizontal scroll kicks in before columns squash */
    const minTableWidth = columns.reduce((sum, c) => sum + (c.width || 120), 0);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            fullScreen={false}
            PaperProps={{
                sx: {
                    /* on xs use nearly full screen; on larger screens use 90vw capped at 1160 */
                    width:     { xs: '100vw', sm: '95vw', md: '90vw' },
                    maxWidth:  { xs: '100vw', sm: '95vw', md: R.drillMaxWidth },
                    maxHeight: { xs: '100dvh', sm: '92vh', md: R.drillMaxH },
                    /* on xs: square corners, flush to screen edges */
                    borderRadius: { xs: 0, sm: R.radiusModal },
                    m: { xs: 0, sm: 2 },
                    boxShadow: SHADOW.modal,
                    fontFamily: T.font,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }
            }}
        >
            {/* ══ HEADER ══ */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2.2 },
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1a3550 100%)',
                flexShrink: 0,
                minHeight: 0,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                    <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: '#2dd4bf', boxShadow: '0 0 8px #2dd4bf99', flexShrink: 0,
                    }} />
                    <Typography sx={{
                        fontSize: { xs: '0.85rem', sm: '1.05rem' },
                        fontWeight: 800, letterSpacing: '-0.02em',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        <Box component="span" sx={{ color: '#2dd4bf' }}>View: </Box>
                        <Box component="span" sx={{ color: '#f1f5f9' }}>{title}</Box>
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose} size="small"
                    sx={{
                        flexShrink: 0, ml: 1,
                        color: '#94a3b8', bgcolor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: '8px', width: 30, height: 30,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.16)', color: '#f1f5f9' }
                    }}
                >
                    <X size={16} strokeWidth={2.5} />
                </IconButton>
            </Box>

            {/* ══ TOOLBAR ══ */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: { xs: 1.5, sm: 3 }, py: { xs: 0.8, sm: 1.2 },
                borderBottom: `1px solid ${T.borderLight}`,
                flexShrink: 0, flexWrap: 'wrap',
            }}>
                {/* Drop zone — hidden on mobile (drag-and-drop not usable on touch) */}
                <Box
                    onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
                    onDragLeave={() => setDropActive(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        const k = e.dataTransfer.getData('colKey');
                        if (k) setGroupBy(k);
                        setDropActive(false);
                    }}
                    sx={{
                        display: { xs: 'none', sm: 'flex' },
                        flex: 1, minWidth: 0,
                        fontSize: '0.71rem', fontWeight: 500, color: '#94a3b8',
                        border: dropActive ? '1.5px dashed #2e86ab' : '1.5px dashed #dde3ea',
                        borderRadius: '8px', px: 1.5, py: 0.6,
                        bgcolor: dropActive ? '#f0f8ff' : 'transparent',
                        alignItems: 'center', gap: 0.8,
                        transition: 'all 0.2s', userSelect: 'none',
                    }}
                >
                    <Filter size={12} strokeWidth={2} color={dropActive ? '#2e86ab' : '#cbd5e1'} />
                    {groupBy
                        ? <>Grouped by: <strong style={{ color: '#0f172a', marginLeft: 4 }}>{columns.find(c => c.key === groupBy)?.label ?? groupBy}</strong>
                            <Box component="span" onClick={() => setGroupBy(null)} sx={{ ml: 1, cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.75rem' }}>✕</Box>
                          </>
                        : 'Drag a column header here to group'
                    }
                </Box>

                {/* Search — full width on mobile */}
                <TextField
                    placeholder="Search..."
                    size="small"
                    value={globalSearch}
                    onChange={e => { setGlobalSearch(e.target.value); setPage(1); }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search size={13} strokeWidth={2} color={T.textFaint} /></InputAdornment>
                    }}
                    sx={{
                        flex: { xs: 1, sm: '0 0 auto' },
                        width: { xs: '100%', sm: 200 },
                        '& .MuiOutlinedInput-root': {
                            borderRadius: R.radiusBtn, fontSize: FONT.tableCell, height: 34, bgcolor: '#f8fafc',
                            '& fieldset': { borderColor: T.border },
                            '&:hover fieldset': { borderColor: T.textFaint },
                            '&.Mui-focused fieldset': { borderColor: '#2e86ab', borderWidth: 1.5 },
                        }
                    }}
                />

                {/* Export */}
                <Tooltip title="Export CSV" placement="top" arrow>
                    <IconButton
                        onClick={handleExport} size="small"
                        sx={{
                            flexShrink: 0,
                            bgcolor: '#f8fafc', border: '1px solid #e2e8f0',
                            borderRadius: '8px', width: 34, height: 34, color: '#475569',
                            '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8', color: '#0f172a' }
                        }}
                    >
                        <Download size={15} strokeWidth={2} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* ══ TABLE — horizontally scrollable ══ */}
            <Box sx={{ flex: 1, overflow: 'auto', position: 'relative', ...SCROLLBAR }}>
                {loading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
                        <CircularProgress size={30} sx={{ color: '#2e86ab' }} />
                    </Box>
                ) : (
                    <Box
                        component="table"
                        sx={{
                            /* auto layout + minWidth forces horizontal scroll instead of squashing */
                            minWidth: minTableWidth,
                            width: '100%',
                            borderCollapse: 'collapse',
                            tableLayout: 'auto',
                            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                        }}
                    >
                        <colgroup>
                            {columns.map(c => <col key={c.key} style={{ minWidth: c.width ? `${c.width}px` : '100px' }} />)}
                        </colgroup>

                        <Box component="thead">
                            {/* ── Column header row ── */}
                            <Box component="tr">
                                {columns.map(col => (
                                    <Box
                                        component="th"
                                        key={col.key}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('colKey', col.key)}
                                        onClick={() => handleSort(col.key)}
                                        sx={{
                                            position: 'sticky', top: 0, zIndex: 3,
                                            px: 1.5, py: 1.2,
                                            textAlign: 'left',
                                            fontWeight: 700, fontSize: '0.75rem',
                                            color: sortKey === col.key ? '#0f172a' : '#475569',
                                            /* solid bg on the cell itself — prevents bleed-through */
                                            bgcolor: sortKey === col.key ? '#eef2ff' : '#f8fafc',
                                            borderBottom: '1.5px solid #e2e8f0',
                                            borderRight: '1px solid #edf0f4',
                                            /* shadow seals any sub-pixel gap at the bottom edge */
                                            boxShadow: 'inset 0 -1.5px 0 #e2e8f0',
                                            cursor: 'pointer', userSelect: 'none',
                                            whiteSpace: 'nowrap',
                                            transition: 'background 0.14s',
                                            '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                                            '&:last-child': { borderRight: 'none' },
                                        }}
                                    >
                                        {col.label}
                                        <ColIcon />
                                        {sortKey === col.key && (
                                            <Box component="span" sx={{ ml: 0.4, fontSize: '0.6rem', opacity: 0.7 }}>
                                                {sortDir === 'asc' ? '▲' : '▼'}
                                            </Box>
                                        )}
                                    </Box>
                                ))}
                            </Box>

                            {/* ── Per-column search row ── */}
                            <Box component="tr">
                                {columns.map(col => (
                                    <Box
                                        component="td"
                                        key={col.key}
                                        sx={{
                                            position: 'sticky', top: '42px', zIndex: 2,
                                            /* solid white on the cell — not the row — prevents bleed-through */
                                            bgcolor: '#ffffff',
                                            px: 0.8, py: 0.5,
                                            borderBottom: '1.5px solid #e2e8f0',
                                            borderRight: '1px solid #edf0f4',
                                            boxShadow: 'inset 0 -1.5px 0 #e2e8f0',
                                            '&:last-child': { borderRight: 'none' },
                                        }}
                                    >
                                        <TextField
                                            size="small"
                                            placeholder="🔍"
                                            value={colSearch[col.key] || ''}
                                            onChange={e => handleColSearch(col.key, e.target.value)}
                                            sx={{
                                                width: '100%',
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '5px', fontSize: '0.72rem', height: 26, bgcolor: '#f8fafc',
                                                    '& fieldset': { borderColor: '#e9eef4' },
                                                    '&:hover fieldset': { borderColor: '#94a3b8' },
                                                    '&.Mui-focused fieldset': { borderColor: '#2e86ab', borderWidth: 1.5 },
                                                },
                                                '& input': { px: '6px', py: 0 },
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>

                        <Box component="tbody">
                            {pageRows.length === 0 ? (
                                <Box component="tr">
                                    <Box
                                        component="td"
                                        colSpan={columns.length}
                                        sx={{ textAlign: 'center', py: 7, color: '#94a3b8', fontSize: '0.82rem' }}
                                    >
                                        No records match your search criteria.
                                    </Box>
                                </Box>
                            ) : pageRows.map((row, ri) => {
                                /* ── Group header row ── */
                                if (row._isGroupHeader) {
                                    return (
                                        <Box component="tr" key={`grp-${ri}`}>
                                            <Box
                                                component="td"
                                                colSpan={columns.length}
                                                sx={{
                                                    px: 2, py: 0.8,
                                                    bgcolor: '#f1f5f9',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    borderTop: ri > 0 ? '2px solid #e2e8f0' : 'none',
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{
                                                        width: 6, height: 6, borderRadius: '50%',
                                                        bgcolor: '#2e86ab', flexShrink: 0,
                                                    }} />
                                                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>
                                                        {columns.find(c => c.key === groupBy)?.label ?? groupBy}:
                                                        <Box component="span" sx={{ color: '#2e86ab', ml: 0.5 }}>{row._groupKey}</Box>
                                                    </Typography>
                                                    <Box sx={{
                                                        ml: 'auto', bgcolor: '#dbeafe', color: '#1e40af',
                                                        fontSize: '0.65rem', fontWeight: 700,
                                                        px: 1, py: '2px', borderRadius: '5px',
                                                    }}>
                                                        {row._groupCount} rows
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                }

                                /* ── Normal data row ── */
                                return (
                                    <Box
                                        component="tr"
                                        key={ri}
                                        sx={{
                                            bgcolor: ri % 2 === 0 ? '#fff' : '#fafbfc',
                                            '&:hover': { bgcolor: '#f0f7ff' },
                                            transition: 'background 0.1s',
                                            '&:last-child td': { borderBottom: 'none' },
                                        }}
                                    >
                                        {columns.map(col => (
                                            <Box
                                                component="td"
                                                key={col.key}
                                                sx={{ ...cellBase, maxWidth: col.width ? `${col.width}px` : 'auto' }}
                                            >
                                                {col.key === 'Status' ? (
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            display: 'inline-block',
                                                            px: 1, py: '1px', borderRadius: '5px',
                                                            fontSize: '0.68rem', fontWeight: 700,
                                                            ...statusStyle(row[col.key]),
                                                        }}
                                                    >
                                                        {row[col.key] ?? '—'}
                                                    </Box>
                                                ) : (
                                                    <Tooltip
                                                        title={String(row[col.key] ?? '')}
                                                        placement="top-start"
                                                        disableHoverListener={String(row[col.key] ?? '').length < 22}
                                                        arrow
                                                    >
                                                        <span>{row[col.key] ?? '—'}</span>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        ))}
                                    </Box>
                                );
                            })}

                            {/* ══ TOTALS ROW ══ */}
                            {hasTotals && !loading && filtered.length > 0 && !groupBy && (
                                <Box
                                    component="tr"
                                    sx={{
                                        position: 'sticky', bottom: 0, zIndex: 2,
                                        bgcolor: '#1e293b',
                                        boxShadow: '0 -2px 8px rgba(0,0,0,0.18)',
                                    }}
                                >
                                    {columns.map((col, idx) => {
                                        const hasVal = columnTotals[col.key] != null;
                                        return (
                                            <Box
                                                component="td"
                                                key={col.key}
                                                sx={{
                                                    px: 1.5, py: 1,
                                                    fontSize: '0.75rem', fontWeight: 800,
                                                    color: hasVal ? '#7dd3fc' : '#94a3b8',
                                                    whiteSpace: 'nowrap',
                                                    borderTop: '2px solid #334155',
                                                    borderRight: '1px solid #334155',
                                                    '&:last-child': { borderRight: 'none' },
                                                }}
                                            >
                                                {idx === 0 && !hasVal ? (
                                                    <Box component="span" sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                        TOTAL
                                                    </Box>
                                                ) : hasVal ? fmtTotal(columnTotals[col.key]) : ''}
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>

            {/* ══ FOOTER ══ */}
            <Box sx={{
                px: { xs: 1.5, sm: 3 }, py: { xs: 0.8, sm: 1.1 },
                borderTop: '1px solid #f1f5f9',
                flexShrink: 0, bgcolor: '#fff',
                display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 0.8, sm: 1 },
            }}>
                {/* Row 1 on mobile: page info + size pills */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
                    <Typography sx={{ fontSize: '0.71rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {filtered.length} item{filtered.length !== 1 ? 's' : ''}{groupBy ? ` in ${groupedRows ? [...new Set(filtered.map(r => r[groupBy]))].length : 0} groups` : ''}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                        {PAGE_SIZE_OPTIONS.map(sz => (
                            <Box
                                key={sz}
                                onClick={() => { setPageSize(sz); setPage(1); }}
                                sx={{
                                    minWidth: 30, height: 26, px: 0.5,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
                                    cursor: 'pointer',
                                    bgcolor: pageSize === sz ? '#0f172a' : '#f1f5f9',
                                    color:   pageSize === sz ? '#fff'    : '#475569',
                                    border:  pageSize === sz ? '1.5px solid #0f172a' : '1.5px solid transparent',
                                    transition: 'all 0.14s',
                                    '&:hover': { bgcolor: pageSize === sz ? '#1e293b' : '#e2e8f0' },
                                }}
                            >
                                {sz}
                            </Box>
                        ))}
                    </Box>
                </Box>

                {/* Row 2 on mobile: pagination */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { xs: 'center', sm: 'flex-end' } }}>
                    <IconButton
                        size="small"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        sx={{
                            width: 28, height: 28, borderRadius: '7px',
                            border: '1px solid #e2e8f0', bgcolor: '#f8fafc',
                            color: page === 1 ? '#cbd5e1' : '#475569',
                            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                        }}
                    >
                        <ChevronLeft size={14} strokeWidth={2.5} />
                    </IconButton>

                    {pageRange.map(p => (
                        <Box
                            key={p}
                            onClick={() => setPage(p)}
                            sx={{
                                width: 28, height: 28,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '7px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                                bgcolor: page === p ? '#0f172a' : '#f8fafc',
                                color:   page === p ? '#fff'    : '#475569',
                                border:  page === p ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                                transition: 'all 0.14s',
                                '&:hover': { bgcolor: page === p ? '#1e293b' : '#f1f5f9' },
                            }}
                        >
                            {p}
                        </Box>
                    ))}

                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', px: 0.5, whiteSpace: 'nowrap' }}>
                        {page}/{totalPages}
                    </Typography>

                    <IconButton
                        size="small"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        sx={{
                            width: 28, height: 28, borderRadius: '7px',
                            border: '1px solid #e2e8f0', bgcolor: '#f8fafc',
                            color: page === totalPages ? '#cbd5e1' : '#475569',
                            '&:hover:not(:disabled)': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                        }}
                    >
                        <ChevronRight size={14} strokeWidth={2.5} />
                    </IconButton>
                </Box>
            </Box>
        </Dialog>
    );
};

export default DrillDownModal;