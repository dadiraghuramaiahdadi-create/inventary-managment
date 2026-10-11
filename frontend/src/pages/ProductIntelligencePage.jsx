import React, { useEffect, useState } from 'react';
import { 
  BrainCircuit, 
  TrendingUp, 
  AlertOctagon, 
  DollarSign, 
  Search, 
  Filter, 
  RefreshCw, 
  HelpCircle,
  Clock,
  Boxes,
  Percent
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
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
import { analyticsApi } from '../services/api';
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';

const ABC_COLORS = {
  A: '#6366f1', // Indigo
  B: '#14b8a6', // Teal
  C: '#94a3b8', // Slate
};

const ProductIntelligencePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAbc, setSelectedAbc] = useState('ALL');
  const [selectedVelocity, setSelectedVelocity] = useState('ALL');

  const fetchIntelligence = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await analyticsApi.getIntelligence();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load intelligence data:', err);
      setError('Unable to load Python analytics. Ensure Python service is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  const summary = data?.summary;
  const items = data?.items || [];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesAbc = selectedAbc === 'ALL' || item.abcCategory === selectedAbc;
    const matchesVelocity = selectedVelocity === 'ALL' || item.movementVelocity === selectedVelocity;
    return matchesSearch && matchesAbc && matchesVelocity;
  });

  const abcChartData = summary
    ? [
        { name: 'Class A (Vital)', count: summary.classACount, color: ABC_COLORS.A },
        { name: 'Class B (Moderate)', count: summary.classBCount, color: ABC_COLORS.B },
        { name: 'Class C (Bulk/Slow)', count: summary.classCCount, color: ABC_COLORS.C },
      ]
    : [];

  const velocityChartData = summary
    ? [
        { name: 'Fast Movers', value: summary.fastMoversCount, fill: '#10b981' },
        { name: 'Slow Movers', value: summary.slowMoversCount, fill: '#f59e0b' },
        { name: 'Dead Stock', value: summary.deadStockCount, fill: '#ef4444' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <BrainCircuit className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Product Intelligence & ABC Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pareto classification, velocity detection, and capital efficiency computed by the Python ML service.
          </p>
        </div>

        <button
          onClick={fetchIntelligence}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4" /> Refresh Intelligence
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900 text-xs">
          {error}
        </div>
      )}

      {/* 1. Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Class A Card */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Class A Items
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {summary?.classACount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">~70% of inventory value</p>
          </div>

          {/* Class B Card */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 dark:border-teal-900/60 dark:bg-teal-950/30">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">
              Class B Items
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {summary?.classBCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">~20% of inventory value</p>
          </div>

          {/* Class C Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Class C Items
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {summary?.classCCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">~10% of inventory value</p>
          </div>

          {/* Dead Stock Card */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Dead Stock SKUs
            </span>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {summary?.deadStockCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tied capital: ${summary?.deadStockTiedCapital?.toLocaleString() || '0'}
            </p>
          </div>

          {/* Avg Turnover Ratio */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Avg Turnover Ratio
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              {summary?.averageTurnoverRatio || 0}x
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Annualized velocity</p>
          </div>
        </div>
      )}

      {/* 2. Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto ABC Distribution */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Pareto ABC Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Count of products in each consumption-value class
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={abcChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '10px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '11px' 
                  }} 
                />
                <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Velocity Classification Pie */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
            Movement Velocity Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Fast-moving vs slow-moving vs dead capital
          </p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={velocityChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {velocityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '10px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '11px' 
                  }} 
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  wrapperStyle={{ fontSize: '11px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3. Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            value={selectedAbc}
            onChange={(e) => setSelectedAbc(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All ABC Classes</option>
            <option value="A">Class A (Top ~70% Value)</option>
            <option value="B">Class B (Next ~20% Value)</option>
            <option value="C">Class C (Bottom ~10% Value)</option>
          </select>
        </div>

        <div>
          <select
            value={selectedVelocity}
            onChange={(e) => setSelectedVelocity(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Velocities</option>
            <option value="FAST">Fast Movers</option>
            <option value="SLOW">Slow Movers</option>
            <option value="DEAD">Dead Stock</option>
          </select>
        </div>
      </div>

      {/* 4. Intelligence Matrix Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4 text-center">ABC Class</th>
                  <th className="py-3 px-4 text-center">Velocity</th>
                  <th className="py-3 px-4 text-right">Stock</th>
                  <th className="py-3 px-4 text-right">90d Sold</th>
                  <th className="py-3 px-4 text-right">Profit Margin</th>
                  <th className="py-3 px-4 text-right">Turnover</th>
                  <th className="py-3 px-4 text-right">Days Left</th>
                  <th className="py-3 px-4 text-center">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No products match selected intelligence filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((p) => (
                    <tr key={p.productId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block w-6 py-0.5 rounded text-[11px] font-extrabold ${
                            p.abcCategory === 'A'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : p.abcCategory === 'B'
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {p.abcCategory}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.movementVelocity === 'FAST'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : p.movementVelocity === 'SLOW'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {p.movementVelocity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        {p.currentQuantity}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                        {p.totalSoldUnits90d}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {p.profitMarginPercent}%
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {p.turnoverRatio}x
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        {p.daysOfStockLeft >= 999 ? (
                          <span className="text-slate-400">∞</span>
                        ) : (
                          <span>{p.daysOfStockLeft}d</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.riskStatus === 'HEALTHY'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : p.riskStatus === 'LOW_STOCK'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : p.riskStatus === 'DEAD_STOCK'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {p.riskStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductIntelligencePage;
