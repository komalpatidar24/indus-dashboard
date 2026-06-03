import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Box, Typography,
    CircularProgress, LinearProgress,
    Popover, List, ListItemButton, ListItemText,
    Dialog, DialogTitle, DialogContent, IconButton,
    InputAdornment, TextField, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, Tooltip,
} from '@mui/material';
import { ShoppingCart, Clock, FileText, Info, Search, X, Download } from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import CurrencyToggle from '../common/CurrencyToggle';
import { useCurrencyRates, CURRENCIES } from '../common/useCurrencyRates';
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

/* live rates injected at render time */
let _rates = {};
const getSym = (code) => CURRENCIES.find(c => c.code === code)?.symbol ?? code;

/* ─── Card wrapper (Glassmorphism) ─────────────────────────── */
const glassStyle = {
    bgcolor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 15px 45px -5px rgba(0,0,0,0.1)',
        borderColor: 'rgba(255, 255, 255, 0.5)'
    }
};

/* ─── Chart loading overlay ────────────────────────────────── */
const ChartLoader = ({ loading, children }) => (
    <Box sx={{
        position: 'relative',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
    }}>
        {children}
        {loading && (
            <Box sx={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.7)', borderRadius: '8px', zIndex: 2
            }}>
                <CircularProgress size={24} sx={{ color: '#1e3a5f' }} />
            </Box>
        )}
    </Box>
);

/* ─── GST toggle pill ──────────────────────────────────────── */
const GstToggle = ({ value, onChange }) => (
    <Box sx={{ display: 'flex', bgcolor: 'rgba(255,255,255,0.1)', p: 0.5, borderRadius: '12px' }}>
        {['Without GST', 'With GST'].map(opt => (
            <Box key={opt} onClick={() => onChange(opt)} sx={{
                px: 1.5, py: 0.5, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer',
                borderRadius: '8px',
                bgcolor: value === opt ? '#fff' : 'transparent',
                color: value === opt ? '#0f172a' : '#fff',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                boxShadow: value === opt ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
            }}>{opt}</Box>
        ))}
    </Box>
);

/* CurrencyToggle imported from shared component */

/* ─── Hover Tooltip for exact raw value ───────────────────── */
const ExactValueTooltip = ({ rawValue, label, currency, children, isAmount = true }) => {
    const formatExact = (val) => {
        if (val == null) return '—';
        if (!isAmount) return Number(val).toLocaleString();
        return fmtAmt(val, currency, _rates);
    };

    const tooltipContent = (
        <Box sx={{ textAlign: 'center', px: 0.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, mb: 0.6, color: 'inherit', lineHeight: 1 }}>
                {label}
            </Typography>
            <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", letterSpacing: '-0.6px', color: 'inherit', lineHeight: 1 }}>
                {formatExact(rawValue)}
            </Typography>
        </Box>
    );

    return (
        <Tooltip
            title={rawValue != null ? tooltipContent : ''}
            placement="top"
            arrow
            componentsProps={{
                tooltip: { sx: { background: 'linear-gradient(135deg, #0f172a 0%, #334155dd 100%)', color: '#ffffff', borderRadius: '14px', px: 2.5, py: 1.6, minWidth: 110, boxShadow: '0 16px 40px rgba(51,65,85,0.45), 0 4px 16px rgba(0,0,0,0.25)', border: '1px solid #33415570', backdropFilter: 'blur(10px)' } },
                arrow: { sx: { color: '#1e293b' } },
            }}
        >
            {children}
        </Tooltip>
    );
};

/* ─── Animated number helpers (same pattern as SalesDashboard) ──────── */
const parseKpiString = (val) => {
    if (val == null || val === '—') return null;
    const s = String(val);
    // Skip plain locale-formatted integers like "1,234" — commas make re-assembly unsafe
    if (/^[0-9][0-9,]*$/.test(s)) return null;
    const m = s.match(/^([^0-9-]*)(-?[0-9]+(?:\.[0-9]+)?)(.*)$/);
    if (!m) return null;
    return {
        prefix: m[1],
        num: parseFloat(m[2]),
        suffix: m[3],
        dec: m[2].includes('.') ? m[2].split('.')[1].length : 0,
    };
};

const AnimatedNumber = ({ value, duration = 1300 }) => {
    const parsed = useMemo(() => parseKpiString(value), [value]);
    const [cur, setCur] = useState(0);
    const [slideKey, setSlideKey] = useState(0);
    const isFirstRef = useRef(true);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!parsed) { setCur(0); return; }
        cancelAnimationFrame(rafRef.current);
        const target = parsed.num;

        if (isFirstRef.current) {
            isFirstRef.current = false;
            const t0 = performance.now();
            const tick = (now) => {
                const p = Math.min((now - t0) / duration, 1);
                setCur(target * (1 - Math.pow(1 - p, 3)));
                if (p < 1) rafRef.current = requestAnimationFrame(tick);
                else setCur(target);
            };
            rafRef.current = requestAnimationFrame(tick);
        } else {
            setCur(target);
            setSlideKey(k => k + 1);
        }

        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed?.num, parsed?.dec, duration]);

    if (!parsed) return <>{value ?? '—'}</>;

    return (
        <Box
            key={slideKey}
            component="span"
            sx={{
                display: 'inline-block',
                ...(slideKey > 0 && {
                    animation: 'kpiSlideDown 0.42s cubic-bezier(0.34,1.56,0.64,1) both',
                    '@keyframes kpiSlideDown': {
                        '0%':   { opacity: 0, transform: 'translateY(-55%)' },
                        '100%': { opacity: 1, transform: 'translateY(0)' },
                    },
                }),
            }}
        >
            {parsed.prefix}{cur.toFixed(parsed.dec)}{parsed.suffix}
        </Box>
    );
};

