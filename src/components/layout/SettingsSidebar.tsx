import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings2,
  Wallet,
  CreditCard,
  Clock,
  AlertCircle,
  HelpCircle,
  Star,
  Shield,
  ChevronRight,
  PenLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

// Main menu items matching the profile dropdown options
const menuItems: SidebarItem[] = [
  { icon: Settings2, label: 'Account Settings', path: '/account-settings' },
  { icon: Wallet, label: 'My Earnings', path: '/earnings' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Clock, label: 'Payments History', path: '/payment-history' },
  { icon: AlertCircle, label: 'Missing Cashback', path: '/missing-cashback' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
  { icon: Star, label: 'Review Us', path: '/review-us' },
  { icon: Shield, label: 'Privacy Policy', path: '/privacy' },
];

interface SettingsSidebarProps {
  className?: string;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ className }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const renderItem = (item: SidebarItem) => {
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-left relative overflow-hidden group',
          'transition-all duration-200 ease-out',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        {/* Active indicator bar with smooth transition */}
        <span 
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary',
            'transition-all duration-250 ease-out',
            active 
              ? 'h-6 opacity-100' 
              : 'h-0 opacity-0 group-hover:h-3 group-hover:opacity-50'
          )}
          style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <item.icon 
          className={cn(
            'w-5 h-5 transition-colors duration-200', 
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )} 
        />
        <span className="flex-1 transition-colors duration-200">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className={cn('w-64 shrink-0 hidden lg:block', className)}>
      <div className="sticky top-24 bg-card border border-border rounded-xl p-4 space-y-1">
        {/* Menu Items */}
        {menuItems.map(renderItem)}
        
        <div className="h-px bg-border my-3" />
        
        {/* Write us a review CTA */}
        <button
          onClick={() => navigate('/review-us')}
          className={cn(
            'w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground rounded-lg',
            'transition-all duration-200 ease-out hover:bg-muted group'
          )}
        >
          <div className="flex items-center gap-3">
            <PenLine className="w-5 h-5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
            <span>Write us a review</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
