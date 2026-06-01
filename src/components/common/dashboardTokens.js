/**
 * dashboardTokens.js
 *
 * Single source of truth for all dashboard responsive values.
 * Import { R, T, GRID, CHART_H, FONT, SHADOW, ANIM } in any dashboard
 * and use instead of hardcoded sx values.
 *
 * HOW TO USE:
 *   import { R, T, GRID, CHART_H, FONT, SHADOW, ANIM } from '../common/dashboardTokens';
 *
 *   <Box sx={{ p: R.pagePad, display: 'grid', gridTemplateColumns: GRID.charts2, gap: R.gap }}>
 */

/* ══════════════════════════════════════════════════════════════
   T — Design Color Tokens  (shared across all dashboards)
══════════════════════════════════════════════════════════════ */
export const T = {
    // Backgrounds
    bg:           '#f8fafc',
    surface:      '#ffffff',
    glass:        'rgba(255,255,255,0.72)',

    // Borders
    border:       '#e2e8f0',
    borderLight:  '#f1f5f9',

    // Brand
    primary:      '#1e3a5f',
    primaryLight: '#dbeafe',
    primaryGlow:  'rgba(30,58,95,0.12)',

    // Semantic
    green:        '#059669',
    greenLight:   '#d1fae5',
    greenGlow:    'rgba(5,150,105,0.12)',
    amber:        '#d97706',
    amberLight:   '#fef3c7',
    amberGlow:    'rgba(217,119,6,0.12)',
    red:          '#dc2626',
    redLight:     '#fee2e2',
    redGlow:      'rgba(220,38,38,0.12)',
    purple:       '#7c3aed',
    purpleLight:  '#ede9fe',
    purpleGlow:   'rgba(124,58,237,0.12)',
    teal:         '#0f766e',
    tealLight:    '#ccfbf1',
    sky:          '#0284c7',
    skyLight:     '#e0f2fe',
    indigo:       '#6366f1',
    indigoLight:  '#e0e7ff',
    indigoGlow:   'rgba(99,102,241,0.12)',

    // Text
    text:         '#0f172a',
    textMuted:    '#64748b',
    textFaint:    '#94a3b8',

    // Shape
    radius:       '20px',
    radiusSm:     '10px',
    radiusXs:     '6px',

    // Shadows (also available via SHADOW export)
    shadowSm:  '0 2px 8px rgba(15,23,42,0.07), 0 1px 2px rgba(15,23,42,0.04)',
    shadowMd:  '0 6px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)',
    shadowLg:  '0 20px 50px rgba(15,23,42,0.15), 0 10px 20px rgba(15,23,42,0.10)',
    shadowGlow: (c) => `0 8px 32px ${c}`,

    // Typography
    font:         "'Plus Jakarta Sans', system-ui, sans-serif",
    fontMono:     "'DM Mono', monospace",
};

/* ══════════════════════════════════════════════════════════════
   R — Responsive Spacing & Layout Tokens
   All values are MUI sx-compatible (numbers = theme spacing units,
   strings = raw CSS values).
══════════════════════════════════════════════════════════════ */
export const R = {
    // ── Page outer padding ──────────────────────────────────
    pagePad:  { xs: 1, sm: 1.5, md: 2 },            // main page wrapper
    headerPx: { xs: 2, md: 4 },                      // DashboardHeader horizontal
    headerPy: { xs: 1.25, md: 1.75 },               // DashboardHeader vertical

    // ── Section / row bottom margin ─────────────────────────
    sectionMb: { xs: 1.5, md: 2 },                   // space between rows

    // ── Card padding ────────────────────────────────────────
    cardPad:  { xs: '14px 16px', sm: '20px 22px' },  // KPI stat cards
    cardPadMd: { xs: 1.5, md: 3 },                   // chart/glass cards (numeric MUI)

    // ── Gaps ────────────────────────────────────────────────
    gap:      { xs: '10px', sm: '12px', md: '14px' }, // KPI grid gap (pixel strings)
    gapChart: { xs: '12px', sm: '16px', md: '20px' }, // chart grid gap

    // ── Border radius ────────────────────────────────────────
    radiusCard:  '20px',
    radiusInput: '10px',
    radiusBtn:   '8px',
    radiusModal: '18px',
    radiusIcon:  '10px',

    // ── Modal sizing ─────────────────────────────────────────
    modalWidth:    { xs: '100vw', sm: '96vw', md: '92vw' },
    modalMaxWidth: 1200,
    drillWidth:    '90vw',
    drillMaxWidth: 1160,
    drillMaxH:     '88vh',

    // ── Misc fixed sizes ─────────────────────────────────────
    iconBtn:       { width: 32, height: 32 },         // small icon buttons
    searchWidth:   { xs: '100%', sm: 210, md: 210 },  // toolbar search fields
    pillH:         28,                                  // pagination pill height
};

