import React, { useState } from 'react';
import { NavSection } from '../../types';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { DashboardView } from '../dashboard/DashboardView';
import { ProductsView } from '../products/ProductsView';
import { InventoryView } from '../inventory/InventoryView';
import { SalesView } from '../sales/SalesView';
import { CustomersView } from '../customers/CustomersView';
import { ExpensesView } from '../expenses/ExpensesView';
import { FinanceView } from '../finance/FinanceView';
import { ReportsView } from '../reports/ReportsView';
import { SettingsView } from '../settings/SettingsView';

export function AppShell() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cross-view action triggers
  const [openSaleModal, setOpenSaleModal] = useState(false);
  const [openExpenseModal, setOpenExpenseModal] = useState(false);

  const handleQuickAction = (action: 'new_sale' | 'new_product' | 'new_expense') => {
    if (action === 'new_sale') {
      setCurrentSection('sales');
      setOpenSaleModal(true);
    } else if (action === 'new_product') {
      setCurrentSection('products');
    } else if (action === 'new_expense') {
      setCurrentSection('expenses');
      setOpenExpenseModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          currentSection={currentSection}
          onOpenMobile={() => setMobileOpen(true)}
          onQuickAction={handleQuickAction}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentSection === 'dashboard' && (
            <DashboardView
              onNavigate={setCurrentSection}
              onOpenAction={handleQuickAction}
            />
          )}
          {currentSection === 'products' && <ProductsView />}
          {currentSection === 'inventory' && <InventoryView />}
          {currentSection === 'sales' && (
            <SalesView
              isAddModalOpenFromParent={openSaleModal}
              onCloseAddModal={() => setOpenSaleModal(false)}
            />
          )}
          {currentSection === 'customers' && <CustomersView />}
          {currentSection === 'expenses' && (
            <ExpensesView
              isAddModalOpenFromParent={openExpenseModal}
              onCloseAddModal={() => setOpenExpenseModal(false)}
            />
          )}
          {currentSection === 'finance' && <FinanceView />}
          {currentSection === 'reports' && <ReportsView />}
          {currentSection === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
}
