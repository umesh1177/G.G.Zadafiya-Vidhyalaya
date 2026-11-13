import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Topbar from '../components/common/Topbar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [header, setHeader] = useState({ title: 'Dashboard', subtitle: '' });

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
      </div>
    </div>
  );
}

