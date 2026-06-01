import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, keyframes, Button, Grid, Paper, Popover } from '@mui/material';
import {
    Layers, TrendingDown, AlertCircle, Droplets, Printer, FlaskConical,
    BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity,
    ChevronDown, User, Info, Clock, CheckCircle2, AlertTriangle, Smartphone, Truck, Package
} from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import DrillDownModal from '../common/Drilldownmodal';
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════ */
const formatValue = (val, type = 'number', full = false) => {
    if (val === undefined || val === null) return '0';
    const num = parseFloat(val);
    if (isNaN(num)) return val;

    if (type === 'percent') {
        return num.toFixed(full ? 4 : 2) + '%';
    }

    if (!full) {
        const abs = Math.abs(num);
        if (abs >= 1e7) return `${(num / 1e7).toFixed(1)} Cr`;
        if (abs >= 1e5) return `${(num / 1e5).toFixed(1)} L`;
        if (abs >= 1e3) return `${(num / 1e3).toFixed(1)} K`;
    }

    return num.toLocaleString('en-IN');
};


/* ═══════════════════════════════════════════════════════════════
   KEYFRAMES
   ══════════════════════════════════════════════════════════════ */
const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
`;
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
const iconPop = keyframes`
    0%   { transform: scale(0.6); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
`;
const shimmerKf = keyframes`
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
`;
const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const getInkColor = (name) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('cyan')) return '#06b6d4';
    if (n.includes('magenta')) return '#db2777';
    if (n.includes('yellow')) return '#eab308';
    if (n.includes('black') || n.includes(' k')) return '#18181b';
    if (n.includes('white')) return '#f8fafc';
    if (n.includes('pantone') || n.includes('special')) return '#8b5cf6';
    return '#6366f1';
};
const topBarSlide = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
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
        <CircularProgress size={32} thickness={4} sx={{ color: T.primary }} />
    </Box>
) : null;

/* ═══════════════════════════════════════════════════════════════
   STAT CARD
   ══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
const StatCard = ({ label, value, subValue, subtext, color, bg, accent, loading, animDelay, showWarning, type, onInfoClick, Icon }) => (
    <Box sx={{
        borderRadius: '20px', bgcolor: '#ffffff',
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
        <Box sx={{ pl: 3, pr: 2.5, pt: 2.5, pb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Icon row + optional warning badge */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{
                    width: 44, height: 44, borderRadius: '13px', bgcolor: bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1.5px solid ${color}22`,
                    boxShadow: `0 2px 10px ${color}22, inset 0 1px 0 ${color}15`,
                    animation: `${iconPop} 0.4s ease ${animDelay + 0.15}s both`,
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <Icon size={20} strokeWidth={2.2} color={color} />
                </Box>
                {showWarning && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: T.amberLight, color: T.amber, px: 1, py: 0.25, borderRadius: '6px', border: `1px solid ${T.amber}30`, animation: `${fadeIn} 0.5s ease` }}>
                        <AlertTriangle size={12} strokeWidth={3} />
                        <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warning</Typography>
                    </Box>
                )}
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    <Shimmer width="65%" height={28} />
                    <Shimmer width="42%" height={13} />
                </Box>
            ) : (
                <>
                    <Typography className="kpi-value" sx={{
                        fontSize: { xs: '1.25rem', md: '1.5rem' },
                        fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em',
                        fontFamily: T.fontMono, mt: 0.5,
                        transition: 'color 0.28s ease',
                        animation: `${countUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.2}s both`,
                    }}>
                        {formatValue(value, type)}
                    </Typography>
                    <Box sx={{ width: '100%', height: '1px', background: `linear-gradient(90deg, ${accent}25 0%, transparent 80%)` }} />
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
                        <Typography sx={{
                            fontSize: '0.64rem', fontWeight: 700, color: '#7c8fa6',
                            textTransform: 'uppercase', letterSpacing: '0.09em',
                            fontFamily: T.font, lineHeight: 1.4,
                        }}>
                            {label}
                        </Typography>
                        {(subValue || subtext) && (
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 600, color: T.textFaint }}>
                                {subValue} {subtext}
                            </Typography>
                        )}
                    </Box>
                </>
            )}
        </Box>

        {/* Info icon */}
        {onInfoClick && (
            <Box
                onClick={e => { e.stopPropagation(); onInfoClick(); }}
                sx={{
                    position: 'absolute', top: 9, right: 9,
                    width: 26, height: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: color, bgcolor: bg,
                    border: `1.5px solid ${color}33`, borderRadius: '8px',
                    boxShadow: `0 1px 6px ${color}22`,
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    zIndex: 2,
                    '&:hover': { bgcolor: `${color}22`, border: `1.5px solid ${color}88`, transform: 'scale(1.18)', boxShadow: `0 3px 10px ${color}44` },
                }}
            >
                <Info size={14} strokeWidth={2.5} />
            </Box>
        )}
    </Box>
);

