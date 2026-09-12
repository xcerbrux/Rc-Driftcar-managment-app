import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Wallet,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { Sale, Expense } from '../../types';
import { subscribeSales, subscribeExpenses } from '../../services/firestoreService';
import { formatCurrency } from '../../utils/formatters';

export function FinanceView() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const unsubSales = subscribeSales(setSales);
    const unsubExpenses = subscribeExpenses(setExpenses);
    return () => {
      unsubSales();
      unsubExpenses();
    };
  }, []);

  // Split active sales vs cancelled sales to guarantee strict financial reconciliation
  const activeSales = sales.filter((s) => s.deliveryStatus !== 'cancelled');
  const cancelledSales = sales.filter((s) => s.deliveryStatus === 'cancelled');

  const grossSales = activeSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const costOfGoods = activeSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const grossProfit = grossSales - costOfGoods;
  const totalOperatingExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netProfit = grossProfit - totalOperatingExpenses;
  const marginPct = grossSales > 0 ? Math.round((netProfit / grossSales) * 100) : 0;

  // Cancelled metrics tracking
  const cancelledRevenue = cancelledSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const cancelledCOGS = cancelledSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);

  // COD tracking (Active sales only)
  const pendingCod = activeSales
    .filter((s) => s.paymentMethod === 'cod' && s.paymentStatus === 'pending')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const collectedCod = activeSales
    .filter((s) => s.paymentMethod === 'cod' && s.paymentStatus === 'paid')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  const prepaidSales = activeSales
    .filter((s) => s.paymentMethod !== 'cod')
    .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* High-level summary banner */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Net Business Profit
            </span>
            <div className={`text-3xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-zinc-900' : 'text-rose-600'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Net profit margin: <strong className="text-zinc-900">{marginPct}%</strong> after wholesale product COGS and operational expenditures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
              <span className="text-zinc-500">Gross Sales:</span>
              <p className="font-bold text-zinc-900 font-mono text-sm">{formatCurrency(grossSales)}</p>
            </div>
            <div className="px-4 py-2 bg-zinc-50 rounded-lg border border-zinc-200 text-xs">
              <span className="text-zinc-500">Gross Margin:</span>
              <p className="font-bold text-emerald-600 font-mono text-sm">
                {grossSales > 0 ? Math.round((grossProfit / grossSales) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancelled Orders Reversal Banner if any orders are cancelled */}
      {cancelledSales.length > 0 && (
        <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 mt-0.5 sm:mt-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-rose-950">
                  {cancelledSales.length} Cancelled Order{cancelledSales.length > 1 ? 's' : ''} Automatically Reversed
                </span>
                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-semibold rounded">
                  Synchronized
                </span>
              </div>
              <p className="text-rose-700 mt-0.5">
                <strong className="font-mono font-bold text-rose-900">{formatCurrency(cancelledRevenue)}</strong> reversed from revenue,{' '}
                <strong className="font-mono font-bold text-rose-900">{formatCurrency(cancelledCOGS)}</strong> restored to inventory stock. Cancelled orders have zero impact on active net profit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-800 font-medium shrink-0 bg-white/80 px-2.5 py-1 rounded-md border border-rose-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stock & ledger synced</span>
          </div>
        </div>
      )}

      {/* P&L Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Gross Revenue</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-2 font-mono">{formatCurrency(grossSales)}</div>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            {activeSales.length} active sales {cancelledSales.length > 0 && `(${cancelledSales.length} cancelled excluded)`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Product Costs (COGS)</span>
            <ArrowDownRight className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-700 mt-2 font-mono">-{formatCurrency(costOfGoods)}</div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Wholesale cost of delivered/active items</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Gross Product Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600 mt-2 font-mono">+{formatCurrency(grossProfit)}</div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Revenue minus product costs</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Operating Expenses</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600 mt-2 font-mono">-{formatCurrency(totalOperatingExpenses)}</div>
          <p className="text-[11px] text-zinc-400 mt-0.5">Boxes, tape, courier subsidies</p>
        </div>
      </div>

      {/* COD & Payment Reconciliation */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-semibold text-zinc-900 mb-1">Cash on Delivery (COD) & Inflow Breakdown</h3>
        <p className="text-xs text-zinc-500 mb-4">
          Tracking remittance from couriers for orders sent via Cash on Delivery
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-900">Pending COD In Transit</span>
              <Truck className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-bold text-amber-900 font-mono mt-2">
              {formatCurrency(pendingCod)}
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">With courier / awaiting cash remittance</p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-900">Remitted COD Payments</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-emerald-900 font-mono mt-2">
              {formatCurrency(collectedCod)}
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">Cash collected and verified</p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700">Prepaid & Direct Payments</span>
              <DollarSign className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="text-xl font-bold text-zinc-900 font-mono mt-2">
              {formatCurrency(prepaidSales)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Bank transfers & digital wallets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
