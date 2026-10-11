import React, { useEffect, useState, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Barcode, 
  Edit2, 
  Trash2, 
  Printer, 
  AlertTriangle, 
  Check, 
  X, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { productApi, categoryApi, supplierApi, reportApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { TableSkeleton } from '../components/common/SkeletonLoader';

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const { isManager } = useAuth();
  const { subscribeStockUpdates } = useWebSocket();

  // Table Data State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Modals State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fileInputRef = useRef(null);

  // Form State
  const initialForm = {
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    supplierId: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    reorderLevel: 10,
    unit: 'PCS',
    imageUrl: '',
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productApi.getProducts({
        search: search.trim() || undefined,
        categoryId: selectedCategory || undefined,
        supplierId: selectedSupplier || undefined,
        lowStockOnly,
        page,
        size: 10,
        sortBy,
        sortDir,
      });

      setProducts(res.data.content);
      setTotalPages(res.data.totalPages);
      setTotalElements(res.data.totalElements);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        categoryApi.getAll(),
        supplierApi.getAll(),
      ]);
      setCategories(catRes.data);
      setSuppliers(supRes.data);
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSupplier, lowStockOnly, page, sortBy, sortDir]);

  // Live WebSocket Stock Update Subscription
  useEffect(() => {
    const unsubscribe = subscribeStockUpdates((updatedProduct) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
      );
    });
    return () => unsubscribe();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      ...initialForm,
      categoryId: categories[0]?.id || '',
      supplierId: suppliers[0]?.id || '',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      categoryId: product.categoryId || '',
      supplierId: product.supplierId || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      unit: product.unit || 'PCS',
      imageUrl: product.imageUrl || '',
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const payload = {
        ...formData,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        quantity: parseInt(formData.quantity, 10),
        reorderLevel: parseInt(formData.reorderLevel, 10),
      };

      if (editingProduct) {
        await productApi.updateProduct(editingProduct.id, payload);
        setMessage({ text: 'Product successfully updated', type: 'success' });
      } else {
        await productApi.createProduct(payload);
        setMessage({ text: 'New product added to inventory', type: 'success' });
      }

      setShowFormModal(false);
      fetchProducts();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to save product',
        type: 'error',
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await productApi.deleteProduct(deleteTarget.id);
      setMessage({ text: `Product ${deleteTarget.name} deleted`, type: 'success' });
      setDeleteTarget(null);
      fetchProducts();
    } catch (err) {
      setMessage({ text: 'Failed to delete product', type: 'error' });
    }
  };

  const handleViewBarcode = async (product) => {
    try {
      const res = await productApi.getBarcode(product.id);
      setBarcodeData(res.data);
      setShowBarcodeModal(true);
    } catch (err) {
      console.error('Failed to generate barcode:', err);
    }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await productApi.importCsv(form);
      setMessage({ text: res.data.message, type: 'success' });
      fetchProducts();
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'CSV Import failed',
        type: 'error',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePrintLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Product Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Total of {totalElements} items tracked with automated Code128 barcodes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Import */}
          {isManager && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCsvImport}
                accept=".csv"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <Upload className="h-4 w-4" /> Import CSV
              </button>
            </>
          )}

          {/* CSV Export */}
          <a
            href={reportApi.exportProductsCsvUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>

          {/* Add Product Button */}
          {isManager && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          )}
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier Dropdown */}
        <div>
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
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

        {/* Low Stock Filter Button */}
        <div className="flex items-center">
          <button
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setPage(0);
            }}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
              lowStockOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockOnly ? 'Showing Low Stock' : 'Filter Low Stock'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Price</th>
                  <th className="py-3 px-4 text-right">On Hand</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl || 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=100'}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover bg-slate-100 border border-slate-200 dark:border-slate-800"
                          />
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                            <div className="font-mono text-[11px] text-slate-400">{p.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {p.categoryName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {p.supplierName}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-medium">
                        ${p.costPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ${p.sellingPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-slate-900 dark:text-white">{p.quantity}</span>
                        <span className="text-[10px] text-slate-400 ml-1">{p.unit}</span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {p.outOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Out of Stock
                          </span>
                        ) : p.lowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Low Stock ({p.reorderLevel})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            In Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Barcode Modal Button */}
                          <button
                            onClick={() => handleViewBarcode(p)}
                            title="Barcode & Printable Label"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>

                          {/* Edit Button */}
                          {isManager && (
                            <button
                              onClick={() => handleOpenEdit(p)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Delete Button */}
                          {isManager && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              title="Delete Product"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-4 w-4" />
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
            <div>
              Showing Page {page + 1} of {Math.max(1, totalPages)}
            </div>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Product */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <select
                required
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reorder Level *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit (PCS, BOX, KG, etc.)
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
            >
              {formSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Barcode & Label Printable View */}
      <Modal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        title="Product Barcode Label"
        maxWidth="max-w-md"
      >
        {barcodeData && (
          <div className="flex flex-col items-center text-center">
            {/* Printable Label Card */}
            <div id="printable-label" className="w-full p-6 border-2 border-dashed border-slate-300 rounded-2xl bg-white text-slate-900 shadow-sm print:m-0 print:border-none">
              <div className="font-extrabold text-base mb-1">{barcodeData.name}</div>
              <div className="text-xs font-mono text-slate-500 mb-4 tracking-wider">SKU: {barcodeData.sku}</div>

              {/* Code128 Barcode Image */}
              <div className="flex justify-center mb-4">
                <img src={barcodeData.barcodeBase64} alt="Code128 Barcode" className="h-20 object-contain" />
              </div>

              {/* QR Code Image */}
              <div className="flex justify-center mb-2">
                <img src={barcodeData.qrCodeBase64} alt="QR Code" className="h-24 w-24 object-contain" />
              </div>

              <div className="text-[10px] text-slate-400 mt-2">InvenIQ Verified Asset Label</div>
            </div>

            <div className="flex w-full gap-2 mt-5">
              <button
                type="button"
                onClick={handlePrintLabel}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
              >
                <Printer className="h-4 w-4" /> Print Label
              </button>
              <button
                type="button"
                onClick={() => setShowBarcodeModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete ${deleteTarget?.name} (${deleteTarget?.sku})? This cannot be undone.`}
      />
    </div>
  );
};

export default ProductsPage;
