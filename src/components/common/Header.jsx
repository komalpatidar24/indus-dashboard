import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { postRequest } from '../api/api';
import {
  LogOut, Bell, User, LayoutGrid, X, Menu, MessageSquare, RefreshCw, Cloud,
  ChevronDown, Calendar, MapPin,
  Workflow, ChevronRight, ClipboardList,
  FileText, Layers, Package, PrinterIcon, Briefcase, ShoppingCart,
  HelpCircle, Send, List, Trash2, CheckCircle, Info, ArrowLeft, ExternalLink,
  Boxes, Tag, BookOpen, Palette, Newspaper, BarChart2, Printer,
  LayoutDashboard, Award, TrendingUp, Truck
} from 'lucide-react';

const Header = () => {
  const username = localStorage.getItem("username") || "Admin";
  const userRole = localStorage.getItem("UserRole") || "user";
  const companyName = localStorage.getItem("CompanyName") || "INDUS ANALYTICS";
  const fYear = localStorage.getItem("FYear") || "2025-2026";
  const isPrintudeWeb = companyName.toLowerCase().includes("printude");
  //const isPrintudeWeb = 'printude'
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showModuleMenu, setShowModuleMenu] = useState(false);
  const [showFmsSubmenu, setShowFmsSubmenu] = useState(false);
  const [showDashboardSubmenu, setShowDashboardSubmenu] = useState(true);
  const [, setExpandedSubmenu] = useState(null);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [pendingCount] = useState(0);
  const [showBackButton, setShowBackButton] = useState(false);
  const [parentTabInfo, setParentTabInfo] = useState(null);
  const logoutButtonRef = useRef(null);
  const modalRef = useRef(null);
  const moduleMenuRef = useRef(null);
  const helpPanelRef = useRef(null);
  const [backButtonType, setBackButtonType] = useState('browser');
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = userRole.toLowerCase() === "admin";

  const getTabId = () => {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
      tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
  };

  const storeParentTabInfo = (targetPath) => {
    const parentInfo = {
      tabId: getTabId(),
      url: window.location.href,
      path: location.pathname,
      timestamp: Date.now()
    };

    localStorage.setItem(`parentTab_${targetPath}`, JSON.stringify(parentInfo));

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('parentTab_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (Date.now() - data.timestamp > 3600000) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    });
  };

  const getParentTabInfo = () => {
    const key = `parentTab_${location.pathname}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        localStorage.removeItem(key);
      }
    }
    return null;
  };

  const sendMessageToParentTab = (parentTabId) => {
    const channel = new BroadcastChannel('app_navigation');
    channel.postMessage({
      type: 'FOCUS_TAB',
      targetTabId: parentTabId,
      fromTabId: getTabId()
    });
    channel.close();
  };

  useEffect(() => {
    const channel = new BroadcastChannel('app_navigation');
    const currentTabId = getTabId();

    channel.onmessage = (event) => {
      if (event.data.type === 'FOCUS_TAB' && event.data.targetTabId === currentTabId) {
        window.focus();
      }
    };

    return () => channel.close();
  }, []);

  useEffect(() => {
    const determineBackButtonState = () => {
      const returnUrl = localStorage.getItem('returnUrl');
      const cameFromExternal = localStorage.getItem('cameFromExternal');
      if (returnUrl && cameFromExternal === 'true') {
        setShowBackButton(true);
        setBackButtonType('external');
        setParentTabInfo(null);
        return;
      }
      const homeRoutes = ['/', '/dashboard', '/home'];
      const isHomePage = homeRoutes.includes(location.pathname);
      if (isHomePage) {
        setShowBackButton(false);
        setParentTabInfo(null);
        return;
      }
      const parentInfo = getParentTabInfo();
      const isNewTab = !window.opener && window.history.length <= 2;
      if (parentInfo && isNewTab) {
        setShowBackButton(true);
        setBackButtonType('parent-tab');
        setParentTabInfo(parentInfo);
        return;
      }
      const hasHistory = window.history.length > 1;
      if (hasHistory) {
        setShowBackButton(true);
        setBackButtonType('browser');
        setParentTabInfo(null);
        return;
      }
      setShowBackButton(false);
      setParentTabInfo(null);
    };
    determineBackButtonState();
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('parentTab_')) {
        determineBackButtonState();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleClickOutside = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target) && !logoutButtonRef.current.contains(event.target)) {
      setShowConfirmModal(false);
    }
    if (moduleMenuRef.current && !moduleMenuRef.current.contains(event.target)) {
      setShowModuleMenu(false);
      setShowFmsSubmenu(false);
      setShowDashboardSubmenu(true);
      setExpandedSubmenu(null);
    }
    if (helpPanelRef.current && !helpPanelRef.current.contains(event.target) && !event.target.closest('.help-trigger')) {
      setShowHelpPanel(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await postRequest('logout');
    } catch (error) {
      console.error('Error during logout:', error);
    }
    localStorage.clear();
    sessionStorage.clear();
    navigate("/login", { replace: true });
    setShowConfirmModal(false);
  };
  const handleNavigation = (path, openInNewTab = false) => {
    if (openInNewTab) {
      storeParentTabInfo(path);
      const fullUrl = `${window.location.origin}${path}`;
      window.open(fullUrl, '_blank');
    } else {
      navigate(path);
    }
    setShowModuleMenu(false);
    setShowFmsSubmenu(false);
    setShowDashboardSubmenu(true);
    setExpandedSubmenu(null);
  };

  const mainModules = [
    // ── DASHBOARD MENU (above Flow Management System) ──────────────
    {
      id: 'dashboard',
      name: 'Dashboard',
      desc: 'Analytics & Reporting',
      icon: <LayoutDashboard size={20} />,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      hasSubmenu: true,
      submenu: [
       
        {
          id: 'sales-dashboard',
          name: 'Sales Dashboard',
          icon: <TrendingUp size={14} />,
          path: '/dashboard/sales',
          hasChildren: false
        },
        {
          id: 'production-dashboard',
          name: 'Production Dashboard',
          icon: <PrinterIcon size={14} />,
          path: '/dashboard/production',
          hasChildren: false
        },
        {
          id: 'purchase-dashboard',
          name: 'Purchase Dashboard',
          icon: <ShoppingCart size={14} />,
          path: '/dashboard/purchase',
          hasChildren: false
        },
        {
          id: 'inventory-dashboard',
          name: 'Inventory Dashboard',
          icon: <Boxes size={14} />,
          path: '/dashboard/inventory',
          hasChildren: false
        },
        {
          id: 'dispatch-dashboard',
          name: 'Dispatch Dashboard',
          icon: <Truck size={14} />,
          path: '/dashboard/dispatch',
          hasChildren: false
        },
        {
          id: 'quotation-dashboard',
          name: 'Quotation Dashboard',
          icon: <FileText size={14} />,
          path: '/dashboard/quotation',
          hasChildren: false
        },
         {
          id: 'WastageMaterial-dashboard',
          name: 'Wastage Material Dashboard',
          icon: <FileText size={14} />,
          path: '/dashboard/WastageMaterial',
          hasChildren: false
        },
         {
          id: 'Report',
          name: 'Report',
          icon: <FileText size={14} />,
          path: '/dashboard/Report',
          hasChildren: false
        },
        {
          id: 'costing-dashboard',
          name: 'Costing Dashboard',
          icon: <BarChart2 size={14} />,
          path: '/dashboard/costing',
          hasChildren: false
        },
        {
          id: 'ProcurementDashbaord',
          name: 'Procurement Dashboard',
          icon: <ClipboardList size={14} />,
          path: '/dashboard/ProcurementDashbaord',
          hasChildren: false
        },
        {
          id: 'MOM-YOYDashbaord',
          name: 'MOM-YOY Dashboard',
          icon: <TrendingUp size={14} />,
          path: '/dashboard/MomYoyDashboard',
          hasChildren: false
        },
      ]
    },

  ];

  const getBackButtonConfig = () => {
    switch (backButtonType) {
      case 'external':
        return {
          icon: <ArrowLeft size={16} />,
          tooltip: 'Return to previous application',
          label: 'Back to App',
          color: 'bg-purple-600'
        };
      case 'parent-tab':
        return {
          icon: <ArrowLeft size={18} />,
          tooltip: parentTabInfo ? `Return to: ${parentTabInfo.path}` : 'Return to parent tab',
          label: 'Back to Tab',
          color: isPrintudeWeb ? 'bg-[#1a3c6e]' : 'bg-[#0b3b41]'
        };
      case 'browser':
      default:
        return {
          icon: <ArrowLeft size={18} />,
          tooltip: 'Go back',
          label: 'Back',
          color: isPrintudeWeb ? 'bg-[#1a3c6e]' : 'bg-[#0b3b41]'
        };
    }
  };

  const backButtonConfig = getBackButtonConfig();

  const handleGoBack = () => {
    const returnUrl = localStorage.getItem('returnUrl');
    if (returnUrl && backButtonType === 'external') {
      localStorage.removeItem('cameFromExternal');
      localStorage.removeItem('returnUrl');
      window.location.href = returnUrl;
      return;
    }
    if (backButtonType === 'parent-tab' && parentTabInfo) {
      sendMessageToParentTab(parentTabInfo.tabId);
      setTimeout(() => {
        localStorage.removeItem(`parentTab_${location.pathname}`);
        window.close();
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = parentTabInfo.url;
          }
        }, 100);
      }, 100);
      return;
    }
    if (backButtonType === 'browser' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    const homePath = localStorage.getItem('homePath') || '/dashboard';
    navigate(homePath, { replace: true });
  };

  // Helper to determine which submenu is open for a given module
  const isSubmenuOpen = (moduleId) => {
    if (moduleId === 'fms') return showFmsSubmenu;
    if (moduleId === 'dashboard') return showDashboardSubmenu;
    return false;
  };

  const toggleModuleSubmenu = (moduleId) => {
    if (moduleId === 'fms') {
      setShowFmsSubmenu(prev => !prev);
      setShowDashboardSubmenu(false);
    } else if (moduleId === 'dashboard') {
      setShowDashboardSubmenu(prev => !prev);
      setShowFmsSubmenu(false);
    }
    setExpandedSubmenu(null);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[1040] text-white shadow-md h-14 flex items-center px-4 transition-all duration-300"
        style={{ background: isPrintudeWeb ? 'linear-gradient(100deg, #307faf 0%, #1a3c6e 60%, #182a54 100%)' : '#0b3b41' }}
      >
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="relative" ref={moduleMenuRef}>
              <button
                onClick={() => setShowModuleMenu(!showModuleMenu)}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white"
              >
                <Menu size={24} />
              </button>

            {showModuleMenu && (
              <div className="absolute top-10 -left-4 w-[280px] bg-white text-slate-800 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[1050] animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-end px-3 pt-2">
                  <button onClick={() => setShowModuleMenu(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                <div className="px-3 pb-3">
                  {mainModules.map((m) => (
                    <div key={m.id}>
                      <button
                        onClick={(e) => {
                          const openInNewTab = e.ctrlKey || e.metaKey;
                          if (m.hasSubmenu) {
                            if (!openInNewTab) toggleModuleSubmenu(m.id);
                          } else {
                            handleNavigation(m.path, openInNewTab);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all group text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isPrintudeWeb
                            ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100'
                            : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
                        }`}>
                          <LayoutGrid size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{m.name}</div>
                        </div>
                        <ChevronRight size={14} className={`text-slate-300 transition-transform duration-300 ${m.hasSubmenu && isSubmenuOpen(m.id) ? 'rotate-90' : ''}`} />
                      </button>

                      {m.hasSubmenu && isSubmenuOpen(m.id) && (
                        <div className="mt-1 mb-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                          {m.submenu.map((sub) => {
                            const isActive = location.pathname === sub.path;
                            return (
                              <button
                                key={sub.id}
                                onClick={(e) => handleNavigation(sub.path, e.ctrlKey || e.metaKey)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all group ${
                                  isActive
                                    ? isPrintudeWeb
                                      ? 'bg-indigo-50 border-l-2 border-indigo-600 text-indigo-700'
                                      : 'bg-teal-50 border-l-2 border-teal-600 text-teal-700'
                                    : isPrintudeWeb
                                      ? 'border-l-2 border-transparent text-slate-600 hover:bg-indigo-50/60 hover:border-indigo-400 hover:text-indigo-700'
                                      : 'border-l-2 border-transparent text-slate-600 hover:bg-teal-50/60 hover:border-teal-500 hover:text-teal-700'
                                }`}
                              >
                                <span className={`flex-shrink-0 ${isActive ? '' : 'opacity-50 group-hover:opacity-100'}`}>
                                  {sub.icon}
                                </span>
                                <span className="text-[11px] font-semibold uppercase tracking-wide">{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
          <div className={isPrintudeWeb 
            ? "flex items-center gap-5 text-[16px] font-semibold tracking-wide border-l border-white/20 pl-5 h-8 text-white" 
            : "flex items-center gap-6 text-[14px] font-medium tracking-normal ml-3 text-white"
          }>
            <span className={isPrintudeWeb ? "uppercase tracking-widest" : "capitalize font-semibold"}>
              {isPrintudeWeb ? companyName.split(' ')[0] : companyName.toLowerCase()}
            </span>
            <span className="opacity-95">Hello {isPrintudeWeb ? username.toLowerCase() : username}</span>
            <span className="opacity-85 text-[13px] font-bold">F Year {fYear}</span>
          </div>

          {/* Module Menu Dropdown */}
          {/* This section was moved */}
        </div>

        {/* Right Side Icons */}
        <div className="ml-auto flex items-center gap-1.5">
          {isPrintudeWeb && (
            <>
              <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white" title="List View">
                <List size={23} />
              </button>

              <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white" title="Messages" onClick={() => isAdmin && setShowHelpPanel(!showHelpPanel)}>
                <MessageSquare size={23} />
              </button>
            </>
          )}

          <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white" title="Support" onClick={() => setShowHelpPanel(!showHelpPanel)}>
            <HelpCircle size={23} />
          </button>

          <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white relative" title="Notifications">
            <Bell size={23} />
            {pendingCount > 0 && (
              <span className={`absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 ${isPrintudeWeb ? 'border-[#1a3c6e]' : 'border-[#0b3b41]'} animate-pulse`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white" title="Refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={22} />
          </button>

          <button className="p-2 hover:bg-white/10 rounded-md transition-colors text-white" title="Cloud Sync">
            <Cloud size={23} />
          </button>

          {/* Logout Icon with Corner Popup */}
          <div className="relative">
            <button
              ref={logoutButtonRef}
              onClick={() => setShowConfirmModal(!showConfirmModal)}
              className="p-2 hover:bg-rose-600/20 rounded-md transition-colors text-white"
              title="Logout"
            >
              <LogOut size={23} />
            </button>

            {showConfirmModal && (
              <div
                ref={modalRef}
                className="absolute top-10 right-0 w-72 bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 fade-in slide-in-from-right-4 duration-300 text-center z-[500]"
              >
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-[#e11d48]">
                    <LogOut size={24} strokeWidth={2.5} />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight mb-2">Sign Out?</h3>
                <p className="text-[12px] font-medium text-slate-500 mb-6 leading-relaxed">
                  Are you sure you want to end your session?
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 py-2.5 rounded-lg bg-[#e11d48] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[#be123c] shadow-lg shadow-rose-200 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="h-14"></div>

      {showBackButton && (
        <div className="fixed bottom-6 left-6 z-[150]">
          <button
            onClick={handleGoBack}
            className="group relative"
            title={backButtonConfig.tooltip}
          >
            <div className={`w-12 h-12 ${backButtonConfig.color} text-white rounded-xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/20`}>
              <div className="group-hover:-translate-x-1 transition-transform">
                {backButtonConfig.icon}
              </div>
              {backButtonType === 'parent-tab' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-teal-400 text-[#0b3b41] rounded-full text-[8px] font-black flex items-center justify-center border-2 border-white">
                  ↩
                </span>
              )}
            </div>
          </button>
        </div>
      )}
    </>
  );
};

export default Header;