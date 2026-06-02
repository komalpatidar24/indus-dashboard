import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Typography, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Popover, List, ListItemButton, ListItemText, TextField,
    keyframes,
} from '@mui/material';
import {
    ShoppingCart, Filter, X, Activity, Target, Users, TrendingUp,
    DollarSign, Info,
} from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DrillDownModal from '../common/Drilldownmodal';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import CurrencyToggle from '../common/CurrencyToggle';
import { useCurrencyRates, formatCurrency, CURRENCIES } from '../common/useCurrencyRates';
import { R, GRID } from '../common/dashboardTokens';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler
} from 'chart.js';
import { Doughnut, Bar, Line, Pie } from 'react-chartjs-2';
import { postRequest } from '../api/api';
import dayjs from "dayjs";

/* ════════════════════════════════════════════════════════════
   KEYFRAMES — smooth, modern animations
════════════════════════════════════════════════════════════ */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const shimmer = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;
const countIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const topBarSlide = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const barGrow = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const rowSlideIn = keyframes`
  from { opacity: 0; transform: translateX(-20px); }
  to   { opacity: 1; transform: translateX(0); }
`;

/* ─────────────────────────────────────────────────────────────
   DATA NORMALIZER  (unchanged logic)
   ───────────────────────────────────────────────────────────── */
const CHART_COLORS = [
    '#002855', '#00a8ff', '#10ac84', '#1289a7',
    '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6',
];

/* Colors matching Top 5 Sales Persons donut */
const FUNNEL_COLORS = ['#00a8ff', '#10ac84', '#f59e0b'];

