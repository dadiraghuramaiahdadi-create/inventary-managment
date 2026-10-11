import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Barcode, 
  BrainCircuit, 
  Sliders, 
  Sparkles, 
  ShoppingCart, 
  History, 
  FileText, 
  Truck, 
  Users, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InveniqLogo, InveniqLogoIcon } from './InveniqLogo';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { isAdmin, isManager, isStaff, user } = useAuth();

  // Core navigation items available to all authenticated roles (Staff, Manager, Admin)
  const baseItems = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/app/products', icon: Package },
    { name: 'Scan & Update', path: '/app/scan', icon: Barcode, badge: 'Live' },
    { name: 'Inventory Activity', path: '/app/activity', icon: History },
    { name: 'Reports', path: '/app/reports', icon: FileText },
  ];

  // Advanced Analytics & Decision Intelligence (Manager & Admin only - restricted from Staff)
  const analyticsItems = isManager ? [
    { section: 'Analytics & AI' },
    { name: 'Product Intelligence', path: '/app/intelligence', icon: BrainCircuit },
    { name: 'What-If Simulator', path: '/app/simulator', icon: Sliders },
    { name: 'Smart Inventory', path: '/app/smart-reorder', icon: Sparkles },
  ] : [];

  // Procurement & Vendor Management (Manager & Admin only - restricted from Staff)
  const procurementItems = isManager ? [
    { section: 'Procurement' },
    { name: 'Purchase Orders', path: '/app/purchase-orders', icon: ShoppingCart },
    { name: 'Suppliers', path: '/app/suppliers', icon: Truck },
  ] : [];

  // Administration (Admin only - restricted from Manager & Staff)
  const adminItems = isAdmin ? [
    { section: 'Administration' },
    { name: 'Users & Roles', path: '/app/users', icon: Users },
  ] : [];

  const navItems = [
    ...baseItems,
    ...analyticsItems,
    ...procurementItems,
    ...adminItems,
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-3.5 border-b border-slate-200 dark:border-slate-800">
        <NavLink to="/app/dashboard" className="flex items-center gap-2 overflow-hidden">
          {isCollapsed ? (
            <div className="p-1">
              <InveniqLogoIcon className="h-7 w-auto" />
            </div>
          ) : (
            <InveniqLogo showText={true} iconClassName="h-7 w-auto" textClassName="text-base" />
          )}
        </NavLink>

        <button
          onClick={onToggleCollapse}
          className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            return !isCollapsed ? (
              <div
                key={idx}
                className="pt-4 pb-1 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase"
              >
                {item.section}
              </div>
            ) : (
              <div key={idx} className="pt-3 border-t border-slate-100 dark:border-slate-800 my-2" />
            );
          }

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-red-50 text-[#E11900] font-semibold dark:bg-red-950/40 dark:text-red-400 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
              {!isCollapsed && (
                <div className="flex flex-1 items-center justify-between">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>InvenIQ Suite v2.0</span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Connected" />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
