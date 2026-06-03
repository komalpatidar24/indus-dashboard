import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell,
  Area, AreaChart,
} from "recharts";
import {
  FileText, Clock, CheckCircle, AlertCircle, TrendingUp,
  Truck, ShoppingCart, DollarSign, Activity, Users,
  BarChart2, Filter, ChevronRight, Package, Calendar,
  PieChart as PieIcon, RefreshCw
} from "lucide-react";
import {
  Box, Typography, CircularProgress, keyframes,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Popover, Tooltip as MuiTooltip
} from "@mui/material";
import DashboardHeader from "../common/DashboardHeader";
import CommonDateFilter from "../common/CommonDateFilter";
import { postRequest } from "../api/api";
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from "dayjs";

const COMPANY_ID = localStorage.getItem("CompanyID")
const CHART_H = 340;

const _now = dayjs();
const _cYear = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM = `${_cYear}-04-01`;
const FY_TO = `${_cYear + 1}-03-31`;

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
const sectionReveal = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const lineGrow = keyframes`
  from { transform: scaleX(0); opacity: 0; }
  to   { transform: scaleX(1); opacity: 1; }
`;
const dotPulse = keyframes`
  0%,100% { transform: scale(1);   opacity: 0.45; }
  50%      { transform: scale(1.7); opacity: 1; }
`;

const fmtAmt = (v) => {
  if (v == null) return "₹0";
  const abs = Math.abs(v);
  const sym = "₹";
  if (abs >= 1e7) return `${sym}${(v / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sym}${(v / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sym}${(v / 1e3).toFixed(2)} K`;
  return `${sym}${v.toLocaleString("en-IN")}`;
};

const fmtCount = (v) => (v == null ? "—" : Number(v).toLocaleString("en-IN"));


const Shimmer = ({ width = 90, height = 24, mt = 0, radius = "6px" }) => (
  <Box sx={{
    width, height, mt, borderRadius: radius,
    background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)",
    backgroundSize: "200% 100%", animation: `${shimmerKf} 1.6s infinite`,
  }} />
);

const ChartOverlay = ({ loading }) => loading ? (
  <Box sx={{
    position: "absolute", inset: 0, display: "flex", alignItems: "center",
    justifyContent: "center", bgcolor: "rgba(255,255,255,0.75)",
    borderRadius: T.radius, zIndex: 4, backdropFilter: "blur(8px)",
    animation: `${fadeIn} 0.2s ease`,
  }}>
    <CircularProgress size={30} thickness={4} sx={{ color: T.primary }} />
  </Box>
) : null;

