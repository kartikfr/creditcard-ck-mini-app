import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings2,
  Wallet,
  CreditCard,
  Clock,
  AlertCircle,
  MessageSquare,
  HelpCircle,
  Star,
  Shield,
  Users,
  Gift,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const accountItems: SidebarItem[] = [
  { icon: Settings2, label: 'Account Settings', path: '/account-settings' },
  { icon: Wallet, label: 'My Earnings', path: '/earnings' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: Clock, label: 'Payments History', path: '/payment-history' },
  { icon: AlertCircle, label: 'Missing Cashback', path: '/missing-cashback' },
  { icon: Gift, label: 'Refer & Earn', path: '/refer' },
  { icon: Users, label: 'My Referrals', path: '/my-referrals' },
];

const supportItems: SidebarItem[] = [
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
          'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className={cn('w-5 h-5', active ? 'text-primary' : 'text-muted-foreground')} />
        <span className="flex-1">{item.label}</span>
      </button>
    );
  };

  return (
    <aside className={cn('w-64 shrink-0 hidden lg:block', className)}>
      <div className="sticky top-24 bg-card border border-border rounded-xl p-4 space-y-1">
        {/* Account Items */}
        {accountItems.map(renderItem)}
        
        <div className="h-px bg-border my-3" />
        
        {/* Support Items */}
        {supportItems.map(renderItem)}
        
        <div className="h-px bg-border my-3" />
        
        {/* Write us a review CTA */}
        <button
          onClick={() => navigate('/review-us')}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          <span>Write us a review</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
