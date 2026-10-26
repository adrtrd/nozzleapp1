import React, { useState, useEffect } from 'react';
import { X, Info, Trash2, Plus, Clock, Sparkles } from 'lucide-react';
import ImageUploader from '../ui/ImageUploader';
import api from '../../services/api';

export default function ServiceFormModal({ service, onClose, onSave }) {
  const [activeFormTab, setActiveFormTab] = useState('info'); // info, images, options, settings
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Custom Category Adding
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatVal, setCustomCatVal] = useState('');
  const [categories, setCategories] = useState(['تنظيف', 'صيانة', 'توصيل', 'تلميع']);

  // Main Form fields state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [iconEmoji, setIconEmoji] = useState('🛠️');
  const [basePrice, setBasePrice] = useState(0);
  const [priceType, setPriceType] = useState('fixed'); // fixed, from, negotiable
  const [category, setCategory] = useState('تنظيف');
  const [tags, setTags] = useState([]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState(10);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  
  // Working Hours (default: 8:00 - 20:00 for all days except Friday 14:00 - 20:00)
  const [workingHours, setWorkingHours] = useState({
    sat: '08:00-20:00',
    sun: '08:00-20:00',
    mon: '08:00-20:00',
    tue: '08:00-20:00',
    wed: '08:00-20:00',
    thu: '08:00-20:00',
    fri: '14:00-20:00'
  });

  // Additional options state
  const [options, setOptions] = useState([]);

  // Load existing service details if edit
  useEffect(() => {
    // Fetch unique categories from API
    const fetchCats = async () => {
      try {
        const res = await api.get('/v1/services/categories');
        if (res.data && res.data.data) {
          const apiCats = res.data.data;
          const merged = Array.from(new Set([...categories, ...apiCats]));
          setCategories(merged);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();

    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setShortDescription(service.short_description || '');
      setImageUrl(service.image_url || '');
      setGalleryUrls(service.gallery_urls || []);
      setIconEmoji(service.icon_emoji || '🛠️');
      setBasePrice(service.base_price || 0);
      setPriceType(service.price_type || 'fixed');
      setCategory(service.category || 'تنظيف');
      setTags(service.tags || []);
      setDurationMinutes(service.duration_minutes || 60);
      setIsAvailable(service.is_available ?? true);
      setIsFeatured(service.is_featured ?? false);
      setSortOrder(service.sort_order || 0);
      setMaxBookingsPerDay(service.max_bookings_per_day || 10);
      setAdvanceBookingDays(service.advance_booking_days || 30);
      if (service.working_hours && Object.keys(service.working_hours).length > 0) {
        setWorkingHours(service.working_hours);
      }
      setOptions(service.options || []);
    }
  }, [service]);

  const handleAddOption = () => {
    setOptions(prev => [
      ...prev,
      {
        id: Date.now(), // Temporary key for rendering, removed before API submit
        name: '',
        description: '',
        extra_price: 0,
        duration_extra_minutes: 0,
        is_active: true
      }
    ]);
  };

  const handleRemoveOption = (index) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, field, value) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i === index) {
        return { ...opt, [field]: value };
      }
      return opt;
    }));
  };

  const handleWorkingHoursChange = (day, field, value) => {
    setWorkingHours(prev => {
      const current = prev[day] || '08:00-20:00';
      const parts = current.split('-');
      let nextVal = '';
      if (field === 'start') {
        nextVal = `${value}-${parts[1] || '20:00'}`;
      } else {
        nextVal = `${parts[0] || '08:00'}-${value}`;
      }
      return { ...prev, [day]: nextVal };
    });
  };

  const validateForm = () => {
    if (!name.trim()) return 'اسم الخدمة مطلوب';
    if (!shortDescription.trim()) return 'الوصف المختصر مطلوب';
    if (!description.trim()) return 'الوصف التفصيلي مطلوب';
    if (basePrice < 0) return 'السعر الأساسي لا يمكن أن يكون سالباً';
    if (durationMinutes <= 0) return 'مدة الخدمة يجب أن تكون أكبر من صفر';
    
    // Validate options
    for (let i = 0; i < options.length; i++) {
      if (!options[i].name.trim()) {
        return `اسم الخيار الإضافي رقم ${i + 1} مطلوب`;
      }
      if (options[i].extra_price < 0) {
        return `السعر الإضافي للخيار "${options[i].name}" لا يمكن أن يكون سالباً`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    // Filter out temporary local option ids if creating/editing
    const cleanedOptions = options.map(({ id, ...rest }) => ({
      ...rest,
      extra_price: parseFloat(rest.extra_price) || 0.0,
      duration_extra_minutes: parseInt(rest.duration_extra_minutes) || 0
    }));

    const payload = {
      name,
      description,
      short_description: shortDescription,
      image_url: imageUrl,
      gallery_urls: galleryUrls,
      icon_emoji: iconEmoji,
      base_price: parseFloat(basePrice) || 0.0,
      price_type: priceType,
      category,
      tags,
      duration_minutes: parseInt(durationMinutes) || 60,
      is_available: isAvailable,
      is_featured: isFeatured,
      sort_order: parseInt(sortOrder) || 0,
      working_hours: workingHours,
      max_bookings_per_day: parseInt(maxBookingsPerDay) || 10,
      advance_booking_days: parseInt(advanceBookingDays) || 30,
      options: cleanedOptions
    };

    try {
      if (service) {
        // Edit Service
        await api.put(`/v1/admin/services/${service.id}`, payload);
      } else {
        // Create Service
        await api.post('/v1/admin/services', payload);
      }
      onSave();
    } catch (err) {
      console.error(err);
      const serverMsg = err.response?.data?.message || err.response?.data?.detail;
      setErrorMsg(serverMsg || 'فشل حفظ الخدمة، يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  const formatPreviewPrice = (price) => {
    return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-900 rounded-2xl max-w-6xl w-full shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-100 dark:border-dark-800 animate-in fade-in zoom-in duration-200">
        
        {/* Left Form Column (Wide) */}
        <div className="flex-1 flex flex-col max-h-[85vh] overflow-hidden">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-dark-800 flex justify-between items-center bg-gray-50/50 dark:bg-dark-950/20">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {service ? '🔧 تعديل الخدمة وتحديث الخيارات' : '🔧 إضافة خدمة جديدة للمركز'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-400">عبّئ المعلومات لتبديلها مباشرة في شاشات الحجز للعملاء.</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-full transition-colors text-gray-400 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Tabs Navigation */}
          <div className="flex border-b border-gray-200 dark:border-dark-800 bg-gray-50/20 px-6">
            {[
              { id: 'info', label: 'المعلومات الأساسية' },
              { id: 'images', label: 'الصور والمعرض' },
              { id: 'options', label: 'السعر والخيارات الإضافية' },
              { id: 'settings', label: 'إعدادات الحجز وساعات العمل' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  activeFormTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold text-right flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
              {errorMsg}
            </div>
          )}

          {/* Tabs Content */}
          <form onSubmit={handleSubmit} className="flex-grow p-6 overflow-y-auto space-y-6 text-right" dir="rtl">
            
            {/* TAB 1: BASIC INFO */}
            {activeFormTab === 'info' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">اسم الخدمة (مطلوب)</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: تنظيف المكيفات العميق"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">الفئة</label>
                    {!showCustomCat ? (
                      <div className="flex gap-2">
                        <select
                          value={category}
                          onChange={(e) => {
                            if (e.target.value === '__add__') {
                              setShowCustomCat(true);
                            } else {
                              setCategory(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                          <option value="__add__" className="text-primary-600 font-bold">+ إضافة فئة جديدة...</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب اسم الفئة الجديدة..."
                          value={customCatVal}
                          onChange={(e) => setCustomCatVal(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customCatVal.trim()) {
                              setCategories(prev => [...prev, customCatVal.trim()]);
                              setCategory(customCatVal.trim());
                              setCustomCatVal('');
                              setShowCustomCat(false);
                            }
                          }}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-semibold"
                        >
                          تأكيد
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomCat(false)}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">المدة المتوقعة (دقائق)</label>
                    <input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="مثال: 60"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">الرمز التعبيري للخدمة (Emoji)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength="4"
                        value={iconEmoji}
                        onChange={(e) => setIconEmoji(e.target.value)}
                        placeholder="🛠️"
                        className="w-20 px-3 py-2 text-center text-lg border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none"
                      />
                      <span className="text-xs text-gray-400 self-center">يظهر كرمز تعبيري بجانب الاسم في التطبيق</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-dark-200">الوصف المختصر (يظهر بالبطاقة الرئيسية)</label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="اكتب وصفاً موجزاً يجذب انتباه العميل..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-dark-200">الوصف التفصيلي (يظهر بصفحة تفاصيل الخدمة)</label>
                  <textarea
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب كامل تفاصيل الخدمة ومميزاتها والخطوات التقنية المتبعة..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: IMAGES UPLOAD */}
            {activeFormTab === 'images' && (
              <div className="space-y-6">
                {/* Image Specs Info Card */}
                <div className="p-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl text-xs leading-relaxed space-y-2">
                  <h4 className="font-bold flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>تنبيهات وأبعاد الصور المثالية للخدمة</span>
                  </h4>
                  <p>• <b>الصورة الرئيسية:</b> سيتم ضغطها وتحجيمها تلقائياً لأبعاد <b>800 × 600 بكسل (نسبة 4:3)</b> وهي المخصصة للظهور كغلاف الخدمة بالرئيسية.</p>
                  <p>• <b>صور المعرض:</b> يمكنك رفع حتى 5 صور للخدمة تصف تفاصيل التنفيذ والنتائج، سيتم ضغطها وتخزينها بأبعاد <b>1200 × 800 بكسل (نسبة 3:2)</b>.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cover image uploader */}
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-dark-100 block">📸 الصورة الرئيسية للغلاف (مطلوب)</span>
                    <ImageUploader
                      configKey="service_image"
                      folder="services"
                      value={imageUrl}
                      onChange={setImageUrl}
                      multiple={false}
                    />
                  </div>

                  {/* Gallery images uploader */}
                  <div className="space-y-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-dark-100 block">🖼️ صور معرض الخدمة (اختياري - حتى 5 صور)</span>
                    <ImageUploader
                      configKey="service_gallery"
                      folder="services"
                      value={galleryUrls}
                      onChange={setGalleryUrls}
                      multiple={true}
                      maxFiles={5}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PRICE & OPTIONS */}
            {activeFormTab === 'options' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">نوع تحديد السعر</label>
                    <select
                      value={priceType}
                      onChange={(e) => setPriceType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none"
                    >
                      <option value="fixed">محدد ثابت</option>
                      <option value="from">يبدأ من</option>
                      <option value="negotiable">حسب الاتفاق</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">السعر الأساسي (بالدينار العراقي)</label>
                    <input
                      type="number"
                      disabled={priceType === 'negotiable'}
                      value={priceType === 'negotiable' ? 0 : basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="مثال: 15000"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                {/* Additional Service Options Grid */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-dark-100">باقات/خيارات إضافية تابعة للخدمة:</h4>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="flex items-center gap-1 px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400 rounded-lg text-xs font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة خيار جديد</span>
                    </button>
                  </div>

                  {options.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 dark:bg-dark-950 rounded-xl border border-dashed border-gray-200 dark:border-dark-800 text-gray-400 text-xs">
                      لم يتم توفير أي خيارات إضافية لهذه الخدمة بعد. اضغط على الزر بالأعلى لإضافة خيارات (مثل: غسيل نانو، خدمة عاجلة).
                    </div>
                  ) : (
                    <div className="border border-gray-100 dark:border-dark-800 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-gray-50 dark:bg-dark-950 text-gray-700 dark:text-dark-200">
                          <tr>
                            <th className="p-3">اسم الخيار</th>
                            <th className="p-3">وصف مختصر للعميل</th>
                            <th className="p-3">سعر إضافي (+ د.ع)</th>
                            <th className="p-3">وقت إضافي (+ دقيقة)</th>
                            <th className="p-3 text-left">حذف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-800 bg-white dark:bg-dark-900">
                          {options.map((opt, index) => (
                            <tr key={opt.id || index}>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={opt.name}
                                  onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                                  placeholder="مثال: غسيل سوبر"
                                  className="w-full p-2 border border-gray-200 dark:border-dark-800 rounded bg-gray-50 dark:bg-dark-950 focus:outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={opt.description}
                                  onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
                                  placeholder="وصف الخيار..."
                                  className="w-full p-2 border border-gray-200 dark:border-dark-800 rounded bg-gray-50 dark:bg-dark-950 focus:outline-none"
                                />
                              </td>
                              <td className="p-2 w-32">
                                <input
                                  type="number"
                                  value={opt.extra_price}
                                  onChange={(e) => handleOptionChange(index, 'extra_price', e.target.value)}
                                  placeholder="0"
                                  className="w-full p-2 border border-gray-200 dark:border-dark-800 rounded bg-gray-50 dark:bg-dark-950 focus:outline-none"
                                />
                              </td>
                              <td className="p-2 w-28">
                                <input
                                  type="number"
                                  value={opt.duration_extra_minutes}
                                  onChange={(e) => handleOptionChange(index, 'duration_extra_minutes', e.target.value)}
                                  placeholder="0"
                                  className="w-full p-2 border border-gray-200 dark:border-dark-800 rounded bg-gray-50 dark:bg-dark-950 focus:outline-none"
                                />
                              </td>
                              <td className="p-2 text-left w-12">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS & SCHEDULE */}
            {activeFormTab === 'settings' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200 font-bold block mb-2">نوع العرض والظهور</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isAvailable}
                          onChange={(e) => setIsAvailable(e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-600 h-4 w-4"
                        />
                        <span>متاح للحجز المباشر بالواجهة</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-600 h-4 w-4"
                        />
                        <span>خدمة مميزة (تظهر كـ Featured)</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">الحد الأقصى للحجوزات باليوم الواحد</label>
                    <input
                      type="number"
                      value={maxBookingsPerDay}
                      onChange={(e) => setMaxBookingsPerDay(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">عدد أيام الحجز المسبق المتاحة للزبون</label>
                    <input
                      type="number"
                      value={advanceBookingDays}
                      onChange={(e) => setAdvanceBookingDays(e.target.value)}
                      placeholder="30"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-200">ترتيب الظهور الفهرسي (sort_order)</label>
                    <input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-dark-800 rounded-lg dark:bg-dark-950 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Working hours configuration */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-dark-100">تهيئة ساعات العمل الأسبوعية للخدمة:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border border-gray-100 dark:border-dark-800 p-4 rounded-xl">
                    {[
                      { key: 'sat', label: 'السبت' },
                      { key: 'sun', label: 'الأحد' },
                      { key: 'mon', label: 'الاثنين' },
                      { key: 'tue', label: 'الثلاثاء' },
                      { key: 'wed', label: 'الأربعاء' },
                      { key: 'thu', label: 'الخميس' },
                      { key: 'fri', label: 'الجمعة' },
                    ].map(day => {
                      const value = workingHours[day.key] || '08:00-20:00';
                      const [start, end] = value.split('-');
                      return (
                        <div key={day.key} className="flex justify-between items-center gap-2 bg-gray-50/50 dark:bg-dark-950/20 p-2.5 rounded-lg text-xs">
                          <span className="font-bold w-12 text-gray-700 dark:text-dark-200">{day.label}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={start}
                              onChange={(e) => handleWorkingHoursChange(day.key, 'start', e.target.value)}
                              placeholder="08:00"
                              className="w-12 text-center p-1 border rounded bg-white dark:bg-dark-950 focus:outline-none"
                            />
                            <span>إلى</span>
                            <input
                              type="text"
                              value={end}
                              onChange={(e) => handleWorkingHoursChange(day.key, 'end', e.target.value)}
                              placeholder="20:00"
                              className="w-12 text-center p-1 border rounded bg-white dark:bg-dark-950 focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-gray-100 dark:border-dark-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-dark-950/10 p-6 -mx-6 -mb-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors font-semibold"
              >
                إلغاء النافذة
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                <span>حفظ بيانات الخدمة</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Interactive Card Live Preview (Strictly responsive & WOW theme) */}
        <div className="w-full md:w-80 bg-gray-50 dark:bg-dark-950 border-r md:border-r-0 md:border-l border-gray-100 dark:border-dark-850 p-6 flex flex-col items-center justify-start gap-6 select-none shrink-0">
          <div className="w-full text-right">
            <h4 className="text-sm font-bold text-gray-500 dark:text-dark-400 uppercase tracking-wider">المعاينة الحية الفورية</h4>
            <p className="text-xs text-gray-400">تظهر هذه البطاقة مباشرة للزبائن في تطبيق نوزل.</p>
          </div>

          {/* Simulated Mobile Card */}
          <div className="w-full bg-white dark:bg-dark-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-800 shadow-lg hover:shadow-xl transition-all duration-300 relative group flex flex-col text-right">
            
            {/* Aspect image mock container */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden shrink-0">
              <img
                src={imageUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&auto=format&fit=crop'}
                alt="Live Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"></div>
              
              {/* Category Badge */}
              <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-bold bg-primary-600 text-white rounded-full">
                {category}
              </span>

              {/* Featured Badge */}
              {isFeatured && (
                <span className="absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full flex items-center gap-0.5">
                  ⭐ <span>مميزة</span>
                </span>
              )}

              {/* Rating representation */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1">
                <span className="text-yellow-400 text-xs">⭐</span>
                <span className="text-white text-xs font-bold">4.8</span>
                <span className="text-white/80 text-[10px]">(120)</span>
              </div>
            </div>

            {/* Card Content details */}
            <div className="p-4 flex-grow flex flex-col justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-md flex items-center gap-1.5">
                  <span>{iconEmoji}</span>
                  <span>{name || 'اسم الخدمة التجريبي'}</span>
                </h4>
                <p className="text-xs text-gray-500 dark:text-dark-300 mt-1 line-clamp-2 h-8 leading-relaxed">
                  {shortDescription || 'سيتم إدراج الوصف التسويقي القصير للخدمة هنا في البطاقة الرئيسية...'}
                </p>
              </div>

              <div className="flex justify-between items-center border-t border-gray-100 dark:border-dark-800 pt-3">
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{durationMinutes} دقيقة</span>
                </div>

                <div className="text-left">
                  <p className="text-[10px] text-gray-400">
                    {priceType === 'from' && 'يبدأ من'}
                    {priceType === 'negotiable' && 'حسب الاتفاق'}
                    {priceType === 'fixed' && 'سعر ثابت'}
                  </p>
                  <p className="font-extrabold text-green-600 dark:text-green-400 text-sm">
                    {priceType === 'negotiable' ? 'د.ع 0' : formatPreviewPrice(basePrice)}
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="w-full p-4 bg-primary-50/50 border border-primary-100 text-primary-900 rounded-xl text-xs flex items-start gap-2">
            <Info className="w-4.5 h-4.5 text-primary-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>ملاحظة:</b> يمكنك تغيير أي قيمة على اليسار وسيتحدث الغلاف، تفاصيل السعر، والرمز التعبيري في المعاينة فوراً.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