/* ═══════════════════════════════════════════════════════════════
   CHART CARD
   ══════════════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
const ChartCard = ({ title, subtitle, Icon, accent, children, loading, animDelay, action, scrollable, minWidth }) => (
    <Box sx={{
        background: "linear-gradient(160deg, #ffffff 0%, #f7f9ff 100%)",
        borderRadius: "20px",
        p: { xs: "18px", sm: "22px" },
        border: `1.5px solid ${T.border}`,
        boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 4px 20px rgba(15,23,42,0.07)`,
        position: "relative", overflow: "hidden", minWidth: 0,
        animation: `${fadeUp} 0.65s ease ${animDelay}s both`,
        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        "&:hover": {
            boxShadow: `0 32px 64px -12px ${accent}28, 0 0 0 2px ${accent}30`,
            borderColor: `${accent}40`,
            transform: "translateY(-12px)"
        },
        "&::before": {
            content: '""',
            position: "absolute", top: 0, left: 0, right: 0, height: "3.5px",
            background: `linear-gradient(90deg, ${accent}, ${accent}60, ${accent})`,
            backgroundSize: "200% 100%",
            animation: `${shimmerKf} 4s linear infinite, ${topBarSlide} 0.7s ease ${animDelay}s both`,
            borderRadius: "20px 20px 0 0",
            opacity: 0.7,
        }
    }}>
        <ChartOverlay loading={loading} />

        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: "10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: `${accent}10`, color: accent,
                    border: `1.5px solid ${accent}30`,
                    boxShadow: `0 2px 10px ${accent}20`,
                    animation: `${iconPop} 0.5s ease both`
                }}>
                    <Icon size={18} strokeWidth={2.2} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: T.text, lineHeight: 1.2 }}>
                        {title}
                    </Typography>
                    {subtitle && <Typography sx={{ fontSize: "0.62rem", color: T.textFaint, mt: 0.3 }}>{subtitle}</Typography>}
                </Box>
            </Box>
            {action ? <Box>{action}</Box> : <ChevronDown size={18} style={{ color: T.textFaint, marginTop: 4 }} />}
        </Box>

        <Box sx={{
            height: { xs: 220, sm: 300, md: 380 }, position: "relative",
            ...(scrollable && {
                overflowX: 'auto',
                overflowY: 'hidden',
                '&::-webkit-scrollbar': { height: '6px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: T.border, borderRadius: '4px' }
            })
        }}>
            <Box sx={{ height: '100%', minWidth: minWidth || '100%', position: 'relative' }}>
                {children}
            </Box>
        </Box>
    </Box>
);



/* ═══════════════════════════════════════════════════════════════
   TOP-5 / ALL — UI-only slice helper (no API/data-flow changes)
   ══════════════════════════════════════════════════════════════ */
const sliceChartData = (data, limit) => {
    if (!data?.labels?.length) return data;
    return {
        ...data,
        labels: data.labels.slice(0, limit),
        datasets: data.datasets.map(ds => ({
            ...ds,
            data: (ds.data || []).slice(0, limit),
        })),
    };
};

/* Single-button toggle:
   • isTop5 = true  → label "View All"   (currently showing top 5, click to see all)
   • isTop5 = false → label "Show Top 5" (currently showing all,   click to collapse)
   Clicking calls onChange(!isTop5) — same boolean interface as before.           */
