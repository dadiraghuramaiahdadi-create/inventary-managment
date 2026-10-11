import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Play, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { analyticsApi, productApi } from '../services/api';

const WhatIfSimulatorPage = () => {
  // Input Sliders State
  const [demandChange, setDemandChange] = useState(20);
  const [leadTimeChange, setLeadTimeChange] = useState(3);
  const [priceChange, setPriceChange] = useState(0);
  const [reorderLevelChange, setReorderLevelChange] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productsList, setProductsList] = useState([]);

  // Simulation Output State
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productApi.getAllProductsList().then((res) => {
      setProductsList(res.data);
    }).catch(() => {});

    // Initial simulation
    runSimulation();
  }, []);

  const runSimulation = async () => {
    try {
      setSimulating(true);
      setError('');
      const payload = {
        demandChangePercent: parseFloat(demandChange),
        leadTimeChangeDays: parseInt(leadTimeChange, 10),
        priceChangePercent: parseFloat(priceChange),
        reorderLevelChangePercent: parseFloat(reorderLevelChange),
        productId: selectedProductId ? parseInt(selectedProductId, 10) : null,
      };

      const res = await analyticsApi.simulate(payload);
      setSimulationResult(res.data);
    } catch (err) {
      console.error('Simulation error:', err);
      setError('Simulation failed. Ensure Python analytics backend is running.');
    } finally {
      setSimulating(false);
    }
  };

  const resetDefaults = () => {
    setDemandChange(0);
    setLeadTimeChange(0);
    setPriceChange(0);
    setReorderLevelChange(0);
    setSelectedProductId('');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Sliders className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          What-If Scenario Simulator
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Adjust macroeconomic and operational variables to simulate projected stockout dates and financial profit.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid: Controls + Simulation KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Panel (1 Col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" /> Scenario Parameters
            </h3>
            <button
              onClick={resetDefaults}
              title="Reset parameters"
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>

          <div className="space-y-5">
            {/* Product Scope Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Scope
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Full Inventory Portfolio (All SKUs)</option>
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            {/* Slider 1: Demand Shift */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Customer Demand Shift
                </span>
                <span className={`font-mono font-bold ${demandChange > 0 ? 'text-indigo-600 dark:text-indigo-400' : demandChange < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                  {demandChange > 0 ? `+${demandChange}%` : `${demandChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={demandChange}
                onChange={(e) => setDemandChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-50% Drop</span>
                <span>Baseline</span>
                <span>+100% Surge</span>
              </div>
            </div>

            {/* Slider 2: Supplier Lead Time Shift */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Supplier Delivery Delay
                </span>
                <span className={`font-mono font-bold ${leadTimeChange > 0 ? 'text-amber-500' : leadTimeChange < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {leadTimeChange > 0 ? `+${leadTimeChange} days` : `${leadTimeChange} days`}
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="30"
                step="1"
                value={leadTimeChange}
                onChange={(e) => setLeadTimeChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-10d Faster</span>
                <span>On-Time</span>
                <span>+30d Disruption</span>
              </div>
            </div>

            {/* Slider 3: Price Elasticity Shift */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Selling Price Shift
                </span>
                <span className={`font-mono font-bold ${priceChange > 0 ? 'text-emerald-500' : priceChange < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                  {priceChange > 0 ? `+${priceChange}%` : `${priceChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={priceChange}
                onChange={(e) => setPriceChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-30% Discount</span>
                <span>Current</span>
                <span>+50% Hike</span>
              </div>
            </div>

            {/* Slider 4: Reorder Level Shift */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Reorder Level Threshold
                </span>
                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                  {reorderLevelChange > 0 ? `+${reorderLevelChange}%` : `${reorderLevelChange}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={reorderLevelChange}
                onChange={(e) => setReorderLevelChange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-50% Lean</span>
                <span>Baseline</span>
                <span>+50% Buffer</span>
              </div>
            </div>

            {/* Run Button */}
            <button
              type="button"
              onClick={runSimulation}
              disabled={simulating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all mt-4"
            >
              <Play className="h-4 w-4 fill-white" />
              {simulating ? 'Simulating Dynamic Scenario...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* Results & Visual Trajectory (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 4 Financial & Risk Comparison Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Projected Revenue */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 block">30d Revenue</span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                ${simulationResult?.projectedRevenueAfter?.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Base: ${simulationResult?.projectedRevenueBefore?.toLocaleString() || '0'}</span>
              </div>
            </div>

            {/* Projected Profit */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 block">30d Profit</span>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ${simulationResult?.projectedProfitAfter?.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Base: ${simulationResult?.projectedProfitBefore?.toLocaleString() || '0'}
              </div>
            </div>

            {/* Holding Cost Impact */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 block">Holding Cost</span>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                ${simulationResult?.holdingCostAfter?.toLocaleString() || '0'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Base: ${simulationResult?.holdingCostBefore?.toLocaleString() || '0'}
              </div>
            </div>

            {/* Stockout Risk Count */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-[11px] font-semibold text-slate-400 block">Stockout Risks</span>
              <div className={`text-xl font-extrabold mt-1 ${
                (simulationResult?.stockoutRiskAfterCount || 0) > (simulationResult?.stockoutRiskBeforeCount || 0)
                  ? 'text-rose-600'
                  : 'text-emerald-600'
              }`}>
                {simulationResult?.stockoutRiskAfterCount || 0} SKUs
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Base: {simulationResult?.stockoutRiskBeforeCount || 0} SKUs
              </div>
            </div>
          </div>

          {/* 30-Day Forward Trajectory Line Chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              30-Day Inventory Depletion Trajectory
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Total aggregated units on hand: Baseline vs Simulated conditions
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationResult?.timeline || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
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
                  <Legend verticalAlign="top" height={36} />
                  <Line 
                    type="monotone" 
                    dataKey="baselineStock" 
                    name="Baseline Stock Path" 
                    stroke="#94a3b8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="simulatedStock" 
                    name="Simulated Scenario Path" 
                    stroke="#6366f1" 
                    strokeWidth={2.5} 
                    dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* High-Risk Stockout Vulnerabilities Table */}
      {simulationResult?.highRiskProducts?.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Items Projected to Stock Out Under This Scenario
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Vulnerabilities triggered within the 30-day projection horizon
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Daily Demand</th>
                  <th className="py-3 px-4 text-right">Depletion Window</th>
                  <th className="py-3 px-4 text-center">Projected Stockout Date</th>
                  <th className="py-3 px-4 text-center">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {simulationResult.highRiskProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold">
                      {p.currentStock}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {p.simulatedDemand}/day
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {p.projectedStockoutDays} days
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {p.projectedStockoutDate}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {p.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulatorPage;
