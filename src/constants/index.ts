// 🎯 ENTERPRISE CONSTANTS & CONFIGURATION
// Merkezi konfigürasyon yönetimi - 35 yıllık tecrübe

// ==================== API CONFIGURATION ====================
// EAS build'de environment variable kullan, yoksa __DEV__ kontrolü yap
import Constants from 'expo-constants';

const LIVE_API_URL = 'https://proaslift.com';
const trimTrailingSlash = (url: string) => url.replace(/\/$/, '');

const getBaseUrl = (): string => {
  // 1. Acik override: EXPO_PUBLIC_API_URL veya API_URL her ortamda en yuksek onceliktir.
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  // 2. app.json / app.config.js extra.apiUrl
  const apiUrlFromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (apiUrlFromExtra) {
    return typeof apiUrlFromExtra === 'string' ? trimTrailingSlash(apiUrlFromExtra) : LIVE_API_URL;
  }

  // 3. Lokal backend'e ancak bilincli olarak izin ver.
  // Expo dev server IP'sini otomatik API sanmak fiziksel Android cihazda hataya yol aciyor.
  const useLocalApi = process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true';
  if (useLocalApi) {
    const explicitLocalUrl = process.env.EXPO_PUBLIC_LOCAL_API_URL;
    if (explicitLocalUrl) {
      return trimTrailingSlash(explicitLocalUrl);
    }

    const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.hostUri;
    if (hostUri && typeof hostUri === 'string') {
      const host = hostUri.split(':')[0];
      if (host) return `http://${host}:8000`;
    }

    if (typeof Constants.isDevice === 'boolean' && !Constants.isDevice) {
      return 'http://127.0.0.1:8000';
    }
  }

  // 4. Varsayilan: canli API.
  return LIVE_API_URL;
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  API_VERSION: 'v1',
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;


export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: '/api/mobile/auth/login',
  LOGOUT: '/api/mobile/auth/logout',
  REFRESH: '/api/mobile/auth/refresh',
  PROFILE: '/api/mobile/auth/profile',
  CHANGE_PASSWORD: '/api/mobile/auth/change-password',
  REGISTER_DEVICE_TOKEN: '/api/mobile/auth/device-token',
  UNREGISTER_DEVICE_TOKEN: '/api/mobile/auth/device-token',
  
  // Dashboard endpoints
  DASHBOARD_STATS: '/api/mobile/dashboard/stats',
  DASHBOARD_CHARTS: '/api/mobile/dashboard/charts',
  STOCK_WARNINGS: '/api/mobile/stock-warnings',
  
  // Buildings endpoints
  BUILDINGS: '/api/mobile/buildings',
  BUILDING_DETAIL: (id: number) => `/api/mobile/buildings/${id}`,
  BUILDING_CONTACTS: (id: number) => `/api/mobile/buildings/${id}/contacts`,
  BUILDING_DOCUMENTS: (id: number) => `/api/mobile/buildings/${id}/documents`,
  BUILDINGS_SEARCH_QR: '/api/mobile/buildings/search-qr',
  
  // Employees endpoints
  EMPLOYEES: '/api/mobile/employees',
  EMPLOYEE_DETAIL: (id: number) => `/api/mobile/employees/${id}`,
  EMPLOYEE_UPDATE: (id: number) => `/api/mobile/employees/${id}`,
  EMPLOYEE_PERFORMANCE: (id: number) => `/api/mobile/employees/${id}/performance`,
  
  // Maintenance endpoints
  MAINTENANCE_SCHEDULES: '/api/mobile/maintenance',
  MAINTENANCE_DETAIL: (id: number) => `/api/mobile/maintenance/${id}`,
  MAINTENANCE_START: (id: number) => `/api/mobile/maintenance/${id}/start`,
  MAINTENANCE_STORE_REPORT: (id: number) => `/api/mobile/maintenance/${id}/store-report`,
  MAINTENANCE_RESEND_APPROVAL_SMS: (id: number) => `/api/mobile/maintenance/${id}/resend-approval-sms`,
  MAINTENANCE_PRODUCTS: '/api/mobile/maintenance/products',
  MAINTENANCE_REPORTS: '/api/mobile/maintenance-reports',
  MAINTENANCE_REPORT_CREATE: '/api/mobile/maintenance-reports',
  MAINTENANCE_REPORT_DETAIL: (id: number) => `/api/mobile/maintenance-reports/${id}`,
  MAINTENANCE_CALENDAR: '/api/mobile/maintenance/calendar',
  
  // Issues endpoints
  ISSUE_REPORTS: '/api/mobile/issues',
  ISSUE_DETAIL: (id: number) => `/api/mobile/issues/${id}`,
  ISSUE_ASSIGN: (id: number) => `/api/mobile/issues/${id}/assign`,
  ISSUE_START_WORK: (id: number) => `/api/mobile/issues/${id}/start-work`,
  ISSUE_CREATE_MAINTENANCE: (id: number) => `/api/mobile/issues/${id}/create-maintenance`,
  ISSUE_COMPLETE: (id: number) => `/api/mobile/issues/${id}/complete`,
  ISSUE_STATS: '/api/mobile/issues/stats',

  // Company profile (uses existing /api/company for web; mobile can use same or alias)
  COMPANY_PROFILE: '/api/company/profile',

  // Financial endpoints
  FINANCIAL_SUMMARY: '/api/mobile/financial/summary',
  FINANCIAL_ACCOUNTS: '/api/mobile/financial/accounts',
  FINANCIAL_ACCOUNT_UPDATE_BALANCE: '/api/mobile/financial/accounts/update-balance',
  FINANCIAL_TRANSACTIONS: '/api/mobile/financial/transactions',
  FINANCIAL_RECEIVABLES: '/api/mobile/financial/receivables',
  FINANCIAL_RECEIVE_PAYMENT: '/api/mobile/financial/receivables/receive-payment',
  FINANCIAL_PAYABLES: '/api/mobile/financial/payables',
  FINANCIAL_MAKE_PAYMENT: '/api/mobile/financial/payables/make-payment',
  FINANCIAL_RECURRING_PAYMENTS: '/api/mobile/financial/recurring-payments',
  FINANCIAL_DAY_END: '/api/mobile/financial/day-end',
  FINANCIAL_DAY_END_EXPORT_PDF: (date?: string) => `/api/mobile/financial/day-end/export/pdf${date ? `?date=${date}` : ''}`,
  FINANCIAL_DAY_END_EXPORT_EXCEL: (date?: string) => `/api/mobile/financial/day-end/export/excel${date ? `?date=${date}` : ''}`,

  // Maintenance report download
  MAINTENANCE_REPORT_DOWNLOAD: (id: number) => `/api/mobile/maintenance/${id}/report/download`,

  // Reports endpoints
  REPORTS_FINANCIAL: '/api/mobile/reports/financial',
  REPORTS_MAINTENANCE: '/api/mobile/reports/maintenance',
  REPORTS_EMPLOYEE: '/api/mobile/reports/employee',
  
  // Elevator Labels endpoints
  ELEVATOR_LABELS: '/api/mobile/elevator-labels',
  ELEVATOR_LABEL_STATS: '/api/mobile/elevator-labels/stats',
  ELEVATOR_LABEL_DETAIL: (id: number) => `/api/mobile/elevator-labels/${id}`,
  ELEVATOR_LABEL_COMPLETE: (id: number) => `/api/mobile/elevator-labels/${id}/complete`,
  ELEVATOR_LABEL_SEAL: (id: number) => `/api/mobile/elevator-labels/${id}/seal`,
  ELEVATOR_LABEL_CANCEL: (id: number) => `/api/mobile/elevator-labels/${id}/cancel`,
  ELEVATOR_LABEL_BUILDING_HISTORY: (buildingId: number) => `/api/mobile/elevator-labels/building/${buildingId}/history`,

  // Notifications endpoints
  NOTIFICATIONS: '/api/mobile/notifications',
  NOTIFICATIONS_UNREAD_COUNT: '/api/mobile/notifications/unread-count',
  MARK_NOTIFICATION_READ: (id: number) => `/api/mobile/notifications/${id}/read`,
  MARK_ALL_NOTIFICATIONS_READ: '/api/mobile/notifications/read-all',
  MARK_NOTIFICATIONS_BY_TYPE_READ: '/api/mobile/notifications/read-by-type',
  DELETE_NOTIFICATION: (id: number) => `/api/mobile/notifications/${id}`,
  DELETE_READ_NOTIFICATIONS: '/api/mobile/notifications/read',
  DELETE_OLD_NOTIFICATIONS: '/api/mobile/notifications/old',
  
  // Location endpoints
  LOCATION_MAP: '/api/mobile/location-map/data',
  EMPLOYEE_LOCATION_UPDATE: '/api/mobile/employee/location/update',
  LOCATION_CHECKS: (maintenanceScheduleId: number) => `/api/mobile/location-map/maintenance/${maintenanceScheduleId}/checks`,

  // Monitoring endpoints
  LOG_ERROR: '/api/mobile/monitoring/log-error',
} as const;

