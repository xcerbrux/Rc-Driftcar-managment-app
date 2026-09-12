import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { Product, Sale, Expense, Customer, AuditLog } from '../types';

/**
 * Real-time subscription to Products
 */
export function subscribeProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Product, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'products');
    }
  );
}

/**
 * Real-time subscription to Sales
 */
export function subscribeSales(
  onData: (sales: Sale[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Sale[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Sale, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'sales');
    }
  );
}

/**
 * Real-time subscription to Expenses
 */
export function subscribeExpenses(
  onData: (expenses: Expense[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Expense[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Expense, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    }
  );
}

/**
 * Real-time subscription to Customers
 */
export function subscribeCustomers(
  onData: (customers: Customer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Customer[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Customer, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'customers');
    }
  );
}

/**
 * Real-time subscription to Audit Logs
 */
export function subscribeAuditLogs(
  onData: (logs: AuditLog[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: AuditLog[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AuditLog, 'id'>),
      }));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
    }
  );
}

/**
 * Fetch initial metrics for Dashboard
 */
export async function getDashboardMetrics() {
  try {
    const [salesSnap, expensesSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, 'sales')),
      getDocs(collection(db, 'expenses')),
      getDocs(collection(db, 'products')),
    ]);

    let totalSales = 0;
    let pendingCod = 0;
    let totalExpenses = 0;
    let totalStockUnits = 0;
    let totalCostOfGoodsSold = 0;
    let activeOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let cancelledRevenue = 0;

    salesSnap.forEach((docSnap) => {
      const s = docSnap.data() as Sale;
      if (s.deliveryStatus === 'cancelled') {
        cancelledOrdersCount += 1;
        cancelledRevenue += s.totalAmount || 0;
        return;
      }
      activeOrdersCount += 1;
      totalSales += s.totalAmount || 0;
      totalCostOfGoodsSold += s.totalCost || 0;
      if (s.paymentMethod === 'cod' && s.paymentStatus === 'pending') {
        pendingCod += s.totalAmount || 0;
      }
    });

    expensesSnap.forEach((docSnap) => {
      const e = docSnap.data() as Expense;
      totalExpenses += e.amount || 0;
    });

    productsSnap.forEach((docSnap) => {
      const p = docSnap.data() as Product;
      totalStockUnits += p.stockQuantity || 0;
    });

    // Net profit = Total Sales - Cost of Goods Sold - Operating Expenses
    const netProfit = totalSales - totalCostOfGoodsSold - totalExpenses;

    return {
      totalSales,
      totalExpenses,
      netProfit,
      currentStock: totalStockUnits,
      pendingCod,
      totalOrders: activeOrdersCount,
      allOrdersCount: salesSnap.size,
      cancelledOrders: cancelledOrdersCount,
      cancelledRevenue,
      totalProducts: productsSnap.size,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'metrics');
  }
}