/* Colors for State-Wise Trend pie */
const STATE_PIE_COLORS = ['#ef4444', '#3b82f6', '#10ac84', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

/* Colors for treemap */
const TREEMAP_COLORS = ['#1e3a8a', '#0369a1', '#047857', '#6d28d9', '#b45309'];

/* ── Trend slot generators ── */
const getMonthSlots = (fromDateStr, toDateStr) => {
    let start, end;
    if (fromDateStr && toDateStr) {
        start = new Date(fromDateStr); start.setDate(1);
        end   = new Date(toDateStr);   end.setDate(1);
    } else {
        end   = new Date(); end.setDate(1);
        start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
    }
    const slots = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= limit) {
        slots.push({
            label: cur.toLocaleString('en-US', { month: 'short' }),
            year:  cur.getFullYear(),
            month: cur.getMonth() + 1,
        });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return slots;
};

const getFYSlots = (fromDateStr, toDateStr) => {
    const endDate   = toDateStr   ? new Date(toDateStr)   : new Date();
    const startDate = fromDateStr ? new Date(fromDateStr) : null;
    const endFY   = endDate.getMonth() >= 3 ? endDate.getFullYear() : endDate.getFullYear() - 1;
    let   startFY = startDate
        ? (startDate.getMonth() >= 3 ? startDate.getFullYear() : startDate.getFullYear() - 1)
        : endFY - 2;
    const slots = [];
    for (let s = startFY; s <= endFY; s++) slots.push(`${s}-${s + 1}`);
    while (slots.length < 3) {
        const first = parseInt(slots[0].split('-')[0]);
        slots.unshift(`${first - 1}-${first}`);
    }
    return slots;
};

const normalizeChartData = (raw, chartKey) => {
    if (!raw) return { labels: [], datasets: [] };
    if (!Array.isArray(raw) && raw.labels && raw.datasets) return raw;

    if (Array.isArray(raw) && raw.length > 0) {
        const keys = Object.keys(raw[0]);

        if (chartKey === 'top5Customers' || chartKey === 'top5SalesPersons') {
            const labelKey = chartKey === 'top5Customers'
                ? (keys.find(k => k === 'ClientName') ?? keys.find(k => /name|label|customer/i.test(k)) ?? keys[0])
                : (keys.find(k => k === 'SalesPersonName') ?? keys.find(k => /name|label|person/i.test(k)) ?? keys[0]);
            const valueKey = chartKey === 'top5Customers'
                ? (keys.find(k => k === 'TOP5CustomersBySalesAmt') ?? keys.find(k => /amount|sales|value|total/i.test(k)) ?? keys[1])
                : (keys.find(k => k === 'TOP5SalesPersonBySalesAmt') ?? keys.find(k => /amount|sales|value|total/i.test(k)) ?? keys[1]);
            return {
                labels: raw.map(r => r[labelKey]),
                datasets: [{
                    label: 'Sales',
                    data: raw.map(r => parseFloat(r[valueKey]) || 0),
                    backgroundColor: CHART_COLORS,
                }],
            };
        }

        if (['weeklyFunnel', 'weeklySalesTarget', 'weeklyBilling', 'weeklyJobStatus'].includes(chartKey)) {
            const labelKey = keys.find(k => /week|date|period|label|name/i.test(k)) ?? keys[0];
            const targetLabels = ['Week 1', 'Week 2', 'Week 3', 'Current Week'];
            let activeRaw = raw;
            const hasWeekLabels = raw.some(r => r[labelKey]?.toString().includes('Week'));
            if (hasWeekLabels || chartKey === 'weeklyJobStatus' || chartKey === 'weeklyFunnel') {
                activeRaw = targetLabels.map(lbl => {
                    const match = raw.find(r => r[labelKey] === lbl);
                    return match ? match : { [labelKey]: lbl };
                });
            }

            if (chartKey === 'weeklyFunnel') {
                const FUNNEL_CONFIG = [
                    { key: 'Quotation', label: 'Quotation', color: FUNNEL_COLORS[0] },
                    { key: 'Order', label: 'Order', color: FUNNEL_COLORS[1] },
                    { key: 'Invoice', label: 'Invoice', color: FUNNEL_COLORS[2] }
                ];
                return {
                    labels: activeRaw.map(r => r[labelKey]),
                    datasets: FUNNEL_CONFIG.map((cfg) => {
                        const amountKey = cfg.key + 'Amount';
                        const countKey = cfg.key + 'Count';
                        let actualKey = null;
                        for (const r of raw) {
                            if (r[amountKey] !== undefined) { actualKey = amountKey; break; }
                            if (r[countKey] !== undefined) { actualKey = countKey; break; }
                        }
                        const isAmount = actualKey && actualKey.includes('Amount');
                        return {
                            label: cfg.label,
                            data: activeRaw.map(r => {
                                const val = parseFloat(r[actualKey]) || 0;
                                return isAmount ? parseFloat((val / 100000).toFixed(2)) : val;
                            }),
                            backgroundColor: cfg.color,
                            borderRadius: 4,
                            barThickness: 45,
                        };
                    })
                };
            }

            if (chartKey === 'weeklySalesTarget') {
                return {
                    labels: activeRaw.map(r => r[labelKey]),
                    datasets: [
                        {
                            type: 'bar', label: 'Jobs',
                            data: activeRaw.map(r => parseFloat((parseFloat(r.OldJobSales) / 100000).toFixed(2)) || 0),
                            backgroundColor: '#002855', borderRadius: 4, order: 1,
                        }
                    ]
                };
            }

            if (chartKey === 'weeklyBilling') {
                return {
                    labels: activeRaw.map(r => r[labelKey]),
                    datasets: [
                        {
                            label: 'Actual Billing',
                            data: raw.map(r => parseFloat((parseFloat(r.ActualBilling) / 100000).toFixed(2)) || 0),
                            backgroundColor: 'rgba(0, 40, 85, 0.05)', borderColor: '#002855', borderWidth: 2,
                            pointBackgroundColor: '#fff', pointBorderColor: '#002855', pointBorderWidth: 2,
                            pointRadius: 5, fill: true, tension: 0.4,
                        }
                    ]
                };
            }

            if (chartKey === 'weeklyJobStatus') {
                return {
                    labels: activeRaw.map(r => r[labelKey]),
                    datasets: [
                        { label: 'On-Time', data: activeRaw.map(r => parseFloat(r.OnTime) || 0), backgroundColor: '#059669', borderRadius: 4, barThickness: 40 },
                        { label: 'Delay', data: activeRaw.map(r => parseFloat(r.Delayed) || 0), backgroundColor: '#ef4444', borderRadius: 4, barThickness: 40 }
                    ]
                };
            }
        }

        if (chartKey === 'receivablesAging' || chartKey === 'overdueAging') {
            const labelKey = keys.find(k => /bucket|range|aging|label|period/i.test(k)) ?? keys[0];
            const valueKey = keys.find(k => /amount|value|total/i.test(k)) ?? keys[1];
            return {
                labels: raw.map(r => r[labelKey]),
                datasets: [{ label: 'Amount', data: raw.map(r => parseFloat(r[valueKey]) || 0), backgroundColor: CHART_COLORS }],
            };
        }

        const labelKey = keys[0];
        return {
            labels: raw.map(r => r[labelKey]),
            datasets: keys.slice(1).map((k, i) => ({
                label: k,
                data: raw.map(r => parseFloat(r[k]) || 0),
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                borderColor: CHART_COLORS[i % CHART_COLORS.length],
                borderWidth: 2, fill: false,
            })),
        };
    }
    return { labels: [], datasets: [] };
};

/* ════════════════════════════════════════════════════════════
   SALES DRILLDOWN CONFIG
   — API naming follows pattern: GetSalesDrillDown<MetricName>
   — Each entry maps one KPI card info-icon to its table popup
════════════════════════════════════════════════════════════ */
const SALES_DRILL_CONFIG = {
    /* Sales Dashboard — info icon popup for Order Conversion Ratio KPI card */
    orderConversion: {
        title: 'Order Conversion Ratio',
        apiName: 'GetSalesDrillDownOrderConversion',
        columns: [
            { key: 'ClientName',       label: 'Client Name',       width: 160 },
            { key: 'EnquiryNo',        label: 'Enquiry No',        width: 130 },
            { key: 'EnquiryDate',      label: 'Enquiry Date',      width: 115 },
            { key: 'SalesPerson',      label: 'Sales Person',      width: 130 },
            { key: 'ConversionStatus', label: 'Conversion Status', width: 140 },
            { key: 'ConversionDays',   label: 'Conv. Days',        width: 100 },
            { key: 'Status',           label: 'Status',            width: 90  },
        ],
    },
    /* Sales Dashboard — info icon popup for Total Sales Value KPI card */
    totalSalesValue: {
        title: 'Total Sales Value',
        apiName: 'GetSalesDrillDownTotalSalesValue',
        columns: [
            { key: 'CustomerName',  label: 'Customer Name', width: 160 },
            { key: 'InvoiceNo',     label: 'Invoice No',    width: 130 },
            { key: 'InvoiceDate',   label: 'Invoice Date',  width: 115 },
            { key: 'TaxableAmount', label: 'Taxable Amt',   width: 120 },
            { key: 'CGSTAmount',    label: 'CGST',          width: 90  },
            { key: 'SGSTAmount',    label: 'SGST',          width: 90  },
            { key: 'IGSTAmount',    label: 'IGST',          width: 90  },
            { key: 'GrossAmount',   label: 'Gross Amt',     width: 120 },
            { key: 'Status',        label: 'Status',        width: 90  },
        ],
    },
    /* Sales Dashboard — info icon popup for Total Order KPI card */
    totalOrder: {
        title: 'Total Order',
        apiName: 'GetSalesDrillDownTotalOrder',
        columns: [
            { key: 'CustomerName',   label: 'Customer Name',    width: 180 },
            { key: 'TotalOrders',    label: 'Total Orders',     width: 110 },
            { key: 'LatestOrderDate',label: 'Latest Order Date',width: 145 },
            { key: 'CreatedBy',      label: 'Created By',       width: 120 },
            { key: 'Status',         label: 'Status',           width: 90  },
            { key: 'OrderAgeDays',   label: 'Age (Days)',       width: 100 },
        ],
    },
    /* Sales Dashboard — info icon popup for Avg. Order Value KPI card */
    avgOrderValue: {
        title: 'Avg. Order Value',
        apiName: 'GetSalesDrillDownAvgOrderValue',
        columns: [
            { key: 'CustomerName',   label: 'Customer Name',    width: 180 },
            { key: 'AvgOrderValue',  label: 'Avg Order Value',  width: 130 },
            { key: 'TotalOrders',    label: 'Total Orders',     width: 110 },
            { key: 'TotalOrderAmount',label: 'Total Amt',       width: 120 },
            { key: 'LatestOrderDate',label: 'Latest Order Date',width: 145 },
            { key: 'CreatedBy',      label: 'Created By',       width: 120 },
            { key: 'Status',         label: 'Status',           width: 90  },
        ],
    },
    /* Sales Dashboard — info icon popup for Total Customer KPI card */
    totalCustomer: {
        title: 'Total Customer',
        apiName: 'GetSalesDrillDownTotalCustomer',
        columns: [
            { key: 'CustomerName',   label: 'Customer Name',    width: 180 },
            { key: 'TotalOrders',    label: 'Total Orders',     width: 110 },
            { key: 'LatestOrderDate',label: 'Latest Order Date',width: 145 },
            { key: 'CreatedBy',      label: 'Created By',       width: 120 },
            { key: 'Status',         label: 'Status',           width: 90  },
            { key: 'OrderAgeDays',   label: 'Age (Days)',       width: 100 },
        ],
    },
};

/* ─── Card wrapper ───────────────────────────────────────────── */
const glassStyle = {
    bgcolor: 'rgba(255, 255, 255, 0.92)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 24px -4px rgba(15,23,42,0.07)',
    transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.9) inset, 0 16px 40px -8px rgba(15,23,42,0.12)',
        borderColor: 'rgba(255, 255, 255, 0.7)',
    },
};

