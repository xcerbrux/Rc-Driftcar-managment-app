export type UserRole = 'admin' | 'staff';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type ProductCategory =
  | 'chassis_kit'
  | 'rtr_car'
  | 'motor_esc'
  | 'body_shell'
  | 'wheels_tires'
  | 'gyro_electronics'
  | 'spare_parts'
  | 'accessories';

export type ProductScale = '1:10' | '1:18' | '1:24' | '1:28' | 'other';

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  additionalPrice: number;
  additionalCost: number;
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  brand: string;
  scale: ProductScale;
  description: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  hasVariants: boolean;
  variants?: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomerSocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'direct' | 'other';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  socialPlatform: CustomerSocialPlatform;
  socialHandle?: string;
  address: string;
  city?: string;
  region?: string;
  postalCode?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cod' | 'bank_transfer' | 'e_wallet' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DeliveryStatus = 'pending' | 'packed' | 'shipped' | 'delivered' | 'returned' | 'cancelled';

export interface SaleItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
}

export interface Sale {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: SaleItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  courier?: string;
  trackingNumber?: string;
  codRemitted?: boolean;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'packaging'
  | 'shipping_subsidy'
  | 'marketing_ads'
  | 'tools_maintenance'
  | 'equipment'
  | 'utilities'
  | 'supplies'
  | 'miscellaneous';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'e_wallet' | 'credit_card';
  referenceNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AuditAction =
  | 'sale_created'
  | 'sale_updated'
  | 'sale_cancelled'
  | 'product_created'
  | 'product_updated'
  | 'inventory_adjusted'
  | 'expense_created'
  | 'expense_updated'
  | 'customer_created';

export type AuditEntityType = 'sale' | 'product' | 'inventory' | 'expense' | 'customer' | 'system';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  summary: string;
  performedByUid: string;
  performedByEmail?: string;
  createdAt: string;
}

export type NavSection =
  | 'dashboard'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'expenses'
  | 'finance'
  | 'reports'
  | 'settings';
