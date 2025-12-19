import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Wallet,
  CreditCard,
  Clock,
  AlertCircle,
  MessageSquare,
  HelpCircle,
  Star,
  Shield,
  LogOut,
  Loader2
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProfile, fetchEarnings, logoutUser } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';

interface ProfileData {
  id: string | number;
  type: string;
  attributes: {
    fullname?: string;
    email?: string;
    mobile_number?: string;
    enabled_newsletter?: string;
    enabled_referral_earnings_notification?: string;
  };
}

interface EarningsData {
  confirmed_cashback: string;
  confirmed_rewards: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (accessToken && isAuthenticated) {
      loadData();
    }
  }, [accessToken, isAuthenticated]);

  const loadData = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    
    try {
      const [profileRes, earningsRes] = await Promise.all([
        fetchProfile(accessToken),
        fetchEarnings(accessToken)
      ]);
      
      const profileArray = profileRes?.data;
      const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
      setProfileData(profile || null);
      
      const earningsAttrs = earningsRes?.data?.attributes ?? earningsRes?.data?.[0]?.attributes;
      setEarnings(earningsAttrs);
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!accessToken) {
      logout();
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
    } catch (err: any) {
      console.error('Logout error:', err);
      logout();
      toast({
        title: 'Logged Out',
        description: 'Session ended',
      });
    } finally {
      setIsLoggingOut(false);
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

  const attrs = profileData?.attributes;
  const displayName = attrs?.fullname || user?.firstName || 'User';

  const cashbackRewardsItems = [
    { icon: Wallet, label: 'My Earnings', path: '/earnings' },
    { icon: CreditCard, label: 'Payments', path: '/payments' },
    { icon: Clock, label: 'Payments History', path: '/orders' },
    { icon: AlertCircle, label: 'Missing Cashback', path: '/missing-cashback' },
    { icon: MessageSquare, label: 'Your Queries', path: '/help' },
  ];

  const supportItems = [
    { icon: HelpCircle, label: 'Help', path: '/help' },
    { icon: Star, label: 'Review Us', path: '/feedback' },
    { icon: Shield, label: 'Privacy Policy', path: '/privacy-policy' },
  ];

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="View Your Profile"
          description="Login to view and manage your profile, settings, and more"
          icon={User}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Back Button & Title */}
        <div className="flex items-center gap-3 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="shrink-0 h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Profile</h1>
        </div>

        {/* Greeting & Earnings */}
        <div className="mb-6">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-7 w-40 mb-4" />
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Hello,</p>
              <p className="text-xl font-bold text-foreground">{displayName}</p>
            </>
          )}

          {/* Cashback & Rewards Cards */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => navigate('/earnings')}
              className="flex-1 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
            >
              <p className="text-xs text-muted-foreground mb-1">Total Cashback</p>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-lg font-bold text-foreground">₹{confirmedCashback.toFixed(1)}</p>
              )}
            </button>
            <button
              onClick={() => navigate('/earnings')}
              className="flex-1 p-4 rounded-xl bg-secondary/50 border border-border hover:bg-secondary transition-colors text-left"
            >
              <p className="text-xs text-muted-foreground mb-1">Total Rewards</p>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-lg font-bold text-foreground">₹{confirmedRewards.toFixed(1)}</p>
              )}
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-secondary/50 transition-colors mb-4"
        >
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium text-foreground">Account Settings</span>
        </button>

        <div className="h-px bg-border my-4" />

        {/* Cashback & Rewards Section */}
        <div className="mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Cashback & Rewards
          </p>
          <div className="space-y-1">
            {cashbackRewardsItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border my-4" />

        {/* Support & Feedback Section */}
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Support & Feedback
          </p>
          <div className="space-y-1">
            {supportItems.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 p-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          {isLoggingOut ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogOut className="w-5 h-5" />
          )}
          <span className="font-medium">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