const Top5Toggle = ({ isTop5, onChange }) => (
    <Box
        onClick={(e) => { e.stopPropagation(); onChange(!isTop5); }}
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: { xs: 1.1, sm: 1.4 },
            py: { xs: 0.45, sm: 0.55 },
            fontSize: { xs: '0.62rem', sm: '0.7rem' },
            fontWeight: 700,
            cursor: 'pointer',
            borderRadius: '8px',
            border: '1.5px solid #2563eb',
            color: '#2563eb',
            bgcolor: 'rgba(37,99,235,0.04)',
            transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            fontFamily: T.font,
            flexShrink: 0,
            lineHeight: 1.4,
            '&:hover': {
                bgcolor: 'rgba(37,99,235,0.1)',
                boxShadow: '0 2px 10px rgba(37,99,235,0.2)',
                transform: 'scale(1.03)',
            },
            '&:active': {
                transform: 'scale(0.97)',
                bgcolor: 'rgba(37,99,235,0.15)',
            },
        }}
    >
        {isTop5 ? 'View All' : 'Show Top 5'}
    </Box>
);

/* ═══════════════════════════════════════════════════════════════
   DRILLDOWN CONFIG — info icon popup for each KPI card
   API name convention: GetWastageDrillDown<MetricName>
   Payload: { Fromdate, Todate, CompanyID }
   ══════════════════════════════════════════════════════════════ */
const WASTAGE_DRILL_CONFIG = {
    /* Uses same confirmed APIs as fetchData — DrillDownModal auto-totals numeric cols */
    issued: {
        title: 'Total Paper Issued',
        apiName: 'GetTotalPaperIssued',
        columns: [
            { key: 'MachineName',           label: 'Machine Name',  width: 200 },
            { key: 'ItemName',              label: 'Item / Paper',  width: 200 },
            { key: 'TotalReceivedQuantity', label: 'Issued Qty',    width: 140 },
        ],
    },
    wasted: {
        title: 'Total Paper Wasted',
        apiName: 'GetTotalPaperWasted',
        columns: [
            { key: 'MachineName',           label: 'Machine Name',  width: 200 },
            { key: 'ItemName',              label: 'Item / Paper',  width: 200 },
            { key: 'TotalWastageQuantity',  label: 'Wasted Qty',    width: 140 },
        ],
    },
    wastage: {
        title: 'Wastage % by Machine',
        apiName: 'GetMachinewisePaperWastage',
        columns: [
            { key: 'MachineName', label: 'Machine Name', width: 280 },
            { key: 'Wastage %',   label: 'Wastage %',    width: 140 },
        ],
    },
    ink: {
        title: 'Ink Consumption Details',
        apiName: 'GetInkConsumptionIssuedUsed',
        columns: [
            { key: 'MachineName',     label: 'Machine Name', width: 200 },
            { key: 'Colour',          label: 'Ink Colour',   width: 150 },
            { key: 'TotalConsumeQty', label: 'Consumed Qty', width: 140 },
        ],
    },
    plate: {
        title: 'Plate Rejection Reasons',
        apiName: 'GetPlateRejectionReasons',
        columns: [
            { key: 'Reason', label: 'Rejection Reason', width: 300 },
            { key: 'Count',  label: 'Count',            width: 110 },
        ],
    },
    chemical: {
        title: 'Chemical Consumption by Machine',
        apiName: 'GetChemicalConsumptionbyMachine',
        columns: [
            { key: 'MachineName',     label: 'Machine Name', width: 280 },
            { key: 'TotalConsumeQty', label: 'Consumed Qty', width: 150 },
        ],
    },
};

