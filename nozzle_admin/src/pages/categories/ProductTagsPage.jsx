import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ProductTagModal from '../../components/categories/ProductTagModal';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  FolderOpen, 
  ChevronRight, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  GripVertical,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export default function ProductTagsPage() {
  // Filters
  const [categories, setCategories] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [selectedSubId, setSelectedSubId] = useState('');
  const [subcategoriesList, setSubcategoriesList] = useState([]);

  // Tag list
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Drag-and-drop states
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Fetch all categories (for dropdown hierarchy)
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?include_children=1');
      if (res.data && res.data.status === 'success') {
        const data = res.data.data || [];
        setCategories(data);
        if (data.length > 0 && !selectedParentId) {
          setSelectedParentId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Update subcategories dropdown list when parent changes
  useEffect(() => {
    if (selectedParentId) {
      const parent = categories.find(c => c.id === parseInt(selectedParentId));
      setSubcategoriesList(parent?.sub_categories || parent?.subcategories || []);
      setSelectedSubId('');
      setTags([]);
    } else {
      setSubcategoriesList([]);
      setSelectedSubId('');
      setTags([]);
    }
  }, [selectedParentId, categories]);

  // Load tags when category or subcategory is selected
  useEffect(() => {
    if (selectedSubId) {
      fetchTags(selectedSubId);
    } else if (selectedParentId) {
      fetchTags(selectedParentId);
    } else {
      setTags([]);
    }
  }, [selectedParentId, selectedSubId]);

  const fetchTags = async (subId) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/v1/product-tags', {
        params: { subcategory_id: subId }
      });
      if (res.data && res.data.success) {
        setTags(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('فشل تحميل التصنيفات الدائرية');
    } finally {
      setLoading(false);
    }
  };

  // Filter top-level tags
  const topLevelTags = tags.filter(t => !t.parent_id);

  // Toggle is_active status
  const handleToggleActive = async (tagItem) => {
    try {
      const updatedStatus = !tagItem.is_active;
      // Optimistic update
      setTags(prev => prev.map(t => t.id === tagItem.id ? { ...t, is_active: updatedStatus } : t));
      
      await api.put(`/v1/product-tags/${tagItem.id}`, {
        name: tagItem.name,
        subcategory_id: tagItem.subcategory_id,
        is_active: updatedStatus
      });
      
      showNotification('تم تحديث حالة تفعيل التصنيف');
    } catch (err) {
      console.error('Error toggling active status:', err);
      // Revert state on error
      setTags(prev => prev.map(t => t.id === tagItem.id ? { ...t, is_active: tagItem.is_active } : t));
      setError('فشل تعديل حالة التصنيف');
    }
  };

  // Delete tag
  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟ سيتم فك ارتباطه بكافة المنتجات تلقائياً.')) return;
    try {
      await api.delete(`/v1/product-tags/${id}`);
      showNotification('تم حذف التصنيف بنجاح');
      fetchTags(selectedSubId || selectedParentId);
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError('فشل حذف التصنيف');
    }
  };

  // Open add modal
  const [defaultParentId, setDefaultParentId] = useState(null);

  const handleOpenAdd = (parentId = null) => {
    setEditingTag(null);
    setDefaultParentId(parentId && typeof parentId === 'number' ? parentId : null);
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (tagItem) => {
    setEditingTag(tagItem);
    setDefaultParentId(null);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setDefaultParentId(null);
    showNotification('تم حفظ التصنيف بنجاح');
    if (selectedSubId || selectedParentId) {
      fetchTags(selectedSubId || selectedParentId);
    } else if (categories.length > 0) {
      setSelectedParentId(String(categories[0].id));
    }
  };

  const showNotification = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Reorder sorting logic (Arrows and HTML5 Drag & Drop)
  const saveSortOrder = async (sortedList) => {
    try {
      // Send sequential PUT updates using Promise.all
      await Promise.all(
        sortedList.map((tagItem, idx) => 
          api.put(`/v1/product-tags/${tagItem.id}`, {
            name: tagItem.name,
            subcategory_id: tagItem.subcategory_id,
            sort_order: idx,
            parent_id: tagItem.parent_id
          })
        )
      );
      showNotification('تم حفظ ترتيب التصنيفات بنجاح');
    } catch (err) {
      console.error('Error saving sort order:', err);
      setError('فشل حفظ ترتيب التصنيفات المحدث');
      fetchTags(selectedSubId || selectedParentId);
    }
  };

  const moveOrder = async (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === topLevelTags.length - 1) return;

    const list = [...topLevelTags];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updatedList = list.map((item, idx) => ({ ...item, sort_order: idx }));
    await saveSortOrder(updatedList);
    fetchTags(selectedSubId || selectedParentId);
  };

  const moveSubTagOrder = async (parentTag, subIndex, direction) => {
    if (!parentTag.sub_tags) return;
    const subTags = [...parentTag.sub_tags];
    if (direction === 'up' && subIndex === 0) return;
    if (direction === 'down' && subIndex === subTags.length - 1) return;

    const targetIndex = direction === 'up' ? subIndex - 1 : subIndex + 1;
    const temp = subTags[subIndex];
    subTags[subIndex] = subTags[targetIndex];
    subTags[targetIndex] = temp;

    try {
      await Promise.all(
        subTags.map((subItem, idx) => 
          api.put(`/v1/product-tags/${subItem.id}`, {
            name: subItem.name,
            subcategory_id: subItem.subcategory_id,
            sort_order: idx,
            parent_id: parentTag.id
          })
        )
      );
      showNotification('تم تحديث ترتيب التصنيفات الفرعية');
      fetchTags(selectedSubId || selectedParentId);
    } catch (err) {
      console.error(err);
      setError('فشل حفظ ترتيب التصنيفات الفرعية');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (targetIndex) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const list = [...topLevelTags];
    const [removed] = list.splice(draggedIndex, 1);
    list.splice(targetIndex, 0, removed);

    const updatedList = list.map((item, idx) => ({ ...item, sort_order: idx }));
    setDraggedIndex(null);
    await saveSortOrder(updatedList);
    fetchTags(selectedSubId || selectedParentId);
  };

  return (
    <div className="space-y-6 text-right font-cairo" dir="rtl">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-dark-50">إدارة تصنيفات المنتجات (Sub-Sub-Categories)</h1>
          <p className="text-sm text-gray-400 mt-1">تظهر كتصنيفات دائرية صغيرة (أو مستطيلات نصية فرعية) أسفل شريط البحث في شاشة قائمة المنتجات لتسهيل الفلترة.</p>
        </div>
        <button 
          onClick={() => handleOpenAdd(null)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95"
        >
          <Plus size={18} />
          إضافة تصنيف رئيسي جديد
        </button>
      </div>

      {/* Filter Section Card */}
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dropdown 1: Main Category */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">القسم الرئيسي</label>
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
          >
            <option value="">-- اختر القسم الرئيسي --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Subcategory */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">القسم الثانوي (الفرعي) - اختياري</label>
          <select
            value={selectedSubId}
            onChange={(e) => setSelectedSubId(e.target.value)}
            disabled={!selectedParentId}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm disabled:opacity-50"
          >
            <option value="">-- اختر القسم الفرعي --</option>
            {subcategoriesList.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-900/50 p-3.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-955/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 p-3.5 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main List Container */}
      <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm overflow-hidden">
        {!selectedParentId ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={28} />
            </div>
            <h3 className="font-extrabold text-base text-gray-700 dark:text-dark-300">لم يتم تحديد القسم بعد</h3>
            <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">الرجاء اختيار القسم الرئيسي أو الفرعي المناسب من القائمة بالأعلى لعرض وإدارة تصنيفاته الدائرية والفرعية.</p>
          </div>
        ) : loading ? (
          <div className="space-y-4 py-8 px-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-14 bg-gray-100 dark:bg-dark-800 rounded-xl animate-pulse w-full"></div>
            ))}
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-50 dark:bg-dark-800/40 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={28} />
            </div>
            <h3 className="font-extrabold text-base text-gray-700 dark:text-dark-300 font-cairo">لا توجد تصنيفات مسجلة لهذا القسم</h3>
            <p className="text-xs text-gray-400 mt-1">اضغط على زر "إضافة تصنيف جديد" بالأعلى للبدء في تنظيم هذا القسم.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-right">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-dark-900/50 border-b border-gray-150 dark:border-dark-800 text-xs font-extrabold text-gray-400">
                  <th className="py-4 px-4 text-center w-16">ترتيب</th>
                  <th className="py-4 px-4 text-right">أيقونة / صورة</th>
                  <th className="py-4 px-4 text-right">اسم التصنيف</th>
                  <th className="py-4 px-4 text-right">القسم الفرعي</th>
                  <th className="py-4 px-4 text-center">المنتجات المرتبطة</th>
                  <th className="py-4 px-4 text-center">الترتيب الرقمي</th>
                  <th className="py-4 px-4 text-center">الحالة</th>
                  <th className="py-4 px-4 text-center w-36">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-850">
                {topLevelTags.map((tagItem, index) => (
                  <React.Fragment key={tagItem.id}>
                    <tr 
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className={`hover:bg-gray-50/45 dark:hover:bg-dark-800/20 transition-colors group cursor-grab active:cursor-grabbing ${
                        draggedIndex === index ? 'opacity-40 bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Drag & Sort arrows */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <GripVertical className="text-gray-300 dark:text-dark-700 group-hover:text-gray-450 shrink-0 w-4 h-4 cursor-grab" />
                          <div className="flex flex-col">
                            <button 
                              onClick={() => moveOrder(index, 'up')}
                              disabled={index === 0}
                              title="نقل لأعلى"
                              className="text-[9px] text-gray-400 hover:text-primary-600 disabled:opacity-20 p-0.5"
                            >
                              <ArrowUp size={10} />
                            </button>
                            <button 
                              onClick={() => moveOrder(index, 'down')}
                              disabled={index === topLevelTags.length - 1}
                              title="نقل لأسفل"
                              className="text-[9px] text-gray-400 hover:text-primary-600 disabled:opacity-20 p-0.5"
                            >
                              <ArrowDown size={10} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Image / Emoji */}
                      <td className="py-3 px-4 text-right">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-dark-950 border border-gray-150 dark:border-dark-800 overflow-hidden">
                          {tagItem.image_url ? (
                            <img 
                              src={tagItem.image_url} 
                              alt={tagItem.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : tagItem.icon_emoji ? (
                            <span className="text-lg">{tagItem.icon_emoji}</span>
                          ) : (
                            <span className="text-xs font-black text-primary-500">
                              {tagItem.name.charAt(0)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 text-right font-bold text-gray-800 dark:text-dark-100">
                        {tagItem.name}
                      </td>

                      {/* Subcategory */}
                      <td className="py-3 px-4 text-right text-xs text-gray-400">
                        {subcategoriesList.find(s => s.id === tagItem.subcategory_id)?.name || 'قسم ثانوي'}
                      </td>

                      {/* Products Count badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="bg-gray-100 dark:bg-dark-850 text-gray-600 dark:text-dark-300 text-xs px-2.5 py-1 rounded-md font-extrabold border border-gray-200/50 dark:border-dark-800">
                          {tagItem.products_count} منتج
                        </span>
                      </td>

                      {/* Sort Order number */}
                      <td className="py-3 px-4 text-center text-xs text-gray-455 font-mono">
                        {tagItem.sort_order}
                      </td>

                      {/* Active toggle switch */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(tagItem)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            tagItem.is_active 
                              ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50' 
                              : 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950/20 dark:text-red-455 dark:border-red-900/50'
                          }`}
                        >
                          {tagItem.is_active ? (
                            <>
                              <Eye size={11} />
                              <span>نشط</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={11} />
                              <span>معطل</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenAdd(tagItem.id)}
                            title="إضافة تصنيف فرعي"
                            className="p-1.5 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/20 text-gray-450 rounded-lg transition-all"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(tagItem)}
                            title="تعديل التصنيف"
                            className="p-1.5 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 text-gray-450 rounded-lg transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(tagItem.id)}
                            title="حذف التصنيف"
                            className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-gray-450 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Sub-tags (Nested child rows) */}
                    {tagItem.sub_tags && tagItem.sub_tags.map((subItem, subIndex) => (
                      <tr 
                        key={subItem.id} 
                        className="bg-gray-50/40 dark:bg-dark-850/20 hover:bg-gray-100/50 dark:hover:bg-dark-800/40 border-b border-gray-100 dark:border-dark-850 transition-colors"
                      >
                        {/* Sub-tag Ordering arrows (within parent) */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => moveSubTagOrder(tagItem, subIndex, 'up')}
                              disabled={subIndex === 0}
                              title="نقل لأعلى"
                              className="text-[9px] text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                            >
                              <ArrowUp size={9} />
                            </button>
                            <button 
                              onClick={() => moveSubTagOrder(tagItem, subIndex, 'down')}
                              disabled={subIndex === tagItem.sub_tags.length - 1}
                              title="نقل لأسفل"
                              className="text-[9px] text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                            >
                              <ArrowDown size={9} />
                            </button>
                          </div>
                        </td>

                        {/* Image / Icon (None for child tags) */}
                        <td className="py-2.5 px-4 text-right">
                          <div className="inline-flex items-center pr-2">
                            <span className="text-[10px] text-gray-450 dark:text-dark-400 font-bold bg-gray-100 dark:bg-dark-800 px-2 py-0.5 rounded border border-gray-200/40 dark:border-dark-750">
                              نصي فقط
                            </span>
                          </div>
                        </td>

                        {/* Name (Indented) */}
                        <td className="py-2.5 px-4 text-right font-semibold text-gray-600 dark:text-dark-200">
                          <div className="flex items-center gap-1.5 pr-4">
                            <span className="text-gray-300 dark:text-dark-700 font-bold">↳</span>
                            <span>{subItem.name}</span>
                          </div>
                        </td>

                        {/* Subcategory */}
                        <td className="py-2.5 px-4 text-right text-[11px] text-gray-400">
                          {subcategoriesList.find(s => s.id === subItem.subcategory_id)?.name || 'قسم ثانوي'} <span className="text-[10px] text-gray-350">(فرعي)</span>
                        </td>

                        {/* Products Count badge */}
                        <td className="py-2.5 px-4 text-center">
                          <span className="bg-gray-50 dark:bg-dark-850 text-gray-500 dark:text-dark-350 text-[11px] px-2 py-0.5 rounded border border-gray-150/40 dark:border-dark-800">
                            {subItem.products_count} منتج
                          </span>
                        </td>

                        {/* Sort Order */}
                        <td className="py-2.5 px-4 text-center text-xs text-gray-400 font-mono">
                          {subItem.sort_order}
                        </td>

                        {/* Active status */}
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleActive(subItem)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${
                              subItem.is_active 
                                ? 'bg-green-50/70 text-green-600 border-green-150 dark:bg-green-950/15 dark:text-green-400 dark:border-green-900/40' 
                                : 'bg-red-50/70 text-red-500 border-red-150 dark:bg-red-955/15 dark:text-red-450 dark:border-red-900/40'
                            }`}
                          >
                            {subItem.is_active ? <span>نشط</span> : <span>معطل</span>}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(subItem)}
                              title="تعديل التصنيف"
                              className="p-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 text-gray-450 rounded-lg transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDelete(subItem.id)}
                              title="حذف التصنيف"
                              className="p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 text-gray-450 rounded-lg transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal addition/edit */}
      {modalOpen && (
        <ProductTagModal 
          tag={editingTag}
          subcategoryId={parseInt(selectedSubId || selectedParentId)}
          defaultParentId={defaultParentId}
          onClose={() => {
            setModalOpen(false);
            setDefaultParentId(null);
          }}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
