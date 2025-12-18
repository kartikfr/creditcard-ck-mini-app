import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Bell, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchEarnings } from '@/lib/api';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import avatarImage from '@/assets/avatar.png';

const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuth();
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!isAuthenticated || !accessToken) return;
      
      try {
        const response = await fetchEarnings(accessToken);
        const userData = Array.isArray(response?.data) ? response.data[0] : response?.data;
        if (userData?.attributes) {
          const total = parseFloat(userData.attributes.total_earned || userData.attributes.total_cashback_earned || '0');
          setTotalEarnings(total);
        }
      } catch (err) {
        console.error('[TopNav] Failed to load earnings:', err);
      }
    };

    loadEarnings();
  }, [isAuthenticated, accessToken]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border lg:left-64">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo - Mobile only */}
          <button onClick={() => navigate('/')} className="lg:hidden flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-md">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-display font-bold text-xs text-foreground leading-tight">Credit Card Cashback</span>
              <span className="text-[8px] text-muted-foreground">Powered by CashKaro</span>
            </div>
          </button>

          {/* Spacer for desktop */}
          <div className="hidden lg:block flex-1" />

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Wallet Balance - Clickable */}
            <button
              onClick={() => navigate('/earnings')}
              className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              <span className="text-xs md:text-sm font-medium text-foreground">
                ₹{totalEarnings.toLocaleString()}
              </span>
            </button>
            
            {/* Notifications - Desktop only */}
            <button
              onClick={() => navigate('/orders')}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Profile Avatar - Desktop only */}
            <button
              onClick={() => navigate('/profile')}
              className="relative group hidden md:block"
            >
              <Avatar className="w-9 h-9 md:w-10 md:h-10 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-105">
                <AvatarImage src={avatarImage} alt="Profile" className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-accent text-primary-foreground font-semibold text-sm">
                  U
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
