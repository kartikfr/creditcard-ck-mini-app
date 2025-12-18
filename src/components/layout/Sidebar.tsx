import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, AlertCircle, Tag, User, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/deals', label: 'Deals', icon: Tag },
  { path: '/earnings', label: 'My Earnings', icon: TrendingUp },
  { path: '/missing-cashback', label: 'Missing Cashback', icon: AlertCircle },
  { path: '/profile', label: 'Profile', icon: User },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout, user, isAuthenticated } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-card border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-glow">
          <CreditCard className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-display font-bold leading-tight text-foreground">
            Credit Card Cashback
          </h1>
          <p className="text-[9px] text-muted-foreground whitespace-nowrap">Powered by CashKaro</p>
        </div>
      </div>

      {/* User Info */}
      {isAuthenticated && user && (
        <div className="px-6 py-4 border-b border-border bg-secondary/30">
          <p className="text-sm font-medium text-foreground">Welcome back,</p>
          <p className="text-primary font-semibold">{user.firstName || 'User'}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      {isAuthenticated && (
        <div className="px-4 py-4 border-t border-border">
          <button
            onClick={logout}
            className="nav-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
