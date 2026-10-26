import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import DataTable from '../components/DataTable';
import ProductModal from '../components/ProductModal';
import Toast from '../components/Toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories?include_children=1')
      ]);
      
      const prodList = prodRes.data?.data || (Array.isArray(prodRes.data) ? prodRes.data : []);
      const catList = catRes.data?.data || (Array.isArray(catRes.data) ? catRes.data : []);
      
      setProducts(prodList);
      setCategories(catList);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      showToast('فشل تحميل المنتجات من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟')) return;

    try {
      await api.delete(`/products/${productId}`);
      showToast('تم حذف المنتج بنجاح');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      showToast('فشل حذف المنتج من الخادم', 'error');
    }
  };

  const handleSave = () => {
    showToast(editingProduct ? 'تم تعديل المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
    fetchProducts();
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === '' || p.category_id === parseInt(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Paginated Products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const headers = ['الصورة', 'اسم المنتج', 'التصنيف', 'السعر', 'المخزون', 'خيارات التحكم'];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-dark-100">إدارة كتالوج المنتجات</h1>
          <p className="text-xs text-gray-400 mt-1">عرض، إضافة، وتعديل وتصفية المنتجات المتوفرة في المخزن</p>
        </div>
      </div>

      {/* Categories filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => { setSelectedCategory(''); setCurrentPage(1); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedCategory === '' 
              ? 'bg-primary-600 text-white shadow-md' 
              : 'bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50'
          }`}
        >
          كل الأقسام
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id.toString()); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat.id.toString() 
                ? 'bg-primary-600 text-white shadow-md' 
                : 'bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 text-gray-600 dark:text-dark-300 hover:bg-gray-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <DataTable
        title="قائمة المنتجات"
        subtitle="جميع المنتجات المسجلة في قاعدة بيانات نوزل"
        headers={headers}
        data={paginatedProducts}
        loading={loading}
        searchPlaceholder="ابحث باسم المنتج أو تفاصيله..."
        searchValue={search}
        onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        actionButton={
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Plus size={16} />
            إضافة منتج
          </button>
        }
        renderRow={(product) => (
          <tr key={product.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-950/20 transition-colors">
            {/* Image */}
            <td className="px-6 py-4">
              <img
                src={product.image_url || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop'}
                alt={product.name}
                className="w-10 h-10 object-cover rounded-xl border border-gray-200 dark:border-dark-800"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop';
                }}
              />
            </td>
            {/* Name */}
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-dark-200">
              {product.name}
              {product.stock <= 5 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mr-2">
                  <AlertTriangle size={10} />
                  مخزون حرج
                </span>
              )}
            </td>
            {/* Category */}
            <td className="px-6 py-4 text-gray-500 dark:text-dark-400">
              {product.category?.name || 'غير مصنف'}
            </td>
            {/* Price */}
            <td className="px-6 py-4 font-bold text-gray-800 dark:text-dark-200">
              {product.price.toLocaleString()} د.ع
            </td>
            {/* Stock */}
            <td className="px-6 py-4">
              <span className={`font-bold text-xs ${product.stock === 0 ? 'text-red-500' : 'text-gray-700 dark:text-dark-300'}`}>
                {product.stock === 0 ? 'نفذت الكمية' : `${product.stock} قطعة`}
              </span>
            </td>
            {/* Controls */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors cursor-pointer"
                  title="تعديل المنتج"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                  title="حذف المنتج"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        )}
      />

      {/* Edit/Create Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSave={handleSave}
      />

      {/* Toast Alert */}
      <Toast 
        message={toastMessage} 
        type={toastType} 
        onClose={() => setToastMessage('')} 
      />
    </div>
  );
}
