import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Tag, Wallet, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchEarnings } from '@/lib/api';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/deals', label: 'Deals', icon: Tag },
  { path: '/earnings', label: 'Earnings', icon: Wallet, showEarnings: true },
  { path: '/profile', label: 'Profile', icon: User },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, accessToken } = useAuth();
  const [totalEarnings, setTotalEarnings] = useState<number | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!isAuthenticated || !accessToken) {
        setTotalEarnings(null);
        return;
      }
      
      try {
        const response = await fetchEarnings(accessToken);
        const userData = Array.isArray(response?.data) ? response.data[0] : response?.data;
        if (userData?.attributes) {
          const total = parseFloat(userData.attributes.total_earned || '0');
          setTotalEarnings(total);
        }
      } catch (err) {
        console.error('[BottomNav] Failed to load earnings:', err);
      }
    };

    loadEarnings();
  }, [isAuthenticated, accessToken]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const showEarningsAmount = item.showEarnings && isAuthenticated && totalEarnings !== null;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className={`relative ${isActive ? 'animate-scale-in' : ''}`}>
                {isActive && (
                  <div className="absolute -inset-2 bg-primary/10 rounded-full" />
                )}
                <Icon className="w-5 h-5 relative z-10" />
              </div>
              {showEarningsAmount ? (
                <span className="text-[10px] mt-1 font-medium text-primary">
                  ₹{totalEarnings.toLocaleString()}
                </span>
              ) : (
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
