import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import Header from "./components/common/Header";
import Login from "./components/auth/CompanyLogin";
import UserLogin from "./components/auth/UserLogin";
import SalesDashboard from './components/Dashboard/SalesDashboard';
import ProductionDashboard from './components/Dashboard/ProductionDashboard';
import PurchaseDashboard from './components/Dashboard/PurchaseDashboard';
import StoreInventoryDashboard from './components/Dashboard/StoreInventoryDashboard';
import CostingDashboard from './components/Dashboard/CostingDashboard';
import DispatchDashboard from './components/Dashboard/DispatchDashboard';
import FinalOTIF from './components/Dashboard/FinalOTIF';
import DashboardCard from './components/common/DashboardCard';
import DashboardChart from './components/common/DashboardChart';
import DashboardHeader from './components/common/DashboardHeader';
import Quotation from './components/Dashboard/QuotationDashboard';
import WastageMaterial from './components/Dashboard/WastageMaterial';
import Report from './components/Dashboard/Report';
import ProcurementDashbaord from './components/Dashboard/ProcurementDashbaord';
import MomYoyDashboard from './components/Dashboard/MomYoyDashboard';

import MobileBottomNav from './components/common/MobileBottomNav';
import PullToRefresh from './components/common/PullToRefresh';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const useSSOAuth = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userId = params.get('uid');
    const companyId = params.get('cid');
    const companyName = params.get('cn');
    const userName = params.get('un');
    const companyPassword = params.get('cp');
    const companyUserID = params.get('cu');



    const handleSSOLogin = async () => {
      try {
        if (token && userId && companyId) {
          localStorage.setItem('user', userId);
          localStorage.setItem('userId', userId);
          localStorage.setItem('userid', userId);
          localStorage.setItem('companyId', companyId);
          localStorage.setItem('CompanyID', companyId);
          localStorage.setItem('companyName', companyName || '');
          localStorage.setItem('CompanyName', companyUserID || '');
          localStorage.setItem('CompanyPassword', companyPassword || '');
          localStorage.setItem('userName', userName || '');
          localStorage.setItem('username', userName || '');
          localStorage.setItem('authToken', token);
          localStorage.setItem('ssoLogin', 'true');
          const cleanPath = location.pathname;
          window.history.replaceState({}, '', cleanPath);

          setIsAuthenticated(true);
          setIsAuthenticating(false);
        } else {
          throw new Error('Invalid SSO parameters');
        }
      } catch (error) {
        console.error('SSO Authentication failed:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('userid');
        localStorage.removeItem('companyId');
        localStorage.removeItem('CompanyID');
        localStorage.removeItem('companyName');
        localStorage.removeItem('CompanyName');
        localStorage.removeItem('CompanyPassword');
        localStorage.removeItem('userName');
        localStorage.removeItem('username');
        localStorage.removeItem('authToken');
        navigate('/login');
        setIsAuthenticating(false);
      }
    };

    if (token && userId && companyId) {
      handleSSOLogin();
    } else {
      const existingUser = localStorage.getItem('userid') || localStorage.getItem('user');
      if (existingUser) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsAuthenticating(false);
    }
  }, [location, navigate]);

  return { isAuthenticating, isAuthenticated };
};

const ProtectedSSORoute = ({ children }) => {
  const { isAuthenticating, isAuthenticated } = useSSOAuth();

  if (isAuthenticating) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f2744 100%)',
      }}>
        <img
          src="/White new logo1.png"
          alt="Indus Analytics"
          style={{ width: '200px', maxWidth: '60vw', marginBottom: '40px', opacity: 0.95 }}
        />
        {/* Animated bar */}
        <div style={{ width: '160px', height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: '40%', borderRadius: '99px',
            background: 'linear-gradient(90deg, #2dd4bf, #3b82f6)',
            animation: 'slideBar 1.4s ease-in-out infinite',
          }} />
        </div>
        <p style={{ marginTop: '20px', color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Loading...
        </p>
        <style>{`
          @keyframes slideBar {
            0%   { transform: translateX(-100%); }
            50%  { transform: translateX(300%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem("user") || localStorage.getItem("userid");
  const isIframe = window.self !== window.top;
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasSSO = params.get('token') && params.get('uid');
    if (userId && location.pathname === "/login" && !hasSSO) {
      navigate(-1);
    }
  }, [userId, navigate, location]);

  // const hideHeaderRoutes = ["/", "/login", "/user-login"];
  // const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname);

  const hideHeaderRoutes = ["/", "/login", "/user-login"];
  const shouldShowHeader = !hideHeaderRoutes.includes(location.pathname) && !isIframe;
  return (
    <>
      {shouldShowHeader && <Header />}
      {/* bottom padding on mobile so content clears the bottom nav */}
      <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 68px)' }}
           className="mobile-page-wrap">
      <PullToRefresh onRefresh={() => window.location.reload()}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/user-login" element={<UserLogin />} />
        <Route path="/DashboardHeader" element={<ProtectedSSORoute><DashboardHeader /></ProtectedSSORoute>} />
        <Route path="/DashboardChart" element={<ProtectedSSORoute><DashboardChart /></ProtectedSSORoute>} />
        <Route path="/DashboardCard" element={<ProtectedSSORoute><DashboardCard /></ProtectedSSORoute>} />
        <Route path="/dashboard/sales" element={<ProtectedSSORoute><SalesDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/production" element={<ProtectedSSORoute><ProductionDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/purchase" element={<ProtectedSSORoute><PurchaseDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/inventory" element={<ProtectedSSORoute><StoreInventoryDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/costing" element={<ProtectedSSORoute><CostingDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/dispatch" element={<ProtectedSSORoute><DispatchDashboard /></ProtectedSSORoute>} />
        <Route path="/dashboard/otif" element={<ProtectedSSORoute><FinalOTIF /></ProtectedSSORoute>} />
        <Route path="/dashboard/executive" element={<ProtectedSSORoute><FinalOTIF /></ProtectedSSORoute>} />
        <Route path="/dashboard/quotation" element={<ProtectedSSORoute><Quotation /></ProtectedSSORoute>} />
        <Route path="/dashboard/WastageMaterial" element={<ProtectedSSORoute><WastageMaterial /></ProtectedSSORoute>} />
        <Route path="/dashboard/Report" element={<ProtectedSSORoute><Report /></ProtectedSSORoute>} />
        <Route path="/dashboard/ProcurementDashbaord" element={<ProtectedSSORoute><ProcurementDashbaord /></ProtectedSSORoute>} />
        <Route path="/dashboard/MomYoyDashboard" element={<ProtectedSSORoute><MomYoyDashboard /></ProtectedSSORoute>} />
      </Routes>
      </PullToRefresh>
      </div>
      <MobileBottomNav />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default App;