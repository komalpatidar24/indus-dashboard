import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, ToggleButton, ToggleButtonGroup,Paper } from '@mui/material';
import { Shield } from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';

/* ─────────────────────────────────────────────────────────────
   SVG Semi-circle Gauge
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   SVG Semi-circle Gauge
 ───────────────────────────────────────────────────────────── */
const SemiGauge = ({ value = 0, size = 180, color = '#2563eb', label = '', fontSize = 0.2 }) => {
    const stroke = size * 0.08;
    const r = (size - stroke) / 2;
    const cx = size / 2;
    const cy = size / 2 + stroke / 2;
    const circ = Math.PI * r;
    const offset = circ * (1 - Math.min(value, 100) / 100);
    const arcPath = `M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`;
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
                <path d={arcPath} fill="none" stroke="#f1f5f9" strokeWidth={stroke} strokeLinecap="round" />
                <path d={arcPath} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                <text x={cx} y={cy - 2} textAnchor="middle"
                    fontSize={size * fontSize} fontWeight="900" fill="#0f172a"
                    fontFamily="'Plus Jakarta Sans', system-ui, sans-serif">
                    {value != null ? `${value}%` : '—'}
                </text>
                {label && (
                    <text x={cx} y={cy + size * 0.12} textAnchor="middle"
                        fontSize={size * 0.08} fontWeight="700" fill="#94a3b8"
                        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif" opacity="0.8">
                        {label.toUpperCase()}
                    </text>
                )}
            </svg>
        </Box>
    );
};

/* ─────────────────────────────────────────────────────────────
   Progress bar row
 ───────────────────────────────────────────────────────────── */
const ProgressRow = ({ label, value }) => (
    <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', ml: 1 }}>
                {value != null ? `${value}%` : '—'}
            </Typography>
        </Box>
        <LinearProgress variant="determinate" value={value ?? 0}
            sx={{
                height: 6, borderRadius: 3, bgcolor: '#f1f5f9',
                '& .MuiLinearProgress-bar': { bgcolor: '#0d9488', borderRadius: 3 }
            }} />
    </Box>
);

/* ─────────────────────────────────────────────────────────────
   White card wrapper
 ───────────────────────────────────────────────────────────── */
const Card = ({ children, sx = {} }) => (
    <Paper elevation={0} sx={{
        bgcolor: '#fff', borderRadius: '24px', p: 3,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9',
        height: '100%', boxSizing: 'border-box',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)',
            borderColor: '#e2e8f0'
        },
        ...sx
    }}>
        {children}
    </Paper>
);

/* ─────────────────────────────────────────────────────────────
   Pill tab
 ───────────────────────────────────────────────────────────── */
const PillTabs = ({ options, active, onChange }) => (
    <Box sx={{
        display: 'flex',
        gap: 0.5,
        bgcolor: '#f1f5f9',
        p: 0.4,
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
    }}>
        {options.map((opt) => (
            <Box key={opt} onClick={() => onChange(opt)} sx={{
                px: 2, py: 0.6, borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                cursor: 'pointer', userSelect: 'none', transition: 'all 0.3s ease',
                bgcolor: active === opt ? '#fff' : 'transparent',
                color: active === opt ? '#0f172a' : '#64748b',
                boxShadow: active === opt ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                '&:hover': { color: '#0f172a' }
            }}>{opt}</Box>
        ))}
    </Box>
);

