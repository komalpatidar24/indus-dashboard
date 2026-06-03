import React from 'react';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { R, T } from './dashboardTokens';

const DashboardHeader = ({ title, onRefresh, loading, children, controls }) => {
    const refresh = () => { location.reload(); };
    return (
        <Box
            sx={{
                bgcolor: T.surface,
                borderBottom: `1px solid ${T.borderLight}`,
                boxShadow: '0 1px 12px rgba(15,23,42,0.04)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* ── Row 1: Title + Refresh (refresh hidden on md+) ── */}
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: { xs: 2, md: 4 },
                pt: { xs: 1.2, md: 1.75 },
                pb: { xs: 1, md: 1.5 },
            }}>
                <Typography
                    variant="h5"
                    sx={{
                        fontWeight: 900,
                        color: T.text,
                        fontSize: { xs: '1.05rem', md: '1.5rem' },
                        letterSpacing: '-0.02em',
                        fontFamily: T.font,
                        lineHeight: 1.2,
                    }}
                >
                    {title}
                </Typography>

                {/* Mobile-only refresh */}
                {onRefresh && (
                    <IconButton
                        onClick={refresh}
                        disabled={loading}
                        size="small"
                        sx={{
                            display: { xs: 'flex', md: 'none' },
                            color: T.textMuted,
                            bgcolor: '#f8fafc',
                            border: `1px solid ${T.border}`,
                            borderRadius: R.radiusInput,
                            p: 0.6,
                            flexShrink: 0,
                            transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                            '&:hover': {
                                bgcolor: T.surface, color: T.text,
                                transform: 'rotate(45deg) scale(1.08)',
                                borderColor: '#cbd5e1',
                                boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                            },
                        }}
                    >
                        {loading
                            ? <CircularProgress size={15} sx={{ color: T.text }} />
                            : <RefreshCw size={15} />}
                    </IconButton>
                )}
            </Box>

            {/* ── Row 2: Filters + Refresh (desktop) — hidden when no children ── */}
            {(children || (!controls && onRefresh)) && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1,
                        px: { xs: 1.5, md: 4 },
                        py: { xs: 0.8, md: 1.2 },
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    }}
                >
                    {children}

                    {/* Desktop-only refresh — sits at the end of the filters row */}
                    {!controls && onRefresh && (
                        <IconButton
                            onClick={refresh}
                            disabled={loading}
                            size="small"
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                color: T.textMuted,
                                bgcolor: '#f8fafc',
                                border: `1px solid ${T.border}`,
                                borderRadius: R.radiusInput,
                                p: 0.9,
                                flexShrink: 0,
                                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                                '&:hover': {
                                    bgcolor: T.surface, color: T.text,
                                    transform: 'rotate(45deg) scale(1.08)',
                                    borderColor: '#cbd5e1',
                                    boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                                },
                            }}
                        >
                            {loading
                                ? <CircularProgress size={15} sx={{ color: T.text }} />
                                : <RefreshCw size={15} />}
                        </IconButton>
                    )}
                </Box>
            )}

            {/* ── Row 3: Extra controls ── */}
            {controls && (
                <Box sx={{
                    display: 'flex',
                    alignItems: { md: 'center' },
                    justifyContent: { md: 'flex-end' },
                    px: { xs: 1.5, md: 4 },
                    pb: { xs: 0.8, md: 1.2 },
                    pt: { xs: 0.6, md: 1.2 },
                    borderTop: `1px solid ${T.borderLight}`,
                }}>
                    {controls}
                    {/* Refresh at end of controls row on desktop */}
                    {onRefresh && (
                        <IconButton
                            onClick={refresh}
                            disabled={loading}
                            size="small"
                            sx={{
                                display: { xs: 'none', md: 'flex' },
                                color: T.textMuted,
                                bgcolor: '#f8fafc',
                                border: `1px solid ${T.border}`,
                                borderRadius: R.radiusInput,
                                p: 0.9,
                                flexShrink: 0,
                                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                                '&:hover': {
                                    bgcolor: T.surface, color: T.text,
                                    transform: 'rotate(45deg) scale(1.08)',
                                    borderColor: '#cbd5e1',
                                    boxShadow: '0 4px 12px rgba(15,23,42,0.1)',
                                },
                            }}
                        >
                            {loading
                                ? <CircularProgress size={15} sx={{ color: T.text }} />
                                : <RefreshCw size={15} />}
                        </IconButton>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default DashboardHeader;
