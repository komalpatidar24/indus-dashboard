import React, { useState } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
  Area, AreaChart, LineChart, Line,
  PieChart, Pie, Cell, ReferenceLine, ComposedChart
} from "recharts";
import {
  BookOpen, Layers, Settings, Trash2, IndianRupee,
  Clock, Truck, ShieldAlert, TrendingUp, Info, ChevronRight,
  TrendingDown, CheckCircle2, AlertCircle
} from "lucide-react";
import { Box, Typography, CircularProgress, keyframes, LinearProgress } from "@mui/material";
import DashboardHeader  from "../common/DashboardHeader";
import CommonDateFilter from "../common/CommonDateFilter";
import { postRequest }  from "../api/api";
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';


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
const topBarSlide = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const iconPop = keyframes`
  0%   { transform: scale(0.6) rotate(-12deg); opacity: 0; }
  65%  { transform: scale(1.14) rotate(4deg); }
  100% { transform: scale(1)   rotate(0deg);  opacity: 1; }
`;
const shimmerKf = keyframes`
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;
const pulseGlow = keyframes`
  0%,100% { opacity: 0.6; }
  50%      { opacity: 1; }
`;
const countUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const scanLine = keyframes`
  0%   { transform: translateY(-100%); opacity: 0; }
  30%  { opacity: 0.5; }
  100% { transform: translateY(400%);  opacity: 0; }
