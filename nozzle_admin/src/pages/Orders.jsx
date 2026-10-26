import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Clock } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import OrderModal from '../components/OrderModal';
import Toast from '../components/Toast';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to load orders:', error);
      showToast('فشل تحميل الطلبيات من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    return () => {};
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleUpdateStatus = () => {
    showToast('تم تحديث حالة الطلب وإرسال إشعار للمستخدم');
    fetchOrders();
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || 
                          o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
                          o.id.toString() === search;
    const matchesStatus = selectedStatus === '' || o.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const headers = ['رقم الطلب', 'العميل', 'البريد الإلكتروني', 'كود الخصم', 'الإجمالي', 'الحالة', 'التاريخ', 'خيارات'];

  const statusColors = {
    pending: 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900 dark:text-orange-400',
    processing: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400',
    completed: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400',
    cancelled: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400',
  };

  const statusLabels = {
    pending: 'معلق',
    processing: 'قيد التجهيز',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-dark-100">إدارة طلبات الشراء</h1>
        <p className="text-xs text-gray-400 mt-1">متابعة شحنات الطلبات وتحديث حالات الدفع وتعديل الفواتير</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => { setSelectedStatus(''); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedStatus === '' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50'
          }`}
        >
          الكل
        </button>
        {Object.keys(statusLabels).map((key) => (
          <button
            key={key}
            onClick={() => { setSelectedStatus(key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === key 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50'
            }`}
          >
            {statusLabels[key]}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <DataTable
        title="قائمة الفواتير والطلبات"
        subtitle="جميع العمليات الشرائية التي تمت في التطبيق"
        headers={headers}
        data={paginatedOrders}
        loading={loading}
        searchPlaceholder="ابحث برقم الطلب، اسم العميل، بريده..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        renderRow={(order) => (
          <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-950/20 transition-colors">
            {/* ID */}
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-dark-200">
              #{order.id}
            </td>
            {/* Customer Name */}
            <td className="px-6 py-4 text-gray-800 dark:text-dark-100 font-bold">
              {order.customer_name}
            </td>
            {/* Customer Email */}
            <td className="px-6 py-4 text-gray-500 dark:text-dark-400">
              {order.customer_email}
            </td>
            {/* Coupon Code */}
            <td className="px-6 py-4">
              {order.coupon_code ? (
                <span className="inline-flex px-2.5 py-0.5 rounded-lg border text-[10px] font-bold bg-emerald-50 border-emerald-250 text-emerald-750 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400">
                  {order.coupon_code}
                </span>
              ) : (
                <span className="text-gray-300 dark:text-dark-700">—</span>
              )}
            </td>
            {/* Total */}
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-dark-200">
              {Number(order.total_amount).toLocaleString()} د.ع
            </td>
            {/* Status */}
            <td className="px-6 py-4">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
            </td>
            {/* Date */}
            <td className="px-6 py-4 text-gray-500 dark:text-dark-400 text-xs">
              {new Date(order.created_at).toLocaleDateString('ar-SA')}
            </td>
            <td className="px-6 py-4">
              <button
                onClick={() => navigate(`/orders/${order.id}`)}
                className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs"
              >
                <Eye size={16} />
                تفاصيل
              </button>
            </td>
          </tr>
        )}
      />

      {/* Invoice details sheet modal */}
      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
        onUpdateStatus={handleUpdateStatus}
      />

      {/* Toast feedback alerts */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />
    </div>
  );
}