const _now    = dayjs();
/* ── Current financial year logic ── */
const _cYear  = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO   = `${_cYear + 1}-03-31`;

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
const FinalOTIF = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [viewMode, setViewMode] = useState('Job');
    const [otifTab, setOtifTab] = useState('Actual');
    const [trendTab, setTrendTab] = useState('Trend');

    // Filtering State
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);
    /* ── KPI state ── */
    const [otif] = useState({
        overall: null, onTime: null, inFull: null,
        supplierOtif: null, bufferUsed: null,
        totalJobs: null, delivered: null, outstanding: null,
        dispatchVariance: null, qcIssues: null
    });

    /* ── Stage performance ── */
    const [stagePerf] = useState([
        { label: 'Operational (On DOD including sales failure)', value: null },
        { label: 'Operational (On FG Creation)', value: null },
        { label: 'OTIF due to Procurement Delay', value: null },
        { label: 'OTIF due to Production Delay', value: null }
    ]);

    /* ── Chart data ── */
    const [runningJobs] = useState({
        total: null,
        chartData: { labels: [], datasets: [] }
    });

    const [trendChart] = useState({ labels: [], datasets: [] });

    /* ── Fetch ── */
    const fetchData = async () => {
        setLoading(true);
        try {
            // Replace with real API calls:
            // const payload = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period, viewMode };
            // const res = await postRequest('GetDeliveryStatus', payload);
            // const d = res.data;
            // setOtif({ overall: d.overall, onTime: d.onTime, inFull: d.inFull, ... });
            // setStagePerf(d.stagePerf);
            // setRunningJobs({ total: d.runningJobs.total, chartData: d.runningJobs.chartData });
            // setTrendChart(d.trendChart);
        } catch (err) {
            console.error('OTIF fetch error', err);
        } finally {
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [viewMode, period, fromDate, toDate]);

    const fmtK = (v) => {
        if (v == null) return '—';
        return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}`;
    };

    /* ── Toggle button style ── */
    const tglSx = {
        border: 'none', borderRadius: '10px !important', px: 2, py: 0.6,
        fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase',
        letterSpacing: '0.05em', transition: 'all 0.3s ease',
        '&.Mui-selected': { bgcolor: '#fff !important', color: '#0f172a !important', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
        '&:hover': { color: '#0f172a' }
    };

    return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            <DashboardHeader title="Final OTIF" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter 
                    period={period}
                    setPeriod={setPeriod}
                    fromDate={fromDate}
                    setFromDate={setFromDate}
                    toDate={toDate}
                    setToDate={setToDate}
                    onApply={() => {
                        // fetchData is already triggered by useEffect on these states
                    }}
                />
            </DashboardHeader>

            <Box sx={{
                bgcolor: 'transparent',
                px: 3, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1
            }}>
                <Typography sx={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    OTIF <span style={{ color: '#0d9488' }}>Insights</span>
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ToggleButtonGroup value={viewMode} exclusive
                        onChange={(_, v) => v && setViewMode(v)}
                        sx={{ bgcolor: '#f1f5f9', borderRadius: '14px', p: 0.5, gap: 0.5, border: '1px solid #e2e8f0' }}>
                        {['Job', 'Value'].map(v => (
                            <ToggleButton key={v} value={v} sx={tglSx}>{v}</ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>
            </Box>

            <Box sx={{ p: 2 }}>

                {/* ══════════════════════════════════════════════════════
                    ROW 1  (3 columns)
                    [On-Time In-Full gauge] | [Running Jobs doughnut] | [Right stats]
                ══════════════════════════════════════════════════════ */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 2, alignItems: 'stretch' }}>

                    {/* ── Col 1: OTIF Gauge ── */}
                    <Card sx={{ flex: { xs: '1 1 auto', md: '0 0 calc(55% - 8px)' } }}>
                        {/* Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                                <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                                    On-Time In-Full
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', mt: 0.2 }}>
                                    Based on Job Count
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    Operational (On DOD)
                                </Typography>
                            </Box>
                            <PillTabs options={['Actual', 'Estimated', 'Interunit']} active={otifTab} onChange={setOtifTab} />
                        </Box>

                        {/* Big gauge centered */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 0 }}>
                            <SemiGauge value={otif.overall} size={220} color="#2563eb" label="Overall OTIF" fontSize={0.18} />
                        </Box>

                        {/* On-Time / In-Full progress bars */}
                        <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>On-Time</Typography>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                    {otif.onTime != null ? `${otif.onTime}%` : '—'}
                                </Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={otif.onTime ?? 0}
                                sx={{
                                    height: 8, borderRadius: 4, bgcolor: '#e2e8f0', mb: 1.5,
                                    '& .MuiLinearProgress-bar': { bgcolor: '#93c5fd', borderRadius: 4 }
                                }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                <Typography sx={{ fontSize: '0.8rem', color: '#475569' }}>In-Full</Typography>
                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                                    {otif.inFull != null ? `${otif.inFull}%` : '—'}
                                </Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={otif.inFull ?? 0}
                                sx={{
                                    height: 8, borderRadius: 4, bgcolor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': { bgcolor: '#93c5fd', borderRadius: 4 }
                                }} />
                        </Box>
                    </Card>

                    {/* ── Col 2: Running Jobs doughnut ── */}
                    <Card sx={{ flex: { xs: '1 1 auto', md: '0 0 calc(28% - 8px)' }, display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', mb: 1 }}>
                            Running Jobs Status
                        </Typography>
                        <Box sx={{ flex: 1, position: 'relative' }}>
                            <DashboardChart
                                title=""
                                type="doughnut"
                                data={runningJobs.chartData}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'chartArea',
                                            align: 'center',
                                            labels: { boxWidth: 10, font: { size: 11 }, padding: 8 }
                                        },
                                        tooltip: { enabled: true }
                                    },
                                    cutout: '60%',
                                    layout: { padding: 0 }
                                }}
                            />
                            {/* Center label overlay */}
                            {runningJobs.total != null && (
                                <Box sx={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -58%)',
                                    textAlign: 'center', pointerEvents: 'none'
                                }}>
                                    <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                        {fmtK(runningJobs.total)}
                                    </Typography>
                                    <Typography sx={{ fontSize: '0.65rem', color: '#64748b' }}>Total Jobs</Typography>
                                </Box>
                            )}
                        </Box>
                    </Card>

                    {/* ── Col 3: Right stats stacked ── */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

                        {/* Supplier OTIF + Buffer Used — two gauges */}
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                                <SemiGauge value={otif.supplierOtif} size={100} color="#3b82f6" fontSize={0.22} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.3, textAlign: 'center' }}>
                                    Supplier OTIF
                                </Typography>
                            </Card>
                            <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', py: 1 }}>
                                <SemiGauge value={otif.bufferUsed} size={100} color="#3b82f6" fontSize={0.22} />
                                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.3, textAlign: 'center' }}>
                                    Buffer Used
                                </Typography>
                            </Card>
                        </Box>

                        {/* Total Jobs */}
                        <Card sx={{ py: 1.5 }}>
                            <Typography sx={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                {fmtK(otif.totalJobs)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.74rem', color: '#64748b', mt: 0.3 }}>Total Jobs</Typography>
                        </Card>

                        {/* Delivered + Outstanding side by side */}
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Card sx={{ flex: 1, py: 1.5 }}>
                                <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                    {fmtK(otif.delivered)}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.3 }}>Delivered</Typography>
                            </Card>
                            <Card sx={{ flex: 1, py: 1.5 }}>
                                <Typography sx={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                    {fmtK(otif.outstanding)}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.3 }}>Outstanding</Typography>
                            </Card>
                        </Box>

                        {/* Dispatch Variance */}
                        <Card sx={{ py: 1.5 }}>
                            <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                                {otif.dispatchVariance != null ? `${otif.dispatchVariance}%` : '—'}
                            </Typography>
                            <Typography sx={{ fontSize: '0.74rem', color: '#64748b', mt: 0.3 }}>Dispatch Variance</Typography>
                        </Card>

                        {/* QC Issues */}
                        <Card sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Shield size={15} color="#ef4444" />
                            <Typography sx={{ fontSize: '0.82rem', color: '#475569', fontWeight: 500 }}>
                                QC Issues:&nbsp;
                                <Box component="span" sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                                    {otif.qcIssues ?? '—'}
                                </Box>
                            </Typography>
                        </Card>
                    </Box>
                </Box>

                {/* ══════════════════════════════════════════════════════
                    ROW 2  (2 columns)
                    [OTIF by Stage — narrow] | [OTIF Trend — wide]
                ══════════════════════════════════════════════════════ */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'stretch' }}>

                    {/* Stage performance */}
                    <Card sx={{ flex: { xs: '1 1 auto', md: '0 0 calc(22% - 8px)' } }}>
                        <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', mb: 2 }}>
                            OTIF Performance by Stage
                        </Typography>
                        {stagePerf.map((s, i) => (
                            <ProgressRow key={i} label={s.label} value={s.value} />
                        ))}
                    </Card>

                    {/* Trend chart */}
                    <Card sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                                OTIF Trend Analysis
                            </Typography>
                            <PillTabs options={['Trend', 'Category', 'Region']} active={trendTab} onChange={setTrendTab} />
                        </Box>
                        <DashboardChart
                            title=""
                            type="bar"
                            data={trendChart}
                            options={{
                                scales: {
                                    y: {
                                        min: 40, max: 100,
                                        ticks: { callback: v => `${v}%`, font: { size: 11 } },
                                        grid: { color: '#f1f5f9' }
                                    },
                                    x: { grid: { display: false }, ticks: { font: { size: 11 } } }
                                },
                                plugins: {
                                    legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 }, usePointStyle: true } }
                                },
                                barPercentage: 0.55
                            }}
                        />
                    </Card>
                </Box>

            </Box>
        </Box>
    );
};

export default FinalOTIF;