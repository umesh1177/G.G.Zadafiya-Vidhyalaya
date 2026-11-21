import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Topbar from '../components/common/Topbar';
import MobileBottomNav from '../components/common/MobileBottomNav';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [header, setHeader] = useState({ title: 'Dashboard', subtitle: '' });
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock background scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [sidebarOpen]);

  return (
    <div className="app">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar
          title={header.title}
          subtitle={header.subtitle}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <div className="content">
          <Outlet context={{ setHeader }} />
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}
