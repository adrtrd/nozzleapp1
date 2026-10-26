import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ImageUploader from '../ui/ImageUploader';
import { X, Search, Image, Smile, CheckCircle2 } from 'lucide-react';

export default function ProductTagModal({
  tag,
  subcategoryId,
  defaultParentId,
  onClose,
  onSuccess
}) {
  const [name, setName] = useState('');
  const [subcategoryIdState, setSubcategoryIdState] = useState('');
  const [parentIdState, setParentIdState] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [iconEmoji, setIconEmoji] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  
  // Selection mode for representation (image or emoji)
  const [mediaType, setMediaType] = useState('image'); // 'image' or 'emoji'

  // Categories list to select subcategory
  const [subcategories, setSubcategories] = useState([]);
  
  // Parent tags list for sub-tags dropdown
  const [parentTagsList, setParentTagsList] = useState([]);

  // Products list for linking
  const [products, setProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Load subcategories list on mount
  useEffect(() => {
    fetchSubcategories();
  }, []);

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      const res = await api.get('/categories?include_children=1');
      if (res.data && res.data.status === 'success') {
        const list = [];
        (res.data.data || []).forEach(parent => {
          // Add parent category
          list.push({
            id: parent.id,
            name: `قسم رئيسي: ${parent.name}`,
            parentName: ''
          });
          // Add subcategories
          const subs = parent.sub_categories || parent.subcategories || [];
          if (subs.length > 0) {
            subs.forEach(sub => {
              list.push({
                id: sub.id,
                name: sub.name,
                parentName: parent.name
              });
            });
          }
        });
        setSubcategories(list);
        if (!tag && !subcategoryId && list.length > 0) {
          setSubcategoryIdState(String(list[0].id));
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Populate data when editing a tag
  useEffect(() => {
    if (tag) {
      setName(tag.name || '');
      setSubcategoryIdState(tag.subcategory_id ? String(tag.subcategory_id) : '');
      setParentIdState(tag.parent_id ? String(tag.parent_id) : '');
      setImageUrl(tag.image_url || '');
      setIconEmoji(tag.icon_emoji || '');
      setSortOrder(tag.sort_order !== undefined ? String(tag.sort_order) : '0');
      setIsActive(tag.is_active !== false);
      
      if (tag.icon_emoji) {
        setMediaType('emoji');
      } else {
        setMediaType('image');
      }

      // Fetch specific tag data to get its associated product IDs
      fetchTagDetails(tag.id);
    } else {
      if (subcategoryId) {
        setSubcategoryIdState(String(subcategoryId));
      }
      if (defaultParentId) {
        setParentIdState(String(defaultParentId));
      } else {
        setParentIdState('');
      }
    }
  }, [tag, subcategoryId, defaultParentId]);

  // Fetch parent tags for the sub-tags dropdown
  useEffect(() => {
    if (subcategoryIdState) {
      fetchParentTags(subcategoryIdState);
    } else {
      setParentTagsList([]);
    }
  }, [subcategoryIdState]);

  const fetchParentTags = async (subId) => {
    try {
      const res = await api.get('/v1/product-tags', {
        params: { subcategory_id: subId, top_level_only: true }
      });
      if (res.data && res.data.success) {
        const list = res.data.data || [];
        // Exclude the current tag to prevent self-reference
        setParentTagsList(tag ? list.filter(t => t.id !== tag.id) : list);
      }
    } catch (err) {
      console.error('Error fetching parent tags:', err);
    }
  };

  // Fetch full details of the tag including products
  const fetchTagDetails = async (id) => {
    try {
      const res = await api.get(`/v1/product-tags/${id}`);
      if (res.data && res.data.success) {
        setSelectedProductIds(res.data.data.product_ids || []);
      }
    } catch (err) {
      console.error('Error fetching tag details:', err);
    }
  };

  // Fetch products under the selected subcategory for linkage
  useEffect(() => {
    if (subcategoryIdState) {
      fetchSubcategoryProducts(subcategoryIdState);
    } else {
      setProducts([]);
    }
  }, [subcategoryIdState]);

  const fetchSubcategoryProducts = async (subId) => {
    try {
      setLoadingProducts(true);
      const res = await api.get('/products', {
        params: { category_id: subId }
      });
      if (res.data && res.data.status === 'success') {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching subcategory products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductToggle = (prodId) => {
    setSelectedProductIds(prev => 
      prev.includes(prodId) 
        ? prev.filter(id => id !== prodId) 
        : [...prev, prodId]
    );
  };

  const handleSelectAllProducts = () => {
    const filteredProducts = getFilteredProducts();
    const filteredIds = filteredProducts.map(p => p.id);
    const allSelected = filteredIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
      // Uncheck all in current filtered view
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Check all in current filtered view
      setSelectedProductIds(prev => {
        const next = [...prev];
        filteredIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const getFilteredProducts = () => {
    return products.filter(p => {
      const search = productSearch.toLowerCase();
      const name = (p.name_ar || p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(search) || sku.includes(search);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!name.trim()) {
      setErrorMessage('اسم التصنيف مطلوب');
      return;
    }
    if (!subcategoryIdState) {
      setErrorMessage('يجب اختيار القسم');
      return;
    }

    setSaving(true);
    const isSubTag = !!parentIdState;
    const payload = {
      name: name.trim(),
      subcategory_id: parseInt(subcategoryIdState),
      parent_id: isSubTag ? parseInt(parentIdState) : null,
      image_url: isSubTag ? null : (mediaType === 'image' ? (imageUrl || null) : null),
      icon_emoji: isSubTag ? null : (mediaType === 'emoji' ? (iconEmoji || null) : null),
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive,
      product_ids: selectedProductIds
    };

    try {
      if (tag) {
        await api.put(`/v1/product-tags/${tag.id}`, payload);
      } else {
        await api.post('/v1/product-tags', payload);
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'حدث خطأ أثناء حفظ التصنيف';
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  const getFilteredProductsCount = () => {
    const filtered = getFilteredProducts();
    const selectedInFiltered = filtered.filter(p => selectedProductIds.includes(p.id));
    return {
      filtered: filtered.length,
      selected: selectedInFiltered.length
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-dark-900 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl border border-gray-100 dark:border-dark-800 flex flex-col max-h-[92vh] font-cairo">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-dark-800 flex justify-between items-center bg-gray-50/50 dark:bg-dark-900/50">
          <h3 className="font-extrabold text-lg text-gray-800 dark:text-dark-100">
            {tag ? 'تعديل التصنيف الدائري' : 'إضافة تصنيف دائري جديد'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-850"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Split Screen Layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* Right Side: Form Configuration */}
          <div className="flex-1 space-y-4">
            {errorMessage && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-500 border border-red-200 dark:border-red-900/50 p-3 rounded-xl text-sm font-bold">
                {errorMessage}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">اسم التصنيف الدائري</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                placeholder="مثال: قمصان، بناطيل، أحذية"
                required
              />
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">القسم (رئيسي أو فرعي)</label>
              <select
                value={subcategoryIdState}
                onChange={(e) => setSubcategoryIdState(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                required
              >
                <option value="">-- اختر القسم الذي ينتمي إليه --</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.parentName ? `${sub.parentName} > ${sub.name}` : sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Tag (Optional - for sub-tags) */}
            {subcategoryIdState && (
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">التصنيف الدائري الأب (اختياري - لإنشاء تصنيف فرعي نصي)</label>
                <select
                  value={parentIdState}
                  onChange={(e) => setParentIdState(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                >
                  <option value="">-- بدون أب (تصنيف رئيسي دائري بصورة) --</option>
                  {parentTagsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Media Tabs Selection or Info Notice */}
            {parentIdState ? (
              <div className="p-4 bg-primary-50/50 dark:bg-primary-950/10 border border-primary-150 dark:border-primary-900/50 rounded-xl text-xs text-primary-600 dark:text-primary-400 font-bold leading-relaxed">
                ℹ️ تم اختيار تصنيف أب. هذا التصنيف فرعي نصي فقط (مثل لزوجات الزيوت) وسيظهر في التطبيق كمستطيل نصي بدون صور أو رموز إيموجي.
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-dark-300">أيقونة التصنيف (صورة أو إيموجي)</label>
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-dark-855 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      mediaType === 'image'
                        ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Image size={14} />
                    صورة دائرية
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('emoji')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                      mediaType === 'emoji'
                        ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Smile size={14} />
                    رمز إيموجي Emoji
                  </button>
                </div>

                {/* Conditional inputs */}
                {mediaType === 'image' ? (
                  <div className="p-3 bg-gray-50 dark:bg-dark-850 rounded-xl border border-gray-150 dark:border-dark-800">
                    <ImageUploader
                      configKey="category_icon"
                      folder="product_tags"
                      value={imageUrl}
                      onChange={(url) => setImageUrl(url)}
                      label="صورة التصنيف"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-dark-850 rounded-xl border border-gray-150 dark:border-dark-800 space-y-3">
                    <label className="block text-xs font-bold text-gray-600 dark:text-dark-400">أدخل رمز إيموجي واحد</label>
                    <input
                      type="text"
                      value={iconEmoji}
                      onChange={(e) => setIconEmoji(e.target.value.trim())}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-center text-2xl"
                      placeholder="👕"
                      maxLength={4}
                    />
                    <p className="text-[10px] text-gray-400">يمكنك نسخ ولصق إيموجي مثل (👟, 👕, 🛢️, 🔧, 🔋).</p>
                  </div>
                )}
              </div>
            )}

            {/* Sort Order & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-dark-300">ترتيب الظهور</label>
                <input 
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-800 bg-transparent dark:text-dark-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                  min="0"
                  required
                />
              </div>

              <div className="flex flex-col justify-end pb-2.5">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 accent-primary-600 rounded cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-gray-700 dark:text-dark-300 cursor-pointer">
                    تفعيل التصنيف
                  </label>
                </div>
              </div>
            </div>

            {/* Live Preview Container */}
            {!parentIdState && (
              <div className="pt-2">
                <TagPreview name={name} imageUrl={mediaType === 'image' ? imageUrl : null} emoji={mediaType === 'emoji' ? iconEmoji : null} />
              </div>
            )}
          </div>

          {/* Left Side: Product Association */}
          <div className="flex-1 flex flex-col border border-gray-200 dark:border-dark-800 rounded-2xl p-4 bg-gray-50/30 dark:bg-dark-900/30 min-h-[300px]">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-extrabold text-sm text-gray-700 dark:text-dark-300">ربط المنتجات بالتصنيف</h4>
              <span className="bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 text-xs px-2.5 py-1 rounded-md font-extrabold">
                تم تحديد {selectedProductIds.length} منتج
              </span>
            </div>

            {/* Search Bar for products */}
            <div className="relative mb-3">
              <Search className="absolute right-3.5 top-3 text-gray-400 w-4 h-4" />
              <input 
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-dark-800 bg-white dark:bg-dark-900 dark:text-dark-100 focus:outline-none focus:border-primary-500"
                placeholder="بحث باسم المنتج أو الـ SKU..."
                disabled={!subcategoryIdState}
              />
            </div>

            {/* Select/Deselect All */}
            {products.length > 0 && (
              <div className="flex justify-between items-center px-2 py-1.5 bg-gray-100 dark:bg-dark-800 rounded-lg mb-2 text-[11px] font-bold text-gray-500">
                <span>عرض {getFilteredProductsCount().filtered} من أصل {products.length} منتج</span>
                <button
                  type="button"
                  onClick={handleSelectAllProducts}
                  className="text-primary-600 hover:text-primary-800 dark:text-primary-400"
                >
                  {getFilteredProductsCount().selected === getFilteredProductsCount().filtered ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>
            )}

            {/* Products Checklist */}
            <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[350px] space-y-2 border border-gray-150 dark:border-dark-850 rounded-xl p-2 bg-white dark:bg-dark-900">
              {!subcategoryIdState ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  يرجى تحديد القسم الثانوي أولاً لتحميل المنتجات التابعة له.
                </div>
              ) : loadingProducts ? (
                <div className="text-center py-12 text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  جاري تحميل المنتجات...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  لا توجد منتجات مسجلة في هذا القسم الثانوي.
                </div>
              ) : getFilteredProducts().length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  لا توجد نتائج بحث مطابقة.
                </div>
              ) : (
                getFilteredProducts().map(prod => {
                  const isChecked = selectedProductIds.includes(prod.id);
                  return (
                    <div 
                      key={prod.id}
                      onClick={() => handleProductToggle(prod.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10' 
                          : 'border-gray-100 dark:border-dark-850 hover:bg-gray-50 dark:hover:bg-dark-850/40'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container onClick
                        className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 cursor-pointer pointer-events-none"
                      />
                      <img 
                        src={prod.image_url || 'https://via.placeholder.com/40'} 
                        alt={prod.name_ar} 
                        className="w-9 h-9 rounded-lg object-contain bg-gray-50 border border-gray-100"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 dark:text-dark-200 truncate">{prod.name_ar}</p>
                        <p className="text-[10px] text-gray-400 truncate">{prod.brand} {prod.sku && `• SKU: ${prod.sku}`}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 dark:border-dark-800 flex gap-3 justify-end bg-gray-50/30 dark:bg-dark-900/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-dark-800 text-gray-700 dark:text-dark-300 font-bold hover:bg-gray-50 dark:hover:bg-dark-800/40 transition-colors"
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-sm rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-600/10 active:scale-95 transition-all flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                جاري الحفظ...
              </>
            ) : (
              'حفظ التعديلات'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Preview Component ───────────────────────────
function TagPreview({ name, imageUrl, emoji }) {
  const displayLabel = name.trim() || 'اسم التصنيف';
  
  return (
    <div className="border border-indigo-100 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-2xl">
      <h4 className="text-[11px] font-extrabold text-indigo-500 mb-3 text-right uppercase tracking-wider">معاينة حية في تطبيق الجوال</h4>
      
      <div className="flex items-center justify-center py-6 bg-white dark:bg-dark-950 rounded-xl border border-gray-100 dark:border-dark-850">
        <div className="flex flex-col items-center w-[70px]">
          
          {/* Circle Wrapper */}
          <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center border border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm relative overflow-hidden">
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="preview" 
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : emoji ? (
              <span className="text-2xl">{emoji}</span>
            ) : (
              <span className="text-primary-600 font-extrabold text-lg">
                {displayLabel.charAt(0)}
              </span>
            )}
          </div>
          
          {/* Under Label */}
          <span className="text-[10px] font-bold text-gray-700 dark:text-dark-350 text-center truncate w-full mt-1.5">
            {displayLabel}
          </span>
          
        </div>
      </div>
    </div>
  );
}
