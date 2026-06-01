import React, { useState } from 'react';
import {
    Box, Typography, Popover, Button,
    MenuItem, Select, TextField, Divider
} from '@mui/material';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import { T, R, FONT } from './dashboardTokens';

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);

/* ══════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════ */
const NOW          = dayjs();
const CURRENT_YEAR = NOW.year();

// Financial year: Apr 1 → Mar 31
// "Current financial year" = if today >= Apr 1 of this year → this FY, else previous FY
const FY_START_MONTH = 4; // April (1-indexed)
const getFYBounds = (year) => ({
    from: dayjs(`${year}-04-01`).format('YYYY-MM-DD'),
    to:   dayjs(`${year + 1}-03-31`).format('YYYY-MM-DD'),
});
const currentFYYear = NOW.month() + 1 >= FY_START_MONTH ? CURRENT_YEAR : CURRENT_YEAR - 1;
const DEFAULT_FROM  = getFYBounds(currentFYYear).from;
const DEFAULT_TO    = getFYBounds(currentFYYear).to;

/* ── Week options W1–W52 ── */
const WEEK_OPTIONS = Array.from({ length: 52 }, (_, i) => ({
    label: `Week ${i + 1}`,
    value: i + 1,
}));

/* ── Month options ── */
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));

/* ── Quarter options ── */
const QUARTER_OPTIONS = [
    { label: 'Q1  Jan – Mar', value: 1 },
    { label: 'Q2  Apr – Jun', value: 2 },
    { label: 'Q3  Jul – Sep', value: 3 },
    { label: 'Q4  Oct – Dec', value: 4 },
];

/* ── Year options: current FY year down to 2017 ── */
const YEAR_OPTIONS = Array.from(
    { length: currentFYYear - 2016 },
    (_, i) => ({
        label: `${currentFYYear - i}–${String(currentFYYear - i + 1).slice(2)}`,
        value: currentFYYear - i,
    })
);

/* ── Day options: every day of the current ISO week ── */
const DAY_OPTIONS = Array.from({ length: 7 }, (_, i) => {
    const d = NOW.startOf('isoWeek').add(i, 'day');
    return { label: d.format('ddd, DD MMM'), value: d.format('YYYY-MM-DD') };
});

/* ══════════════════════════════════════════════════
   DATE COMPUTATION
══════════════════════════════════════════════════ */
function computeDates(period, subValue) {
    switch (period) {

        case 'Day': {
            const d = subValue ? dayjs(subValue) : NOW;
            return { from: d.format('YYYY-MM-DD'), to: d.format('YYYY-MM-DD') };
        }

        case 'Week': {
            if (subValue === 'this') {
                return { from: NOW.startOf('isoWeek').format('YYYY-MM-DD'), to: NOW.endOf('isoWeek').format('YYYY-MM-DD') };
            }
            if (subValue === 'last') {
                const lw = NOW.subtract(1, 'week');
                return { from: lw.startOf('isoWeek').format('YYYY-MM-DD'), to: lw.endOf('isoWeek').format('YYYY-MM-DD') };
            }
            // numeric week number
            const wn = Number(subValue) || NOW.isoWeek();
            const weekStart = dayjs().startOf('year').isoWeekday(1).add(wn - 1, 'week');
            return { from: weekStart.format('YYYY-MM-DD'), to: weekStart.add(6, 'day').format('YYYY-MM-DD') };
        }

        case 'Month': {
            if (subValue === 'this') {
                return { from: NOW.startOf('month').format('YYYY-MM-DD'), to: NOW.endOf('month').format('YYYY-MM-DD') };
            }
            if (subValue === 'last') {
                const lm = NOW.subtract(1, 'month');
                return { from: lm.startOf('month').format('YYYY-MM-DD'), to: lm.endOf('month').format('YYYY-MM-DD') };
            }
            const mn  = Number(subValue) || (NOW.month() + 1);
            const ref = dayjs(`${CURRENT_YEAR}-${String(mn).padStart(2, '0')}-01`);
            return { from: ref.startOf('month').format('YYYY-MM-DD'), to: ref.endOf('month').format('YYYY-MM-DD') };
        }

        case 'Quarter': {
            if (subValue === 'this') {
                const q = Math.ceil((NOW.month() + 1) / 3);
                const sm = (q - 1) * 3 + 1;
                const qs = dayjs(`${CURRENT_YEAR}-${String(sm).padStart(2, '0')}-01`);
                return { from: qs.format('YYYY-MM-DD'), to: qs.add(2, 'month').endOf('month').format('YYYY-MM-DD') };
            }
            if (subValue === 'last') {
                const q  = Math.ceil((NOW.month() + 1) / 3);
                const lq = q === 1 ? 4 : q - 1;
                const ly = q === 1 ? CURRENT_YEAR - 1 : CURRENT_YEAR;
                const sm = (lq - 1) * 3 + 1;
                const qs = dayjs(`${ly}-${String(sm).padStart(2, '0')}-01`);
                return { from: qs.format('YYYY-MM-DD'), to: qs.add(2, 'month').endOf('month').format('YYYY-MM-DD') };
            }
            const qn = Number(subValue) || Math.ceil((NOW.month() + 1) / 3);
            const sm = (qn - 1) * 3 + 1;
            const qs = dayjs(`${CURRENT_YEAR}-${String(sm).padStart(2, '0')}-01`);
            return { from: qs.format('YYYY-MM-DD'), to: qs.add(2, 'month').endOf('month').format('YYYY-MM-DD') };
        }

        case 'Year': {
            if (subValue === 'this')  return getFYBounds(currentFYYear);
            if (subValue === 'last')  return getFYBounds(currentFYYear - 1);
            const yr = Number(subValue) || currentFYYear;
            return getFYBounds(yr);
        }

        default:
            return { from: DEFAULT_FROM, to: DEFAULT_TO };
    }
}

