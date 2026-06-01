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

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Import } from "lucide-react";

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
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{ marginTop: '20px', color: '#64748b', fontWeight: 600 }}>
            Authenticating...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
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
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default App;