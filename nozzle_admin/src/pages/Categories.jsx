import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ImageUploader from '../components/ui/ImageUploader';
import ImageSpecsTable from '../components/ui/ImageSpecsTable';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Folder, 
  FolderPlus,
  ArrowUpDown,
  Search,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [parentList, setParentList] = useState([]);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [slug, setSlug] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories?include_children=1');
      if (res.data && res.data.status === 'success') {
        const data = res.data.data || [];
        setCategories(data);
        
        // Extract all categories as a flat list for parent dropdown (only root categories can be parents)
        const flatParents = data.filter(c => !c.parent_id);
        setParentList(flatParents);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (id) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddModal = (parentCatId = null) => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setParentId(parentCatId ? String(parentCatId) : '');
    setIconUrl('');
    setImageUrl('');
    setSlug('');
    setSeoTitle('');
    setSeoDescription('');
    setIsActive(true);
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setParentId(cat.parent_id ? String(cat.parent_id) : '');
    setIconUrl(cat.icon_url || '');
    setImageUrl(cat.image_url || '');
    setSlug(cat.slug || '');
    setSeoTitle(cat.seo_title || '');
    setSeoDescription(cat.seo_description || '');
    setIsActive(cat.is_active !== false);
    setErrorMessage('');
    setModalOpen(true);
  };

  // Auto-generate slug from name
  const handleNameChange = (val) => {
    setName(val);
    if (!editingCategory) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') // Support Arabic characters and numbers
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!name.trim()) {
      setErrorMessage('اسم القسم مطلوب');
      return;
    }

    const finalSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;

    const payload = {
      name: name.trim(),
      description: description || null,
      parent_id: parentId ? parseInt(parentId) : null,
      icon_url: iconUrl || null,
      image_url: imageUrl || null,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      slug: finalSlug,
      is_active: isActive
    };

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      if (parentId) {
        setExpandedNodes(prev => ({ ...prev, [parseInt(parentId)]: true }));
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'حدث خطأ أثناء حفظ القسم';
      setErrorMessage(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف الأقسام الفرعية التابعة له تلقائياً!')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert('حدث خطأ أثناء حذف القسم');
    }
  };

  const moveOrder = async (index, direction) => {
    const list = [...categories];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === list.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Build payload for sort ordering
    const sortPayload = list.map((cat, i) => ({
      id: cat.id,
      sort_order: i
    }));

    try {
      setCategories(list);
      await api.put('/categories/sort/order', sortPayload);
    } catch (err) {
      console.error('Error sorting categories:', err);
      fetchCategories();
    }
  };

  const renderCategoryNode = (cat, index, depth = 0) => {
    const hasChildren = cat.subcategories && cat.subcategories.length > 0;
    const isExpanded = !!expandedNodes[cat.id];
    
    return (
      <div key={cat.id} className="w-full">
        <div 
          className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-dark-800/40 border-b border-gray-100 dark:border-dark-800/60 rounded-lg mb-1 transition-colors"
          style={{ marginRight: `${depth * 28}px` }}
        >
          <div className="flex items-center gap-3">
            {/* Collapse toggle */}
            {hasChildren ? (
              <button 
                onClick={() => toggleNode(cat.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-md text-gray-500"
              >
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            ) : (
              <div className="w-7 h-7 flex items-center justify-center text-gray-300 dark:text-dark-700">
                •
              </div>
            )}

            {/* Folder icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.parent_id ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20' : 'bg-primary-50 text-primary-500 dark:bg-primary-950/20'}`}>
              {hasChildren ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />) : <Folder size={16} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 dark:text-dark-100">{cat.name}</span>
                {!cat.is_active && (
                  <span className="bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full border border-red-200 font-bold flex items-center gap-0.5">
                    <EyeOff size={10} /> مخفي
                  </span>
                )}
              </div>
              {cat.slug && <span className="text-xs text-gray-400 font-mono">/{cat.slug}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Product count stats */}
            <span className="text-xs bg-gray-100 dark:bg-dark-800 text-gray-500 dark:text-dark-300 px-2.5 py-1 rounded-md font-bold">
              {cat.product_count} منتج
            </span>

            {/* Drag order (only on root levels for simplicity) */}
            {!cat.parent_id && (
              <div className="flex items-center">
                <button 
                  onClick={() => moveOrder(index, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-gray-150 dark:hover:bg-dark-800 rounded text-gray-400 disabled:opacity-30"
                >
                  ▲
                </button>
                <button 
                  onClick={() => moveOrder(index, 'down')}
                  disabled={index === categories.length - 1}
                  className="p-1 hover:bg-gray-150 dark:hover:bg-dark-800 rounded text-gray-400 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {!cat.parent_id && (
                <button
                  onClick={() => openAddModal(cat.id)}
                  title="إضافة قسم فرعي"
                  className="p-1.5 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/20 text-gray-400 rounded-lg transition-colors"
                >
                  <FolderPlus size={16} />
                </button>
              )}
              <button
                onClick={() => openEditModal(cat)}
                className="p-1.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 text-gray-400 rounded-lg transition-colors"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-gray-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Render child subcategories */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {cat.subcategories.map((sub, i) => renderCategoryNode(sub, i, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-dark-50">الأقسام والتصنيفات</h1>
          <p className="text-sm text-gray-400 mt-1">إدارة شجرة الأقسام الرئيسية والفرعية وترتيبها بالسحب والإفلات.</p>
        </div>
        <button 
          onClick={() => openAddModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          إضافة قسم رئيسي
        </button>
      </div>

      {/* Main categories list container */}
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm overflow-hidden p-6">
        {loading ? (
          <div className="space-y-4 py-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-14 bg-gray-100 dark:bg-dark-800 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-800/40 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder size={28} />
            </div>
            <h3 className="font-bold text-gray-700 dark:text-dark-300">لا توجد أقسام مسجلة</h3>
            <p className="text-sm text-gray-400 mt-1">ابدأ بإضافة قسم رئيسي لتصنيف المنتجات فيه.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat, i) => renderCategoryNode(cat, i))}
          </div>
        )}
      </div>

      {/* Category Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-900 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 dark:border-dark-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-dark-800 flex justify-between items-center bg-gray-50/50 dark:bg-dark-900/50">
              <h3 className="font-extrabold text-lg text-gray-800 dark:text-dark-100">
                {editingCategory ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="bg-red-50 text-red-500 border border-red-200 p-3 rounded-lg text-sm font-bold">
                  {errorMessage}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">اسم القسم</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none"
                  placeholder="مثال: فلاتر زيت"
                  required
                />
              </div>

              {/* Parent category dropdown */}
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">القسم الرئيسي (اختياري)</label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none"
                >
                  <option value="">-- بدون (قسم رئيسي) --</option>
                  {parentList
                    .filter(c => !editingCategory || c.id !== editingCategory.id) // Cannot set self as parent
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
              </div>

              {/* Slug URL */}
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">رابط القسم اللطيف (Slug)</label>
                <input 
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none font-mono text-left"
                  placeholder="oil-filters"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">الوصف</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none h-20"
                  placeholder="وصف مختصر للقسم..."
                />
              </div>

              {/* Assets icon and image using ImageUploader */}
              <div className="space-y-4">
                <ImageUploader
                  configKey={parentId ? 'subcategory_icon' : 'category_icon'}
                  folder="categories"
                  value={iconUrl}
                  onChange={(url) => setIconUrl(url)}
                  label="أيقونة القسم (اختياري)"
                  required={false}
                />
                
                {!parentId && (
                  <ImageUploader
                    configKey="category_cover"
                    folder="categories"
                    value={imageUrl}
                    onChange={(url) => setImageUrl(url)}
                    label="صورة غلاف القسم (Banner)"
                  />
                )}
              </div>

              {/* SEO Meta */}
              <div className="border-t border-gray-150 dark:border-dark-800 pt-4 space-y-3">
                <h4 className="font-extrabold text-sm text-gray-500">إعدادات محركات البحث (SEO)</h4>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-dark-300">عنوان SEO (Meta Title)</label>
                  <input 
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none"
                    placeholder="عنوان مخصص للظهور في محركات البحث..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-gray-700 dark:text-dark-300">وصف SEO (Meta Description)</label>
                  <textarea 
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none h-16"
                    placeholder="وصف مخصص لمحركات البحث..."
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 border-t border-gray-150 dark:border-dark-800 pt-4">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 accent-primary-600 rounded cursor-pointer"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-dark-300 cursor-pointer">
                  تفعيل القسم (عرضه للعملاء في التطبيق)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 text-gray-700 dark:text-dark-300 font-bold hover:bg-gray-50 dark:hover:bg-dark-800/40"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-600/10 active:scale-95"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Reference table for image specifications */}
      <div className="mt-8">
        <ImageSpecsTable />
      </div>
    </div>
  );
}
