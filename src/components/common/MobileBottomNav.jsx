import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Drawer } from '@mui/material';
import {
    TrendingUp, Factory, ShoppingCart, Package,
    DollarSign, Truck, BarChart2, FileText, ClipboardList,
    Layers, Grid, X, ChevronRight
} from 'lucide-react';
import { T } from './dashboardTokens';

const MAIN_NAV = [
    { label: 'Sales',      icon: TrendingUp,   path: '/dashboard/sales' },
    { label: 'Production', icon: Factory,      path: '/dashboard/production' },
    { label: 'Purchase',   icon: ShoppingCart, path: '/dashboard/purchase' },
    { label: 'Inventory',  icon: Package,      path: '/dashboard/inventory' },
];

const MORE_ITEMS = [
    { label: 'Costing',     icon: DollarSign,    path: '/dashboard/costing' },
    { label: 'Dispatch',    icon: Truck,         path: '/dashboard/dispatch' },
    { label: 'Procurement', icon: ClipboardList, path: '/dashboard/ProcurementDashbaord' },
    { label: 'Quotation',   icon: FileText,      path: '/dashboard/quotation' },
    { label: 'MOM / YOY',   icon: BarChart2,     path: '/dashboard/MomYoyDashboard' },
    { label: 'Wastage',     icon: Layers,        path: '/dashboard/WastageMaterial' },
];

// eslint-disable-next-line no-unused-vars
const NavItem = ({ label, icon: Icon, path: _path, active, onClick }) => (
    <Box
        onClick={onClick}
        sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            py: '8px',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.18s ease',
            WebkitTapHighlightColor: 'transparent',
        }}
    >
        {active && (
            <Box sx={{
                position: 'absolute',
                top: 3,
                width: 4, height: 4,
                borderRadius: '50%',
                bgcolor: T.primary,
            }} />
        )}
        <Box sx={{
            width: 36, height: 36,
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: active ? T.primary : 'transparent',
            transition: 'all 0.18s ease',
        }}>
            <Icon size={18} color={active ? '#fff' : T.textFaint} strokeWidth={active ? 2.5 : 1.8} />
        </Box>
        <Typography sx={{
            fontSize: '0.57rem',
            fontWeight: active ? 800 : 500,
            color: active ? T.primary : T.textFaint,
            whiteSpace: 'nowrap',
            lineHeight: 1,
            letterSpacing: '0.01em',
        }}>
            {label}
        </Typography>
    </Box>
);

const MobileBottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const hiddenPaths = ['/', '/login', '/user-login'];
    if (hiddenPaths.includes(location.pathname)) return null;

    const moreActive = MORE_ITEMS.some(i => i.path === location.pathname);

    const handleNavigate = (path) => {
        setDrawerOpen(false);
        navigate(path);
    };

    return (
        <>
            {/* ── Bottom Nav Bar ── */}
            <Box sx={{
                display: { xs: 'flex', md: 'none' },
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                zIndex: 200,
                bgcolor: '#ffffff',
                borderTop: `1px solid ${T.borderLight}`,
                boxShadow: '0 -4px 20px rgba(15,23,42,0.08)',
                pb: 'env(safe-area-inset-bottom)',
            }}>
                {MAIN_NAV.map(item => (
                    <NavItem
                        key={item.path}
                        {...item}
                        active={location.pathname === item.path}
                        onClick={() => navigate(item.path)}
                    />
                ))}

                {/* More button */}
                <Box
                    onClick={() => setDrawerOpen(true)}
                    sx={{
                        flex: 1,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: '3px', py: '8px',
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: moreActive ? T.primary : 'transparent',
                        transition: 'all 0.18s ease',
                    }}>
                        <Grid size={18} color={moreActive ? '#fff' : T.textFaint} strokeWidth={1.8} />
                    </Box>
                    <Typography sx={{
                        fontSize: '0.57rem',
                        fontWeight: moreActive ? 800 : 500,
                        color: moreActive ? T.primary : T.textFaint,
                        whiteSpace: 'nowrap', lineHeight: 1,
                    }}>
                        More
                    </Typography>
                </Box>
            </Box>

            {/* ── More Drawer ── */}
            <Drawer
                anchor="bottom"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                sx={{ display: { xs: 'block', md: 'none' } }}
                PaperProps={{
                    sx: {
                        borderRadius: '20px 20px 0 0',
                        pb: 'calc(env(safe-area-inset-bottom) + 8px)',
                        maxHeight: '60vh',
                    }
                }}
            >
                {/* Drawer handle */}
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.2, pb: 0.5 }}>
                    <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: T.border }} />
                </Box>

                {/* Header */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    px: 2.5, py: 1.5, borderBottom: `1px solid ${T.borderLight}`,
                }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: T.text }}>
                        More Dashboards
                    </Typography>
                    <Box
                        onClick={() => setDrawerOpen(false)}
                        sx={{
                            width: 28, height: 28, borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: T.borderLight, cursor: 'pointer',
                        }}
                    >
                        <X size={14} color={T.textMuted} />
                    </Box>
                </Box>

                {/* Menu items */}
                <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {/* eslint-disable-next-line no-unused-vars */}
                    {MORE_ITEMS.map(({ label, icon: Icon, path }) => {
                        const active = location.pathname === path;
                        return (
                            <Box
                                key={path}
                                onClick={() => handleNavigate(path)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    px: 1.5, py: 1.4,
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    bgcolor: active ? `${T.primary}10` : 'transparent',
                                    border: `1.5px solid ${active ? T.primary + '30' : 'transparent'}`,
                                    transition: 'all 0.15s ease',
                                    '&:active': { bgcolor: `${T.primary}15` },
                                }}
                            >
                                <Box sx={{
                                    width: 38, height: 38, borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: active ? T.primary : T.borderLight,
                                    flexShrink: 0,
                                }}>
                                    <Icon size={18} color={active ? '#fff' : T.textMuted} strokeWidth={1.8} />
                                </Box>
                                <Typography sx={{
                                    flex: 1,
                                    fontSize: '0.85rem', fontWeight: active ? 800 : 600,
                                    color: active ? T.primary : T.text,
                                }}>
                                    {label}
                                </Typography>
                                <ChevronRight size={15} color={T.textFaint} />
                            </Box>
                        );
                    })}
                </Box>
            </Drawer>
        </>
    );
};

export default MobileBottomNav;