`;
const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const KPI_CONFIG = [
  { key: "totalBooks",      label: "TOTAL BOOKS PRODUCED", Icon: BookOpen,     color: T.purple, bg: T.purpleLight },
  { key: "totalSheets",     label: "TOTAL SHEETS PRINTED",  Icon: Layers,       color: T.sky,    bg: T.skyLight },
  { key: "machineUtil",     label: "MACHINE UTILISATION",   Icon: Settings,     color: T.green,  bg: T.greenLight },
  { key: "paperWastage",    label: "PAPER WASTAGE",         Icon: Trash2,       color: T.red,    bg: T.redLight },
  { key: "avgCost",         label: "AVG COST PER BOOK",     Icon: IndianRupee, color: T.amber,  bg: T.amberLight },
  { key: "machineDowntime", label: "MACHINE DOWNTIME",      Icon: Clock,        color: T.amber,  bg: T.amberLight },
  { key: "onTimeDispatch",  label: "ON-TIME DISPATCH",      Icon: Truck,        color: T.sky,    bg: T.skyLight },
  { key: "qualityRejection",label: "QUALITY REJECTION",     Icon: ShieldAlert, color: T.purple, bg: T.purpleLight },
];


const StatCard = ({ config, data, loading, delay }) => {
  const { label, Icon, color: accent, bg } = config;
  const { value = "—", trend = "0%", isPositive = true } = data || {};
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        borderRadius: "20px",
        overflow: "hidden",
        p: { xs: "16px 16px 14px 18px", sm: "20px 20px 17px 22px" },
        display: "flex", flexDirection: "column",
        position: "relative",
        cursor: "default",
        willChange: "transform, box-shadow",

        background: hovered
          ? `linear-gradient(150deg, #ffffff 0%, ${accent}09 100%)`
          : `linear-gradient(150deg, #ffffff 0%, #f5f7fb 100%)`,

        border: `1.5px solid ${hovered ? accent + "50" : T.border}`,

        /* ── Shadow ── */
        boxShadow: hovered
          ? `0 22px 48px -8px ${accent}30, 0 6px 20px rgba(15,23,42,0.10), 0 0 0 4px ${accent}0e`
          : `0 2px 0px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.05)`,

        transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.28s ease, background 0.28s ease",

        animation: `${fadeUp} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
      }}
    >
      {/* ── Left accent bar ── */}
      <Box sx={{
        position: "absolute", top: 0, left: 0, bottom: 0,
        width: hovered ? "4px" : "3px",
        background: `linear-gradient(180deg, ${accent} 0%, ${accent}60 100%)`,
        borderRadius: "20px 0 0 20px",
        boxShadow: hovered ? `3px 0 16px ${accent}60` : `2px 0 8px ${accent}30`,
        transition: "width 0.25s ease, box-shadow 0.28s ease",
      }} />

      {/* ── decorative noise ── */}
      <Box sx={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80,
        borderRadius: "0 20px 0 80%",
        background: `linear-gradient(135deg, ${accent}08 0%, transparent 65%)`,
        pointerEvents: "none",
        opacity: hovered ? 1.6 : 1,
        transition: "opacity 0.28s",
      }} />

      {/* ── Scan shimmer ── */}
      {hovered && (
        <Box sx={{
          position: "absolute", top: 0, left: 0, right: 0, height: "35%",
          background: `linear-gradient(180deg, ${accent}0f 0%, transparent 100%)`,
          pointerEvents: "none", zIndex: 0,
          animation: `${scanLine} 1.1s ease forwards`,
          borderRadius: "20px 20px 0 0",
        }} />
      )}

      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{
          width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 },
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
          animation: `${iconPop} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.15}s both`,
        }}>
          <Icon size={19} color={accent} strokeWidth={2.1} />
          <Box sx={{ position: "absolute", top: "6px", left: "6px", width: 6, height: 6, borderRadius: "50%", bgcolor: "#ffffff", opacity: 0.55 }} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.3 }}>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            bgcolor: isPositive ? "#ecfdf5" : "#fef2f2",
            px: 1, py: 0.3, borderRadius: "6px",
            border: `1px solid ${isPositive ? "#d1fae5" : "#fee2e2"}`,
            transition: "all 0.2s ease",
          }}>
            {isPositive ? <TrendingUp size={10} color={T.green} /> : <TrendingDown size={10} color={T.red} />}
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: isPositive ? T.green : T.red }}>
              {trend}
            </Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9, mt: 0.25 }}>
          <Box sx={{ width: "70%", height: 28, bgcolor: T.borderLight, borderRadius: "6px", animation: `${pulseGlow} 1.5s ease-in-out infinite` }} />
          <Box sx={{ width: "45%", height: 10, bgcolor: T.borderLight, borderRadius: "4px", animation: `${pulseGlow} 1.5s ease-in-out infinite 0.5s` }} />
        </Box>
      ) : (
        <>
          <Typography sx={{
            fontSize: { xs: "1.5rem", sm: "1.7rem" },
            fontWeight: 800,
            color: hovered ? accent : T.text,
            letterSpacing: "-0.9px",
            fontFamily: T.fontMono,
            lineHeight: 1,
            mb: 0.65,
            transition: "color 0.28s ease",
            animation: `${countUp} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.22}s both`,
          }}>
            {value}
          </Typography>

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
  );
};

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

const ChartCard = ({ title, subtitle, icon: Icon, iconColor = T.primary, iconBg = T.primaryLight, accentA = T.primary, accentB = "#3b82f6", children, loading, delay = 0 }) => (
  <Box sx={{
    background: "linear-gradient(160deg, #ffffff 0%, #f7f9ff 100%)",
    borderRadius: "20px",
    border: `1.5px solid ${T.border}`,
    p: { xs: "16px 14px 14px", sm: "22px 20px 20px" },
    boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 0 rgba(15,23,42,0.03), 0 4px 20px rgba(15,23,42,0.07), 0 1px 4px rgba(15,23,42,0.04)`,
    position: "relative", overflow: "hidden", minWidth: 0,
    display: "flex", flexDirection: "column",
    willChange: "transform, box-shadow",
    animation: `${chartSlide} 0.65s cubic-bezier(0.34,1.2,0.64,1) ${delay}s both`,
    transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s cubic-bezier(0.34,1.56,0.64,1), border-color 0.28s ease",

    "&::before": {
      content: '""',
      position: "absolute", top: 0, left: 0, right: 0, height: "3px",
      background: `linear-gradient(90deg, ${accentA}, ${accentB}, ${accentA})`,
      backgroundSize: "200% 100%",
      animation: `${shimmerKf} 4s linear infinite, ${topBarSlide} 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}s both`,
      borderRadius: "20px 20px 0 0",
      transformOrigin: "left center",
      opacity: 0.6,
      transition: "opacity 0.3s ease, height 0.28s ease",
    },

    "&::after": {
      content: '""',
      position: "absolute", bottom: -60, right: -60,
      width: 140, height: 140, borderRadius: "50%",
      background: `radial-gradient(circle, ${accentA}12 0%, transparent 68%)`,
      pointerEvents: "none",
      transition: "transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
      opacity: 0.6,
    },

    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: `0 1px 0 rgba(255,255,255,0.9) inset, 0 24px 52px -8px ${accentA}25, 0 8px 24px rgba(15,23,42,0.10), 0 0 0 1.5px ${accentA}28`,
      borderColor: `${accentA}38`,
      "&::before": { opacity: 1, height: "4px" },
      "&::after": { transform: "scale(2.6)", opacity: 1 },
    },
  }}>
    <ChartOverlay loading={loading} />

    <Box sx={{ display: "flex", alignItems: "flex-start", mb: { xs: 1.5, sm: 2.5 }, gap: 1.25 }}>
      <Box sx={{
        width: { xs: 30, sm: 36 }, height: { xs: 30, sm: 36 },
        borderRadius: "10px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: iconBg, color: iconColor,
        border: `1.5px solid ${iconColor}30`,
        boxShadow: `0 2px 10px ${iconColor}28, inset 0 1px 0 ${iconColor}20`,
        animation: `${iconPop} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${delay + 0.12}s both`,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
        "&:hover": {
          transform: "rotate(-8deg) scale(1.12)",
          boxShadow: `0 4px 16px ${iconColor}50`,
        },
      }}>
        {Icon && <Icon size={15} />}
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

    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {children}
    </Box>
  </Box>
);

