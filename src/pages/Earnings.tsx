// Earnings Page - My Earnings dashboard
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Info, Wallet, CreditCard, Building2, Clock, CheckCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { fetchEarnings } from '@/lib/api';

// Mock payment history
const mockPaymentHistory = [
  { id: 1, month: 'December', year: 2024, amount: 1500, status: 'completed', date: '2024-12-01' },
  { id: 2, month: 'November', year: 2024, amount: 2000, status: 'completed', date: '2024-11-15' },
  { id: 3, month: 'October', year: 2024, amount: 1250, status: 'completed', date: '2024-10-20' },
];

type PaymentMethod = 'upi' | 'bank' | null;
type PaymentStep = 'method' | 'details' | 'otp' | 'confirm';

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
  const { toast } = useToast();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();

  // Earnings API state
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      if (!accessToken) return;
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

  // Payment sheet state
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

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

  const paymentThreshold = parseMoney(earnings?.payment_threshold) || 250;
  const availableBalance = confirmedCashback + confirmedRewards + confirmedReferrals;

  // Payment handlers
  const handleOpenPayment = () => {
    setIsPaymentSheetOpen(true);
    setPaymentStep('method');
    setShowPaymentHistory(false);
    resetPaymentForm();
  };

  const resetPaymentForm = () => {
    setSelectedMethod(null);
    setAmount('');
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolder('');
    setOtp('');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentStep('details');
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setPaymentStep('otp');
    setCountdown(30);
    
    toast({
      title: 'OTP Sent',
      description: `OTP sent to +91 ${user?.mobileNumber}`,
    });

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyAndPay = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    
    toast({
      title: 'Payment Request Submitted!',
      description: `₹${amount} will be transferred within 24-48 hours`,
    });

    setIsPaymentSheetOpen(false);
    resetPaymentForm();
    setPaymentStep('method');
  };

  const handlePaymentBack = () => {
    if (paymentStep === 'details') {
      setPaymentStep('method');
      setSelectedMethod(null);
    } else if (paymentStep === 'otp') {
      setPaymentStep('details');
    }
  };

  const isDetailsValid = () => {
    const amountNum = parseFloat(amount);
    if (!amount || amountNum < paymentThreshold || amountNum > availableBalance) return false;
    
    if (selectedMethod === 'upi') {
      return upiId.includes('@');
    } else if (selectedMethod === 'bank') {
      return accountNumber.length >= 9 && ifscCode.length === 11 && accountHolder.length > 2;
    }
    return false;
  };

  const formatMoney = (value: number) => {
    return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
  };

  if (isLoadingEarnings) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">My Earnings</span>
        </nav>

        {/* Main Earnings Card */}
        <div className="card-elevated p-6 mb-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-1">All Time Earnings</h1>
            <p className="text-sm text-muted-foreground">
              Your Total Earnings amount includes your Cashback + Rewards + Referral amount.
            </p>
          </div>

          {/* Total Amount */}
          <div className="mb-2">
            <p className="text-4xl lg:text-5xl font-bold text-primary">
              {formatMoney(totalEarned)}
            </p>
          </div>

          <p className="text-xs text-muted-foreground mb-8">
            *Earnings will show here within 72 hours of your shopping via CashKaro app
          </p>

          {/* 3-Column Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Cashback */}
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Cashback</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(cashbackTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(confirmedCashback)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/30">
                    ● Confirmed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Available for payment</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(pendingCashback)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning border border-warning/30">
                    ● Pending
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidCashback)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    ● Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Rewards</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(rewardsTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(confirmedRewards)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/30">
                    ● Confirmed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Available for payment</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(pendingRewards)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning border border-warning/30">
                    ● Pending
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidRewards)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    ● Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Referrals */}
            <div className="border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-muted-foreground">Referrals</p>
                  <p className="text-xl font-bold text-foreground">{formatMoney(referralsTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(confirmedReferrals)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success border border-success/30">
                    ● Confirmed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Available for payment</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(pendingReferrals)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning border border-warning/30">
                    ● Pending
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidReferrals)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    ● Paid
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Payment Button */}
          <Button onClick={handleOpenPayment} className="w-full max-w-md mx-auto block">
            Request Payment
          </Button>
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

      {/* Payment Sheet */}
      <Sheet open={isPaymentSheetOpen} onOpenChange={setIsPaymentSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Request Payment
            </SheetTitle>
            <SheetDescription>
              Request payouts and view payment history
            </SheetDescription>
          </SheetHeader>

          {/* Balance Card */}
          <div className="p-4 mb-6 bg-gradient-primary text-primary-foreground rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Available Balance</p>
                <p className="text-3xl font-bold">₹{availableBalance.toFixed(2)}</p>
                <p className="text-sm text-primary-foreground/70 mt-1">
                  Minimum payout: ₹{paymentThreshold}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Toggle between Request and History */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={!showPaymentHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPaymentHistory(false)}
              className="flex-1"
            >
              Request Payment
            </Button>
            <Button
              variant={showPaymentHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowPaymentHistory(true)}
              className="flex-1"
            >
              Payment History
            </Button>
          </div>

          {showPaymentHistory ? (
            // Payment History
            <div className="space-y-3">
              {mockPaymentHistory.length === 0 ? (
                <div className="p-8 text-center border rounded-lg">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history yet</p>
                </div>
              ) : (
                mockPaymentHistory.map((payment) => (
                  <div key={payment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {payment.month} {payment.year}
                          </p>
                          <p className="text-sm text-muted-foreground">{payment.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-success">₹{payment.amount}</p>
                        <p className="text-xs text-success">Completed</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Payment Request Flow
            <>
              {/* Step 1: Select Payment Method */}
              {paymentStep === 'method' && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Select Payment Method</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleMethodSelect('upi')}
                      className="w-full p-4 border rounded-lg text-left hover:border-primary transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">UPI</p>
                          <p className="text-sm text-muted-foreground">Instant transfer to your UPI ID</p>
                          <p className="text-xs text-primary mt-1">Min: ₹250 | Processing: 24-48 hrs</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>

                    <button
                      onClick={() => handleMethodSelect('bank')}
                      className="w-full p-4 border rounded-lg text-left hover:border-primary transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Bank Transfer</p>
                          <p className="text-sm text-muted-foreground">Direct transfer to bank account</p>
                          <p className="text-xs text-primary mt-1">Min: ₹500 | Processing: 3-5 days</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Enter Details */}
              {paymentStep === 'details' && (
                <div className="space-y-4">
                  <button
                    onClick={handlePaymentBack}
                    className="text-primary text-sm flex items-center hover:underline"
                  >
                    ← Back to methods
                  </button>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      {selectedMethod === 'upi' ? (
                        <CreditCard className="w-5 h-5 text-primary" />
                      ) : (
                        <Building2 className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedMethod === 'upi' ? 'UPI Payment' : 'Bank Transfer'}
                      </p>
                      <p className="text-sm text-muted-foreground">Enter your payment details</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4" />
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-11 pl-8"
                          max={availableBalance}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: ₹{availableBalance.toFixed(2)}
                      </p>
                    </div>

                    {selectedMethod === 'upi' ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">UPI ID</label>
                        <Input
                          type="text"
                          placeholder="yourname@paytm"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Account Holder Name</label>
                          <Input
                            type="text"
                            placeholder="As per bank records"
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Account Number</label>
                          <Input
                            type="text"
                            placeholder="Enter account number"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                            className="h-11"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">IFSC Code</label>
                          <Input
                            type="text"
                            placeholder="e.g., HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase().slice(0, 11))}
                            className="h-11"
                          />
                        </div>
                      </>
                    )}

                    <Button
                      onClick={handleSendOTP}
                      disabled={!isDetailsValid() || isLoading}
                      className="w-full h-11"
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Send OTP to Verify'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Verify OTP */}
              {paymentStep === 'otp' && (
                <div className="space-y-4">
                  <button
                    onClick={handlePaymentBack}
                    className="text-primary text-sm flex items-center hover:underline"
                  >
                    ← Back
                  </button>

                  <div className="text-center">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-7 h-7 text-primary" />
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-2">Verify OTP</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the OTP sent to +91 {user?.mobileNumber}
                    </p>

                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-11 text-center text-xl tracking-[0.5em] font-mono mb-4"
                    />

                    <div className="mb-4">
                      <button
                        onClick={handleSendOTP}
                        disabled={countdown > 0}
                        className={`text-sm ${countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}`}
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                      </button>
                    </div>

                    <div className="bg-secondary/50 rounded-lg p-4 mb-4 text-left">
                      <p className="text-sm font-medium text-foreground mb-2">Payment Summary</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-medium">₹{amount}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-medium">
                          {selectedMethod === 'upi' ? `UPI (${upiId})` : 'Bank Transfer'}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={handleVerifyAndPay}
                      disabled={otp.length !== 6 || isLoading}
                      className="w-full h-11"
                    >
                      {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Submit Request'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default Earnings;
