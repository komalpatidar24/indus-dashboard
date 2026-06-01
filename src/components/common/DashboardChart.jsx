import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
    Filler,
    PolarAreaController,
    RadialLinearScale
} from 'chart.js';
import { Bar, Line, Doughnut, PolarArea, Pie } from 'react-chartjs-2';
import { T, R, FONT, SHADOW, CHART_H } from './dashboardTokens';

ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    ArcElement,
    Filler,
    PolarAreaController,
    RadialLinearScale
);

const DashboardChart = ({
    title,
    type = 'bar',
    data,
    options = {},
    height = CHART_H.md,
    actions
}) => {
    const defaultOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: type === 'doughnut' ? 'right' : 'top',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: { family: 'Inter', size: 11, weight: 600 },
                    color: T.textMuted,
                }
            },
            tooltip: {
                backgroundColor: T.text,
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                displayColors: true,
                cornerRadius: 8,
            }
        },
        scales: type !== 'doughnut' ? {
            y: {
                beginAtZero: true,
                grid: { color: T.borderLight, drawBorder: false },
                ticks: { font: { size: 11 }, color: T.textFaint }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 11 }, color: T.textFaint }
            }
        } : undefined
    };

    const combinedOptions = { ...defaultOptions, ...options };

    const renderChart = () => {
        if (data?.datasets?.some(ds => ds.type === 'line')) {
            return <Bar data={data} options={combinedOptions} />;
        }
        switch (type) {
            case 'line':     return <Line data={data} options={combinedOptions} />;
            case 'doughnut': return <Doughnut data={data} options={combinedOptions} />;
            case 'polarArea':return <PolarArea data={data} options={combinedOptions} />;
            case 'pie':      return <Pie data={data} options={combinedOptions} />;
            case 'bar':
            default:         return <Bar data={data} options={combinedOptions} />;
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                p: R.cardPadMd,
                borderRadius: R.radiusCard,
                border: `1px solid ${T.borderLight}`,
                height: '100%',
                backgroundColor: T.surface,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)',
                    borderColor: T.border,
                }
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1.5, md: 3 } }}>
                <Typography
                    variant="h6"
                    sx={{
                        fontWeight: 800,
                        fontSize: FONT.cardTitle,
                        color: T.text,
                        letterSpacing: '-0.01em',
                        fontFamily: T.font,
                    }}
                >
                    {title}
                </Typography>
                {actions && <Box>{actions}</Box>}
            </Box>
            <Box sx={{ height: height, position: 'relative' }}>
                {renderChart()}
            </Box>
        </Paper>
    );
};

export default DashboardChart;
