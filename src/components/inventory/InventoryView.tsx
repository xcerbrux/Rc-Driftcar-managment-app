import React, { useState, useEffect } from 'react';
import { Search, Boxes, AlertTriangle, CheckCircle2, TrendingUp, Edit2 } from 'lucide-react';
import { Product } from '../../types';
import { subscribeProducts } from '../../services/firestoreService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { logAuditEvent } from '../../services/auditService';
import { formatCurrency } from '../../utils/formatters';
import { StockStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const { showToast } = useNotification();

  useEffect(() => {
    const unsub = subscribeProducts(setProducts);
    return () => unsub();
  }, []);

  const totalStockUnits = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const totalCostValuation = products.reduce(
    (acc, p) => acc + (p.stockQuantity || 0) * (p.costPrice || 0),
    0
  );
  const totalRetailValuation = products.reduce(
    (acc, p) => acc + (p.stockQuantity || 0) * (p.sellingPrice || 0),
    0
  );
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const newQty = parseInt(adjustmentQty, 10);
    if (isNaN(newQty) || newQty < 0) {
      showToast('Please provide a valid stock quantity.', 'error');
      return;
    }

    setAdjusting(true);
    try {
      const oldQty = selectedProduct.stockQuantity;
      const productRef = doc(db, 'products', selectedProduct.id);
      const now = new Date().toISOString();

      await updateDoc(productRef, {
        stockQuantity: newQty,
        updatedAt: now,
      });

      await logAuditEvent({
        action: 'inventory_adjusted',
        entityType: 'inventory',
        entityId: selectedProduct.id,
        summary: `Adjusted ${selectedProduct.name} stock from ${oldQty} to ${newQty}. Reason: ${adjustmentReason || 'Manual physical count adjustment'}`,
      });

      showToast(`Inventory updated for ${selectedProduct.name}`, 'success');
      setSelectedProduct(null);
      setAdjustmentQty('');
      setAdjustmentReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${selectedProduct.id}`);
    } finally {
      setAdjusting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'low') {
      return matchesSearch && p.stockQuantity <= p.minStockAlert && p.stockQuantity > 0;
    }
    if (statusFilter === 'out') {
      return matchesSearch && p.stockQuantity <= 0;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Valuation & Health Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Total Units in Stock</span>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{totalStockUnits}</div>
          <p className="text-xs text-zinc-500 mt-0.5">Across {products.length} catalog items</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Inventory Cost Value</span>
          <div className="mt-2 text-2xl font-bold text-zinc-900">{formatCurrency(totalCostValuation)}</div>
          <p className="text-xs text-zinc-500 mt-0.5">Capital tied in inventory</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Potential Retail Value</span>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(totalRetailValuation)}</div>
          <p className="text-xs text-zinc-500 mt-0.5">Estimated gross proceeds</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Stock Warnings</span>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm font-semibold text-amber-600">{lowStockCount} Low</span>
            <span className="text-zinc-300">&bull;</span>
            <span className="text-sm font-semibold text-rose-600">{outOfStockCount} Out</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Needs reorder attention</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search SKU or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => setStatusFilter('low')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'low'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setStatusFilter('out')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === 'out'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 text-xs">
            No stock records matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Cost / Unit</th>
                  <th className="px-4 py-3 text-right">Retail / Unit</th>
                  <th className="px-4 py-3 text-center">On Hand</th>
                  <th className="px-4 py-3 text-right">Stock Valuation</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProducts.map((p) => {
                  const itemValuation = (p.stockQuantity || 0) * (p.costPrice || 0);
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-zinc-700">{p.sku}</td>
                      <td className="px-4 py-3 font-semibold text-zinc-900">{p.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-600">{formatCurrency(p.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-900">{formatCurrency(p.sellingPrice)}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-zinc-900 text-sm">
                        {p.stockQuantity}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">
                        {formatCurrency(itemValuation)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StockStatusBadge stock={p.stockQuantity} minAlert={p.minStockAlert} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setAdjustmentQty(p.stockQuantity.toString());
                            setAdjustmentReason('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Count</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <Modal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title="Adjust Stock Count"
          subtitle={`${selectedProduct.name} (${selectedProduct.sku})`}
          maxWidth="sm"
        >
          <form onSubmit={handleStockAdjustment} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                New Physical Stock Count *
              </label>
              <input
                type="number"
                min="0"
                required
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Current recorded quantity: <strong>{selectedProduct.stockQuantity}</strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Reason for Adjustment *
              </label>
              <textarea
                required
                rows={2}
                placeholder="e.g. Physical inventory audit, damaged box, demo unit usage..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Saved to traceable audit log for financial integrity.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjusting}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-60"
              >
                {adjusting ? 'Saving...' : 'Confirm Count'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
