import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Car, Trash2, Edit3, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Product, ProductCategory, ProductScale } from '../../types';
import { subscribeProducts } from '../../services/firestoreService';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { logAuditEvent } from '../../services/auditService';
import { seedInitialBusinessData } from '../../services/seedService';
import { formatCurrency } from '../../utils/formatters';
import { CategoryBadge, StockStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

const categoryOptions: { value: ProductCategory; label: string }[] = [
  { value: 'chassis_kit', label: 'Chassis Kit' },
  { value: 'rtr_car', label: 'RTR Complete Car' },
  { value: 'motor_esc', label: 'Motor & ESC' },
  { value: 'body_shell', label: 'Body Shell' },
  { value: 'wheels_tires', label: 'Wheels & Drift Tires' },
  { value: 'gyro_electronics', label: 'Gyro & Electronics' },
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'accessories', label: 'Accessories & Tools' },
];

const scaleOptions: ProductScale[] = ['1:10', '1:18', '1:24', '1:28', 'other'];

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      showToast('Failed to load starter products.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  // New Product Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'chassis_kit' as ProductCategory,
    brand: '',
    scale: '1:10' as ProductScale,
    costPrice: '',
    sellingPrice: '',
    stockQuantity: '',
    minStockAlert: '3',
    description: '',
  });

  useEffect(() => {
    const unsub = subscribeProducts(setProducts);
    return () => unsub();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      showToast('Product name and SKU are required.', 'error');
      return;
    }

    const cost = parseFloat(formData.costPrice) || 0;
    const price = parseFloat(formData.sellingPrice) || 0;
    const stock = parseInt(formData.stockQuantity, 10) || 0;
    const minAlert = parseInt(formData.minStockAlert, 10) || 3;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload: Omit<Product, 'id'> = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category,
        brand: formData.brand.trim() || 'Generic',
        scale: formData.scale,
        costPrice: cost,
        sellingPrice: price,
        stockQuantity: stock,
        minStockAlert: minAlert,
        hasVariants: false,
        description: formData.description.trim(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'products'), payload);

      await logAuditEvent({
        action: 'product_created',
        entityType: 'product',
        entityId: docRef.id,
        summary: `Added product: ${payload.name} (${payload.sku}) with stock ${stock}`,
      });

      showToast(`Product "${payload.name}" saved to catalog.`, 'success');
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        category: 'chassis_kit',
        brand: '',
        scale: '1:10',
        costPrice: '',
        sellingPrice: '',
        stockQuantity: '',
        minStockAlert: '3',
        description: '',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.name} (${product.sku})?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', product.id));
      await logAuditEvent({
        action: 'product_updated',
        entityType: 'product',
        entityId: product.id,
        summary: `Deleted product: ${product.name} (${product.sku})`,
      });
      showToast(`Product deleted.`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${product.id}`);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="product-search-input"
              type="text"
              placeholder="Search products by name, SKU, brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              id="product-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {products.length === 0 && (
            <button
              id="seed-starter-products-btn"
              onClick={handleSeedData}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-60"
            >
              {seeding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{seeding ? 'Loading Products...' : 'Load Starter Drift Catalog'}</span>
            </button>
          )}
          <button
            id="open-add-product-modal-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Car className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No products found</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              {products.length === 0
                ? 'Your product catalog is currently empty. Add drift car chassis, motors, ESCs, body shells, and tires to maintain live stock and exact purchase costs.'
                : 'No products match your current search or category filter.'}
            </p>
            {products.length === 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Your First Product</span>
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
                  <span>{seeding ? 'Loading Products...' : 'Load Starter Drift Catalog'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Product & SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Scale</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Selling Price</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProducts.map((item) => {
                  const marginAmount = item.sellingPrice - item.costPrice;
                  const marginPct =
                    item.sellingPrice > 0 ? Math.round((marginAmount / item.sellingPrice) * 100) : 0;
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900">{item.name}</div>
                        <div className="text-[11px] text-zinc-500">
                          SKU: <span className="font-mono">{item.sku}</span> &bull; {item.brand}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <CategoryBadge category={item.category} />
                      </td>
                      <td className="px-4 py-3.5 text-zinc-600 font-mono text-[11px]">{item.scale}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-zinc-600">
                        {formatCurrency(item.costPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-semibold text-zinc-900">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-emerald-600 font-medium">
                        +{formatCurrency(marginAmount)} ({marginPct}%)
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StockStatusBadge stock={item.stockQuantity} minAlert={item.minStockAlert} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteProduct(item)}
                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Product to Catalog"
        subtitle="Record new RC drift car or parts item with purchase cost"
        maxWidth="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MST RMX 2.5 RWD Drift Chassis Kit"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                SKU / Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MST-RMX-25"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                {categoryOptions.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Brand / Maker</label>
              <input
                type="text"
                placeholder="e.g. MST, Yokomo, Reve D, Overdose"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Scale</label>
              <select
                value={formData.scale}
                onChange={(e) => setFormData({ ...formData, scale: e.target.value as ProductScale })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                {scaleOptions.map((s) => (
                  <option key={s} value={s}>
                    {s} Scale
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Purchase Cost Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
              <p className="text-[10px] text-zinc-500 mt-0.5">Known purchase cost for profit tracking</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Selling Retail Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Initial Stock Quantity *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                placeholder="3"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                placeholder="Optional specs, color options, or package contents..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
