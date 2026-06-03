import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell,
  Area, AreaChart,
} from "recharts";
import {
  FileText, FilePlus, Clock, CheckCircle, RefreshCw,
  XCircle, DollarSign, BadgeCheck, TrendingUp, Users,
  Award, PieChart as PieIcon, Tag,
} from "lucide-react";
import {
  Box, Typography, CircularProgress, Popover, keyframes, Tooltip as MuiTooltip,
} from "@mui/material";
import DashboardHeader  from "../common/DashboardHeader";
import CommonDateFilter from "../common/CommonDateFilter";
import CurrencyToggle   from "../common/CurrencyToggle";
import { useCurrencyRates, CURRENCIES } from "../common/useCurrencyRates";
import { postRequest }  from "../api/api";
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs            from "dayjs";

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS  —  unchanged
══════════════════════════════════════════════════════════════ */
const COMPANY_ID = "2";

const _now    = dayjs();
/* ── Current financial year logic ── */
const _cYear  = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO   = `${_cYear + 1}-03-31`;

const CHART_H = typeof window !== 'undefined' && window.innerWidth < 600 ? 220 : 340;


/* ── Status Breakdown: API key → label/color map ── */
const STATUS_KEY_MAP = [
  { key: "NewQuote",                label: "New Quote",                 color: "#0f766e" },
  { key: "PendingInternalApproval", label: "Pending Internal Approval", color: "#d97706" },
  { key: "InternalApproved",        label: "Internal Approved",         color: "#059669" },
  { key: "Rework",                  label: "Rework",                    color: "#f97316" },
  { key: "Cancelled",               label: "Cancelled",                 color: "#dc2626" },
  { key: "PendingCostApproval",     label: "Pending Cost Approval",     color: "#7c3aed" },
  { key: "Approved",                label: "Approved",                  color: "#1e3a5f" },
];

/* Category colors — vibrant, fully saturated palette */
const CAT_COLORS = [
  "#4f7fc4",
  "#27ae7a",
  "#e0a820",
  "#d94f4f",
  "#6e8fc0",
  "#17a2c4",
  "#e8720c",
  "#2e9e82",
];

/* ═══════════════════════════════════════════════════════════════
   KEYFRAMES — enhanced & expanded
══════════════════════════════════════════════════════════════ */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(32px) scale(0.95); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const chartSlide = keyframes`
  from { opacity: 0; transform: translateY(40px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;
const shimmerKf = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;
const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const iconPop = keyframes`
  0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; }
  65%  { transform: scale(1.14) rotate(4deg); }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
`;
const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
const topBarSlide = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const scanLine = keyframes`
  0%   { transform: translateY(-100%); opacity: 0; }
  30%  { opacity: 0.5; }
  100% { transform: translateY(400%);  opacity: 0; }
`;
const dotPulse = keyframes`
  0%,100% { transform: scale(1);   opacity: 0.45; }
  50%      { transform: scale(1.7); opacity: 1; }