/* ─── MetricTile — fixed alignment: always reserves info-icon space ── */
const MetricTile = ({ icon, value, label, onInfoClick, rawValue, currency, isAmount = true, isLast, isLastOdd }) => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        py: { xs: 1.75, sm: 1.5 },
        px: { xs: 0.75, sm: 0.5 },
        /* 5th item in a 2-col grid: span both columns so it's centred — only xs */
        gridColumn: isLastOdd ? { xs: '1 / -1', sm: 'auto' } : 'auto',
        /* Right border as separator */
        borderRight: isLast ? 'none' : { xs: 'none', sm: '1px solid #f1f5f9' },
        /* Bottom border between rows on mobile */
        borderBottom: isLastOdd
            ? 'none'
            : { xs: '1px solid #f1f5f9', sm: 'none' },
    }}>
        {/* Icon — fixed height so all tiles have same top region */}
        <Box sx={{
            color: '#94a3b8', mb: 1,
            height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.3s ease', '&:hover': { transform: 'scale(1.2)' },
        }}>
            {icon}
        </Box>

        {/* Value */}
        <ExactValueTooltip rawValue={rawValue} label={label} currency={currency} isAmount={isAmount}>
            <Typography
                sx={{
                    fontSize: { xs: '0.85rem', sm: '1rem', md: '1.15rem' },
                    fontWeight: 900, color: '#0f172a', lineHeight: 1,
                    cursor: rawValue != null ? 'default' : 'inherit',
                    borderBottom: rawValue != null ? '1.5px dashed #cbd5e1' : 'none',
                    transition: 'border-color 0.2s',
                    '&:hover': rawValue != null ? { borderBottomColor: '#2e86ab' } : {},
                    pb: 0.2,
                    textAlign: 'center',
                    /* Prevent overflow on narrow cells */
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minHeight: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
            >
                <AnimatedNumber value={value} />
            </Typography>
        </ExactValueTooltip>

        {/* Label */}
        <Typography sx={{
            fontSize: { xs: '0.56rem', sm: '0.58rem', md: '0.62rem' },
            fontWeight: 800, color: '#94a3b8',
            textTransform: 'uppercase', textAlign: 'center',
            mt: 0.75, letterSpacing: '0.08em',
            lineHeight: 1.3,
        }}>
            {label}
        </Typography>

        {/* Info icon slot — ALWAYS rendered to keep equal height.
            Transparent + non-interactive when tile has no drill-down. */}
        <Box
            onClick={onInfoClick ?? undefined}
            sx={{
                mt: 0.75,
                height: 20,
                width: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: onInfoClick ? 'pointer' : 'default',
                color: onInfoClick ? '#64748b' : 'transparent',
                transition: 'color 0.2s ease, transform 0.2s ease',
                '&:hover': onInfoClick ? { color: '#2e86ab', transform: 'scale(1.25)' } : {},
                pointerEvents: onInfoClick ? 'auto' : 'none',
                flexShrink: 0,
            }}
        >
            <Info size={14} strokeWidth={2} />
        </Box>
    </Box>
);

/* ─── Numeric Formatting Helpers — live rates via _rates ─── */
const fmtRaw = v => v == null ? '—' : v.toLocaleString();
const fmtPct = v => v == null ? '—' : `${v.toFixed(1)}%`;

const fmtAmt = (v, currency = 'INR', rates = _rates) => {
    if (v == null) return '—';
    const code = currency.length > 1 ? currency : (currency);
    const rate = rates[code] ?? 1;
    const converted = code === 'INR' ? v : v * rate;
    const abs = Math.abs(converted);
    const symbol = getSym(code);
    if (v === 0) return `${symbol}0`;
    if (code === 'INR') {
        if (abs >= 1e7) return `${symbol}${(converted / 1e7).toFixed(2)} Cr`;
        if (abs >= 1e5) return `${symbol}${(converted / 1e5).toFixed(2)} L`;
        if (abs >= 1e3) return `${symbol}${(converted / 1e3).toFixed(2)} K`;
        return `${symbol}${converted.toLocaleString()}`;
    }
    if (abs >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${symbol}${(converted / 1e3).toFixed(2)}K`;
    return `${symbol}${converted.toFixed(2)}`;
};

const makeDynamicTickCallback = (currency = 'INR', rates = _rates) => (value) => {
    if (value == null || value === 0) return `${getSym(currency)}0`;
    const code = currency.length > 1 ? currency : (currency);
    const rate = rates[code] ?? 1;
    const converted = code === 'INR' ? value : value * rate;
    const abs = Math.abs(converted);
    const symbol = getSym(code);
    if (code === 'INR') {
        if (abs >= 1e7) return `${symbol}${(converted / 1e7).toFixed(1)} Cr`;
        if (abs >= 1e5) return `${symbol}${(converted / 1e5).toFixed(1)} L`;
        if (abs >= 1e3) return `${symbol}${(converted / 1e3).toFixed(1)} K`;
        return `${symbol}${converted.toFixed(0)}`;
    }
    if (abs >= 1e6) return `${symbol}${(converted / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${symbol}${(converted / 1e3).toFixed(1)}K`;
    return `${symbol}${converted.toFixed(0)}`;
};

const fmtQty = (v) => {
    if (v == null) return '—';
    return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toLocaleString();
};

/* ── Financial year default dates ── */
const _now = dayjs();
/* ── Current financial year logic ── */
const _cYear = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO = `${_cYear + 1}-03-31`;

/* ══════════════════════════════════════════════════════════════
   DRILL-DOWN TABLE CONFIGURATION
══════════════════════════════════════════════════════════════ */
const DRILL_CONFIG = {

    poTotal: {
        title: 'PO Total',
        apiName: 'GetDrillDownPOTotal',
        columns: [
            { key: 'Supplier', label: 'Supplier' },
            { key: 'PONumber', label: 'PO Number' },
            { key: 'PODate', label: 'PO Date' },
            { key: 'Quantity', label: 'Quantity' },
            { key: 'BasicAmount', label: 'Basic Amt' },
            { key: 'GSTAmount', label: 'GST Amt' },
            { key: 'NetAmount', label: 'Net Amt' },
            { key: 'CreatedBy', label: 'Created By' },
            { key: 'PaymentTerms', label: 'Payment Terms' },
        ],
    },

    grnTotal: {
        title: 'GRN Total',
        apiName: 'GetDrillDownGRNTotal',
        columns: [
            { key: 'GRN Number', label: 'GRN Number' },
            { key: 'GRN Date', label: 'GRN Date' },
            { key: 'Supplier Name', label: 'Supplier Name' },
            { key: 'Supplier Code', label: 'Supplier Code' },
            { key: 'Received Quantity', label: 'Received Qty' },
            { key: 'Total Item Value', label: 'Total Item Value' },
        ],
    },

    invoiced: {
        title: 'Invoiced',
        apiName: 'GetDrillDownInvoiced',
        columns: [
            { key: 'Invoice No', label: 'Invoice No' },
            { key: 'Invoice Date', label: 'Invoice Date' },
            { key: 'Bill No', label: 'Bill No' },
            { key: 'PO No', label: 'PO Number' },
            { key: 'GRN No', label: 'GRN Number' },
            { key: 'Supplier Name', label: 'Supplier' },
            { key: 'Item Group', label: 'Item Group' },
            { key: 'Item Name', label: 'Item Name' },
            { key: 'PurchaseOrderQuantity', label: 'Purchase Order Quantity' },
            { key: 'Stock Unit', label: 'Stock Unit' },
            { key: 'Rate', label: 'Rate' },
            { key: 'Basic Amount', label: 'Basic Amt' },
            { key: 'CGST', label: 'CGST Amt' },
            { key: 'SGST', label: 'SGST Amt' },
            { key: 'IGST', label: 'IGST Amt' },
            { key: 'Other Charges', label: 'Other Charges' },
            { key: 'Net Amount', label: 'Net Amt' },
        ],
    },

    ordered: {
        title: 'Ordered Quantity',
        apiName: 'GetDrillDownPOTotal',
        columns: [
            { key: 'Supplier', label: 'Supplier' },
            { key: 'PONumber', label: 'PO Number' },
            { key: 'PODate', label: 'PO Date' },
            { key: 'Quantity', label: 'Quantity' },
            { key: 'BasicAmount', label: 'Basic Amt' },
            { key: 'GSTAmount', label: 'GST Amt' },
            { key: 'NetAmount', label: 'Net Amt' },
            { key: 'CreatedBy', label: 'Created By' },
            { key: 'PaymentTerms', label: 'Payment Terms' },
        ],
    },

    received: {
        title: 'Received Quantity',
        apiName: 'GetDrillDownGRNTotal',
        columns: [
            { key: 'GRN Number', label: 'GRN Number' },
            { key: 'GRN Date', label: 'GRN Date' },
            { key: 'Supplier Name', label: 'Supplier Name' },
            { key: 'Supplier Code', label: 'Supplier Code' },
            { key: 'Received Quantity', label: 'Received Qty' },
            { key: 'Total Item Value', label: 'Total Item Value' },
        ],
    },

    billed: {
        title: 'Billed Quantity',
        apiName: 'GetDrillDownInvoiced',
        columns: [
            { key: 'Invoice No', label: 'Invoice No' },
            { key: 'Invoice Date', label: 'Invoice Date' },
            { key: 'Bill No', label: 'Bill No' },
            { key: 'PO No', label: 'PO Number' },
            { key: 'GRN No', label: 'GRN Number' },
            { key: 'Supplier Name', label: 'Supplier' },
            { key: 'Item Group', label: 'Item Group' },
            { key: 'Item Name', label: 'Item Name' },
            { key: 'PurchaseOrderQuantity', label: 'Purchase Order Quantity' },
            { key: 'Stock Unit', label: 'Stock Unit' },
            { key: 'Rate', label: 'Rate' },
            { key: 'Basic Amount', label: 'Basic Amt' },
            { key: 'CGST', label: 'CGST Amt' },
            { key: 'SGST', label: 'SGST Amt' },
            { key: 'IGST', label: 'IGST Amt' },
            { key: 'Other Charges', label: 'Other Charges' },
            { key: 'Net Amount', label: 'Net Amt' },
        ],
    },

    pending: {
        title: 'Pending PO Details',
        apiName: 'GetABPendingDetail',
        columns: [
            { key: 'PurchaseVoucherNo', label: 'PO No' },
            { key: 'PurchaseVoucherDate', label: 'PO Date' },
            { key: 'LedgerName', label: 'Supplier' },
            { key: 'ItemName', label: 'Item Name' },
            { key: 'PurchaseOrderQuantity', label: 'PO Qty (PU)' },
            { key: 'ReceiptQty_PU', label: 'Received Qty (PU)' },
            { key: 'Pending_Qty_PU', label: 'Pending Qty (PU)' },
            { key: 'PurchaseUnit', label: 'Purchase Unit' },
            { key: 'Pending_Qty_Stock', label: 'Pending Qty (SU)' },
            { key: 'StockUnit', label: 'Stock Unit' },
            { key: 'PendingQuantityPUAmount', label: 'Pending Amount' },
            { key: 'ExpectedDeliveryDate', label: 'Expected Delivery' },
            { key: 'RemainingDays', label: 'Remaining Days' },
            { key: 'Status', label: 'Status' },
        ],
    },

    stockAgingSU: {
        title: 'Stock Aging & Inventory Movement (Stock Unit)',
        apiName: 'GetStockAging',
        extraParams: { UnitType: 'StockUnit' },
        columns: [
            { key: 'ItemGroupName', label: 'Item Group' },
            { key: 'PhysicalStockSU', label: 'Physical Stock (SU)' },
            { key: 'FloorStockSU', label: 'Floor Stock (SU)' },
            { key: 'IncomingStockInSU', label: 'Incoming Stock (SU)' },
        ],
    },

    stockAgingPU: {
        title: 'Stock Aging & Inventory Movement (Purchase Unit)',
        apiName: 'GetStockAging',
        extraParams: { UnitType: 'PurchaseUnit' },
        columns: [
            { key: 'ItemGroupName', label: 'Item Group' },
            { key: 'PhysicalStockPU', label: 'Physical Stock (PU)' },
            { key: 'FloorStockPU', label: 'Floor Stock (PU)' },
            { key: 'IncomingStockPU', label: 'Incoming Stock (PU)' },
        ],
    },

};

const PAGE_SIZE_OPTIONS = [15, 30, 50];

const STATUS_BADGE_COLS = new Set(['Status', 'QCStatus', 'PaymentStatus', 'Remarks']);

const badgeStyle = (val) => {
    const v = String(val).toLowerCase();
    if (['approved', 'paid', 'passed', 'closed', 'open'].some(s => v.includes(s)))
        return { bgcolor: '#dcfce7', color: '#15803d' };
    if (['pending', 'partial', 're-check', 'in transit', 'awaiting'].some(s => v.includes(s)))
        return { bgcolor: '#fef9c3', color: '#854d0e' };
    if (['failed', 'overdue', 'reject', 'delay'].some(s => v.includes(s)))
        return { bgcolor: '#fee2e2', color: '#b91c1c' };
    return { bgcolor: '#f1f5f9', color: '#475569' };
};

/* Helper — read fiscalYear from localStorage */
const getStoredFiscalYear = () => {
    try { return localStorage.getItem('fiscalYear') || null; }
    catch { return null; }
};

const DrillDownModal = ({ open, onClose, tileKey, companyId, period, parentFromDate, parentToDate }) => {
    const config = tileKey ? DRILL_CONFIG[tileKey] : null;

    const [allRows, setAllRows] = useState([]);
    const [fetchingRows, setFetchingRows] = useState(false);

    const [drillFrom, setDrillFrom] = useState('');
    const [drillTo, setDrillTo] = useState('');
    const [drillYear, setDrillYear] = useState(() => getStoredFiscalYear());
    const [allMode, setAllMode] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');
    const [colSearch, setColSearch] = useState({});
    const [sortCol, setSortCol] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [groupByCol, setGroupByCol] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const doFetch = useCallback((fromD, toD, year) => {
        if (!config) return;
        setFetchingRows(true);
        setAllRows([]);
        postRequest(config.apiName, {
            CompanyID: companyId,
            FromDate: fromD || null,
            ToDate: toD || null,
            Year: year || null,
            period,
            ...(config.extraParams || {}),
        })
            .then(res => setAllRows(Array.isArray(res?.data) ? res.data : []))
            .catch(err => { console.error(`DrillDown fetch error [${config.apiName}]:`, err); setAllRows([]); })
            .finally(() => setFetchingRows(false));
    }, [config, companyId, period]);

    useEffect(() => {
        if (!open || !config) return;

        setGlobalSearch(''); setColSearch({}); setSortCol(''); setSortDir('asc');
        setPage(1); setPageSize(15); setGroupByCol('');
        setAllMode(false);

        const fy = getStoredFiscalYear();
        setDrillYear(fy);

        const fd = parentFromDate || '';
        const td = parentToDate || '';
        setDrillFrom(fd);
        setDrillTo(td);

        doFetch(fd, td, fy);

    }, [open, tileKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleAll = () => {
        setAllMode(true);
        setDrillFrom(''); setDrillTo('');
        setPage(1);
        doFetch('', '', null);
    };

    const filtered = useMemo(() => {
        if (!config) return [];
        let rows = allRows;
        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
        }
        Object.entries(colSearch).forEach(([k, v]) => {
            if (v?.trim()) {
                const q = v.toLowerCase();
                rows = rows.filter(r => String(r[k] ?? '').toLowerCase().includes(q));
            }
        });
        return rows;
    }, [config, allRows, globalSearch, colSearch]);

    const sorted = useMemo(() => {
        if (!sortCol) return filtered;
        return [...filtered].sort((a, b) => {
            const cmp = String(a[sortCol] ?? '').localeCompare(String(b[sortCol] ?? ''), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortCol, sortDir]);

    const handleSort = (key) => {
        if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(key); setSortDir('asc'); }
    };

    /* flat list for pagination — includes group headers when groupByCol is active */
    const flatList = useMemo(() => {
        if (!groupByCol) return sorted;
        const groups = new Map();
        sorted.forEach(r => {
            const g = String(r[groupByCol] ?? '—');
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(r);
        });
        const out = [];
        groups.forEach((rows, g) => {
            out.push({ __group: true, __label: g, __key: groupByCol, __count: rows.length });
            rows.forEach(r => out.push(r));
        });
        return out;
    }, [sorted, groupByCol]);

    const totalPages = Math.max(1, Math.ceil(flatList.length / pageSize));
    const displayRows = flatList.slice((page - 1) * pageSize, page * pageSize);

    const NUMERIC_TOTAL_KEYS = new Set([
        'Quantity', 'BasicAmount', 'GSTAmount', 'NetAmount',
        'Received Quantity', 'Total Item Value',
        'PurchaseOrderQuantity', 'Rate',
        'Basic Amount', 'CGST', 'SGST', 'IGST', 'Other Charges', 'Net Amount',
        'Pending_Qty_PU', 'PendingQuantityPUAmount',
    ]);

    const columnTotals = useMemo(() => {
        if (!config || !filtered.length) return {};
        const totals = {};
        config.columns.forEach(col => {
            if (NUMERIC_TOTAL_KEYS.has(col.key)) {
                const sum = filtered.reduce((acc, row) => {
                    const v = parseFloat(String(row[col.key] ?? '').replace(/,/g, ''));
                    return acc + (isNaN(v) ? 0 : v);
                }, 0);
                totals[col.key] = sum;
            }
        });
        return totals;
    }, [config, filtered]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasTotals = Object.keys(columnTotals).length > 0;

    const fmtTotal = (v) => {
        if (v == null) return '';
        if (Number.isInteger(v)) return v.toLocaleString('en-IN');
        return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleExport = () => {
        if (!config || !filtered.length) return;
        const { columns } = config;
        const hdr = columns.map(c => `"${c.label}"`).join(',');
        const body = filtered.map(r => columns.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([hdr + '\n' + body], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(config.title || 'export').replace(/\s+/g, '_')}_drilldown.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!config) return null;
    const { columns } = config;
    const isLoading = fetchingRows;

    const actionBtnSx = {
        height: 32, border: '1px solid #e2e8f0', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#475569', bgcolor: '#f8fafc',
        fontSize: '0.72rem', fontWeight: 700, px: 1.4,
        transition: 'all 0.15s ease',
        '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8', color: '#0f172a' },
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: { xs: '100vw', sm: '96vw', md: '92vw' }, maxWidth: 1200,
                    maxHeight: { xs: '95vh', sm: '88vh' },
                    borderRadius: { xs: '12px', sm: '16px' },
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px -12px rgba(15,23,42,0.28)',
                    display: 'flex', flexDirection: 'column',
                    /* Full screen feel on mobile */
                    m: { xs: 0.5, sm: 2 },
                }
            }}
        >
            {/* ══ TITLE BAR ══ */}
            <DialogTitle sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: { xs: 2, sm: 3 }, py: 0, minHeight: { xs: 48, sm: 52 },
                background: 'linear-gradient(135deg, #536795 0%, #1e293b 100%)',
                flexShrink: 0,
                gap: 1,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flex: 1, minWidth: 0 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2e86ab', flexShrink: 0 }} />
                    <Typography sx={{
                        fontSize: { xs: '0.78rem', sm: '0.92rem' },
                        fontWeight: 800, color: '#fff',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        Detailed View:&nbsp;
                        <Box component="span" sx={{ color: '#7dd3fc' }}>{config.title}</Box>
                    </Typography>
                </Box>
                <IconButton
                    onClick={onClose} size="small"
                    sx={{
                        color: '#94a3b8', borderRadius: '8px', flexShrink: 0,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }
                    }}
                >
                    <X size={17} />
                </IconButton>
            </DialogTitle>

            {/* ══ FILTER BAR ══ */}
            <Box sx={{
                px: { xs: 1.5, sm: 3 }, py: { xs: 1, sm: 1.2 },
                display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                bgcolor: '#f8fafc', borderBottom: '1px solid #e9eef4', flexShrink: 0,
            }}>
                {!allMode && drillYear && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6,
                        bgcolor: '#e0f2fe', color: '#0369a1',
                        px: 1.2, py: 0.35, borderRadius: '7px',
                        fontSize: '0.7rem', fontWeight: 700, border: '1px solid #bae6fd',
                        flexShrink: 0,
                    }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        FY {drillYear}
                        <Tooltip title="Remove FY filter — fetch all years" placement="top" arrow>
                            <Box
                                component="span"
                                onClick={handleAll}
                                sx={{
                                    ml: 0.3, lineHeight: 1,
                                    cursor: 'pointer',
                                    fontSize: '0.75rem', fontWeight: 900,
                                    color: '#0369a1', opacity: 0.7,
                                    transition: 'opacity 0.15s, color 0.15s',
                                    '&:hover': { opacity: 1, color: '#dc2626' },
                                }}
                            >
                                ×
                            </Box>
                        </Tooltip>
                    </Box>
                )}

                {(drillFrom || drillTo) && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6,
                        bgcolor: '#f0fdf4', color: '#15803d',
                        px: 1.2, py: 0.35, borderRadius: '7px',
                        fontSize: '0.7rem', fontWeight: 700, border: '1px solid #bbf7d0',
                        flexShrink: 0,
                        /* truncate on very small screens */
                        maxWidth: { xs: 160, sm: 'none' },
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {drillFrom}{drillTo ? ` → ${drillTo}` : ''}
                    </Box>
                )}

                {/* Pushes export + search to the right; on xs wraps to next line */}
                <Box sx={{ flex: '1 1 auto' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                    <Tooltip title="Export CSV" arrow>
                        <Box onClick={handleExport} sx={{ ...actionBtnSx, width: 32, px: 0 }}>
                            <Download size={14} />
                        </Box>
                    </Tooltip>
                    <TextField
                        placeholder="Search..."
                        size="small"
                        value={globalSearch}
                        onChange={e => { setGlobalSearch(e.target.value); setPage(1); }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Search size={13} color="#64748b" /></InputAdornment>,
                            sx: { fontSize: '0.78rem', borderRadius: '8px', bgcolor: '#fff', height: 32 },
                        }}
                        sx={{
                            width: { xs: 140, sm: 190 },
                            '& .MuiOutlinedInput-root': { borderRadius: '8px' },
                        }}
                    />
                </Box>
            </Box>

            {/* ══ DRAG-TO-GROUP BAR ══ */}
            <Box sx={{
                px: { xs: 1.5, sm: 3 }, py: 0.8,
                bgcolor: '#fff', borderBottom: '1px solid #f1f5f9',
                flexShrink: 0,
                /* Hide on mobile to save space */
                display: { xs: 'none', sm: 'block' },
            }}>
                <Box
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); const col = e.dataTransfer.getData('colKey'); if (col) setGroupByCol(col); setDragOver(false); }}
                    sx={{
                        fontSize: '0.7rem', fontWeight: 600,
                        color: dragOver ? '#2e86ab' : '#64748b',
                        bgcolor: dragOver ? '#e8f4f8' : '#f8fafc',
                        border: `1.5px dashed ${dragOver ? '#2e86ab' : '#cbd5e1'}`,
                        borderRadius: '8px', px: 2, py: 0.6,
                        transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 0.8,
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
                        <path d="M4 4h16v2.586l-6 6V20l-4-2v-7.414L4 6.586V4z" />
                    </svg>
                    {groupByCol
                        ? <span>Grouped by: <strong style={{ color: '#0f172a' }}>{columns.find(c => c.key === groupByCol)?.label ?? groupByCol}</strong>
                            &nbsp;<span onClick={() => setGroupByCol('')} style={{ cursor: 'pointer', color: '#ef4444', fontWeight: 800 }}>✕</span>
                        </span>
                        : 'Drag a column header here to group by that column'
                    }
                </Box>
            </Box>

            {/* ══ TABLE ══ */}
            <DialogContent sx={{ p: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <TableContainer sx={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: Math.max(600, columns.length * 140) }}>
                        <TableHead>
                            <TableRow>
                                {columns.map(col => (
                                    <TableCell
                                        key={col.key}
                                        draggable
                                        onDragStart={e => e.dataTransfer.setData('colKey', col.key)}
                                        sx={{
                                            position: 'sticky', top: 0, zIndex: 4,
                                            bgcolor: '#f0f4f8',
                                            borderBottom: '2px solid #cbd5e1',
                                            py: 1, px: { xs: 1, sm: 1.5 }, whiteSpace: 'nowrap',
                                            cursor: 'grab', userSelect: 'none',
                                            boxShadow: 'inset 0 -2px 0 #cbd5e1',
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <TableSortLabel
                                                active={sortCol === col.key}
                                                direction={sortCol === col.key ? sortDir : 'asc'}
                                                onClick={() => handleSort(col.key)}
                                                sx={{
                                                    fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 700,
                                                    color: sortCol === col.key ? '#0f172a' : '#334155',
                                                    '&.Mui-active': { color: '#0f172a' },
                                                    '& .MuiTableSortLabel-icon': { fontSize: '0.8rem', color: '#475569 !important' },
                                                }}
                                            >
                                                {col.label}
                                            </TableSortLabel>
                                            <Box sx={{
                                                color: colSearch[col.key]?.trim() ? '#2e86ab' : '#64748b',
                                                display: 'flex', alignItems: 'center', cursor: 'pointer',
                                                '&:hover': { color: '#2e86ab' },
                                            }}>
                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M4 4h16v2.586l-6 6V20l-4-2v-7.414L4 6.586V4z" />
                                                </svg>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                {columns.map(col => (
                                    <TableCell
                                        key={col.key}
                                        sx={{
                                            position: 'sticky', top: 40, zIndex: 3,
                                            bgcolor: '#fff',
                                            borderBottom: '1.5px solid #e2e8f0',
                                            py: 0.4, px: { xs: 0.5, sm: 1 },
                                            boxShadow: 'inset 0 -1.5px 0 #e2e8f0',
                                        }}
                                    >
                                        <TextField
                                            placeholder="🔍"
                                            size="small"
                                            value={colSearch[col.key] || ''}
                                            onChange={e => { setColSearch(p => ({ ...p, [col.key]: e.target.value })); setPage(1); }}
                                            inputProps={{ style: { fontSize: '0.7rem', padding: '3px 6px' } }}
                                            sx={{
                                                width: '100%', minWidth: 60,
                                                '& .MuiOutlinedInput-root': { borderRadius: '6px', bgcolor: '#f8fafc', fontSize: '0.7rem' },
                                                '& fieldset': { borderColor: '#e2e8f0' },
                                            }}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center" sx={{ py: 8, border: 'none' }}>
                                        <CircularProgress size={28} sx={{ color: '#2e86ab' }} />
                                        <Typography sx={{ mt: 1.5, fontSize: '0.78rem', color: '#94a3b8' }}>
                                            Loading data…
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : displayRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length} align="center" sx={{ py: 6, color: '#94a3b8', fontSize: '0.82rem' }}>
                                        No records found
                                    </TableCell>
                                </TableRow>
                            ) : displayRows.map((row, idx) => {
                                if (row.__group) return (
                                    <TableRow key={`g${idx}`}>
                                        <TableCell colSpan={columns.length} sx={{ bgcolor: '#f1f5f9', py: 0.8, px: 2, borderTop: idx > 0 ? '2px solid #e2e8f0' : 'none', borderBottom: '1px solid #e2e8f0' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2e86ab', flexShrink: 0 }} />
                                                <Typography sx={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f172a' }}>
                                                    {columns.find(c => c.key === row.__key)?.label ?? row.__key}:
                                                    <Box component="span" sx={{ color: '#2e86ab', ml: 0.5 }}>{row.__label}</Box>
                                                </Typography>
                                                <Box sx={{ ml: 'auto', bgcolor: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', fontWeight: 700, px: 1, py: '2px', borderRadius: '5px' }}>
                                                    {row.__count} rows
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                                return (
                                    <TableRow key={idx} sx={{ '&:nth-of-type(even)': { bgcolor: '#fafafa' }, '&:hover': { bgcolor: '#f0f7ff' }, transition: 'background 0.15s' }}>
                                        {columns.map(col => {
                                            const val = row[col.key];
                                            const isBadge = STATUS_BADGE_COLS.has(col.key);
                                            return (
                                                <TableCell key={col.key} sx={{ py: 0.9, px: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.72rem', sm: '0.78rem' }, color: '#334155', whiteSpace: 'nowrap', borderBottom: '1px solid #f8fafc' }}>
                                                    {isBadge ? (
                                                        <Box component="span" sx={{ ...badgeStyle(val), px: 1, py: 0.25, borderRadius: '6px', fontWeight: 700, fontSize: '0.7rem' }}>
                                                            {val ?? '—'}
                                                        </Box>
                                                    ) : (val ?? '—')}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                            {/* ══ TOTALS ROW ══ */}
                            {hasTotals && !isLoading && filtered.length > 0 && !groupByCol && (
                                <TableRow sx={{
                                    position: 'sticky', bottom: 0, zIndex: 2,
                                    bgcolor: '#1e293b',
                                    boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
                                }}>
                                    {columns.map((col, idx) => {
                                        const hasTotal = columnTotals[col.key] != null;
                                        return (
                                            <TableCell key={col.key} sx={{
                                                py: 1, px: { xs: 1, sm: 1.5 },
                                                fontSize: { xs: '0.7rem', sm: '0.75rem' }, fontWeight: 800,
                                                color: hasTotal ? '#7dd3fc' : '#94a3b8',
                                                whiteSpace: 'nowrap',
                                                borderTop: '2px solid #334155',
                                                borderBottom: 'none',
                                            }}>
                                                {idx === 0 && !hasTotal ? (
                                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                        TOTAL
                                                    </Typography>
                                                ) : hasTotal ? fmtTotal(columnTotals[col.key]) : ''}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* ══ PAGINATION FOOTER ══ */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: { xs: 1, sm: 3 }, py: { xs: 1, sm: 1.5 },
                    borderTop: '1px solid #f1f5f9', bgcolor: '#fff',
                    flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 },
                    flexShrink: 0,
                }}>
                    {/* Page size selector */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        {PAGE_SIZE_OPTIONS.map(ps => (
                            <Box key={ps} onClick={() => { setPageSize(ps); setPage(1); }} sx={{
                                width: { xs: 28, sm: 32 }, height: { xs: 26, sm: 28 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                bgcolor: pageSize === ps ? '#0f172a' : '#f1f5f9',
                                color: pageSize === ps ? '#fff' : '#475569',
                                border: pageSize === ps ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                transition: 'all 0.15s',
                                '&:hover': { bgcolor: pageSize === ps ? '#1e293b' : '#e2e8f0' }
                            }}>
                                {ps}
                            </Box>
                        ))}
                    </Box>

                    {/* Page info — hide on very small screens if it wraps badly */}
                    <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, order: { xs: 3, sm: 2 }, width: { xs: '100%', sm: 'auto' }, textAlign: 'center' }}>
                        Page {page} of {totalPages} ({filtered.length} items)
                    </Typography>

                    {/* Pagination buttons */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, order: { xs: 2, sm: 3 } }}>
                        <Box
                            onClick={() => page > 1 && setPage(p => p - 1)}
                            sx={{
                                width: { xs: 26, sm: 28 }, height: { xs: 26, sm: 28 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                                cursor: page > 1 ? 'pointer' : 'default',
                                bgcolor: '#f1f5f9', color: page > 1 ? '#475569' : '#cbd5e1',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.15s',
                                '&:hover': page > 1 ? { bgcolor: '#e2e8f0' } : {},
                            }}
                        >‹</Box>

                        {(() => {
                            const pageBtnSx = (p) => ({
                                width: { xs: 26, sm: 28 }, height: { xs: 26, sm: 28 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                                bgcolor: page === p ? '#0f172a' : '#f1f5f9',
                                color: page === p ? '#fff' : '#475569',
                                border: page === p ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                transition: 'all 0.15s',
                                '&:hover': { bgcolor: page === p ? '#1e293b' : '#e2e8f0' },
                            });
                            const ellipsisSx = {
                                width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.74rem', color: '#94a3b8', userSelect: 'none',
                            };
                            const pages = [];
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                                return pages.map(p => (
                                    <Box key={p} onClick={() => setPage(p)} sx={pageBtnSx(p)}>{p}</Box>
                                ));
                            }
                            const show = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
                            const sorted = Array.from(show).sort((a, b) => a - b);
                            const result = [];
                            let prev = 0;
                            sorted.forEach(p => {
                                if (p - prev > 1) result.push('…' + p);
                                result.push(p);
                                prev = p;
                            });
                            return result.map((item, i) => {
                                if (typeof item === 'string') return <Box key={i} sx={ellipsisSx}>…</Box>;
                                return <Box key={item} onClick={() => setPage(item)} sx={pageBtnSx(item)}>{item}</Box>;
                            });
                        })()}

                        <Box
                            onClick={() => page < totalPages && setPage(p => p + 1)}
                            sx={{
                                width: { xs: 26, sm: 28 }, height: { xs: 26, sm: 28 },
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700,
                                cursor: page < totalPages ? 'pointer' : 'default',
                                bgcolor: '#f1f5f9', color: page < totalPages ? '#475569' : '#cbd5e1',
                                border: '1px solid #e2e8f0',
                                transition: 'all 0.15s',
                                '&:hover': page < totalPages ? { bgcolor: '#e2e8f0' } : {},
                            }}
                        >›</Box>
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const PurchaseDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [gstMode, setGstMode] = useState('Without GST');
    const [unitMode, setUnitMode] = useState('ALL (MIXED)');
    const [currency, setCurrency] = useState('INR');
    const { rates, loading: ratesLoading, updatedAt: ratesUpdatedAt, refreshRates } = useCurrencyRates();
    _rates = rates; // inject live rates into module-scope formatters

    const [companyId] = useState('2');
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);

    const [unitAnchor, setUnitAnchor] = useState(null);

    /* ── Drill-down modal state ── */
    const [drillKey, setDrillKey] = useState(null);
    const [drillOpen, setDrillOpen] = useState(false);
    const [stockAgingUnit, setStockAgingUnit] = useState('StockUnit');
    const openDrill = (key) => { setDrillKey(key); setDrillOpen(true); };
    const closeDrill = () => setDrillOpen(false);

    /* ── Amount Breakdown ── */
    const [amtBD, setAmtBD] = useState({
        poTotal: null, grnTotal: null, invoiced: null, pending: null, poCount: null
    });

    /* ── Quantity Breakdown ── */
    const [qtyBD, setQtyBD] = useState({
        ordered: null, received: null, billed: null, shortfall: null, pendingPO: null, invRatio: null
    });

    /* ── Raw chart data (stored in INR, converted on render) ── */
    const [rawChartData, setRawChartData] = useState({
        procurementFunnel: null,
        cycleTimeTrend: null,
        spendByCategory: null,
        stockAging: null,
        geoView: null,
        topSuppliers: null,
        yearWiseComparison: null,
    });

    /* ── Per-card loading ── */
    const [kpiLoading, setKpiLoading] = useState({
        amountBreakdown: false, qtyBreakdown: false
    });
    const [chartLoading, setChartLoading] = useState({
        procurementFunnel: false, cycleTimeTrend: false, spendByCategory: false,
        stockAging: false, geoView: false, topSuppliers: false, yearWiseComparison: false
    });

    const dynamicTick = useCallback((value) => makeDynamicTickCallback(currency)(value), [currency]);

    const charts = useMemo(() => {
        const convertValues = (values) => {
            if (!values) return [];
            const rate = rates[currency] ?? 1;
            return values.map(v => currency === 'INR' ? v : v * rate);
        };

        const empty = { labels: [], datasets: [] };

        const pf = rawChartData.procurementFunnel;
        const procurementFunnel = pf ? {
            labels: pf.labels,
            datasets: [
                {
                    ...pf.datasets[0],
                    data: convertValues(pf.datasets[0]?.rawData),
                },
                pf.datasets[1],
            ]
        } : empty;

        const ctt = rawChartData.cycleTimeTrend;
        const cycleTimeTrend = ctt || empty;

        const sbc = rawChartData.spendByCategory;
        const spendByCategory = sbc ? {
            labels: sbc.labels,
            datasets: [{
                ...sbc.datasets[0],
                data: convertValues(sbc.datasets[0]?.rawData),
            }]
        } : empty;

        const sa = rawChartData.stockAging;
        const stockAging = sa ? {
            labels: sa.labels,
            datasets: sa.datasets.map(ds => ({
                ...ds,
                data: convertValues(ds.rawData),
            }))
        } : empty;

        const gv = rawChartData.geoView;
        const geoView = gv ? {
            labels: gv.labels,
            datasets: [{
                ...gv.datasets[0],
                data: convertValues(gv.datasets[0]?.rawData),
            }]
        } : empty;

        const ts = rawChartData.topSuppliers;
        const topSuppliers = ts ? {
            labels: ts.labels,
            datasets: [{
                ...ts.datasets[0],
                data: convertValues(ts.datasets[0]?.rawData),
            }]
        } : empty;

        const ywc = rawChartData.yearWiseComparison;
        const yearWiseComparison = ywc ? {
            labels: ywc.labels,
            datasets: [{
                ...ywc.datasets[0],
                data: convertValues(ywc.datasets[0]?.rawData),
            }]
        } : empty;

        return { procurementFunnel, cycleTimeTrend, spendByCategory, stockAging, geoView, topSuppliers, yearWiseComparison };
    }, [rawChartData, currency, rates]);

    /* ═══════════════ FETCH FUNCTIONS ═══════════════ */

    const fetchAmountBreakdown = async () => {
        setKpiLoading(p => ({ ...p, amountBreakdown: true }));
        try {
            const unitFilterVal = unitMode === 'ALL (MIXED)' ? null : unitMode.split(' ')[0];
            const gstFilterVal = gstMode === 'With GST' ? 'gst' : null;
            const req = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period, UnitFilter: unitFilterVal, gstfilter: gstFilterVal };
            const [poRes, grnRes, invRes, penRes, cntRes] = await Promise.all([
                postRequest('GetABPOTotal', req),
                postRequest('GetABGRNTotal', req),
                postRequest('GetABInvoiceTotal', req),
                postRequest('GetABPendingTotal', req),
                postRequest('GetABPOCount', req)
            ]);
            const g = a => Array.isArray(a?.data) && a.data.length > 0 ? a.data[0] : {};
            const poData = g(poRes);
            const grnData = g(grnRes);
            const invData = g(invRes);
            const penData = g(penRes);
            const cntData = g(cntRes);

            const poTotal = (gstMode === 'With GST' ? poData.POQtyAmt : poData.BasicAmtPO) ?? null;
            const grnTotal = grnData.TotalReceiptValue ?? null;
            const invoiced = (gstMode === 'With GST' ? invData.POInvQtyAmt : invData.BasicAmountINV) ?? null;
            const pending = penData.PendingBasicAmount ?? null;
            const poCount = cntData.NoOfPO ?? null;

            setAmtBD({ poTotal, grnTotal, invoiced, pending, poCount });
        } catch (e) { console.error('fetchAmountBreakdown error:', e); }
        finally { setKpiLoading(p => ({ ...p, amountBreakdown: false })); }
    };

    const fetchQtyBreakdown = async () => {
        setKpiLoading(p => ({ ...p, qtyBreakdown: true }));
        try {
            const unitFilterVal = unitMode === 'ALL (MIXED)' ? null : unitMode.split(' ')[0];
            const req = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period, UnitFilter: unitFilterVal };
            const [poRes, grnRes, invRes, penRes, cntRes] = await Promise.all([
                postRequest('GetQBOrder', req),
                postRequest('GetQBReceived', req),
                postRequest('GetQBBilled', req),
                postRequest('GetQBShortfall', req),
                postRequest('GetQBInvRatio', req)
            ]);
            const ordered = Array.isArray(poRes?.data) && poRes.data.length > 0
                ? poRes.data.reduce((sum, r) => sum + (Number(r.POQty) || 0), 0)
                : null;

            const received = Array.isArray(grnRes?.data) && grnRes.data.length > 0
                ? (grnRes.data[0].RECQty ?? null)
                : null;

            const billed = Array.isArray(invRes?.data) && invRes.data.length > 0
                ? invRes.data.reduce((sum, r) => sum + (Number(r.POInvQty) || 0), 0)
                : null;

            const shortfall = Array.isArray(penRes?.data) && penRes.data.length > 0
                ? penRes.data.reduce((sum, r) => sum + (Number(r.PendingQuantity) || 0), 0)
                : null;

            const pendingPO = Array.isArray(penRes?.data) && penRes.data.length > 0
                ? penRes.data.reduce((sum, r) => sum + (Number(r.PendingPO) || 0), 0)
                : null;

            const invRatio = Array.isArray(cntRes?.data) && cntRes.data.length > 0
                ? ((cntRes.data[0].InvoiceRatioPercentage || cntRes.data[0].POInvPercentage) ?? null)
                : null;

            setQtyBD({ ordered, received, billed, shortfall, pendingPO, invRatio });
        } catch (e) { console.error('fetchQtyBreakdown', e); }
        finally { setKpiLoading(p => ({ ...p, qtyBreakdown: false })); }
    };

    const fetchProcurementFunnel = useCallback(async () => {
        setChartLoading(p => ({ ...p, procurementFunnel: true }));
        try {
            const res = await postRequest('GetProcurementFunnel', {
                CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period,
            });
            const rows = res?.data || [];
            if (!rows.length) {
                setRawChartData(p => ({ ...p, procurementFunnel: { labels: [], datasets: [] } }));
                return;
            }
            const row = rows[0];
            const stages = [
                { stage: 'PO', value: row.TotalAmt || 0, count: row.TotalPO || 0 },
                { stage: 'GRN', value: row.PORecQtyAmt || 0, count: row.TotalGRN || 0 },
                { stage: 'Invoice', value: row.POInvQtyAmt || 0, count: row.TotalInv || 0 },
            ];
            setRawChartData(p => ({
                ...p,
                procurementFunnel: {
                    labels: stages.map(r => r.stage),
                    datasets: [
                        {
                            type: 'bar', label: 'Value',
                            rawData: stages.map(r => Number(r.value)),
                            data: stages.map(r => Number(r.value)),
                            backgroundColor: '#1a5c4a', yAxisID: 'y', order: 2,
                        },
                        {
                            type: 'line', label: 'Count',
                            data: stages.map(r => Number(r.count)),
                            borderColor: '#f59e0b', backgroundColor: '#f59e0b',
                            pointRadius: 6, pointBackgroundColor: '#f59e0b',
                            pointBorderColor: '#fff', pointBorderWidth: 2,
                            yAxisID: 'y1', tension: 0, order: 1,
                        },
                    ],
                },
            }));
        } catch (e) { console.error('fetchProcurementFunnel', e); }
        finally { setChartLoading(p => ({ ...p, procurementFunnel: false })); }
    }, [companyId, fromDate, toDate, period]);

    const fetchCycleTimeTrend = useCallback(async () => {
        setChartLoading(p => ({ ...p, cycleTimeTrend: true }));
        try {
            const res = await postRequest('GetProcureCycleTime', {
                CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period,
            });
            const rows = res?.data || [];
            if (!rows.length) {
                setRawChartData(p => ({ ...p, cycleTimeTrend: { labels: [], datasets: [] } }));
                return;
            }
            setRawChartData(p => ({
                ...p,
                cycleTimeTrend: {
                    labels: rows.map(r => r.MonthName),
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Total PO Created',
                            data: rows.map(r => Number(r.Total_PO_Created)),
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                            yAxisID: 'y1',
                            order: 2,
                        },
                        {
                            type: 'bar',
                            label: 'PO With GRN',
                            data: rows.map(r => Number(r.PO_With_GRN)),
                            backgroundColor: '#10b981',
                            borderRadius: 4,
                            yAxisID: 'y1',
                            order: 3,
                        },
                        {
                            type: 'line',
                            label: 'Avg Cycle Time (Days)',
                            data: rows.map(r => Number(r.Avg_TAT_Days)),
                            borderColor: '#f59e0b',
                            backgroundColor: 'transparent',
                            tension: 0.4,
                            pointBackgroundColor: '#f59e0b',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 5,
                            yAxisID: 'y',
                            order: 1,
                        }
                    ],
                },
            }));
        } catch (e) { console.error('fetchCycleTimeTrend', e); }
        finally { setChartLoading(p => ({ ...p, cycleTimeTrend: false })); }
    }, [companyId, fromDate, toDate, period]);

    const fetchSpendByCategory = async () => {
        setChartLoading(p => ({ ...p, spendByCategory: true }));
        try {
            const res = await postRequest('GetSpendByCategory', { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period });
            const rows = res?.data || [];
            if (!rows.length) return;
            const colors = ['#1e3a5f', '#2563eb', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
            const rawData = rows.map(r => Number(r.POItemGroupWiseAmt));
            setRawChartData(p => ({
                ...p,
                spendByCategory: {
                    labels: rows.map(r => r.ItemGroupName),
                    datasets: [{
                        rawData, data: rawData,
                        backgroundColor: rows.map((_, i) => colors[i % colors.length]),
                        borderWidth: 2, borderColor: '#fff'
                    }]
                }
            }));
        } catch (e) { console.error('fetchSpendByCategory', e); }
        finally { setChartLoading(p => ({ ...p, spendByCategory: false })); }
    };

    const fetchStockAging = useCallback(async () => {
        setChartLoading(p => ({ ...p, stockAging: true }));
        try {
            const res = await postRequest('GetStockAging', {
                CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period,
                UnitType: stockAgingUnit,
            });
            const rows = res?.data || [];
            if (!rows.length) {
                setRawChartData(p => ({ ...p, stockAging: { labels: [], datasets: [] } }));
                return;
            }
            const isSU = stockAgingUnit !== 'PurchaseUnit';
            setRawChartData(p => ({
                ...p,
                stockAging: {
                    labels: rows.map(r => r.ItemGroupName),
                    datasets: [
                        {
                            label: 'Physical',
                            rawData: rows.map(r => Number(r.TotalPhysicalStock ?? (isSU ? r.PhysicalStockSU : r.PhysicalStockPU) ?? 0)),
                            data: rows.map(r => Number(r.TotalPhysicalStock ?? (isSU ? r.PhysicalStockSU : r.PhysicalStockPU) ?? 0)),
                            backgroundColor: '#1e3a5f', stack: 'a',
                        },
                        {
                            label: 'Incoming',
                            rawData: rows.map(r => Number(r.TotalIncomingStock ?? (isSU ? r.IncomingStockInSU : r.IncomingStockPU) ?? 0)),
                            data: rows.map(r => Number(r.TotalIncomingStock ?? (isSU ? r.IncomingStockInSU : r.IncomingStockPU) ?? 0)),
                            backgroundColor: '#3b82f6', stack: 'a',
                        },
                        {
                            label: 'Floor',
                            rawData: rows.map(r => Number(r.TotalFloorStock ?? (isSU ? r.FloorStockSU : r.FloorStockPU) ?? 0)),
                            data: rows.map(r => Number(r.TotalFloorStock ?? (isSU ? r.FloorStockSU : r.FloorStockPU) ?? 0)),
                            backgroundColor: '#06b6d4', stack: 'a',
                        },
                    ],
                },
            }));
        } catch (e) { console.error('fetchStockAging', e); }
        finally { setChartLoading(p => ({ ...p, stockAging: false })); }
    }, [companyId, fromDate, toDate, period, stockAgingUnit]);

    const fetchGeoView = async () => {
        setChartLoading(p => ({ ...p, geoView: true }));
        try {
            const res = await postRequest('GetGeographicalView', { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period });
            const rows = res?.data || [];
            if (!rows.length) return;
            const colors = ['#1e3a5f', '#06b6d4', '#10b981', '#8b5cf6', '#f59e0b'];
            const rawData = rows.map(r => Number(r.TotalSales));
            setRawChartData(p => ({
                ...p,
                geoView: {
                    labels: rows.map(r => r.State),
                    datasets: [{
                        rawData, data: rawData,
                        backgroundColor: rows.map((_, i) => colors[i % colors.length]),
                        borderWidth: 2, borderColor: '#fff'
                    }]
                }
            }));
        } catch (e) { console.error('fetchGeoView', e); }
        finally { setChartLoading(p => ({ ...p, geoView: false })); }
    };

    const fetchTopSuppliers = async () => {
        setChartLoading(p => ({ ...p, topSuppliers: true }));
        try {
            const res = await postRequest('GetTopSuppliers', { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period });
            const rows = (res?.data || []).slice(0, 10);
            const rawData = rows.map(r => Number(r.TO20ByPOAmt));
            setRawChartData(p => ({
                ...p,
                topSuppliers: {
                    labels: rows.map(r => r.SupplierName),
                    datasets: [{
                        label: 'Amount', rawData, data: rawData,
                        backgroundColor: '#f59e0b', borderRadius: 4
                    }]
                }
            }));
        } catch (e) { console.error('fetchTopSuppliers', e); }
        finally { setChartLoading(p => ({ ...p, topSuppliers: false })); }
    };

    const fetchYearWiseComparison = async () => {
        setChartLoading(p => ({ ...p, yearWiseComparison: true }));
        try {
            const res = await postRequest('GetYearWiseComparison', {
                CompanyID: companyId,
                FromDate: fromDate,
                ToDate: toDate,
                period: period
            });
            const rows = res?.data || [];
            const rawData = rows.map(r => Number(r.YearWisePOAmt));
            const labelTitle = (period === 'Year' || !period) ? 'Year-wise PO Amount' : 'Period Comparison';

            setRawChartData(p => ({
                ...p,
                yearWiseComparison: {
                    labels: rows.map(r => r.PeriodName || r.FYear),
                    datasets: [{
                        label: labelTitle, rawData, data: rawData,
                        backgroundColor: '#1e3a5f', borderRadius: 8
                    }]
                }
            }));
        } catch (e) { console.error('fetchYearWiseComparison', e); }
        finally { setChartLoading(p => ({ ...p, yearWiseComparison: false })); }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        await Promise.all([
            fetchAmountBreakdown(), fetchQtyBreakdown(),
            fetchProcurementFunnel(), fetchCycleTimeTrend(), fetchSpendByCategory(),
            fetchStockAging(), fetchGeoView(), fetchTopSuppliers(), fetchYearWiseComparison()
        ]);
        setLastUpdated(new Date().toLocaleTimeString());
        setLoading(false);
    }, [fetchProcurementFunnel, fetchCycleTimeTrend, fetchStockAging]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [period, fromDate, toDate, companyId]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { fetchProcurementFunnel(); }, [fetchProcurementFunnel]);
    useEffect(() => { fetchCycleTimeTrend(); }, [fetchCycleTimeTrend]);
    useEffect(() => { fetchStockAging(); }, [fetchStockAging]);
    useEffect(() => { fetchAmountBreakdown(); }, [gstMode, unitMode]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { fetchQtyBreakdown(); }, [unitMode]);           // eslint-disable-line react-hooks/exhaustive-deps

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <Box sx={{
            bgcolor: '#f8fafc',
            minHeight: '100vh',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            overflowX: 'hidden',  /* prevent any child from causing horizontal scroll */
            width: '100%',
        }}>

            <DashboardHeader title="Purchase Dashboard" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter period={period} setPeriod={setPeriod} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
                <CurrencyToggle
                    value={currency} onChange={setCurrency}
                    rates={rates} loading={ratesLoading}
                    updatedAt={ratesUpdatedAt} refreshRates={refreshRates}
                />
            </DashboardHeader>

            <Box sx={{
                p: R.pagePad,
                width: '100%',
                boxSizing: 'border-box',
                overflowX: 'hidden',
            }}>

                {/* ══ BREAKDOWN ROW ══ */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    alignItems: 'stretch',
                    gap: { xs: 1.5, sm: 2 },
                    mb: { xs: 2, sm: 3 },
                    width: '100%',
                    minWidth: 0,
                }}>

                    {/* ── Amount Breakdown ── */}
                    <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                        {/* Header */}
                        <Box sx={{
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: '24px 24px 0 0',
                            px: { xs: 2, sm: 3 },
                            py: { xs: 1, sm: 1.25 },
                            minHeight: { xs: 52, sm: 60 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        }}>
                            <Typography sx={{
                                fontSize: { xs: '0.68rem', sm: '0.75rem' },
                                fontWeight: 800, color: '#fff', letterSpacing: '0.1em',
                                display: 'flex', alignItems: 'center', gap: 1
                            }}>
                                {currency}&nbsp; AMOUNT BREAKDOWN
                            </Typography>
                            <GstToggle value={gstMode} onChange={setGstMode} />
                        </Box>

                        {/* Body — metric tiles */}
                        <Box sx={{
                            ...glassStyle,
                            borderRadius: '0 0 24px 24px',
                            borderTop: 'none',
                            px: { xs: 0.5, sm: 1, md: 1.5 },
                            py: { xs: 0.5, sm: 1, md: 1.5 },
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',   /* 375px phones: 2 col */
                                sm: 'repeat(3, 1fr)',   /* 600px tablets: 3 col  */
                                md: 'repeat(5, 1fr)',   /* 900px+: 5 col (original) */
                            },
                            alignItems: 'stretch',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                        }}>
                            {kpiLoading.amountBreakdown && (
                                <LinearProgress sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0,
                                    height: 2, borderRadius: '0 0 24px 24px',
                                    gridColumn: '1 / -1',
                                }} />
                            )}

                            <MetricTile
                                icon={<ShoppingCart size={20} />}
                                value={fmtAmt(amtBD.poTotal, currency)}
                                rawValue={amtBD.poTotal}
                                label="PO TOTAL"
                                currency={currency}
                                onInfoClick={() => openDrill('poTotal')}
                            />
                            <MetricTile
                                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                                value={fmtAmt(amtBD.grnTotal, currency)}
                                rawValue={amtBD.grnTotal}
                                label="GRN TOTAL"
                                currency={currency}
                                onInfoClick={() => openDrill('grnTotal')}
                            />
                            <MetricTile
                                icon={<FileText size={20} />}
                                value={fmtAmt(amtBD.invoiced, currency)}
                                rawValue={amtBD.invoiced}
                                label="INVOICED"
                                currency={currency}
                                onInfoClick={() => openDrill('invoiced')}
                            />
                            <MetricTile
                                icon={<Clock size={20} />}
                                value={fmtAmt(amtBD.pending, currency)}
                                rawValue={amtBD.pending}
                                label="PENDING"
                                currency={currency}
                                onInfoClick={() => openDrill('pending')}
                            />
                            <MetricTile
                                icon={<Box component="span" sx={{ fontSize: '1.1rem', fontWeight: 900, color: '#94a3b8' }}>#</Box>}
                                value={fmtRaw(amtBD.poCount)}
                                rawValue={amtBD.poCount}
                                label="PO COUNT"
                                currency={currency}
                                isLast
                                isLastOdd
                            />
                        </Box>
                    </Box>

                    {/* ── Quantity Breakdown ── */}
                    <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                        {/* Header */}
                        <Box sx={{
                            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                            borderRadius: '24px 24px 0 0',
                            px: { xs: 2, sm: 3 },
                            py: { xs: 1, sm: 1.25 },
                            minHeight: { xs: 52, sm: 60 },
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 1,
                            boxShadow: '0 4px 15px rgba(13,148,136,0.2)',
                        }}>
                            <Typography sx={{
                                fontSize: { xs: '0.68rem', sm: '0.75rem' },
                                fontWeight: 800, color: '#fff', letterSpacing: '0.1em',
                                display: 'flex', alignItems: 'center', gap: 1
                            }}>
                                📦 &nbsp; QUANTITY BREAKDOWN
                            </Typography>
                            <Box
                                onClick={(e) => setUnitAnchor(e.currentTarget)}
                                sx={{
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    color: '#fff', px: 1.5, py: 0.5,
                                    borderRadius: '12px',
                                    fontSize: { xs: '0.6rem', sm: '0.65rem' },
                                    fontWeight: 800, cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.1)',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                }}
                            >
                                Unit: {unitMode === 'ALL (MIXED)' ? 'ALL' : unitMode.split(' ')[0]} ▾
                            </Box>
                            <Popover
                                open={Boolean(unitAnchor)}
                                anchorEl={unitAnchor}
                                onClose={() => setUnitAnchor(null)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                PaperProps={{ sx: { mt: 1, borderRadius: '12px', minWidth: 180, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' } }}
                            >
                                <Box sx={{ p: 1.5 }}>
                                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e3a8a', mb: 1, textTransform: 'uppercase' }}>SELECT UNIT</Typography>
                                    <List sx={{ p: 0 }}>
                                        {['KG', 'LTR', 'SHEET', 'ALL'].map(o => (
                                            <ListItemButton key={o} onClick={() => { setUnitMode(o); setUnitAnchor(null); }} sx={{ borderRadius: '8px', py: 1, bgcolor: unitMode === o ? '#0f172a' : 'transparent', '&:hover': { bgcolor: unitMode === o ? '#0f172a' : '#f1f5f9' } }}>
                                                <ListItemText primary={o} primaryTypographyProps={{ fontSize: '0.75rem', fontWeight: 800, color: unitMode === o ? '#fff' : '#475569' }} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Box>
                            </Popover>
                        </Box>

                        {/* Body */}
                        <Box sx={{
                            ...glassStyle,
                            borderRadius: '0 0 24px 24px',
                            borderTop: 'none',
                            px: { xs: 0.5, sm: 1, md: 1.5 },
                            py: { xs: 0.5, sm: 1, md: 1.5 },
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',   /* 375px phones: 2 col */
                                sm: 'repeat(3, 1fr)',   /* 600px tablets: 3 col */
                                md: 'repeat(5, 1fr)',   /* 900px+: 5 col (original) */
                            },
                            alignItems: 'stretch',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'hidden',
                        }}>
                            {kpiLoading.qtyBreakdown && (
                                <LinearProgress sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0,
                                    height: 2, borderRadius: '0 0 24px 24px',
                                    gridColumn: '1 / -1',
                                }} />
                            )}

                            <MetricTile
                                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                                value={fmtQty(qtyBD.ordered)}
                                rawValue={qtyBD.ordered}
                                label="ORDERED"
                                isAmount={false}
                                onInfoClick={() => openDrill('ordered')}
                            />
                            <MetricTile
                                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                                value={fmtQty(qtyBD.received)}
                                rawValue={qtyBD.received}
                                label="RECEIVED"
                                isAmount={false}
                                onInfoClick={() => openDrill('received')}
                            />
                            <MetricTile
                                icon={<FileText size={20} />}
                                value={fmtQty(qtyBD.billed)}
                                rawValue={qtyBD.billed}
                                label="BILLED"
                                isAmount={false}
                                onInfoClick={() => openDrill('billed')}
                            />
                            <MetricTile
                                icon={<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444"><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeWidth={2} d="M12 8v4M12 16h.01" /></svg>}
                                value={fmtQty(qtyBD.shortfall)}
                                rawValue={qtyBD.shortfall}
                                label="SHORTFALL"
                                isAmount={false}
                                onInfoClick={() => openDrill('pending')}
                            />
                            <MetricTile
                                icon={<Box component="span" sx={{ fontSize: '1.1rem', fontWeight: 900, color: '#0d9488' }}>%</Box>}
                                value={fmtPct(qtyBD.invRatio)}
                                rawValue={qtyBD.invRatio}
                                label="INV RATIO"
                                isAmount={false}
                                isLast
                                isLastOdd
                            />
                        </Box>
                    </Box>
                </Box>

                {/* ══ CHARTS GRID — all 7 charts in one fluid grid ══
                    lg+ (≥1200px / ~800px at 150% zoom): 3 per row
                    sm–lg (600–1200px):                   2 per row
                    xs  (<600px):                         1 per row
                ══════════════════════════════════════════════════ */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)',
                    },
                    gap: { xs: 1.25, sm: 1.5 },
                    width: '100%',
                    minWidth: 0,
                }}>

                    {/* Chart 1 — Procurement Funnel */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.procurementFunnel}>
                            <DashboardChart
                                title="Procurement Funnel"
                                type="bar"
                                data={charts.procurementFunnel}
                                options={{
                                    plugins: {
                                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
                                        tooltip: {
                                            mode: 'index',
                                            intersect: false,
                                            callbacks: {
                                                label: (ctx) => {
                                                    if (ctx.dataset.yAxisID === 'y1') {
                                                        const stage = ctx.label;
                                                        if (stage === 'GRN') return `No. of GRN: ${ctx.raw}`;
                                                        if (stage === 'Invoice') return `No. of Invoice: ${ctx.raw}`;
                                                        return `No. of POs: ${ctx.raw}`;
                                                    }
                                                    return `Value: ${fmtAmt(ctx.raw, currency)}`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            position: 'left',
                                            title: { display: true, text: `Value (${currency})`, font: { size: 10 } },
                                            ticks: { callback: dynamicTick },
                                            beginAtZero: true,
                                        },
                                        y1: {
                                            position: 'right',
                                            title: { display: true, text: 'Count', font: { size: 10 } },
                                            grid: { drawOnChartArea: false },
                                            beginAtZero: true,
                                        },
                                        x: {
                                            title: { display: true, text: 'Procurement Stage', font: { size: 10 } },
                                            grid: { display: false }
                                        }
                                    }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 2 — Procurement Cycle Time Trend */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.cycleTimeTrend}>
                            <DashboardChart
                                title="Procurement Cycle Time Trend (Days)"
                                type="line"
                                data={charts.cycleTimeTrend}
                                options={{
                                    plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } } },
                                    scales: {
                                        x: {
                                            title: { display: true, text: 'Month', font: { size: 10 } },
                                            grid: { display: false },
                                            offset: true
                                        },
                                        y: { 
                                            position: 'left',
                                            title: { display: true, text: 'Avg. Cycle Time (Days)', font: { size: 10 } }, 
                                            beginAtZero: true 
                                        },
                                        y1: {
                                            position: 'right',
                                            title: { display: true, text: 'Count', font: { size: 10 } },
                                            grid: { drawOnChartArea: false },
                                            beginAtZero: true,
                                        }
                                    },
                                    elements: { line: { fill: false } }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 3 — Spend by Category */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.spendByCategory}>
                            <DashboardChart
                                title="Spend by Category"
                                type="doughnut"
                                data={charts.spendByCategory}
                                options={{
                                    plugins: {
                                        legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, padding: 10 } },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => ` ${ctx.label}: ${fmtAmt(ctx.raw, currency)}`
                                            }
                                        }
                                    },
                                    cutout: '60%'
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 4 — Geographical View */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.geoView}>
                            <DashboardChart
                                title="Geographical View"
                                type="doughnut"
                                data={charts.geoView}
                                options={{
                                    cutout: '60%',
                                    plugins: {
                                        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 10, usePointStyle: true } },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => ` ${ctx.label}: ${fmtAmt(ctx.raw, currency)}`
                                            }
                                        }
                                    }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 5 — Stock Aging & Inventory Movement */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.stockAging}>
                            <DashboardChart
                                title="Stock Aging & Inventory Movement"
                                type="bar"
                                data={charts.stockAging}
                                actions={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {['StockUnit', 'PurchaseUnit'].map(unit => (
                                            <Box
                                                key={unit}
                                                onClick={() => setStockAgingUnit(unit)}
                                                sx={{
                                                    px: 1.1, py: 0.35,
                                                    fontSize: '0.67rem', fontWeight: 700,
                                                    borderRadius: '6px', cursor: 'pointer',
                                                    bgcolor: stockAgingUnit === unit ? '#0f172a' : '#f1f5f9',
                                                    color: stockAgingUnit === unit ? '#fff' : '#64748b',
                                                    border: `1px solid ${stockAgingUnit === unit ? '#0f172a' : '#e2e8f0'}`,
                                                    transition: 'all 0.15s',
                                                    whiteSpace: 'nowrap',
                                                    '&:hover': { bgcolor: stockAgingUnit === unit ? '#1e293b' : '#e2e8f0' },
                                                }}
                                            >
                                                {unit === 'StockUnit' ? 'Stock Unit' : 'Purchase Unit'}
                                            </Box>
                                        ))}
                                        <Tooltip title="View Details" arrow>
                                            <Box
                                                onClick={() => openDrill(stockAgingUnit === 'PurchaseUnit' ? 'stockAgingPU' : 'stockAgingSU')}
                                                sx={{
                                                    width: 26, height: 26,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '6px', cursor: 'pointer', ml: 0.5,
                                                    bgcolor: '#f1f5f9', color: '#64748b',
                                                    border: '1px solid #e2e8f0',
                                                    '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                                                }}
                                            >
                                                <Info size={13} />
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                }
                                options={{
                                    interaction: { mode: 'index', intersect: false },
                                    plugins: {
                                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 } } },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => {
                                                    const v = ctx.raw;
                                                    const abs = Math.abs(v);
                                                    let formatted;
                                                    if (abs >= 100000) formatted = `${(v / 100000).toFixed(2)} L`;
                                                    else if (abs >= 1000) formatted = `${(v / 1000).toFixed(2)} K`;
                                                    else formatted = Number(v).toLocaleString('en-IN', { maximumFractionDigits: 3 });
                                                    return ` ${ctx.dataset.label}: ${formatted}`;
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            stacked: true,
                                            title: { display: true, text: 'Material Category', font: { size: 10 } },
                                            grid: { display: false }
                                        },
                                        y: {
                                            stacked: true,
                                            beginAtZero: true,
                                            title: { display: true, text: `Stock (${stockAgingUnit === 'PurchaseUnit' ? 'Purchase Unit' : 'Stock Unit'})`, font: { size: 10 } },
                                            ticks: {
                                                callback: (value) => {
                                                    const abs = Math.abs(value);
                                                    if (abs >= 100000) return `${(value / 100000).toFixed(1)} L`;
                                                    if (abs >= 1000) return `${(value / 1000).toFixed(1)} K`;
                                                    return value;
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 6 — Top Suppliers */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.topSuppliers}>
                            <DashboardChart
                                title="Top Suppliers"
                                type="bar"
                                data={charts.topSuppliers}
                                options={{
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => ` Amount: ${fmtAmt(ctx.raw, currency)}`
                                            }
                                        }
                                    },
                                    scales: {
                                        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45 } },
                                        y: {
                                            min: 0,
                                            beginAtZero: true,
                                            ticks: { font: { size: 10 }, callback: dynamicTick }
                                        }
                                    },
                                    elements: { bar: { borderRadius: 4 } }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                    {/* Chart 7 — Year-wise Comparison */}
                    <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                        <ChartLoader loading={chartLoading.yearWiseComparison}>
                            <DashboardChart
                                title="Year-wise Comparison"
                                type="bar"
                                data={charts.yearWiseComparison}
                                options={{
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (ctx) => `Amount: ${fmtAmt(ctx.raw, currency)}`
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            title: { display: true, text: 'Financial Year', font: { size: 10 } }
                                        },
                                        y: {
                                            beginAtZero: true,
                                            ticks: { callback: dynamicTick },
                                            title: { display: true, text: 'PO Amount', font: { size: 10 } }
                                        }
                                    }
                                }}
                            />
                        </ChartLoader>
                    </Box>

                </Box>

            </Box>

            {/* ══ DRILL-DOWN MODAL ══ */}
            <DrillDownModal
                open={drillOpen}
                onClose={closeDrill}
                tileKey={drillKey}
                companyId={companyId}
                period={period}
                parentFromDate={fromDate}
                parentToDate={toDate}
            />

        </Box>
    );
};

export default PurchaseDashboard;