// ==================== APP CONSTANTS ====================
export const APP_CONFIG = {
  NAME: 'Proaslift',
  VERSION: '2.0.9',
  COMPANY: 'Harmanşah Yazılım',
  SUPPORT_EMAIL: 'destek@harmansah.com',
  SUPPORT_PHONE: '+90 212 555 0123',
} as const;

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'asansor_auth_token',
  USER_DATA: 'asansor_user_data',
  APP_SETTINGS: 'asansor_app_settings',
  OFFLINE_DATA: 'asansor_offline_data',
  LAST_SYNC: 'asansor_last_sync',
  BIOMETRIC_CREDENTIALS: 'asansor_biometric_credentials',
} as const;

// ==================== COLORS & THEME ====================
export const COLORS = {
  // Primary colors (Blue theme for corporate look)
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Status colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  blue: {
    100: '#dbeafe',
    500: '#3b82f6',
  },
  
  // Elevator label colors
  elevator: {
    yesil: '#22c55e',
    mavi: '#3b82f6',
    sari: '#f59e0b',
    kirmizi: '#ef4444',
  },
  
  // Gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Basic colors
  white: '#ffffff',
  black: '#000000',
} as const;

// ==================== DIMENSIONS ====================
export const DIMENSIONS = {
  SCREEN_PADDING: 16,
  CARD_PADDING: 16,
  BORDER_RADIUS: 12,
  BORDER_RADIUS_LG: 16,
  ICON_SIZE: {
    SMALL: 16,
    MEDIUM: 24,
    LARGE: 32,
    XLARGE: 48,
  },
  FONT_SIZE: {
    XS: 12,
    SM: 14,
    BASE: 16,
    MD: 17,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },
  SHADOW_SM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  SHADOW_MD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

// ==================== PRIORITY MAPPINGS ====================
export const PRIORITY_CONFIG = {
  dusuk: { label: 'Düşük', color: COLORS.gray[500], bgColor: COLORS.gray[50] },
  normal: { label: 'Normal', color: COLORS.primary[500], bgColor: COLORS.primary[50] },
  orta: { label: 'Orta', color: COLORS.warning[500], bgColor: COLORS.warning[50] },
  yuksek: { label: 'Yüksek', color: COLORS.warning[600], bgColor: COLORS.warning[50] },
  acil: { label: 'Acil', color: COLORS.error[500], bgColor: COLORS.error[50] },
} as const;

// ==================== STATUS MAPPINGS ====================
export const STATUS_CONFIG = {
  // Building status
  building: {
    aktif: { label: 'Aktif', color: COLORS.success[500], bgColor: COLORS.success[50] },
    pasif: { label: 'Pasif', color: COLORS.gray[500], bgColor: COLORS.gray[50] },
    beklemede: { label: 'Beklemede', color: COLORS.warning[500], bgColor: COLORS.warning[50] },
  },
  
  // Maintenance status
  maintenance: {
    planli: { label: 'Planlı', color: COLORS.gray[500], bgColor: COLORS.gray[50] },
    atandi: { label: 'Atandı', color: COLORS.primary[500], bgColor: COLORS.primary[50] },
    baslandi: { label: 'Başlandı', color: COLORS.warning[500], bgColor: COLORS.warning[50] },
    tamamlandi: { label: 'Tamamlandı', color: COLORS.success[500], bgColor: COLORS.success[50] },
    ertelendi: { label: 'Ertelendi', color: COLORS.warning[600], bgColor: COLORS.warning[50] },
    iptal: { label: 'İptal', color: COLORS.error[500], bgColor: COLORS.error[50] },
  },
  
  // Issue status
  issue: {
    bildirildi: { label: 'Bildirildi', color: COLORS.gray[500], bgColor: COLORS.gray[50] },
    inceleniyor: { label: 'İnceleniyor', color: COLORS.primary[500], bgColor: COLORS.primary[50] },
    ekip_atandi: { label: 'Ekip Atandı', color: COLORS.warning[500], bgColor: COLORS.warning[50] },
    calisma_basladi: { label: 'Çalışma Başladı', color: COLORS.warning[600], bgColor: COLORS.warning[50] },
    tamamlandi: { label: 'Tamamlandı', color: COLORS.success[500], bgColor: COLORS.success[50] },
    iptal_edildi: { label: 'İptal Edildi', color: COLORS.error[500], bgColor: COLORS.error[50] },
  },
} as const;

// ==================== VALIDATION RULES ====================
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[0-9]{10,11}$/,
  TC_REGEX: /^[0-9]{11}$/,
  PASSWORD_MIN_LENGTH: 8,
  DESCRIPTION_MAX_LENGTH: 1000,
  NAME_MAX_LENGTH: 255,
} as const;

export const PASSWORD_MIN_LENGTH = VALIDATION.PASSWORD_MIN_LENGTH;

// ==================== REFRESH INTERVALS ====================
export const REFRESH_INTERVALS = {
  DASHBOARD: 30000, // 30 seconds
  NOTIFICATIONS: 60000, // 1 minute
  MAINTENANCE_LIST: 120000, // 2 minutes
  BUILDING_LIST: 300000, // 5 minutes
} as const;
