/**
 * Type definitions for ElectroLux EMS
 * Centralized type definitions to replace 'any' types throughout the application
 */

// ========== USER TYPES ==========

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'admin' | 'employee' | 'customer';
  customerId?: number;
  employeeId?: number;
  accountNumber?: string;
  meterNumber?: string;
}

export interface Customer {
  id: number;
  userId: string;
  accountNumber: string;
  meterNumber: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  zone?: string | null;
  connectionType: 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
  status: 'active' | 'suspended' | 'pending_installation' | 'inactive';
  connectionDate: string;
  lastBillAmount?: string;
  lastPaymentDate?: string;
  averageMonthlyUsage?: string;
  outstandingBalance?: string;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: number;
  userId: string;
  employeeNumber: string;
  employeeName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  assignedZone?: string | null;
  status: 'active' | 'inactive';
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

// ========== BILLING TYPES ==========

export interface Bill {
  id: number;
  customerId: number;
  billNumber: string;
  billingMonth: string;
  issueDate: string;
  dueDate: string;
  unitsConsumed: number | string;
  meterReadingId?: number;
  tariffId: number;
  baseAmount: number | string;
  fixedCharges: number | string;
  electricityDuty: number | string;
  gstAmount: number | string;
  totalAmount: number | string;
  status: 'generated' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  tariff?: Tariff;
  tariffSlabs?: DBTariffSlab[];
}

export interface TariffSlab {
  id: number;
  tariffId: number;
  slabOrder: number;
  startUnits: number;
  endUnits: number | null;
  ratePerUnit: number;
  createdAt: string;
}

export interface DBTariffSlab {
  id: number;
  tariffId: number;
  slabOrder: number;
  startUnits: number;
  endUnits: number | null;
  ratePerUnit: string | number;
  createdAt: string | Date;
}

export interface Tariff {
  id: number;
  category: 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
  fixedCharge: number;
  electricityDutyPercent: number;
  gstPercent: number;
  effectiveDate: string;
  validUntil: string | null;
  slabs?: TariffSlab[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: number;
  customerId: number;
  billId?: number;
  paymentAmount: number | string;
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'cheque' | 'upi' | 'wallet';
  paymentDate: string;
  transactionId?: string;
  receiptNumber?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  bill?: Bill;
}

// ========== METER READING TYPES ==========

export interface MeterReading {
  id: number;
  customerId: number;
  currentReading: number | string;
  previousReading: number | string;
  unitsConsumed: number | string;
  readingDate: string;
  readingTime?: string;
  readingType: 'manual' | 'automatic' | 'estimated';
  meterCondition?: 'good' | 'fair' | 'poor' | 'damaged';
  accessibility?: 'accessible' | 'partially_accessible' | 'inaccessible';
  photoPath?: string;
  employeeId?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  employee?: Employee;
}

// ========== COMPLAINT TYPES ==========

export interface Complaint {
  id: number;
  customerId: number;
  employeeId?: number;
  workOrderId?: number;
  category: 'power_outage' | 'billing' | 'service' | 'meter_issue' | 'connection' | 'other';
  title: string;
  description: string;
  status: 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolutionNotes?: string;
  submittedAt?: string;
  reviewedAt?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  assignedEmployee?: Employee;
}

// ========== OUTAGE TYPES ==========

export interface Outage {
  id: number;
  areaName: string;
  zone: string;
  outageType: 'planned' | 'unplanned';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  affectedCustomerCount: number;
  status: 'scheduled' | 'ongoing' | 'restored' | 'cancelled';
  restorationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ========== WORK ORDER TYPES ==========

export interface WorkOrder {
  id: number;
  employeeId?: number;
  customerId?: number;
  workType: 'meter_reading' | 'maintenance' | 'complaint_resolution' | 'new_connection' | 'disconnection' | 'reconnection';
  title: string;
  description?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedDate: string;
  dueDate: string;
  completionDate?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
  assignedEmployee?: Employee;
  customer?: Customer;
}

// ========== CONNECTION REQUEST TYPES ==========

export interface ConnectionRequest {
  id: number;
  customerId: number;
  connectionType: 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
  address: string;
  city: string;
  state: string;
  pincode: string;
  zone?: string;
  requiredCapacity: number | string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  applicationDate: string;
  processedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
}

// ========== NOTIFICATION TYPES ==========

export interface Notification {
  id: number;
  userId: string;
  type: 'billing' | 'payment' | 'work_order' | 'complaint' | 'alert' | 'reminder' | 'outage';
  title: string;
  message: string;
  isRead: boolean;
  time: string;
  createdAt: string;
}

// ========== DASHBOARD TYPES ==========

export interface DashboardMetrics {
  totalCustomers: number;
  activeCustomers?: number;
  suspendedCustomers?: number;
  inactiveCustomers?: number;
  totalEmployees?: number;
  totalBills: number;
  activeBills?: number;
  totalRevenue: number;
  outstandingAmount?: number;
  pendingComplaints: number;
  activeOutages: number;
  monthlyRevenue: number;
  paymentCollectionRate: number;
  collectionRate?: number;
  averageBillAmount: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface RevenueByCategory {
  [key: string]: {
    total: number;
    count: number;
  };
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface PaymentMethods {
  [key: string]: number | { count?: number; amount?: number };
}

export interface BillsStatus {
  [key: string]: number | { count?: number; amount?: number };
}

export interface ConnectionTypeDistribution {
  [key: string]: number | { count?: number; activeCount?: number };
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentBills: Bill[];
  revenueByCategory: RevenueByCategory;
  monthlyRevenue: MonthlyRevenue[];
  paymentMethods: PaymentMethods;
  billsStatus: BillsStatus;
  connectionTypeDistribution: ConnectionTypeDistribution;
}

// ========== API RESPONSE TYPES ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

// ========== FORM TYPES ==========

export interface FormErrors {
  [key: string]: string | undefined;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  zone?: string;
  connectionType: 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
  termsAccepted: boolean;
}

export interface ComplaintForm {
  category: 'power_outage' | 'billing' | 'service' | 'meter_issue' | 'connection' | 'other';
  title: string;
  description: string;
}

// ========== UTILITY TYPES ==========

export type UserType = 'admin' | 'employee' | 'customer';
export type ConnectionType = 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural';
export type BillStatus = 'generated' | 'issued' | 'paid' | 'overdue' | 'cancelled';
export type ComplaintStatus = 'submitted' | 'under_review' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintCategory = 'power_outage' | 'billing' | 'service' | 'meter_issue' | 'connection' | 'other';
export type OutageStatus = 'scheduled' | 'ongoing' | 'restored' | 'cancelled';
export type WorkOrderStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type WorkOrderType = 'meter_reading' | 'maintenance' | 'complaint_resolution' | 'new_connection' | 'disconnection' | 'reconnection';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'cheque' | 'upi' | 'wallet';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type CustomerStatus = 'active' | 'suspended' | 'pending_installation' | 'inactive';

// ========== COMPONENT PROPS TYPES ==========

export interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: UserType;
  userName?: string;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// ========== EXPORT ALL ==========

export * from './index';

