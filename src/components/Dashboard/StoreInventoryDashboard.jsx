import React, { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, BarChart, Bar,
    PieChart, Pie, Cell, AreaChart, Area, ReferenceLine
} from "recharts";
import {
    Clock, Activity, Package, FileText, Settings, Layers, TrendingUp,
    PieChart as PieIcon, AlertTriangle, RefreshCw, Box as BoxIcon, Filter, X
} from "lucide-react";
import {
    Box, Typography, CircularProgress, keyframes,
    Button, Paper, Chip, ButtonGroup, Dialog, DialogTitle,
    DialogContent, IconButton, Slide
} from "@mui/material";
import DashboardHeader from '../common/DashboardHeader';
import CommonDateFilter from '../common/CommonDateFilter';
import { postRequest } from '../api/api';
import { T, R, GRID, CHART_H as CH, FONT, SHADOW } from '../common/dashboardTokens';
import dayjs from 'dayjs';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});


/* ── Keyframes ── */
const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
`;
const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;
const iconPop = keyframes`
    0%   { transform: scale(0.6); opacity: 0; }
    100% { transform: scale(1);   opacity: 1; }
`;
const shimmerKf = keyframes`
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
`;

/* ── Formatters ── */
const fmtAmt = (v) => {
    if (v == null) return "—";
    const c = Math.abs(v);
    if (c >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
    if (c >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
    if (c >= 1e3) return `₹${(v / 1e3).toFixed(2)} K`;
    return `₹${v.toLocaleString("en-IN")}`;
};
const fmtCount = (v) => (v == null ? "—" : Number(v).toLocaleString("en-IN"));

/* ── UI Components ── */
const Shimmer = ({ width = "100%", height = 24, radius = "6px", mt = 0 }) => (
    <Box sx={{
        width, height, borderRadius: radius, mt,
        background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf5 50%,#f1f5f9 75%)",
        backgroundSize: "200% 100%", animation: `${shimmerKf} 1.6s infinite`,
    }} />
);

const ChartOverlay = ({ loading }) => loading ? (
    <Box sx={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", bgcolor: "rgba(255,255,255,0.7)",
        borderRadius: T.radius, zIndex: 10, backdropFilter: "blur(4px)",
        animation: `${fadeIn} 0.2s ease`,
    }}>
        <CircularProgress size={32} thickness={4} sx={{ color: T.primary }} />
    </Box>
) : null;

// eslint-disable-next-line no-unused-vars
const StatCard = ({ label, value, color, bg, accent, loading, animDelay, Icon }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <Box
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            sx={{
                borderRadius: { xs: '14px', sm: T.radius },
                p: { xs: '12px 12px 10px 14px', sm: '14px 16px' },
                position: "relative", cursor: "default",
                background: hovered ? `linear-gradient(150deg, #ffffff 0%, ${accent}09 100%)` : "#ffffff",
                border: `1.5px solid ${hovered ? accent + "50" : T.border}`,
                boxShadow: hovered ? T.shadowMd : T.shadowSm,
                transform: hovered ? "translateY(-4px)" : "translateY(0)",
                transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                animation: `${fadeUp} 0.5s ease ${animDelay}s both`,
                overflow: "hidden"
            }}
        >
            <Box sx={{
                position: "absolute", top: 0, left: 0, bottom: 0, width: "4px",
                bgcolor: accent, transform: hovered ? "scaleY(1)" : "scaleY(0.4)",
                transition: "transform 0.3s ease"
            }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Box sx={{
                    width: { xs: 30, sm: 34 }, height: { xs: 30, sm: 34 }, borderRadius: "10px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    bgcolor: bg, color, border: `1px solid ${color}20`,
                    boxShadow: `0 4px 12px ${color}15`,
                    animation: `${iconPop} 0.4s ease ${animDelay + 0.1}s both`,
                }}>
                    <Icon size={15} />
                </Box>
            </Box>
            {loading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Shimmer width="60%" height={20} />
                    <Shimmer width="40%" height={10} />
                </Box>
            ) : (
                <>
                    <Typography sx={{ fontSize: { xs: '1.05rem', sm: '1.35rem' }, fontWeight: 850, color: T.text, lineHeight: 1, mb: 0.5, fontFamily: T.fontMono, letterSpacing: "-0.5px" }}>{value}</Typography>
                    <Typography sx={{ fontSize: { xs: '0.58rem', sm: '0.68rem' }, fontWeight: 700, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
                </>
            )}
        </Box>
    );
};

