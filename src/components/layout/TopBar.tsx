import React from 'react';
import { Menu, Database, ShieldCheck } from 'lucide-react';
import { NavSection } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  currentSection: NavSection;
  onOpenMobile: () => void;
  onQuickAction?: (action: 'new_sale' | 'new_product' | 'new_expense') => void;
}

const sectionTitles: Record<NavSection, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Real-time overview of drift car sales, inventory & cash flow' },
  products: { title: 'Products Catalog', subtitle: 'RC chassis, electronics, bodies, wheels and spare parts' },
  inventory: { title: 'Inventory & Stock', subtitle: 'Live stock units, low-stock alerts, and valuation' },
  sales: { title: 'Sales & Orders', subtitle: 'Customer orders from Facebook/Instagram with COD & delivery tracking' },
  customers: { title: 'Customers Directory', subtitle: 'Buyer profiles, delivery addresses, and purchase history' },
  expenses: { title: 'Business Expenses', subtitle: 'Packaging supplies, courier subsidies, maintenance & operating costs' },
  finance: { title: 'Financial Summary', subtitle: 'Revenue, product cost of goods sold, expenses, and net profit' },
  reports: { title: 'Reports & History', subtitle: 'Historical order archives and business performance logs' },
  settings: { title: 'Settings & System', subtitle: 'Staff accounts, currency formatting, and Firestore audit trail' },
};

export function TopBar({ currentSection, onOpenMobile, onQuickAction }: TopBarProps) {
  const { dbConnected, userProfile } = useAuth();
  const info = sectionTitles[currentSection] || { title: 'RC Business Manager', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          id="mobile-menu-toggle"
          onClick={onOpenMobile}
          className="md:hidden p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-zinc-900 leading-none">{info.title}</h2>
          <p className="text-xs text-zinc-500 hidden sm:block mt-1">{info.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Firestore Connection Indicator */}
        <div
          id="firestore-status-badge"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-50 border border-zinc-200 text-zinc-700"
          title="Connected to Firebase Firestore"
        >
          <Database className="w-3.5 h-3.5 text-zinc-500" />
          <span className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-zinc-600">{dbConnected ? 'Firestore Active' : 'Connecting...'}</span>
        </div>

        {/* Staff Role Badge */}
        <div className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
          <span>{userProfile?.role === 'admin' ? 'Admin Access' : 'Staff'}</span>
        </div>

        {/* Quick Action Button */}
        {onQuickAction && (
          <button
            id="topbar-new-sale-btn"
            onClick={() => onQuickAction('new_sale')}
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 transition-colors shadow-xs"
          >
            + Record Sale
          </button>
        )}
      </div>
    </header>
  );
}