const StatCard = ({ config, loading, rawValue, animDelay, isAmount = false }) => {
  const { label, Icon, color, bg, accent } = config;
  const [hovered, setHovered] = useState(false);

  const display = useMemo(() => {
    if (rawValue == null) return "—";
    return isAmount ? fmtAmt(rawValue) : fmtCount(rawValue);
  }, [rawValue, isAmount]);

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
        borderRadius: { xs: "14px", sm: "20px" }, overflow: "hidden",
        p: { xs: "12px 12px 10px 14px", sm: "20px 20px 17px 20px" },
        display: "flex", flexDirection: "column", position: "relative",
        cursor: "default", willChange: "transform, box-shadow",
        background: hovered
          ? `linear-gradient(150deg, #ffffff 0%, ${accent}09 100%)`
          : `linear-gradient(150deg, #ffffff 0%, #f5f7fb 100%)`,
        border: `1.5px solid ${hovered ? accent + "50" : T.border}`,
        boxShadow: hovered
          ? `0 22px 48px -8px ${accent}30, 0 6px 20px rgba(15,23,42,0.10), 0 0 0 4px ${accent}0e`
          : `0 2px 0px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.05)`,
        transform: hovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        animation: `${fadeUp} 0.55s cubic-bezier(0.34,1.56,0.64,1) ${animDelay}s both`,
      }}
    >
      <Box sx={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: hovered ? "4px" : "3px",
        background: `linear-gradient(180deg, ${accent} 0%, ${accent}60 100%)`,
        borderRadius: "20px 0 0 20px", transition: "width 0.25s ease",
      }} />
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{
          width: { xs: 40, sm: 46 }, height: { xs: 40, sm: 46 }, borderRadius: "13px",
          display: "flex", alignItems: "center", justifyContent: "center", bgcolor: bg,
          border: `1.5px solid ${accent}${hovered ? "55" : "28"}`,
          boxShadow: hovered ? `0 6px 18px ${accent}35` : `0 2px 8px ${accent}22`,
          transform: hovered ? "scale(1.1) rotate(-5deg)" : "scale(1) rotate(0deg)",
          transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <Icon size={19} color={color} strokeWidth={2.1} />
        </Box>
        <Box sx={{
          width: 6, height: 6, borderRadius: "50%", bgcolor: accent,
          animation: loading ? "none" : `${dotPulse} 2.8s ease-in-out infinite`,
          boxShadow: `0 0 0 3px ${accent}20`,
        }} />
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
          <Shimmer width="70%" height={28} />
          <Shimmer width="45%" height={10} />
        </Box>
      ) : (
        <>
          <Typography sx={{
            fontSize: { xs: "1.1rem", sm: "1.6rem" }, fontWeight: 800, color: hovered ? accent : T.text,
            letterSpacing: "-0.5px", fontFamily: T.fontMono, lineHeight: 1, mb: 0.65, transition: "color 0.28s ease",
          }}>
            {display}
          </Typography>
          <Box sx={{ width: "100%", height: "1px", background: `linear-gradient(90deg, ${accent}${hovered ? "30" : "18"} 0%, transparent 70%)`, mb: 0.85 }} />
          <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </Typography>
        </>
      )}
    </Box>
    </MuiTooltip>
  );
};

// eslint-disable-next-line no-unused-vars
const ChartCard = ({ title, Icon, accentA, accentB, loading, animDelay, children }) => (
  <Box sx={{
    background: "linear-gradient(160deg, #ffffff 0%, #f7f9ff 100%)", borderRadius: "20px",
    border: `1.5px solid ${T.border}`, p: { xs: "16px 14px 14px", sm: "22px 20px 20px" },
    boxShadow: `0 4px 20px rgba(15,23,42,0.07)`, position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column", transition: "all 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    animation: `${chartSlide} 0.65s cubic-bezier(0.34,1.2,0.64,1) ${animDelay}s both`,
    "&::before": {
      content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px",
      background: `linear-gradient(90deg, ${accentA}, ${accentB}, ${accentA})`,
      backgroundSize: "200% 100%", animation: `${shimmerKf} 4s linear infinite`, opacity: 0.6,
    },
    "&:hover": {
      transform: "translateY(-8px)",
      boxShadow: `0 24px 52px -8px ${accentA}25, 0 8px 24px rgba(15,23,42,0.10)`,
      borderColor: `${accentA}38`,
      "&::before": { opacity: 1, height: "4px" },
    },
  }}>
    <ChartOverlay loading={loading} />
    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2.5, gap: 1.25 }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: `${accentA}12`, color: accentA, border: `1.5px solid ${accentA}30`,
      }}>
        <Icon size={16} />
      </Box>
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, color: T.text, mt: 0.5, textTransform: "uppercase", letterSpacing: "0.02em" }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ flex: 1, minHeight: 300 }}>{children}</Box>
  </Box>
);

