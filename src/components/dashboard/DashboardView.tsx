import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Package,
  Truck,
  Plus,
  Car,
  Receipt,
  ArrowRight,
  Clock,
  ShieldAlert,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Product, Sale, Expense, NavSection } from '../../types';
import { subscribeProducts, subscribeSales, subscribeExpenses } from '../../services/firestoreService';
import { seedInitialBusinessData } from '../../services/seedService';
import { useNotification } from '../../context/NotificationContext';
import { formatCurrency, formatDate, formatRelativeTime } from '../../utils/formatters';
import { DeliveryStatusBadge, PaymentStatusBadge } from '../common/Badge';

interface DashboardViewProps {
  onNavigate: (section: NavSection) => void;
  onOpenAction: (action: 'new_sale' | 'new_product' | 'new_expense') => void;
}

export function DashboardView({ onNavigate, onOpenAction }: DashboardViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const { showToast } = useNotification();

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialBusinessData();
      showToast(
        `Loaded ${res.productsCount} drift car items, ${res.salesCount} sample sales, and expenses!`,
        'success'
      );
    } catch (error: any) {
      console.error('Seeding error:', error);
      showToast('Failed to load starter data.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    let unmounted = false;

    const unsubProducts = subscribeProducts((data) => {
      if (!unmounted) setProducts(data);
    });
    const unsubSales = subscribeSales((data) => {
      if (!unmounted) setSales(data);
    });
    const unsubExpenses = subscribeExpenses((data) => {
      if (!unmounted) {
        setExpenses(data);
        setLoading(false);
      }
    });

    return () => {
      unmounted = true;
      unsubProducts();
      unsubSales();
      unsubExpenses();
    };
  }, []);

  // Compute live metrics (excluding cancelled sales from revenue, COGS, and pending COD)
  const activeSales = sales.filter((s) => s.deliveryStatus !== 'cancelled');
  const cancelledSales = sales.filter((s) => s.deliveryStatus === 'cancelled');

  const totalSales = activeSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalCOGS = activeSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = totalSales - totalCOGS - totalExpenses;
  const currentStockUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const pendingCod = activeSales
    .filter((s) => s.paymentMethod === 'cod' && s.paymentStatus === 'pending')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const lowStockProducts = products.filter((p) => p.stockQuantity <= p.minStockAlert);
  const recentSales = sales.slice(0, 5);
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Business Scope Banner */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">RC Drift Car Specialist Shop</h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            Manual order intake, COD delivery tracking, verified stock counts & synchronized profit.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sales.length === 0 && (
            <button
              id="dash-seed-data-btn"
              onClick={handleSeedData}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{seeding ? 'Generating...' : 'Load Sample Drift Car Orders'}</span>
            </button>
          )}
          <button
            id="dash-new-sale-btn"
            onClick={() => onOpenAction('new_sale')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sale</span>
          </button>
          <button
            id="dash-add-product-btn"
            onClick={() => onOpenAction('new_product')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-colors"
          >
            <Car className="w-3.5 h-3.5 text-zinc-500" />
            <span>Add Product</span>
          </button>
          <button
            id="dash-log-expense-btn"
            onClick={() => onOpenAction('new_expense')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-700 text-xs font-medium hover:bg-zinc-50 transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-zinc-500" />
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {activeSales.length} active order{activeSales.length !== 1 ? 's' : ''}
              {cancelledSales.length > 0 && ` (${cancelledSales.length} cancelled)`}
            </p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-zinc-500 mt-0.5">{expenses.length} expense entries</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Net Profit</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-zinc-900' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">After COGS & expenses</p>
          </div>
        </div>

        {/* Current Stock */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Current Stock</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900">{currentStockUnits} units</div>
            <p className="text-xs text-zinc-500 mt-0.5">{products.length} catalog items</p>
          </div>
        </div>

        {/* Pending COD */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Pending COD</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-zinc-900">{formatCurrency(pendingCod)}</div>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Courier collection pending</p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if any */}
      {lowStockProducts.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>
              <strong>{lowStockProducts.length} product(s)</strong> have reached minimum stock alert threshold!
            </span>
          </div>
          <button
            onClick={() => onNavigate('inventory')}
            className="font-medium underline hover:text-amber-950"
          >
            Review Inventory
          </button>
        </div>
      )}

      {/* Two Column Layout: Recent Sales & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recent Sales Orders</h3>
              <p className="text-xs text-zinc-500">Facebook / Instagram orders entered manually</p>
            </div>
            <button
              onClick={() => onNavigate('sales')}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              <span>View all sales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100">
            {recentSales.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-zinc-800">No sales recorded yet</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
                  When customers purchase RC chassis, drift bodies, or electronics, record the sale here to track delivery and COD.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => onOpenAction('new_sale')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record First Sale</span>
                  </button>
                  <button
                    onClick={handleSeedData}
                    disabled={seeding}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {seeding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{seeding ? 'Loading...' : 'Load Sample Drift Car Orders'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Profit</th>
                      <th className="px-4 py-3">Delivery</th>
                      <th className="px-4 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          <div>{sale.orderNumber}</div>
                          <span className="text-[11px] text-zinc-400">{formatRelativeTime(sale.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          <div className="font-medium text-zinc-900">{sale.customerName}</div>
                          <span className="text-[11px] text-zinc-400">{sale.customerPhone}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-zinc-900">
                          {sale.deliveryStatus === 'cancelled' ? (
                            <div>
                              <span className="line-through text-zinc-400 font-normal text-xs">
                                {formatCurrency(sale.totalAmount)}
                              </span>
                              <span className="text-[10px] text-rose-600 block font-medium">Reversed</span>
                            </div>
                          ) : (
                            formatCurrency(sale.totalAmount)
                          )}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">
                          {sale.deliveryStatus === 'cancelled' ? (
                            <span className="text-zinc-400 font-normal text-xs">$0.00</span>
                          ) : (
                            `+${formatCurrency(sale.profit)}`
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <DeliveryStatusBadge status={sale.deliveryStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <PaymentStatusBadge status={sale.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Expenses (1 col) */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Recent Expenses</h3>
              <p className="text-xs text-zinc-500">Packaging, shipping & ops</p>
            </div>
            <button
              onClick={() => onNavigate('expenses')}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 p-4">
            {recentExpenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <Receipt className="w-8 h-8 text-zinc-300 mb-2" />
                <p className="text-sm font-medium text-zinc-700">No expenses logged</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Record packaging materials, bubble wraps, boxes, or courier fees.
                </p>
                <button
                  onClick={() => onOpenAction('new_expense')}
                  className="mt-3 text-xs font-medium text-zinc-800 underline hover:text-zinc-950"
                >
                  Log first expense
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 rounded-lg border border-zinc-100 bg-zinc-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-900">{exp.title}</p>
                      <p className="text-[11px] text-zinc-500 capitalize">{exp.category.replace('_', ' ')} &bull; {formatDate(exp.expenseDate)}</p>
                    </div>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
