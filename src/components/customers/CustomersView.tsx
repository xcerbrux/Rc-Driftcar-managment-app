import React, { useState, useEffect } from 'react';
import { Search, Users, Plus, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { Customer, CustomerSocialPlatform } from '../../types';
import { subscribeCustomers } from '../../services/firestoreService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { logAuditEvent } from '../../services/auditService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    socialPlatform: 'facebook' as CustomerSocialPlatform,
    socialHandle: '',
    address: '',
    city: '',
    notes: '',
  });

  useEffect(() => {
    const unsub = subscribeCustomers(setCustomers);
    return () => unsub();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      showToast('Name, phone, and delivery address are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload: Omit<Customer, 'id'> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        socialPlatform: formData.socialPlatform,
        socialHandle: formData.socialHandle.trim() || '',
        address: formData.address.trim(),
        city: formData.city.trim() || '',
        notes: formData.notes.trim() || '',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'customers'), payload);

      await logAuditEvent({
        action: 'customer_created',
        entityType: 'customer',
        entityId: docRef.id,
        summary: `Added customer profile: ${payload.name} (${payload.phone})`,
      });

      showToast(`Customer profile created for ${payload.name}`, 'success');
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        socialPlatform: 'facebook',
        socialHandle: '',
        address: '',
        city: '',
        notes: '',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.socialHandle && c.socialHandle.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            id="customer-search-input"
            type="text"
            placeholder="Search by customer name, phone, or Facebook/IG handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <button
          id="add-customer-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No customer records yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              Customer profiles are automatically created whenever you record a sale, or you can add contacts in advance.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Social Origin</th>
                  <th className="px-4 py-3">Delivery Address</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3 text-right">Customer Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900">{c.name}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{c.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize font-medium text-zinc-800">{c.socialPlatform}</span>
                      {c.socialHandle && (
                        <div className="text-[11px] text-zinc-500 font-mono">{c.socialHandle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-zinc-700 max-w-xs truncate flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400 flex-shrink-0 mt-0.5" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-zinc-900 font-mono">
                      {c.totalOrders || 0}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-zinc-900">
                      {formatCurrency(c.totalSpent || 0)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-zinc-500 font-mono text-[11px]">
                      {formatDate(c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Customer Profile"
        subtitle="Record contact and delivery details for Facebook/IG buyers"
        maxWidth="md"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Kenneth Ramos"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. +63 920 000 0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Platform</label>
              <select
                value={formData.socialPlatform}
                onChange={(e) =>
                  setFormData({ ...formData, socialPlatform: e.target.value as CustomerSocialPlatform })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="direct">Direct</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Profile / Handle</label>
            <input
              type="text"
              placeholder="@username or FB profile link"
              value={formData.socialHandle}
              onChange={(e) => setFormData({ ...formData, socialHandle: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Complete Delivery Address *
            </label>
            <textarea
              required
              rows={2}
              placeholder="House/Unit #, Street, Barangay, City, Province, Postal Code"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
