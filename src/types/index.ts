// 🏢 ENTERPRISE LEVEL TYPE DEFINITIONS
// 35 yıllık yazılımcı tecrübesi ile tasarlanmış tip güvenliği

// ==================== AUTH TYPES ====================
export interface User {
  id: number;
  name: string;
  email: string;
  company_id: number;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    is_employee?: boolean; // Backend'den gelen is_employee field'ı
  };
  message: string;
  is_employee?: boolean; // Alternatif olarak response'un en üst seviyesinde de olabilir
}

// ==================== COMPANY TYPES ====================
export interface Company {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  subscription_plan: 'basic' | 'orta' | 'super';
  subscription_status: 'active' | 'suspended' | 'cancelled' | 'trial';
  subscription_start?: string;
  subscription_end?: string;
  monthly_fee: number;
  max_buildings: number;
  max_employees: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== BUILDING TYPES ====================
export interface Building {
  id: number;
  company_id: number;
  name: string;
  address: string;
  district: string;
  city: string;
  floor_count: number;
  elevator_count: number;
  elevator_type: 'yolcu' | 'yuk' | 'hasta' | 'karma';
  elevator_brand?: string;
  elevator_model?: string;
  installation_year?: number;
  contract_type: 'bakim' | 'onarim' | 'modernizasyon';
  monthly_fee: number;
  contract_start_date: string;
  contract_end_date: string;
  status: 'aktif' | 'pasif' | 'beklemede';
  operational_status: 'aktif' | 'bakim' | 'arizali' | 'muhurlendi' | 'devre_disi';
  elevator_code?: string;
  capacity_kg?: number;
  capacity_person?: number;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  responsible_person?: string;
  responsible_phone?: string;
  responsible_email?: string;
  elevator_notes?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
  contacts?: BuildingContact[];
  activeLabel?: ElevatorLabel;
}

export interface BuildingContact {
  id: number;
  building_id: number;
  name: string;
  title: string;
  phone: string;
  email?: string;
  apartment_no?: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== EMPLOYEE TYPES ====================
export interface Employee {
  id: number;
  company_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  position: 'teknisyen' | 'usta' | 'muhendis' | 'yonetici' | 'muhasebe';
  position_label: string;
  salary: number;
  hire_date: string;
  is_active: boolean;
  notes?: string;
  user_id?: number;
  created_at: string;
  updated_at: string;
}

// ==================== MAINTENANCE TYPES ====================
export interface MaintenanceSchedule {
  id: number;
  company_id: number;
  building_id: number;
  assigned_employee_id?: number;
  maintenance_type: 'rutin_bakim' | 'ariza_onarim' | 'periyodik_kontrol' | 'modernizasyon';
  maintenance_type_label: string;
  scheduled_date: string;
  scheduled_time?: string;
  priority: 'dusuk' | 'normal' | 'yuksek' | 'acil';
  priority_label: string;
  status: 'planli' | 'atandi' | 'baslandi' | 'tamamlandi' | 'ertelendi' | 'iptal';
  status_label: string;
  description: string;
  notes?: string;
  estimated_cost?: number;
  estimated_duration?: number;
  created_at: string;
  updated_at: string;
  building?: Building;
  assignedEmployee?: Employee;
  maintenanceReport?: MaintenanceReport;
}

export interface UsedProduct {
  name?: string;
  product_id?: number;
  quantity: number;
  unit?: string;
  unit_price?: number;
}

export interface ProductOption {
  id: number;
  name: string;
  code: string;
  category: string;
  category_label: string;
  unit: string;
  sale_price: number;
  stock_quantity: number;
}

export interface MaintenanceReport {
  id: number;
  maintenance_schedule_id: number;
  employee_id: number;
  start_time: string;
  end_time?: string;
  work_description: string;
  used_products?: UsedProduct[] | string;
  total_cost: number;
  problems_found?: string;
  recommendations?: string;
  completion_status: 'tamamlandi' | 'kismi_tamamlandi' | 'ertelendi';
  customer_signature: boolean;
  customer_name?: string;
  customer_notes?: string;
  photos?: string[] | string;
  completion_percentage?: number;
  approval_status?: 'onay_bekliyor' | 'onaylandi';
  approval_status_label?: string;
  approved_by_name?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  maintenanceSchedule?: MaintenanceSchedule;
  employee?: Employee;
}

export interface MaintenanceReportForm {
  maintenance_schedule_id: number;
  start_time: string;
  end_time?: string;
  work_description: string;
  used_products?: UsedProduct[];
  total_cost?: number;
  problems_found?: string;
  recommendations?: string;
  completion_status: 'tamamlandi' | 'kismi_tamamlandi' | 'ertelendi';
  customer_signature?: boolean;
  customer_name?: string;
  customer_notes?: string;
  photos?: string[];
}

// ==================== ELEVATOR LABEL TYPES ====================
export interface ElevatorLabel {
  id: number;
  building_id: number;
  label_color: 'yesil' | 'mavi' | 'sari' | 'kirmizi';
  label_color_text: string;
  control_date: string;
  follow_up_days: number;
  due_date?: string;
  next_control_date?: string;
  status: 'aktif' | 'tamamlandi' | 'muhurlendi' | 'iptal';
  status_text: string;
  description?: string;
  correction_date?: string;
  source: 'periyodik_kontrol' | 'takip_kontrol' | 'manuel';
  source_text: string;
  is_sealing_candidate: boolean;
  inspector_name?: string;
  inspector_company?: string;
  inspector_license?: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
  building?: Building;
}

// ==================== FINANCIAL TYPES (See below for full definitions) ====================

// ==================== ISSUE REPORT TYPES ====================
export interface IssueReport {
  id: number;
  company_id: number;
  building_id: number;
  reported_by: string;
  issue_type: 'elektrik_arizasi' | 'mekanik_ariza' | 'kapı_arizasi' | 'ses_sistemi' | 'acil_durum' | 'diger';
  priority: 'dusuk' | 'orta' | 'yuksek' | 'acil';
  priority_label: string;
  description: string;
  location_details?: string;
  contact_name?: string;
  contact_phone?: string;
  status: 'bildirildi' | 'inceleniyor' | 'ekip_atandi' | 'calisma_basladi' | 'tamamlandi' | 'iptal_edildi';
  assigned_employee_id?: number;
  assigned_at?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  customer_notes?: string;
  photos?: string;
  is_urgent: boolean;
  requires_immediate_attention: boolean;
  created_at: string;
  updated_at: string;
  maintenance_schedule_id?: number;
  building?: Building;
  assignedEmployee?: Employee;
}

// ==================== DASHBOARD STATS TYPES ====================
export interface DashboardStats {
  totalEmployees: number;
  totalBuildings: number;
  activeMaintenances: number;
  lowStockProducts: number;
  thisMonthIncome: number;
  thisMonthExpense: number;
  completedMaintenance: number;
  activeCustomers: number;
  urgentIssues: number;
  // Employee specific stats
  assigned_tasks_count?: number;
  completed_this_month?: number;
  today_tasks?: number;
  this_week_tasks?: number;
  overdue_tasks?: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface MonthlyTrendData {
  income: number;
  expense: number;
  profit: number;
}

// ==================== API RESPONSE TYPES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

// ==================== NAVIGATION TYPES ====================
export type RootStackParamList = {
  Consent: undefined;
  Login: undefined;
  Kvkk: undefined;
  Main: undefined;
  EmployeeDashboard: undefined;
  Buildings: undefined;
  Employees: undefined;
  Maintenance: { initialTab?: 'planned' | 'completed' | 'overdue' };
  Notifications: undefined;
  BuildingDetail: { buildingId: number };
  BuildingCreate: undefined;
  Depot: undefined;
  EmployeeDetail: { employeeId: number };
  MaintenanceDetail: { maintenanceId: number };
  MaintenanceEdit: { maintenanceId: number };
  MaintenanceCreate: undefined;
  Issues: undefined;
  IssueDetail: { issueId: number };
  IssueCreate: undefined;
  CompanyProfile: undefined;
  ElevatorLabels: undefined;
  ElevatorLabelDetail: { elevatorLabelId: number };
  QRScanner: undefined;
  ActiveJob: {
    maintenanceScheduleId: number;
    maintenanceSchedule: MaintenanceSchedule;
  };
  CreateMaintenanceReport: { 
    maintenanceScheduleId: number;
    maintenanceSchedule: MaintenanceSchedule;
  };
  MaintenanceReportDetail: {
    maintenanceSchedule: MaintenanceSchedule;
    maintenanceReport: {
      id: number;
      start_time?: string | null;
      end_time?: string | null;
      work_description?: string | null;
      total_cost?: number | null;
      completion_status?: string | null;
      completion_percentage?: number | null;
      problems_found?: string | null;
      recommendations?: string | null;
      customer_name?: string | null;
      customer_notes?: string | null;
      routine_maintenance_checklist?: Record<string, Array<{ id: string; title: string; checked: boolean; has_error: boolean; notes: string }>> | null;
    };
  };
  Profile: undefined;
  TodayJobs: undefined;
  Financial: undefined;
  Accounts: undefined;
  Transactions: undefined;
  Receivables: undefined;
  Payables: undefined;
  RecurringPayments: undefined;
  DayEnd: undefined;
  UnifiedTransactions: undefined;
};

// ==================== FORM TYPES ====================
export interface CreateMaintenanceForm {
  building_id: number;
  maintenance_type: string;
  scheduled_date: string;
  scheduled_time?: string;
  priority: string;
  description: string;
  assigned_employee_id?: number;
  estimated_cost?: number;
  estimated_duration?: number;
  notes?: string;
}

export interface CreateIssueForm {
  building_id: number;
  reported_by: string;
  issue_type: string;
  priority: string;
  description: string;
  location_details?: string;
  contact_name?: string;
  contact_phone?: string;
  assigned_employee_id?: number;
  is_urgent: boolean;
}

// ==================== NOTIFICATION TYPES ====================
export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  type: 'maintenance' | 'issue' | 'financial' | 'employee' | 'system' | 'general';
  type_label: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  priority_label: string;
  data?: {
    screen?: string;
    params?: Record<string, any>;
    // Type-specific fields
    maintenance_schedule_id?: number;
    maintenance_schedule?: any;
    issue_id?: number;
    [key: string]: any; // Allow additional fields
  };
  related_entity_type?: string | null;
  related_entity_id?: number | null;
  read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationUnreadCount {
  total_unread: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

// ==================== FILTER TYPES ====================
export interface BuildingFilters {
  search?: string;
  status?: string;
  district?: string;
  contract_type?: string;
}

export interface MaintenanceFilters {
  search?: string;
  status?: string;
  priority?: string;
  building_id?: number;
  employee_id?: number;
  date_from?: string;
  date_to?: string;
}

export interface EmployeeFilters {
  search?: string;
  position?: string;
  is_active?: boolean;
}

// ==================== LOCATION TYPES ====================
export interface EmployeeLocation {
  id: number;
  employee_id: number;
  maintenance_schedule_id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  recorded_at: string;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface LocationCheck {
  id: number;
  company_id: number;
  employee_id: number;
  building_id: number;
  maintenance_schedule_id: number;
  check_type: 'arrival' | 'departure';
  scheduled_time: string;
  actual_time?: string;
  employee_latitude?: number;
  employee_longitude?: number;
  building_latitude: number;
  building_longitude: number;
  distance_from_building?: number; // metre cinsinden
  time_difference_minutes?: number;
  status: 'on_time' | 'late' | 'early' | 'pending';
  is_on_time: boolean;
  created_at: string;
  updated_at: string;
  employee?: Employee;
  building?: Building;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface MapData {
  buildings: BuildingWithCoordinates[];
  buildings_without_coordinates: Building[];
  employees: ActiveEmployee[];
  today_schedules: MaintenanceScheduleWithLocation[];
  selected_date: string;
  location_checks: LocationCheck[];
}

export interface BuildingWithCoordinates extends Building {
  coordinates: {
    lat: number;
    lng: number;
  };
  has_coordinates: boolean;
}

export interface ActiveEmployee {
  id: number;
  name: string;
  position: string;
  phone: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  last_update: string;
  active_maintenance: {
    id: number;
    building_id: number;
    building_name: string;
    scheduled_time: string;
    estimated_duration: number;
    status: string;
  } | null;
  location_checks: {
    arrival?: LocationCheck;
    departure?: LocationCheck;
  };
}

export interface MaintenanceScheduleWithLocation extends MaintenanceSchedule {
  building: BuildingWithCoordinates;
  assigned_employee: Employee | null;
  scheduled_time_display: string | null; // "14:30" format
  estimated_end_time: string | null;
}

// ==================== FINANCIAL TYPES ====================
export interface AccountType {
  id: number;
  name: string;
  type: 'kasa' | 'banka' | 'nakit' | 'pos';
  type_label: string;
  account_number?: string;
  bank_name?: string;
  branch_name?: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountingEntry {
  id: number;
  company_id: number;
  account_type_id?: number;
  type: 'gelir' | 'gider' | 'maas' | 'vergi' | 'sigorta';
  type_label: string;
  category: string;
  description: string;
  amount: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount: number;
  transaction_date: string;
  payment_method: 'nakit' | 'banka_havalesi' | 'kredi_karti' | 'cek';
  payment_method_label: string;
  status: 'beklemede' | 'odendi' | 'tahsil_edildi' | 'iptal';
  status_label: string;
  invoice_number?: string;
  building_id?: number;
  employee_id?: number;
  notes?: string;
  account_type?: AccountType;
  building?: Building;
  employee?: Employee;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface Receivable {
  id: number;
  company_id: number;
  building_id: number;
  title: string;
  description?: string;
  total_amount: number;
  received_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'beklemede' | 'kismi_odendi' | 'tamamlandi' | 'gecikti';
  status_label: string;
  payment_type: 'tek_sefer' | 'taksitli';
  payment_type_label: string;
  installment_count: number;
  paid_installments: number;
  installment_amount?: number;
  priority: 'dusuk' | 'orta' | 'yuksek';
  priority_label: string;
  notes?: string;
  building?: Building;
  created_by?: {
    id: number;
    name: string;
  };
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payable {
  id: number;
  company_id: number;
  title: string;
  description?: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'beklemede' | 'kismi_odendi' | 'tamamlandi' | 'gecikti';
  status_label: string;
  category: 'elektrik' | 'su' | 'dogalgaz' | 'internet' | 'telefon' | 'maas' | 'vergi' | 'sigorta' | 'kira' | 'diger';
  category_label: string;
  priority: 'dusuk' | 'orta' | 'yuksek';
  priority_label: string;
  invoice_number?: string;
  supplier_name?: string;
  notes?: string;
  created_by?: {
    id: number;
    name: string;
  };
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringPayment {
  id: number;
  company_id: number;
  title: string;
  description?: string;
  amount: number;
  type: 'gelir' | 'gider';
  type_label: string;
  frequency: 'gunluk' | 'haftalik' | 'aylik' | 'uc_aylik' | 'alti_aylik' | 'yillik';
  frequency_label: string;
  start_date: string;
  end_date?: string;
  next_payment_date?: string;
  last_payment_date?: string;
  is_active: boolean;
  building_id?: number;
  account_id?: number;
  building?: Building;
  account?: AccountType;
  notes?: string;
  created_by?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  stats: {
    total_balance: number;
    monthly_income: number;
    monthly_expense: number;
    total_receivables: number;
    total_payables: number;
    net_income: number;
  };
  accounts_count: number;
  recent_transactions: AccountingEntry[];
  upcoming_receivables: Receivable[];
  upcoming_payables: Payable[];
}

// ==================== UTILITY TYPES ====================
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface AsyncState<T> extends LoadingState {
  data: T | null;
}

export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  notifications_enabled: boolean;
  auto_sync: boolean;
  offline_mode: boolean;
}
