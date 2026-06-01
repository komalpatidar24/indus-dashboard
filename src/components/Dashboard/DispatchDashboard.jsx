import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, keyframes, Button } from '@mui/material';
import { Truck, Clock, Package, Smartphone, Activity, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Info } from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import DrillDownModal from '../common/Drilldownmodal';
import { T, R, GRID, CHART_H as CH, FONT } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

/* ═══════════════════════════════════════════════════════════════
   FORMATTERS
   ══════════════════════════════════════════════════════════════ */
const fmtCount = (val) => new Intl.NumberFormat('en-IN').format(Number(val) || 0);

/* ═══════════════════════════════════════════════════════════════
   DESIGN TOKENS
   ══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════
   KEYFRAMES
   ══════════════════════════════════════════════════════════════ */
const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(18px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
const iconPop = keyframes`
    0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
    70%  { transform: scale(1.12) rotate(2deg);  opacity: 1; }
    100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
`;
const shimmerKf = keyframes`
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
`;
const countUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
`;
const topBarSlide = keyframes`
    from { transform: scaleX(0); opacity: 0; transform-origin: left; }
    to   { transform: scaleX(1); opacity: 1; transform-origin: left; }
`;

/* ═══════════════════════════════════════════════════════════════
   SHIMMER
   ══════════════════════════════════════════════════════════════ */
const Shimmer = ({ width = "100%", height = 24, radius = "6px" }) => (
    <Box sx={{
        width, height, borderRadius: radius,
        background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%", animation: `${shimmerKf} 1.6s infinite`,
    }} />
);

/* ═══════════════════════════════════════════════════════════════
   CHART OVERLAY
   ══════════════════════════════════════════════════════════════ */
const ChartOverlay = ({ loading }) => loading ? (
    <Box sx={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", bgcolor: "rgba(255,255,255,0.7)",
        borderRadius: T.radius, zIndex: 10, backdropFilter: "blur(4px)",
        animation: `${fadeIn} 0.2s ease`,
    }}>
        <CircularProgress size={28} thickness={4} sx={{ color: T.primary }} />
    </Box>
) : null;

/* ═══════════════════════════════════════════════════════════════
   DRILLDOWN CONFIG — keys match exactly what each API returns
   (verified against fetchData field access).
   DrillDownModal auto-totals any column whose every value is
   numeric (TotalChallanCount, PackedQuantity, Delays).
   Payload: { CompanyID, FromDate, ToDate }
   ══════════════════════════════════════════════════════════════ */
const DISPATCH_DRILL_CONFIG = {
    /* Pipeline per-job detail — same API that drives the donut chart.
       Confirmed keys: Printing, Binding, QC, Dispatch (status strings).
       JobBookingNo / ContentName are standard per-job fields. */
    ordersInPipeline: {
        title: 'Orders in Pipeline',
        apiName: 'GetPipelineDistribution',
        columns: [
            { key: 'JobBookingNo', label: 'Job No',       width: 150 },
            { key: 'ContentName',  label: 'Content Name', width: 210 },
            { key: 'Printing',     label: 'Printing',     width: 130 },
            { key: 'Binding',      label: 'Binding',      width: 130 },
            { key: 'QC',           label: 'QC',           width: 110 },
            { key: 'Dispatch',     label: 'Dispatch',     width: 130 },
        ],
    },
    /* Dispatch trend detail — confirmed keys: ChallanDate, TotalChallanCount */
    dispatched: {
        title: 'Dispatched — Daily Trend',
        apiName: 'GetWeeklyDispatchTrend',
        columns: [
            { key: 'ChallanDate',       label: 'Date',           width: 180 },
            { key: 'TotalChallanCount', label: 'Dispatch Count', width: 160 },
        ],
    },
    /* Delay detail — confirmed keys: JobBookingNo, ContentName,
       Delays, CurrentProcessStatus  */
    delayedOrders: {
        title: 'Delayed Orders',
        apiName: 'GetDelayDaysPerOrder',
        columns: [
            { key: 'JobBookingNo',         label: 'Job No',        width: 150 },
            { key: 'ContentName',          label: 'Content Name',  width: 220 },
            { key: 'Delays',               label: 'Delay Days',    width: 120 },
            { key: 'CurrentProcessStatus', label: 'Current Status',width: 170 },
        ],
    },
    /* Stock detail — confirmed keys: JobName, PackedQuantity */
    dispatchQuantity: {
        title: 'Title In Stock',
        apiName: 'GetStockByTitle',
        columns: [
            { key: 'JobName',        label: 'Job / Title', width: 300 },
            { key: 'PackedQuantity', label: 'Packed Qty',  width: 150 },
        ],
    },
};

/* ═══════════════════════════════════════════════════════════════
   STAT CARD — compact, animated, with info icon
   ══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
const StatCard = ({ label, value, color, bg, accent, loading, animDelay, onInfoClick, Icon }) => (
    <Box sx={{
        borderRadius: { xs: '14px', sm: '20px' }, bgcolor: '#ffffff',
        border: '1px solid #e9eef4',
        boxShadow: '0 2px 0 rgba(15,23,42,0.03), 0 4px 20px rgba(15,23,42,0.07)',
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden', position: 'relative',
        animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
        willChange: 'transform, box-shadow',
        '&:hover': {
            transform: 'translateY(-6px) scale(1.01)',
            boxShadow: `0 16px 36px -8px ${accent}33, 0 4px 16px rgba(15,23,42,0.08)`,
            borderColor: `${accent}44`,
        },
        '&:hover .kpi-stripe': { width: '5px', boxShadow: `3px 0 14px ${accent}66` },
        '&:hover .kpi-value': { color: accent },
    }}>
        {/* Left stripe */}
        <Box className="kpi-stripe" sx={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
            background: `linear-gradient(180deg, ${accent} 0%, ${accent}88 100%)`,
            boxShadow: `2px 0 8px ${accent}44`, borderRadius: '20px 0 0 20px',
            transition: 'width 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
        }} />

        {/* Background blob */}
        <Box sx={{
            position: 'absolute', top: -24, right: -24, width: 96, height: 96,
            borderRadius: '50%', bgcolor: bg, opacity: 0.6, pointerEvents: 'none',
        }} />

        {/* Content */}
        <Box sx={{ pl: { xs: 2, sm: 3 }, pr: { xs: 1.5, sm: 2.5 }, pt: { xs: 1.5, sm: 2.5 }, pb: { xs: 1.2, sm: 2 }, display: 'flex', flexDirection: 'column', gap: { xs: 0.7, sm: 1 } }}>
            <Box sx={{
                width: { xs: 34, sm: 44 }, height: { xs: 34, sm: 44 }, borderRadius: '13px', bgcolor: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${color}22`,
                boxShadow: `0 2px 10px ${color}22, inset 0 1px 0 ${color}15`,
                animation: `${iconPop} 0.45s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.12}s both`,
                transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                <Icon size={16} strokeWidth={2.2} color={color} />
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    <Shimmer width="55%" height={26} />
                    <Shimmer width="38%" height={12} />
                </Box>
            ) : (
                <>
                    <Typography className="kpi-value" sx={{
                        fontSize: { xs: '1.05rem', md: '1.5rem' },
                        fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em',
                        fontFamily: T.fontMono, mt: 0.3,
                        transition: 'color 0.28s ease',
                        animation: `${countUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.18}s both`,
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{
                        fontSize: { xs: '0.58rem', sm: '0.64rem' }, fontWeight: 700, color: '#7c8fa6',
                        textTransform: 'uppercase', letterSpacing: '0.09em',
                        fontFamily: T.font, lineHeight: 1.4,
                    }}>
                        {label}
                    </Typography>
                </>
            )}

            {/* Info icon — top-right corner */}
            {onInfoClick && (
                <Box
                    onClick={e => { e.stopPropagation(); onInfoClick(); }}
                    sx={{
                        position: 'absolute', top: 9, right: 10,
                        width: 26, height: 26,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: color,
                        bgcolor: bg,
                        border: `1.5px solid ${color}33`,
                        borderRadius: '8px',
                        boxShadow: `0 1px 6px ${color}22`,
                        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                        zIndex: 3,
                        '&:hover': {
                            bgcolor: `${color}22`,
                            border: `1.5px solid ${color}88`,
                            transform: 'scale(1.18)',
                            boxShadow: `0 3px 10px ${color}44`,
                        },
                    }}
                >
                    <Info size={14} strokeWidth={2.5} />
                </Box>
            )}
        </Box>
    </Box>
);

