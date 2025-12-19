import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings2,
  Wallet,
  CreditCard,
  Clock,
  HelpCircle,
  AlertCircle,
  MessageSquare,
  Star,
  Shield,
  LogOut,
  Loader2,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { fetchEarnings, fetchProfile, logoutUser } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface EarningsData {
  confirmed_cashback: string;
  confirmed_rewards: string;
}

interface ProfileData {
  attributes: {
    fullname?: string;
  };
}

interface ProfileDropdownProps {
  children: React.ReactNode;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ children }) => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    if (isOpen && accessToken && isAuthenticated) {
      loadData();
    }
  }, [isOpen, accessToken, isAuthenticated]);

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [earningsRes, profileRes] = await Promise.all([
        fetchEarnings(accessToken),
        fetchProfile(accessToken)
      ]);
      
      const earningsAttrs = earningsRes?.data?.attributes ?? earningsRes?.data?.[0]?.attributes;
      setEarnings(earningsAttrs);
      
      const profileArray = profileRes?.data;
      const profileData = Array.isArray(profileArray) ? profileArray[0] : profileArray;
      setProfile(profileData || null);
    } catch (err) {
      console.error('Failed to load dropdown data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    if (!accessToken) {
      logout();
      setShowLogoutDialog(false);
      return;
    }
    
    setIsLoggingOut(true);
    try {
      await logoutUser(accessToken);
      logout();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    } catch (err) {
      logout();
      toast({
        title: 'Logged Out',
        description: 'Session ended',
      });
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
      setShowLogoutDialog(false);
    }
  };

  const parseMoney = (v: any): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const confirmedCashback = parseMoney(earnings?.confirmed_cashback);
  const confirmedRewards = parseMoney(earnings?.confirmed_rewards);
  const displayName = profile?.attributes?.fullname || 'User';

  const cashbackRewardsItems = [
    { icon: Wallet, label: 'My Earnings', path: '/earnings' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: Clock, label: 'Payments History', path: '/orders' },
    { icon: AlertCircle, label: 'Missing Cashback', path: '/missing-cashback' },
    { icon: MessageSquare, label: 'Your Queries', path: '/your-queries' },
  ];

  const supportItems = [
    { icon: HelpCircle, label: 'Help', path: '/help' },
    { icon: Star, label: 'Review Us', path: '/review-us' },
    { icon: Shield, label: 'Privacy Policy', path: '/privacy' },
  ];

  if (!isAuthenticated) {
    return (
      <div onClick={() => navigate('/login')}>
        {children}
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden max-h-[80vh] overflow-y-auto bg-popover">
        {/* Header with greeting and earnings */}
        <div className="p-4 bg-background border-b border-border">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-6 w-32 mb-4" />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Hello,</p>
              <p className="font-semibold text-foreground text-lg">{displayName}</p>
            </>
          )}
          
          {/* Cashback & Rewards Cards */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setIsOpen(false); navigate('/earnings'); }}
              className="flex-1 p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Total Cashback</p>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <p className="font-bold text-foreground">₹{confirmedCashback.toFixed(1)}</p>
              )}
            </button>
            <button
              onClick={() => { setIsOpen(false); navigate('/earnings'); }}
              className="flex-1 p-3 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
            >
              <p className="text-xs text-muted-foreground mb-0.5">Total Rewards</p>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <p className="font-bold text-foreground">₹{confirmedRewards.toFixed(1)}</p>
              )}
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <DropdownMenuItem
          onClick={() => { setIsOpen(false); navigate('/account-settings'); }}
          className="px-4 py-3 cursor-pointer"
        >
          <Settings2 className="w-5 h-5 mr-3 text-muted-foreground" />
          <span>Account Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-0" />

        {/* Cashback & Rewards Section */}
        <div className="px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cashback & Rewards</p>
        </div>
        {cashbackRewardsItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => { setIsOpen(false); navigate(item.path); }}
            className="px-4 py-2.5 cursor-pointer"
          >
            <item.icon className="w-5 h-5 mr-3 text-muted-foreground" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-0" />

        {/* Support & Feedback Section */}
        <div className="px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Support & Feedback</p>
        </div>
        {supportItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() => { setIsOpen(false); navigate(item.path); }}
            className="px-4 py-2.5 cursor-pointer"
          >
            <item.icon className="w-5 h-5 mr-3 text-muted-foreground" />
            <span>{item.label}</span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator className="my-0" />

        {/* Logout */}
        <DropdownMenuItem
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          className="px-4 py-3 cursor-pointer text-destructive focus:text-destructive"
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5 mr-3" />
          )}
          <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to Logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to login again to access your account and earnings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogoutConfirm} disabled={isLoggingOut}>
              {isLoggingOut ? 'Logging out...' : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
