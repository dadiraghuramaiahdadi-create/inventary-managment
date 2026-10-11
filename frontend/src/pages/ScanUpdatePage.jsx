import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Camera, 
  Plus, 
  Minus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  RefreshCw, 
  Search 
} from 'lucide-react';
import { productApi, stockApi } from '../services/api';
import CameraScannerModal from '../components/scanner/CameraScannerModal';

const ScanUpdatePage = () => {
  const [scanQuery, setScanQuery] = useState('');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  // Movement Form
  const [activeTab, setActiveTab] = useState('IN'); // 'IN', 'OUT', 'ADJUSTMENT'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Scanner Quick Movement');
  const [reference, setReference] = useState('');
  const [updating, setUpdating] = useState(false);

  // Scan History in this session
  const [recentScans, setRecentScans] = useState([]);

  const scanInputRef = useRef(null);

  // Keep input always focused for hardware USB/Bluetooth barcode scanners
  useEffect(() => {
    const focusScanner = () => {
      if (scanInputRef.current && !showCamera) {
        scanInputRef.current.focus();
      }
    };
    focusScanner();

    const handleClickOutside = (e) => {
      // Don't steal focus if user is actively interacting with an input or button
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return;
      focusScanner();
    };

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showCamera]);

  const handleLookup = async (identifier) => {
    if (!identifier || !identifier.trim()) return;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await productApi.getByScan(identifier.trim());
      setProduct(res.data);
      setScanQuery('');
      setQuantity(1);
      setReference(`SCAN-${Date.now().toString().slice(-6)}`);

      // Add to session history
      setRecentScans((prev) => [
        { product: res.data, timestamp: new Date().toLocaleTimeString() },
        ...prev.filter((item) => item.product.id !== res.data.id).slice(0, 9),
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message || `No product found matching SKU or barcode "${identifier}".`
      );
      setProduct(null);
    } finally {
      setLoading(false);
      scanInputRef.current?.focus();
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    handleLookup(scanQuery);
  };

  const handleQuickDelta = async (delta) => {
    if (!product) return;
    setUpdating(true);
    setError('');
    setSuccessMsg('');

    const isPositive = delta > 0;
    const reqType = isPositive ? 'IN' : 'OUT';
    const absQty = Math.abs(delta);

    try {
      await stockApi.adjustStock({
        productId: product.id,
        transactionType: reqType,
        quantity: absQty,
        reason: `Quick Scan ${isPositive ? '+1' : '-1'} Update`,
        referenceNumber: `SCAN-QUICK-${Date.now().toString().slice(-4)}`,
      });

      // Reload updated product
      const updated = await productApi.getProductById(product.id);
      setProduct(updated.data);
      setSuccessMsg(
        `Stock successfully ${isPositive ? 'incremented' : 'decremented'} by ${absQty}. New quantity: ${updated.data.quantity}`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Stock update failed. Check available quantity.');
    } finally {
      setUpdating(false);
      scanInputRef.current?.focus();
    }
  };

  const handleFullAdjustment = async (e) => {
    e.preventDefault();
    if (!product || quantity <= 0) return;
    setUpdating(true);
    setError('');
    setSuccessMsg('');

    try {
      await stockApi.adjustStock({
        productId: product.id,
        transactionType: activeTab,
        quantity: parseInt(quantity, 10),
        reason: reason || `${activeTab} Scan Update`,
        referenceNumber: reference || `SCAN-${Date.now().toString().slice(-6)}`,
      });

      const updated = await productApi.getProductById(product.id);
      setProduct(updated.data);
      setSuccessMsg(
        `Successfully logged ${activeTab} transaction. New stock balance: ${updated.data.quantity} ${updated.data.unit}`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed. Verify parameters.');
    } finally {
      setUpdating(false);
      scanInputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Barcode className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          Scan & Update Terminal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compatible with handheld USB/Bluetooth hardware barcode scanners and webcam scanning.
        </p>
      </div>

      {/* Hardware Scanner Always-Focused Input & Camera Trigger */}
      <div className="rounded-2xl border-2 border-indigo-200 bg-white p-5 shadow-lg shadow-indigo-500/5 dark:border-indigo-900/60 dark:bg-slate-900">
        <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <input
              ref={scanInputRef}
              type="text"
              placeholder="Scan barcode or press Enter after typing SKU (auto-focused)..."
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 py-3 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Finding...' : 'Lookup SKU'}
          </button>

          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-500/50 bg-teal-50 px-5 py-3 text-sm font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Camera Scan
          </button>
        </form>

        {/* Status Indicators */}
        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Main Scanned Product Workspace */}
      {product ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Overview Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=120'}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 bg-slate-100"
                />
                <div className="min-w-0">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mb-1">
                    {product.categoryName}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                    {product.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">SKU: {product.sku}</p>
                </div>
              </div>

              {/* Big Quantity Display */}
              <div className="my-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                  Current Stock On Hand
                </span>
                <div className="text-4xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {product.quantity}{' '}
                  <span className="text-sm font-normal text-slate-400">{product.unit}</span>
                </div>
                <div className="mt-2">
                  {product.outOfStock ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      Depleted / Out of Stock
                    </span>
                  ) : product.lowStock ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      Low Stock (Reorder Level: {product.reorderLevel})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Normal Inventory Level
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing & Supplier */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Cost Price</span>
                  <span className="font-mono font-bold">${product.costPrice?.toFixed(2)}</span>
                </div>
                <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Selling Price</span>
                  <span className="font-mono font-bold">${product.sellingPrice?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Deltas */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-3">
                1-Click Quick Adjustments
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleQuickDelta(1)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Quick +1 Stock
                </button>
                <button
                  type="button"
                  disabled={updating || product.quantity <= 0}
                  onClick={() => handleQuickDelta(-1)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-40 dark:bg-rose-950/60 dark:text-rose-300 transition-colors"
                >
                  <Minus className="h-4 w-4" /> Quick -1 Stock
                </button>
              </div>
            </div>
          </div>

          {/* Right: Movement Action Form (2 Cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 mb-6">
              {[
                { id: 'IN', label: 'Stock IN (Receive)', icon: ArrowDownLeft, color: 'text-emerald-600' },
                { id: 'OUT', label: 'Stock OUT (Dispatch)', icon: ArrowUpRight, color: 'text-indigo-600' },
                { id: 'ADJUSTMENT', label: 'Audit Adjustment', icon: Sliders, color: 'text-amber-600' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${tab.color}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Adjustment Form */}
            <form onSubmit={handleFullAdjustment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Quantity to {activeTab === 'IN' ? 'Add' : activeTab === 'OUT' ? 'Deduct' : 'Adjust'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {activeTab === 'OUT' && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Max available: {product.quantity} units
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Reference / PO / SO Number
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. PO-9001, SCAN-1234"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Reason for Movement
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Regular Restock, Customer Order, Physical Audit Count"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={updating || (activeTab === 'OUT' && product.quantity < quantity)}
                  className={`inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-40 ${
                    activeTab === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : activeTab === 'OUT'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                  {updating ? 'Recording Movement...' : `Confirm ${activeTab} Movement`}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/40">
          <Barcode className="h-14 w-14 text-indigo-400 mx-auto mb-3 opacity-60 animate-pulse" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Ready for Barcode Input
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Scan any physical barcode with your scanner or click Camera Scan to begin updating stock in real time.
          </p>
        </div>
      )}

      {/* Session Recent Scans */}
      {recentScans.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-500" /> Recent Scans in this Session
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {recentScans.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLookup(item.product.sku)}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-left hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-800/50 transition-all text-xs"
              >
                <div className="font-bold truncate text-slate-900 dark:text-white">{item.product.name}</div>
                <div className="font-mono text-[10px] text-slate-400">{item.product.sku}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                  Qty: {item.product.quantity}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera Scanning Modal */}
      <CameraScannerModal
        isOpen={showCamera}
        onClose={() => {
          setShowCamera(false);
          scanInputRef.current?.focus();
        }}
        onScanSuccess={(decoded) => handleLookup(decoded)}
      />
    </div>
  );
};

export default ScanUpdatePage;
