import React, { useState } from 'react';
import { 
  Bell, 
  Sun, 
  Moon, 
  Search, 
  LogOut, 
  User, 
  Radio, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onToggleSidebar, isSidebarCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { connected, alerts, unreadAlertCount, clearAlerts } = useWebSocket();
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/app/products?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      {/* Left: Global Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, product name, barcode..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#E11900] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#E11900] dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 transition-all"
          />
        </form>
      </div>

      {/* Right: Live Sync, Theme, Alerts, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* WebSocket Live Sync Badge */}
        <div
          title={connected ? "Connected to STOMP WebSocket Live updates" : "Connecting to WebSocket broker..."}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            connected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          {connected ? 'Live Sync' : 'Connecting'}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
        </button>

        {/* Notification Bell with Low-Stock Alerts */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAlertDropdown(!showAlertDropdown);
              if (!showAlertDropdown) clearAlerts();
            }}
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadAlertCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-bounce">
                {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
              </span>
            )}
          </button>

          {/* Alerts Dropdown Modal */}
          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 dark:border-slate-800">
                <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Live Inventory Alerts
                </h4>
                <button
                  onClick={() => setShowAlertDropdown(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Close
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {alerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                    No urgent stock alerts at this time.
                  </div>
                ) : (
                  alerts.map((alt, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg text-xs border ${
                        alt.level === 'CRITICAL'
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300'
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between mb-0.5">
                        <span>{alt.type === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock Warning'}</span>
                        <span className="font-mono text-[10px] opacity-75">{alt.sku}</span>
                      </div>
                      <p className="leading-snug">{alt.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Role Info */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
              {user?.fullName || user?.username}
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-tight">
              {user?.email}
            </span>
          </div>

          <span className={`hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider uppercase ${getRoleBadgeColor(user?.role)}`}>
            {user?.role}
          </span>

          {/* Logout Button */}
          <button
            onClick={logout}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
