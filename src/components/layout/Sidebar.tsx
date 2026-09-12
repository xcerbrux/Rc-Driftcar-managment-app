import React from 'react';
import {
  LayoutDashboard,
  Car,
  Boxes,
  ShoppingBag,
  Users,
  Receipt,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { NavSection } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Car },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'sales', label: 'Sales & Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'finance', label: 'Finance', icon: TrendingUp },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentSection, onSelectSection, mobileOpen, onCloseMobile }: SidebarProps) {
  const { userProfile, currentUser, logout } = useAuth();

  const handleNavClick = (section: NavSection) => {
    onSelectSection(section);
    onCloseMobile();
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-zinc-200 w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-zinc-900 leading-tight">RC Business</h1>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Manager</p>
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-md text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2">
          <p className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Management</p>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                isActive
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${
                    isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-zinc-200">
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-200">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-zinc-300"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center flex-shrink-0">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-zinc-900 truncate">
                {currentUser?.displayName || 'Staff User'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">
                {userProfile?.role === 'admin' ? 'Administrator' : 'Staff'}
              </p>
            </div>
          </div>
          <button
            id="logout-button"
            onClick={logout}
            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex flex-col flex-shrink-0 w-64 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl z-10">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
