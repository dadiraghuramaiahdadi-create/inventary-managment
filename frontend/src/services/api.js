import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('inveniq_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthenticated sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Avoid infinite redirect loops if login itself failed with 401
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('inveniq_token');
        localStorage.removeItem('inveniq_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
};

// Product Services
export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getAllProductsList: () => api.get('/products/all'),
  getProductById: (id) => api.get(`/products/${id}`),
  getByScan: (identifier) => api.get(`/products/scan/${identifier}`),
  getLowStock: () => api.get('/products/low-stock'),
  getBarcode: (id) => api.get(`/products/${id}/barcode`),
  generateBarcode: (text) => api.get('/products/barcode/generate', { params: { text } }),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  importCsv: (formData) => api.post('/products/import-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Stock Movement Services
export const stockApi = {
  getTransactions: (params) => api.get('/stock/transactions', { params }),
  getRecentTransactions: () => api.get('/stock/recent'),
  adjustStock: (data) => api.post('/stock/adjust', data),
};

// Categories & Suppliers
export const categoryApi = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const supplierApi = {
  getAll: () => api.get('/suppliers'),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Purchase Orders
export const poApi = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  approve: (id) => api.post(`/purchase-orders/${id}/approve`),
  receive: (id) => api.post(`/purchase-orders/${id}/receive`),
  cancel: (id) => api.post(`/purchase-orders/${id}/cancel`),
};

// Dashboard
export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getStockMovement: (days = 14) => api.get(`/dashboard/stock-movement?days=${days}`),
  getCategoryDistribution: () => api.get('/dashboard/category-distribution'),
  getTopMovers: (limit = 5) => api.get(`/dashboard/top-movers?limit=${limit}`),
  getLowStockAlerts: () => api.get('/dashboard/low-stock-alerts'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// Reports
export const reportApi = {
  exportProductsCsvUrl: 'http://localhost:8080/api/reports/products/export-csv',
  exportActivityCsvUrl: 'http://localhost:8080/api/reports/activity/export-csv',
  exportLowStockCsvUrl: 'http://localhost:8080/api/reports/low-stock/export-csv',
  exportValuationPdfUrl: 'http://localhost:8080/api/reports/inventory-valuation/export-pdf',
};

// Python Analytics Proxy
export const analyticsApi = {
  getIntelligence: () => api.get('/analytics/intelligence'),
  simulate: (params) => api.post('/analytics/simulate', params),
  getSmartReorder: () => api.get('/analytics/smart-reorder'),
  autoOrder: (params = {}) => api.post('/analytics/auto-order', params),
};

// User Management (Admin only)
export const userApi = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
};

export default api;
