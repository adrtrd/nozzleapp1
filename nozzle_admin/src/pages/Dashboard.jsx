import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingBag, ShoppingCart, Users, Terminal } from 'lucide-react';
import api from '../services/api';
import StatsCard from '../components/StatsCard';
import ChartSection from '../components/ChartSection';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, logsRes] = await Promise.all([
          api.get('/stats'),
          api.get('/logs?limit=5')
        ]);
        setStats(statsRes.data);
        setLogs(logsRes.data);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {};
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-800 rounded-3xl"></div>
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="h-96 bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-800 rounded-3xl"></div>
      </div>
    );
  }

  const orderStatusColors = {
    pending: 'bg-orange-100 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400',
  };

  const orderStatusLabels = {
    pending: 'معلق',
    processing: 'قيد التجهيز',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-dark-100">لوحة الإحصائيات العامة</h1>
        <p className="text-xs text-gray-400 mt-1">متابعة المبيعات الكلية، حالة المخزون، والعمليات الحساسة في النظام</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي الإيرادات"
          value={`${(stats?.total_revenue || 0).toLocaleString()} د.ع`}
          percentage={stats?.revenue_growth_percentage}
          icon={DollarSign}
          color="primary"
        />
        <StatsCard
          title="عدد الطلبات"
          value={stats?.total_orders}
          percentage={stats?.orders_growth_percentage}
          icon={ShoppingCart}
          color="green"
        />
        <StatsCard
          title="المنتجات المسجلة"
          value={stats?.total_products}
          icon={ShoppingBag}
          color="orange"
        />
        <StatsCard
          title="المشرفون النشطون"
          value={stats?.total_users}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Responsive Analytics Charts */}
      <ChartSection 
        revenueData={stats?.monthly_revenue} 
        categoryData={stats?.category_share} 
      />

      {/* Bottom Grid: Recent Orders & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Orders Card */}
        <div className="bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-800 rounded-3xl p-6 shadow-premium">
          <h3 className="font-extrabold text-base text-gray-800 dark:text-dark-100 mb-4">آخر الطلبيات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 dark:border-dark-800 text-gray-400">
                  <th className="pb-3 font-bold">الرقم</th>
                  <th className="pb-3 font-bold">العميل</th>
                  <th className="pb-3 font-bold">الإجمالي</th>
                  <th className="pb-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-800 font-medium">
                {stats?.recent_orders?.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 font-bold text-gray-800 dark:text-dark-200">#{o.id}</td>
                    <td className="py-3 text-gray-600 dark:text-dark-400">{o.customer}</td>
                    <td className="py-3 font-bold text-gray-800 dark:text-dark-200">{(o.amount || 0).toLocaleString()} د.ع</td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${orderStatusColors[o.status]}`}>
                        {orderStatusLabels[o.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Activity Logs Card */}
        <div className="bg-white dark:bg-dark-900 border border-gray-100 dark:border-dark-800 rounded-3xl p-6 shadow-premium flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Terminal size={18} className="text-primary-500" />
            <h3 className="font-extrabold text-base text-gray-800 dark:text-dark-100">سجل عمليات النظام</h3>
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto max-h-64 pr-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-xs leading-relaxed">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-dark-950 flex items-center justify-center font-bold text-gray-500 dark:text-dark-400 flex-shrink-0">
                  {log.user?.full_name?.charAt(0) || 'س'}
                </div>
                <div>
                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-gray-700 dark:text-dark-200">
                      {log.user?.full_name || 'النظام'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-dark-400 mt-0.5">{log.details || log.action}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-gray-400 text-center py-8">لا توجد عمليات مسجلة حالياً</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
