import { doc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { logAuditEvent } from './auditService';
import { Sale, Product, Customer, DeliveryStatus, PaymentStatus } from '../types';

export interface CancelOrderResult {
  itemsRestored: number;
  revenueReversed: number;
  orderNumber: string;
}

/**
 * Cancels an order, restores product inventory, and reverses customer metrics.
 */
export async function cancelOrder(
  sale: Sale,
  reason: string = 'Order cancelled by merchant/buyer request'
): Promise<CancelOrderResult> {
  if (sale.deliveryStatus === 'cancelled') {
    throw new Error(`Order #${sale.orderNumber} is already cancelled.`);
  }

  const now = new Date().toISOString();
  let totalItemsRestored = 0;

  // 1. Restore inventory stock for each product in the order
  for (const item of sale.items) {
    if (!item.productId || item.productId === 'custom_item') {
      continue;
    }

    try {
      const productRef = doc(db, 'products', item.productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const prodData = productSnap.data() as Product;
        const currentStock = Number(prodData.stockQuantity) || 0;
        const restoredQty = Number(item.quantity) || 0;
        const newStock = Math.max(0, currentStock + restoredQty);

        await updateDoc(productRef, {
          stockQuantity: newStock,
          updatedAt: now,
        });

        totalItemsRestored += restoredQty;

        await logAuditEvent({
          action: 'inventory_adjusted',
          entityType: 'inventory',
          entityId: item.productId,
          summary: `Restored ${restoredQty} unit(s) of "${item.productName}" back to stock (Order #${sale.orderNumber} cancelled). New stock: ${newStock}`,
        });
      }
    } catch (err) {
      console.error(`Failed to restore stock for item ${item.productId}:`, err);
    }
  }

  // 2. Reverse customer order statistics if customer profile exists
  if (sale.customerId) {
    try {
      const customerRef = doc(db, 'customers', sale.customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const custData = customerSnap.data() as Customer;
        const currentOrders = Number(custData.totalOrders) || 0;
        const currentSpent = Number(custData.totalSpent) || 0;
        const reversedSpent = Number(sale.totalAmount) || 0;

        const updatedOrders = Math.max(0, currentOrders - 1);
        const updatedSpent = Math.max(0, Math.round((currentSpent - reversedSpent) * 100) / 100);

        await updateDoc(customerRef, {
          totalOrders: updatedOrders,
          totalSpent: updatedSpent,
          updatedAt: now,
        });
      }
    } catch (err) {
      console.error(`Failed to reverse customer metrics for ${sale.customerId}:`, err);
    }
  }

  // 3. Update Sale status to cancelled & set payment status
  const saleRef = doc(db, 'sales', sale.id);
  const updatedNotes = sale.notes
    ? `${sale.notes} [CANCELLED: ${reason}]`.trim()
    : `[CANCELLED: ${reason}]`;

  // If order was paid, mark as refunded; otherwise failed/unpaid
  const newPaymentStatus: PaymentStatus =
    sale.paymentStatus === 'paid' ? 'refunded' : 'failed';

  await updateDoc(saleRef, {
    deliveryStatus: 'cancelled' as DeliveryStatus,
    paymentStatus: newPaymentStatus,
    notes: updatedNotes,
    updatedAt: now,
  });

  // 4. Record audit log
  await logAuditEvent({
    action: 'sale_cancelled',
    entityType: 'sale',
    entityId: sale.id,
    summary: `Order #${sale.orderNumber} CANCELLED. Restored ${totalItemsRestored} item(s) to stock and reversed $${sale.totalAmount} in revenue. Reason: ${reason}`,
  });

  return {
    itemsRestored: totalItemsRestored,
    revenueReversed: sale.totalAmount,
    orderNumber: sale.orderNumber,
  };
}

/**
 * Reactivates a previously cancelled order, re-verifying and deducting inventory stock.
 */
export async function reactivateOrder(
  sale: Sale,
  targetDeliveryStatus: DeliveryStatus = 'pending'
): Promise<void> {
  if (sale.deliveryStatus !== 'cancelled') {
    throw new Error(`Order #${sale.orderNumber} is not cancelled.`);
  }

  const now = new Date().toISOString();

  // 1. Verify stock availability for all items before applying changes
  for (const item of sale.items) {
    if (!item.productId || item.productId === 'custom_item') continue;

    const productRef = doc(db, 'products', item.productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const prodData = productSnap.data() as Product;
      const currentStock = Number(prodData.stockQuantity) || 0;
      const requiredQty = Number(item.quantity) || 0;

      if (currentStock < requiredQty) {
        throw new Error(
          `Cannot reactivate order: Product "${prodData.name}" has only ${currentStock} unit(s) in stock, but ${requiredQty} required.`
        );
      }
    }
  }

  // 2. Deduct inventory stock
  for (const item of sale.items) {
    if (!item.productId || item.productId === 'custom_item') continue;

    const productRef = doc(db, 'products', item.productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      const prodData = productSnap.data() as Product;
      const currentStock = Number(prodData.stockQuantity) || 0;
      const deductQty = Number(item.quantity) || 0;
      const newStock = Math.max(0, currentStock - deductQty);

      await updateDoc(productRef, {
        stockQuantity: newStock,
        updatedAt: now,
      });

      await logAuditEvent({
        action: 'inventory_adjusted',
        entityType: 'inventory',
        entityId: item.productId,
        summary: `Deducted ${deductQty} unit(s) of "${item.productName}" for reactivated Order #${sale.orderNumber}. Stock remaining: ${newStock}`,
      });
    }
  }

  // 3. Re-apply customer metrics
  if (sale.customerId) {
    try {
      const customerRef = doc(db, 'customers', sale.customerId);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        const custData = customerSnap.data() as Customer;
        const currentOrders = Number(custData.totalOrders) || 0;
        const currentSpent = Number(custData.totalSpent) || 0;
        const addSpent = Number(sale.totalAmount) || 0;

        await updateDoc(customerRef, {
          totalOrders: currentOrders + 1,
          totalSpent: Math.round((currentSpent + addSpent) * 100) / 100,
          updatedAt: now,
        });
      }
    } catch (err) {
      console.error(`Failed to re-apply customer metrics for ${sale.customerId}:`, err);
    }
  }

  // 4. Update Sale status back to active
  const saleRef = doc(db, 'sales', sale.id);
  const revertedPaymentStatus: PaymentStatus =
    sale.paymentMethod === 'cod' ? 'pending' : 'paid';

  await updateDoc(saleRef, {
    deliveryStatus: targetDeliveryStatus === 'cancelled' ? 'pending' : targetDeliveryStatus,
    paymentStatus: revertedPaymentStatus,
    updatedAt: now,
  });

  await logAuditEvent({
    action: 'sale_updated',
    entityType: 'sale',
    entityId: sale.id,
    summary: `Reactivated Order #${sale.orderNumber} from cancellation. Re-applied $${sale.totalAmount} to business revenue.`,
  });
}
