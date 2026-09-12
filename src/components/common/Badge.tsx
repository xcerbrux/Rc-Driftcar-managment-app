import React from 'react';
import { DeliveryStatus, PaymentStatus, ProductCategory } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'md', className = '' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    default: 'bg-zinc-900 text-white border-zinc-900',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </span>
  );
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const map: Record<DeliveryStatus, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
    pending: { label: 'Pending Pack', variant: 'warning' },
    packed: { label: 'Packed', variant: 'info' },
    shipped: { label: 'In Transit', variant: 'info' },
    delivered: { label: 'Delivered', variant: 'success' },
    returned: { label: 'Returned', variant: 'danger' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
  };

  const item = map[status] || { label: status, variant: 'neutral' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; variant: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
    pending: { label: 'Unpaid / Pending COD', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    failed: { label: 'Payment Failed', variant: 'danger' },
    refunded: { label: 'Refunded', variant: 'neutral' },
  };

  const item = map[status] || { label: status, variant: 'neutral' };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

export function StockStatusBadge({ stock, minAlert }: { stock: number; minAlert: number }) {
  if (stock <= 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  }
  if (stock <= minAlert) {
    return <Badge variant="warning">Low Stock ({stock})</Badge>;
  }
  return <Badge variant="success">In Stock ({stock})</Badge>;
}

export function CategoryBadge({ category }: { category: ProductCategory }) {
  const labels: Record<ProductCategory, string> = {
    chassis_kit: 'Chassis Kit',
    rtr_car: 'RTR Complete',
    motor_esc: 'Motor & ESC',
    body_shell: 'Body Shell',
    wheels_tires: 'Wheels & Drift Tires',
    gyro_electronics: 'Gyro / Electronics',
    spare_parts: 'Spare Parts',
    accessories: 'Accessories / Tools',
  };

  return <Badge variant="neutral">{labels[category] || category}</Badge>;
}
