import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Common Components
import Layout from './components/common/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import ScanUpdatePage from './pages/ScanUpdatePage';
import ProductIntelligencePage from './pages/ProductIntelligencePage';
import WhatIfSimulatorPage from './pages/WhatIfSimulatorPage';
import SmartInventoryPage from './pages/SmartInventoryPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import ActivityPage from './pages/ActivityPage';
import ReportsPage from './pages/ReportsPage';
import SuppliersPage from './pages/SuppliersPage';
import UsersPage from './pages/UsersPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Route wrapper restricted to Manager and Admin (blocks Staff)
const ManagerRoute = ({ children }) => {
  const { isManager, loading } = useAuth();

  if (loading) return null;
  if (!isManager) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// Route wrapper restricted strictly to Admin
const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WebSocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Authenticated Dashboard Routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="scan" element={<ScanUpdatePage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="reports" element={<ReportsPage />} />

                {/* Manager & Admin Analytics Modules (Restricted from Staff) */}
                <Route
                  path="intelligence"
                  element={
                    <ManagerRoute>
                      <ProductIntelligencePage />
                    </ManagerRoute>
                  }
                />
                <Route
                  path="simulator"
                  element={
                    <ManagerRoute>
                      <WhatIfSimulatorPage />
                    </ManagerRoute>
                  }
                />
                <Route
                  path="smart-reorder"
                  element={
                    <ManagerRoute>
                      <SmartInventoryPage />
                    </ManagerRoute>
                  }
                />

                {/* Manager & Admin Operations (Restricted from Staff) */}
                <Route
                  path="purchase-orders"
                  element={
                    <ManagerRoute>
                      <PurchaseOrdersPage />
                    </ManagerRoute>
                  }
                />
                <Route
                  path="suppliers"
                  element={
                    <ManagerRoute>
                      <SuppliersPage />
                    </ManagerRoute>
                  }
                />

                {/* Admin-Only Management (Restricted from Manager & Staff) */}
                <Route
                  path="users"
                  element={
                    <AdminRoute>
                      <UsersPage />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