// eslint-disable-next-line no-unused-vars
const ChartCard = ({ title, accent, children, loading, animDelay, action, scrollable, minWidth, Icon }) => (
    <Box sx={{
        bgcolor: "#ffffff", borderRadius: { xs: '14px', sm: T.radius },
        p: { xs: '14px 12px 12px', sm: '22px' },
        border: `1.5px solid ${T.border}`, boxShadow: T.shadowSm,
        position: "relative", overflow: "hidden",
        animation: `${fadeUp} 0.6s ease ${animDelay}s both`,
        transition: "all 0.3s ease",
        "&:hover": { boxShadow: T.shadowMd, borderColor: `${accent}40`, transform: "translateY(-4px)" }
    }}>
        <ChartOverlay loading={loading} />
        <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: `linear-gradient(90deg, ${accent}, ${accent}80)` }} />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: { xs: 28, sm: 34 }, height: { xs: 28, sm: 34 }, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${accent}10`, color: accent, border: `1px solid ${accent}25`, flexShrink: 0 }}><Icon size={14} /></Box>
                <Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.85rem' }, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</Typography>
            </Box>
            {action && <Box>{action}</Box>}
        </Box>
        <Box sx={{
            height: { xs: 240, sm: 300 }, position: "relative",
            ...(scrollable && {
                overflowX: 'auto', overflowY: 'hidden',
                '&::-webkit-scrollbar': { height: '6px' },
                '&::-webkit-scrollbar-thumb': { backgroundColor: T.border, borderRadius: '4px' }
            })
        }}>
            <Box sx={{ height: '100%', minWidth: minWidth || '100%', position: 'relative' }}>{children}</Box>
        </Box>
    </Box>
);



const EmptyState = ({ small = false }) => (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: small ? 80 : "100%", gap: 1.5, opacity: 0.6 }}>
        <BoxIcon size={small ? 24 : 40} color={T.textFaint} />
        <Typography sx={{ fontSize: small ? "0.65rem" : "0.75rem", color: T.textFaint, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Data Found</Typography>
    </Box>
);

// eslint-disable-next-line no-unused-vars
const ExpandModal = ({ open, onClose, title, color, children, icon: Icon }) => (
    <Dialog
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={onClose}
        TransitionComponent={Transition}
        PaperProps={{
            sx: {
                borderRadius: "24px",
                bgcolor: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(20px)",
                border: `1.5px solid ${T.borderLight}`,
                boxShadow: T.shadowLg,
                overflow: 'hidden'
            }
        }}
    >
        <DialogTitle sx={{ 
            p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${T.borderLight}`, bgcolor: "rgba(255,255,255,0.5)" 
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                    width: 40, height: 40, borderRadius: "12px", 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    bgcolor: `${color}10`, color: color, border: `1px solid ${color}20`
                }}>
                    <Icon size={20} />
                </Box>
                <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: T.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {title}
                </Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: T.textFaint, '&:hover': { color: T.red, bgcolor: T.redLight } }}>
                <X size={20} />
            </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
            <Box sx={{ p: 3 }}>
                {children}
            </Box>
        </DialogContent>
    </Dialog>
);

const CT = ({ active, payload, label, cur = false }) => {
    if (!active || !payload?.length) return null;
    return (
        <Box sx={{ 
            bgcolor: "rgba(15, 23, 42, 0.94)", 
            p: "14px 18px", 
            borderRadius: "16px", 
            boxShadow: "0 12px 48px rgba(0,0,0,0.25)", 
            backdropFilter: "blur(12px)", 
            border: "1px solid rgba(255,255,255,0.12)",
            minWidth: 200,
            zIndex: 100
        }}>
            <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: "0.6rem", fontWeight: 900, mb: 1, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Details
            </Typography>
            <Typography sx={{ color: "#fff", fontSize: "0.78rem", fontWeight: 800, mb: 1.5, lineHeight: 1.2 }}>
                {label}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {payload.map((e, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "2px", bgcolor: e.color || e.fill, boxShadow: `0 0 8px ${e.color || e.fill}BF` }} />
                            <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 600 }}>{e.name}</Typography>
                        </Box>
                        <Typography sx={{ color: "#fff", fontSize: "0.72rem", fontWeight: 900, fontFamily: T.fontMono }}>
                            {cur ? fmtAmt(e.value) : fmtCount(e.value)}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

/* ── Helpers ── */
const getD = (r) => { const body = r?.data || r; return (Array.isArray(body) ? body[0] : body) || {}; };
const getA = (r) => { const body = r?.data || r; return body?.Response || body?.Data || body?.Table || (Array.isArray(body) ? body : []); };
const getV = (obj, keys) => {
    if (!obj) return undefined;
    for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; }
    return undefined;
};

