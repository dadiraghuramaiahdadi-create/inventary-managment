import React, { useEffect, useState } from 'react';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  XCircle, 
  ShoppingCart, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { dashboardApi } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { Link } from 'react-router-dom';

const PIE_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [movementData, setMovementData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [topMovers, setTopMovers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  const { subscribeStockUpdates, subscribeActivity } = useWebSocket();

  const fetchDashboardData = async () => {
    try {
      const results = await Promise.allSettled([
        dashboardApi.getSummary(),
        dashboardApi.getStockMovement(14),
        dashboardApi.getCategoryDistribution(),
        dashboardApi.getTopMovers(5),
        dashboardApi.getRecentActivity(),
        dashboardApi.getLowStockAlerts(),
      ]);

      if (results[0].status === 'fulfilled') setSummary(results[0].value.data);
      if (results[1].status === 'fulfilled') setMovementData(results[1].value.data);
      if (results[2].status === 'fulfilled') setCategoryData(results[2].value.data);
      if (results[3].status === 'fulfilled') setTopMovers(results[3].value.data);
      if (results[4].status === 'fulfilled') setRecentActivity(results[4].value.data);
      if (results[5].status === 'fulfilled') setLowStockAlerts(results[5].value.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen to Live WebSocket broadcasts
    const unsubscribeStock = subscribeStockUpdates((updatedProduct) => {
      // Re-fetch KPI summary and low-stock list live
      dashboardApi.getSummary().then((res) => setSummary(res.data)).catch(() => {});
      dashboardApi.getLowStockAlerts().then((res) => setLowStockAlerts(res.data)).catch(() => {});
    });

    const unsubscribeActivity = subscribeActivity((newTx) => {
      setRecentActivity((prev) => [newTx, ...prev.slice(0, 14)]);
      dashboardApi.getStockMovement(14).then((res) => setMovementData(res.data)).catch(() => {});
    });

    return () => {
      unsubscribeStock();
      unsubscribeActivity();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome & Refresh Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Inventory Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time stock velocity, catalog valuations, and predictive demand insights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            Scan & Update
          </Link>
          <button
            onClick={fetchDashboardData}
            title="Refresh Ledger"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 1. Five KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Products</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            {summary?.totalProducts || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active tracked SKUs</p>
        </div>

        {/* Stock Valuation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Stock Value</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white">
            ${summary?.totalCostValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Retail: ${summary?.totalSellingValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Low Stock Items</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {summary?.lowStockCount || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">At or below reorder level</p>
        </div>

        {/* Out of Stock */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Out of Stock</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-rose-600 dark:text-rose-400">
            {summary?.outOfStockCount || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Immediate restock required</p>
        </div>

        {/* Pending POs */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Orders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {summary?.pendingPurchaseOrders || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Approved or awaiting receipt</p>
        </div>
      </div>

      {/* 2. Charts Row: Stock Movement & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Movement Line Chart (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                14-Day Stock Movement
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of daily Stock IN vs Stock OUT movements
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickFormatter={(val) => val.slice(5)} 
                />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: '#0f172a',
                    fontSize: '12px' 
                  }}
                  itemStyle={{ color: '#0f172a', fontWeight: '500' }}
                  labelStyle={{ color: '#64748b', fontWeight: '600', marginBottom: '2px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line 
                  type="monotone" 
                  dataKey="stockIn" 
                  name="Stock IN / Received" 
                  stroke="#10b981" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="stockOut" 
                  name="Stock OUT / Sold" 
                  stroke="#6366f1" 
                  strokeWidth={2.5} 
                  dot={{ r: 3 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pie Chart (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Category Valuation
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 mb-2">
            Inventory share by product category
          </p>

          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="stockValue"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Valuation']}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: '#0f172a', 
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '8px 12px'
                  }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center" 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Top Movers, Live Activity Feed & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Movers */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" /> Top Velocity Movers
            </h3>
            <span className="text-[11px] text-slate-400">Last 30 Days</span>
          </div>

          <div className="space-y-3">
            {topMovers.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales data recorded.</p>
            ) : (
              topMovers.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                  <div className="truncate max-w-[180px]">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">{item.productName}</div>
                    <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{item.totalSoldQuantity}</span>
                    <span className="text-[10px] text-slate-400 ml-1">sold</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-500" /> Live Movement Feed
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivity.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  tx.transactionType === 'IN' || tx.transactionType === 'PO_RECEIVE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                    : tx.transactionType === 'OUT'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                }`}>
                  {tx.transactionType === 'IN' || tx.transactionType === 'PO_RECEIVE' ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.productName}</span>
                    <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-white">
                      {tx.quantityChanged > 0 ? `+${tx.quantityChanged}` : tx.quantityChanged}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{tx.reason || tx.transactionType}</span>
                    <span>by {tx.performedBy}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low-Stock Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Low-Stock Attention
            </h3>
            <Link to="/app/products?lowStock=true" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {lowStockAlerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                All inventory levels healthy.
              </div>
            ) : (
              lowStockAlerts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{p.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{p.sku}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">{p.quantity}</span>
                    <span className="text-[10px] text-slate-400"> / {p.reorderLevel} min</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
