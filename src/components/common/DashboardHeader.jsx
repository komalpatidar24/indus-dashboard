import React from 'react';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { RefreshCw } from 'lucide-react';
import { R, T, FONT } from './dashboardTokens';

const DashboardHeader = ({ title, onRefresh, loading, children }) => {
    const refresh = () => { location.reload(); };
    return (
        <Box
            sx={{
                bgcolor: T.surface,
                borderBottom: `1px solid ${T.borderLight}`,
                py: R.headerPy,
                px: R.headerPx,
                display: 'flex',
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: { xs: '8px', md: '12px' },
                boxShadow: '0 1px 12px rgba(15,23,42,0.04)',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(8px)',
                transition: 'box-shadow 0.3s ease',
            }}
        >
            {/* Title — always full width on xs so filters get their own row */}
            <Typography
                variant="h5"
                sx={{
                    fontWeight: 900,
                    color: T.text,
                    fontSize: FONT.pageTitle,
                    letterSpacing: '-0.02em',
                    fontFamily: T.font,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    /* on mobile take full row so filters wrap below */
                    width: { xs: '100%', md: 'auto' },
                }}
            >
                {title}
            </Typography>

            {/* Controls row — scrollable on xs so pills never overflow */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: { xs: '6px', sm: '8px', md: '10px' },
                    flex: '1 1 auto',
                    justifyContent: { xs: 'flex-start', md: 'flex-end' },
                    overflowX: 'auto',
                    /* hide scrollbar but keep usable */
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                    minWidth: 0,
                }}
            >
                {children}
                {onRefresh && (
                    <IconButton
                        onClick={refresh}
                        disabled={loading}
                        sx={{
                            color: T.textMuted,
                            bgcolor: '#f8fafc',
                            border: `1px solid ${T.border}`,
                            borderRadius: R.radiusInput,
                            p: 0.9,
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
                            ? <CircularProgress size={17} sx={{ color: T.text }} />
                            : <RefreshCw size={17} />}
                    </IconButton>
                )}
            </Box>
        </Box>
    );
};

export default DashboardHeader;