const ScorecardTable = ({ data = [] }) => (
  <Box sx={{ width: "100%", mt: 1 }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: `1px solid ${T.border}`, pb: 1, mb: 1.5 }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase" }}>Metric Category</Typography>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", textAlign: "center" }}>Current (FY25)</Typography>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", textAlign: "center" }}>Previous (FY24)</Typography>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", textAlign: "right" }}>Trend</Typography>
    </Box>
    {data.map((m, i) => (
      <Box key={i} sx={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", py: 2, borderBottom: i === data.length - 1 ? "none" : `1px solid ${T.borderLight}`, alignItems: "center" }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: T.text }}>{m.category}</Typography>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.text, textAlign: "center" }}>{m.current}</Typography>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: T.textFaint, textAlign: "center" }}>{m.previous}</Typography>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: (m.trend || "").startsWith('+') ? T.green : ((m.trend || "").startsWith('-') ? T.red : T.green), textAlign: "right" }}>
          {m.trend}
        </Typography>
      </Box>
    ))}
  </Box>
);

const ComplianceScore = ({ score }) => (
  <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
    <Box sx={{ position: "relative", width: 180, height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={[{ value: score }, { value: 100 - score }]}
            innerRadius={65}
            outerRadius={85}
            startAngle={90}
            endAngle={450}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={T.sky} />
            <Cell fill={T.borderLight} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <Box sx={{ 
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        textAlign: "center"
      }}>
        <Typography sx={{ fontSize: "2.5rem", fontWeight: 800, color: T.text, lineHeight: 1 }}>{score}%</Typography>
        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", mt: 0.5 }}>Score</Typography>
      </Box>
    </Box>
    
    <Box sx={{ width: "100%", mt: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint, textTransform: "uppercase" }}>Audit Health</Typography>
        <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.green, textTransform: "uppercase" }}>Optimal</Typography>
      </Box>
      <LinearProgress 
        variant="determinate" 
        value={92} 
        sx={{ 
          height: 8, borderRadius: 4, bgcolor: T.borderLight,
          "& .MuiLinearProgress-bar": { bgcolor: T.sky, borderRadius: 4 }
        }} 
      />
      <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: T.textFaint, textAlign: "center", mt: 1.5, textTransform: "uppercase" }}>
        Section 11 Governance Overlap
      </Typography>
    </Box>
  </Box>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */

