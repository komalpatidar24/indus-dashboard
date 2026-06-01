import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Popover, IconButton,
    TextField, InputAdornment, Tooltip, CircularProgress,
    Dialog, DialogContent, DialogTitle, MenuItem, Select,
} from '@mui/material';
import { RefreshCw, Search, Calculator, Check, AlertTriangle, X } from 'lucide-react';
import { keyframes } from '@mui/material';
import { T } from './dashboardTokens';
import { CURRENCIES, formatCurrency } from './useCurrencyRates';

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

/* ── Converter modal ────────────────────────────────────────── */
const ConverterModal = ({ open, onClose, rates }) => {
    const [amount, setAmount]   = useState('1000');
    const [from,   setFrom]     = useState('INR');
    const [to,     setTo]       = useState('USD');

    const result = useMemo(() => {
        const n = parseFloat(amount);
        if (!n || isNaN(n)) return null;
        /* convert: n <from> → INR → <to> */
        const inr       = from === 'INR' ? n : n / (rates[from] ?? 1);
        const converted = to   === 'INR' ? inr : inr * (rates[to] ?? 1);
        const rate      = converted / n;
        return { n, converted, rate };
    }, [amount, from, to, rates]);

    const swap = () => { const t = from; setFrom(to); setTo(t); };

    const selectSx = {
        fontSize: '0.8rem', borderRadius: '10px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: T.border },
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            PaperProps={{ sx: { borderRadius: '18px', fontFamily: T.font } }}>
            <DialogTitle sx={{
                fontSize: '0.95rem', fontWeight: 800, color: T.text,
                pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Calculator size={16} color={T.primary} />
                    Currency Converter
                </Box>
                <IconButton size="small" onClick={onClose}
                    sx={{ color: T.textFaint, '&:hover': { color: T.text } }}>
                    <X size={16} />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                {/* Amount */}
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.textFaint, mb: 0.5 }}>Amount</Typography>
                <TextField
                    fullWidth size="small" type="number" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.85rem' } }}
                />

                {/* From / To */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', gap: 1, alignItems: 'end', mb: 2 }}>
                    <Box>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.textFaint, mb: 0.5 }}>From</Typography>
                        <Select fullWidth size="small" value={from} onChange={e => setFrom(e.target.value)} sx={selectSx}>
                            {CURRENCIES.map(c => (
                                <MenuItem key={c.code} value={c.code} sx={{ fontSize: '0.8rem' }}>
                                    {c.flag} {c.code} — {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <IconButton size="small" onClick={swap}
                        sx={{ mb: 0.25, border: `1px solid ${T.border}`, borderRadius: '8px', width: 32, height: 32, color: T.textMuted }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l-4-4" />
                        </svg>
                    </IconButton>
                    <Box>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: T.textFaint, mb: 0.5 }}>To</Typography>
                        <Select fullWidth size="small" value={to} onChange={e => setTo(e.target.value)} sx={selectSx}>
                            {CURRENCIES.map(c => (
                                <MenuItem key={c.code} value={c.code} sx={{ fontSize: '0.8rem' }}>
                                    {c.flag} {c.code} — {c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                </Box>

                {/* Result */}
                {result && (
                    <Box sx={{
                        bgcolor: `${T.primary}0d`, border: `1px solid ${T.primary}30`,
                        borderRadius: '12px', p: 2, textAlign: 'center',
                    }}>
                        <Typography sx={{ fontSize: '1.1rem', fontWeight: 900, color: T.text }}>
                            {formatCurrency(result.n, from, rates)}
                            <Box component="span" sx={{ mx: 1.5, color: T.textFaint, fontWeight: 400 }}>=</Box>
                            {formatCurrency(result.n / (rates[from] ?? 1), to, rates)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: T.textMuted, mt: 0.5 }}>
                            1 {from} = {result.rate.toFixed(6)} {to}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

/* ── Main CurrencyToggle ────────────────────────────────────── */
const CurrencyToggle = ({ value = 'INR', onChange, rates = {}, loading = false, updatedAt, refreshRates }) => {
    const [anchor,    setAnchor]    = useState(null);
    const [search,    setSearch]    = useState('');
    const [converter, setConverter] = useState(false);

    const active = CURRENCIES.find(c => c.code === value) ?? CURRENCIES[0];

    const filtered = useMemo(() =>
        CURRENCIES.filter(c =>
            !search.trim() ||
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
        ),
    [search]);

    const fmtTime = (ts) => {
        if (!ts) return null;
        const d = new Date(ts);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    const isLive   = updatedAt && (Date.now() - updatedAt < 35 * 60 * 1000);
    const isFallback = !updatedAt;

    return (
        <>
            {/* Trigger button */}
            <Tooltip title={`Currency: ${active.name}`} placement="bottom" arrow>
                <Box
                    onClick={e => { setSearch(''); setAnchor(e.currentTarget); }}
                    sx={{
                        width: 36, height: 36, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '10px',
                        border: `1.5px solid ${anchor ? T.primary : T.border}`,
                        background: anchor
                            ? `linear-gradient(145deg, ${T.primary}, #1e3a5f)`
                            : 'linear-gradient(145deg,#fff,#f8fafc)',
                        cursor: 'pointer', userSelect: 'none',
                        boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
                        transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
                        '&:hover': {
                            borderColor: T.primary,
                            boxShadow: '0 4px 16px rgba(30,58,95,0.2)',
                            transform: 'scale(1.08)',
                        },
                    }}
                >
                    {loading ? (
                        <CircularProgress size={14} sx={{ color: T.primary }} />
                    ) : (
                        <Typography sx={{
                            fontSize: active.symbol.length > 1 ? '0.6rem' : '1rem',
                            fontWeight: 800,
                            color: anchor ? '#fff' : T.primary,
                            lineHeight: 1,
                        }}>
                            {active.symbol}
                        </Typography>
                    )}
                </Box>
            </Tooltip>

            {/* Dropdown popover */}
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        mt: 1, borderRadius: '16px', width: 280,
                        border: `1px solid ${T.border}`, overflow: 'hidden',
                        boxShadow: '0 20px 60px -10px rgba(15,23,42,0.28)',
                        animation: `${fadeUp} 0.18s cubic-bezier(0.34,1.56,0.64,1) both`,
                        fontFamily: T.font,
                    }
                }}
            >
                {/* Header */}
                <Box sx={{
                    px: 2, pt: 1.5, pb: 1,
                    borderBottom: `1px solid ${T.borderLight}`,
                    background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Select Currency
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {isFallback && (
                            <Tooltip title="Using fallback rates — API unavailable" arrow>
                                <AlertTriangle size={12} color="#f59e0b" />
                            </Tooltip>
                        )}
                        {isLive && (
                            <Typography sx={{ fontSize: '0.58rem', color: '#10b981', fontWeight: 700 }}>
                                Live · {fmtTime(updatedAt)}
                            </Typography>
                        )}
                        <Tooltip title="Refresh rates" arrow>
                            <IconButton size="small" onClick={() => refreshRates?.()}
                                disabled={loading}
                                sx={{ width: 22, height: 22, color: T.textFaint, '&:hover': { color: T.primary } }}>
                                <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Search */}
                <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${T.borderLight}` }}>
                    <TextField
                        fullWidth size="small" placeholder="Search currency…"
                        value={search} onChange={e => setSearch(e.target.value)}
                        autoFocus
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={13} color={T.textFaint} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px', fontSize: '0.78rem', height: 32,
                                bgcolor: T.bg,
                                '& fieldset': { borderColor: T.border },
                                '&:hover fieldset': { borderColor: T.textFaint },
                            }
                        }}
                    />
                </Box>

                {/* Currency list */}
                <Box sx={{
                    maxHeight: 260, overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { bgcolor: T.border, borderRadius: 4 },
                }}>
                    {filtered.length === 0 ? (
                        <Typography sx={{ py: 3, textAlign: 'center', fontSize: '0.78rem', color: T.textFaint }}>
                            No currency found
                        </Typography>
                    ) : filtered.map(opt => {
                        const isActive = value === opt.code;
                        const rate     = rates[opt.code]; // how many opt.code per 1 INR

                        /* Show: 1 USD = ₹84.03  i.e. inverse of the stored rate */
                        const rateLabel = opt.code === 'INR'
                            ? 'Base currency'
                            : rate
                                ? `1 ${opt.code} = ₹${(1 / rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                                : '—';

                        return (
                            <Box
                                key={opt.code}
                                onClick={() => { onChange(opt.code); setAnchor(null); }}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.2,
                                    px: 1.5, py: 0.85, cursor: 'pointer',
                                    bgcolor: isActive ? T.primary : 'transparent',
                                    transition: 'all 0.14s ease',
                                    '&:hover': {
                                        bgcolor: isActive ? '#1e293b' : T.borderLight,
                                        transform: 'translateX(2px)',
                                    },
                                }}
                            >
                                {/* Currency symbol in a styled circle */}
                                <Box sx={{
                                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: isActive ? 'rgba(255,255,255,0.15)' : `${T.primary}12`,
                                    border: `1.5px solid ${isActive ? 'rgba(255,255,255,0.25)' : `${T.primary}22`}`,
                                    fontWeight: 900,
                                    fontSize: opt.symbol.length > 1 ? '0.65rem' : '1rem',
                                    color: isActive ? '#fff' : T.primary,
                                    letterSpacing: '-0.01em',
                                }}>
                                    {opt.symbol}
                                </Box>

                                {/* Name + rate */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: isActive ? '#fff' : T.text, lineHeight: 1.2 }}>
                                            {opt.name}
                                        </Typography>
                                        <Box sx={{
                                            fontSize: '0.6rem', fontWeight: 700,
                                            color: isActive ? 'rgba(255,255,255,0.6)' : '#94a3b8',
                                            bgcolor: isActive ? 'rgba(255,255,255,0.12)' : T.borderLight,
                                            px: '5px', py: '1px', borderRadius: '4px',
                                        }}>
                                            {opt.code}
                                        </Box>
                                    </Box>
                                    <Typography sx={{ fontSize: '0.62rem', color: isActive ? 'rgba(255,255,255,0.5)' : '#94a3b8', mt: 0.2 }}>
                                        {loading ? '…' : rateLabel}
                                    </Typography>
                                </Box>

                                {/* Active tick */}
                                {isActive && <Check size={14} color="#4ade80" strokeWidth={3} />}
                            </Box>
                        );
                    })}
                </Box>

                {/* Footer — converter button + source */}
                <Box sx={{
                    px: 2, py: 0.9,
                    bgcolor: '#f8fafc',
                    borderTop: `1px solid ${T.borderLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Box
                        onClick={() => { setAnchor(null); setConverter(true); }}
                        sx={{
                            display: 'flex', alignItems: 'center', gap: 0.6,
                            cursor: 'pointer', color: T.primary,
                            fontSize: '0.68rem', fontWeight: 700,
                            '&:hover': { textDecoration: 'underline' },
                        }}
                    >
                        <Calculator size={12} />
                        Currency Converter
                    </Box>
                    <Typography sx={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 600 }}>
                        {isFallback ? '⚠ Fallback rates' : '✓ frankfurter.dev'}
                    </Typography>
                </Box>
            </Popover>

            {/* Converter modal */}
            <ConverterModal
                open={converter}
                onClose={() => setConverter(false)}
                rates={rates}
                baseCurrency={value}
            />
        </>
    );
};

export default CurrencyToggle;
