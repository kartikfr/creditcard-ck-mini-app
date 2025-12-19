import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tag, Wallet, User, MessageSquare, IndianRupee, Sparkles } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import { useAuth } from '@/context/AuthContext';
import { fetchEarnings } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, isAuthenticated } = useAuth();
  const [totalEarned, setTotalEarned] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      loadEarnings();
    }
  }, [isAuthenticated, accessToken]);

  const loadEarnings = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const earningsRes = await fetchEarnings(accessToken);
      const earningsAttrs = earningsRes?.data?.attributes ?? earningsRes?.data?.[0]?.attributes;
      const cashback = parseFloat(earningsAttrs?.confirmed_cashback?.replace(/,/g, '') || '0');
      const rewards = parseFloat(earningsAttrs?.confirmed_rewards?.replace(/,/g, '') || '0');
      setTotalEarned(cashback + rewards);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const desktopNavItems = [
    { path: '/deals', label: 'Deals', icon: Tag },
    { path: '/earnings', label: 'Earning', icon: Wallet },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo - All devices */}
          <button onClick={() => navigate('/')} className="flex-shrink-0 flex items-center gap-2.5">
            {/* Custom Logo Design */}
            <div className="relative w-9 h-9 lg:w-10 lg:h-10">
              {/* Background with gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80 rounded-xl shadow-md" />
              {/* Rupee symbol with sparkle */}
              <div className="absolute inset-0 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" strokeWidth={2.5} />
              </div>
              {/* Sparkle accent */}
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 lg:w-3.5 lg:h-3.5 bg-accent rounded-full flex items-center justify-center shadow-sm">
                <Sparkles className="w-2 h-2 lg:w-2.5 lg:h-2.5 text-accent-foreground" />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-display font-bold text-xs lg:text-sm text-foreground leading-tight">Credit Card Cashback</span>
              <span className="text-[8px] lg:text-[9px] text-muted-foreground">Powered by CashKaro</span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Earnings Display - Desktop only */}
            {isAuthenticated && (
              <button
                onClick={() => navigate('/earnings')}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-sm font-semibold text-foreground">
                    ₹{totalEarned !== null ? totalEarned.toFixed(1) : '0.0'}
                  </span>
                )}
              </button>
            )}

            {/* Help Button - Mobile only */}
            <button
              onClick={() => navigate('/help')}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Help</span>
            </button>

            {/* Profile - Desktop with dropdown */}
            <ProfileDropdown>
              <button
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Profile</span>
              </button>
            </ProfileDropdown>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