const SectionLabel = ({ children, delay = 0 }) => (
  <Box sx={{
    display: "flex", alignItems: "center", gap: 1.5, mb: 2,
    animation: `${sectionReveal} 0.5s ease ${delay}s both`,
  }}>
    <Box sx={{ width: 4, height: 18, borderRadius: "4px", background: `linear-gradient(180deg, ${T.primary}, ${T.sky})`, boxShadow: `2px 0 10px ${T.primaryGlow}` }} />
    <Typography sx={{ fontSize: "0.64rem", fontWeight: 900, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.14em" }}>
      {children}
    </Typography>
    <Box sx={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${T.border} 0%, transparent 100%)`, animation: `${lineGrow} 0.7s ease ${delay + 0.1}s both` }} />
  </Box>
);

const ProcurementDashbaord = () => {
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(dayjs().format("HH:mm:ss"));
  const [period, setPeriod] = useState("Year");
  const [fromDate, setFromDate] = useState(FY_FROM);
  const [toDate, setToDate] = useState(FY_TO);

  const [kpiData, setKpiData] = useState({
    OpenPOs: 0, OverduePOs: 0, InTransit: 0, TotalValueToday: 0,
    POApproved: 0, PendingApprovalPOs: 0, ThisMonthPO: 0
  });

  const [poDistribution, setPoDistribution] = useState([]);
  const [overdueTrend, setOverdueTrend] = useState([]);
  const [supplierRisk, setSupplierRisk] = useState([]);
  const [recentPOs, setRecentPOs] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const payload = {
        CompanyID: COMPANY_ID,
        FromDate: dayjs(fromDate).format("YYYY-MM-DD"),
        ToDate: dayjs(toDate).format("YYYY-MM-DD")
      };

      const [c1, c2, cpa, cmtd, prep, drep, srep] = await Promise.all([
        postRequest("GetDataCard1", payload),
        postRequest("GetDataCard2", payload),
        postRequest("GetPOPendingApproval", payload),
        postRequest("GetMonthtoDatePOs", payload),
        postRequest("GetPendingPurchaseOrderReport", payload),
        postRequest("GetDailyPurchaseOrdersReport", payload),
        postRequest("GetSupplierPerformanceReport", payload)
      ]);

      const d1 = c1?.data?.[0] || {};
      const d2 = c2?.data?.[0] || {};
      const dpa = cpa?.data?.[0] || {};
      const dmtd = cmtd?.data?.[0] || {};

      setKpiData({
        OpenPOs: d1.OpenPOs || 0,
        OverduePOs: d1.OverduePOs || 0,
        InTransit: d1.InTransit || 0,
        TotalValueToday: d2.TotalValueToday || 0,
        POApproved: d2.POApproved || 0,
        PendingApprovalPOs: dpa.PendingApprovalPOs || 0,
        ThisMonthPO: dmtd.ThisMonthPO || 0
      });

      const pData = prep?.data || [];
      const statuses = pData.reduce((acc, curr) => {
        const s = curr.Status || "Other";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      setPoDistribution(Object.entries(statuses).map(([name, value]) => ({ name, value })));
      setRecentPOs(pData.slice(0, 10));

      const dData = drep?.data || [];
      const trend = dData.reduce((acc, curr) => {
        const d = dayjs(curr.VoucherDate).format("MMM DD");
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});
      setOverdueTrend(Object.entries(trend).map(([date, count]) => ({ date, count })));

      const sData = srep?.data || [];
      setSupplierRisk(sData.map(s => ({
        name: s.SupplierName,
        onTime: s.OnTimeDelivery || 0,
        risk: s.Quality_Rejection_Percentage || 0
      })).slice(0, 8));

      setLastUpdated(dayjs().format("HH:mm:ss"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const KPI_CONFIGS = [
    { label: "Open POs", Icon: ShoppingCart, color: T.sky, bg: T.skyLight, accent: T.sky },
    { label: "Overdue POs", Icon: Clock, color: T.red, bg: T.redLight, accent: T.red },
    { label: "In Transit", Icon: Truck, color: T.teal, bg: T.tealLight, accent: T.teal },
    { label: "Total Value Today", Icon: DollarSign, color: T.primary, bg: T.primaryLight, accent: T.primary, isAmount: true },
    { label: "PO Approved", Icon: CheckCircle, color: T.green, bg: T.greenLight, accent: T.green },
    { label: "Pending Approval", Icon: AlertCircle, color: T.amber, bg: T.amberLight, accent: T.amber },
    { label: "This Month PO", Icon: TrendingUp, color: T.purple, bg: T.purpleLight, accent: T.purple },
  ];

  return (
    <Box sx={{
      minHeight: "100vh", bgcolor: T.bg, fontFamily: T.font,
      backgroundImage: [
        "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30,58,95,0.07) 0%, transparent 70%)",
        "radial-gradient(circle, #cbd5e133 1px, transparent 1px)",
      ].join(", "),
      backgroundSize: "100% 100%, 28px 28px",
    }}>
      <DashboardHeader
        title="Procurement Dashboard"
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        loading={loading}
      >
        <CommonDateFilter
          period={period} setPeriod={setPeriod}
          fromDate={fromDate} setFromDate={setFromDate}
          toDate={toDate} setToDate={setToDate}
        />
      </DashboardHeader>

      <Box sx={{ p: R.pagePad }}>
        <Box sx={{
          display: "grid", gap: { xs: 1.5, md: 2.5 }, mb: { xs: 3, md: 5 },
          gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(2,1fr)", md: "repeat(4,1fr)", lg: "repeat(7,1fr)" }
        }}>
          {KPI_CONFIGS.map((cfg, i) => (
            <StatCard
              key={i} config={cfg} loading={loading} animDelay={0.2 + i * 0.05}
              rawValue={Object.values(kpiData)[i]} isAmount={cfg.isAmount}
            />
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 2fr" }, gap: 3, mb: 4 }}>
          <ChartCard title="PO Status Distribution" Icon={PieIcon} accentA={T.primary} accentB={T.sky} loading={loading} animDelay={0.7}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <PieChart>
                <Pie
                  data={poDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={115}
                  paddingAngle={6}
                  cornerRadius={10}
                  dataKey="value"
                  stroke="none"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {poDistribution.map((entry, index) => {
                    const statusColors = {
                      'pending': T.amber,
                      'delayed': T.red,
                      'completed': T.green,
                      'partially': T.teal,
                      'in transit': T.sky,
                      'approved': T.primary,
                    };
                    const color = Object.entries(statusColors).find(([k]) => 
                      entry.name.toLowerCase().includes(k)
                    )?.[1] || [T.primary, T.teal, T.amber, T.red, T.purple][index % 5];
                    
                    return <Cell key={`cell-${index}`} fill={color} style={{ filter: `drop-shadow(0 4px 6px ${color}20)` }} />;
                  })}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Box sx={{ 
                          bgcolor: "rgba(255,255,255,0.96)", p: "12px 16px", borderRadius: "14px", 
                          boxShadow: T.shadowLg, border: `1.5px solid ${payload[0].payload.fill}20`,
                          backdropFilter: "blur(10px)"
                        }}>
                          <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.textFaint, textTransform: "uppercase", mb: 0.5 }}>
                            {payload[0].name}
                          </Typography>
                          <Typography sx={{ fontSize: "1.2rem", fontWeight: 900, color: T.text, fontFamily: T.fontMono }}>
                            {payload[0].value} <span style={{ fontSize: "0.75rem", fontWeight: 600, color: T.textFaint }}>Order{payload[0].value !== 1 ? 's' : ''}</span>
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                  <tspan x="50%" dy="-0.6em" fontSize="2.2rem" fontWeight="900" fill={T.text} style={{ fontFamily: T.fontMono }}>
                    {poDistribution.reduce((a, b) => a + b.value, 0)}
                  </tspan>
                  <tspan x="50%" dy="1.6em" fontSize="0.65rem" fontWeight="800" fill={T.textFaint} style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Total Orders
                  </tspan>
                </text>
                <Legend 
                  verticalAlign="bottom" 
                  height={40} 
                  iconType="circle" 
                  iconSize={8}
                  wrapperStyle={{ 
                    fontSize: "0.65rem", 
                    fontWeight: 800, 
                    textTransform: "uppercase", 
                    letterSpacing: "0.05em",
                    paddingTop: "15px"
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Purchase Orders Report" Icon={Activity} accentA={T.red} accentB={T.amber} loading={loading} animDelay={0.8}>
            <ResponsiveContainer width="100%" height={CHART_H}>
              <AreaChart data={overdueTrend}>
                <defs>
                  <linearGradient id="clr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.red} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: T.textFaint, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: T.textFaint, fontWeight: 700 }} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: T.shadowMd }} />
                <Area type="monotone" dataKey="count" stroke={T.red} strokeWidth={3} fillOpacity={1} fill="url(#clr)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 3, mb: 4 }}>
          <ChartCard title="Supplier Performance Report" Icon={Users} accentA={T.teal} accentB={T.primary} loading={loading} animDelay={0.9}>
            <ResponsiveContainer width="100%" height={CHART_H + 60}>
              <BarChart data={supplierRisk} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderLight} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={160} tick={{ fontSize: 10, fill: T.text, fontWeight: 800 }} />
                <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: T.shadowMd }} />
                <Legend verticalAlign="top" align="right" />
                <Bar dataKey="onTime" name="On-Time Delivery %" fill={T.teal} radius={[0, 4, 4, 0]} barSize={18} />
                <Bar dataKey="risk" name="Quality Rejection %" fill={T.amber} radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>

        <SectionLabel delay={1.0}>Recent Purchase Orders</SectionLabel>
        <Box sx={{
          background: "linear-gradient(160deg, #fff, #f9fafb)", borderRadius: "20px", border: `1.5px solid ${T.border}`,
          overflow: "hidden", boxShadow: T.shadowMd, animation: `${fadeUp} 0.8s ease backwards 1.1s`,
          "&:hover": { boxShadow: T.shadowLg, borderColor: T.primary + "30" }
        }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: "#fafcfe" }}>
                <TableRow>
                  {["PO Number", "Supplier Name", "Item Description", "Status", "Expected Date"].map(h => (
                    <TableCell key={h} sx={{ fontSize: "0.65rem", fontWeight: 900, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", py: 2.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5}><Shimmer width="100%" height={40} /></TableCell></TableRow>
                  ))
                ) : (
                  recentPOs.map((po, i) => (
                    <TableRow key={i} sx={{ "&:hover": { bgcolor: "rgba(30,58,95,0.02)" }, transition: "background 0.2s" }}>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 800, color: T.primary }}>{po.PurchaseVoucherNo}</TableCell>
                      <TableCell sx={{ fontSize: "0.78rem", fontWeight: 700, color: T.text }}>{po.LedgerName}</TableCell>
                      <TableCell sx={{ fontSize: "0.72rem", color: T.textMuted, maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{po.ItemName}</TableCell>
                      <TableCell>
                        <Box sx={{
                          display: "inline-flex", px: 1.5, py: 0.5, borderRadius: "6px", fontSize: "0.6rem", fontWeight: 900, textTransform: "uppercase",
                          bgcolor: po.Status?.toLowerCase().includes("delay") ? T.redLight : T.greenLight,
                          color: po.Status?.toLowerCase().includes("delay") ? T.red : T.green,
                          border: `1px solid ${po.Status?.toLowerCase().includes("delay") ? T.red + "20" : T.green + "20"}`
                        }}>
                          {po.Status || "Active"}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", fontWeight: 700, color: T.textFaint }}>
                        {po.ExpectedDeliveryDate ? dayjs(po.ExpectedDeliveryDate).format("DD MMM YYYY") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </Box>
  );
};

export default ProcurementDashbaord;