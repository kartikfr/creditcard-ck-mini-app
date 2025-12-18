import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, User, HelpCircle } from 'lucide-react';

const TopNav: React.FC = () => {
  const navigate = useNavigate();

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
            {/* Help - Mobile only */}
            <button
              onClick={() => navigate('/help')}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
            </button>

            {/* Profile - Desktop only (text + icon style) */}
            <button
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-secondary/50 transition-colors"
            >
              <User className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