/* ══════════════════════════════════════════════════
   QUICK OPTION CHIPS per period
══════════════════════════════════════════════════ */
const QUICK_OPTIONS = {
    Day:     [{ label: 'Today',       value: NOW.format('YYYY-MM-DD') },
              { label: 'Yesterday',   value: NOW.subtract(1,'day').format('YYYY-MM-DD') }],
    Week:    [{ label: 'This Week',   value: 'this' },
              { label: 'Last Week',   value: 'last' }],
    Month:   [{ label: 'This Month',  value: 'this' },
              { label: 'Last Month',  value: 'last' }],
    Quarter: [{ label: 'This Quarter',value: 'this' },
              { label: 'Last Quarter',value: 'last' }],
    Year:    [{ label: 'This Year',   value: 'this' },
              { label: 'Last Year',   value: 'last' }],
};

/* ══════════════════════════════════════════════════
   LABEL BUILDER for active tag shown on pill
══════════════════════════════════════════════════ */
function buildLabel(period, subValue) {
    if (!subValue) return null;
    const quick = QUICK_OPTIONS[period]?.find(o => o.value === subValue);
    if (quick) return quick.label;

    if (period === 'Week') {
        const wn = Number(subValue);
        return `Week ${wn}`;
    }
    if (period === 'Month') {
        const mn = Number(subValue);
        return MONTH_NAMES[mn - 1] || null;
    }
    if (period === 'Quarter') {
        const labels = { 1:'Q1', 2:'Q2', 3:'Q3', 4:'Q4' };
        return labels[Number(subValue)] || null;
    }
    if (period === 'Year') {
        const opt = YEAR_OPTIONS.find(o => o.value === Number(subValue));
        return opt ? `FY ${opt.label}` : null;
    }
    if (period === 'Day') {
        return dayjs(subValue).format('DD MMM');
    }
    return null;
}

