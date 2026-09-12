import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShoppingBag,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  Eye,
  Database,
  Sparkles,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { Sale, Product, Customer, DeliveryStatus, PaymentStatus, PaymentMethod } from '../../types';
import { subscribeSales, subscribeProducts, subscribeCustomers } from '../../services/firestoreService';
import { cancelOrder, reactivateOrder } from '../../services/orderService';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { logAuditEvent } from '../../services/auditService';
import { seedInitialBusinessData } from '../../services/seedService';
import { calculateOrderTotals } from '../../utils/calculations';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { DeliveryStatusBadge, PaymentStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

export function SalesView({
  isAddModalOpenFromParent,
  onCloseAddModal,
}: {
  isAddModalOpenFromParent?: boolean;
  onCloseAddModal?: () => void;
}) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<Sale | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { showToast } = useNotification();

  // Cancellation State
  const [cancellationTarget, setCancellationTarget] = useState<Sale | null>(null);
  const [cancellationReason, setCancellationReason] = useState('Buyer requested cancellation via chat');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);

  // Watch parent modal trigger
  useEffect(() => {
    if (isAddModalOpenFromParent) {
      setIsAddModalOpen(true);
    }
  }, [isAddModalOpenFromParent]);

  useEffect(() => {
    const unsubSales = subscribeSales(setSales);
    const unsubProducts = subscribeProducts(setProducts);
    const unsubCustomers = subscribeCustomers(setCustomers);
    return () => {
      unsubSales();
      unsubProducts();
      unsubCustomers();
    };
  }, []);

  // Form State for Manual Order Entry
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [socialPlatform, setSocialPlatform] = useState<'facebook' | 'instagram' | 'direct'>('facebook');
  const [socialHandle, setSocialHandle] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  
  // Item mode: 'catalog' | 'custom'
  const [itemMode, setItemMode] = useState<'catalog' | 'custom'>('catalog');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customSellingPrice, setCustomSellingPrice] = useState('');
  const [customCostPrice, setCustomCostPrice] = useState('');

  const [orderQuantity, setOrderQuantity] = useState(1);
  const [shippingFee, setShippingFee] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [courier, setCourier] = useState('');
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Derive item unit price & unit cost
  const effectiveUnitPrice =
    itemMode === 'catalog'
      ? selectedProduct?.sellingPrice || 0
      : parseFloat(customSellingPrice) || 0;

  const effectiveUnitCost =
    itemMode === 'catalog'
      ? selectedProduct?.costPrice || 0
      : parseFloat(customCostPrice) || 0;

  const effectiveItemName =
    itemMode === 'catalog' ? selectedProduct?.name || '' : customItemName.trim();

  // Live calculated financial figures
  const calculation = calculateOrderTotals({
    items: effectiveItemName
      ? [
          {
            quantity: orderQuantity,
            unitPrice: effectiveUnitPrice,
            unitCost: effectiveUnitCost,
          },
        ]
      : [],
    shippingFee: parseFloat(shippingFee) || 0,
    discount: parseFloat(discount) || 0,
  });

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    if (onCloseAddModal) onCloseAddModal();
  };

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
      showToast('Failed to seed initial data. Check permissions or network.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !effectiveItemName) {
      showToast('Please fill all required order and item details.', 'error');
      return;
    }

    if (itemMode === 'catalog' && selectedProduct) {
      if (selectedProduct.stockQuantity < orderQuantity) {
        showToast(
          `Insufficient stock! Only ${selectedProduct.stockQuantity} unit(s) available in inventory.`,
          'error'
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const orderNumber = `RC-${Date.now().toString().slice(-6)}`;

      // 1. Create or match customer
      let customerId = '';
      const existingCustomer = customers.find(
        (c) => c.phone.trim() === customerPhone.trim() || c.name.toLowerCase() === customerName.toLowerCase()
      );

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await updateDoc(doc(db, 'customers', existingCustomer.id), {
          totalOrders: (existingCustomer.totalOrders || 0) + 1,
          totalSpent: (existingCustomer.totalSpent || 0) + calculation.totalAmount,
          updatedAt: now,
        });
      } else {
        const newCustRef = await addDoc(collection(db, 'customers'), {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          socialPlatform,
          socialHandle: socialHandle.trim() || '',
          address: shippingAddress.trim(),
          totalOrders: 1,
          totalSpent: calculation.totalAmount,
          createdAt: now,
          updatedAt: now,
        });
        customerId = newCustRef.id;
      }

      // 2. Decrement inventory if catalog item
      let finalProductId = selectedProductId;
      if (itemMode === 'catalog' && selectedProduct) {
        const productRef = doc(db, 'products', selectedProduct.id);
        const updatedStock = Math.max(0, selectedProduct.stockQuantity - orderQuantity);
        await updateDoc(productRef, {
          stockQuantity: updatedStock,
          updatedAt: now,
        });
      } else if (itemMode === 'custom') {
        // Optionally create as custom product in catalog for tracking
        const newProdRef = await addDoc(collection(db, 'products'), {
          name: customItemName.trim(),
          sku: `CUSTOM-${Date.now().toString().slice(-4)}`,
          category: 'spare_parts',
          brand: 'Custom / Order',
          scale: '1:10',
          costPrice: effectiveUnitCost,
          sellingPrice: effectiveUnitPrice,
          stockQuantity: 0,
          minStockAlert: 1,
          hasVariants: false,
          description: 'Created via direct sales entry',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        finalProductId = newProdRef.id;
      }

      // 3. Record Sale
      const salePayload: Omit<Sale, 'id'> = {
        orderNumber,
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: [
          {
            productId: finalProductId || 'custom_item',
            productName: effectiveItemName,
            quantity: orderQuantity,
            unitPrice: effectiveUnitPrice,
            unitCost: effectiveUnitCost,
            totalPrice: calculation.subtotal,
            totalCost: calculation.totalCost,
          },
        ],
        subtotal: calculation.subtotal,
        shippingFee: calculation.shippingFee,
        discount: calculation.discount,
        totalAmount: calculation.totalAmount,
        totalCost: calculation.totalCost,
        profit: calculation.profit,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        deliveryStatus: 'pending',
        courier: courier.trim() || 'Standard Delivery',
        notes: notes.trim() || '',
        createdBy: auth.currentUser?.uid || 'system',
        createdAt: now,
        updatedAt: now,
      };

      const saleDocRef = await addDoc(collection(db, 'sales'), salePayload);

      // 4. Audit Log
      await logAuditEvent({
        action: 'sale_created',
        entityType: 'sale',
        entityId: saleDocRef.id,
        summary: `Created Order #${orderNumber} for ${customerName} (${orderQuantity}x ${effectiveItemName}) - Total: $${calculation.totalAmount}, Profit: $${calculation.profit}`,
      });

      showToast(`Sale #${orderNumber} recorded successfully!`, 'success');
      handleCloseModal();
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setSocialHandle('');
      setShippingAddress('');
      setSelectedProductId('');
      setCustomItemName('');
      setCustomSellingPrice('');
      setCustomCostPrice('');
      setOrderQuantity(1);
      setShippingFee('0');
      setDiscount('0');
      setNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sales');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!cancellationTarget) return;
    setIsCancelling(true);
    try {
      const result = await cancelOrder(cancellationTarget, cancellationReason);
      showToast(
        `Order #${result.orderNumber} cancelled. Restored ${result.itemsRestored} item(s) to stock and reversed $${result.revenueReversed.toFixed(2)} from revenue.`,
        'success'
      );
      setCancellationTarget(null);
      if (selectedSaleDetails?.id === cancellationTarget.id) {
        setSelectedSaleDetails(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel order.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateStatus = async (
    sale: Sale,
    field: 'deliveryStatus' | 'paymentStatus',
    newVal: string
  ) => {
    // Intercept cancellation to open confirmation and run transactional reversal
    if (field === 'deliveryStatus') {
      if (newVal === 'cancelled') {
        setCancellationTarget(sale);
        setCancellationReason('Buyer requested cancellation via chat');
        return;
      }

      // If order was cancelled and is now set to an active status, reactivate and re-deduct inventory
      if (sale.deliveryStatus === 'cancelled' && newVal !== 'cancelled') {
        setIsReactivating(true);
        try {
          await reactivateOrder(sale, newVal as DeliveryStatus);
          showToast(
            `Order #${sale.orderNumber} reactivated! Inventory deducted and financial revenue restored.`,
            'success'
          );
          if (selectedSaleDetails?.id === sale.id) {
            setSelectedSaleDetails(null);
          }
          return;
        } catch (err: any) {
          showToast(err.message || 'Failed to reactivate order.', 'error');
          return;
        } finally {
          setIsReactivating(false);
        }
      }
    }

    try {
      const saleRef = doc(db, 'sales', sale.id);
      const now = new Date().toISOString();
      await updateDoc(saleRef, {
        [field]: newVal,
        updatedAt: now,
      });

      await logAuditEvent({
        action: 'sale_updated',
        entityType: 'sale',
        entityId: sale.id,
        summary: `Updated Order #${sale.orderNumber} ${field} to ${newVal}`,
      });

      showToast(`Order #${sale.orderNumber} updated.`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${sale.id}`);
    }
  };

  const activeSalesList = sales.filter((s) => s.deliveryStatus !== 'cancelled');
  const cancelledSalesList = sales.filter((s) => s.deliveryStatus === 'cancelled');
  const activeRevenue = activeSalesList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const cancelledRevenue = cancelledSalesList.reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      s.customerPhone.includes(search);
    const matchesDelivery = deliveryFilter === 'all' || s.deliveryStatus === deliveryFilter;
    const matchesPayment = paymentFilter === 'all' || s.paymentStatus === paymentFilter;
    return matchesSearch && matchesDelivery && matchesPayment;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="sales-search-input"
              type="text"
              placeholder="Search Order #, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <select
            value={deliveryFilter}
            onChange={(e) => setDeliveryFilter(e.target.value)}
            className="text-xs py-2 px-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="pending">Pending Pack</option>
            <option value="packed">Packed</option>
            <option value="shipped">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="returned">Returned</option>
            <option value="cancelled">Cancelled ({cancelledSalesList.length})</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs py-2 px-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending COD / Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {sales.length === 0 && (
            <button
              id="seed-starter-data-btn"
              onClick={handleSeedData}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-60"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{seeding ? 'Loading Data...' : 'Load Sample Drift Car Orders'}</span>
            </button>
          )}

          <button
            id="open-record-sale-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record New Sale</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Counts */}
      {sales.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 shadow-2xs">
            <span className="text-zinc-500">Active Orders:</span>
            <span className="font-semibold text-zinc-900">{activeSalesList.length}</span>
            <span className="text-zinc-400">&bull;</span>
            <span className="font-mono font-bold text-zinc-900">{formatCurrency(activeRevenue)}</span>
          </div>

          {cancelledSalesList.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50/70 border border-rose-200 text-rose-900 shadow-2xs">
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-rose-700">Cancelled / Reversed:</span>
              <span className="font-semibold text-rose-950">{cancelledSalesList.length}</span>
              <span className="text-rose-300">&bull;</span>
              <span className="font-mono font-bold text-rose-900">{formatCurrency(cancelledRevenue)}</span>
              <span className="text-[11px] text-rose-600">(Stock restored)</span>
            </div>
          )}
        </div>
      )}

      {/* Sales Orders Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No sales orders found</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              {sales.length === 0
                ? 'When customers place orders through Facebook or Instagram, manually record them here to track COD collection, adjust stock, and calculate exact profit.'
                : 'No sales match your current search and status filters.'}
            </p>
            {sales.length === 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record First Sale</span>
                </button>
                <button
                  onClick={handleSeedData}
                  disabled={seeding}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-60"
                >
                  {seeding ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{seeding ? 'Generating Data...' : 'Load Sample Drift Car Orders'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Order & Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items Summary</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Net Profit</th>
                  <th className="px-4 py-3">Delivery Status</th>
                  <th className="px-4 py-3">Payment / COD</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`transition-colors ${
                      sale.deliveryStatus === 'cancelled'
                        ? 'bg-rose-50/20 hover:bg-rose-50/40 text-zinc-600'
                        : 'hover:bg-zinc-50/70'
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-900 font-mono">{sale.orderNumber}</span>
                        {sale.deliveryStatus === 'cancelled' && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-semibold rounded">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">{formatDate(sale.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-zinc-900">{sale.customerName}</div>
                      <div className="text-[11px] text-zinc-500">{sale.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-zinc-800 max-w-[200px] truncate">
                        {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {sale.paymentMethod.toUpperCase()} &bull; {sale.courier || 'Standard'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      {sale.deliveryStatus === 'cancelled' ? (
                        <div>
                          <span className="line-through text-zinc-400 font-medium block text-xs">
                            {formatCurrency(sale.totalAmount)}
                          </span>
                          <span className="text-[10px] text-rose-600 font-semibold block">Reversed</span>
                        </div>
                      ) : (
                        <span className="font-bold text-zinc-900">{formatCurrency(sale.totalAmount)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      {sale.deliveryStatus === 'cancelled' ? (
                        <div>
                          <span className="line-through text-zinc-400 font-medium block text-xs">
                            +{formatCurrency(sale.profit)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-normal block">$0.00 Net</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-emerald-600">+{formatCurrency(sale.profit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={sale.deliveryStatus}
                        onChange={(e) =>
                          handleUpdateStatus(sale, 'deliveryStatus', e.target.value as DeliveryStatus)
                        }
                        className={`text-[11px] py-1 px-2 rounded-md border font-medium ${
                          sale.deliveryStatus === 'cancelled'
                            ? 'border-rose-300 bg-rose-50 text-rose-800 font-semibold'
                            : 'border-zinc-200 bg-white text-zinc-700'
                        }`}
                      >
                        <option value="pending">Pending Pack</option>
                        <option value="packed">Packed</option>
                        <option value="shipped">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="returned">Returned</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={sale.paymentStatus}
                        onChange={(e) =>
                          handleUpdateStatus(sale, 'paymentStatus', e.target.value as PaymentStatus)
                        }
                        className={`text-[11px] py-1 px-2 rounded-md border font-medium ${
                          sale.deliveryStatus === 'cancelled' || sale.paymentStatus === 'refunded'
                            ? 'border-rose-200 bg-rose-50 text-rose-800'
                            : sale.paymentStatus === 'paid'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        <option value="pending">Unpaid / Pending COD</option>
                        <option value="paid">Paid & Remitted</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded / Void</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedSaleDetails(sale)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                        title="View order details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal Form */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title="Record Sale Order"
        subtitle="Manually enter order from Facebook/Instagram chat with live profit sync"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSale} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Marcus Tan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Customer Phone Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +63 917 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Order Source Platform</label>
              <select
                value={socialPlatform}
                onChange={(e) => setSocialPlatform(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="facebook">Facebook Messenger</option>
                <option value="instagram">Instagram Direct Message</option>
                <option value="direct">Direct Walk-in / Phone</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Social Profile / Username</label>
              <input
                type="text"
                placeholder="e.g. @marcus_drift / FB profile name"
                value={socialHandle}
                onChange={(e) => setSocialHandle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Complete Shipping Address *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Delivery address with street, barangay/district, city, and postal code..."
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {/* Product selection mode switch */}
            <div className="sm:col-span-2 border-t border-zinc-200 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-900">Ordered Product / Item *</span>
                <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setItemMode('catalog')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      itemMode === 'catalog'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    From Catalog ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemMode('custom')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      itemMode === 'custom'
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Direct Item Entry
                  </button>
                </div>
              </div>

              {itemMode === 'catalog' ? (
                <div>
                  {products.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <p className="font-medium mb-1">Your product catalog is empty.</p>
                      <p className="text-[11px] text-amber-800 mb-2">
                        You can load starter RC drift car products or switch to "Direct Item Entry" above to record a sale immediately.
                      </p>
                      <button
                        type="button"
                        onClick={handleSeedData}
                        disabled={seeding}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-amber-800 text-white rounded-md hover:bg-amber-900"
                      >
                        {seeding ? 'Loading Products...' : 'Load Starter Catalog'}
                      </button>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    >
                      <option value="">-- Choose Product from Catalog --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.stockQuantity <= 0}>
                          {p.name} ({p.sku}) &bull; Stock: {p.stockQuantity} &bull; Price: ${p.sellingPrice}
                          {p.stockQuantity <= 0 ? ' [OUT OF STOCK]' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-medium text-zinc-700 mb-0.5">
                      Item Description *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MST RMX 2.5 Drift Car / Custom Battery Pack"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 mb-0.5">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={customSellingPrice}
                      onChange={(e) => setCustomSellingPrice(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-700 mb-0.5">
                      Wholesale Cost ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={customCostPrice}
                      onChange={(e) => setCustomCostPrice(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-[10px] text-zinc-500 pb-1">
                      Enables recording custom or uncatalogued items.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="e_wallet">GCash / Maya / E-Wallet</option>
                <option value="cash">Direct Cash</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Shipping Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Discount ($)</label>
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Courier Service</label>
              <input
                type="text"
                placeholder="e.g. J&T Express, LBC, Flash Express"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Internal Notes</label>
              <input
                type="text"
                placeholder="Optional customer requests or packaging note"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Synchronized Financial Preview */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2 text-xs">
            <p className="font-semibold text-zinc-900 uppercase tracking-wide text-[10px]">
              Financial Calculation Preview
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-200">
              <div>
                <span className="text-zinc-500">Subtotal:</span>
                <p className="font-mono font-semibold text-zinc-900">{formatCurrency(calculation.subtotal)}</p>
              </div>
              <div>
                <span className="text-zinc-500">Total Charged:</span>
                <p className="font-mono font-bold text-zinc-900">{formatCurrency(calculation.totalAmount)}</p>
              </div>
              <div>
                <span className="text-zinc-500">Product Cost:</span>
                <p className="font-mono text-zinc-700">{formatCurrency(calculation.totalCost)}</p>
              </div>
              <div>
                <span className="text-zinc-500">Calculated Profit:</span>
                <p className="font-mono font-bold text-emerald-600">
                  {formatCurrency(calculation.profit)} ({calculation.marginPercentage}%)
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !effectiveItemName}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Recording...' : 'Confirm Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Sale Details Modal */}
      {selectedSaleDetails && (
        <Modal
          isOpen={!!selectedSaleDetails}
          onClose={() => setSelectedSaleDetails(null)}
          title={`Order #${selectedSaleDetails.orderNumber}`}
          subtitle={`Placed on ${formatDateTime(selectedSaleDetails.createdAt)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {selectedSaleDetails.deliveryStatus === 'cancelled' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Order Cancelled & Reversed</span>
                </div>
                <p className="text-rose-700 text-[11px] mt-1 leading-relaxed">
                  All ordered items have been restored to warehouse inventory. Gross revenue (-{formatCurrency(selectedSaleDetails.totalAmount)}) and COGS are reversed with zero net profit impact.
                </p>
                {selectedSaleDetails.notes && (
                  <p className="text-rose-800 text-[11px] mt-1 italic">
                    Reason: {selectedSaleDetails.notes}
                  </p>
                )}
              </div>
            )}

            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              <h4 className="font-semibold text-zinc-900 mb-1">Customer Details</h4>
              <p className="font-medium text-zinc-800">{selectedSaleDetails.customerName}</p>
              <p className="text-zinc-500">{selectedSaleDetails.customerPhone}</p>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-2">Ordered Items</h4>
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                {selectedSaleDetails.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-zinc-900">{it.productName}</p>
                      <p className="text-zinc-500 text-[11px]">
                        Qty: {it.quantity} &bull; Unit: {formatCurrency(it.unitPrice)} &bull; Cost:{' '}
                        {formatCurrency(it.unitCost)}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-zinc-900">
                      {formatCurrency(it.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zinc-200 pt-3 space-y-1.5 font-mono">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedSaleDetails.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping Fee:</span>
                <span>+{formatCurrency(selectedSaleDetails.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Discount:</span>
                <span>-{formatCurrency(selectedSaleDetails.discount)}</span>
              </div>
              <div className="flex justify-between text-zinc-900 font-bold border-t border-zinc-200 pt-1 text-sm">
                <span>Total Amount:</span>
                <span className={selectedSaleDetails.deliveryStatus === 'cancelled' ? 'line-through text-zinc-400' : ''}>
                  {formatCurrency(selectedSaleDetails.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold pt-1">
                <span>Order Profit:</span>
                <span className={selectedSaleDetails.deliveryStatus === 'cancelled' ? 'line-through text-zinc-400' : ''}>
                  +{formatCurrency(selectedSaleDetails.profit)}
                </span>
              </div>
              {selectedSaleDetails.deliveryStatus === 'cancelled' && (
                <div className="flex justify-between text-rose-600 font-semibold pt-0.5 text-[11px]">
                  <span>Net Ledger Impact:</span>
                  <span>$0.00 (Reversed)</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-center justify-between gap-2">
              <div>
                {selectedSaleDetails.deliveryStatus === 'cancelled' ? (
                  <button
                    type="button"
                    disabled={isReactivating}
                    onClick={async () => {
                      const saleToReactivate = selectedSaleDetails;
                      setIsReactivating(true);
                      try {
                        await reactivateOrder(saleToReactivate, 'pending');
                        showToast(
                          `Order #${saleToReactivate.orderNumber} reactivated! Stock deducted & revenue restored.`,
                          'success'
                        );
                        setSelectedSaleDetails(null);
                      } catch (err: any) {
                        showToast(err.message || 'Failed to reactivate order.', 'error');
                      } finally {
                        setIsReactivating(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isReactivating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Reactivate Order (Re-deduct Stock)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedSaleDetails;
                      setSelectedSaleDetails(null);
                      setCancellationTarget(target);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Cancel Order & Restore Stock</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedSaleDetails(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Order Confirmation Modal */}
      {cancellationTarget && (
        <Modal
          isOpen={!!cancellationTarget}
          onClose={() => !isCancelling && setCancellationTarget(null)}
          title={`Cancel Order #${cancellationTarget.orderNumber}`}
          subtitle="Inventory stock will be restored and financial records will be reversed"
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
              <div className="flex items-center gap-2 font-semibold text-rose-950 mb-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Automatic Stock & Financial Reversal</span>
              </div>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Cancelling this order will immediately restore all inventory back to stock, reverse the revenue and wholesale COGS from reports, and update customer statistics.
              </p>
            </div>

            <div className="border border-zinc-200 rounded-lg p-3 space-y-2 bg-zinc-50">
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-medium">Customer:</span>
                <span className="font-semibold text-zinc-900">
                  {cancellationTarget.customerName} ({cancellationTarget.customerPhone})
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-medium">Order Total to Reverse:</span>
                <span className="font-mono font-bold text-rose-600">
                  -{formatCurrency(cancellationTarget.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-700">
                <span className="font-medium">Profit to Reverse:</span>
                <span className="font-mono font-bold text-rose-600">
                  -{formatCurrency(cancellationTarget.profit)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-1.5">Items to be Restored to Stock:</h4>
              <div className="border border-zinc-200 rounded-lg divide-y divide-zinc-100 bg-white">
                {cancellationTarget.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-zinc-900">{it.productName}</p>
                      <p className="text-[11px] text-zinc-500">
                        Unit Price: {formatCurrency(it.unitPrice)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                      +{it.quantity} unit{it.quantity > 1 ? 's' : ''} to stock
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">
                Cancellation Reason *
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 bg-white text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="Buyer requested cancellation via chat">Buyer requested cancellation via chat</option>
                <option value="Buyer unreachable / Unconfirmed COD address">Buyer unreachable / Unconfirmed COD address</option>
                <option value="Item out of stock / unable to fulfill">Item out of stock / unable to fulfill</option>
                <option value="Courier returned parcel / rejected at delivery">Courier returned parcel / rejected at delivery</option>
                <option value="Customer duplicate order">Customer duplicate order</option>
                <option value="Wrong item ordered by customer">Wrong item ordered by customer</option>
                <option value="Other / Store policy">Other / Store policy</option>
              </select>
            </div>

            <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancellationTarget(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Keep Order Active
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelOrder}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs disabled:opacity-60"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Restoring Stock & Reversing...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Cancellation & Restore Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
