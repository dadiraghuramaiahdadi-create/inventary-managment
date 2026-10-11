import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShoppingCart, 
  TrendingUp, 
  ShieldCheck, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Boxes,
  Zap,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Package
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { analyticsApi, poApi } from '../services/api';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { CardSkeleton, TableSkeleton } from '../components/common/SkeletonLoader';

const SmartInventoryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Filters
  const [search, setSearch] = useState('');
  const [onlyNeedsReorder, setOnlyNeedsReorder] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');

  // Fast PO Pre-fill Modal State (Customize)
  const [selectedForPo, setSelectedForPo] = useState(null);
  const [poQuantity, setPoQuantity] = useState(0);
  const [poNotes, setPoNotes] = useState('');
  const [poSubmitting, setPoSubmitting] = useState(false);

  // Bulk / 1-Click Auto-Order State
  const [autoOrdering, setAutoOrdering] = useState(false);
  const [showAutoOrderConfirm, setShowAutoOrderConfirm] = useState(false);
  const [autoOrderResult, setAutoOrderResult] = useState(null);
  const [showFormulaGuide, setShowFormulaGuide] = useState(false);

  const navigate = useNavigate();

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await analyticsApi.getSmartReorder();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load smart reorder recommendations:', err);
      setError('Unable to load Python forecasting engine. Ensure backend is running on port 8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const recommendations = data?.recommendations || [];

  const filteredItems = recommendations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(search.toLowerCase()));
    const matchesReorder = !onlyNeedsReorder || item.needsReorder;
    const matchesUrgency = urgencyFilter === 'ALL' || item.urgencyLevel === urgencyFilter;
    return matchesSearch && matchesReorder && matchesUrgency;
  });

  // 1-Click Instant Auto-Order for a Single Item
  const handleSingleItemAutoOrder = async (item) => {
    try {
      setAutoOrdering(true);
      const res = await analyticsApi.autoOrder({ productId: item.productId });
      if (res.data.success) {
        setAutoOrderResult(res.data);
        setMessage({
          text: `Auto-order generated: ${res.data.message}`,
          type: 'success'
        });
        fetchRecommendations();
      }
    } catch (err) {
      console.error('Single auto-order error:', err);
      setMessage({
        text: err.response?.data?.detail || 'Failed to execute auto-order for this item.',
        type: 'error'
      });
    } finally {
      setAutoOrdering(false);
    }
  };

  // Bulk Auto-Order for All Reorder-Needed Items
  const handleExecuteBulkAutoOrder = async () => {
    setShowAutoOrderConfirm(false);
    try {
      setAutoOrdering(true);
      const res = await analyticsApi.autoOrder({});
      if (res.data.success) {
        setAutoOrderResult(res.data);
        setMessage({
          text: `Bulk auto-order executed! Created ${res.data.createdOrdersCount} Purchase Orders.`,
          type: 'success'
        });
        fetchRecommendations();
      }
    } catch (err) {
      console.error('Bulk auto-order error:', err);
      setMessage({
        text: err.response?.data?.detail || 'Failed to execute bulk auto-order.',
        type: 'error'
      });
    } finally {
      setAutoOrdering(false);
    }
  };

  // Open Customize PO Modal
  const handleOpenPoModal = (item) => {
    setSelectedForPo(item);
    setPoQuantity(item.suggestedOrderQuantity || item.economicOrderQuantity || 10);
    setPoNotes(`Automated replenishment generated via InvenIQ Smart Inventory (EOQ: ${item.economicOrderQuantity}, Safety Stock: ${item.safetyStock})`);
  };

  // Submit Customized PO
  const handleCreatePoFromSuggestion = async (e) => {
    e.preventDefault();
    if (!selectedForPo) return;
    try {
      setPoSubmitting(true);
      const payload = {
        supplierId: selectedForPo.supplierId || 1,
        expectedDeliveryDate: new Date(Date.now() + (selectedForPo.leadTimeDays || 7) * 86400000).toISOString().split('T')[0],
        notes: poNotes,
        items: [
          {
            productId: selectedForPo.productId,
            quantityOrdered: parseInt(poQuantity, 10),
            unitPrice: selectedForPo.costPrice,
          },
        ],
      };

      await poApi.create(payload);
      setMessage({
        text: `Purchase Order created for ${selectedForPo.name}! Redirecting to Orders...`,
        type: 'success',
      });
      setSelectedForPo(null);
      setTimeout(() => {
        navigate('/app/purchase-orders');
      }, 1000);
    } catch (err) {
      setMessage({
        text: err.response?.data?.detail || err.response?.data?.message || 'Failed to create PO',
        type: 'error',
      });
    } finally {
      setPoSubmitting(false);
    }
  };

  const itemsNeedingRestockCount = data?.itemsNeedingReorder || 0;

  return (
    <div className="space-y-6">
      {/* 1. Header with Bulk Auto-Order Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-[#E11900]" />
            Smart Inventory &amp; Auto-Order
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Statistical demand forecasting, Wilson EOQ optimization, and 1-click automated replenishment orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Formula Guide Toggle */}
          <button
            onClick={() => setShowFormulaGuide(!showFormulaGuide)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors shadow-sm"
          >
            <Info className="h-3.5 w-3.5 text-blue-600" />
            <span>Formulas &amp; Logic</span>
          </button>

          {/* Recalculate Forecast */}
          <button
            onClick={fetchRecommendations}
            disabled={loading || autoOrdering}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>

          {/* Bulk Auto-Order Button */}
          <button
            onClick={() => setShowAutoOrderConfirm(true)}
            disabled={loading || autoOrdering || itemsNeedingRestockCount === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E11900] hover:bg-[#c81600] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className={`h-4 w-4 fill-white ${autoOrdering ? 'animate-bounce' : ''}`} />
            <span>Auto-Order All Needed ({itemsNeedingRestockCount})</span>
          </button>
        </div>
      </div>

      {/* Formula & Algorithm Guide Banner */}
      {showFormulaGuide && (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-900/60 text-xs text-slate-700 dark:text-slate-300 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-blue-600" />
              Machine Learning &amp; Mathematical Inventory Models
            </h4>
            <button onClick={() => setShowFormulaGuide(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 font-mono text-[11px]">
            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
              <strong className="text-blue-700 dark:text-blue-400 block mb-1">1. Reorder Point (ROP):</strong>
              <code>ROP = (d̄ × L) + SS</code>
              <p className="text-[10px] text-slate-500 font-sans mt-1">
                Where d̄ is mean daily consumption, L is supplier lead time in days, and SS is safety stock buffer.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
              <strong className="text-emerald-700 dark:text-emerald-400 block mb-1">2. Statistical Safety Stock (SS):</strong>
              <code>SS = ⌈Z × σd × √L⌉</code>
              <p className="text-[10px] text-slate-500 font-sans mt-1">
                Z = 1.645 (95% service confidence level), protecting against demand volatility during supplier transit.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-blue-100 dark:border-blue-900">
              <strong className="text-purple-700 dark:text-purple-400 block mb-1">3. Wilson EOQ Optimal Batch:</strong>
              <code>EOQ = √((2 × D × S) / H)</code>
              <p className="text-[10px] text-slate-500 font-sans mt-1">
                Minimizes total annual procurement cost (Fixed PO cost $50, Annual holding rate 20%).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast Message */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-rose-600" />}
            <span className="font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', type: '' })} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* 2. Urgent Action Reorder Banner */}
      {!loading && itemsNeedingRestockCount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-orange-500/10 border-l-4 border-[#E11900] bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-r-2xl border-y border-r border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#E11900] shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{itemsNeedingRestockCount} Products Below Safety Thresholds</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#E11900] text-[10px] font-extrabold uppercase">
                  Action Required
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Current stock has reached or fallen below calculated Reorder Points. Estimated replenishment capital is{' '}
                <strong className="text-slate-900 dark:text-white font-bold">
                  ${data?.estimatedTotalReorderCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAutoOrderConfirm(true)}
            disabled={autoOrdering}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11900] hover:bg-[#c81600] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:shadow transition-all shrink-0 active:scale-95"
          >
            <Zap className="h-4 w-4 fill-white" />
            <span>Execute Auto-Order Now</span>
          </button>
        </div>
      )}

      {/* 3. KPI Highlights Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Items Needing Restock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Items Requiring Restock
            </span>
            <div className="text-3xl font-extrabold text-[#E11900] mt-1">
              {data?.itemsNeedingReorder || 0}
              <span className="text-xs font-normal text-slate-400 ml-2">
                / {data?.totalItemsAnalyzed || 0} SKUs
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Current Stock ≤ Target ROP</p>
          </div>

          {/* Estimated Restock Capital */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Recommended Capital
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              ${data?.estimatedTotalReorderCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Optimized by Wilson EOQ</p>
          </div>

          {/* Target Service Level */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Service Confidence
            </span>
            <div className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
              95.0%
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Gaussian factor: Z = 1.645</p>
          </div>

          {/* Quick Orders Link */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 dark:border-blue-900/60 dark:bg-blue-950/30 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
                Purchasing Hub
              </span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                Vendor PO Orders
              </div>
            </div>
            <Link
              to="/app/purchase-orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0072BC] hover:underline mt-2"
            >
              <span>View All Purchase Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 4. Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, name, or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E11900] focus:ring-1 focus:ring-[#E11900] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E11900] focus:ring-1 focus:ring-[#E11900] dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Urgency Levels</option>
            <option value="CRITICAL">Critical (Stockout)</option>
            <option value="HIGH">High (Below Safety Buffer)</option>
            <option value="MEDIUM">Medium (Approaching Threshold)</option>
            <option value="LOW">Low (Sufficient Stock)</option>
          </select>
        </div>

        <div className="flex items-center">
          <button
            onClick={() => setOnlyNeedsReorder(!onlyNeedsReorder)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              onlyNeedsReorder
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-[#E11900]" />
            {onlyNeedsReorder ? 'Showing Actionable Reorders Only' : 'Show All Catalog Items'}
          </button>
        </div>
      </div>

      {/* 5. Recommendations Matrix Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-3">Supplier &amp; Lead Time</th>
                  <th className="py-3 px-3 text-right">On Hand vs ROP</th>
                  <th className="py-3 px-3 text-center">Days Left</th>
                  <th className="py-3 px-3 text-right">Forecast &amp; SS</th>
                  <th className="py-3 px-3 text-right">Wilson EOQ</th>
                  <th className="py-3 px-3 text-right">Suggested PO</th>
                  <th className="py-3 px-3 text-center">Urgency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      No reorder recommendations matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.sku} &bull; ${item.costPrice.toFixed(2)} cost</div>
                      </td>

                      {/* Supplier */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.supplier}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{item.leadTimeDays}d lead time</span>
                        </div>
                      </td>

                      {/* On Hand vs ROP */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.currentQuantity} <span className="text-[10px] font-normal text-slate-400">/ ROP {item.recommendedReorderPoint}</span>
                        </div>
                        {item.currentQuantity <= item.recommendedReorderPoint && (
                          <span className="text-[10px] font-semibold text-rose-600">
                            Deficit: {Math.max(0, item.recommendedReorderPoint - item.currentQuantity)}
                          </span>
                        )}
                      </td>

                      {/* Days to Stockout */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {item.daysToStockout !== null && item.daysToStockout !== undefined && item.daysToStockout < 900 ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                              item.daysToStockout <= 2
                                ? 'bg-red-100 text-red-700'
                                : item.daysToStockout <= 7
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            ~{item.daysToStockout}d
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">&gt;30d</span>
                        )}
                      </td>

                      {/* Forecast & Safety Stock */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                        <div>{item.forecastedMonthlyDemand} units/mo</div>
                        <div className="text-[10px] text-slate-400">SS: {item.safetyStock}</div>
                      </td>

                      {/* Wilson EOQ */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.economicOrderQuantity}
                      </td>

                      {/* Suggested PO Qty */}
                      <td className="py-3.5 px-3 text-right font-mono">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {item.suggestedOrderQuantity > 0 ? item.suggestedOrderQuantity : '-'}
                        </div>
                        {item.estimatedOrderCost > 0 && (
                          <div className="text-[10px] text-slate-500 font-normal">
                            ${item.estimatedOrderCost.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Urgency Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.urgencyLevel === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : item.urgencyLevel === 'HIGH'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : item.urgencyLevel === 'MEDIUM'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {item.urgencyLevel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {item.needsReorder ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1-Click Fast Auto-Order */}
                            <button
                              onClick={() => handleSingleItemAutoOrder(item)}
                              disabled={autoOrdering}
                              title="Instant 1-Click Auto-Order via Smart Inventory"
                              className="inline-flex items-center gap-1 rounded bg-[#E11900] hover:bg-[#c81600] px-2.5 py-1 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Zap className="h-3 w-3 fill-white" />
                              <span>Auto-Order</span>
                            </button>

                            {/* Customize PO */}
                            <button
                              onClick={() => handleOpenPoModal(item)}
                              title="Customize quantity and notes before ordering"
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <span>Edit</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Optimal
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Bulk Auto-Order Confirmation Modal */}
      {showAutoOrderConfirm && (
        <ConfirmDialog
          isOpen={showAutoOrderConfirm}
          onClose={() => setShowAutoOrderConfirm(false)}
          onConfirm={handleExecuteBulkAutoOrder}
          title="Execute Bulk Automated Purchase Orders?"
          message={`InvenIQ will automatically generate purchase orders for all ${itemsNeedingRestockCount} products below their reorder threshold, grouped by their assigned suppliers. Estimated total procurement value: $${data?.estimatedTotalReorderCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`}
          confirmText="Yes, Execute Auto-Orders"
          cancelText="Cancel"
          danger={false}
        />
      )}

      {/* 7. Auto-Order Result Success Modal */}
      {autoOrderResult && (
        <Modal
          isOpen={!!autoOrderResult}
          onClose={() => setAutoOrderResult(null)}
          title="Automated Purchase Orders Generated"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <div className="font-bold">{autoOrderResult.message}</div>
                <div className="text-emerald-600 mt-0.5">
                  Orders have been submitted to the purchasing queue in PENDING status.
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 p-2.5 font-bold text-xs text-slate-700 border-b border-slate-200">
                Created Purchase Orders ({autoOrderResult.orders?.length || 0})
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
                {autoOrderResult.orders?.map((ord) => (
                  <div key={ord.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900">{ord.orderNumber}</div>
                      <div className="text-slate-500 text-[11px]">{ord.supplierName} &bull; {ord.itemCount} SKUs</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">${ord.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">PENDING</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAutoOrderResult(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                to="/app/purchase-orders"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#E11900] text-white hover:bg-[#c81600]"
              >
                <span>View in Purchase Orders</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Customize PO Modal (Single Item) */}
      {selectedForPo && (
        <Modal
          isOpen={!!selectedForPo}
          onClose={() => setSelectedForPo(null)}
          title={`Create PO: ${selectedForPo.name}`}
        >
          <form onSubmit={handleCreatePoFromSuggestion} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">SKU Code:</span>
                <span className="font-mono font-bold text-slate-800">{selectedForPo.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-800">{selectedForPo.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Stock / ROP:</span>
                <span className="font-mono font-bold text-amber-600">{selectedForPo.currentQuantity} / {selectedForPo.recommendedReorderPoint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Wilson EOQ Recommendation:</span>
                <span className="font-mono font-bold text-blue-600">{selectedForPo.economicOrderQuantity} units</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Order Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={poQuantity}
                onChange={(e) => setPoQuantity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E11900] focus:ring-1 focus:ring-[#E11900]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Estimated Order Subtotal: ${(poQuantity * selectedForPo.costPrice).toFixed(2)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PO Notes &amp; Reference
              </label>
              <textarea
                rows="2"
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#E11900] focus:ring-1 focus:ring-[#E11900]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedForPo(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={poSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#E11900] text-white hover:bg-[#c81600] disabled:opacity-50"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>{poSubmitting ? 'Creating PO...' : 'Confirm & Create PO'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SmartInventoryPage;
