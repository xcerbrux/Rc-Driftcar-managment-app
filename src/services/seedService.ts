import { collection, addDoc, getDocs, limit, query } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { logAuditEvent } from './auditService';
import { Product, Sale, Customer, Expense } from '../types';

export async function hasExistingSales(): Promise<boolean> {
  try {
    const q = query(collection(db, 'sales'), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error('Error checking existing sales:', error);
    return false;
  }
}

export async function hasExistingProducts(): Promise<boolean> {
  try {
    const q = query(collection(db, 'products'), limit(1));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (error) {
    console.error('Error checking existing products:', error);
    return false;
  }
}

/**
 * Seeds realistic initial RC Drift Car business catalog, orders, and expenses.
 */
export async function seedInitialBusinessData(): Promise<{
  productsCount: number;
  salesCount: number;
  customersCount: number;
  expensesCount: number;
}> {
  const now = new Date();
  const isoNow = now.toISOString();
  const userId = auth.currentUser?.uid || 'system_initial';

  // 1. Initial Products Catalog
  const sampleProducts: Omit<Product, 'id'>[] = [
    {
      name: 'MST RMX 2.5 RWD Drift Chassis Kit (1:10)',
      sku: 'MST-RMX25-KIT',
      category: 'chassis_kit',
      brand: 'MST',
      scale: '1:10',
      costPrice: 185,
      sellingPrice: 265,
      stockQuantity: 8,
      minStockAlert: 2,
      hasVariants: false,
      description: 'Rear-wheel drive drift chassis kit with high motor mount position for maximum weight transfer.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Yokomo YD-2ZX Carbon RWD Drift Chassis',
      sku: 'YOK-YD2ZX-BK',
      category: 'chassis_kit',
      brand: 'Yokomo',
      scale: '1:10',
      costPrice: 420,
      sellingPrice: 580,
      stockQuantity: 3,
      minStockAlert: 2,
      hasVariants: false,
      description: 'Competition grade carbon graphite chassis with high traction motor mount.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Reve D RS-ST High Torque Coreless Drift Servo',
      sku: 'REVE-RS-ST',
      category: 'gyro_electronics',
      brand: 'Reve D',
      scale: '1:10',
      costPrice: 45,
      sellingPrice: 72,
      stockQuantity: 14,
      minStockAlert: 4,
      hasVariants: false,
      description: 'Super smooth steering control designed specifically for RWD RC drifting.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Hobbywing XeRun XR10 Pro Drift ESC + 10.5T Combo',
      sku: 'HW-XR10-105T',
      category: 'motor_esc',
      brand: 'Hobbywing',
      scale: '1:10',
      costPrice: 160,
      sellingPrice: 235,
      stockQuantity: 6,
      minStockAlert: 2,
      hasVariants: false,
      description: 'Brushless sensored system with custom drift throttle curve and boost timing.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Yokomo DP-302 V4 Drift Steering Gyro',
      sku: 'YOK-DP302-V4',
      category: 'gyro_electronics',
      brand: 'Yokomo',
      scale: '1:10',
      costPrice: 52,
      sellingPrice: 85,
      stockQuantity: 11,
      minStockAlert: 3,
      hasVariants: false,
      description: 'High response rate steering assist with dual gain mode.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Pandem Nissan Silvia S15 Clear Body Shell',
      sku: 'BODY-S15-PAN',
      category: 'body_shell',
      brand: 'Addiction',
      scale: '1:10',
      costPrice: 38,
      sellingPrice: 65,
      stockQuantity: 9,
      minStockAlert: 3,
      hasVariants: false,
      description: 'Includes wide body fenders, light buckets, and aero rear wing.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Overdose Work Emotion T7R White Wheels + Tires (4pcs)',
      sku: 'OD-WHEEL-T7R',
      category: 'wheels_tires',
      brand: 'Overdose',
      scale: '1:10',
      costPrice: 22,
      sellingPrice: 38,
      stockQuantity: 18,
      minStockAlert: 5,
      hasVariants: false,
      description: 'Deep concave drift wheels pre-mounted with hard carpet/asphalt compound tires.',
      isActive: true,
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      updatedAt: isoNow,
    },
  ];

  const createdProducts: Product[] = [];
  for (const p of sampleProducts) {
    const docRef = await addDoc(collection(db, 'products'), p);
    createdProducts.push({ id: docRef.id, ...p });
  }

  // 2. Initial Customers from Facebook & Instagram
  const sampleCustomers: Omit<Customer, 'id'>[] = [
    {
      name: 'Kenneth Ramos',
      phone: '+63 917 888 2314',
      socialPlatform: 'facebook',
      socialHandle: 'Kenneth DriftPH',
      address: 'Block 12 Lot 4, Redwood St, Greenwoods Executive Village, Pasig City',
      city: 'Pasig City',
      notes: 'Requested fragile label on parcel',
      totalOrders: 1,
      totalSpent: 303,
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Mark Alvarez',
      phone: '+63 920 771 9022',
      socialPlatform: 'instagram',
      socialHandle: '@mark_drifter_ph',
      address: 'Unit 4B Sunrise Residences, Katipunan Ave, Quezon City',
      city: 'Quezon City',
      notes: 'Paid via GCash bank transfer',
      totalOrders: 1,
      totalSpent: 165,
      createdAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
      updatedAt: isoNow,
    },
    {
      name: 'Jason Cruz',
      phone: '+63 908 332 1199',
      socialPlatform: 'facebook',
      socialHandle: 'Jason Cruz (RC Manila)',
      address: '24 Mahogany St, Ayala Alabang Village, Muntinlupa',
      city: 'Muntinlupa',
      notes: 'Repeat buyer, regular COD',
      totalOrders: 1,
      totalSpent: 245,
      createdAt: new Date(now.getTime() - 86400000 * 0.5).toISOString(),
      updatedAt: isoNow,
    },
  ];

  const createdCustomers: Customer[] = [];
  for (const c of sampleCustomers) {
    const docRef = await addDoc(collection(db, 'customers'), c);
    createdCustomers.push({ id: docRef.id, ...c });
  }

  // 3. Initial Sales Orders
  const sampleSales: Omit<Sale, 'id'>[] = [
    {
      orderNumber: 'RC-892104',
      customerId: createdCustomers[0].id,
      customerName: createdCustomers[0].name,
      customerPhone: createdCustomers[0].phone,
      items: [
        {
          productId: createdProducts[0].id,
          productName: createdProducts[0].name,
          quantity: 1,
          unitPrice: 265,
          unitCost: 185,
          totalPrice: 265,
          totalCost: 185,
        },
        {
          productId: createdProducts[6].id,
          productName: createdProducts[6].name,
          quantity: 1,
          unitPrice: 38,
          unitCost: 22,
          totalPrice: 38,
          totalCost: 22,
        },
      ],
      subtotal: 303,
      shippingFee: 12,
      discount: 0,
      totalAmount: 315,
      totalCost: 207,
      profit: 108,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      deliveryStatus: 'shipped',
      courier: 'J&T Express (Tracking: JT89230198)',
      notes: 'COD collection pending with courier rider',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      updatedAt: isoNow,
    },
    {
      orderNumber: 'RC-892105',
      customerId: createdCustomers[1].id,
      customerName: createdCustomers[1].name,
      customerPhone: createdCustomers[1].phone,
      items: [
        {
          productId: createdProducts[2].id,
          productName: createdProducts[2].name,
          quantity: 1,
          unitPrice: 72,
          unitCost: 45,
          totalPrice: 72,
          totalCost: 45,
        },
        {
          productId: createdProducts[4].id,
          productName: createdProducts[4].name,
          quantity: 1,
          unitPrice: 85,
          unitCost: 52,
          totalPrice: 85,
          totalCost: 52,
        },
      ],
      subtotal: 157,
      shippingFee: 8,
      discount: 0,
      totalAmount: 165,
      totalCost: 97,
      profit: 68,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      deliveryStatus: 'delivered',
      courier: 'LBC Express',
      notes: 'Delivered and verified by buyer',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
      updatedAt: isoNow,
    },
    {
      orderNumber: 'RC-892106',
      customerId: createdCustomers[2].id,
      customerName: createdCustomers[2].name,
      customerPhone: createdCustomers[2].phone,
      items: [
        {
          productId: createdProducts[3].id,
          productName: createdProducts[3].name,
          quantity: 1,
          unitPrice: 235,
          unitCost: 160,
          totalPrice: 235,
          totalCost: 160,
        },
      ],
      subtotal: 235,
      shippingFee: 10,
      discount: 0,
      totalAmount: 245,
      totalCost: 160,
      profit: 85,
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      deliveryStatus: 'delivered',
      courier: 'Flash Express (Remittance: FE-66120)',
      notes: 'COD remitted to bank account',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 0.5).toISOString(),
      updatedAt: isoNow,
    },
  ];

  for (const s of sampleSales) {
    const docRef = await addDoc(collection(db, 'sales'), s);
    await logAuditEvent({
      action: 'sale_created',
      entityType: 'sale',
      entityId: docRef.id,
      summary: `Sample order #${s.orderNumber} loaded for ${s.customerName}`,
    });
  }

  // 4. Initial Operating Expenses
  const sampleExpenses: Omit<Expense, 'id'>[] = [
    {
      title: '50x Corrugated Heavy-Duty Shipping Boxes (1:10 Scale Size)',
      category: 'packaging',
      amount: 65,
      expenseDate: new Date(now.getTime() - 86400000 * 6).toISOString().split('T')[0],
      paymentMethod: 'cash',
      referenceNo: 'INV-BOXES-99',
      notes: 'Double-wall cardboard boxes for chassis protection',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 6).toISOString(),
      updatedAt: isoNow,
    },
    {
      title: 'Bubble Wrap (3 Rolls) & Fragile Warning Tape',
      category: 'packaging',
      amount: 32.5,
      expenseDate: new Date(now.getTime() - 86400000 * 4).toISOString().split('T')[0],
      paymentMethod: 'cash',
      referenceNo: 'RCPT-BW-31',
      notes: 'Packaging protection for body shells & electronics',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
      updatedAt: isoNow,
    },
    {
      title: 'Provincial Courier Shipping Subsidy (J&T Express)',
      category: 'shipping_subsidy',
      amount: 24,
      expenseDate: new Date(now.getTime() - 86400000 * 2).toISOString().split('T')[0],
      paymentMethod: 'e_wallet',
      referenceNo: 'JT-SUB-102',
      notes: 'Subsidized shipping for distant buyers',
      createdBy: userId,
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
      updatedAt: isoNow,
    },
  ];

  for (const exp of sampleExpenses) {
    const docRef = await addDoc(collection(db, 'expenses'), exp);
    await logAuditEvent({
      action: 'expense_created',
      entityType: 'expense',
      entityId: docRef.id,
      summary: `Logged operating expense: ${exp.title} ($${exp.amount})`,
    });
  }

  return {
    productsCount: createdProducts.length,
    salesCount: sampleSales.length,
    customersCount: createdCustomers.length,
    expensesCount: sampleExpenses.length,
  };
}
