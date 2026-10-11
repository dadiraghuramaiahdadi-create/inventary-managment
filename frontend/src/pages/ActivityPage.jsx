import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Sliders, 
  Calendar, 
  User,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { stockApi, productApi, reportApi } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { TableSkeleton } from '../components/common/SkeletonLoader';

const ActivityPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const { subscribeActivity } = useWebSocket();

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await stockApi.getTransactions({
        productId: selectedProductId || undefined,
        type: selectedType || undefined,
        user: userQuery.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
        page,
        size: 15,
      });

      setTransactions(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to load transaction audit log:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productApi.getAllProductsList().then((res) => setProducts(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [selectedProductId, selectedType, userQuery, startDate, endDate, page]);

  // Live WebSocket activity subscription
  useEffect(() => {
    const unsubscribe = subscribeActivity((newTx) => {
      setTransactions((prev) => [newTx, ...prev.slice(0, 14)]);
    });
    return () => unsubscribe();
  }, []);

  // Format UTC timestamp to local "DD MMM YYYY, hh:mm:ss AM/PM"
  const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'IN':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'PO_RECEIVE':
        return 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300';
      case 'OUT':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300';
      default:
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <History className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Inventory Activity Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete immutable audit trail of every stock IN, OUT, ADJUSTMENT, and PO Receipt.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={reportApi.exportActivityCsvUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV Ledger
          </a>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Product Filter */}
        <div>
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {/* Movement Type Filter */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Movement Types</option>
            <option value="IN">Stock IN</option>
            <option value="OUT">Stock OUT</option>
            <option value="PO_RECEIVE">PO Receive</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
        </div>

        {/* User Search */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Operator username..."
            value={userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Activity Table */}
      {loading ? (
        <TableSkeleton rows={10} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4 text-center">Type</th>
                  <th className="py-3 px-4 text-right">Delta</th>
                  <th className="py-3 px-4 text-right">Before → After</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No stock movements recorded for the selected criteria.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {formatTimestamp(tx.timestamp)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{tx.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{tx.productSku}</div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadge(tx.transactionType)}`}>
                          {tx.transactionType}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-extrabold">
                        <span className={tx.quantityChanged > 0 ? 'text-emerald-600' : 'text-indigo-600'}>
                          {tx.quantityChanged > 0 ? `+${tx.quantityChanged}` : tx.quantityChanged}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {tx.beforeQuantity} → <span className="font-bold text-slate-800 dark:text-slate-200">{tx.afterQuantity}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {tx.referenceNumber || 'N/A'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {tx.reason || '-'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                        {tx.performedBy}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing Page {page + 1} of {Math.max(1, totalPages)}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityPage;
