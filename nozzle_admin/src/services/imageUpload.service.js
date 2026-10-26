import apiClient from './api';

class ImageUploadService {

  // الإعدادات المختلفة لكل قسم
  static configs = {

    // ── المنتجات ─────────────────────────────────────────
    product_main: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85,
      aspectRatio: '1:1',
    },
    product_gallery: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.85,
      aspectRatio: '1:1',
    },

    // ── البنرات ──────────────────────────────────────────
    banner_mobile: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1080,
      maxHeight: 480,
      quality: 0.9,
      aspectRatio: '9:4',
    },
    banner_web: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1920,
      maxHeight: 600,
      quality: 0.9,
      aspectRatio: '16:5',
    },

    // ── الأقسام ──────────────────────────────────────────
    category_icon: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.9,
      aspectRatio: '1:1',
    },
    category_cover: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 800,
      maxHeight: 400,
      quality: 0.85,
      aspectRatio: '2:1',
    },

    // ── الأقسام الثانوية ─────────────────────────────────
    subcategory_icon: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      maxWidth: 200,
      maxHeight: 200,
      quality: 0.9,
      aspectRatio: '1:1',
    },

    // ── الشعار والهوية ───────────────────────────────────
    app_logo: {
      maxSizeMB: 10,
      allowedTypes: ['image/png', 'image/svg+xml', 'image/webp'],
      maxWidth: 500,
      maxHeight: 500,
      quality: 1.0,
      aspectRatio: '1:1',
    },
    app_splash: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1080,
      maxHeight: 1920,
      quality: 0.9,
      aspectRatio: '9:16',
    },

    // ── المستخدمون ───────────────────────────────────────
    user_avatar: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 400,
      maxHeight: 400,
      quality: 0.85,
      aspectRatio: '1:1',
    },
    // ── الخدمات ──────────────────────────────────────────
    service_image: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.85,
      aspectRatio: '4:3',
    },
    service_gallery: {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxWidth: 1200,
      maxHeight: 800,
      quality: 0.85,
      aspectRatio: '3:2',
    },
  };

  // ضغط الصورة قبل الرفع
  static async compressImage(file, config) {
    if (file.type === 'image/svg+xml') {
      return file; // SVGs do not need compression
    }
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('فشل تهيئة Canvas context'));
      const img = new Image();
      img.onload = () => {
        // حساب الأبعاد مع الحفاظ على النسبة
        let { width, height } = img;
        if (width > config.maxWidth) {
          height = (height * config.maxWidth) / width;
          width = config.maxWidth;
        }
        if (height > config.maxHeight) {
          width = (width * config.maxHeight) / height;
          height = config.maxHeight;
        }
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const outputType = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('فشل ضغط الصورة'));
            resolve(new File([blob], file.name || 'upload.jpg', { type: outputType }));
          },
          outputType,
          config.quality
        );
      };
      img.onerror = () => {
        reject(new Error('فشل تحميل الصورة للضغط'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  // التحقق من الصورة
  static validateImage(file, config) {
    if (!config.allowedTypes.includes(file.type)) {
      return `نوع الملف غير مدعوم. المسموح: ${config.allowedTypes.join(', ')}`;
    }
    if (file.size > config.maxSizeMB * 1024 * 1024) {
      return `حجم الصورة يتجاوز ${config.maxSizeMB}MB`;
    }
    return null;
  }

  // رفع صورة واحدة
  static async uploadSingle(file, configKey, folder) {
    const config = this.configs[configKey];
    if (!config) throw new Error(`إعداد الرفع "${configKey}" غير موجود`);

    const validationError = this.validateImage(file, config);
    if (validationError) throw new Error(validationError);

    const compressed = await this.compressImage(file, config);
    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('folder', folder);
    formData.append('config_key', configKey);

    const response = await apiClient.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    // In our backend API, data might be wrapped in different structures.
    // Ensure we handle both standard structure and direct response
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return response.data;
  }

  // رفع متعدد
  static async uploadMultiple(files, configKey, folder, onProgress) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      onProgress?.(i + 1, files.length);
      results.push(await this.uploadSingle(files[i], configKey, folder));
    }
    return results;
  }

  // حذف صورة
  static async deleteImage(publicId) {
    // URL-encode to handle special chars/paths if any
    await apiClient.delete(`/upload/image/${encodeURIComponent(publicId)}`);
  }
}

export default ImageUploadService;
