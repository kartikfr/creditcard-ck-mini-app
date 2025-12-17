import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet, HelpCircle, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchEarnings } from '@/lib/api';
import { Input } from '@/components/ui/input';

const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
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
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for any brand or product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 rounded-full bg-secondary/50 border-0"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Wallet Balance - Clickable */}
            <button
              onClick={() => navigate('/earnings')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                ₹{totalEarnings.toLocaleString()}
              </span>
            </button>
            
            {/* Help - Desktop only */}
            <button
              onClick={() => navigate('/help')}
              className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Help</span>
            </button>

            {/* Profile - Desktop only */}
            <button
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
