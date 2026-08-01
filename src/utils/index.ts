// 🛠️ ENTERPRISE UTILITY FUNCTIONS
// 35 yıllık tecrübe ile optimize edilmiş yardımcı fonksiyonlar

import { VALIDATION, COLORS } from '../constants';

// ==================== DATE & TIME UTILITIES ====================
export const formatDate = (dateString: string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const date = new Date(dateString);
  const now = new Date();
  
  if (format === 'relative') {
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Bugün';
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} ay önce`;
    return `${Math.floor(diffDays / 365)} yıl önce`;
  }
  
  if (format === 'long') {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
  
  return date.toLocaleDateString('tr-TR');
};

export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('tr-TR');
};

export const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isThisWeek = (dateString: string): boolean => {
  const date = new Date(dateString);
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  
  return date >= startOfWeek && date <= endOfWeek;
};

export const getDaysUntil = (dateString: string): number => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// ==================== CURRENCY UTILITIES ====================
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return showSymbol ? `₺${formatted}` : formatted;
};

export const parseCurrency = (currencyString: string): number => {
  return parseFloat(currencyString.replace(/[₺,\s]/g, '')) || 0;
};

// ==================== VALIDATION UTILITIES ====================
export const validateEmail = (email: string): boolean => {
  return VALIDATION.EMAIL_REGEX.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  return VALIDATION.PHONE_REGEX.test(cleanPhone);
};

export const validateTC = (tc: string): boolean => {
  return VALIDATION.TC_REGEX.test(tc);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= VALIDATION.PASSWORD_MIN_LENGTH;
};

// ==================== STRING UTILITIES ====================
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// ==================== COLOR UTILITIES ====================
export const getStatusColor = (status: string, type: 'building' | 'maintenance' | 'issue' = 'building'): string => {
  const statusConfig = {
    building: {
      aktif: COLORS.success[500],
      pasif: COLORS.gray[500],
      beklemede: COLORS.warning[500],
    },
    maintenance: {
      planli: COLORS.gray[500],
      atandi: COLORS.primary[500],
      baslandi: COLORS.warning[500],
      tamamlandi: COLORS.success[500],
      ertelendi: COLORS.warning[600],
      iptal: COLORS.error[500],
    },
    issue: {
      bildirildi: COLORS.gray[500],
      inceleniyor: COLORS.primary[500],
      ekip_atandi: COLORS.warning[500],
      calisma_basladi: COLORS.warning[600],
      tamamlandi: COLORS.success[500],
      iptal_edildi: COLORS.error[500],
    },
  };

  return statusConfig[type][status as keyof typeof statusConfig[typeof type]] || COLORS.gray[500];
};

export const getPriorityColor = (priority: string): string => {
  const priorityColors = {
    dusuk: COLORS.gray[500],
    normal: COLORS.primary[500],
    orta: COLORS.warning[500],
    yuksek: COLORS.warning[600],
    acil: COLORS.error[500],
  };

  return priorityColors[priority as keyof typeof priorityColors] || COLORS.gray[500];
};

export const getElevatorLabelColor = (labelColor: string): string => {
  return COLORS.elevator[labelColor as keyof typeof COLORS.elevator] || COLORS.gray[500];
};

// ==================== ARRAY UTILITIES ====================
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

export const filterBy = <T>(array: T[], predicate: (item: T) => boolean): T[] => {
  return array.filter(predicate);
};

// ==================== PERFORMANCE UTILITIES ====================
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// ==================== ERROR HANDLING ====================
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server error
    const status = error.response.status;
    const data = error.response.data;
    
    switch (status) {
      case 400:
        return data.message || 'Geçersiz istek';
      case 401:
        return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
      case 403:
        return 'Bu işlem için yetkiniz yok';
      case 404:
        return 'Kaynak bulunamadı';
      case 422:
        return data.message || 'Doğrulama hatası';
      case 500:
        return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      default:
        return data.message || 'Bilinmeyen hata oluştu';
    }
  } else if (error.request) {
    // Network error
    return 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
  } else {
    // Other error
    return error.message || 'Beklenmeyen hata oluştu';
  }
};

// ==================== STORAGE UTILITIES ====================
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ==================== DEVICE UTILITIES ====================
export const isTablet = (width: number, height: number): boolean => {
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  return minDimension >= 600 && maxDimension >= 960;
};

export const getDeviceType = (width: number, height: number): 'phone' | 'tablet' => {
  return isTablet(width, height) ? 'tablet' : 'phone';
};

// ==================== HAPTIC FEEDBACK ====================
export const hapticFeedback = {
  light: async () => {
    try {
      const { Haptics } = await import('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available on this device
    }
  },
  
  medium: async () => {
    try {
      const { Haptics } = await import('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available on this device
    }
  },
  
  heavy: async () => {
    try {
      const { Haptics } = await import('expo-haptics');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      // Haptics not available on this device
    }
  },
  
  success: async () => {
    try {
      const { Haptics } = await import('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Haptics not available on this device
    }
  },
  
  error: async () => {
    try {
      const { Haptics } = await import('expo-haptics');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      // Haptics not available on this device
    }
  },
};