const WastageMaterial = () => {
    const _now     = dayjs();
    const _cYear   = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
    const FY_FROM  = `${_cYear}-04-01`;
    const FY_TO    = `${_cYear + 1}-03-31`;

    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(dayjs().format('hh:mm:ss A'));
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);

    const [kpi, setKpi] = useState({
        issued: 0,
        wasted: 0,
        wastage: "0%",
        ink: 0,
        plate: "0%",
        chemical: 0
    });

    const [machineWastage, setMachineWastage] = useState({ labels: [], datasets: [] });
    const [makeReady, setMakeReady] = useState({ labels: [], datasets: [] });
    const [inkCons, setInkCons] = useState({ labels: [], datasets: [] });
    const [chemConsByMachine, setChemConsByMachine] = useState({ labels: [], datasets: [] });

    /* ── Drilldown modal state ── */
    const [drillKey, setDrillKey]     = useState(null);
    const [drillOpen, setDrillOpen]   = useState(false);
    const [drillRows, setDrillRows]   = useState([]);
    const [drillLoading, setDrillLoading] = useState(false);

    const openDrill = async (key) => {
        const config = WASTAGE_DRILL_CONFIG[key];
        if (!config) return;
        const companyId = localStorage.getItem('CompanyID');
        setDrillKey(key);
        setDrillRows([]);
        setDrillOpen(true);
        setDrillLoading(true);
        try {
            const res = await postRequest(config.apiName, {
                CompanyID: companyId,
                Fromdate: fromDate,
                Todate: toDate,
            });
            setDrillRows(Array.isArray(res?.data) ? res.data : []);
        } catch (e) {
            console.error(`Wastage drilldown fetch error [${config.apiName}]:`, e);
            setDrillRows([]);
        } finally {
            setDrillLoading(false);
        }
    };

    const closeDrill = () => setDrillOpen(false);

    /* ── Top 5 / All toggle state (UI only) ── */
    const [showTop5, setShowTop5] = useState({
        machineWastage: true,
        makeReady: true,
        inkCons: true,
        chemCons: true,
    });
    const handleTop5Toggle = (key, value) =>
        setShowTop5(prev => ({ ...prev, [key]: value }));

    const fetchData = async () => {
        const companyId = localStorage.getItem('CompanyID');
        if (!companyId) return;

        setLoading(true);
        const payload = { Fromdate: fromDate, Todate: toDate, CompanyID: companyId };

        try {
            const [
                resIssued, resWasted, resWastage, resInk, resPlate, resChem,
                resMachWastage, resMakeReady, , resInkCons,
                resChemConsByMachine
            ] = await Promise.all([
                postRequest('GetTotalPaperIssued', payload),
                postRequest('GetTotalPaperWasted', payload),
                postRequest('GetWastage', payload),
                postRequest('GetInkUnaccounted', payload),
                postRequest('GetPlateRejection', payload),
                postRequest('GetChemicalCost', payload),
                postRequest('GetMachinewisePaperWastage', payload),
                postRequest('GetMakereadyActualvsStandard', payload),
                postRequest('GetPlateRejectionReasons', payload),
                postRequest('GetInkConsumptionIssuedUsed', payload),
                postRequest('GetChemicalConsumptionbyMachine', payload)
            ]);

            // Map KPIs
            setKpi({
                issued: resIssued.data?.[0]?.TotalReceivedQuantity || 0,
                wasted: resWasted.data?.[0]?.TotalWastageQuantity || 0,
                wastage: resWastage.data?.[0]?.WastagePercent || 0,
                ink: resInk.data?.[0]?.TotalAmount || 0,
                plate: resPlate.data?.[0]?.PlateRejection || 0,
                chemical: resChem.data?.[0]?.TotalAmount || 0
            });

            // Process Machine Wastage (GetMachinewisePaperWastage)
            if (resMachWastage.data) {
                setMachineWastage({
                    labels: resMachWastage.data.map(d => d.MachineName),
                    datasets: [{
                        label: 'Wastage %',
                        data: resMachWastage.data.map(d => d["Wastage %"] || 0),
                        backgroundColor: resMachWastage.data.map((d, i) => i % 2 === 0 ? T.green : T.amber),
                        borderRadius: 8,
                        barThickness: 45,
                    }]
                });
            }

            // Process Make Ready (GetMakereadyActualvsStandard)
            if (resMakeReady.data) {
                setMakeReady({
                    labels: resMakeReady.data.map(d => d.JobBookingNo || "N/A"),
                    datasets: [
                        {
                            label: 'Standard',
                            data: resMakeReady.data.map(d => d.Standard || 0),
                            backgroundColor: '#94a3b8',
                            borderRadius: 4,
                            barPercentage: 0.8,
                            categoryPercentage: 0.8,
                        },
                        {
                            label: 'Actual',
                            data: resMakeReady.data.map(d => d.WestageQuantity || 0),
                            backgroundColor: T.primary,
                            borderRadius: 4,
                            barPercentage: 0.8,
                            categoryPercentage: 0.8,
                        }
                    ]
                });
            }


            // Ink Consumption: Machine-wise (stacked by colour)
            if (resInkCons.data && Array.isArray(resInkCons.data)) {
                const machines = [...new Set(resInkCons.data.map(d => d.MachineName).filter(Boolean))];
                const colours  = [...new Set(resInkCons.data.map(d => d.Colour).filter(Boolean))];
                setInkCons({
                    labels: machines,
                    datasets: colours.map(colour => ({
                        label: colour,
                        data: machines.map(machine => {
                            const row = resInkCons.data.find(d => d.MachineName === machine && d.Colour === colour);
                            return row ? parseFloat(row.TotalConsumeQty || 0) : 0;
                        }),
                        backgroundColor: getInkColor(colour),
                        borderRadius: 4,
                        barPercentage: 0.8,
                    }))
                });
            }

            // Chemical Consumption by Machine
            if (resChemConsByMachine.data && Array.isArray(resChemConsByMachine.data)) {
                setChemConsByMachine({
                    labels: resChemConsByMachine.data.map(d => d.MachineName || 'N/A'),
                    datasets: [
                        {
                            label: 'Total Consume Qty',
                            data: resChemConsByMachine.data.map(d => parseFloat(d.TotalConsumeQty || 0)),
                            backgroundColor: T.green,
                            borderRadius: 4,
                            barPercentage: 0.7,
                        },
                    ]
                });
            }

            setLastUpdated(dayjs().format('hh:mm:ss A'));
        } catch (error) {
            console.error("Dashboard Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, fromDate, toDate]);

    return (
        <Box sx={{
            bgcolor: T.bg,
            minHeight: '100vh',
            width: '100%',
            overflowX: 'hidden',
        }}>
            <DashboardHeader
                title="Wastage & Material Dashboard"
                lastUpdated={lastUpdated}
                onRefresh={fetchData}
                loading={loading}
            >
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate}
                />
            </DashboardHeader>

            <Box sx={{ width: '100%', p: R.pagePad, boxSizing: 'border-box' }}>
                {/* ── KPI Cards ── */}
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" },
                    gap: { xs: "12px", sm: "16px", md: "20px" },
                    mb: 4,
                    width: "100%",
                }}>
                    <StatCard label="Total Paper Issued" value={kpi.issued} subtext="Sheets" Icon={Layers} color={T.primary} bg={T.primaryLight} accent={T.primary} animDelay={0.1} loading={loading} onInfoClick={() => openDrill('issued')} />
                    <StatCard label="Total Paper Wasted" value={kpi.wasted} subtext="Sheets" Icon={TrendingDown} color={T.red} bg={T.redLight} accent={T.red} animDelay={0.15} loading={loading} onInfoClick={() => openDrill('wasted')} />
                    <StatCard label="Wastage %" value={kpi.wastage} type="percent" subValue="Target 3.0%" Icon={AlertCircle} color={T.amber} bg={T.amberLight} accent={T.amber} animDelay={0.2} showWarning={parseFloat(kpi.wastage) > 3} loading={loading} onInfoClick={() => openDrill('wastage')} />
                    <StatCard label="Ink Cost" value={kpi.ink} Icon={Droplets} color={T.purple} bg={T.purpleLight} accent={T.purple} animDelay={0.25} loading={loading} onInfoClick={() => openDrill('ink')} />
                    <StatCard label="Plate Rejection" value={kpi.plate} type="percent" subtext="Rejected" Icon={Printer} color={T.indigo} bg={T.indigoLight} accent={T.indigo} animDelay={0.3} loading={loading} onInfoClick={() => openDrill('plate')} />
                    <StatCard label="Chemical Cost" value={kpi.chemical} subtext="Total" Icon={FlaskConical} color={T.green} bg={T.greenLight} accent={T.green} animDelay={0.35} loading={loading} onInfoClick={() => openDrill('chemical')} />
                </Box>

                {/* ── Charts Grid ── */}
                <Box sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
                    gap: { xs: "16px", sm: "20px", md: "24px" },
                    mb: 5,
                    width: "100%",
                }}>
                    <ChartCard
                        title="Machine-wise Paper Wastage %"
                        Icon={Printer}
                        accent={T.primary}
                        animDelay={0.5}
                        loading={loading}
                        action={
                            <Top5Toggle
                                isTop5={showTop5.machineWastage}
                                onChange={(v) => handleTop5Toggle('machineWastage', v)}
                            />
                        }
                    >
                        <DashboardChart
                            type="bar"
                            data={showTop5.machineWastage ? sliceChartData(machineWastage, 5) : machineWastage}
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 20 } },
                                animation: { duration: 2000, easing: 'easeOutQuart' },
                                scales: { 
                                    y: { ticks: { font: { size: 10, weight: 600 }, callback: (v) => v + '%' }, grid: { borderDash: [4, 4], color: '#f1f5f9' } },
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 500 } } }
                                },
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Make-ready: Actual vs Standard"
                        Icon={Layers}
                        accent={T.indigo}
                        animDelay={0.6}
                        loading={loading}
                        action={
                            <Top5Toggle
                                isTop5={showTop5.makeReady}
                                onChange={(v) => handleTop5Toggle('makeReady', v)}
                            />
                        }
                    >
                        <DashboardChart
                            type="bar"
                            data={showTop5.makeReady ? sliceChartData(makeReady, 5) : makeReady}
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 20 } },
                                animation: { duration: 2200, easing: 'easeOutQuart' },
                                plugins: {
                                    legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, padding: 18, font: { size: 10, weight: 750 } } }
                                },
                                scales: { 
                                    y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 600 } } },
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 500 }, maxRotation: 45, minRotation: 45 } }
                                },
                            }}
                        />
                    </ChartCard>

                    {/* <ChartCard title="Plate Rejection Reasons" Icon={PieIcon} accent={T.red} animDelay={0.65} loading={loading}>
                        <DashboardChart
                            type="doughnut"
                            data={plateReasons}
                            options={{
                                maintainAspectRatio: false,
                                cutout: '72%',
                                plugins: { legend: { position: 'right', labels: { padding: 15 } } }
                            }}
                        />
                    </ChartCard> */}

                    <ChartCard
                        title="Ink Consumption: Machine-wise"
                        Icon={Droplets}
                        accent={T.purple}
                        animDelay={0.7}
                        loading={loading}
                        action={
                            <Top5Toggle
                                isTop5={showTop5.inkCons}
                                onChange={(v) => handleTop5Toggle('inkCons', v)}
                            />
                        }
                    >
                        <DashboardChart
                            type="bar"
                            data={showTop5.inkCons ? sliceChartData(inkCons, 5) : inkCons}
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 20 } },
                                animation: { duration: 2200, easing: 'easeOutQuart' },
                                interaction: { mode: 'index', intersect: false },
                                plugins: {
                                    legend: {
                                        display: true,
                                        position: 'top',
                                        labels: { font: { size: 10, weight: 600 }, boxWidth: 12, padding: 12 }
                                    },
                                    tooltip: {
                                        mode: 'index',
                                        intersect: false,
                                        callbacks: { label: (c) => ` ${c.dataset.label}: ${c.raw} kg` }
                                    }
                                },
                                scales: {
                                    y: {
                                        stacked: true,
                                        beginAtZero: true,
                                        ticks: { font: { size: 10, weight: 600 }, callback: (v) => v + 'kg' },
                                        grid: { borderDash: [4, 4], color: '#f1f5f9' }
                                    },
                                    x: {
                                        stacked: true,
                                        grid: { display: false },
                                        ticks: { font: { size: 10, weight: 500 }, maxRotation: 45, minRotation: 45 }
                                    }
                                }
                            }}
                        />
                    </ChartCard>

                    <ChartCard
                        title="Chemical Consumption by Machine"
                        Icon={FlaskConical}
                        accent={T.green}
                        animDelay={0.75}
                        loading={loading}
                        action={
                            <Top5Toggle
                                isTop5={showTop5.chemCons}
                                onChange={(v) => handleTop5Toggle('chemCons', v)}
                            />
                        }
                    >
                        <DashboardChart
                            type="bar"
                            data={showTop5.chemCons ? sliceChartData(chemConsByMachine, 5) : chemConsByMachine}
                            options={{
                                maintainAspectRatio: false,
                                layout: { padding: { bottom: 20 } },
                                animation: { duration: 2200, easing: 'easeOutQuart' },
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} units` } }
                                },
                                scales: { 
                                    y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f1f5f9' }, ticks: { font: { size: 10, weight: 600 } } },
                                    x: { grid: { display: false }, ticks: { font: { size: 10, weight: 500 }, maxRotation: 45, minRotation: 45 } }
                                }
                            }}
                        />
                    </ChartCard>
                </Box>
            </Box>

            {/* Wastage KPI Drilldown Modal — info icon table popup for each KPI card */}
            {drillKey && WASTAGE_DRILL_CONFIG[drillKey] && (
                <DrillDownModal
                    open={drillOpen}
                    onClose={closeDrill}
                    title={WASTAGE_DRILL_CONFIG[drillKey].title}
                    columns={WASTAGE_DRILL_CONFIG[drillKey].columns}
                    rows={drillRows}
                    loading={drillLoading}
                />
            )}
        </Box>
    );
};

export default WastageMaterial;