`;

/* ═══════════════════════════════════════════════════════════════
   FORMATTING HELPERS  —  unchanged
══════════════════════════════════════════════════════════════ */
/* fmtAmt / cvt now use live rates — _rates injected at call site */
let _rates = {};
const getSym = (code) => CURRENCIES.find(c => c.code === code)?.symbol ?? code;
const fmtAmt = (v, currency = "INR", rates = _rates) => {
  if (v == null) return "—";
  const code = currency.length > 1 ? currency : (currency);
  const rate = rates[code] ?? 1;
  const c = code === "INR" ? v : v * rate;
  const abs = Math.abs(c);
  const sym = getSym(code);
  if (code === "INR") {
    if (v === 0) return "₹0";
    if (abs >= 1e7) return `${sym}${(c / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${sym}${(c / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${sym}${(c / 1e3).toFixed(2)} K`;
    return `${sym}${c.toLocaleString("en-IN")}`;
  }
  if (v === 0) return `${sym}0`;
  if (abs >= 1e6) return `${sym}${(c / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sym}${(c / 1e3).toFixed(2)}K`;
  return `${sym}${c.toFixed(2)}`;
};
const fmtTick  = (cur, rates = _rates) => (v) => v ? fmtAmt(v, cur, rates) : `${getSym(cur)}0`;
const fmtCount = (v) => (v == null ? "—" : Number(v).toLocaleString("en-IN"));
const cvt      = (v, cur, rates = _rates) => {
  const code = cur.length > 1 ? cur : (cur === "$" ? "USD" : "INR");
  const rate = rates[code] ?? 1;
  return code === "INR" ? (v ?? 0) : (v ?? 0) * rate;
};

/* CurrencyToggle imported from shared component */

/* ═══════════════════════════════════════════════════════════════
   CUSTOM TOOLTIP
══════════════════════════════════════════════════════════════ */
const makeCTT = (currency) => ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "14px", p: "12px 16px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
      fontFamily: T.font, minWidth: 155,
      backdropFilter: "blur(12px)",
      animation: `${fadeUp} 0.15s ease both`,
    }}>
      <Typography sx={{ fontWeight: 700, color: "#f1f5f9", mb: 0.75, fontSize: "0.69rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.875, mt: 0.6, py: 0.2 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: p.color, flexShrink: 0, boxShadow: `0 0 8px ${p.color}` }} />
          <Typography sx={{ fontSize: "0.72rem", color: "#94a3b8" }}>{p.name}</Typography>
          <Typography sx={{ ml: "auto", fontWeight: 700, color: "#f8fafc", fontFamily: T.fontMono, fontSize: "0.7rem" }}>
            {typeof p.value === "number"
              ? (["count","qty","quotes","orders"].some(k => p.name?.toLowerCase().includes(k))
                  ? p.value.toLocaleString()
                  : fmtAmt(p.value, currency))
              : p.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SHIMMER
══════════════════════════════════════════════════════════════ */
const Shimmer = ({ width = 90, height = 24, mt = 0, radius = "6px" }) => (
  <Box sx={{
    width, height, mt, borderRadius: radius,
    background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)",
    backgroundSize: "200% 100%", animation: `${shimmerKf} 1.6s infinite`,
  }} />
);

/* ═══════════════════════════════════════════════════════════════
   CHART OVERLAY
══════════════════════════════════════════════════════════════ */
const ChartOverlay = ({ loading }) => loading ? (
  <Box sx={{
    position: "absolute", inset: 0, display: "flex", alignItems: "center",
    justifyContent: "center", bgcolor: "rgba(255,255,255,0.75)",
    borderRadius: T.radius, zIndex: 4, backdropFilter: "blur(8px)",
    animation: `${fadeIn} 0.2s ease`,
  }}>
    <Box sx={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress size={30} thickness={3.5} sx={{ color: T.primary }} />
      <CircularProgress size={18} thickness={5} sx={{ color: T.amber, position: "absolute", animation: `${gradientShift} 1.5s ease infinite` }} />
    </Box>
  </Box>
) : null;

/* ═══════════════════════════════════════════════════════════════
   STAT CARD  — rich default state + smooth lift/return
══════════════════════════════════════════════════════════════ */
const StatCard = ({ config, loading, rawValue, currency, animDelay }) => {
  const { label, Icon, color, bg, accent, isAmount } = config;
  const [hovered, setHovered] = useState(false);

  const display = useMemo(() => {
    if (rawValue == null) return "—";
    return isAmount ? fmtAmt(rawValue, currency) : fmtCount(rawValue);
  }, [rawValue, currency, isAmount]);

  const tooltipVal = useMemo(() => {
    if (rawValue == null) return null;
    const n = Number(rawValue);
    if (isNaN(n)) return null;
    return isAmount ? `₹${n.toLocaleString('en-IN')}` : n.toLocaleString('en-IN');
  }, [rawValue, isAmount]);

  return (
    <MuiTooltip
      title={tooltipVal ? (
        <Box sx={{ textAlign: 'center', px: 0.5 }}>
          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, mb: 0.6, color: 'inherit', lineHeight: 1 }}>{label}</Typography>
          <Typography sx={{ fontSize: '1.35rem', fontWeight: 800, fontFamily: T.fontMono, letterSpacing: '-0.6px', color: 'inherit', lineHeight: 1 }}>{tooltipVal}</Typography>
        </Box>
      ) : ''}
      placement="top" arrow
      componentsProps={{
        tooltip: { sx: { background: `linear-gradient(135deg, #0f172a 0%, ${accent}dd 100%)`, color: '#ffffff', borderRadius: '14px', px: 2.5, py: 1.6, minWidth: 110, boxShadow: `0 16px 40px ${accent}45, 0 4px 16px rgba(0,0,0,0.25)`, border: `1px solid ${accent}70`, backdropFilter: 'blur(10px)' } },
        arrow: { sx: { color: accent } },
      }}
    >
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        borderRadius: { xs: "14px", sm: "20px" },
        overflow: "hidden",
        p: { xs: "12px 12px 10px 14px", sm: "20px 20px 17px 22px" },
        display: "flex", flexDirection: "column",
        position: "relative",
        cursor: "default",
        willChange: "transform, box-shadow",

        /* ── Default background: white + very subtle tinted corner ── */
        background: hovered
          ? `linear-gradient(150deg, #ffffff 0%, ${accent}09 100%)`
          : `linear-gradient(150deg, #ffffff 0%, #f5f7fb 100%)`,

        /* ── Default border: visible but soft ── */
        border: `1.5px solid ${hovered ? accent + "50" : T.border}`,

        /* ── Default shadow: multi-layer for depth ── */
        boxShadow: hovered
          ? `0 22px 48px -8px ${accent}30, 0 6px 20px rgba(15,23,42,0.10), 0 0 0 4px ${accent}0e`
          : `0 2px 0px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.05)`,

        /* ── Smooth lift up / smooth return ── */
        transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
        transition: [
          "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          "box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          "border-color 0.28s ease",
          "background 0.28s ease",
        ].join(", "),

        /* entrance animation */
        animation: `${fadeUp} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
      }}
    >
      {/* ── Left accent bar (always visible, glows on hover) ── */}
      <Box sx={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: hovered ? "4px" : "3px",
        background: `linear-gradient(180deg, ${accent} 0%, ${accent}60 100%)`,
        borderRadius: "20px 0 0 20px",
        boxShadow: hovered ? `3px 0 16px ${accent}60` : `2px 0 8px ${accent}30`,
        transition: "width 0.25s ease, box-shadow 0.28s ease",
      }} />

      {/* ── Top decorative noise texture (always visible) ── */}
      <Box sx={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80,
        borderRadius: "0 20px 0 80%",
        background: `linear-gradient(135deg, ${accent}08 0%, transparent 65%)`,
        pointerEvents: "none",
        opacity: hovered ? 1.6 : 1,
        transition: "opacity 0.28s",
      }} />

      {/* ── Scan shimmer on hover ── */}
      {hovered && (
        <Box sx={{
          position: "absolute", top: 0, left: 0, right: 0, height: "35%",
          background: `linear-gradient(180deg, ${accent}0f 0%, transparent 100%)`,
          pointerEvents: "none", zIndex: 0,
          animation: `${scanLine} 1.1s ease forwards`,
          borderRadius: "20px 20px 0 0",
        }} />
      )}

      {/* ── Row 1: Icon + live dot ── */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>

        {/* Icon badge — has background, border, shadow in default state */}
        <Box sx={{
          width: { xs: 32, sm: 46 }, height: { xs: 32, sm: 46 },
          borderRadius: "13px",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, position: "relative",
          bgcolor: bg,
          border: `1.5px solid ${accent}${hovered ? "55" : "28"}`,
          boxShadow: hovered
            ? `0 0 0 7px ${accent}12, 0 6px 18px ${accent}35`
            : `0 2px 8px ${accent}22, inset 0 1px 0 ${accent}15`,
          transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.25s",
          animation: `${iconPop} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.15}s both`,
        }}>
          <Icon size={15} color={color} strokeWidth={2.1} />

          {/* Tiny inner shine on icon box */}
          <Box sx={{
            position: "absolute", top: "6px", left: "6px",
            width: 6, height: 6, borderRadius: "50%",
            bgcolor: "#ffffff", opacity: 0.55, pointerEvents: "none",
          }} />
        </Box>

        {/* Live indicator — visible always, pulses */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: "50%", bgcolor: accent,
            opacity: loading ? 0.25 : 0.85,
            animation: loading ? "none" : `${dotPulse} 2.8s ease-in-out ${animDelay * 0.5}s infinite`,
            boxShadow: `0 0 0 3px ${accent}20`,
          }} />
        </Box>
      </Box>

      {/* ── Row 2: Value ── */}
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9, mt: 0.25 }}>
          <Shimmer width="70%" height={28} />
          <Shimmer width="45%" height={10} />
        </Box>
      ) : (
        <>
          <Typography sx={{
            fontSize: { xs: "1.05rem", sm: "1.7rem" },
            fontWeight: 800,
            color: hovered ? accent : T.text,
            letterSpacing: "-0.9px",
            fontFamily: T.fontMono,
            lineHeight: 1,
            mb: 0.65,
            transition: "color 0.28s ease",
            animation: `${countUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.22}s both`,
          }}>
            {display}
          </Typography>

          {/* ── Row 3: Divider line + label ── */}
          <Box sx={{
            width: "100%", height: "1px",
            background: `linear-gradient(90deg, ${accent}${hovered ? "30" : "18"} 0%, transparent 70%)`,
            mb: 0.85,
            transition: "background 0.28s ease",
          }} />

          <Typography sx={{
            fontSize: { xs: "0.6rem", sm: "0.64rem" },
            fontWeight: 700,
            color: hovered ? T.textMuted : T.textFaint,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            lineHeight: 1.2,
            transition: "color 0.25s ease",
          }}>
            {label}
          </Typography>
        </>
      )}
    </Box>
    </MuiTooltip>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CHART CARD  — rich default state + smooth lift / return
══════════════════════════════════════════════════════════════ */
const ChartCard = ({ title, subtitle, Icon, iconBg, iconColor, accentA, accentB, loading, animDelay, children }) => (
  <Box sx={{
    background: "linear-gradient(160deg, #ffffff 0%, #f7f9ff 100%)",
    borderRadius: "20px",
    /* Visible default border — soft two-tone */
    border: `1.5px solid ${T.border}`,
    p: { xs: "16px 14px 14px", sm: "22px 20px 20px" },
    /* Visible default shadow — layered for depth */
    boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 0 rgba(15,23,42,0.03), 0 4px 20px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)`,
    position: "relative", overflow: "hidden", minWidth: 0,
    display: "flex", flexDirection: "column",
    willChange: "transform, box-shadow",
    animation: `${chartSlide} 0.65s cubic-bezier(0.34,1.2,0.64,1) ${animDelay}s both`,
    transition: [
      "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      "box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      "border-color 0.28s ease",
    ].join(", "),

    /* ── Top accent bar — always visible at 60%, brightens on hover ── */
    "&::before": {
      content: '""',
      position: "absolute", top: 0, left: 0, right: 0, height: "3px",
      background: `linear-gradient(90deg, ${accentA || T.primary}, ${accentB || "#3b82f6"}, ${accentA || T.primary})`,
      backgroundSize: "200% 100%",
      animation: `${shimmerKf} 4s linear infinite, ${topBarSlide} 0.7s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
      borderRadius: "20px 20px 0 0",
      transformOrigin: "left center",
      opacity: 0.6,
      transition: "opacity 0.3s ease, height 0.28s ease",
    },

    /* ── Corner gradient blob — faint in default, expands on hover ── */
    "&::after": {
      content: '""',
      position: "absolute", bottom: -60, right: -60,
      width: 140, height: 140, borderRadius: "50%",
      background: `radial-gradient(circle, ${(accentA || T.primary)}12 0%, transparent 68%)`,
      pointerEvents: "none",
      transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
      opacity: 0.6,
    },

    "&:hover": {
      /* Smooth lift up */
      transform: "translateY(-8px)",
      /* Richer shadow on hover */
      boxShadow: [
        `0 1px 0 rgba(255,255,255,0.9) inset`,
        `0 24px 52px -8px ${(accentA || T.primary)}25`,
        `0 8px 24px rgba(15,23,42,0.10)`,
        `0 0 0 1.5px ${(accentA || T.primary)}28`,
      ].join(", "),
      borderColor: `${(accentA || T.primary)}38`,
      "&::before": { opacity: 1, height: "4px" },
      "&::after": { transform: "scale(2.6)", opacity: 1 },
    },
  }}>
    <ChartOverlay loading={loading} />

    {/* Title row */}
    <Box sx={{ display: "flex", alignItems: "flex-start", mb: { xs: 1.5, sm: 2.5 }, gap: 1.25 }}>
      <Box sx={{
        width: { xs: 30, sm: 36 }, height: { xs: 30, sm: 36 },
        borderRadius: "10px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: iconBg, color: iconColor,
        border: `1.5px solid ${iconColor}30`,
        boxShadow: `0 2px 10px ${iconColor}28, inset 0 1px 0 ${iconColor}20`,
        animation: `${iconPop} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${animDelay + 0.12}s both`,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
        "&:hover": {
          transform: "rotate(-8deg) scale(1.12)",
          boxShadow: `0 4px 16px ${iconColor}50`,
        },
      }}>
        {Icon && <Icon size={16} strokeWidth={2.2} />}
      </Box>
      <Box>
        <Typography sx={{
          fontSize: { xs: "0.79rem", sm: "0.85rem" },
          fontWeight: 800, color: T.text, lineHeight: 1.3, letterSpacing: "-0.01em",
        }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: "0.62rem", color: T.textFaint, mt: 0.35, fontWeight: 500 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>

    {/* Body */}
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
      {loading
        ? <Shimmer width="100%" height={CHART_H} radius="12px" />
        : children}
    </Box>
  </Box>
);


/* ═══════════════════════════════════════════════════════════════
   NIGHTINGALE ROSE CHART
══════════════════════════════════════════════════════════════ */
const NightingaleRoseChart = ({ data }) => {
  const [disabled, setDisabled] = useState(new Set());
  const [hovered,  setHovered]  = useState(null);

  const toggleItem = (name) =>
    setDisabled(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const SIZE  = 360;
  const cx    = SIZE / 2;
  const cy    = SIZE / 2;
  const maxR  = 148;
  const GRIDS = 4;

  const activeMax = useMemo(() => {
    const active = data.filter(d => !disabled.has(d.name));
    return active.length ? Math.max(...active.map(d => d.value)) : 1;
  }, [data, disabled]);

  const totalItems = data.length || 1;
  const angleStep  = (2 * Math.PI) / totalItems;

  const polar = (r, a) => ({
    x: cx + r * Math.cos(a - Math.PI / 2),
    y: cy + r * Math.sin(a - Math.PI / 2),
  });

  const wedgePath = (sa, ea, outerR) => {
    const gap = 0.035;
    const s   = sa + gap / 2;
    const e   = ea - gap / 2;
    const p1  = polar(0, s);
    const p2  = polar(outerR, s);
    const p3  = polar(outerR, e);
    const p4  = polar(0, e);
    const lg  = (e - s) > Math.PI ? 1 : 0;
    return [
      `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
      `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
      `A ${outerR.toFixed(2)} ${outerR.toFixed(2)} 0 ${lg} 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
      `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} Z`,
    ].join(" ");
  };

  const fmtRadialTick = (v) => {
    if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
    if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
    return v.toFixed(0);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center" }}>
      {/* SVG rose chart moved before legend for consistency */}
      <Box sx={{ position: "relative", lineHeight: 0 }}>
        <svg
          width={SIZE} height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ overflow: "visible", maxWidth: "100%" }}
        >
          {Array.from({ length: GRIDS }, (_, lvl) => (
            <circle key={lvl} cx={cx} cy={cy}
              r={(maxR / GRIDS) * (lvl + 1)}
              fill="none" stroke="#dde3ec" strokeWidth={1}
            />
          ))}
          {Array.from({ length: GRIDS }, (_, lvl) => {
            const r   = (maxR / GRIDS) * (lvl + 1);
            const val = (activeMax / GRIDS) * (lvl + 1);
            return (
              <text key={lvl} x={cx - r - 5} y={cy + 4}
                textAnchor="end" fontSize="9.5"
                fill={T.textFaint} fontFamily={T.font}
              >
                {fmtRadialTick(val)}
              </text>
            );
          })}
          {data.map((d, i) => {
            const startAngle = i * angleStep;
            const endAngle   = (i + 1) * angleStep;
            const isOff      = disabled.has(d.name);
            const isHov      = hovered === i && !isOff;
            const color      = CAT_COLORS[i % CAT_COLORS.length];
            const outerR     = isOff ? 4 : activeMax > 0
              ? Math.max((d.value / activeMax) * maxR, 6) : 6;
            return (
              <g key={d.name}
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHov ? "scale(1.06)" : "scale(1)",
                  transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                  cursor: "pointer",
                }}
                onClick={() => toggleItem(d.name)}
                onMouseEnter={() => !isOff && setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <path
                  d={wedgePath(startAngle, endAngle, outerR)}
                  fill={isOff ? "#dde3ec" : color}
                  fillOpacity={isOff ? 0.4 : 1}
                  stroke="#ffffff" strokeWidth={1.5}
                  style={{ transition: "fill 0.28s, fill-opacity 0.28s, filter 0.25s" }}
                  filter={isHov ? `drop-shadow(0 0 8px ${color}99)` : "none"}
                />
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={3.5} fill={T.textFaint} opacity={0.35} />
        </svg>

        {hovered !== null && data[hovered] && !disabled.has(data[hovered].name) && (
          <Box sx={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            background: "linear-gradient(135deg,#0f172a,#1e293b)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "12px", p: "10px 16px",
            boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
            textAlign: "center", zIndex: 10,
            animation: `${fadeUp} 0.18s cubic-bezier(0.34,1.56,0.64,1) both`,
            minWidth: 120,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5, justifyContent: "center" }}>
              <Box sx={{
                width: 8, height: 8, borderRadius: "2px",
                bgcolor: CAT_COLORS[hovered % CAT_COLORS.length], flexShrink: 0,
                boxShadow: `0 0 8px ${CAT_COLORS[hovered % CAT_COLORS.length]}99`,
              }} />
              <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: "#94a3b8" }}>
                {data[hovered].name}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff", fontFamily: T.fontMono }}>
              {(() => {
                const v = data[hovered].value;
                const abs = Math.abs(v);
                if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
                if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
                if (abs >= 1e3) return `${(v / 1e3).toFixed(2)} K`;
                return Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });
              })()}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Clickable legend (moved to bottom) */}
      <Box sx={{
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: "5px 14px", mt: 1.5, width: "100%", px: 1,
      }}>
        {data.map((d, i) => {
          const isOff = disabled.has(d.name);
          const color = CAT_COLORS[i % CAT_COLORS.length];
          return (
            <Box
              key={d.name}
              onClick={() => toggleItem(d.name)}
              sx={{
                display: "flex", alignItems: "center", gap: "5px",
                cursor: "pointer", userSelect: "none",
                opacity: isOff ? 0.36 : 1,
                transition: "opacity 0.25s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                "&:hover": { transform: "translateY(-2px) scale(1.05)", opacity: isOff ? 0.55 : 1 },
              }}
            >
              <Box sx={{
                width: 13, height: 13, borderRadius: "3px",
                bgcolor: isOff ? T.textFaint : color, flexShrink: 0,
                transition: "background-color 0.25s",
                boxShadow: isOff ? "none" : `0 1px 6px ${color}66`,
              }} />
              <Typography sx={{
                fontSize: "0.68rem", fontWeight: 600,
                color: isOff ? T.textFaint : T.textMuted,
                transition: "color 0.25s", lineHeight: 1,
                textDecoration: isOff ? "line-through" : "none",
              }}>
                {d.name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: "0.6rem", color: T.textFaint, mt: 1, fontStyle: "italic" }}>
        Click a legend item or wedge to toggle visibility
      </Typography>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════
   STATUS BREAKDOWN DONUT
══════════════════════════════════════════════════════════════ */
const StatusDonutChart = ({ rawData, loading }) => {
  const [disabledSeg, setDisabledSeg] = useState(new Set());

  const toggleSeg = (name) =>
    setDisabledSeg(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const segments = useMemo(() => {
    if (!rawData) return [];
    const row = Array.isArray(rawData) && rawData.length ? rawData[0] : (rawData || {});
    return STATUS_KEY_MAP
      .map(m => ({ name: m.label, value: Number(row[m.key] ?? 0), color: m.color }))
      .filter(s => s.value > 0);
  }, [rawData]);

  const visibleSegments = useMemo(
    () => segments.filter(s => !disabledSeg.has(s.name)),
    [segments, disabledSeg]
  );

  const total = visibleSegments.reduce((s, d) => s + d.value, 0);

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    return (
      <text
        x={cx + r * Math.cos(-midAngle * RADIAN)}
        y={cy + r * Math.sin(-midAngle * RADIAN)}
        fill="white" textAnchor="middle" dominantBaseline="central"
        fontSize={11} fontWeight={700} fontFamily={T.font}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const DonutTip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p   = payload[0];
    const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0;
    return (
      <Box sx={{
        background: "linear-gradient(135deg,#0f172a,#1e293b)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "13px", p: "10px 15px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        fontFamily: T.font, minWidth: 175,
        animation: `${fadeUp} 0.15s ease both`,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.payload.color, flexShrink: 0, boxShadow: `0 0 8px ${p.payload.color}` }} />
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#f1f5f9" }}>{p.name}</Typography>
        </Box>
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff", fontFamily: T.fontMono }}>
          {p.value.toLocaleString("en-IN")}
          <Box component="span" sx={{ fontSize: "0.62rem", color: "#94a3b8", ml: 0.5 }}>({pct}%)</Box>
        </Typography>
      </Box>
    );
  };

  if (loading) return <Shimmer width="100%" height={CHART_H} radius={T.radiusSm} />;

  if (!segments.length) return (
    <Box sx={{ height: CHART_H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, opacity: 0.5 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/></svg>
      <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em' }}>No data available</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "center" }}>
      <Box sx={{ position: "relative", width: "100%" }}>
        <ResponsiveContainer width="100%" height={CHART_H - 10}>
          <PieChart>
            <Pie
              data={visibleSegments.length
                ? visibleSegments
                : [{ name: "No Data", value: 1, color: T.border }]}
              cx="50%" cy="50%"
              innerRadius={82} outerRadius={130}
              dataKey="value"
              paddingAngle={visibleSegments.length > 1 ? 2 : 0}
              labelLine={false}
              label={visibleSegments.length > 0 && visibleSegments[0].name !== "No Data" ? renderLabel : false}
              animationBegin={0} animationDuration={700}
            >
              {(visibleSegments.length ? visibleSegments : [{ color: T.border }]).map((e, i) => (
                <Cell key={i} fill={e.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<DonutTip />} />
          </PieChart>
        </ResponsiveContainer>

        {visibleSegments.length > 0 && (
          <Box sx={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -52%)",
            textAlign: "center", pointerEvents: "none",
          }}>
            <Typography sx={{
              fontSize: "1.4rem", fontWeight: 800, color: T.text,
              fontFamily: T.fontMono, lineHeight: 1,
              animation: `${countUp} 0.5s ease both`,
            }}>
              {total.toLocaleString("en-IN")}
            </Typography>
            <Typography sx={{
              fontSize: "0.6rem", fontWeight: 700, color: T.textFaint,
              textTransform: "uppercase", letterSpacing: "0.08em", mt: 0.5,
            }}>
              Total
            </Typography>
          </Box>
        )}
      </Box>

      {/* Clickable legend */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5, justifyContent: "center", px: 1 }}>
        {segments.map((d) => {
          const isOff = disabledSeg.has(d.name);
          return (
            <Box
              key={d.name}
              onClick={() => toggleSeg(d.name)}
              sx={{
                display: "flex", alignItems: "center", gap: 0.625,
                fontSize: "0.63rem", fontWeight: 600,
                color: isOff ? T.textFaint : T.textMuted,
                bgcolor: isOff ? "#f8fafc" : T.bg,
                borderRadius: "20px",
                px: "9px", py: "3.5px", pl: "5px",
                border: `1px solid ${isOff ? T.borderLight : T.border}`,
                cursor: "pointer", userSelect: "none",
                opacity: isOff ? 0.5 : 1,
                transition: "all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
                "&:hover": {
                  bgcolor: T.surface,
                  boxShadow: T.shadowSm,
                  transform: "translateY(-2px) scale(1.05)",
                  borderColor: isOff ? T.border : d.color,
                },
              }}
            >
              <Box sx={{
                width: 8, height: 8, borderRadius: "3px",
                bgcolor: isOff ? T.textFaint : d.color, flexShrink: 0,
                transition: "background-color 0.22s",
                boxShadow: isOff ? "none" : `0 0 6px ${d.color}66`,
              }} />
              {d.name}&nbsp;
              <Box component="strong" sx={{ color: isOff ? T.textFaint : T.text, fontFamily: T.fontMono, fontSize: "0.63rem" }}>
                {d.value.toLocaleString("en-IN")}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: "0.6rem", color: T.textFaint, mt: 1, fontStyle: "italic" }}>
        Click a legend item to toggle visibility
      </Typography>
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CARD DEFINITIONS  —  unchanged
══════════════════════════════════════════════════════════════ */
const CARD_DEFS = [
  { key: "totalQuotations",         label: "Total Quotations",           Icon: FileText,    color: T.primary, bg: T.primaryLight, accent: T.primary, isAmount: false, api: "GetTotalQuotes",               resKey: "totalquote"              },
  { key: "newQuote",                label: "New Quote",                   Icon: FilePlus,    color: T.green,   bg: T.greenLight,   accent: T.green,   isAmount: false, api: "GetNewQuotes",                 resKey: "NewQuote"                },
  { key: "pendingInternalApproval", label: "Pending Internal Approval",   Icon: Clock,       color: T.amber,   bg: T.amberLight,   accent: T.amber,   isAmount: false, api: "GetPendingInternalApproval",   resKey: "pendinginternalapproval" },
  { key: "internalApproved",        label: "Internal Approved",           Icon: CheckCircle, color: T.green,   bg: T.greenLight,   accent: T.green,   isAmount: false, api: "GetInternalApprove",           resKey: "internalapproval"        },
  { key: "rework",                  label: "Rework",                      Icon: RefreshCw,   color: T.amber,   bg: T.amberLight,   accent: T.amber,   isAmount: false, api: "GetRework",                    resKey: "rework"                  },
  { key: "rejected",                label: "Rejected / Cancelled",        Icon: XCircle,     color: T.red,     bg: T.redLight,     accent: T.red,     isAmount: false, api: "GetIsCancelled",               resKey: "cancelled"               },
  { key: "pendingCostApproval",     label: "Pending Cost Approval",       Icon: DollarSign,  color: T.purple,  bg: T.purpleLight,  accent: T.purple,  isAmount: false, api: "GetPendingForCostApproval",    resKey: "PendingCostApproval"     },
  { key: "totalApproved",           label: "Total Approved",              Icon: BadgeCheck,  color: T.primary, bg: T.primaryLight, accent: T.primary, isAmount: false, api: "GetCostApproved",              resKey: "TotalApproved"           },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT  —  all logic/keys unchanged
══════════════════════════════════════════════════════════════ */
const QuotationDashboard = () => {
  const [period,   setPeriod]   = useState("Year");
  const [fromDate, setFromDate] = useState(FY_FROM);
  const [toDate,   setToDate]   = useState(FY_TO);
  const [currency, setCurrency] = useState("INR");
  const { rates, loading: ratesLoading, updatedAt: ratesUpdatedAt, refreshRates } = useCurrencyRates();
  _rates = rates; // inject live rates into module-scope formatters
  const [loading,  setLoading]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const [rawValues, setRawValues] = useState(
    Object.fromEntries(CARD_DEFS.map(c => [c.key, null]))
  );
  const [cardLoading, setCardLoading] = useState(
    Object.fromEntries(CARD_DEFS.map(c => [c.key, false]))
  );
  const [rawCharts, setRawCharts] = useState({
    monthlyTrend:    null,
    topClients:      null,
    topSalesReps:    null,
    categoryPerf:    null,
    statusBreakdown: null,
  });
  const [chartLoading, setChartLoading] = useState({
    monthlyTrend: false, topClients: false, topSalesReps: false,
    categoryPerf: false, statusBreakdown: false,
  });

  const baseReq = useMemo(() => ({
    CompanyID: COMPANY_ID,
    FromDate:  fromDate,
    ToDate:    toDate,
    period,
  }), [fromDate, toDate, period]);

  /* ── KPI fetchers  —  unchanged ── */
  const fetchCard = useCallback(async (cardDef) => {
    setCardLoading(p => ({ ...p, [cardDef.key]: true }));
    try {
      const res = await postRequest(cardDef.api, baseReq);
      const row = Array.isArray(res?.data) && res.data.length ? res.data[0] : {};
      const val = row[cardDef.resKey] ?? row["Count"] ?? row["Total"] ?? row["TotalCount"] ?? null;
      setRawValues(p => ({ ...p, [cardDef.key]: val != null ? Number(val) : null }));
    } catch (e) { console.error(cardDef.api, e); }
    finally { setCardLoading(p => ({ ...p, [cardDef.key]: false })); }
  }, [baseReq]);

  /* ── Chart fetchers  —  unchanged ── */
  const fetchMonthlyTrend = useCallback(async () => {
    setChartLoading(p => ({ ...p, monthlyTrend: true }));
    try {
      const res  = await postRequest("GetMonthlyTrendsOfQuotationValue", baseReq);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setRawCharts(p => ({
        ...p,
        monthlyTrend: rows.map(r => ({
          month:    r.MonthName   ?? r.Month ?? r.Label ?? "",
          rawValue: Number(r.TotalQuotationValue ?? r.TotalAmount ?? 0),
        })),
      }));
    } catch (e) { console.error("GetMonthlyTrendsOfQuotationValue", e); }
    finally { setChartLoading(p => ({ ...p, monthlyTrend: false })); }
  }, [baseReq]);

  const fetchTopClients = useCallback(async () => {
    setChartLoading(p => ({ ...p, topClients: true }));
    try {
      const res  = await postRequest("GetTotalAmountByClientName", baseReq);
      const rows = (Array.isArray(res?.data) ? res.data : []).slice(0, 8);
      setRawCharts(p => ({
        ...p,
        topClients: rows.map(r => ({
          client: r.ClientName  ?? r.CustomerName ?? r.Name ?? "",
          rawVal: Number(r.QuoteValue ?? 0),
        })),
      }));
    } catch (e) { console.error("GetTotalAmountByClientName", e); }
    finally { setChartLoading(p => ({ ...p, topClients: false })); }
  }, [baseReq]);

  const fetchTopSalesReps = useCallback(async () => {
    setChartLoading(p => ({ ...p, topSalesReps: true }));
    try {
      const res  = await postRequest("GetTopSalesRepresentatives", baseReq);
      const rows = (Array.isArray(res?.data) ? res.data : []).slice(0, 8);
      setRawCharts(p => ({
        ...p,
        topSalesReps: rows.map(r => ({
          name:   r.SalespersonName ?? r.SalesRepName ?? r.Name ?? "",
          rawRev: Number(r.Revenue ?? 0),
        })),
      }));
    } catch (e) { console.error("GetTopSalesRepresentatives", e); }
    finally { setChartLoading(p => ({ ...p, topSalesReps: false })); }
  }, [baseReq]);

  const fetchCategoryPerf = useCallback(async () => {
    setChartLoading(p => ({ ...p, categoryPerf: true }));
    try {
      const res  = await postRequest("GetTotalAmountByCategoryName", baseReq);
      const rows = Array.isArray(res?.data) ? res.data : [];
      setRawCharts(p => ({
        ...p,
        categoryPerf: rows.map(r => ({
          name:   r.CategoryName ?? r.Category ?? r.Name ?? "",
          rawVal: Number(r.TotalQuotes ?? 0),
        })),
      }));
    } catch (e) { console.error("GetTotalAmountByCategoryName", e); }
    finally { setChartLoading(p => ({ ...p, categoryPerf: false })); }
  }, [baseReq]);

  const fetchStatusBreakdown = useCallback(async () => {
    setChartLoading(p => ({ ...p, statusBreakdown: true }));
    try {
      const res = await postRequest("GetQuotationStatus", baseReq);
      setRawCharts(p => ({ ...p, statusBreakdown: res?.data ?? null }));
    } catch (e) { console.error("GetQuotationStatus", e); }
    finally { setChartLoading(p => ({ ...p, statusBreakdown: false })); }
  }, [baseReq]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      ...CARD_DEFS.map(cd => fetchCard(cd)),
      fetchMonthlyTrend(), fetchTopClients(),
      fetchTopSalesReps(), fetchCategoryPerf(), fetchStatusBreakdown(),
    ]);
    setLastUpdated(new Date().toLocaleTimeString());
    setLoading(false);
  }, [fetchCard, fetchMonthlyTrend, fetchTopClients, fetchTopSalesReps, fetchCategoryPerf, fetchStatusBreakdown]);

  useEffect(() => { fetchAll(); }, [period, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Currency-converted chart data  —  unchanged ── */
  const monthlyTrendData = useMemo(
    () => (rawCharts.monthlyTrend || []).map(r => ({
      month:         r.month,
      "Quote Value": cvt(r.rawValue, currency),
    })),
    [rawCharts.monthlyTrend, currency]
  );
  const topClientsData = useMemo(
    () => (rawCharts.topClients || []).map(r => ({ client: r.client, value: cvt(r.rawVal, currency) })),
    [rawCharts.topClients, currency]
  );
  const topSalesRepsData = useMemo(
    () => (rawCharts.topSalesReps || []).map(r => ({ name: r.name, revenue: cvt(r.rawRev, currency) })),
    [rawCharts.topSalesReps, currency]
  );
  const categoryPerfData = useMemo(
    () => [...(rawCharts.categoryPerf || [])]
      .sort((a, b) => b.rawVal - a.rawVal)
      .map(r => ({ name: r.name, value: cvt(r.rawVal, currency) })),
    [rawCharts.categoryPerf, currency]
  );

  const CTT      = useMemo(() => makeCTT(currency), [currency]);
  const tickFmt  = useMemo(() => fmtTick(currency),  [currency]);
  const axisTick = { fontSize: 10.5, fill: T.textFaint, fontFamily: T.font };

  /* ════════ RENDER ════════ */
  return (
    <Box sx={{
      minHeight: "100vh",
      bgcolor: T.bg,
      fontFamily: T.font,
      /* layered dot-grid + radial gradient atmosphere */
      backgroundImage: [
        "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,58,95,0.07) 0%, transparent 70%)",
        "radial-gradient(circle, #cbd5e133 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 28px 28px",
    }}>

      {/* HEADER — unchanged */}
      <DashboardHeader
        title="Quotation Dashboard"
        lastUpdated={lastUpdated}
        onRefresh={fetchAll}
        loading={loading}
      >
        <CommonDateFilter
          period={period}   setPeriod={setPeriod}
          fromDate={fromDate} setFromDate={setFromDate}
          toDate={toDate}   setToDate={setToDate}
        />
        <CurrencyToggle
          value={currency} onChange={setCurrency}
          rates={rates} loading={ratesLoading}
          updatedAt={ratesUpdatedAt} refreshRates={refreshRates}
        />
      </DashboardHeader>
       <Box>
       
        <Box sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: { xs: "10px", sm: "12px", md: "14px" },
          mb: { xs: 2.5, sm: 3, md: 3.5 },
          alignItems: 'stretch',
        }}>
          {CARD_DEFS.map((cfg, idx) => (
            <StatCard
              key={cfg.key}
              config={cfg}
              loading={cardLoading[cfg.key]}
              rawValue={rawValues[cfg.key]}
              currency={currency}
              animDelay={0.04 + idx * 0.055}
            />
          ))}
        </Box>

        

        {/*
          Layout strategy:
          • Mobile  (xs): 1 column — each chart full width
          • Tablet  (sm): 2 columns — 2 / 1 / 2 arrangement
          • Laptop  (md): 3 columns — strict 3 per row
          • Desktop (lg+): 3 columns — fills the space
        */}
        {/* Charts: 1 col mobile → 2 col tablet → 3 col desktop, proper width for each chart */}
        <Box sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: { xs: "12px", sm: "14px", md: "16px" },
          alignItems: "stretch",
          width: "100%",
        }}>

          {/* CHART 1 — Monthly Quote Trend */}
          <ChartCard
            title="Monthly Quote Trend"
            subtitle={`Total quotation value by month (${currency})`}
            Icon={TrendingUp} iconBg={T.primaryLight} iconColor={T.primary}
            accentA={T.primary} accentB="#3b82f6"
            loading={chartLoading.monthlyTrend} animDelay={0.58}
          >
            <ResponsiveContainer width="100%" height={CHART_H}>
              <AreaChart data={monthlyTrendData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gQV" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={T.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false}/>
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={tickFmt} tick={axisTick} axisLine={false} tickLine={false} width={76}/>
                <Tooltip content={<CTT/>}/>
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: T.font, paddingTop: 10 }}/>
                <Area
                  type="monotone" dataKey="Quote Value"
                  stroke={T.primary} strokeWidth={2.8}
                  fill="url(#gQV)"
                  dot={{ r: 4, fill: T.surface, stroke: T.primary, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: T.primary, strokeWidth: 2, stroke: T.surface }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CHART 2 — Top Clients by Value */}
          <ChartCard
            title="Top Clients by Value"
            subtitle={`Quotation value by client (${currency})`}
            Icon={Users} iconBg={T.greenLight} iconColor={T.green}
            accentA={T.green} accentB="#34d399"
            loading={chartLoading.topClients} animDelay={0.65}
          >
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={topClientsData} margin={{ top: 8, right: 12, left: 16, bottom: 20 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false}/>
                <XAxis
                  dataKey="client" 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const truncated = payload.value.length > 15 ? payload.value.slice(0, 14) + '...' : payload.value;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={16} textAnchor="end" fill={T.textFaint} fontSize={9} fontWeight={600} transform="rotate(-35)">
                          {truncated}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false} tickLine={false}
                  interval={0} height={90}
                />
                <YAxis tickFormatter={tickFmt} tick={axisTick} axisLine={false} tickLine={false} width={85}/>
                <Tooltip content={<CTT/>}/>
                <Bar dataKey="value" name="Quote Value" radius={[6, 6, 0, 0]} maxBarSize={38}>
                  {topClientsData.map((_, i) => (
                    <Cell key={i} fill={`rgba(30,58,95,${0.95 - (i * 0.08)})`}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CHART 3 — Salesperson Leaderboard */}
          <ChartCard
            title="Salesperson Leaderboard"
            subtitle={`Total amount by sales rep (${currency})`}
            Icon={Award} iconBg={T.purpleLight} iconColor={T.purple}
            accentA={T.purple} accentB="#a78bfa"
            loading={chartLoading.topSalesReps} animDelay={0.72}
          >
            <ResponsiveContainer width="100%" height={CHART_H}>
              <BarChart data={topSalesRepsData} margin={{ top: 8, right: 12, left: 16, bottom: 20 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={T.borderLight} vertical={false}/>
                <XAxis
                  dataKey="name" 
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const truncated = payload.value.length > 15 ? payload.value.slice(0, 14) + '...' : payload.value;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={16} textAnchor="end" fill={T.textFaint} fontSize={9} fontWeight={600} transform="rotate(-35)">
                          {truncated}
                        </text>
                      </g>
                    );
                  }}
                  axisLine={false} tickLine={false}
                  interval={0} height={90}
                />
                <YAxis tickFormatter={tickFmt} tick={axisTick} axisLine={false} tickLine={false} width={85}/>
                <Tooltip content={<CTT/>}/>
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={38}>
                  {topSalesRepsData.map((_, i) => (
                    <Cell key={i} fill={`rgba(124,58,237,${0.95 - (i * 0.08)})`}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CHART 4 — Category Performance */}
          <ChartCard
            title="Category Performance"
            subtitle={`Total quotation amount by category (${currency})`}
            Icon={Tag} iconBg={T.amberLight} iconColor={T.amber}
            accentA={T.amber} accentB="#fbbf24"
            loading={chartLoading.categoryPerf} animDelay={0.79}
          >
            {categoryPerfData.length > 0 ? (
              <NightingaleRoseChart data={categoryPerfData} currency={currency} />
            ) : (
              <Box sx={{ height: CHART_H, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, opacity: 0.5 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#94a3b8" strokeWidth="1.5"/></svg>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.04em' }}>No data available</Typography>
              </Box>
            )}
          </ChartCard>

          {/* CHART 5 — Status Breakdown */}
          <ChartCard
            title="Status Breakdown"
            subtitle="Quotation count by status"
            Icon={PieIcon} iconBg={T.purpleLight} iconColor={T.purple}
            accentA={T.purple} accentB="#a78bfa"
            loading={false}
            animDelay={0.86}
          >
            <StatusDonutChart
              rawData={rawCharts.statusBreakdown}
              loading={chartLoading.statusBreakdown}
              currency={currency}
            />
          </ChartCard>

        </Box>{/* end analytics grid */}
      </Box>{/* end page body */}
    </Box>
  );
};

export default QuotationDashboard;