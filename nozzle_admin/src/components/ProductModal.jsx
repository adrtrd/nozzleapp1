import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Tag, ListPlus, Sliders } from 'lucide-react';
import api from '../services/api';
import ImageUploader from './ui/ImageUploader';

export default function ProductModal({ isOpen, onClose, product, categories = [], onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
    subcategory_id: '',
    tag_ids: [],
    image_url: '',
    images: [],
    sku: '',
    low_stock_threshold: '10',
    reorder_point: '20',
    max_stock: '100',
  });
  
  // Custom Metadata States
  const [features, setFeatures] = useState([]);
  const [specs, setSpecs] = useState([]); // List of { key: '', value: '' }
  const [tags, setTags] = useState({
    best_seller: false,
    new_arrival: false,
    special_offer: false
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Filtered subcategories list based on selected category_id
  const [subcategoriesList, setSubcategoriesList] = useState([]);

  // Product tags for the selected subcategory
  const [productTagsList, setProductTagsList] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Fetch subcategories when category_id changes
  useEffect(() => {
    if (formData.category_id) {
      const selectedParent = categories.find(c => c.id === parseInt(formData.category_id));
      setSubcategoriesList(selectedParent?.subcategories || selectedParent?.sub_categories || []);
    } else {
      setSubcategoriesList([]);
    }
  }, [formData.category_id, categories]);

  // Fetch tags when subcategory_id or category_id changes
  useEffect(() => {
    if (formData.subcategory_id) {
      fetchSubcategoryTags(formData.subcategory_id);
    } else if (formData.category_id) {
      fetchSubcategoryTags(formData.category_id);
    } else {
      setProductTagsList([]);
    }
  }, [formData.subcategory_id, formData.category_id]);

  const fetchSubcategoryTags = async (subId) => {
    try {
      setLoadingTags(true);
      const res = await api.get('/v1/product-tags', {
        params: { subcategory_id: subId }
      });
      if (res.data && res.data.success) {
        setProductTagsList(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching subcategory tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleProductTagToggle = (tagId) => {
    setFormData(prev => {
      const currentTags = prev.tag_ids || [];
      const updatedTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId];
      return { ...prev, tag_ids: updatedTags };
    });
  };

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        stock: product.stock_quantity !== undefined ? product.stock_quantity : (product.stock || ''),
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        tag_ids: product.tag_ids || [],
        image_url: product.image_url || '',
        images: product.images || [],
        sku: product.sku || '',
        low_stock_threshold: product.low_stock_threshold !== undefined ? String(product.low_stock_threshold) : '10',
        reorder_point: product.reorder_point !== undefined ? String(product.reorder_point) : '20',
        max_stock: product.max_stock !== undefined ? String(product.max_stock) : '100',
      });
      
      // Parse Features
      setFeatures(product.features || []);
      
      // Parse Specifications dict into array
      const parsedSpecs = Object.entries(product.specifications || {}).map(([key, value]) => ({
        key,
        value: String(value)
      }));
      setSpecs(parsedSpecs);

      // Parse Tags
      setTags({
        best_seller: product.tags?.includes('best_seller') || false,
        new_arrival: product.tags?.includes('new_arrival') || false,
        special_offer: product.tags?.includes('special_offer') || false,
      });
    } else {
      // Default Add Mode states
      const rootCategories = categories.filter(c => !c.parent_id);
      const defaultCatId = rootCategories[0]?.id || '';
      
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category_id: defaultCatId,
        subcategory_id: '',
        tag_ids: [],
        image_url: '',
        images: [],
        sku: '',
        low_stock_threshold: '10',
        reorder_point: '20',
        max_stock: '100',
      });
      setFeatures([]);
      setSpecs([]);
      setTags({
        best_seller: false,
        new_arrival: false,
        special_offer: false
      });
    }
    setErrors({});
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors = {};
    if (!formData.name.trim()) tempErrors.name = 'اسم المنتج مطلوب';
    if (!formData.price || parseFloat(formData.price) <= 0) tempErrors.price = 'السعر يجب أن يكون أكبر من صفر';
    if (formData.stock === '' || parseInt(formData.stock) < 0) tempErrors.stock = 'الكمية لا يمكن أن تكون سالبة';
    if (!formData.category_id) tempErrors.category_id = 'القسم الرئيسي مطلوب';
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Image Upload Logic (Local Storage server-side)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await api.post('/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data && res.data.url) {
        setFormData(prev => ({
          ...prev,
          image_url: res.data.url
        }));
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('حدث خطأ أثناء رفع الصورة، يرجى التأكد من تشغيل السيرفر وحجم الصورة.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Features List Handlers
  const addFeature = () => {
    setFeatures(prev => [...prev, '']);
  };

  const updateFeature = (index, value) => {
    setFeatures(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const removeFeature = (index) => {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  };

  // Specifications Builders
  const addSpec = () => {
    setSpecs(prev => [...prev, { key: '', value: '' }]);
  };

  const updateSpec = (index, field, value) => {
    setSpecs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeSpec = (index) => {
    setSpecs(prev => prev.filter((_, i) => i !== index));
  };

  // Tag Toggler
  const handleTagToggle = (key) => {
    setTags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // Reformat specs array back to key-value dict
      const specificationsObj = {};
      specs.forEach(s => {
        if (s.key.trim()) {
          specificationsObj[s.key.trim()] = s.value;
        }
      });

      // Map tags object into list
      const activeTags = Object.keys(tags).filter(k => tags[k]);

      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        stock_quantity: parseInt(formData.stock),
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10,
        reorder_point: parseInt(formData.reorder_point) || 20,
        max_stock: parseInt(formData.max_stock) || 100,
        category_id: parseInt(formData.category_id),
        subcategory_id: formData.subcategory_id ? parseInt(formData.subcategory_id) : null,
        tag_ids: formData.tag_ids || [],
        image_url: formData.image_url || null,
        images: formData.images || [],
        sku: formData.sku || null,
        features: features.filter(f => f.trim() !== ''),
        specifications: specificationsObj,
        tags: activeTags
      };

      if (product) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      setErrors({ api: 'فشل حفظ بيانات المنتج بالخادم.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Root Categories list
  const rootCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Background Overlay */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Dialog */}
      <div className="bg-white dark:bg-dark-900 border border-gray-150 dark:border-dark-800 rounded-3xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-800 flex justify-between items-center bg-gray-50/50 dark:bg-dark-900/50">
          <h3 className="font-extrabold text-base text-gray-800 dark:text-dark-100">
            {product ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-150 dark:hover:bg-dark-800 rounded-lg transition-colors cursor-pointer text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-right">
          {errors.api && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400 rounded-2xl text-xs font-bold">
              {errors.api}
            </div>
          )}

          {/* SECTION 1: GENERAL INFO */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2 border-b border-gray-100 dark:border-dark-800 pb-2">
              <Sliders size={16} /> البيانات الأساسية
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">اسم المنتج *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800 ${
                    errors.name ? 'border-red-500' : 'border-gray-200 focus:border-primary-400'
                  }`}
                  placeholder="مثال: زيت كاسترول إيدج 5W-40"
                  required
                />
                {errors.name && <span className="text-[10px] text-red-500 font-bold">{errors.name}</span>}
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">وصف المنتج الكامل</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  placeholder="مواصفات وفوائد وطريقة استخدام المنتج بالتفصيل..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">السعر (د.ع) *</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800 ${
                    errors.price ? 'border-red-500' : 'border-gray-200 focus:border-primary-400'
                  }`}
                  placeholder="0.00"
                  required
                />
                {errors.price && <span className="text-[10px] text-red-500 font-bold">{errors.price}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">الكمية المتوفرة (المخزون) *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800 ${
                    errors.stock ? 'border-red-500' : 'border-gray-200 focus:border-primary-400'
                  }`}
                  placeholder="0"
                  required
                />
                {errors.stock && <span className="text-[10px] text-red-500 font-bold">{errors.stock}</span>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">رمز المنتج (SKU) - اختياري</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800 text-left font-mono"
                  placeholder="CAS-5W40-4L"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">الحد الحرج للمخزون *</label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  placeholder="10"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">حد إعادة الطلب للمخزون *</label>
                <input
                  type="number"
                  name="reorder_point"
                  value={formData.reorder_point}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  placeholder="20"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">الحد الأقصى للمخزون *</label>
                <input
                  type="number"
                  name="max_stock"
                  value={formData.max_stock}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  placeholder="100"
                  required
                />
              </div>

              {/* Product Main Image & Gallery Uploader */}
              <div className="md:col-span-2 space-y-4">
                <ImageUploader
                  configKey="product_main"
                  folder="products"
                  value={formData.image_url}
                  onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                  label="الصورة الرئيسية للمنتج"
                  required={true}
                />
                
                <ImageUploader
                  configKey="product_gallery"
                  folder="products"
                  multiple={true}
                  maxFiles={8}
                  value={formData.images || []}
                  onChange={(urls) => setFormData(prev => ({ ...prev, images: urls }))}
                  label="معرض صور المنتج (اختياري)"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CATEGORY HIERARCHY */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2 border-b border-gray-100 dark:border-dark-800 pb-2">
              <Tag size={16} /> تصنيف المنتجات
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Main Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">القسم الرئيسي *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  required
                >
                  <option value="">-- اختر القسم الرئيسي --</option>
                  {rootCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sub Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 dark:text-dark-300">القسم الفرعي (الثانوي)</label>
                <select
                  name="subcategory_id"
                  value={formData.subcategory_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-primary-400 focus:outline-none text-sm dark:bg-dark-950 dark:border-dark-800"
                  disabled={!formData.category_id}
                >
                  <option value="">-- بدون قسم فرعي --</option>
                  {subcategoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Tags (Sub-Sub-Categories) */}
              {(formData.subcategory_id || formData.category_id) && (
                <div className="col-span-2 space-y-2 mt-2">
                  <label className="text-xs font-bold text-gray-600 dark:text-dark-300 block">
                    التصنيفات الدائرية والفرعية (Sub-Sub-Categories) للمنتج
                  </label>
                  {loadingTags ? (
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 py-1">
                      <div className="w-3.5 h-3.5 border border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                      جاري تحميل التصنيفات الفرعية...
                    </div>
                  ) : (
                    (() => {
                      const topLevelTags = productTagsList.filter(t => !t.parent_id);
                      const getSubTags = (parentTag) => (parentTag.sub_tags && parentTag.sub_tags.length > 0)
                        ? parentTag.sub_tags
                        : productTagsList.filter(t => t.parent_id === parentTag.id);
                      const orphanTags = productTagsList.filter(t => t.parent_id && !productTagsList.some(p => p.id === t.parent_id));
                      
                      if (productTagsList.length === 0) {
                        return <div className="text-xs text-gray-400 py-1">لا توجد تصنيفات مضافة لهذا القسم.</div>;
                      }

                      return (
                        <div className="space-y-3.5 pt-1">
                          {topLevelTags.map(parentTag => {
                            const subTags = getSubTags(parentTag);
                            const isParentSelected = (formData.tag_ids || []).includes(parentTag.id);
                            
                            return (
                              <div key={parentTag.id} className="border border-gray-100 dark:border-dark-800 rounded-xl p-3 bg-gray-50/20 dark:bg-dark-900/10 space-y-2">
                                {/* Parent Tag Option */}
                                <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100/50 dark:border-dark-850/50">
                                  <button
                                    key={parentTag.id}
                                    type="button"
                                    onClick={() => handleProductTagToggle(parentTag.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                      isParentSelected
                                        ? 'bg-primary-50 border-primary-500 text-primary-600 dark:bg-primary-950/20 dark:border-primary-800 dark:text-primary-400 shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-dark-950 dark:border-dark-800 dark:text-dark-400 dark:hover:border-dark-700'
                                    }`}
                                  >
                                    {parentTag.image_url ? (
                                      <img src={parentTag.image_url} alt={parentTag.name} className="w-4 h-4 rounded-full object-cover" />
                                    ) : parentTag.icon_emoji ? (
                                      <span>{parentTag.icon_emoji}</span>
                                    ) : null}
                                    <span>{parentTag.name}</span>
                                  </button>
                                  <span className="text-[10px] text-gray-400">(تصنيف رئيسي دائري)</span>
                                </div>

                                {/* Sub-tags (Oil Viscosities, Engine Types) */}
                                {subTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pr-2 pt-1">
                                    {subTags.map(subTag => {
                                      const isSubSelected = (formData.tag_ids || []).includes(subTag.id);
                                      return (
                                        <button
                                          key={subTag.id}
                                          type="button"
                                          onClick={() => handleProductTagToggle(subTag.id)}
                                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                            isSubSelected
                                              ? 'bg-indigo-50 border-indigo-400 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900 dark:text-indigo-400 shadow-sm'
                                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-dark-950 dark:border-dark-850 dark:text-dark-400'
                                          }`}
                                        >
                                          {subTag.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Orphans (if any parent is deleted or out of scope) */}
                          {orphanTags.length > 0 && (
                            <div className="border border-yellow-100/50 dark:border-yellow-950/30 rounded-xl p-3 bg-yellow-50/10 dark:bg-yellow-950/5 space-y-2">
                              <div className="text-[10px] text-yellow-600 dark:text-yellow-400 font-bold">تصنيفات فرعية بدون أب نشط:</div>
                              <div className="flex flex-wrap gap-1.5">
                                {orphanTags.map(subTag => {
                                  const isSubSelected = (formData.tag_ids || []).includes(subTag.id);
                                  return (
                                    <button
                                      key={subTag.id}
                                      type="button"
                                      onClick={() => handleProductTagToggle(subTag.id)}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        isSubSelected
                                          ? 'bg-yellow-50 border-yellow-400 text-yellow-600 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-400 shadow-sm'
                                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 dark:bg-dark-950 dark:border-dark-850 dark:text-dark-400'
                                      }`}
                                    >
                                      {subTag.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: FEATURES BUILDER */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-dark-800 pb-2">
              <button 
                type="button" 
                onClick={addFeature}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> إضافة ميزة
              </button>
              <h4 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <ListPlus size={16} /> مميزات المنتج
              </h4>
            </div>

            <div className="space-y-2">
              {features.map((feature, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => updateFeature(idx, e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:bg-dark-950 dark:border-dark-800 focus:border-primary-400 focus:outline-none text-xs"
                    placeholder={`الميزة رقم ${idx + 1}`}
                  />
                  <button 
                    type="button" 
                    onClick={() => removeFeature(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {features.length === 0 && (
                <p className="text-gray-400 text-xs py-2 text-center">لا توجد مميزات مسجلة بعد.</p>
              )}
            </div>
          </div>

          {/* SECTION 4: SPECIFICATIONS BUILDER */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-dark-800 pb-2">
              <button 
                type="button" 
                onClick={addSpec}
                className="text-xs text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> إضافة مواصفة
              </button>
              <h4 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2">
                <Sliders size={16} /> المواصفات الفنية
              </h4>
            </div>

            <div className="space-y-3">
              {specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                    className="col-span-2 px-4 py-2 rounded-xl border border-gray-200 dark:bg-dark-950 dark:border-dark-800 focus:border-primary-400 focus:outline-none text-xs"
                    placeholder="العنوان (مثال: اللزوجة)"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                    className="col-span-2 px-4 py-2 rounded-xl border border-gray-200 dark:bg-dark-950 dark:border-dark-800 focus:border-primary-400 focus:outline-none text-xs"
                    placeholder="القيمة (مثال: 5W-30)"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeSpec(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-lg cursor-pointer flex justify-center"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {specs.length === 0 && (
                <p className="text-gray-400 text-xs py-2 text-center">لا توجد مواصفات فنية مسجلة بعد.</p>
              )}
            </div>
          </div>

          {/* SECTION 5: TAGS CLASSIFICATIONS */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-sm text-primary-600 dark:text-primary-400 flex items-center gap-2 border-b border-gray-100 dark:border-dark-800 pb-2">
              <Tag size={16} /> الوسوم والتصنيفات الترويجية
            </h4>
            
            <div className="flex flex-wrap gap-6 items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-dark-300">
                <input 
                  type="checkbox"
                  checked={tags.best_seller}
                  onChange={() => handleTagToggle('best_seller')}
                  className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                />
                الأكثر مبيعاً (Best Seller)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-dark-300">
                <input 
                  type="checkbox"
                  checked={tags.new_arrival}
                  onChange={() => handleTagToggle('new_arrival')}
                  className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                />
                وصلنا حديثاً (New Arrival)
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-dark-300">
                <input 
                  type="checkbox"
                  checked={tags.special_offer}
                  onChange={() => handleTagToggle('special_offer')}
                  className="w-4 h-4 accent-primary-600 rounded cursor-pointer"
                />
                عرض خاص (Special Offer)
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 dark:border-dark-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 dark:border-dark-800 dark:text-dark-300 hover:bg-gray-50 dark:hover:bg-dark-850 text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save size={16} />
              {submitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
