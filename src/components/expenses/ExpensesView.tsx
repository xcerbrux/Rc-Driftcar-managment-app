import React, { useState, useEffect } from 'react';
import { Plus, Search, Receipt, Filter, Trash2 } from 'lucide-react';
import { Expense, ExpenseCategory } from '../../types';
import { subscribeExpenses } from '../../services/firestoreService';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { logAuditEvent } from '../../services/auditService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Modal } from '../common/Modal';
import { useNotification } from '../../context/NotificationContext';

const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: 'packaging', label: 'Packaging Materials (Boxes, Tape, Bubble Wrap)' },
  { value: 'shipping_subsidy', label: 'Courier & Delivery Subsidies' },
  { value: 'tools_maintenance', label: 'Drift Car Tools & Maintenance' },
  { value: 'equipment', label: 'Shop Equipment / Test Track' },
  { value: 'marketing_ads', label: 'Social Media & Marketing' },
  { value: 'supplies', label: 'Office & Warehouse Supplies' },
  { value: 'utilities', label: 'Electricity & Internet' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

export function ExpensesView({ isAddModalOpenFromParent, onCloseAddModal }: { isAddModalOpenFromParent?: boolean; onCloseAddModal?: () => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useNotification();

  useEffect(() => {
    if (isAddModalOpenFromParent) {
      setIsAddModalOpen(true);
    }
  }, [isAddModalOpenFromParent]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'packaging' as ExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as 'cash' | 'bank_transfer' | 'e_wallet' | 'credit_card',
    referenceNo: '',
    notes: '',
  });

  useEffect(() => {
    const unsub = subscribeExpenses(setExpenses);
    return () => unsub();
  }, []);

  const handleClose = () => {
    setIsAddModalOpen(false);
    if (onCloseAddModal) onCloseAddModal();
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (!formData.title || isNaN(amountNum) || amountNum <= 0) {
      showToast('Please provide a valid title and expense amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const payload: Omit<Expense, 'id'> = {
        title: formData.title.trim(),
        category: formData.category,
        amount: Math.round(amountNum * 100) / 100,
        expenseDate: formData.expenseDate,
        paymentMethod: formData.paymentMethod,
        referenceNo: formData.referenceNo.trim() || '',
        notes: formData.notes.trim() || '',
        createdBy: auth.currentUser?.uid || 'system',
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'expenses'), payload);

      await logAuditEvent({
        action: 'expense_created',
        entityType: 'expense',
        entityId: docRef.id,
        summary: `Logged expense: ${payload.title} - $${payload.amount} (${payload.category})`,
      });

      showToast(`Expense "${payload.title}" recorded.`, 'success');
      handleClose();
      setFormData({
        title: '',
        category: 'packaging',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        referenceNo: '',
        notes: '',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    if (!window.confirm(`Delete expense record "${exp.title}"?`)) return;
    try {
      await deleteDoc(doc(db, 'expenses', exp.id));
      await logAuditEvent({
        action: 'expense_updated',
        entityType: 'expense',
        entityId: exp.id,
        summary: `Deleted expense record: ${exp.title} ($${exp.amount})`,
      });
      showToast('Expense record removed.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${exp.id}`);
    }
  };

  const totalExpenseSum = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.referenceNo && e.referenceNo.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div>
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
            Total Operational Expenses
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-1">{formatCurrency(totalExpenseSum)}</div>
          <p className="text-xs text-zinc-500 mt-0.5">{expenses.length} operating expenditures logged</p>
        </div>

        <button
          id="open-log-expense-modal-btn"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors shadow-xs self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            id="expense-search-input"
            type="text"
            placeholder="Search expense description, receipt #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-zinc-300 bg-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs py-2 px-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-700 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
        >
          <option value="all">All Categories</option>
          {expenseCategories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">No expenses recorded</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
              Keep operating costs organized: log cardboard boxes, bubble wrap, tape, soldering tools, and courier subsidies here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3">Expense Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900">{exp.title}</div>
                      {exp.referenceNo && (
                        <div className="text-[11px] text-zinc-500 font-mono">Ref: {exp.referenceNo}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 capitalize font-medium text-zinc-700">
                      {exp.category.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-zinc-600 font-mono">{formatDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3.5 uppercase text-zinc-500 font-mono text-[11px]">
                      {exp.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleClose}
        title="Log Operating Expense"
        subtitle="Packaging, courier subsidies, maintenance, and supplies"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Expense Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 50x Corrugated Boxes for 1:10 Drift Cars"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            >
              {expenseCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="e_wallet">E-Wallet (GCash / Maya)</option>
                <option value="credit_card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Receipt / Ref #</label>
              <input
                type="text"
                placeholder="Optional receipt # / invoice"
                value={formData.referenceNo}
                onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Log Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