/* ═══════════════════════════════════════════════════════════════
   CHART CARD — compact with animated top bar
   ══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
const ChartCard = ({ title, Icon, accent, children, loading, animDelay, action, scrollable, minWidth }) => (
    <Box sx={{
        bgcolor: "#ffffff", borderRadius: "18px",
        p: { xs: "16px", sm: "18px 20px" },
        border: `1.5px solid ${T.border}`,
        boxShadow: T.shadowSm,
        position: "relative", overflow: "hidden",
        animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
        transition: "all 0.32s cubic-bezier(0.34,1.56,0.64,1)",
        "&:hover": {
            boxShadow: `0 12px 36px -8px ${accent}30, 0 2px 8px rgba(15,23,42,0.06)`,
            borderColor: `${accent}40`,
            transform: "translateY(-5px)",
        },
        "&::before": {
            content: '""',
            position: "absolute", top: 0, left: 0, right: 0, height: "3px",
            background: `linear-gradient(90deg, ${accent}, ${accent}70, ${accent})`,
            backgroundSize: "200% 100%",
            animation: `${shimmerKf} 4s linear infinite, ${topBarSlide} 0.65s ease ${animDelay}s both`,
            borderRadius: "18px 18px 0 0",
            opacity: 0.8,
        },
    }}>
        <ChartOverlay loading={loading} />

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
                <Box sx={{
                    width: 32, height: 32, borderRadius: "9px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: `${accent}12`, color: accent,
                    border: `1.5px solid ${accent}28`,
                    boxShadow: `0 2px 8px ${accent}20`,
                    animation: `${iconPop} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.1}s both`,
                }}>
                    <Icon size={15} strokeWidth={2.2} />
                </Box>
                <Typography sx={{
                    fontSize: "0.82rem", fontWeight: 800, color: T.text,
                    textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: T.font,
                }}>
                    {title}
                </Typography>
            </Box>
            {action && <Box>{action}</Box>}
        </Box>

        <Box sx={{
            height: { xs: 220, sm: 260 }, position: "relative",
            ...(scrollable && {
                overflowX: 'auto',
                overflowY: 'hidden',
                '&::-webkit-scrollbar': { height: '5px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: T.border, borderRadius: '4px' },
            }),
        }}>
            <Box sx={{ height: '100%', minWidth: minWidth || '100%', position: 'relative' }}>
                {children}
            </Box>
        </Box>
    </Box>
);



const _now      = dayjs();
const _cYear    = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM   = `${_cYear}-04-01`;
const FY_TO     = `${_cYear + 1}-03-31`;

const DispatchDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);
    const [companyId] = useState('2');

    const [kpiData, setKpiData] = useState({
        ordersInPipeline: '0',
        dispatchedToday: '0',
        delayedOrders: '0',
        finishedGoodsStock: '0'
    });

    /* ── Drilldown modal state ── */
    const [drillKey, setDrillKey]         = useState(null);
    const [drillOpen, setDrillOpen]       = useState(false);
    const [drillRows, setDrillRows]       = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);

    const openDrill = async (key) => {
        const config = DISPATCH_DRILL_CONFIG[key];
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
            console.error(`Dispatch drilldown fetch error [${config.apiName}]:`, e);
            setDrillRows([]);
        } finally {
            setDrillLoading(false);
        }
    };

    const closeDrill = () => setDrillOpen(false);

    const [charts, setCharts] = useState({
        pipelineDistribution: { labels: [], datasets: [] },
        dispatchTrend: { labels: [], datasets: [] },
        stockByTitle: { labels: [], datasets: [] },
        delayDaysPerOrder: { labels: [], datasets: [] }
    });

    const [rawStock, setRawStock] = useState([]);
    const [rawDelays, setRawDelays] = useState([]);
    const [rawTrend, setRawTrend] = useState([]);
    const [totalJobCards, setTotalJobCards] = useState(0);
    const [viewAllStock, setViewAllStock] = useState(false);
    const [viewAllDelays, setViewAllDelays] = useState(false);
    const [viewAllTrend, setViewAllTrend] = useState(false);

    useEffect(() => {
        const displayedStock = viewAllStock ? rawStock : rawStock.slice(0, 5);

        const sortedDelays = [...rawDelays].sort((a, b) => {
            const valA = parseInt(a.Delays?.toString().replace(/[^0-9]/g, '')) || 0;
            const valB = parseInt(b.Delays?.toString().replace(/[^0-9]/g, '')) || 0;
            return valB - valA;
        });
        const displayedDelays = viewAllDelays ? sortedDelays : sortedDelays.slice(0, 5);

        const sortedTrend = [...rawTrend].sort((a, b) => new Date(a.ChallanDate) - new Date(b.ChallanDate));
        const trendDataSlice = viewAllTrend ? sortedTrend : sortedTrend.slice(-5);

        setCharts(prev => ({
            ...prev,
            stockByTitle: {
                labels: displayedStock.map(s => s.JobName || 'Unknown'),
                datasets: [{
                    label: 'Stock',
                    data: displayedStock.map(s => Number(s.PackedQuantity) || 0),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 6,
                    barThickness: 28,
                }]
            },
            delayDaysPerOrder: {
                labels: displayedDelays.map(s => s.JobBookingNo || 'Unknown'),
                datasets: [{
                    label: 'Delay Days',
                    data: displayedDelays.map(s => parseInt(s.Delays?.toString().replace(/[^0-9]/g, '')) || 0),
                    backgroundColor: displayedDelays.map((_, i) =>
                        i === 0 ? '#dc2626' : i === 1 ? '#ef4444' : '#f87171'
                    ),
                    borderRadius: 6,
                    barThickness: 28,
                    _details: displayedDelays.map(s => ({
                        content: s.ContentName || '',
                        status: s.CurrentProcessStatus || ''
                    }))
                }]
            },
            dispatchTrend: {
                labels: trendDataSlice.map(item => item.ChallanDate ? dayjs(item.ChallanDate).format('DD-MM') : ''),
                datasets: [{
                    label: 'Dispatch',
                    data: trendDataSlice.map(item => Number(item.TotalChallanCount) || 0),
                    borderColor: '#10b981',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(16,185,129,0.10)',
                    fill: true,
                    tension: 0.42,
                    pointRadius: 4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#10b981',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#10b981',
                }]
            }
        }));
    }, [rawStock, rawDelays, rawTrend, viewAllStock, viewAllDelays, viewAllTrend]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const payload = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate };
            const settle = (r) => (r.status === 'fulfilled' ? r.value : null);

            const [
                ordersRes, dispatchedRes, delayedRes, stockRes,
                pipelineRes, trendRes, stockByTitleRes, delayDaysRes, orderStatusCountRes
            ] = (await Promise.allSettled([
                postRequest('GetOrdersinPipeline', payload),
                postRequest('GetDispatchedToday', payload),
                postRequest('GetDelayedOrders', payload),
                postRequest('GetFinishedGoodsStock', payload),
                postRequest('GetPipelineDistribution', payload),
                postRequest('GetWeeklyDispatchTrend', payload),
                postRequest('GetStockByTitle', payload),
                postRequest('GetDelayDaysPerOrder', payload),
                postRequest('GetOrderStatusCount', payload)
            ])).map(settle);

            const getD = (r) => { if (!r) return null; const a = r.data || r; return Array.isArray(a) ? a[0] : a; };
            const getA = (r) => { if (!r) return []; const a = r.data || r; return Array.isArray(a) ? a : []; };

            let kpi = { ordersInPipeline: '0', dispatchedToday: '0', delayedOrders: '0', finishedGoodsStock: '0' };
            const orders = getD(ordersRes);   if (orders)     kpi.ordersInPipeline  = fmtCount(orders.TotalJobInProcess);
            const disp   = getD(dispatchedRes); if (disp)     kpi.dispatchedToday   = fmtCount(disp.TotalChallan);
            const delayed = getD(delayedRes);  if (delayed)   kpi.delayedOrders     = fmtCount(delayed.TotalDelayOrders);
            const stockInfo = getD(stockRes);  if (stockInfo) kpi.finishedGoodsStock = fmtCount(stockInfo.DispatchQuantity);
            setKpiData(kpi);

            const orderStatusCount = getD(orderStatusCountRes);
            setTotalJobCards(Number(orderStatusCount?.TotalJobCard) || 0);

            const pipelineArr = getA(pipelineRes);
            const pipelineAggr = {
                'Complete':     { total: 0, Printing: 0, Binding: 0, QC: 0, Dispatch: 0 },
                'Part Complete':{ total: 0, Printing: 0, Binding: 0, QC: 0, Dispatch: 0 },
                'In Queue':     { total: 0, Printing: 0, Binding: 0, QC: 0, Dispatch: 0 },
                'Pending':      { total: 0, Printing: 0, Binding: 0, QC: 0, Dispatch: 0 },
            };
            pipelineArr.forEach(item => {
                ['Printing', 'Binding', 'QC', 'Dispatch'].forEach(stage => {
                    const statusVal = item[stage]?.toString().trim();
                    if (statusVal && pipelineAggr[statusVal]) {
                        pipelineAggr[statusVal].total++;
                        pipelineAggr[statusVal][stage]++;
                    }
                });
            });

            const pipelineLabels = Object.keys(pipelineAggr);
            const pipelineColors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];

            const trendArr = getA(trendRes).sort((a, b) => new Date(a.ChallanDate) - new Date(b.ChallanDate));
            setRawStock(getA(stockByTitleRes));
            setRawDelays(getA(delayDaysRes));
            setRawTrend(trendArr);

            setCharts(prev => ({
                ...prev,
                pipelineDistribution: {
                    labels: pipelineLabels,
                    datasets: [{
                        data: pipelineLabels.map(l => pipelineAggr[l].total),
                        backgroundColor: (ctx) => {
                            const chart = ctx.chart;
                            const { ctx: c, chartArea } = chart;
                            if (!chartArea) return pipelineColors[ctx.dataIndex] || '#94a3b8';
                            const pair = [
                                ['#10b981', '#059669'],
                                ['#f59e0b', '#d97706'],
                                ['#3b82f6', '#2563eb'],
                                ['#ef4444', '#dc2626'],
                            ][ctx.dataIndex] || ['#94a3b8', '#64748b'];
                            const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                            g.addColorStop(0, pair[0]); g.addColorStop(1, pair[1]);
                            return g;
                        },
                        borderWidth: 3, borderColor: '#ffffff',
                        hoverOffset: 12, borderRadius: 6, spacing: 4,
                        _breakdown: pipelineAggr,
                    }]
                },
            }));

        } catch (error) {
            console.error('DispatchDashboard fetch error', error);
        } finally {
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, [period, fromDate, toDate]);

    /* shared chart axis opts */
    const axisOpts = {
        y: { grid: { color: 'rgba(226,232,240,0.45)', drawBorder: false }, ticks: { font: { family: T.font, size: 10 }, color: T.textMuted } },
        x: {
            grid: { display: false },
            ticks: {
                font: { family: T.font, size: 10 }, color: T.textMuted,
                maxRotation: 45,
                minRotation: 30,
                /* Truncate only very long labels; 30-45° angle gives enough horizontal room */
                callback: function(val) {
                    const raw = this.getLabelForValue ? this.getLabelForValue(val) : String(val);
                    const s = String(raw ?? '');
                    return s.length > 14 ? s.substring(0, 12) + '…' : s;
                },
            },
        },
    };

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 3, width: '100%', boxSizing: 'border-box' }}>
            <DashboardHeader title="Dispatch Dashboard" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate}
                />
            </DashboardHeader>

            <Box sx={{ p: R.pagePad, boxSizing: 'border-box' }}>

                {/* ── KPI Cards ── */}
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                    gap: { xs: "10px", sm: "12px", md: "14px" },
                    mb: { xs: 2, sm: 3.5 },
                    width: "100%",
                }}>
                    <StatCard label="Orders in Pipeline"  value={kpiData.ordersInPipeline}  Icon={Package}    color={T.primary} bg={T.primaryLight} accent={T.primary} animDelay={0.08} loading={loading} onInfoClick={() => openDrill('ordersInPipeline')} />
                    <StatCard label="Dispatched"           value={kpiData.dispatchedToday}   Icon={Truck}      color={T.green}   bg={T.greenLight}   accent={T.green}   animDelay={0.14} loading={loading} onInfoClick={() => openDrill('dispatched')} />
                    <StatCard label="Delayed Orders"       value={kpiData.delayedOrders}     Icon={Clock}      color={T.red}     bg={T.redLight}     accent={T.red}     animDelay={0.20} loading={loading} onInfoClick={() => openDrill('delayedOrders')} />
                    <StatCard label="Dispatch Quantity"    value={kpiData.finishedGoodsStock} Icon={Smartphone} color={T.purple}  bg={T.purpleLight}  accent={T.purple}  animDelay={0.26} loading={loading} onInfoClick={() => openDrill('dispatchQuantity')} />
                </Box>


                {/* ── Charts Grid — 4 charts: 1 col mobile, 2 col tablet, 4 col desktop ── */}
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" },
                    gap: { xs: "10px", sm: "12px", md: "14px" },
                    width: "100%",
                }}>
                    {/* Pipeline Distribution */}
                    <ChartCard title="Pipeline Distribution" Icon={PieIcon} accent={T.primary} animDelay={0.38} loading={loading}>
                        <Box sx={{ height: { xs: 220, sm: 260 }, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            <Box sx={{ width: '100%', height: '100%', maxWidth: 260 }}>
                                <DashboardChart type="doughnut" data={charts.pipelineDistribution} height="100%" title=""
                                    options={{
                                        maintainAspectRatio: true, aspectRatio: 1,
                                        layout: { padding: 8 },
                                        plugins: {
                                            legend: { position: 'bottom', labels: { padding: 12, font: { family: T.font, size: 10, weight: 600 }, usePointStyle: true, boxWidth: 7 } },
                                            tooltip: {
                                                backgroundColor: 'rgba(15,23,42,0.92)', padding: 10, cornerRadius: 8,
                                                callbacks: {
                                                    label: function(ctx) {
                                                        const label = ctx.label || '';
                                                        const val = ctx.raw;
                                                        const bd = ctx.dataset._breakdown?.[label];
                                                        let lines = [` ${label}: ${val}`];
                                                        if (bd) {
                                                            if (bd.Printing) lines.push(` • Printing: ${bd.Printing}`);
                                                            if (bd.Binding)  lines.push(` • Binding: ${bd.Binding}`);
                                                            if (bd.QC)       lines.push(` • QC: ${bd.QC}`);
                                                            if (bd.Dispatch) lines.push(` • Dispatch: ${bd.Dispatch}`);
                                                        }
                                                        return lines;
                                                    }
                                                }
                                            }
                                        },
                                        cutout: '75%',
                                        animation: { animateRotate: true, animateScale: true, duration: 1400, easing: 'easeOutQuart' },
                                    }}
                                />
                            </Box>
                            {!loading && (
                                <Box sx={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 900, color: T.text, lineHeight: 1 }}>
                                        {totalJobCards}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: T.primary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Jobs</Typography>
                                </Box>
                            )}
                        </Box>
                    </ChartCard>

                    {/* Weekly Dispatch Trend */}
                    <ChartCard title="Weekly Dispatch Trend" Icon={LineIcon} accent={T.green} animDelay={0.46} loading={loading}
                        action={rawTrend.length > 5 && (
                            <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', borderColor: T.border, py: 0.3 }} onClick={() => setViewAllTrend(!viewAllTrend)}>
                                {viewAllTrend ? "Top 5" : "All"}
                            </Button>
                        )}
                        scrollable={viewAllTrend}
                        minWidth={viewAllTrend ? `${rawTrend.length * 55 + 80}px` : undefined}
                    >
                        <DashboardChart type="line" data={charts.dispatchTrend} height={260} title=""
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 62, left: 4, right: 8 } },
                                scales: {
                                    ...axisOpts,
                                    x: { ...axisOpts.x, ticks: { ...axisOpts.x.ticks, maxTicksLimit: 10 } },
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { backgroundColor: 'rgba(15,23,42,0.92)', padding: 10, cornerRadius: 8 },
                                },
                                animation: { duration: 1400, easing: 'easeOutQuart' },
                            }}
                        />
                    </ChartCard>

                    {/* Title In Stock */}
                    <ChartCard title="Title In Stock" Icon={BarChart3} accent={T.purple} animDelay={0.54} loading={loading}
                        action={rawStock.length > 5 && (
                            <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', borderColor: T.border, py: 0.3 }} onClick={() => setViewAllStock(!viewAllStock)}>
                                {viewAllStock ? "Top 5" : "All"}
                            </Button>
                        )}
                        scrollable={viewAllStock}
                        minWidth={viewAllStock ? `${rawStock.length * 55 + 80}px` : undefined}
                    >
                        <DashboardChart type="bar" data={charts.stockByTitle} height={260} title=""
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 62, left: 4, right: 8 } },
                                scales: {
                                    ...axisOpts,
                                    x: { ...axisOpts.x, ticks: { ...axisOpts.x.ticks, autoSkip: false } },
                                },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { backgroundColor: 'rgba(15,23,42,0.92)', padding: 10, cornerRadius: 8, callbacks: { title: (items) => items[0].label } },
                                },
                                animation: { duration: 1400, easing: 'easeOutQuart' },
                            }}
                        />
                    </ChartCard>

                    {/* Delay Days Per Order */}
                    <ChartCard title="Delay Days Per Order" Icon={Clock} accent={T.red} animDelay={0.62} loading={loading}
                        action={rawDelays.length > 5 && (
                            <Button size="small" variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontSize: '0.7rem', borderColor: T.border, py: 0.3 }} onClick={() => setViewAllDelays(!viewAllDelays)}>
                                {viewAllDelays ? "Top 5" : "All"}
                            </Button>
                        )}
                        scrollable={viewAllDelays}
                        minWidth={viewAllDelays ? `${rawDelays.length * 55 + 80}px` : undefined}
                    >
                        <DashboardChart type="bar" data={charts.delayDaysPerOrder} height={260} title=""
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 62, left: 4, right: 8 } },
                                scales: axisOpts,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: {
                                        backgroundColor: 'rgba(15,23,42,0.92)', padding: 10, cornerRadius: 8,
                                        callbacks: {
                                            label: function(ctx) {
                                                const details = ctx.dataset._details?.[ctx.dataIndex];
                                                let lines = [` Delay: ${ctx.raw} Days`];
                                                if (details?.content) lines.push(` Content: ${details.content}`);
                                                if (details?.status)  lines.push(` Status: ${details.status}`);
                                                return lines;
                                            }
                                        }
                                    }
                                },
                                animation: { duration: 1400, easing: 'easeOutQuart' },
                            }}
                        />
                    </ChartCard>
                </Box>
            </Box>

            {/* Dispatch KPI Drilldown Modal */}
            {drillKey && DISPATCH_DRILL_CONFIG[drillKey] && (
                <DrillDownModal
                    open={drillOpen}
                    onClose={closeDrill}
                    title={DISPATCH_DRILL_CONFIG[drillKey].title}
                    columns={DISPATCH_DRILL_CONFIG[drillKey].columns}
                    rows={drillRows}
                    loading={drillLoading}
                />
            )}
        </Box>
    );
};

export default DispatchDashboard;
