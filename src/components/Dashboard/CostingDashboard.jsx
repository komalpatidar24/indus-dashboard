import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper,
    CircularProgress
} from '@mui/material';
import {
    ShoppingCart, Activity, Wallet, Banknote
} from 'lucide-react';
import DashboardHeader from '../common/DashboardHeader';
import DashboardChart from '../common/DashboardChart';
import CommonDateFilter from '../common/CommonDateFilter';
import { T, R, GRID, CHART_H, FONT, SHADOW, CARD_STYLE } from '../common/dashboardTokens';
import dayjs from 'dayjs';
import { postRequest } from '../api/api';

const _now    = dayjs();
const _cYear  = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO   = `${_cYear + 1}-03-31`;

/* ─── Glass Card wrapper ─────────────────────────────────── */
const Card = ({ children, sx = {} }) => (
    <Paper elevation={0} sx={{ ...CARD_STYLE, p: R.cardPadMd, height: '100%', boxSizing: 'border-box', ...sx }}>
        {children}
    </Paper>
);

/* ─── Pill Tab ───────────────────────────────────────────── */
const PillTabs = ({ options, active, onChange }) => (
    <Box sx={{
        display: 'flex', flexWrap: 'wrap',
        gap: 0.5, bgcolor: '#f1f5f9',
        p: 0.4, borderRadius: '12px',
        border: `1px solid ${T.border}`,
    }}>
        {options.map((opt) => (
            <Box key={opt} onClick={() => onChange(opt)} sx={{
                px: 2, py: 0.6, borderRadius: '8px', fontSize: FONT.btnSm, fontWeight: 800,
                cursor: 'pointer', userSelect: 'none', transition: 'all 0.3s ease',
                bgcolor: active === opt ? T.surface : 'transparent',
                color: active === opt ? T.text : T.textMuted,
                boxShadow: active === opt ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                textTransform: 'uppercase', letterSpacing: '0.02em',
                '&:hover': { color: T.text },
            }}>{opt}</Box>
        ))}
    </Box>
);

