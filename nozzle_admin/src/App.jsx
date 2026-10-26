import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import Users from './pages/Users';
import Customers from './pages/Customers';
import UserDetailPage from './pages/UserDetailPage';
import Categories from './pages/Categories';
import Banners from './pages/Banners';
import Discounts from './pages/Discounts';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import OrderDetailPage from './pages/OrderDetailPage';
import InvoicePage from './pages/InvoicePage';
import InventoryDashboard from './pages/InventoryDashboard';
import ServicesManagementPage from './pages/services/ServicesManagementPage';
import ServiceRequestDetailPage from './pages/services/ServiceRequestDetailPage';
import ServicePrintPage from './pages/services/ServicePrintPage';
import ProductTagsPage from './pages/categories/ProductTagsPage';

// Route Guard for Authenticated Users
const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return token ? children : <Navigate to="/login" replace />;
};

// Route Guard for Super Admins Only
const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user?.role === 'superadmin' ? children : <Navigate to="/" replace />;
};

// Main Layout Wrapper
const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-dark-50 overflow-hidden font-cairo">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Dynamic page content wrapper */}
        <main className="flex-grow p-8 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/services" element={<ServicesManagementPage />} />
            <Route path="/services/requests/:id" element={<ServiceRequestDetailPage />} />
            <Route path="/services/requests/:id/print" element={<ServicePrintPage />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<UserDetailPage />} />
            <Route path="/product-tags" element={<ProductTagsPage />} />
            <Route path="/banners" element={<Banners />} />
            <Route path="/discounts" element={<Discounts />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={
              <SuperAdminRoute>
                <Settings />
              </SuperAdminRoute>
            } />
            <Route path="/users" element={
              <SuperAdminRoute>
                <Users />
              </SuperAdminRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const routerBase = window.location.pathname.startsWith('/admin') ? '/admin' : '/panel';
  return (
    <ThemeProvider>
      <Router basename={routerBase}>
        <AuthProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />
            
            {/* Standalone Printable Invoice */}
            <Route 
              path="/orders/:id/invoice" 
              element={
                <PrivateRoute>
                  <InvoicePage />
                </PrivateRoute>
              } 
            />
            
            {/* Protected Management Routes */}
            <Route 
              path="/*" 
              element={
                <PrivateRoute>
                  <DashboardLayout />
                </PrivateRoute>
              } 
            />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}
