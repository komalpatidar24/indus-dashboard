import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, CircularProgress, keyframes,
} from '@mui/material';
import {
    Banknote, ShoppingCart, Wallet, Activity,
    BarChart2, PieChart as PieIcon, TrendingUp, Users, Target, CheckCircle
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart
} from 'recharts';
import DashboardHeader from '../common/DashboardHeader';
import CommonDateFilter from '../common/CommonDateFilter';
import { T, R, FONT } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

const _now   = dayjs();
const _cYear = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO   = `${_cYear + 1}-03-31`;

/* ── animations ── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(28px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;
const shimmerKf = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;
const dotPulse = keyframes`
  0%,100% { transform: scale(1);   opacity: 0.45; }
  50%      { transform: scale(1.7); opacity: 1; }
`;

/* ── formatters ── */
const fmtAmt = (v) => {
    if (v == null || v === '—') return '—';
    const n = Number(v);
    if (isNaN(n)) return v;
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(2)} K`;
    return `₹${n.toLocaleString('en-IN')}`;
};
const fmtNum = (v) => (v == null || v === '—') ? '—' : Number(v).toLocaleString('en-IN');

/* ── Shimmer skeleton ── */
const Shimmer = ({ width = '100%', height = 24, radius = '8px' }) => (
    <Box sx={{
        width, height, borderRadius: radius,
        background: 'linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: `${shimmerKf} 1.6s infinite`,
    }} />
);

/* ── Chart overlay spinner ── */
const ChartOverlay = ({ loading }) => loading ? (
    <Box sx={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,0.75)', borderRadius: '20px',
        zIndex: 4, backdropFilter: 'blur(8px)',
    }}>
        <CircularProgress size={28} thickness={4} sx={{ color: T.primary }} />
    </Box>
) : null;

/* ── KPI Stat Card ── */
const StatCard = ({ label, icon: Icon, color, bg, accent, value, loading, animDelay, isAmount }) => {
    const [hovered, setHovered] = useState(false);
    const display = useMemo(() => {
        if (loading) return null;
        if (value == null || value === '—') return '—';
        return isAmount ? fmtAmt(value) : fmtNum(value);
    }, [value, loading, isAmount]);

    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
                borderRadius: { xs: '14px', sm: '20px' },
                overflow: 'hidden',
                p: { xs: '12px 12px 10px 14px', sm: '20px 20px 17px 20px' },
                display: 'flex', flexDirection: 'column',
                position: 'relative', cursor: 'default',
                background: hovered
                    ? `linear-gradient(150deg,#ffffff 0%,${accent}09 100%)`
                    : `linear-gradient(150deg,#ffffff 0%,#f5f7fb 100%)`,
                border: `1.5px solid ${hovered ? accent + '50' : T.border}`,
                boxShadow: hovered
                    ? `0 22px 48px -8px ${accent}30, 0 6px 20px rgba(15,23,42,0.10)`
                    : `0 2px 8px rgba(15,23,42,0.05)`,
                transform: hovered ? 'translateY(-6px) scale(1.01)' : 'none',
                transition: 'all 0.32s cubic-bezier(0.34,1.56,0.64,1)',
                animation: `${fadeUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
            }}
        >
            <Box sx={{
                position: 'absolute', top: 0, left: 0, bottom: 0, width: hovered ? '4px' : '3px',
                background: `linear-gradient(180deg,${accent} 0%,${accent}60 100%)`,
                borderRadius: '20px 0 0 20px', transition: 'width 0.25s ease',
            }} />
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.2 }}>
                <Box sx={{
                    width: { xs: 36, sm: 44 }, height: { xs: 36, sm: 44 },
                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: bg, border: `1.5px solid ${accent}28`,
                    boxShadow: hovered ? `0 6px 18px ${accent}35` : `0 2px 8px ${accent}18`,
                    transform: hovered ? 'scale(1.1) rotate(-5deg)' : 'none',
                    transition: 'all 0.32s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <Icon size={17} color={color} strokeWidth={2.1} />
                </Box>
                <Box sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: accent,
                    animation: loading ? 'none' : `${dotPulse} 2.8s ease-in-out infinite`,
                    boxShadow: `0 0 0 3px ${accent}20`,
                }} />
            </Box>
            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    <Shimmer height={26} />
                    <Shimmer width="50%" height={10} />
                </Box>
            ) : (
                <>
                    <Typography sx={{
                        fontSize: { xs: '1.1rem', sm: '1.5rem' }, fontWeight: 800,
                        color: hovered ? accent : T.text,
                        letterSpacing: '-0.5px', fontFamily: "'DM Mono',monospace",
                        lineHeight: 1, mb: 0.6, transition: 'color 0.25s ease',
                    }}>
                        {display}
                    </Typography>
                    <Box sx={{ width: '100%', height: '1px', background: `linear-gradient(90deg,${accent}20 0%,transparent 70%)`, mb: 0.7 }} />
                    <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {label}
                    </Typography>
                </>
            )}
        </Box>
    );
};

/* ── Chart Card ── */
const ChartCard = ({ title, Icon, accentA, accentB, loading, animDelay = 0, children }) => (
    <Box sx={{
        background: 'linear-gradient(160deg,#ffffff 0%,#f7f9ff 100%)',
        borderRadius: '20px',
        border: `1.5px solid ${T.border}`,
        p: { xs: '14px 12px 12px', sm: '22px 20px 20px' },
        boxShadow: '0 4px 20px rgba(15,23,42,0.07)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: `${fadeUp} 0.6s cubic-bezier(0.34,1.2,0.64,1) ${animDelay}s both`,
        transition: 'all 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        '&::before': {
            content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
            background: `linear-gradient(90deg,${accentA},${accentB},${accentA})`,
            backgroundSize: '200% 100%',
            animation: `${shimmerKf} 4s linear infinite`, opacity: 0.6,
        },
        '&:hover': {
            transform: 'translateY(-6px)',
            boxShadow: `0 24px 52px -8px ${accentA}25, 0 8px 24px rgba(15,23,42,0.10)`,
            borderColor: `${accentA}38`,
            '&::before': { opacity: 1, height: '4px' },
        },
    }}>
        <ChartOverlay loading={loading} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <Box sx={{
                width: 34, height: 34, borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: `${accentA}12`, color: accentA, border: `1.5px solid ${accentA}28`,
                flexShrink: 0,
            }}>
                <Icon size={15} />
            </Box>
            <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem' }, fontWeight: 800, color: T.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {title}
            </Typography>
        </Box>
        <Box sx={{ flex: 1, minHeight: 220 }}>{children}</Box>
    </Box>
);

const CHART_COLORS = [T.primary, T.teal, T.amber, T.red, T.purple, T.sky, T.green, T.indigo];

const tooltipStyle = {
    contentStyle: { borderRadius: '12px', border: 'none', boxShadow: T.shadowMd, fontSize: '0.72rem' },
};

/* ── helpers to parse chart.js-style data into recharts arrays ── */
const toBarData = (data) => {
    if (!data?.labels?.length) return [];
    const ds = data.datasets?.[0];
    return data.labels.map((label, i) => ({ label, value: ds?.data?.[i] ?? 0 }));
};

const toLineData = (data) => {
    if (!data?.labels?.length) return [];
    return data.labels.map((label, i) => {
        const row = { label };
        data.datasets?.forEach(ds => { row[ds.label || 'value'] = ds.data?.[i] ?? 0; });
        return row;
    });
};

const toPieData = (data) => {
    if (!data?.labels?.length) return [];
    const ds = data.datasets?.[0];
    return data.labels.map((label, i) => ({ name: label, value: ds?.data?.[i] ?? 0 }));
};

/* ══════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════ */
const CostingDashboard = () => {
    const [loading, setLoading]   = useState(false);
    const [period, setPeriod]     = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate]     = useState(FY_TO);
    const [lastUpdated, setLastUpdated] = useState(dayjs().format('HH:mm:ss'));

    const [kpi, setKpi] = useState({ totalAmount: null, orderQuantity: null, convertedQuoteAmount: null, quoteConversionRatio: null });
    const [charts, setCharts] = useState({
        amountByCategory: {}, amountByClient: {}, quoteVolumeByType: {},
        monthlyTrends: {}, quotationStatus: {}, topSalesRep: {},
        successRate: {}, costingAccuracy: {}, pendingVsConverted: {},
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const payload = { CompanyID: '2', FromDate: fromDate, ToDate: toDate, period };
            const [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12, r13] = await Promise.all([
                postRequest('GetTotalAmount', payload),
                postRequest('GetOrderQuantity', payload),
                postRequest('GetConvertedQuoteAmount', payload),
                postRequest('GetQuoteConversionRatio', payload),
                postRequest('GetTotalAmountByCategoryName', payload),
                postRequest('GetTotalAmountByClientName', payload),
                postRequest('GetQuoteVolumeByType', payload),
                postRequest('GetMonthlyTrendsOfQuotationValue', payload),
                postRequest('GetQuotationStatus', payload),
                postRequest('GetTopSalesRepresentatives', payload),
                postRequest('GetQuotationSuccessRate', payload),
                postRequest('GetCostingAccuracy', payload),
                postRequest('GetPendingVsConverted', payload),
            ]);
            setKpi({
                totalAmount:          r1?.data?.[0]?.Value ?? null,
                orderQuantity:        r2?.data?.[0]?.Value ?? null,
                convertedQuoteAmount: r3?.data?.[0]?.Value ?? null,
                quoteConversionRatio: r4?.data?.[0]?.Value ?? null,
            });
            setCharts({
                amountByCategory:   r5?.data  ?? {},
                amountByClient:     r6?.data  ?? {},
                quoteVolumeByType:  r7?.data  ?? {},
                monthlyTrends:      r8?.data  ?? {},
                quotationStatus:    r9?.data  ?? {},
                topSalesRep:        r10?.data ?? {},
                successRate:        r11?.data ?? {},
                costingAccuracy:    r12?.data ?? {},
                pendingVsConverted: r13?.data ?? {},
            });
            setLastUpdated(dayjs().format('HH:mm:ss'));
        } catch (e) {
            console.error('CostingDashboard fetchData:', e);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate, period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const KPI_CONFIGS = [
        { label: 'Total Amount',           icon: Banknote,      color: T.sky,    bg: T.skyLight,    accent: T.sky,    isAmount: true,  value: kpi.totalAmount },
        { label: 'Order Quantity',         icon: ShoppingCart,  color: T.teal,   bg: T.tealLight,   accent: T.teal,   isAmount: false, value: kpi.orderQuantity },
        { label: 'Converted Quote Amount', icon: Wallet,        color: T.amber,  bg: T.amberLight,  accent: T.amber,  isAmount: true,  value: kpi.convertedQuoteAmount },
        { label: 'Quote Conversion Ratio', icon: Activity,      color: T.purple, bg: T.purpleLight, accent: T.purple, isAmount: false, value: kpi.quoteConversionRatio },
    ];

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', fontFamily: T.font,
            backgroundImage: [
                'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(30,58,95,0.07) 0%,transparent 70%)',
                'radial-gradient(circle,#cbd5e133 1px,transparent 1px)',
            ].join(','),
            backgroundSize: '100% 100%, 28px 28px',
        }}>
            <DashboardHeader title="Costing Dashboard" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate}
                />
            </DashboardHeader>

            <Box sx={{ p: R.pagePad }}>

                {/* ── KPI cards ── */}
                <Box sx={{
                    display: 'grid', gap: { xs: 1.5, md: 2.5 }, mb: { xs: 3, md: 4 },
                    gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' },
                }}>
                    {KPI_CONFIGS.map((cfg, i) => (
                        <StatCard key={i} {...cfg} loading={loading} animDelay={0.1 + i * 0.07} />
                    ))}
                </Box>

                {/* ── Row 1: Amount by Category | Amount by Client | Quote Volume ── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 }, mb: { xs: 2, md: 2.5 } }}>
                    <ChartCard title="Amount by Category" Icon={BarChart2} accentA={T.sky} accentB={T.primary} loading={loading} animDelay={0.4}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={toBarData(charts.amountByCategory)} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint, fontWeight: 700 }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="value" fill={T.sky} radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Amount by Client" Icon={Users} accentA={T.teal} accentB={T.green} loading={loading} animDelay={0.45}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={toBarData(charts.amountByClient)} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint, fontWeight: 700 }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="value" fill={T.teal} radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Quote Volume by Type" Icon={PieIcon} accentA={T.amber} accentB={T.red} loading={loading} animDelay={0.5}>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={toPieData(charts.quoteVolumeByType)} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                                    paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none">
                                    {toPieData(charts.quoteVolumeByType).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.65rem', fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Box>

                {/* ── Row 2: Monthly Trends | Quotation Status | Top Sales Reps ── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 }, mb: { xs: 2, md: 2.5 } }}>
                    <ChartCard title="Monthly Quotation Trends" Icon={TrendingUp} accentA={T.primary} accentB={T.sky} loading={loading} animDelay={0.55}>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={toLineData(charts.monthlyTrends)} margin={{ left: -10 }}>
                                <defs>
                                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={T.primary} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey={Object.keys(toLineData(charts.monthlyTrends)?.[0] ?? {}).find(k => k !== 'label') || 'value'}
                                    stroke={T.primary} strokeWidth={2.5} fill="url(#costGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Quotation Status" Icon={PieIcon} accentA={T.green} accentB={T.teal} loading={loading} animDelay={0.6}>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={toPieData(charts.quotationStatus)} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                                    paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none">
                                    {toPieData(charts.quotationStatus).map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.65rem', fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Top Sales Representatives" Icon={Users} accentA={T.purple} accentB={T.indigo} loading={loading} animDelay={0.65}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={toBarData(charts.topSalesRep)} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderLight} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={90}
                                    tick={{ fontSize: 9, fill: T.text, fontWeight: 700 }} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="value" fill={T.purple} radius={[0, 4, 4, 0]} barSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Box>

                {/* ── Row 3: Success Rate | Costing Accuracy | Pending vs Converted ── */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3,1fr)' }, gap: { xs: 2, md: 2.5 } }}>
                    <ChartCard title="Quotation Success Rate" Icon={Target} accentA={T.green} accentB={T.teal} loading={loading} animDelay={0.7}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={toBarData(charts.successRate)} margin={{ left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} domain={[0, 100]} />
                                <Tooltip {...tooltipStyle} />
                                <Bar dataKey="value" fill={T.green} radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Costing Accuracy" Icon={CheckCircle} accentA={T.teal} accentB={T.sky} loading={loading} animDelay={0.75}>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={toLineData(charts.costingAccuracy)} margin={{ left: -10 }}>
                                <defs>
                                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={T.teal} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={T.teal} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} dy={6} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: T.textFaint }} domain={[80, 100]} />
                                <Tooltip {...tooltipStyle} />
                                <Area type="monotone" dataKey={Object.keys(toLineData(charts.costingAccuracy)?.[0] ?? {}).find(k => k !== 'label') || 'value'}
                                    stroke={T.teal} strokeWidth={2.5} fill="url(#accGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Pending vs Converted" Icon={PieIcon} accentA={T.amber} accentB={T.red} loading={loading} animDelay={0.8}>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={toPieData(charts.pendingVsConverted)} cx="50%" cy="45%" innerRadius={55} outerRadius={85}
                                    paddingAngle={4} cornerRadius={6} dataKey="value" stroke="none">
                                    {toPieData(charts.pendingVsConverted).map((_, i) => (
                                        <Cell key={i} fill={[T.amber, T.green, T.red, T.sky][i % 4]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tooltipStyle} />
                                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.65rem', fontWeight: 700 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Box>

            </Box>
        </Box>
    );
};

export default CostingDashboard;
