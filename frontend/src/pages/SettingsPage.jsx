import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Server, 
  Database, 
  Cpu, 
  Radio, 
  Moon, 
  Sun, 
  ShieldCheck, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { connected } = useWebSocket();
  const { user } = useAuth();

  const [javaStatus, setJavaStatus] = useState('CHECKING');
  const [pythonStatus, setPythonStatus] = useState('CHECKING');

  const checkServicesHealth = async () => {
    // Java Check
    try {
      await axios.get('http://localhost:8080/v3/api-docs', { timeout: 3000 });
      setJavaStatus('ONLINE');
    } catch {
      setJavaStatus('OFFLINE');
    }

    // Python Check
    try {
      await axios.get('http://localhost:8000/health', { timeout: 3000 });
      setPythonStatus('ONLINE');
    } catch {
      setPythonStatus('OFFLINE');
    }
  };

  useEffect(() => {
    checkServicesHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Settings className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          System Settings & Diagnostics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor service health, database runtime configuration, and environment parameters.
        </p>
      </div>

      {/* 1. Microservice Cluster Diagnostic Status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-500" /> Microservice Connectivity Status
          </h3>
          <button
            onClick={checkServicesHealth}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Re-check Health
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Java Core Service */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Java Core API</span>
              <span className={`h-2.5 w-2.5 rounded-full ${javaStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            </div>
            <div className="font-mono text-[11px] text-slate-500">Port: 8080 (Spring Boot 3)</div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {javaStatus === 'ONLINE' ? 'Operational & Ready' : 'Standby / Offline'}
            </div>
          </div>

          {/* Python Analytics Service */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Python Analytics</span>
              <span className={`h-2.5 w-2.5 rounded-full ${pythonStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
            </div>
            <div className="font-mono text-[11px] text-slate-500">Port: 8000 (FastAPI + ML)</div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {pythonStatus === 'ONLINE' ? 'Operational & Ready' : 'Standby / Offline'}
            </div>
          </div>

          {/* WebSocket STOMP Broker */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">STOMP WebSockets</span>
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <div className="font-mono text-[11px] text-slate-500">Endpoint: /ws (/topic broker)</div>
            <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {connected ? 'Live Sync Active' : 'Connecting to Broker'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Database & Storage Configuration */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Database className="h-4 w-4 text-teal-500" /> Database Engine & Persistence
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
          InvenIQ is currently executing on zero-setup file-based H2 database engine. Data persists across reboots in the local <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">./data/inveniq_db</code> file.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs font-mono space-y-1">
          <div><span className="text-slate-400">Active Profile:</span> <span className="text-indigo-600 dark:text-indigo-400 font-bold">h2 (file-based)</span></div>
          <div><span className="text-slate-400">JDBC URL:</span> jdbc:h2:file:./data/inveniq_db;DB_CLOSE_DELAY=-1</div>
          <div><span className="text-slate-400">Switch to MySQL:</span> Run with --spring.profiles.active=mysql</div>
        </div>
      </div>

      {/* 3. Appearance & Theme Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
            Interface Theme Preference
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Currently using {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </p>
        </div>

        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