const MomYoyDashboard = () => {
  const [period,   setPeriod]   = useState("This Year");
  const [fromDate, setFromDate] = useState(null);
  const [toDate,   setToDate]   = useState(null);
  const [loading,  setLoading]  = useState(true);

  /* ── Dashboard States ── */
  const [kpiData,          setKpiData]          = useState({});
  const [scorecardData,    setScorecardData]    = useState([]);
  const [utilisationData,  setUtilisationData]  = useState([]);
  const [costData,         setCostData]         = useState([]);
  const [productionData,   setProductionData]   = useState([]);
  const [wastageData,      setWastageData]      = useState([]);
  const [complianceScore, setComplianceScore] = useState(0);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const payload = { 
        FromDate: fromDate ? fromDate.format("YYYY-MM-DD") : "2024-04-01", 
        ToDate: toDate ? toDate.format("YYYY-MM-DD") : "2025-03-31" 
      };

      // Note: Replace these with your actual API endpoints
      const [kpis, scorecard, utilisation, cost, production, wastage] = await Promise.all([
        postRequest("GetMomYoyKpiData", payload),
        postRequest("GetPerformanceScorecard", payload),
        postRequest("GetUtilisationTrend", payload),
        postRequest("GetCostPerBook", payload),
        postRequest("GetProductionVolume", payload),
        postRequest("GetPaperWastage", payload),
      ]);

      setKpiData(kpis || {});
      setScorecardData(scorecard || []);
      setUtilisationData(utilisation || []);
      setCostData(cost || []);
      setProductionData(production || []);
      setWastageData(wastage || []);
      setComplianceScore(kpis.complianceScore || 0);

    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const axisStyle = { fontSize: 10, fontWeight: 600, fill: T.textFaint, fontFamily: T.font };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: T.bg, 
      p: 0, // NO PADDING as requested
      overflowX: "hidden"
    }}>
      <DashboardHeader 
        title="Annual Performance Dashboard" 
        subtitle="FY 2024-25 Board-Level Oversight"
      >
        <CommonDateFilter 
          period={period} setPeriod={setPeriod}
          fromDate={fromDate} setFromDate={setFromDate}
          toDate={toDate} setToDate={setToDate}
        />
      </DashboardHeader>

      <Box sx={{ p: "0px 10px 20px" }}> {/* Minimal side padding for the grid itself if needed, but the request was NO padding in dashboard page. I'll stick to 0 for the outer container and let the grid manage internal gaps. */}
        
        {/* KPI CARDS GRID — Fixed to 4 per row on large screens */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { 
            xs: "1fr 1fr", 
            sm: "repeat(2, 1fr)", 
            md: "repeat(4, 1fr)", 
            lg: "repeat(4, 1fr)" 
          },
          gap: 1.5,
          mb: 3,
          px: { xs: 1, sm: 1.5, md: 2 }
        }}>
          {KPI_CONFIG.map((cfg, idx) => (
            <StatCard 
              key={cfg.key} 
              config={cfg} 
              data={kpiData[cfg.key]} 
              loading={loading} 
              delay={idx * 0.05} 
            />
          ))}
        </Box>

        {/* TOP SECTION: SCORECARD + COMPLIANCE */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 2,
          mb: 3,
          px: { xs: 1, sm: 1.5, md: 2 }
        }}>
          <ChartCard 
            title="Annual Performance Scorecard" 
            subtitle="FY 2024-25 Board-Level Oversight"
            loading={loading}
            delay={0.4}
            icon={CheckCircle2}
            iconColor={T.sky}
            iconBg={T.skyLight}
          >
            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: T.textFaint }}>KEY PERFORMANCE METRICS TABLE</Typography>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: T.sky, cursor: "pointer" }}>DETAILS</Typography>
            </Box>
            <ScorecardTable data={scorecardData} />
          </ChartCard>
          
          <ChartCard 
            title="Compliance Readiness"
            loading={loading}
            delay={0.45}
            icon={ShieldAlert}
            iconColor={T.purple}
            iconBg={T.purpleLight}
          >
            <ComplianceScore score={complianceScore} />
          </ChartCard>
        </Box>

        {/* MIDDLE SECTION: TRENDS */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
          px: { xs: 1, sm: 1.5, md: 2 }
        }}>
          <ChartCard 
            title="Machine Utilisation Trend" 
            subtitle="Rolling 12-Month Performance Index"
            loading={loading}
            delay={0.5}
            icon={Settings}
            iconColor={T.sky}
            iconBg={T.skyLight}
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={utilisationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} domain={[40, 100]} />
                <Tooltip />
                <ReferenceLine y={80} stroke={T.green} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="SM-102 (4-COL)" stroke={T.sky} strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="GTO-52 (1-COL)" stroke={T.textFaint} strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <Box sx={{ display: "flex", gap: 2, mt: 2, justifyContent: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderRadius: "10px", bgcolor: T.bg, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.textFaint }}>SM-102 (4-COL)</Typography>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.sky }}>81.4% AVG</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderRadius: "10px", bgcolor: T.bg, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: T.textFaint }}>GTO-52 (1-COL)</Typography>
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint }}>56.2% AVG</Typography>
              </Box>
            </Box>
          </ChartCard>

          <ChartCard 
            title="Monthly Cost Per Book" 
            subtitle="FY25 vs FY24 Unit Cost Progression"
            loading={loading}
            delay={0.55}
            icon={IndianRupee}
            iconColor={T.amber}
            iconBg={T.amberLight}
            accentA={T.amber}
            accentB={T.amberLight}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} domain={[7, 10]} />
                <Tooltip />
                <Bar dataKey="FY25" fill={T.sky} radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="FY24" fill={T.border} radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
            <Box sx={{ 
              mt: 2, bgcolor: "#0f172a", p: 1.5, borderRadius: "8px", 
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: T.sky }} />
                <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>Strategic Goal Reached</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#fff" }}>TOTAL SAVINGS: ₹19.2L</Typography>
            </Box>
          </ChartCard>
        </Box>

        {/* BOTTOM SECTION: VOLUME + WASTAGE */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2,
          mb: 3,
          px: { xs: 1, sm: 1.5, md: 2 }
        }}>
          <ChartCard 
            title="Monthly Production Volume" 
            subtitle="Books Produced (000s) — FY25 vs FY24"
            loading={loading}
            delay={0.6}
            icon={BookOpen}
            iconColor={T.purple}
            iconBg={T.purpleLight}
            accentA={T.purple}
            accentB={T.purpleLight}
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={productionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFY25" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.sky} stopOpacity={0.1}/>
                    <stop offset="95%" stopColor={T.sky} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} />
                <Tooltip />
                <Area type="monotone" dataKey="FY25" stroke={T.sky} strokeWidth={3} fillOpacity={1} fill="url(#colorFY25)" />
                <Area type="monotone" dataKey="FY24" stroke={T.border} strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2, p: 1.5, borderRadius: "8px", border: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint, textTransform: "uppercase" }}>+11.3% Growth Reached</Typography>
              <ChevronRight size={16} color={T.textFaint} />
            </Box>
          </ChartCard>

          <ChartCard 
            title="Paper Wastage % Trend" 
            subtitle="Wastage vs 3% Target Benchmark"
            loading={loading}
            delay={0.65}
            icon={Trash2}
            iconColor={T.red}
            iconBg={T.redLight}
            accentA={T.red}
            accentB={T.redLight}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={wastageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={axisStyle} />
                <YAxis axisLine={false} tickLine={false} tick={axisStyle} domain={[0, 7]} />
                <Tooltip />
                <ReferenceLine y={3} stroke={T.red} strokeDasharray="3 3" />
                <Line type="stepAfter" dataKey="wastage" stroke={T.sky} strokeWidth={3} dot={{ r: 4, fill: T.sky }} />
              </ComposedChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2, p: 1.5, borderRadius: "10px", bgcolor: T.bg, border: `1px solid ${T.borderLight}`, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                Annual Saving vs FY24 = Approx. ₹3.2 Lakhs. Monthly Improvement Stable.
              </Typography>
            </Box>
          </ChartCard>
        </Box>

      </Box>
    </Box>
  );
};

export default MomYoyDashboard;