const _now      = dayjs();
const _cYear    = (_now.month() + 1) >= 4 ? _now.year() : _now.year() - 1;
const FY_FROM   = `${_cYear}-04-01`;
const FY_TO     = `${_cYear + 1}-03-31`;

const StoreInventoryDashboard = () => {
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
    const [period, setPeriod] = useState('Year');
    const [fromDate, setFromDate] = useState(FY_FROM);
    const [toDate, setToDate] = useState(FY_TO);
    const [companyId] = useState(localStorage.getItem("CompanyID") || '2');

    const [toggles, setToggles] = useState({
        paperIssueChart: false,
        invOverviewChart: false,
        minStockChart: false,
        sparePartsChart: false,
        deadStockChart: false,
        alertsTable: false,
        movementTable: false,
        stagnantTable: false,
    });

    const [data, setData] = useState({
        kpis: {
            deadStockItems: { val: 0 },
            totalValueBlocked: { val: 0 },
            oldestItem: { val: '—', sub: '' },
            critical: { val: 0 },
            warning: { val: 0 },
            sinceLastOrder: { val: 0, sub: '' },
        },
        paperIssueByMachine: [],
        inventoryStatus:     [],
        minStockAlerts:      [],
        sparePartsByMachine: [],
        deadStockValue:      [],
        riskAlerts:          [],
        movementAudit:       [],
        stagnantAssets:      [],
    });

    const [modals, setModals] = useState({ movement: false, stagnant: false, alerts: false });
    const toggle = (key) => setToggles(p => ({ ...p, [key]: !p[key] }));
    const toggleModal = (key) => setModals(p => ({ ...p, [key]: !p[key] }));
    const sl = (arr, key) => {
        if (!Array.isArray(arr)) return [];
        return toggles[key] ? arr : arr.slice(0, 5);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const pl = { CompanyID: companyId, FromDate: fromDate, ToDate: toDate };

            const [
                deadStockRes, totalValueRes, oldestItemRes, criticalRes, warningRes,
                daysSinceOrderRes, paperIssueRes, invStatusRes, minStockAlertRes,
                sparePartsRes, deadStockValueRes
            ] = await Promise.all([
                postRequest('GetDeadStockItems', pl),
                postRequest('GetItemsBelowMinimumFYear', pl),
                postRequest('GetOldestItem', pl),
                postRequest('GetCritical', pl),
                postRequest('GetWarning', pl),
                postRequest('GetDaysSinceLastOrder', pl),
                postRequest('GetPaperIssuebyMachine', pl),
                postRequest('GetInventoryStatusOverview', pl),
                postRequest('GetInventoryStatusOverview', pl),
                postRequest('GetSparePartsConsumptionbyMachine', pl),
                postRequest('GetDeadStockValueBreakdown', pl)
            ]);

            const deadStockArr  = getA(deadStockRes);
            const deadStockData = getD(deadStockRes);
            const totalValueArr = getA(totalValueRes);
            const totalValueData= getD(totalValueRes);
            const oldestData    = getD(oldestItemRes);
            const criticalArr   = getA(criticalRes);
            const criticalData  = getD(criticalRes);
            const warningArr    = getA(warningRes);
            const warningData   = getD(warningRes);
            const daysSinceData = getD(daysSinceOrderRes);

            const paperIssueArr = getA(paperIssueRes).map(i => {
                const machine = getV(i, ['MachineName', 'machineName', 'Machine', 'machine']) || 'Unknown';
                const sheets  = Number(getV(i, ['IssueQuantity', 'issueQty', 'Quantity', 'sheets', 'Sheets']) || 0);
                return { machine, sheets };
            }).sort((a,b) => b.sheets - a.sheets);

            const invStatusArr = getA(invStatusRes).map(i => {
                const name = getV(i, ['ItemGroupName', 'ItemName', 'Name']) || 'Unknown';
                const open = Number(getV(i, ['TotalPhysicalStock', 'OpeningStock', 'Opening']) || 0);
                const cons = Number(getV(i, ['TotalFloorStock', 'ConsumedStock', 'Consumed']) || 0);
                const clos = Number(getV(i, ['TotalPhysicalStock', 'ClosingStock', 'Closing']) || (open - cons));
                const min  = Number(getV(i, ['MinLevel', 'MinimumLevel', 'MinQty']) || 0);
                return { name, opening: open, consumed: cons, closing: clos, minLevel: min };
            }).sort((a,b) => b.closing - a.closing);

            const minAlertArr = getA(minStockAlertRes).map(i => {
                const name  = getV(i, ['ItemGroupName', 'ItemName', 'Name']) || 'Unknown';
                const val   = Number(getV(i, ['CurrentStock', 'TotalPhysicalStock', 'ClosingStock', 'Stock', 'value']) || 0);
                const min   = Number(getV(i, ['MinLevel', 'MinimumLevel', 'MinQty']) || 0);
                const days  = getV(i, ['DaysLeft', 'daysLeft', 'Days']);
                const stat  = (getV(i, ['Status', 'status']) || 'WARNING').toUpperCase();
                return { name, value: val, min, daysLeft: days, status: stat };
            }).sort(a => (a.status === 'CRITICAL' ? -1 : 1));

            const sparePartsArr = getA(sparePartsRes).map(i => {
                const m = getV(i, ['MachineName', 'machineName', 'Machine', 'machine']);
                const v = getV(i, ['IssueValue', 'issueValue', 'Value', 'value', 'Cost', 'cost']);
                return { machine: m || 'Other', cost: Number(v || 0) };
            }).reduce((acc, i) => {
                const existing = acc.find(a => a.machine === i.machine);
                if (existing) { existing.cost += i.cost; } else { acc.push({ ...i }); }
                return acc;
            }, []).sort((a,b) => b.cost - a.cost);

            const deadValueArr = getA(deadStockValueRes).map(i => {
                const name = getV(i, ['ItemName', 'itemName', 'Name', 'name']) || 'Unknown';
                const days = Number(getV(i, ['DaysInStore', 'daysInStore', 'Days', 'days', 'UnusedDays']) || 0);
                const val  = Number(getV(i, ['Quantity', 'qty', 'Value', 'Amount', 'TotalValue']) || 0);
                return { name, days, value: val };
            }).sort((a,b) => b.days - a.days);

            const resolveCount = (data, arr, field) => Number(data?.[field] || data?.TotalCount || arr?.length || 0);

            setData({
                kpis: {
                    deadStockItems: { val: resolveCount(deadStockData, deadStockArr, 'DeadStockItemOver100days') },
                    totalValueBlocked: { val: resolveCount(totalValueData, totalValueArr, 'ItemsBelowMinimumFyear') },
                    oldestItem: { val: oldestData?.DaysInStore ? `${oldestData.DaysInStore}d` : '—' },
                    critical: { val: resolveCount(criticalData, criticalArr, 'ItemsBelowMinimumFyear') },
                    warning: { val: resolveCount(warningData, warningArr, 'ItemsBelowMinimumFyear') },
                    sinceLastOrder: { val: Number(daysSinceData?.DaysSinceLastOrder || 0) },
                },
                paperIssueByMachine: paperIssueArr,
                inventoryStatus:     invStatusArr,
                minStockAlerts:      minAlertArr,
                sparePartsByMachine: sparePartsArr,
                deadStockValue:      deadValueArr,
                riskAlerts:          minAlertArr,
                movementAudit:       invStatusArr,
                stagnantAssets:      deadValueArr,
            });

            setLastUpdated(new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Inventory Fetch Error:', e);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, [period, fromDate, toDate]);

    const txc = { fontSize: 8.5, fontWeight: 700, fill: T.textFaint, fontFamily: T.fontMono };
    const TD = ({ children, s = {} }) => (
        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderLight}`, fontSize: "0.7rem", color: T.text, fontWeight: 600, whiteSpace: 'nowrap', ...s }}>{children}</td>
    );

    const kpiDefs = [
        { label: "Dead Stock Items",      value: fmtCount(data.kpis.deadStockItems.val),     Icon: AlertTriangle, color: T.red,     bg: T.redLight,     accent: T.red },
        { label: "Internal Min Alerts",   value: fmtCount(data.kpis.totalValueBlocked.val), Icon: Clock,         color: T.amber,   bg: T.amberLight,   accent: T.amber },
        { label: "Oldest Item Stock",     value: data.kpis.oldestItem.val,                  Icon: Activity,      color: T.sky,     bg: T.skyLight,     accent: T.sky },
        { label: "Critical Stock (<5d)",  value: fmtCount(data.kpis.critical.val),          Icon: TrendingUp,    color: T.red,     bg: T.redLight,     accent: T.red },
        { label: "Warning (5–10d)",       value: fmtCount(data.kpis.warning.val),           Icon: Package,       color: T.amber,   bg: T.amberLight,   accent: T.amber },
        { label: "Since Last Order",      value: `${data.kpis.sinceLastOrder.val}d`,        Icon: RefreshCw,     color: T.primary, bg: T.primaryLight, accent: T.primary },
    ];

    const MovementTable = ({ full = false }) => (
        <Box sx={{ overflowX: 'auto', width: '100%' }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
            <thead><tr style={{ background: "#fcfdfe" }}>{["Item", "Opening", "Consumed", "Closing"].map(h => (<th key={h} style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.62rem", fontWeight: 900, color: T.textFaint, textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
            <tbody>{(full ? data.movementAudit : data.movementAudit.slice(0, 5)).length === 0 ? (<tr><td colSpan={4}><EmptyState small /></td></tr>) : (full ? data.movementAudit : data.movementAudit.slice(0, 5)).map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <TD s={{ fontWeight: 800 }}>{row.name}</TD>
                    <TD>{fmtCount(row.opening)}</TD>
                    <TD s={{ color: T.red, fontWeight: 800 }}>-{fmtCount(row.consumed)}</TD>
                    <TD s={{ color: T.green, fontWeight: 800 }}>{fmtCount(row.closing)}</TD>
                </tr>
            ))}</tbody>
        </table></Box>
    );

    const StagnantTable = ({ full = false }) => (
        <Box sx={{ overflowX: 'auto', width: '100%' }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
            <thead><tr style={{ background: "#fcfdfe" }}>{["Item", "Unused Days", "Value", "Action"].map(h => (<th key={h} style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.62rem", fontWeight: 900, color: T.textFaint, textTransform: "uppercase" }}>{h}</th>))}</tr></thead>
            <tbody>{(full ? data.stagnantAssets : data.stagnantAssets.slice(0, 5)).length === 0 ? (<tr><td colSpan={4}><EmptyState small /></td></tr>) : (full ? data.stagnantAssets : data.stagnantAssets.slice(0, 5)).map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}` }}>
                    <TD s={{ fontWeight: 800, color: T.text }}>{row.name}</TD>
                    <TD s={{ fontFamily: T.fontMono, fontWeight: 700 }}>{row.days || '—'} Days</TD>
                    <TD s={{ fontWeight: 900, color: T.primary }}>{fmtAmt(row.value)}</TD>
                    <TD><Button size="small" variant="outlined" sx={{ fontSize: "0.58rem", fontWeight: 900, px: 1, py: 0.2, minWidth: 0, borderRadius: "6px", borderColor: T.border, color: T.textMuted, '&:hover': { bgcolor: T.skyLight, color: T.sky, borderColor: T.sky } }}>LIQUIDATE</Button></TD>
                </tr>
            ))}</tbody>
        </table></Box>
    );

    const AlertTableFull = ({ full = false }) => (
        <Box sx={{ overflowX: 'auto', width: '100%' }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead><tr style={{ background: "#fcfdfe" }}>{["Item Name", "Current Stock", "Min Level", "Days Left", "Status"].map(h => (<th key={h} style={{ padding: "16px 24px", textAlign: "left", fontSize: "0.62rem", fontWeight: 900, color: T.textFaint, textTransform: "uppercase", letterSpacing: "0.1em" }}>{h}</th>))}</tr></thead>
            <tbody>{(full ? data.riskAlerts : data.riskAlerts.slice(0, 5)).length === 0 ? (<tr><td colSpan={5}><EmptyState small /></td></tr>) : (full ? data.riskAlerts : data.riskAlerts.slice(0, 5)).map((row, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.borderLight}`, transition: "background 0.2s" }} className="table-row-hover">
                    <TD s={{ fontWeight: 800, color: T.primary }}>{row.name}</TD>
                    <TD>{fmtCount(row.value)}</TD>
                    <TD s={{ color: T.textMuted }}>{fmtCount(row.min)}</TD>
                    <TD s={{ color: row.status === 'CRITICAL' ? T.red : T.amber, fontWeight: 800, fontFamily: T.fontMono }}>{row.daysLeft || '—'}</TD>
                    <TD><Chip label={row.status} size="small" sx={{ height: 20, fontSize: "0.58rem", fontWeight: 900, bgcolor: row.status === 'CRITICAL' ? T.redLight : T.amberLight, color: row.status === 'CRITICAL' ? T.red : T.amber, borderRadius: "6px" }} /></TD>
                </tr>
            ))}</tbody>
        </table></Box>
    );

    return (
        <Box sx={{ bgcolor: T.bg, minHeight: '100vh', pb: 4, width: '100%', boxSizing: 'border-box' }}>
            <DashboardHeader title="Store & Inventory" lastUpdated={lastUpdated} onRefresh={fetchData} loading={loading}>
                <CommonDateFilter period={period} setPeriod={setPeriod} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
            </DashboardHeader>

            <Box sx={{ p: R.pagePad, boxSizing: 'border-box' }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" }, gap: { xs: '10px', sm: '12px' }, mb: { xs: 2, sm: 3 } }}>
                    {kpiDefs.map((k, i) => ( <StatCard key={i} {...k} loading={loading} animDelay={i * 0.05} /> ))}
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }, gap: "28px", mb: 4 }}>
                    {/* Charts remain the same */}
                    <ChartCard title="Paper Issue (Sheets)" Icon={FileText} accent={T.red} loading={loading} animDelay={0.1} 
                        action={ data.paperIssueByMachine.length > 5 && ( <Button size="small" variant="outlined" sx={{ borderRadius: "8px", px: 2, fontSize: '0.65rem', color: T.textMuted, borderColor: T.border, fontWeight: 800 }} onClick={() => toggle('paperIssueChart')}> {toggles.paperIssueChart ? "Top 5" : "View All"} </Button> ) }
                        scrollable={toggles.paperIssueChart} minWidth={toggles.paperIssueChart ? `${data.paperIssueByMachine.length * 70 + 100}px` : undefined}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sl(data.paperIssueByMachine, 'paperIssueChart')} margin={{ top: 20, bottom: 45, left: -20, right: 10 }}>
                                <defs>
                                    <linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={T.red} stopOpacity={1} />
                                        <stop offset="100%" stopColor={T.red} stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="machine" tick={txc} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={65} />
                                <YAxis tick={txc} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: "rgba(220, 38, 38, 0.04)" }} content={<CT />} />
                                <Bar dataKey="sheets" fill="url(#gRed)" barSize={24} radius={[6, 6, 0, 0]} animationDuration={2000} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Inventory Overview" Icon={Layers} accent={T.primary} loading={loading} animDelay={0.2}
                        action={ data.inventoryStatus.length > 5 && ( <Button size="small" variant="outlined" sx={{ borderRadius: "8px", px: 2, fontSize: '0.65rem', color: T.textMuted, borderColor: T.border, fontWeight: 800 }} onClick={() => toggle('invOverviewChart')}> {toggles.invOverviewChart ? "Top 5" : "View All"} </Button> ) }
                        scrollable={toggles.invOverviewChart} minWidth={toggles.invOverviewChart ? `${data.inventoryStatus.length * 90 + 100}px` : undefined}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sl(data.inventoryStatus, 'invOverviewChart')} margin={{ top: 20, bottom: 45, left: -20, right: 10 }} barGap={6}>
                                <defs>
                                    <linearGradient id="gPri" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={T.primary} stopOpacity={1} />
                                        <stop offset="100%" stopColor={T.primary} stopOpacity={0.5} />
                                    </linearGradient>
                                    <linearGradient id="gAmb" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={T.amber} stopOpacity={1} />
                                        <stop offset="100%" stopColor={T.amber} stopOpacity={0.5} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={T.borderLight} />
                                <XAxis dataKey="name" tick={txc} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={65} />
                                <YAxis tick={txc} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: "rgba(30, 58, 95, 0.04)" }} content={<CT />} />
                                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: 15, fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase" }} />
                                <Bar dataKey="closing" name="Closing" fill="url(#gPri)" barSize={12} radius={[3, 3, 0, 0]} />
                                <Bar dataKey="minLevel" name="Min Level" fill="url(#gAmb)" barSize={12} radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Stock Alert Priority" Icon={AlertTriangle} accent={T.amber} loading={loading} animDelay={0.3}
                        action={ data.minStockAlerts.length > 5 && ( <Button size="small" variant="outlined" sx={{ borderRadius: "8px", px: 2, fontSize: '0.65rem', color: T.textMuted, borderColor: T.border, fontWeight: 800 }} onClick={() => toggle('minStockChart')}> {toggles.minStockChart ? "Top 5" : "View All"} </Button> ) }
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={sl(data.minStockAlerts, 'minStockChart').sort((a,b)=>a.value - b.value)} margin={{ left: 30, right: 50, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderLight} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={({ x, y, payload }) => (
                                    <g transform={`translate(${x},${y})`}>
                                        <text x={0} y={0} dy={4} textAnchor="end" fill={T.textFaint} fontSize={8.5} fontWeight={800}>
                                            {payload.value.length > 12 ? `${payload.value.substring(0, 10)}...` : payload.value}
                                        </text>
                                    </g>
                                )} width={90} />
                                <Tooltip cursor={{ fill: "rgba(217, 119, 6, 0.04)" }} content={<CT />} />
                                <Bar dataKey="value" name="Current Stock" barSize={14} radius={[0, 4, 4, 0]}>
                                    {sl(data.minStockAlerts, 'minStockChart').map((e, idx) => ( 
                                        <Cell key={idx} fill={e.status === 'CRITICAL' ? T.red : T.amber} fillOpacity={0.9} style={{ filter: `drop-shadow(2px 0 4px ${e.status === 'CRITICAL' ? T.red : T.amber}33)` }} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Spare Parts Consumption" Icon={Settings} accent={T.purple} loading={loading} animDelay={0.4}
                        action={ data.sparePartsByMachine.length > 5 && ( <Button size="small" variant="outlined" sx={{ borderRadius: "8px", px: 2, fontSize: '0.65rem', color: T.textMuted, borderColor: T.border, fontWeight: 800 }} onClick={() => toggle('sparePartsChart')}> {toggles.sparePartsChart ? "Top 5" : "View All"} </Button> ) }
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={sl(data.sparePartsByMachine, 'sparePartsChart')} margin={{ left: 30, right: 60, top: 10, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="gPurp" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={T.purple} stopOpacity={0.6} />
                                        <stop offset="100%" stopColor={T.purple} stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderLight} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="machine" type="category" axisLine={false} tickLine={false} tick={txc} width={90} />
                                <Tooltip cursor={{ fill: "rgba(124, 58, 237, 0.04)" }} content={<CT cur />} />
                                <Bar dataKey="cost" name="Issue Value" fill="url(#gPurp)" barSize={14} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Dead Stock Analysis" Icon={PieIcon} accent={T.red} loading={loading} animDelay={0.5}
                        action={ data.deadStockValue.length > 5 && ( <Button size="small" variant="outlined" sx={{ borderRadius: "8px", px: 2, fontSize: '0.65rem', color: T.textMuted, borderColor: T.border, fontWeight: 800 }} onClick={() => toggle('deadStockChart')}> {toggles.deadStockChart ? "Top 5" : "View All"} </Button> ) }
                    >
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={sl(data.deadStockValue, 'deadStockChart')} margin={{ left: 30, right: 60, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={T.borderLight} />
                                <XAxis type="number" tick={txc} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={({ x, y, payload }) => (
                                    <g transform={`translate(${x},${y})`}>
                                        <text x={0} y={0} dy={4} textAnchor="end" fill={T.textFaint} fontSize={8.5} fontWeight={800}>
                                            {payload.value.length > 12 ? `${payload.value.substring(0, 10)}...` : payload.value}
                                        </text>
                                    </g>
                                )} width={90} />
                                <Tooltip cursor={{ fill: "rgba(220, 38, 38, 0.04)" }} content={<CT />} />
                                <ReferenceLine x={100} stroke={T.red} strokeDasharray="4 4" label={{ position: 'top', value: '100d Threshold', fill: T.red, fontSize: 8, fontWeight: 900 }} />
                                <Bar dataKey="days" name="Days Unused" barSize={14} radius={[0, 4, 4, 0]}>
                                    {sl(data.deadStockValue, 'deadStockChart').map((e, idx) => ( 
                                        <Cell key={idx} fill={e.days > 100 ? T.red : T.amber} fillOpacity={0.95} /> 
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 4 } }}>
                    <Paper sx={{ borderRadius: { xs: '14px', sm: T.radius }, overflow: "hidden", border: `1.5px solid ${T.border}`, boxShadow: T.shadowSm, background: "#fff" }}>
                        <Box sx={{ p: { xs: '14px 16px', sm: '20px 24px' }, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderLight}` }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 4, height: 18, bgcolor: T.red, borderRadius: 1 }} /><Typography sx={{ fontSize: "0.82rem", fontWeight: 900, color: T.text, textTransform: "uppercase", letterSpacing: "0.06em" }}>Critical Stock Alerts</Typography></Box>
                            <Button size="small" sx={{ fontSize: "0.68rem", fontWeight: 800, color: T.sky, textTransform: "none" }} onClick={() => toggleModal('alerts')}>View All Items</Button>
                        </Box>
                        <AlertTableFull />
                    </Paper>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, 1fr)" }, gap: { xs: 2, sm: 4 } }}>
                        <Paper sx={{ borderRadius: { xs: '14px', sm: T.radius }, overflow: "hidden", border: `1.5px solid ${T.border}`, boxShadow: T.shadowSm, background: "#fff" }}>
                            <Box sx={{ p: { xs: '14px 16px', sm: '20px 24px' }, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderLight}` }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 4, height: 18, bgcolor: T.green, borderRadius: 1 }} /><Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, fontWeight: 900, color: T.text, textTransform: "uppercase" }}>Inventory Movement</Typography></Box>
                                <Button size="small" sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.sky, textTransform: "none" }} onClick={() => toggleModal('movement')}>View All</Button>
                            </Box>
                            <MovementTable />
                        </Paper>

                        <Paper sx={{ borderRadius: { xs: '14px', sm: T.radius }, overflow: "hidden", border: `1.5px solid ${T.border}`, boxShadow: T.shadowSm, background: "#fff" }}>
                            <Box sx={{ p: { xs: '14px 16px', sm: '20px 24px' }, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderLight}` }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><Box sx={{ width: 4, height: 18, bgcolor: T.amber, borderRadius: 1 }} /><Typography sx={{ fontSize: { xs: '0.72rem', sm: '0.82rem' }, fontWeight: 900, color: T.text, textTransform: "uppercase" }}>Stagnant Assets</Typography></Box>
                                <Button size="small" sx={{ fontSize: "0.65rem", fontWeight: 800, color: T.sky, textTransform: "none" }} onClick={() => toggleModal('stagnant')}>View All</Button>
                            </Box>
                            <StagnantTable />
                        </Paper>
                    </Box>
                </Box>
            </Box>

            {/* Modals */}
            <ExpandModal open={modals.movement} onClose={() => toggleModal('movement')} title="Inventory Movement" icon={TrendingUp} color={T.green}>
                <MovementTable full />
            </ExpandModal>
            <ExpandModal open={modals.stagnant} onClose={() => toggleModal('stagnant')} title="Stagnant Assets" icon={Package} color={T.amber}>
                <StagnantTable full />
            </ExpandModal>
            <ExpandModal open={modals.alerts} onClose={() => toggleModal('alerts')} title="Critical Stock Alerts" icon={AlertTriangle} color={T.red}>
                <AlertTableFull full />
            </ExpandModal>
        </Box>
    );
};

export default StoreInventoryDashboard;