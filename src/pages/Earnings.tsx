// Earnings Page - My Earnings dashboard
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Info, Wallet, Clock, CheckCircle, Gift, Banknote, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useIsMobile } from '@/hooks/use-mobile';
import LoginPrompt from '@/components/LoginPrompt';
import { fetchEarnings } from '@/lib/api';

type BreakdownType = 'cashback' | 'rewards' | 'referrals' | null;

interface EarningsData {
  total_earned: string;
  total_cashback_earned: string;
  total_rewards_earned: string;
  total_referral_earned: string;
  confirmed_cashback: string;
  pending_cashback: string;
  paid_cashback: string;
  confirmed_rewards: string;
  pending_rewards: string;
  paid_rewards: string;
  confirmed_referrals: string;
  pending_referrals: string;
  paid_referrals: string;
  payment_threshold: string;
  currency: string;
}

const Earnings: React.FC = () => {
  const { accessToken, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Use SettingsPageLayout for desktop, AppLayout for mobile
  const Layout = isMobile ? AppLayout : SettingsPageLayout;

  // Earnings API state
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  // Breakdown sheet state
  const [breakdownType, setBreakdownType] = useState<BreakdownType>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!accessToken) {
        setIsLoadingEarnings(false);
        setEarnings(null);
        setEarningsError(null);
        return;
      }

      setIsLoadingEarnings(true);
      setEarningsError(null);
      try {
        const res = await fetchEarnings(accessToken);
        const attrs = res?.data?.attributes ?? res?.data?.[0]?.attributes;
        setEarnings(attrs);
      } catch (e: any) {
        setEarningsError(String(e?.message || 'Failed to load earnings'));
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    loadEarnings();
  }, [accessToken]);

  const parseMoney = (v: any): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/,/g, ''));
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const totalEarned = parseMoney(earnings?.total_earned);
  const cashbackTotal = parseMoney(earnings?.total_cashback_earned);
  const rewardsTotal = parseMoney(earnings?.total_rewards_earned);
  const referralsTotal = parseMoney(earnings?.total_referral_earned);
  
  const confirmedCashback = parseMoney(earnings?.confirmed_cashback);
  const pendingCashback = parseMoney(earnings?.pending_cashback);
  const paidCashback = parseMoney(earnings?.paid_cashback);
  
  const confirmedRewards = parseMoney(earnings?.confirmed_rewards);
  const pendingRewards = parseMoney(earnings?.pending_rewards);
  const paidRewards = parseMoney(earnings?.paid_rewards);
  
  const confirmedReferrals = parseMoney(earnings?.confirmed_referrals);
  const pendingReferrals = parseMoney(earnings?.pending_referrals);
  const paidReferrals = parseMoney(earnings?.paid_referrals);

  // Get breakdown data based on type
  const getBreakdownData = (type: BreakdownType) => {
    switch (type) {
      case 'cashback':
        return {
          title: 'Cashback Break Up',
          total: cashbackTotal,
          confirmed: confirmedCashback,
          pending: pendingCashback,
          paid: paidCashback,
          icon: Banknote,
          color: 'primary',
          description: 'Your confirmed cashback is available for payment. It will be transferred to your preferred payment method within 24-48 hours of request.',
        };
      case 'rewards':
        return {
          title: 'Rewards Break Up',
          total: rewardsTotal,
          confirmed: confirmedRewards,
          pending: pendingRewards,
          paid: paidRewards,
          icon: Gift,
          color: 'amber-500',
          description: 'Your confirmed rewards can be redeemed as Amazon Pay Balance or Flipkart Gift Card.',
        };
      case 'referrals':
        return {
          title: 'Referrals Break Up',
          total: referralsTotal,
          confirmed: confirmedReferrals,
          pending: pendingReferrals,
          paid: paidReferrals,
          icon: Wallet,
          color: 'success',
          description: 'Referral earnings from friends who joined using your referral code.',
        };
      default:
        return null;
    }
  };

  // Handle breakdown open
  const handleOpenBreakdown = (type: BreakdownType) => {
    setBreakdownType(type);
    setIsBreakdownOpen(true);
  };

  // Navigate to payments page for both mobile and desktop
  const handleOpenPayment = () => {
    navigate('/payments');
  };

  const formatMoney = (value: number) => {
    return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  };

  // Show loading while auth is being determined
  if (isAuthLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="View Your Earnings"
          description="Login to see your cashback, rewards, and request payments"
          icon={Wallet}
        />
      </AppLayout>
    );
  }

  if (isLoadingEarnings) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  // Get breakdown data for the sheet
  const breakdownData = getBreakdownData(breakdownType);

  return (
    <Layout>
      <div className="w-full max-w-4xl lg:max-w-none">
        {/* Back Button & Breadcrumb */}
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-8 w-8 md:h-10 md:w-10">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <nav className="text-xs md:text-sm text-muted-foreground">
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
            <span className="mx-1 md:mx-2">/</span>
            <span className="text-foreground font-medium">My Earnings</span>
          </nav>
        </div>

        {/* Main Earnings Card */}
        <div className="card-elevated p-4 md:p-6 mb-4 md:mb-6">
          {/* Header */}
          <h1 className="text-base md:text-lg font-bold text-foreground mb-1">All Time Earnings</h1>
          <p className="text-xs md:text-sm text-muted-foreground mb-2">
            Your Total Earnings amount includes your Cashback + Rewards + Referral amount.
          </p>

          {/* Total Amount - Large & Primary */}
          <div className="mb-2">
            <p className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary">
              {formatMoney(totalEarned)}
            </p>
          </div>

          <p className="text-[10px] md:text-xs text-muted-foreground mb-6">
            *Earnings will show here within 72 hours of your shopping via CashKaro app
          </p>

          {/* Mobile: Simple 3 Columns */}
          <div className="grid grid-cols-3 gap-2 mb-6 lg:hidden">
            {/* Cashback */}
            <button
              onClick={() => handleOpenBreakdown('cashback')}
              className="p-3 border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Cashback</span>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold text-foreground">{formatMoney(cashbackTotal)}</p>
            </button>

            {/* Rewards */}
            <button
              onClick={() => handleOpenBreakdown('rewards')}
              className="p-3 border rounded-xl hover:border-amber-500 hover:bg-amber-500/5 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Rewards</span>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold text-foreground">{formatMoney(rewardsTotal)}</p>
            </button>

            {/* Referrals */}
            <button
              onClick={() => handleOpenBreakdown('referrals')}
              className="p-3 border rounded-xl hover:border-success hover:bg-success/5 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Referrals</span>
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-lg font-bold text-foreground">{formatMoney(referralsTotal)}</p>
            </button>
          </div>

          {/* Desktop: Detailed 3 Columns with breakdown */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mb-6">
            {/* Cashback Card */}
            <div className="border rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">Cashback</span>
                  <button onClick={() => handleOpenBreakdown('cashback')} className="hover:opacity-70">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatMoney(cashbackTotal)}</p>
              </div>
              <div className="divide-y">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatMoney(confirmedCashback)}</p>
                    <p className="text-xs text-muted-foreground">Available for payment</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                    Confirmed
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(pendingCashback)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                    Pending
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(paidCashback)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Rewards Card */}
            <div className="border rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">Rewards</span>
                  <button onClick={() => handleOpenBreakdown('rewards')} className="hover:opacity-70">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatMoney(rewardsTotal)}</p>
              </div>
              <div className="divide-y">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatMoney(confirmedRewards)}</p>
                    <p className="text-xs text-muted-foreground">Available for payment</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                    Confirmed
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(pendingRewards)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                    Pending
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(paidRewards)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Referrals Card */}
            <div className="border rounded-xl overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">Referrals</span>
                  <button onClick={() => handleOpenBreakdown('referrals')} className="hover:opacity-70">
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatMoney(referralsTotal)}</p>
              </div>
              <div className="divide-y">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{formatMoney(confirmedReferrals)}</p>
                    <p className="text-xs text-muted-foreground">Available for payment</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                    Confirmed
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(pendingReferrals)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                    Pending
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{formatMoney(paidReferrals)}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Paid
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Payment Button - Centered on desktop */}
          <div className="lg:flex lg:justify-center">
            <Button onClick={handleOpenPayment} className="w-full lg:w-auto lg:px-16 h-12">
              Request Payment
            </Button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="card-elevated divide-y">
          <button
            onClick={() => navigate('/orders')}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <span className="font-medium text-foreground">My Order Details</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate('/missing-cashback')}
            className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <span className="font-medium text-foreground">Get Help</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Breakdown Bottom Sheet */}
      <Sheet open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          {breakdownData && (
            <div className="p-4 md:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">{breakdownData.title}</h2>
                <button 
                  onClick={() => setIsBreakdownOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Total Amount */}
              <div className="mb-6">
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {formatMoney(breakdownData.total)}
                </p>
              </div>

              {/* Status Breakdown */}
              <div className="space-y-3 mb-6">
                {/* Confirmed */}
                <div className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-success text-white">
                      Confirmed
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{formatMoney(breakdownData.confirmed)}</span>
                </div>

                {/* Pending */}
                <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning text-white">
                      Pending
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{formatMoney(breakdownData.pending)}</span>
                </div>

                {/* Paid */}
                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary text-white">
                      Paid
                    </span>
                  </div>
                  <span className="font-bold text-foreground">{formatMoney(breakdownData.paid)}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground mb-6">
                {breakdownData.description}
              </p>

              {/* Action Button */}
              <Button 
                onClick={() => setIsBreakdownOpen(false)} 
                className="w-full h-12"
              >
                Yes
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default Earnings;
