import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { T, R, FONT, CHART_H } from './dashboardTokens';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler);

const DashboardCard = ({
    title,
    value,
    previousValue,
    growth,
    color = '#3b82f6',
    format = (val) => val,
    suffix = '',
    secondaryMetrics = [],
    trendData = [0, 0, 0, 0, 0, 0, 0]
}) => {
    const isPositive = growth >= 0;

    const sparklineData = {
        labels: trendData.map((_, i) => i),
        datasets: [{
            data: trendData,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, CHART_H.sparkline);
                gradient.addColorStop(0, `${color}40`);
                gradient.addColorStop(1, `${color}00`);
                return gradient;
            },
            tension: 0.4,
        }]
    };

    const sparklineOptions = {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        maintainAspectRatio: false,
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: R.radiusCard,
                border: `1px solid ${T.borderLight}`,
                height: '100%',
                backgroundColor: T.surface,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                    borderColor: `${color}30`,
                    '& .sparkline-container': { transform: 'scale(1.05)', opacity: 1 }
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 800,
                        color: T.textFaint,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontSize: FONT.kpiLabel,
                    }}
                >
                    {title}
                </Typography>
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 1, py: 0.4, borderRadius: '20px',
                    bgcolor: isPositive ? '#f0fdf4' : '#fef2f2',
                    color: isPositive ? '#166534' : '#991b1b',
                    fontWeight: 800,
                    fontSize: FONT.badge,
                    border: `1px solid ${isPositive ? '#dcfce7' : '#fee2e2'}`,
                }}>
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? '+' : ''}{growth}%
                </Box>
            </Box>

            <Box sx={{ mb: 1, display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                <Typography
                    variant="h4"
                    sx={{ fontWeight: 900, color: T.text, letterSpacing: '-0.02em', fontSize: FONT.kpiValue }}
                >
                    {format(value)}{suffix}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={{ color: T.textFaint, fontWeight: 600, fontSize: '0.62rem', lineHeight: 1 }}>
                        PREVIOUS
                    </Typography>
                    <Typography variant="caption" sx={{ color: T.textMuted, fontWeight: 700, fontSize: '0.75rem' }}>
                        {format(previousValue)}{suffix}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {secondaryMetrics.map((metric, idx) => (
                    <Box key={idx} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.3, borderRadius: '6px',
                        border: `1px solid ${T.borderLight}`,
                    }}>
                        {metric.icon && <metric.icon size={12} style={{ color: T.textMuted }} />}
                        <Typography sx={{ fontSize: FONT.kpiLabel, color: '#475569', fontWeight: 700 }}>
                            {metric.label}: <span style={{ color: T.text }}>{metric.value}</span>
                        </Typography>
                    </Box>
                ))}
            </Box>

            <Box
                className="sparkline-container"
                sx={{
                    height: CHART_H.sparkline,
                    mt: 'auto',
                    mx: { xs: -2, md: -2.5 },
                    mb: { xs: -2, md: -2.5 },
                    opacity: 0.8,
                    transition: 'all 0.6s ease',
                    position: 'relative',
                }}
            >
                <Line data={sparklineData} options={sparklineOptions} />
            </Box>
        </Paper>
    );
};

export default DashboardCard;