/* ══════════════════════════════════════════════════════════════
   GRID — gridTemplateColumns presets
   Use as: gridTemplateColumns: GRID.kpi4
══════════════════════════════════════════════════════════════ */
export const GRID = {
    // KPI rows
    kpi2:    { xs: '1fr', sm: 'repeat(2, 1fr)' },
    kpi3:    { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
    kpi4:    { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
    kpi5:    { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
    kpi6:    { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' },
    kpi7:    { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' },

    // Chart rows
    charts1: { xs: '1fr' },
    charts2: { xs: '1fr', md: 'repeat(2, 1fr)' },
    charts3: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
    charts2lg: { xs: '1fr', lg: 'repeat(2, 1fr)' },
    charts3xl: { xs: '1fr', lg: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },

    // Mixed-ratio layouts
    main2side1: { xs: '1fr', md: '2fr 1fr' },        // e.g. large chart + side panel
    equal3:     { xs: '1fr', sm: 'repeat(3, 1fr)' }, // three equal cols from sm up
};

/* ══════════════════════════════════════════════════════════════
   CHART_H — Chart container heights
   Use as: height: CHART_H.md
══════════════════════════════════════════════════════════════ */
export const CHART_H = {
    xs:   220,   // small/mobile
    sm:   260,   // small charts, dispatch
    md:   300,   // standard (MomYoy, Store)
    lg:   340,   // large (Sales, Procurement, Quotation)
    xl:   380,   // extra large (Wastage)
    sparkline: 50, // inline sparkline in KPI cards
};

/* ══════════════════════════════════════════════════════════════
   FONT — Font size tokens
   Use as: fontSize: FONT.cardTitle
   All are raw CSS strings; wrap in { xs, md } for responsive.
══════════════════════════════════════════════════════════════ */
export const FONT = {
    // Responsive objects (pass directly to sx fontSize)
    pageTitle:  { xs: '1.2rem',  md: '1.5rem'  },    // DashboardHeader title
    cardTitle:  { xs: '0.78rem', md: '0.85rem' },    // chart/section card heading
    kpiValue:   { xs: '1.2rem',  md: '1.4rem'  },    // big KPI number
    kpiLabel:   { xs: '0.62rem', md: '0.68rem' },    // KPI label below value
    tableHead:  { xs: '0.62rem', md: '0.7rem'  },    // table column headers
    tableCell:  { xs: '0.72rem', md: '0.78rem' },    // table body cells
    badge:      '0.68rem',                            // status badges (fixed)
    pillLabel:  '0.72rem',                            // filter pills (fixed)
    sectionLbl: '0.62rem',                            // ALL-CAPS section labels
    tooltip:    '0.75rem',                            // tooltip body
    btnSm:      '0.7rem',                             // small buttons
    btnMd:      '0.8rem',                             // medium buttons
};

/* ══════════════════════════════════════════════════════════════
   SHADOW — Box shadow tokens
══════════════════════════════════════════════════════════════ */
export const SHADOW = {
    sm:   '0 2px 8px rgba(15,23,42,0.07), 0 1px 2px rgba(15,23,42,0.04)',
    md:   '0 6px 24px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.05)',
    lg:   '0 20px 50px rgba(15,23,42,0.15), 0 10px 20px rgba(15,23,42,0.10)',
    card: '0 8px 32px rgba(31,38,135,0.07)',
    modal:'0 40px 100px -20px rgba(15,23,42,0.3)',
    glow: (color) => `0 8px 32px ${color}`,           // e.g. SHADOW.glow(T.primaryGlow)
    hover:(color) => `0 16px 36px -8px ${color}33`,   // card hover glow
};

/* ══════════════════════════════════════════════════════════════
   ANIM — Reusable keyframe strings
   Import keyframes from @mui/material and pass these strings.

   Example:
     import { keyframes } from '@mui/material';
     const fadeUp = keyframes`${ANIM.fadeUp}`;
══════════════════════════════════════════════════════════════ */
export const ANIM = {
    fadeUp:    'from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }',
    fadeIn:    'from { opacity: 0; } to { opacity: 1; }',
    slideRight:'from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); }',
    shimmer:   '0% { background-position: 200% 0; } 100% { background-position: -200% 0; }',
    iconPop:   '0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; }',
    barGrow:   'from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; }',
    countUp:   'from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }',
    dotPulse:  '0%,100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.7); opacity: 1; }',
    pulseGlow: '0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 0 4px rgba(46,134,171,0.18); }',
};

/* ══════════════════════════════════════════════════════════════
   CARD_STYLE — Reusable glass card sx object
   Spread into Paper or Box sx props.

   Example:
     <Paper sx={{ ...CARD_STYLE, p: R.cardPadMd }}>
══════════════════════════════════════════════════════════════ */
export const CARD_STYLE = {
    bgcolor:        'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    borderRadius:   R.radiusCard,
    border:         '1px solid rgba(255,255,255,0.3)',
    boxShadow:      SHADOW.card,
    transition:     'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
        transform:  'translateY(-4px)',
        boxShadow:  '0 15px 45px -5px rgba(0,0,0,0.1)',
        borderColor:'rgba(255,255,255,0.5)',
    },
};

/* ══════════════════════════════════════════════════════════════
   STRIPE_STYLE — Left accent stripe on KPI cards
   Use with position:'relative' on the parent card.
══════════════════════════════════════════════════════════════ */
export const STRIPE_STYLE = (accent) => ({
    content:      '""',
    position:     'absolute',
    left:         0, top: '10%', bottom: '10%',
    width:        4,
    borderRadius: '0 3px 3px 0',
    bgcolor:      accent,
    transition:   'all 0.3s ease',
});

/* ══════════════════════════════════════════════════════════════
   SCROLLBAR — Thin scrollbar sx for overflow containers
══════════════════════════════════════════════════════════════ */
export const SCROLLBAR = {
    '&::-webkit-scrollbar':       { width: 5, height: 5 },
    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
    '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: 10 },
    '&::-webkit-scrollbar-thumb:hover': { bgcolor: '#94a3b8' },
};