const Card = ({ children, sx = {}, animDelay = 0 }) => (
    <Paper elevation={0} sx={{
        ...glassStyle,
        p: { xs: 1.5, sm: 2, md: 2.5 }, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column',
        animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.2,0.64,1) ${animDelay}s both`,
        position: 'relative', overflow: 'hidden',
        '&::before': {
            content: '""',
            position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: 'linear-gradient(90deg, #2e86ab, #10ac84, #2e86ab)',
            backgroundSize: '200% 100%',
            animation: `${shimmer} 4s linear infinite, ${topBarSlide} 0.7s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.1}s both`,
            transformOrigin: 'left center', opacity: 0.6,
            borderRadius: '20px 20px 0 0', transition: 'opacity 0.3s, height 0.25s',
        },
        '&:hover::before': { opacity: 1, height: '4px' },
        ...sx,
    }}>
        {children}
    </Paper>
);

/* ─── Currency symbol lookup ────────────────────────────────── */
const getCurrencySym = (code) => CURRENCIES.find(c => c.code === code)?.symbol ?? '₹';

/* Compact formatter for chart axis/tooltip values (chart data stored in INR Lakhs) */
const fmtChartValue = (lakhsINR, code, rates) => {
    const inr = lakhsINR * 1e5;
    const rate = rates?.[code] ?? 1;
    const v = code === 'INR' ? inr : inr * rate;
    const s = getCurrencySym(code);
    const abs = Math.abs(v);
    if (code === 'INR') {
        if (abs >= 1e7) return `${s}${(v/1e7).toFixed(2)}Cr`;
        if (abs >= 1e5) return `${s}${(v/1e5).toFixed(2)}L`;
        return `${s}${(v/1e3).toFixed(1)}K`;
    }
    if (abs >= 1e6) return `${s}${(v/1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${s}${(v/1e3).toFixed(2)}K`;
    return `${s}${v.toFixed(2)}`;
};

/* ─── Smart Y-axis callback ─────────────────────────────────── */
const makeSmartYCallback = (code, rates) => (value) => fmtChartValue(value, code, rates);

/* ─── Shared tooltip label ──────────────────────────────────── */
const makeTooltipLabel = (code, rates) => (ctx) => {
    const val = ctx.parsed?.y ?? ctx.raw ?? 0;
    return `  ${ctx.dataset.label}: ${fmtChartValue(val, code, rates)}`;
};

const tooltipLabelColor = (ctx) => ({
    borderColor: ctx.dataset.backgroundColor ?? ctx.dataset.borderColor ?? '#ccc',
    backgroundColor: ctx.dataset.backgroundColor ?? ctx.dataset.borderColor ?? '#ccc',
    borderWidth: 2,
    borderRadius: 3,
});

/* ─── Base chart options — ALL charts inherit these.
   Key: interaction.mode='index' + intersect=false means
   hovering anywhere on an x-position reveals ALL datasets.
─────────────────────────────────────────────────────────────── */
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',       // show ALL datasets at hovered x-index
        intersect: false,    // fire even when not directly over a bar/point
    },
    plugins: {
        legend: {
            position: 'top', align: 'end',
            labels: { usePointStyle: true, boxWidth: 8, padding: 20, font: { size: 11, family: "'Plus Jakarta Sans', sans-serif", weight: '600' } }
        },
        tooltip: {
            backgroundColor: 'rgba(15,23,42,0.95)', padding: 12, cornerRadius: 8,
            titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
            bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
            callbacks: { labelColor: tooltipLabelColor },
        }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' }, color: '#64748b' },
            border: { display: false }
        },
        y: {
            grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
            ticks: {
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                color: '#64748b',
                callback: makeSmartYCallback('₹'),
            },
            border: { display: false }
        },
    },
    animation: { duration: 1200, easing: 'easeOutQuart' },
};

/* ─── Utility: skip empty weeks ─────────────────────────────── */
const skipEmptyWeeks = (chartData) => {
    if (!chartData?.labels?.length || !chartData?.datasets?.length) return chartData;
    const keepIdx = chartData.labels
        .map((_, i) => i)
        .filter(i => chartData.datasets.some(ds => {
            const v = ds.data?.[i];
            return v !== null && v !== undefined && v !== 0;
        }));
    if (keepIdx.length === chartData.labels.length) return chartData;
    return {
        labels: keepIdx.map(i => chartData.labels[i]),
        datasets: chartData.datasets.map(ds => ({
            ...ds,
            data: keepIdx.map(i => ds.data?.[i] ?? 0),
        })),
    };
};

/* ─── Currency formatter ─────────────────────────────────────── */
/* fmtCurrency now delegates to the shared formatCurrency util */
const fmtCurrency = (value, currency, rates) => formatCurrency(value, currency ?? 'INR', rates ?? {});

/* ─── AnimatedNumber ─────────────────────────────────────────
   First load  → counts up from 0 (ease-out) over ~1.3 s.
   Later change → instantly shows new value with a CSS slide
                  from top → down (for GST toggle, filters, etc.)
─────────────────────────────────────────────────────────────── */
const parseKpiString = (val) => {
    if (val == null || val === '—') return null;
    const m = String(val).match(/^([^0-9-]*)(-?[0-9]+(?:\.[0-9]+)?)(.*)$/);
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
    const [slideKey, setSlideKey] = useState(0); // increments to re-trigger CSS
    const isFirstRef = useRef(true);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!parsed) { setCur(0); return; }
        cancelAnimationFrame(rafRef.current);
        const target = parsed.num;

        if (isFirstRef.current) {
            // ── Page load: count up 0 → target ──
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
            // ── Subsequent change (GST toggle, filter): slide top → down ──
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

/* ─── Divider ──────────────────────────────────────────────── */
const VDivider = () => <Box sx={{ width: '1px', bgcolor: 'rgba(0,0,0,0.06)', alignSelf: 'stretch', mx: 0.5, my: 2 }} />;

const _now = dayjs();
/* ── Current financial year logic ── */
const _cYear = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO = `${_cYear + 1}-03-31`;

/* ════════════════════════════════════════════════════════════
   GST TOGGLE (standalone)
════════════════════════════════════════════════════════════ */
const GstToggle = ({ value, onChange }) => (
    <Box sx={{
        display: 'inline-flex', bgcolor: 'rgba(255,255,255,0.18)',
        p: '3px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.3)', gap: '2px',
    }}>
        {['Without GST', 'With GST'].map(opt => (
            <Box key={opt} onClick={() => onChange(opt)} sx={{
                px: 1.25, py: 0.4, fontSize: '0.62rem', fontWeight: 800,
                cursor: 'pointer', borderRadius: '7px',
                bgcolor: value === opt ? '#ffffff' : 'transparent',
                color: value === opt ? '#0f172a' : 'rgba(255,255,255,0.85)',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                boxShadow: value === opt ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                whiteSpace: 'nowrap',
            }}>
                {opt}
            </Box>
        ))}
    </Box>
);

/* CurrencyToggle is now imported from ../common/CurrencyToggle */

/* ════════════════════════════════════════════════════════════
   KPI CARD
════════════════════════════════════════════════════════════ */
const KpiCard = ({ icon, value, label, tint, iconColor, stripe, animDelay = 0, extra, onInfoClick }) => (
    <Box sx={{
        flex: '1 1 0', minWidth: 0, borderRadius: { xs: '14px', sm: '20px' }, bgcolor: '#ffffff',
        border: '1px solid #e9eef4',
        boxShadow: '0 2px 0 rgba(15,23,42,0.03), 0 4px 20px rgba(15,23,42,0.07)',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden', position: 'relative',
        animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
        willChange: 'transform, box-shadow',
        '&:hover': {
            transform: 'translateY(-6px) scale(1.01)',
            boxShadow: `0 16px 36px -8px ${stripe}33, 0 4px 16px rgba(15,23,42,0.08)`,
            borderColor: `${stripe}44`,
        },
        '&:hover .kpi-stripe': { width: '5px', boxShadow: `3px 0 14px ${stripe}66` },
        '&:hover .kpi-value': { color: stripe },
    }}>
        <Box className="kpi-stripe" sx={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
            background: `linear-gradient(180deg, ${stripe} 0%, ${stripe}88 100%)`,
            boxShadow: `2px 0 8px ${stripe}44`, borderRadius: '20px 0 0 20px',
            transition: 'width 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
        }} />
        <Box sx={{
            position: 'absolute', top: -24, right: -24, width: 96, height: 96,
            borderRadius: '50%', bgcolor: tint, opacity: 0.6, pointerEvents: 'none',
        }} />
        <Box sx={{ pl: { xs: 2, sm: 3 }, pr: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2.5 }, pb: { xs: 1.2, sm: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: 0.7, sm: 1 } }}>
            <Box sx={{
                width: { xs: 34, sm: 44 }, height: { xs: 34, sm: 44 }, borderRadius: '13px', bgcolor: tint,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${iconColor}22`,
                boxShadow: `0 2px 10px ${iconColor}22, inset 0 1px 0 ${iconColor}15`,
                animation: `${fadeIn} 0.5s ease ${animDelay + 0.15}s both`,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                {React.cloneElement(icon, { size: 16, strokeWidth: 2.2, color: iconColor })}
            </Box>
            <Typography className="kpi-value" sx={{
                fontSize: { xs: '1.05rem', md: '1.5rem' },
                fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em',
                fontFamily: "'Plus Jakarta Sans', sans-serif", mt: { xs: 0.2, sm: 0.5 },
                transition: 'color 0.28s ease',
                animation: `${countIn} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.2}s both`,
            }}>
                <AnimatedNumber value={value} />
            </Typography>
            <Typography sx={{
                fontSize: { xs: '0.58rem', sm: '0.64rem' }, fontWeight: 700, color: '#7c8fa6',
                textTransform: 'uppercase', letterSpacing: '0.09em',
                fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.4,
            }}>
                {label}
            </Typography>
            {extra && <Box sx={{ mt: 0.25 }}>{extra}</Box>}
        </Box>

        {/* Info icon — top-right corner, shown only when onInfoClick is provided */}
        {onInfoClick && (
            <Box
                onClick={e => { e.stopPropagation(); onInfoClick(); }}
                sx={{
                    position: 'absolute', top: 9, right: 9,
                    width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: iconColor,
                    bgcolor: tint,
                    border: `1.5px solid ${iconColor}33`,
                    borderRadius: '8px',
                    boxShadow: `0 1px 6px ${iconColor}22`,
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    '&:hover': {
                        bgcolor: `${iconColor}22`,
                        border: `1.5px solid ${iconColor}88`,
                        transform: 'scale(1.18)',
                        boxShadow: `0 3px 10px ${iconColor}44`,
                    },
                    zIndex: 2,
                }}
            >
                <Info size={14} strokeWidth={2.5} />
            </Box>
        )}
    </Box>
);

/* ── KPI card configs ── */
const KPI_CONFIGS = {
    orderConversion: { label: 'Order Conversion Ratio', icon: <Activity />, tint: '#e8f4f8', iconColor: '#2e86ab', stripe: '#2e86ab' },
    totalSalesValue: { label: 'Total Sales Value', icon: <Target />, tint: '#e6f4f0', iconColor: '#2a9d74', stripe: '#2a9d74' },
    totalSalesQty: { label: 'Total Order', icon: <ShoppingCart />, tint: '#fdf3e6', iconColor: '#c8820a', stripe: '#c8820a' },
    avgOrderValue: { label: 'Avg. Order Value', icon: <TrendingUp />, tint: '#eeebfa', iconColor: '#6c4fcf', stripe: '#6c4fcf' },
    totalCustomer: { label: 'Total Customer', icon: <Users />, tint: '#fce9f3', iconColor: '#c2416a', stripe: '#c2416a' },
};

/* ─── Top 5 Customers — ranked leaderboard design ─────────── */
const RANK_PALETTE = [
    { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', medal: '🥇' },
    { color: '#00a8ff', bg: '#eff9ff', border: '#bae6fd', medal: '🥈' },
    { color: '#10ac84', bg: '#f0fdf4', border: '#bbf7d0', medal: '🥉' },
    { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', medal: null },
    { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', medal: null },
];

const Top5CustomersChart = ({ data, currency, rates }) => {
    if (!data?.labels?.length) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
        </Box>
    );

    const values = data.datasets?.[0]?.data ?? [];
    const maxValue = Math.max(...values) || 1;

    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column', gap: { xs: 1, md: 1.25 },
            pt: 0.5, height: '100%', overflow: 'auto',
        }}>
            {data.labels.map((label, i) => {
                const value = values[i] ?? 0;
                const pct = Math.max((value / maxValue) * 100, 2);
                const formatted = formatCurrency(value, currency, rates ?? {});
                const { color, bg, border, medal } = RANK_PALETTE[i] ?? RANK_PALETTE[4];

                return (
                    <Box key={i} sx={{
                        display: 'flex', alignItems: 'center', gap: 1.25,
                        px: 1.25, py: { xs: 0.9, md: 1.1 },
                        borderRadius: '12px',
                        bgcolor: i === 0 ? '#fefce8' : 'rgba(248,250,252,0.6)',
                        border: `1px solid ${i === 0 ? '#fde68a' : '#f1f5f9'}`,
                        transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                        animation: `${rowSlideIn} 0.45s cubic-bezier(0.34,1.56,0.64,1) ${0.06 + i * 0.09}s both`,
                        cursor: 'default',
                        '&:hover': {
                            bgcolor: bg,
                            border: `1px solid ${border}`,
                            transform: 'translateX(5px)',
                            boxShadow: `0 4px 16px ${color}18`,
                        },
                    }}>
                        {/* Rank badge */}
                        <Box sx={{
                            minWidth: { xs: 28, md: 32 }, height: { xs: 28, md: 32 },
                            borderRadius: '9px',
                            bgcolor: bg, border: `1.5px solid ${border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: medal ? { xs: '0.85rem', md: '1rem' } : '0.6rem',
                            fontWeight: 900, color,
                            flexShrink: 0,
                            boxShadow: `0 2px 6px ${color}22`,
                        }}>
                            {medal ?? `#${i + 1}`}
                        </Box>

                        {/* Name + progress + value */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'baseline', mb: 0.6, gap: 0.75,
                            }}>
                                <Typography sx={{
                                    fontSize: { xs: '0.68rem', md: '0.73rem' },
                                    fontWeight: 700, color: '#334155',
                                    whiteSpace: 'nowrap', overflow: 'hidden',
                                    textOverflow: 'ellipsis', flex: 1, minWidth: 0,
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }} title={label}>
                                    {label}
                                </Typography>
                                <Typography sx={{
                                    fontSize: { xs: '0.7rem', md: '0.75rem' },
                                    fontWeight: 900, color, flexShrink: 0,
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                }}>
                                    {formatted}
                                </Typography>
                            </Box>

                            {/* Animated progress bar */}
                            <Box sx={{
                                height: 5, bgcolor: '#f1f5f9',
                                borderRadius: 3, overflow: 'hidden',
                            }}>
                                <Box sx={{
                                    height: '100%', width: `${pct}%`,
                                    borderRadius: 3,
                                    background: `linear-gradient(90deg, ${color} 0%, ${color}88 100%)`,
                                    boxShadow: `0 1px 6px ${color}44`,
                                    transformOrigin: 'left center',
                                    animation: `${barGrow} 1.1s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.1}s both`,
                                }} />
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

/* ─── Top 5 Sales Persons — Treemap ───────────────────────────── */
const buildTreemap = (items, rect = { x: 0, y: 0, w: 100, h: 100 }) => {
    if (!items.length) return [];
    if (items.length === 1) return [{ ...items[0], ...rect }];
    const total = items.reduce((s, d) => s + d.value, 0);
    let splitIdx = 1;
    let leftSum  = items[0].value;
    for (let k = 1; k < items.length - 1; k++) {
        const next = leftSum + items[k].value;
        if (Math.abs(next / total - 0.5) < Math.abs(leftSum / total - 0.5)) {
            leftSum  = next;
            splitIdx = k + 1;
        } else { break; }
    }
    const ratio = leftSum / total;
    const { x, y, w, h } = rect;
    let L, R;
    if (w >= h) {
        L = { x,             y, w: w * ratio,         h };
        R = { x: x + w * ratio, y, w: w * (1 - ratio), h };
    } else {
        L = { x, y,             w, h: h * ratio         };
        R = { x, y: y + h * ratio, w, h: h * (1 - ratio) };
    }
    return [...buildTreemap(items.slice(0, splitIdx), L), ...buildTreemap(items.slice(splitIdx), R)];
};

const Top5SalesPersonsChart = ({ data, currency, rates }) => {
    const values = data?.datasets?.[0]?.data ?? [];
    const labels = data?.labels ?? [];
    const total  = values.reduce((a, b) => a + b, 0) || 1;

    if (!labels.length) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
        </Box>
    );

    const items = labels
        .map((label, i) => ({ label, value: values[i] ?? 0, color: TREEMAP_COLORS[i % TREEMAP_COLORS.length] }))
        .sort((a, b) => b.value - a.value);

    const tiles = buildTreemap(items);

    return (
        <Box sx={{ position: 'relative', width: '100%', height: { xs: 220, md: 280 }, borderRadius: '10px', overflow: 'hidden' }}>
            {tiles.map((tile, i) => {
                const pct    = ((tile.value / total) * 100).toFixed(1);
                const fmtVal = formatCurrency(tile.value, currency, rates ?? {});
                const compact = tile.h < 22;
                const small   = !compact && tile.h < 35;
                const padding = compact ? '4px 6px' : small ? '8px 10px' : '10px 12px';
                const nameFz  = compact ? '0.62rem' : small ? '0.72rem' : tile.w > 25 ? '0.8rem' : '0.68rem';
                const valFz   = compact ? '0.58rem' : small ? '0.66rem' : tile.w > 25 ? '0.7rem' : '0.6rem';
                return (
                    <Box key={i} title={`${tile.label}: ${fmtVal} (${pct}%)`} sx={{
                        position: 'absolute',
                        left: `${tile.x}%`, top: `${tile.y}%`,
                        width: `${tile.w}%`, height: `${tile.h}%`,
                        bgcolor: tile.color, boxSizing: 'border-box',
                        border: '2.5px solid #fff', borderRadius: '6px', padding,
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                        overflow: 'hidden', cursor: 'default',
                        transition: 'filter 0.2s ease',
                        animation: `${fadeUp} 0.55s ease ${i * 0.07}s both`,
                        '&:hover': { filter: 'brightness(1.14)', zIndex: 2 },
                    }}>
                        {compact ? (
                            <Typography noWrap sx={{ color: '#fff', fontWeight: 700, fontSize: nameFz, lineHeight: 1.15, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                                {tile.label} · {fmtVal} · {pct}%
                            </Typography>
                        ) : (
                            <>
                                <Typography sx={{
                                    color: '#fff', fontWeight: 800, fontSize: nameFz, lineHeight: 1.25,
                                    overflow: 'hidden', display: '-webkit-box',
                                    WebkitLineClamp: small ? 1 : 2, WebkitBoxOrient: 'vertical',
                                    textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                                }}>{tile.label}</Typography>
                                <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: valFz, mt: 0.3, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
                                    {fmtVal} · {pct}%
                                </Typography>
                            </>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
};

/* ─── State-Wise Pie Chart ─────────────────────────────────── */
const StateWisePieChart = ({ data }) => {
    const values = data?.datasets?.[0]?.data ?? [];
    const labels = data?.labels ?? [];
    const total = values.reduce((a, b) => a + b, 0) || 1;

    if (!labels.length) return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
        </Box>
    );

    const chartData = {
        labels,
        datasets: [{ data: values, backgroundColor: STATE_PIE_COLORS, borderColor: '#ffffff', borderWidth: 3, hoverOffset: 10 }],
    };

    const pieOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)', padding: 12, cornerRadius: 8,
                callbacks: {
                    label: (ctx) => {
                        const val = ctx.raw;
                        const pct = ((val / total) * 100).toFixed(1);
                        const abs = Math.abs(val);
                        const fmtVal = abs >= 1e7 ? `₹${(val / 1e7).toFixed(2)}Cr` : `₹${(val / 1e5).toFixed(2)}L`;
                        return `  ${ctx.label}: ${fmtVal} (${pct}%)`;
                    },
                },
            },
        },
        animation: { animateRotate: true, animateScale: true, duration: 1400, easing: 'easeOutElastic' },
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Box sx={{ position: 'relative', flexShrink: 0, width: { xs: 160, sm: 185, md: 205 }, height: { xs: 160, sm: 185, md: 205 } }}>
                <Pie data={chartData} options={pieOptions} />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: { xs: 0.85, md: 1.1 }, minWidth: 0, overflowY: 'auto', maxHeight: '100%' }}>
                {labels.map((label, i) => {
                    const val = values[i] ?? 0;
                    const pct = ((val / total) * 100).toFixed(1);
                    const abs = Math.abs(val);
                    const fmtVal = abs >= 1e7 ? `${(val / 1e7).toFixed(2)}Cr` : `${(val / 1e5).toFixed(2)}L`;
                    const color = STATE_PIE_COLORS[i % STATE_PIE_COLORS.length];
                    return (
                        <Box key={i} sx={{
                            display: 'flex', alignItems: 'center', gap: 1.25,
                            px: 1, py: 0.75, borderRadius: '10px',
                            bgcolor: 'rgba(248,250,252,0.8)', border: '1px solid #f1f5f9',
                            animation: `${fadeUp} 0.4s ease ${0.1 + i * 0.07}s both`,
                            '&:hover': { bgcolor: `${color}12`, border: `1px solid ${color}40` },
                        }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: color, flexShrink: 0, boxShadow: `0 1px 4px ${color}66` }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</Typography>
                                <Typography sx={{ fontSize: '0.64rem', fontWeight: 600, color }}>{fmtVal} ({pct}%)</Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

/* ─── Chart card title row ─────────────────────────────────── */
const ChartTitle = ({ children, extra }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexShrink: 0, gap: 1 }}>
        <Typography sx={{
            fontSize: '0.92rem', fontWeight: 800, color: '#0f172a',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
            {children}
        </Typography>
        {extra}
    </Box>
);

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const SalesDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

    /* ── GST toggle & Currency ── */
    const [gstMode, setGstMode] = useState('Without GST');
    const [currency, setCurrency] = useState('INR');
    const { rates, loading: ratesLoading, updatedAt: ratesUpdatedAt, refreshRates } = useCurrencyRates();

    /* ── Date filters ── */
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);
    const [companyId] = useState('2');

    /* ── KPI state ─────────────────────────────────────────────────────
       CHANGE 1 — store both GST fields returned by GetTotalSalesValue:
         totalSalesValueExcl  ← TaxableAmount  (Without GST)
         totalSalesValueIncl  ← GrossAmount    (With GST)
    ─────────────────────────────────────────────────────────────────── */
    const [kpiData, setKpiData] = useState({
        orderConversion: null,
        totalSalesValueExcl: null,   // Without GST  →  TaxableAmount
        totalSalesValueIncl: null,   // With GST     →  GrossAmount
        totalSalesQty: null,
        avgOrderValue: null,
        totalCustomer: null,
    });

    /* ── Drilldown modal state ── */
    const [drillKey, setDrillKey] = useState(null);
    const [drillOpen, setDrillOpen] = useState(false);
    const [drillRows, setDrillRows] = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);

    const openDrill = async (key) => {
        const config = SALES_DRILL_CONFIG[key];
        if (!config) return;
        setDrillKey(key);
        setDrillRows([]);
        setDrillOpen(true);
        setDrillLoading(true);
        try {
            const res = await postRequest(config.apiName, {
                CompanyID: companyId,
                FromDate: fromDate,
                ToDate: toDate,
            });
            setDrillRows(Array.isArray(res?.data) ? res.data : []);
        } catch (e) {
            console.error(`Sales drilldown fetch error [${config.apiName}]:`, e);
            setDrillRows([]);
        } finally {
            setDrillLoading(false);
        }
    };

    const closeDrill = () => setDrillOpen(false);

    /* ── Chart state ── */
    const emptyChart = { labels: [], datasets: [] };
    const [charts, setCharts] = useState({
        weeklyFunnel: emptyChart,
        weeklySalesTarget: emptyChart,
        weeklyBilling: emptyChart,
        receivablesAging: emptyChart,
        overdueAging: emptyChart,
        weeklyJobStatus: emptyChart,
        machinePrintLoad: emptyChart,
        weeklyCollection: emptyChart,
        billingVsPending: emptyChart,
        top5Customers: emptyChart,
        top5SalesPersons: emptyChart,
        monthlySalesTrend: emptyChart,
        yearlySalesTrend: emptyChart,
        stateWiseTrend: emptyChart,
    });

    /* ── Fetch data (all API calls unchanged) ── */
    const fetchData = async () => {
        setLoading(true);
        try {
            const payload = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate };

            const [orderConv, salesVal, salesQty, avgOrderVal, totalCust] = await Promise.all([
                postRequest('GetOrderConversionRatio', payload),
                postRequest('GetTotalSalesValue', payload),
                postRequest('GetTotalSalesQuantity', payload),
                postRequest('GetAvgOrderValue', payload),
                postRequest('GetTotalCustomers', payload),
            ]);

            setKpiData({
                orderConversion: orderConv?.data?.[0]?.ConversionRatio ?? '—',
                /* Read both columns returned by the updated GetTotalSalesValue API */
                totalSalesValueExcl: salesVal?.data?.[0]?.TaxableAmount ?? '—',  // Without GST
                totalSalesValueIncl: salesVal?.data?.[0]?.GrossAmount ?? '—',  // With GST
                totalSalesQty: salesQty?.data?.[0]?.TotalOrders ?? '—',
                avgOrderValue: avgOrderVal?.data?.[0]?.AvgOrderValue ?? '—',
                totalCustomer: totalCust?.data?.[0]?.Column1 ?? '—',
            });

            const [funnel, salesTarget, billing, jobStatus, top5Cust, top5Sales,
                monthlyTrend, yearlyTrend, stateTrend] = await Promise.all([
                postRequest('GetWeeklySalesFunnel', payload),
                postRequest('GetWeeklySalesVsTargetFO', payload),
                postRequest('GetWeeklyBillingActualVsTarget', payload),
                postRequest('GetWeeklyJobStatusOverview', payload),
                postRequest('GetTop5CustomersBySales', payload),
                postRequest('GetTop5SalesPersonsBySales', payload),
                postRequest('GetMonthlySalesTrend', payload),
                postRequest('GetYearlySalesTrend', payload),
                postRequest('GetStateWiseSalesTrend', payload),
            ]);

            /* ── Monthly Sales Trend — fill all month slots with 0 for missing months ── */
            const monthlyRaw  = monthlyTrend?.data ?? [];
            const monthSlots  = getMonthSlots(fromDate, toDate);
            const monthlySalesTrendData = {
                labels: monthSlots.map(m => m.label),
                datasets: [{
                    label: 'Monthly Sales',
                    data: monthSlots.map(m => {
                        const r = monthlyRaw.find(
                            d => parseInt(d.YearNum) === m.year && parseInt(d.MonthNum) === m.month
                        );
                        return r ? parseFloat(r.TotalGrossAmount) || 0 : 0;
                    }),
                    backgroundColor: '#4e7fcf',
                    hoverBackgroundColor: '#2e5db3',
                    borderRadius: 4, borderSkipped: false, barPercentage: 0.75,
                }],
            };

            /* ── Yearly Sales Trend — always 3 FY slots ── */
            const yearlyRaw = yearlyTrend?.data ?? [];
            const fySlots   = getFYSlots(fromDate, toDate);
            const yearlySalesTrendData = {
                labels: fySlots,
                datasets: [{
                    label: 'Annual Sales',
                    data: fySlots.map(fy => {
                        const r = yearlyRaw.find(d => d.FinancialYear === fy);
                        return r ? parseFloat(r.TotalGrossAmount) || 0 : 0;
                    }),
                    borderColor: '#6c3fc9',
                    backgroundColor: 'rgba(108, 63, 201, 0.10)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#6c3fc9', pointBorderColor: '#ffffff',
                    pointBorderWidth: 2.5, pointRadius: 7, pointHoverRadius: 10,
                    tension: 0, fill: false,
                }],
            };

            /* ── State-Wise Trend ── */
            const stateRaw = (stateTrend?.data ?? []).filter(r => parseFloat(r.TotalGrossAmount) > 0);
            const stateWiseTrendData = {
                labels: stateRaw.map(r => r.ClientState || 'Unknown'),
                datasets: [{
                    data: stateRaw.map(r => parseFloat(r.TotalGrossAmount) || 0),
                    backgroundColor: STATE_PIE_COLORS,
                    borderColor: '#ffffff', borderWidth: 2, hoverOffset: 10,
                }],
            };

            setCharts(prev => ({
                ...prev,
                weeklyFunnel: normalizeChartData(funnel?.data, 'weeklyFunnel'),
                weeklySalesTarget: normalizeChartData(salesTarget?.data, 'weeklySalesTarget'),
                weeklyBilling: normalizeChartData(billing?.data, 'weeklyBilling'),
                weeklyJobStatus: normalizeChartData(jobStatus?.data, 'weeklyJobStatus'),
                top5Customers: normalizeChartData(top5Cust?.data, 'top5Customers'),
                top5SalesPersons: normalizeChartData(top5Sales?.data, 'top5SalesPersons'),
                monthlySalesTrend: monthlySalesTrendData,
                yearlySalesTrend: yearlySalesTrendData,
                stateWiseTrend: stateWiseTrendData,
            }));

        } catch (e) {
            console.error('fetchData error', e);
        } finally {
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, [period, fromDate, toDate]);

    /* ── Smart Y-axis ── */
    const yCallback = useMemo(() => makeSmartYCallback(currency, rates), [currency, rates]);

    /* ── Chart data stays in INR Lakhs; axis/tooltip convert on display ── */
    const convertChartData = (chartData) => chartData;

    /* ── Processed chart data ── */
    /* Funnel: skip empty weeks but always keep 'Current Week' column */
    const funnelChart = useMemo(() => {
        const data = convertChartData(charts.weeklyFunnel);
        if (!data?.labels?.length) return data;
        const keepIdx = data.labels
            .map((lbl, i) => ({ lbl, i }))
            .filter(({ lbl, i }) =>
                lbl === 'Current Week' ||
                data.datasets.some(ds => {
                    const v = ds.data?.[i];
                    return v !== null && v !== undefined && v !== 0;
                })
            )
            .map(({ i }) => i);
        return {
            labels: keepIdx.map(i => data.labels[i]),
            datasets: data.datasets.map(ds => ({
                ...ds,
                data: keepIdx.map(i => ds.data?.[i] ?? 0),
            })),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [charts.weeklyFunnel, currency]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const salesTargetChart = useMemo(() => skipEmptyWeeks(convertChartData(charts.weeklySalesTarget)), [charts.weeklySalesTarget, currency]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const billingChart = useMemo(() => skipEmptyWeeks(convertChartData(charts.weeklyBilling)), [charts.weeklyBilling, currency]);
    const jobStatusChart = useMemo(() => charts.weeklyJobStatus, [charts.weeklyJobStatus]);

    /* ── CHANGE 1: GST-aware display — reads real API fields, no multiplication ──
       'Without GST'  →  TaxableAmount  (salesVal.data[0].TaxableAmount)
       'With GST'     →  GrossAmount    (salesVal.data[0].GrossAmount)
    ─────────────────────────────────────────────────────────────────────────────── */
    const salesValueDisplay = useMemo(() => {
        const raw = gstMode === 'With GST'
            ? kpiData.totalSalesValueIncl   // GrossAmount
            : kpiData.totalSalesValueExcl;  // TaxableAmount
        if (raw == null || raw === '—') return '—';
        const num = parseFloat(raw);
        if (isNaN(num)) return raw;
        return fmtCurrency(num, currency, rates);
    }, [kpiData.totalSalesValueExcl, kpiData.totalSalesValueIncl, gstMode, currency, rates]);

    /* ── Other KPI displays ── */
    const avgOrderDisplay = useMemo(() => fmtCurrency(kpiData.avgOrderValue, currency, rates), [kpiData.avgOrderValue, currency, rates]);

    /* ── Shared smart Y scale (currency-aware) ── */
    const smartYScale = useMemo(() => ({
        grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false },
        ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
            color: '#64748b',
            callback: yCallback,
        },
        border: { display: false },
    }), [yCallback]);

    /* ── Shared tooltip label (currency-aware) ── */
    const tooltipLabel = useMemo(() => makeTooltipLabel(currency, rates), [currency, rates]);

    /* ════════════════════════════════════════════════════════════
       PER-CHART OPTIONS
       CHANGE 2 — all charts use interaction.mode='index' + intersect=false
       (set globally in commonChartOptions) so every hover shows ALL datasets.
       Each chart also gets proper label + labelColor callbacks.
    ════════════════════════════════════════════════════════════ */

    /* Weekly Sales Funnel — shows Quotation + Order + Invoice */
    const funnelChartOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: tooltipLabel,
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            x: { ...commonChartOptions.scales.x, stacked: true },
            y: {
                ...smartYScale, stacked: true,
                title: { display: true, text: `Value (${currency})`, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '600' }, color: '#64748b' },
            },
        },
    }), [currency, smartYScale, tooltipLabel]);

    /* Weekly Sales (FO) — shows Jobs */
    const salesTargetChartOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: tooltipLabel,
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            x: { ...commonChartOptions.scales.x },
            y: {
                ...smartYScale,
                title: { display: true, text: `Sales Value (${currency})`, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '600' }, color: '#64748b' },
            },
        },
    }), [currency, smartYScale, tooltipLabel]);

    /* Weekly Billing — shows Actual Billing + Target */
    const billingChartOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} L`,
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            ...commonChartOptions.scales,
            y: {
                ...smartYScale,
                title: { display: true, text: `Billing Value (${currency})`, font: { family: "'Plus Jakarta Sans', sans-serif", size: 10, weight: '600' }, color: '#64748b' },
            },
        },
    }), [currency, smartYScale]);

    /* Weekly Job Status — shows On-Time + Delay */
    const jobStatusChartOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y}`,
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            ...commonChartOptions.scales,
            y: {
                ...commonChartOptions.scales.y,
                title: { display: true, text: 'No. of Orders', font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' }, color: '#94a3b8' },
                ticks: { ...commonChartOptions.scales.y.ticks, callback: v => Number.isInteger(v) ? v : '' },
            },
        },
    }), []);

    /* Monthly Sales Trend — bar chart, raw INR values */
    const monthlySalesTrendOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: (ctx) => {
                        const val = ctx.raw ?? 0;
                        const abs = Math.abs(val);
                        let f;
                        if (abs >= 1e7) f = `₹${(val / 1e7).toFixed(2)}Cr`;
                        else if (abs >= 1e5) f = `₹${(val / 1e5).toFixed(2)}L`;
                        else if (abs >= 1e3) f = `₹${(val / 1e3).toFixed(1)}K`;
                        else f = `₹${val.toFixed(0)}`;
                        return `  ${ctx.dataset.label}: ${f}`;
                    },
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            x: { ...commonChartOptions.scales.x },
            y: {
                grid: { color: 'rgba(226,232,240,0.4)', drawBorder: false },
                ticks: {
                    font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                    color: '#64748b',
                    callback: (v) => {
                        const abs = Math.abs(v);
                        if (abs >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
                        if (abs >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
                        if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
                        return String(v);
                    },
                },
                border: { display: false },
            },
        },
    }), [tooltipLabel]);

    /* Yearly Sales Trend — line chart */
    const yearlySalesTrendOptions = useMemo(() => ({
        ...commonChartOptions,
        plugins: {
            ...commonChartOptions.plugins,
            tooltip: {
                ...commonChartOptions.plugins.tooltip,
                callbacks: {
                    title: (items) => items[0]?.label ?? '',
                    label: (ctx) => {
                        const val = ctx.raw ?? 0;
                        const abs = Math.abs(val);
                        let f;
                        if (abs >= 1e7) f = `₹${(val / 1e7).toFixed(2)}Cr`;
                        else if (abs >= 1e5) f = `₹${(val / 1e5).toFixed(2)}L`;
                        else if (abs >= 1e3) f = `₹${(val / 1e3).toFixed(1)}K`;
                        else f = `₹${val.toFixed(0)}`;
                        return `  ${ctx.dataset.label}: ${f}`;
                    },
                    labelColor: tooltipLabelColor,
                },
            },
        },
        scales: {
            x: { ...commonChartOptions.scales.x },
            y: {
                grid: { color: 'rgba(226,232,240,0.4)', drawBorder: false },
                ticks: {
                    font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                    color: '#64748b',
                    callback: (v) => {
                        const abs = Math.abs(v);
                        if (abs >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
                        if (abs >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
                        if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
                        return String(v);
                    },
                },
                border: { display: false },
            },
        },
    }), [tooltipLabel]);

    /* ════════════════════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════════════════════ */
    return (
        <Box sx={{
            bgcolor: '#f0f4f8', minHeight: '100vh',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            overflowX: 'hidden',
            backgroundImage: 'radial-gradient(circle, #cbd5e133 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            animation: `${fadeIn} 0.4s ease both`,
        }}>

            <DashboardHeader title="Sales Dashboard" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate}
                    onApply={() => { }}
                />
                <CurrencyToggle
                    value={currency}
                    onChange={setCurrency}
                    rates={rates}
                    loading={ratesLoading}
                    updatedAt={ratesUpdatedAt}
                    refreshRates={refreshRates}
                />
            </DashboardHeader>

            <Box sx={{ p: R.pagePad, width: '100%', boxSizing: 'border-box' }}>

                {/* ══ KPI ROW — 2 col mobile, 5 col desktop ══ */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                    gap: R.gap,
                    mb: R.sectionMb,
                }}>
                    <KpiCard
                        {...KPI_CONFIGS.orderConversion}
                        animDelay={0.04}
                        value={
                            kpiData.orderConversion != null && kpiData.orderConversion !== '—'
                                ? Number(kpiData.orderConversion).toFixed(2)
                                : kpiData.orderConversion
                        }
                        onInfoClick={() => openDrill('orderConversion')}
                    />

                    {/* Total Sales Value — GST toggle switches between TaxableAmount / GrossAmount */}
                    <KpiCard
                        {...KPI_CONFIGS.totalSalesValue}
                        animDelay={0.1}
                        value={salesValueDisplay}
                        onInfoClick={() => openDrill('totalSalesValue')}
                        extra={
                            /* CHANGE 1 — pill toggle: W/O GST = TaxableAmount, W/ GST = GrossAmount */
                            <Box sx={{
                                display: 'inline-flex',
                                bgcolor: KPI_CONFIGS.totalSalesValue.tint,
                                p: '3px', borderRadius: '9px',
                                border: `1.5px solid ${KPI_CONFIGS.totalSalesValue.iconColor}28`,
                                gap: '2px', mt: 0.25,
                                boxShadow: `0 1px 4px ${KPI_CONFIGS.totalSalesValue.iconColor}18`,
                            }}>
                                {[
                                    { opt: 'Without GST', short: 'W/O GST' },
                                    { opt: 'With GST', short: 'W/ GST' },
                                ].map(({ opt, short }) => {
                                    const isActive = gstMode === opt;
                                    return (
                                        <Box
                                            key={opt}
                                            onClick={() => setGstMode(opt)}
                                            sx={{
                                                px: 1, py: 0.35,
                                                fontSize: '0.56rem', fontWeight: 800,
                                                cursor: 'pointer', borderRadius: '6px',
                                                bgcolor: isActive ? KPI_CONFIGS.totalSalesValue.iconColor : 'transparent',
                                                color: isActive ? '#ffffff' : KPI_CONFIGS.totalSalesValue.iconColor,
                                                transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                                boxShadow: isActive ? `0 2px 8px ${KPI_CONFIGS.totalSalesValue.iconColor}44` : 'none',
                                                whiteSpace: 'nowrap', userSelect: 'none',
                                            }}
                                        >
                                            {short}
                                        </Box>
                                    );
                                })}
                            </Box>
                        }
                    />

                    <KpiCard {...KPI_CONFIGS.totalSalesQty} animDelay={0.16} value={kpiData.totalSalesQty} onInfoClick={() => openDrill('totalOrder')} />
                    <KpiCard {...KPI_CONFIGS.avgOrderValue} animDelay={0.22} value={avgOrderDisplay} onInfoClick={() => openDrill('avgOrderValue')} />
                    <KpiCard {...KPI_CONFIGS.totalCustomer} animDelay={0.28} value={kpiData.totalCustomer} onInfoClick={() => openDrill('totalCustomer')} />
                </Box>

                {/* ══ ALL 6 CHARTS — single unified grid
                    mobile  (< 900px) : 1 column, full width
                    desktop (≥ 900px) : 3 equal columns
                ══ */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                    gap: R.gapChart,
                }}>
                    {/* Monthly Sales Trend */}
                    <Card animDelay={0.35}>
                        <ChartTitle>Monthly Sales Trend</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            {charts.monthlySalesTrend?.labels?.length > 0 ? (
                                <Bar data={charts.monthlySalesTrend} options={monthlySalesTrendOptions} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* Last 3-Year Sales Trend */}
                    <Card animDelay={0.42}>
                        <ChartTitle>Last 3-Year Sales Trend</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            {charts.yearlySalesTrend?.labels?.length > 0 ? (
                                <Line data={charts.yearlySalesTrend} options={yearlySalesTrendOptions} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* State-Wise Sales Trend */}
                    <Card animDelay={0.49}>
                        <ChartTitle>State-Wise Sales Trend</ChartTitle>
                        <Box sx={{ height: { xs: 300, md: 340 }, overflow: 'hidden' }}>
                            <StateWisePieChart data={charts.stateWiseTrend} />
                        </Box>
                    </Card>

                    {/* Weekly Sales Funnel */}
                    <Card animDelay={0.56}>
                        <ChartTitle>Weekly Sales Funnel</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            <Bar data={funnelChart} options={funnelChartOptions} />
                        </Box>
                    </Card>

                    {/* Weekly Sales (FO) */}
                    <Card animDelay={0.63}>
                        <ChartTitle>Weekly Sales (FO)</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            <Bar data={salesTargetChart} options={salesTargetChartOptions} />
                        </Box>
                    </Card>

                    {/* Weekly Billing Actual */}
                    <Card animDelay={0.7}>
                        <ChartTitle>Weekly Billing Actual</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            {billingChart?.labels?.length > 0 ? (
                                <Line data={billingChart} options={billingChartOptions} />
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>No data available</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* Top 5 Customers — leaderboard */}
                    <Card animDelay={0.77}>
                        <ChartTitle>Top 5 Customers by Sales</ChartTitle>
                        <Box sx={{ height: { xs: 300, md: 320, lg: 340 }, overflow: 'hidden' }}>
                            <Top5CustomersChart data={charts.top5Customers} currency={currency} rates={rates} />
                        </Box>
                    </Card>

                    {/* Weekly Job Status */}
                    <Card animDelay={0.84}>
                        <ChartTitle>Weekly Job Status Overview</ChartTitle>
                        <Box sx={{ position: 'relative', height: { xs: 220, md: 300, lg: 340 } }}>
                            <Bar data={jobStatusChart} options={jobStatusChartOptions} />
                        </Box>
                    </Card>

                    {/* Top 5 Sales Persons — treemap */}
                    <Card animDelay={0.91}>
                        <ChartTitle>Top 5 Sales Persons By Sales</ChartTitle>
                        <Box sx={{ height: { xs: 220, md: 280 }, overflow: 'hidden' }}>
                            <Top5SalesPersonsChart data={charts.top5SalesPersons} currency={currency} rates={rates} />
                        </Box>
                    </Card>
                </Box>

            </Box>

            {/* Sales KPI Drilldown Modal — info icon table popup for KPI cards */}
            {drillKey && SALES_DRILL_CONFIG[drillKey] && (
                <DrillDownModal
                    open={drillOpen}
                    onClose={closeDrill}
                    title={SALES_DRILL_CONFIG[drillKey].title}
                    columns={SALES_DRILL_CONFIG[drillKey].columns}
                    rows={drillRows}
                    loading={drillLoading}
                />
            )}
        </Box>
    );
};

export default SalesDashboard;