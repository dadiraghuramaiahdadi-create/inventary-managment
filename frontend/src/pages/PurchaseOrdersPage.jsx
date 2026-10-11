import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Clock, 
  Eye, 
  Trash2, 
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { poApi, supplierApi, productApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { TableSkeleton } from '../components/common/SkeletonLoader';

const PurchaseOrdersPage = () => {
  const { isManager } = useAuth();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPoDetails, setSelectedPoDetails] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'RECEIVE' | 'APPROVE' | 'CANCEL', po: object }
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // PO Creation Form State
  const [newPoSupplierId, setNewPoSupplierId] = useState('');
  const [newPoDeliveryDate, setNewPoDeliveryDate] = useState('');
  const [newPoNotes, setNewPoNotes] = useState('');
  const [poItems, setPoItems] = useState([
    { productId: '', quantityOrdered: 1, unitPrice: 0 },
  ]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await poApi.getAll({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        supplierId: supplierFilter || undefined,
        page,
        size: 10,
      });
      setOrders(res.data.content);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        supplierApi.getAll(),
        productApi.getAllProductsList(),
      ]);
      setSuppliers(supRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, supplierFilter, page]);

  const handleAddItemRow = () => {
    setPoItems([...poItems, { productId: '', quantityOrdered: 1, unitPrice: 0 }]);
  };

  const handleRemoveItemRow = (idx) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...poItems];
    if (field === 'productId') {
      const prod = products.find((p) => p.id === parseInt(value, 10));
      updated[idx].productId = value;
      if (prod) {
        updated[idx].unitPrice = prod.costPrice;
      }
    } else {
      updated[idx][field] = value;
    }
    setPoItems(updated);
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    if (!newPoSupplierId || poItems.length === 0) return;

    try {
      setActionLoading(true);
      const payload = {
        supplierId: parseInt(newPoSupplierId, 10),
        expectedDeliveryDate: newPoDeliveryDate || undefined,
        notes: newPoNotes,
        items: poItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantityOrdered: parseInt(item.quantityOrdered, 10),
          unitPrice: parseFloat(item.unitPrice),
        })),
      };

      await poApi.create(payload);
      setMessage({ text: 'Purchase Order successfully created!', type: 'success' });
      setShowCreateModal(false);
      setPoItems([{ productId: '', quantityOrdered: 1, unitPrice: 0 }]);
      fetchOrders();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to create PO', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!confirmAction) return;
    const { type, po } = confirmAction;
    try {
      setActionLoading(true);
      if (type === 'APPROVE') {
        await poApi.approve(po.id);
        setMessage({ text: `Order ${po.orderNumber} approved`, type: 'success' });
      } else if (type === 'RECEIVE') {
        await poApi.receive(po.id);
        setMessage({ text: `Order ${po.orderNumber} received! Inventory updated.`, type: 'success' });
      } else if (type === 'CANCEL') {
        await poApi.cancel(po.id);
        setMessage({ text: `Order ${po.orderNumber} cancelled`, type: 'success' });
      }
      setConfirmAction(null);
      fetchOrders();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Workflow transition failed', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'APPROVED':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300';
      case 'PENDING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShoppingCart className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Purchase Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supplier procurement lifecycle, approvals, and automated warehouse replenishment.
          </p>
        </div>

        {isManager && (
          <button
            onClick={() => {
              setNewPoSupplierId(suppliers[0]?.id || '');
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" /> Create Purchase Order
          </button>
        )}
      </div>

      {message.text && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Order Number or Supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Date</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {po.orderNumber}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {po.supplierName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {po.orderDate}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {po.expectedDeliveryDate || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-semibold">
                        {po.items?.length || 0}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                        ${po.totalAmount?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(po.status)}`}>
                          {po.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setSelectedPoDetails(po)}
                            title="View Lines"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Approve Action */}
                          {isManager && (po.status === 'PENDING' || po.status === 'DRAFT') && (
                            <button
                              onClick={() => setConfirmAction({ type: 'APPROVE', po })}
                              className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold"
                            >
                              Approve
                            </button>
                          )}

                          {/* Receive Action */}
                          {isManager && po.status === 'APPROVED' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'RECEIVE', po })}
                              className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold shadow-sm"
                            >
                              Receive Goods
                            </button>
                          )}

                          {/* Cancel Action */}
                          {isManager && (po.status === 'PENDING' || po.status === 'APPROVED' || po.status === 'DRAFT') && (
                            <button
                              onClick={() => setConfirmAction({ type: 'CANCEL', po })}
                              className="p-1 rounded text-slate-400 hover:text-rose-600"
                              title="Cancel PO"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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

      {/* Modal: View Order Details */}
      <Modal
        isOpen={!!selectedPoDetails}
        onClose={() => setSelectedPoDetails(null)}
        title={`Purchase Order: ${selectedPoDetails?.orderNumber}`}
        maxWidth="max-w-2xl"
      >
        {selectedPoDetails && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Supplier</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedPoDetails.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(selectedPoDetails.status)}`}>
                  {selectedPoDetails.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Order Date</span>
                <span className="font-mono">{selectedPoDetails.orderDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Expected Date</span>
                <span className="font-mono">{selectedPoDetails.expectedDeliveryDate || 'N/A'}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Product Item</th>
                    <th className="py-2.5 px-3 text-right">Ordered</th>
                    <th className="py-2.5 px-3 text-right">Received</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedPoDetails.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {item.productName} ({item.productSku})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{item.quantityOrdered}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                        {item.quantityReceived}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">${item.unitPrice?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">${item.lineTotal?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-2 text-xs">
              <div className="w-56 space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-mono">${selectedPoDetails.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax (10%):</span>
                  <span className="font-mono">${selectedPoDetails.taxAmount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-1 text-sm">
                  <span>Grand Total:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    ${selectedPoDetails.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Create Purchase Order */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Purchase Order"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreatePo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <select
                required
                value={newPoSupplierId}
                onChange={(e) => setNewPoSupplierId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Lead time: {s.leadTimeDays}d)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={newPoDeliveryDate}
                onChange={(e) => setNewPoDeliveryDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Order Line Items *
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {poItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    required
                    value={item.productId}
                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select Product Item</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    required
                    value={item.quantityOrdered}
                    onChange={(e) => handleItemChange(idx, 'quantityOrdered', e.target.value)}
                    className="w-20 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price"
                    required
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                    className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
                  />

                  {poItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Order Notes / Delivery Instructions
            </label>
            <textarea
              rows="2"
              value={newPoNotes}
              onChange={(e) => setNewPoNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            >
              {actionLoading ? 'Creating...' : 'Submit Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Workflow Actions */}
      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleExecuteWorkflow}
        title={`Confirm ${confirmAction?.type} Order`}
        message={
          confirmAction?.type === 'RECEIVE'
            ? `Receiving PO ${confirmAction?.po.orderNumber} will automatically increment inventory stock for all line items and record the activity audit log. Proceed?`
            : confirmAction?.type === 'CANCEL'
            ? `Are you sure you want to cancel PO ${confirmAction?.po.orderNumber}?`
            : `Approve PO ${confirmAction?.po.orderNumber}?`
        }
        confirmText={confirmAction?.type === 'RECEIVE' ? 'Receive Goods' : confirmAction?.type === 'CANCEL' ? 'Cancel PO' : 'Approve PO'}
        isDestructive={confirmAction?.type === 'CANCEL'}
        loading={actionLoading}
      />
    </div>
  );
};

export default PurchaseOrdersPage;
