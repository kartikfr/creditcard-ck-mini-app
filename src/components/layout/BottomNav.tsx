import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, AlertCircle, Tag } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/deals', label: 'Deals', icon: Tag },
  { path: '/earnings', label: 'Earnings', icon: TrendingUp },
  { path: '/missing-cashback', label: 'Claims', icon: AlertCircle },
];

const BottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 lg:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

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
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