/* ══════════════════════════════════════════════════
   PILL BUTTON
   - xs: shows only first letter (D/W/M/Q/Y), active gets a dot indicator
   - sm+: shows full label with active sub-selection text
══════════════════════════════════════════════════ */
const Pill = ({ label, active, onClick, period }) => (
    <Box
        onClick={onClick}
        sx={{
            /* mobile: fixed small square; sm+: auto width with padding */
            px: { xs: 0, sm: 1.4 },
            py: { xs: 0, sm: 0.5 },
            width:  { xs: 32, sm: 'auto' },
            height: { xs: 32, sm: 'auto' },
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: { xs: '8px', sm: '10px' },
            fontSize: { xs: '0.68rem', sm: '0.72rem' },
            fontWeight: 800,
            cursor: 'pointer',
            userSelect: 'none',
            letterSpacing: '0.03em',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            position: 'relative',
            bgcolor:    active ? '#0f172a' : '#f1f5f9',
            color:      active ? '#ffffff' : '#475569',
            border:     active ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
            '&:hover': {
                bgcolor: active ? '#1e293b' : '#e2e8f0',
                color:   active ? '#fff'    : '#0f172a',
            },
        }}
    >
        {/* xs: first letter only */}
        <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
            {period[0]}
        </Box>
        {/* sm+: full label */}
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
            {label}
        </Box>
        {/* xs: small dot at bottom-right when active */}
        {active && (
            <Box sx={{
                display: { xs: 'block', sm: 'none' },
                position: 'absolute', bottom: 3, right: 3,
                width: 5, height: 5, borderRadius: '50%',
                bgcolor: '#4ade80',
            }} />
        )}
    </Box>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const PERIODS = ['Day', 'Week', 'Month', 'Quarter', 'Year'];

const CommonDateFilter = ({ period, setPeriod, fromDate, setFromDate, toDate, setToDate }) => {

    // Which period popover is open (null | 'Day' | 'Week' | ...)
    const [periodAnchor, setPeriodAnchor] = useState(null);
    const [openPeriod,   setOpenPeriod]   = useState(null);

    // Funnel (custom date) popover
    const [funnelAnchor, setFunnelAnchor] = useState(null);

    // Per-period selected sub-values (so each pill remembers its selection)
    const [selections, setSelections] = useState({
        Day: null, Week: null, Month: null, Quarter: null,
        // Default to Current Financial Year
        Year: currentFYYear,
    });

    // Custom date inputs (inside funnel popover)
    const [customFrom, setCustomFrom] = useState('');
    const [customTo,   setCustomTo]   = useState('');

    /* ── open a period popover ── */
    const handlePillClick = (e, p) => {
        setPeriodAnchor(e.currentTarget);
        setOpenPeriod(p);
    };
    const closePeriodPopover = () => {
        setPeriodAnchor(null);
        setOpenPeriod(null);
    };

    /* ── apply a sub-value selection ── */
    const applySelection = (p, val) => {
        const { from, to } = computeDates(p, val);
        setPeriod(p);
        setFromDate(from);
        setToDate(to);
        // Clear all other periods so only the active one appears selected
        setSelections({ Day: null, Week: null, Month: null, Quarter: null, Year: null, [p]: val });
        closePeriodPopover();
    };

    /* ── apply custom date range from funnel ── */
    const applyCustomRange = () => {
        if (!customFrom || !customTo) return;
        setFromDate(customFrom);
        setToDate(customTo);
        // Clear all period selections so none looks active
        setSelections({ Day: null, Week: null, Month: null, Quarter: null, Year: null });
        setPeriod('Day'); // treat as custom/day range
        setFunnelAnchor(null);
        setCustomFrom('');
        setCustomTo('');
    };

    /* ── reset to current FY ── */
    const handleReset = () => {
        const { from, to } = getFYBounds(currentFYYear);
        setFromDate(from);
        setToDate(to);
        setPeriod('Year');
        setSelections({ Day: null, Week: null, Month: null, Quarter: null, Year: currentFYYear });
        setCustomFrom('');
        setCustomTo('');
        setFunnelAnchor(null);
        closePeriodPopover();
    };

    /* ── get select-list options for a period ── */
    const getSelectOptions = (p) => {
        if (p === 'Day')     return DAY_OPTIONS;
        if (p === 'Week')    return WEEK_OPTIONS;
        if (p === 'Month')   return MONTH_OPTIONS;
        if (p === 'Quarter') return QUARTER_OPTIONS;
        if (p === 'Year')    return YEAR_OPTIONS;
        return [];
    };

    /* ── active label shown on pill (if any selection exists) ── */
    const getActiveLabel = (p) => {
        const sel = selections[p];
        if (!sel) return null;
        return buildLabel(p, sel);
    };

    /* ── shared styles ── */
    const sectionLabel = {
        fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.8,
    };

    return (
        <Box sx={{
            display: 'flex', alignItems: 'center',
            gap: { xs: '4px', sm: '4px', md: '2px' },
            flexWrap: 'nowrap',
            flexShrink: 0,
        }}>

            {/* ── LEFT BORDER SEPARATOR ── */}
            <Box sx={{ width: '1px', height: 22, bgcolor: '#cbd5e1', mx: 0.5, flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />

            {/* ════ PERIOD PILLS ════ */}
            {PERIODS.map(p => {
                const activeLabel = getActiveLabel(p);
                const isActive    = period === p && !!selections[p];
                return (
                    <Pill
                        key={p}
                        period={p}
                        label={activeLabel ? `${p}: ${activeLabel}` : p}
                        active={isActive}
                        onClick={(e) => handlePillClick(e, p)}
                    />
                );
            })}

            {/* ── PERIOD POPOVER ── */}
            <Popover
                open={Boolean(periodAnchor)}
                anchorEl={periodAnchor}
                onClose={closePeriodPopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        mt: 1, borderRadius: '16px', p: 2,
                        minWidth: { xs: 200, sm: 230 },
                        width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
                        maxWidth: '95vw',
                        boxShadow: '0 16px 48px -8px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.9)',
                        border: `1px solid rgba(226,232,240,0.6)`,
                    }
                }}
            >
                {openPeriod && (
                    <>
                        {/* Popover header */}
                        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.5 }}>
                            <Typography sx={{ fontSize:'0.8rem', fontWeight:800, color:'#0f172a' }}>
                                {openPeriod}
                            </Typography>
                            <Box
                                onClick={closePeriodPopover}
                                sx={{ cursor:'pointer', color:'#94a3b8', fontSize:'1rem', lineHeight:1, '&:hover':{ color:'#0f172a' } }}
                            >✕</Box>
                        </Box>

                        {/* Quick options */}
                        <Typography sx={sectionLabel}>Quick Select</Typography>
                        <Box sx={{ display:'flex', gap:0.8, mb:1.8, flexWrap:'wrap' }}>
                            {QUICK_OPTIONS[openPeriod].map(opt => {
                                const isSel = selections[openPeriod] === opt.value;
                                return (
                                    <Box
                                        key={opt.value}
                                        onClick={() => applySelection(openPeriod, opt.value)}
                                        sx={{
                                            px: 1.3, py: 0.55, borderRadius:'10px',
                                            fontSize:'0.72rem', fontWeight:700,
                                            cursor:'pointer', userSelect:'none',
                                            transition:'all 0.15s ease',
                                            bgcolor: isSel ? '#0f172a' : '#f1f5f9',
                                            color:   isSel ? '#fff'    : '#475569',
                                            border: `1.5px solid ${isSel ? '#0f172a' : '#e2e8f0'}`,
                                            '&:hover':{ bgcolor: isSel ? '#1e293b' : '#e2e8f0', color: isSel ? '#fff' : '#0f172a' }
                                        }}
                                    >
                                        {opt.label}
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Divider */}
                        <Divider sx={{ mb: 1.5, borderColor:'#f1f5f9' }} />

                        {/* Select list */}
                        <Typography sx={sectionLabel}>Select {openPeriod}</Typography>
                        <Select
                            value={
                                // only show numeric / date values in the select (not 'this'/'last')
                                (selections[openPeriod] && !['this','last'].includes(String(selections[openPeriod])))
                                    ? selections[openPeriod]
                                    : ''
                            }
                            onChange={e => applySelection(openPeriod, e.target.value)}
                            size="small"
                            displayEmpty
                            fullWidth
                            sx={{
                                fontSize:'0.73rem', fontWeight:600,
                                borderRadius:'10px', bgcolor:'#f8fafc',
                                '.MuiOutlinedInput-notchedOutline':{ borderColor:'#e2e8f0' },
                                '&:hover .MuiOutlinedInput-notchedOutline':{ borderColor:'#94a3b8' },
                                '&.Mui-focused .MuiOutlinedInput-notchedOutline':{ borderColor:'#0f172a' },
                            }}
                            MenuProps={{ PaperProps:{ sx:{ maxHeight:240, borderRadius:'12px', mt:0.5 } } }}
                        >
                            <MenuItem value="" disabled sx={{ fontSize:'0.73rem', color:'#94a3b8' }}>
                                — choose {openPeriod} —
                            </MenuItem>
                            {getSelectOptions(openPeriod).map(o => (
                                <MenuItem key={o.value} value={o.value} sx={{ fontSize:'0.73rem', fontWeight:600 }}>
                                    {o.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </>
                )}
            </Popover>

            {/* ── RIGHT BORDER SEPARATOR ── */}
            <Box sx={{ width: '1px', height: 22, bgcolor: '#cbd5e1', mx: 0.5, flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />

            {/* ════ FUNNEL ICON — From–To calendar picker ════ */}
            <Box
                onClick={(e) => setFunnelAnchor(e.currentTarget)}
                title="Custom date range"
                sx={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    width: 32, height: 32, borderRadius: '8px',
                    flexShrink: 0,
                    bgcolor: funnelAnchor ? '#0f172a' : '#f1f5f9',
                    color:   funnelAnchor ? '#fff'    : '#475569',
                    cursor: 'pointer',
                    border: `1.5px solid ${funnelAnchor ? '#0f172a' : '#e2e8f0'}`,
                    transition: 'all 0.18s ease',
                    '&:hover':{ bgcolor:'#0f172a', color:'#fff', borderColor:'#0f172a' },
                }}
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 4h16v2.586l-6 6V20l-4-2v-7.414L4 6.586V4z" />
                </svg>
            </Box>

            {/* ── FUNNEL POPOVER (custom From–To) ── */}
            <Popover
                open={Boolean(funnelAnchor)}
                anchorEl={funnelAnchor}
                onClose={() => setFunnelAnchor(null)}
                anchorOrigin={{ vertical:'bottom', horizontal:'right' }}
                transformOrigin={{ vertical:'top', horizontal:'right' }}
                PaperProps={{
                    elevation: 0,
                    sx:{
                        mt:1, borderRadius:'16px', p:2.2,
                        minWidth: { xs: 240, sm: 300 },
                        width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
                        maxWidth: '95vw',
                        boxShadow:'0 16px 48px -8px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.9)',
                        border:'1px solid rgba(226,232,240,0.6)',
                    }
                }}
            >
                {/* Header */}
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:1.8 }}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:0.8 }}>
                        <Box sx={{ bgcolor:'#0f172a', borderRadius:'8px', p:'5px', display:'flex' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                <path d="M4 4h16v2.586l-6 6V20l-4-2v-7.414L4 6.586V4z" />
                            </svg>
                        </Box>
                        <Typography sx={{ fontWeight:800, fontSize:'0.82rem', color:'#0f172a' }}>
                            Custom Date Range
                        </Typography>
                    </Box>
                    <Button
                        onClick={handleReset} size="small"
                        sx={{
                            fontSize:'0.67rem', fontWeight:700, color:'#64748b',
                            textTransform:'none', minWidth:0, px:1.1,
                            borderRadius:'8px', border:'1px solid #e2e8f0',
                            '&:hover':{ bgcolor:'#f1f5f9', borderColor:'#94a3b8' }
                        }}
                    >
                        Reset
                    </Button>
                </Box>

                {/* Current filter info */}
                <Box sx={{
                    bgcolor:'#f8fafc', borderRadius:'10px', px:1.5, py:1,
                    mb:1.8, border:'1px solid #e2e8f0'
                }}>
                    <Typography sx={{ fontSize:'0.63rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', mb:0.4 }}>
                        Active Range
                    </Typography>
                    <Typography sx={{ fontSize:'0.75rem', fontWeight:700, color:'#0f172a' }}>
                        {dayjs(fromDate).format('DD MMM YYYY')} → {dayjs(toDate).format('DD MMM YYYY')}
                    </Typography>
                </Box>

                {/* From date */}
                <Box sx={{ mb:1.2 }}>
                    <Typography sx={{ fontSize:'0.63rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', mb:0.5 }}>
                        From
                    </Typography>
                    <TextField
                        type="date" size="small" value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        inputProps={{ max: customTo || undefined }}
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root':{
                                borderRadius:'10px', fontSize:'0.75rem', bgcolor:'#f8fafc',
                                '&:hover fieldset':{ borderColor:'#94a3b8' },
                                '&.Mui-focused fieldset':{ borderColor:'#0f172a' }
                            }
                        }}
                    />
                </Box>

                {/* To date */}
                <Box sx={{ mb:1.8 }}>
                    <Typography sx={{ fontSize:'0.63rem', fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', mb:0.5 }}>
                        To
                    </Typography>
                    <TextField
                        type="date" size="small" value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        inputProps={{ min: customFrom || undefined }}
                        fullWidth
                        sx={{
                            '& .MuiOutlinedInput-root':{
                                borderRadius:'10px', fontSize:'0.75rem', bgcolor:'#f8fafc',
                                '&:hover fieldset':{ borderColor:'#94a3b8' },
                                '&.Mui-focused fieldset':{ borderColor:'#0f172a' }
                            }
                        }}
                    />
                </Box>

                {/* Apply button */}
                <Button
                    fullWidth onClick={applyCustomRange}
                    disabled={!customFrom || !customTo}
                    sx={{
                        bgcolor:'#0f172a', color:'#fff', borderRadius:'10px',
                        fontWeight:800, fontSize:'0.72rem', textTransform:'uppercase',
                        letterSpacing:'0.06em', py:0.9,
                        '&:hover':{ bgcolor:'#1e293b' },
                        '&.Mui-disabled':{ bgcolor:'#e2e8f0', color:'#94a3b8' }
                    }}
                >
                    Apply Range
                </Button>
            </Popover>
        </Box>
    );
};

export default CommonDateFilter;