/* ─── Single metric tile ─────────────────────────────────── */
const MetricTile = ({ icon, value, label }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 0.5, md: 1 } }}>
        <Box sx={{ color: T.textFaint, mb: 1.5, transition: 'transform 0.3s ease', '&:hover': { transform: 'scale(1.2)' } }}>
            {icon}
        </Box>
        <Typography sx={{ fontSize: FONT.kpiValue, fontWeight: 900, color: T.text, lineHeight: 1, letterSpacing: '-0.02em', textAlign: 'center' }}>
            {value ?? '—'}
        </Typography>
        <Typography sx={{ fontSize: FONT.kpiLabel, fontWeight: 800, color: T.textFaint, textTransform: 'uppercase', textAlign: 'center', mt: 1, letterSpacing: '0.1em' }}>
            {label}
        </Typography>
    </Box>
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
const CostingDashboard = () => {
    const [loading, setLoading]           = useState(false);
    const [lastUpdated, setLastUpdated]   = useState(new Date().toLocaleTimeString());
    const [period, setPeriod]             = useState('Year');
    const [fromDate, setFromDate]         = useState(FY_FROM);
    const [toDate, setToDate]             = useState(FY_TO);
    const [companyId]                     = useState('2');

    const [kpiData, setKpiData] = useState({
        totalAmount: null, orderQuantity: null,
        convertedQuoteAmount: null, quoteConversionRatio: null,
    });

    const [charts, setCharts] = useState({
        amountByCategory:   { labels: [], datasets: [] },
        amountByClient:     { labels: [], datasets: [] },
        quoteVolumeByType:  { labels: [], datasets: [] },
        monthlyTrends:      { labels: [], datasets: [] },
        quotationStatus:    { labels: [], datasets: [] },
        topSalesRep:        { labels: [], datasets: [] },
        successRate:        { labels: [], datasets: [] },
        costingAccuracy:    { labels: [], datasets: [] },
        pendingVsConverted: { labels: [], datasets: [] },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const payload = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate, period };

            const [totalAmt, orderQty, convAmt, convRatio] = await Promise.all([
                postRequest('GetTotalAmount', payload),
                postRequest('GetOrderQuantity', payload),
                postRequest('GetConvertedQuoteAmount', payload),
                postRequest('GetQuoteConversionRatio', payload),
            ]);

            setKpiData({
                totalAmount:          totalAmt?.data?.[0]?.Value ?? '—',
                orderQuantity:        orderQty?.data?.[0]?.Value ?? '—',
                convertedQuoteAmount: convAmt?.data?.[0]?.Value  ?? '—',
                quoteConversionRatio: convRatio?.data?.[0]?.Value ?? '—',
            });

            const [byCategory, byClient, volumeType, trends, status, topRep, success, accuracy, pendingConv] = await Promise.all([
                postRequest('GetTotalAmountByCategoryName',        payload),
                postRequest('GetTotalAmountByClientName',          payload),
                postRequest('GetQuoteVolumeByType',                payload),
                postRequest('GetMonthlyTrendsOfQuotationValue',    payload),
                postRequest('GetQuotationStatus',                  payload),
                postRequest('GetTopSalesRepresentatives',          payload),
                postRequest('GetQuotationSuccessRate',             payload),
                postRequest('GetCostingAccuracy',                  payload),
                postRequest('GetPendingVsConverted',               payload),
            ]);

            setCharts({
                amountByCategory:   byCategory?.data   ?? { labels: [], datasets: [] },
                amountByClient:     byClient?.data     ?? { labels: [], datasets: [] },
                quoteVolumeByType:  volumeType?.data   ?? { labels: [], datasets: [] },
                monthlyTrends:      trends?.data       ?? { labels: [], datasets: [] },
                quotationStatus:    status?.data       ?? { labels: [], datasets: [] },
                topSalesRep:        topRep?.data       ?? { labels: [], datasets: [] },
                successRate:        success?.data      ?? { labels: [], datasets: [] },
                costingAccuracy:    accuracy?.data     ?? { labels: [], datasets: [] },
                pendingVsConverted: pendingConv?.data  ?? { labels: [], datasets: [] },
            });

        } catch (e) {
            console.error('fetchData error', e);
        } finally {
            setLastUpdated(new Date().toLocaleTimeString());
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, [period, fromDate, toDate]);

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', fontFamily: T.font }}>
            <DashboardHeader title="Costing Dashboard" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter
                    period={period} setPeriod={setPeriod}
                    fromDate={fromDate} setFromDate={setFromDate}
                    toDate={toDate} setToDate={setToDate}
                />
            </DashboardHeader>

            <Box sx={{ p: R.pagePad }}>

                {/* ══ KPI ROW ══ */}
                <Box sx={{ mb: R.sectionMb }}>
                    <Card>
                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: GRID.kpi4,
                            gap: R.gap,
                        }}>
                            <MetricTile icon={<Banknote size={32} color="#0c98ba" />}   value={kpiData.totalAmount}          label="Total Amount" />
                            <MetricTile icon={<ShoppingCart size={32} color="#0dad8d" />} value={kpiData.orderQuantity}      label="Order Quantity" />
                            <MetricTile icon={<Wallet size={32} color="#f59e0b" />}       value={kpiData.convertedQuoteAmount} label="Converted Quote Amount" />
                            <MetricTile icon={<Activity size={32} color="#6366f1" />}     value={kpiData.quoteConversionRatio} label="Quote Conversion Ratio" />
                        </Box>
                    </Card>
                </Box>

                {/* ══ CHART ROW 1 ══ */}
                <Box sx={{ display: 'grid', gridTemplateColumns: GRID.charts3, gap: R.gapChart, mb: R.sectionMb }}>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Total Amount by Category Name</Typography>
                        <DashboardChart title="" type="bar" height={CHART_H.sm} data={charts.amountByCategory}
                            options={{ scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => `${v}` } } }, plugins: { legend: { display: false } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Total Amount by Client Name</Typography>
                        <DashboardChart title="" type="bar" height={CHART_H.sm} data={charts.amountByClient}
                            options={{ scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => `${v}k` }, type: 'logarithmic' } }, plugins: { legend: { display: false } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Quote Volume by Type</Typography>
                        <DashboardChart title="" type="bar" height={CHART_H.sm} data={charts.quoteVolumeByType}
                            options={{ scales: { x: { grid: { display: false } } }, plugins: { legend: { display: false } } }} />
                    </Card>
                </Box>

                {/* ══ CHART ROW 2 ══ */}
                <Box sx={{ display: 'grid', gridTemplateColumns: GRID.charts3, gap: R.gapChart, mb: R.sectionMb }}>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Monthly Trends of Quotation Value</Typography>
                        <DashboardChart title="" type="line" height={CHART_H.sm} data={charts.monthlyTrends}
                            options={{ scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => `${v} Cr` } } }, plugins: { legend: { position: 'bottom' } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Quotation Status</Typography>
                        <DashboardChart title="" type="doughnut" height={CHART_H.sm} data={charts.quotationStatus}
                            options={{ plugins: { legend: { position: 'bottom' } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Top Sales Representatives</Typography>
                        <DashboardChart title="" type="line" height={CHART_H.sm} data={charts.topSalesRep}
                            options={{ scales: { x: { grid: { display: false } }, y: { ticks: { callback: v => `${v}` } } }, plugins: { legend: { display: false } } }} />
                    </Card>
                </Box>

                {/* ══ CHART ROW 3 ══ */}
                <Box sx={{ display: 'grid', gridTemplateColumns: GRID.charts3, gap: R.gapChart }}>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Quotation Success Rate</Typography>
                        <DashboardChart title="" type="bar" height={CHART_H.sm} data={charts.successRate}
                            options={{ scales: { x: { grid: { display: false } }, y: { max: 100 } }, plugins: { legend: { display: false } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Costing Accuracy</Typography>
                        <DashboardChart title="" type="line" height={CHART_H.sm} data={charts.costingAccuracy}
                            options={{ scales: { x: { grid: { display: false } }, y: { min: 80, max: 100 } }, plugins: { legend: { display: false } } }} />
                    </Card>
                    <Card>
                        <Typography sx={{ fontSize: FONT.cardTitle, fontWeight: 700, color: '#1e293b', mb: 1 }}>Pending vs Converted</Typography>
                        <DashboardChart title="" type="doughnut" height={CHART_H.sm} data={charts.pendingVsConverted}
                            options={{ plugins: { legend: { position: 'bottom' } } }} />
                    </Card>
                </Box>

            </Box>
        </Box>
    );
};

export default CostingDashboard;
