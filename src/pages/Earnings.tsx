// Earnings Page - My Earnings dashboard
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Info, Wallet, CreditCard, Building2, Clock, CheckCircle, ShieldCheck, Gift, Smartphone, Mail, Banknote } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoginPrompt from '@/components/LoginPrompt';
import { 
  fetchEarnings, 
  sendPaymentRequestOTP, 
  verifyPaymentRequestOTP, 
  submitAmazonPayment, 
  submitFlipkartPayment, 
  submitUPIPayment, 
  submitBankPayment 
} from '@/lib/api';

// Mock payment history
const mockPaymentHistory = [
  { id: 1, month: 'December', year: 2024, amount: 1500, status: 'completed', date: '2024-12-01' },
  { id: 2, month: 'November', year: 2024, amount: 2000, status: 'completed', date: '2024-11-15' },
  { id: 3, month: 'October', year: 2024, amount: 1250, status: 'completed', date: '2024-10-20' },
];

type PaymentMethod = 'amazon' | 'flipkart' | 'upi' | 'bank' | null;
type PaymentStep = 'wallet' | 'selection' | 'method' | 'details' | 'otp' | 'success';
type RedemptionType = 'cashback' | 'rewards' | 'combined' | null;

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

const PAYMENT_METHODS = [
  { id: 'amazon' as const, name: 'Amazon Pay Balance', icon: Smartphone, description: 'Transfer to Amazon Pay' },
  { id: 'flipkart' as const, name: 'Flipkart Gift Card', icon: Gift, description: 'Get Flipkart voucher' },
  { id: 'upi' as const, name: 'UPI', icon: CreditCard, description: 'Instant UPI transfer' },
  { id: 'bank' as const, name: 'Bank Transfer', icon: Building2, description: 'IMPS/RTGS transfer' },
];

const Earnings: React.FC = () => {
  const { toast } = useToast();
  const { user, accessToken, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Earnings API state
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);

  useEffect(() => {
    const loadEarnings = async () => {
      // If user is not logged in, don't try to load earnings and don't block UI
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

  // Payment sheet state
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('wallet');
  const [redemptionType, setRedemptionType] = useState<RedemptionType>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [otpGuid, setOtpGuid] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  // Payment details - with double confirmation
  const [mobileNumber, setMobileNumber] = useState('');
  const [confirmMobileNumber, setConfirmMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [confirmUpiId, setConfirmUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

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

  // Get redemption amount based on type
  const getRedemptionAmount = (type: RedemptionType): number => {
    switch (type) {
      case 'cashback': return confirmedCashback;
      case 'rewards': return confirmedRewards;
      case 'combined': return confirmedCashback + confirmedRewards;
      default: return 0;
    }
  };

  // Get available payment methods based on redemption type
  const getAvailablePaymentMethods = () => {
    if (redemptionType === 'cashback') {
      return PAYMENT_METHODS; // All 4 methods available
    }
    // For rewards and combined, only Amazon and Flipkart
    return PAYMENT_METHODS.filter(m => m.id === 'amazon' || m.id === 'flipkart');
  };

  // Payment handlers
  const handleOpenPayment = () => {
    setIsPaymentSheetOpen(true);
    setPaymentStep('wallet');
    setShowPaymentHistory(false);
    resetPaymentForm();
  };

  const resetPaymentForm = () => {
    setRedemptionType(null);
    setSelectedMethod(null);
    setOtpGuid('');
    setOtp('');
    setMobileNumber('');
    setConfirmMobileNumber('');
    setEmail('');
    setConfirmEmail('');
    setUpiId('');
    setConfirmUpiId('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setAccountHolderName('');
  };

  const handleContinueToSelection = () => {
    setPaymentStep('selection');
  };

  const handleSelectRedemptionType = (type: RedemptionType) => {
    setRedemptionType(type);
    setPaymentStep('method');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setPaymentStep('details');
  };

  const handleSendOTP = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const res = await sendPaymentRequestOTP(accessToken);
      const guid = res?.data?.attributes?.otp_guid;
      if (guid) {
        setOtpGuid(guid);
      }
      setPaymentStep('otp');
      setCountdown(30);
      
      toast({
        title: 'OTP Sent',
        description: `OTP sent to your registered mobile number`,
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
    } catch (error: any) {
      toast({
        title: 'Failed to send OTP',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndPay = async () => {
    if (otp.length !== 6 || !accessToken || !otpGuid) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // First verify OTP
      await verifyPaymentRequestOTP(accessToken, otpGuid, otp);

      // Then submit payment based on method
      const paymentType = redemptionType as 'cashback' | 'rewards' | 'combined';
      
      switch (selectedMethod) {
        case 'amazon':
          await submitAmazonPayment(accessToken, paymentType, mobileNumber, otpGuid);
          break;
        case 'flipkart':
          await submitFlipkartPayment(accessToken, paymentType, email, otpGuid);
          break;
        case 'upi':
          await submitUPIPayment(accessToken, 'cashback', upiId, otpGuid);
          break;
        case 'bank':
          await submitBankPayment(accessToken, 'cashback', ifscCode, accountHolderName, accountNumber, otpGuid);
          break;
      }

      setPaymentStep('success');
      toast({
        title: 'Payment Request Submitted!',
        description: 'Your request will be processed within 24-48 hours',
      });
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentBack = () => {
    switch (paymentStep) {
      case 'selection':
        setPaymentStep('wallet');
        break;
      case 'method':
        setPaymentStep('selection');
        setRedemptionType(null);
        break;
      case 'details':
        setPaymentStep('method');
        setSelectedMethod(null);
        break;
      case 'otp':
        setPaymentStep('details');
        break;
    }
  };

  const isDetailsValid = (): boolean => {
    switch (selectedMethod) {
      case 'amazon':
        return mobileNumber.length === 10 && 
               mobileNumber === confirmMobileNumber &&
               /^[6-9]\d{9}$/.test(mobileNumber);
      case 'flipkart':
        return email.includes('@') && 
               email.includes('.') &&
               email === confirmEmail;
      case 'upi':
        return upiId.includes('@') && 
               upiId === confirmUpiId &&
               upiId.length >= 5;
      case 'bank':
        return accountNumber.length >= 9 &&
               accountNumber === confirmAccountNumber &&
               ifscCode.length === 11 &&
               accountHolderName.length > 2;
      default:
        return false;
    }
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

  // Show login prompt if not authenticated (must be before loading check)
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

  const renderPaymentSheetContent = () => {
    if (showPaymentHistory) {
      return (
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
      );
    }

    // Step 1: Wallet - Show balances
    if (paymentStep === 'wallet') {
      return (
        <div className="space-y-4">
          {/* Cashback Card */}
          <div className="p-4 border rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cashback</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{formatMoney(confirmedCashback)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Available for payment. You can withdraw via UPI / Bank transfer or redeem as Amazon Pay Balance.
            </p>
          </div>

          {/* Rewards Card */}
          <div className="p-4 border rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/10">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rewards</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{formatMoney(confirmedRewards)}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Available for payment. You can redeem Rewards only as Amazon Pay Balance or Flipkart Gift Card.
            </p>
          </div>

          <Button 
            onClick={handleContinueToSelection} 
            className="w-full h-12"
            disabled={confirmedCashback <= 0 && confirmedRewards <= 0}
          >
            Continue
          </Button>
        </div>
      );
    }

    // Step 2: Selection - Choose redemption type
    if (paymentStep === 'selection') {
      return (
        <div className="space-y-4">
          <button
            onClick={handlePaymentBack}
            className="text-primary text-sm flex items-center hover:underline mb-2"
          >
            ← Back
          </button>
          
          <h3 className="font-semibold text-foreground text-lg">Do You Want to Request</h3>
          
          {/* Cashback Only */}
          {confirmedCashback > 0 && (
            <button
              onClick={() => handleSelectRedemptionType('cashback')}
              className="w-full p-4 border rounded-xl text-left hover:border-primary transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Banknote className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Cashback Only</p>
                  <p className="text-lg font-bold text-primary">{formatMoney(confirmedCashback)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">UPI</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Bank</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </button>
          )}

          {/* Rewards Only */}
          {confirmedRewards > 0 && (
            <button
              onClick={() => handleSelectRedemptionType('rewards')}
              className="w-full p-4 border rounded-xl text-left hover:border-amber-500 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                  <Gift className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Rewards Only</p>
                  <p className="text-lg font-bold text-amber-500">{formatMoney(confirmedRewards)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </button>
          )}

          {/* Combined */}
          {confirmedCashback > 0 && confirmedRewards > 0 && (
            <button
              onClick={() => handleSelectRedemptionType('combined')}
              className="w-full p-4 border rounded-xl text-left hover:border-success transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Combine Cashback & Rewards</p>
                  <p className="text-lg font-bold text-success">{formatMoney(confirmedCashback + confirmedRewards)}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                    <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </button>
          )}
        </div>
      );
    }

    // Step 3: Method Selection
    if (paymentStep === 'method') {
      const availableMethods = getAvailablePaymentMethods();
      const amount = getRedemptionAmount(redemptionType);

      return (
        <div className="space-y-4">
          <button
            onClick={handlePaymentBack}
            className="text-primary text-sm flex items-center hover:underline mb-2"
          >
            ← Back
          </button>

          <div className="p-3 bg-muted/50 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground">Requesting</p>
            <p className="text-xl font-bold text-foreground">{formatMoney(amount)}</p>
            <p className="text-xs text-muted-foreground capitalize">{redemptionType} redemption</p>
          </div>
          
          <h3 className="font-semibold text-foreground">Select Payment Method</h3>
          
          <div className="space-y-3">
            {availableMethods.map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => handleMethodSelect(method.id)}
                  className="w-full p-4 border rounded-xl text-left hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{method.name}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Step 4: Details - Enter payment info with double confirmation
    if (paymentStep === 'details') {
      const amount = getRedemptionAmount(redemptionType);
      const methodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod);
      const Icon = methodInfo?.icon || Wallet;

      return (
        <div className="space-y-4">
          <button
            onClick={handlePaymentBack}
            className="text-primary text-sm flex items-center hover:underline mb-2"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{methodInfo?.name}</p>
              <p className="text-sm text-muted-foreground">Amount: {formatMoney(amount)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Amazon Pay - Mobile Number */}
            {selectedMethod === 'amazon' && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Mobile Number (linked to Amazon)
                  </label>
                  <Input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm Mobile Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="Re-enter mobile"
                    value={confirmMobileNumber}
                    onChange={(e) => setConfirmMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-11"
                  />
                  {confirmMobileNumber && mobileNumber !== confirmMobileNumber && (
                    <p className="text-xs text-destructive mt-1">Mobile numbers don't match</p>
                  )}
                </div>
              </>
            )}

            {/* Flipkart - Email */}
            {selectedMethod === 'flipkart' && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="Re-enter email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="h-11"
                  />
                  {confirmEmail && email !== confirmEmail && (
                    <p className="text-xs text-destructive mt-1">Email addresses don't match</p>
                  )}
                </div>
              </>
            )}

            {/* UPI */}
            {selectedMethod === 'upi' && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    UPI ID
                  </label>
                  <Input
                    type="text"
                    placeholder="yourname@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm UPI ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Re-enter UPI ID"
                    value={confirmUpiId}
                    onChange={(e) => setConfirmUpiId(e.target.value.toLowerCase())}
                    className="h-11"
                  />
                  {confirmUpiId && upiId !== confirmUpiId && (
                    <p className="text-xs text-destructive mt-1">UPI IDs don't match</p>
                  )}
                </div>
              </>
            )}

            {/* Bank Transfer */}
            {selectedMethod === 'bank' && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Account Holder Name
                  </label>
                  <Input
                    type="text"
                    placeholder="As per bank records"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Account Number
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter account number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Confirm Account Number
                  </label>
                  <Input
                    type="text"
                    placeholder="Re-enter account number"
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="h-11"
                  />
                  {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                    <p className="text-xs text-destructive mt-1">Account numbers don't match</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    IFSC Code
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., SBIN0003060"
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
              className="w-full h-12"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Send OTP to Verify'}
            </Button>
          </div>
        </div>
      );
    }

    // Step 5: OTP Verification
    if (paymentStep === 'otp') {
      const amount = getRedemptionAmount(redemptionType);
      const methodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod);

      return (
        <div className="space-y-4">
          <button
            onClick={handlePaymentBack}
            className="text-primary text-sm flex items-center hover:underline mb-2"
          >
            ← Back
          </button>

          <div className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            
            <h3 className="font-semibold text-foreground mb-2">Verify OTP</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enter the OTP sent to your registered mobile number
            </p>

            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-12 text-center text-xl tracking-[0.5em] font-mono mb-4"
            />

            <div className="mb-4">
              <button
                onClick={handleSendOTP}
                disabled={countdown > 0 || isLoading}
                className={`text-sm ${countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}`}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm font-medium text-foreground mb-2">Payment Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatMoney(amount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{methodInfo?.name}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{redemptionType}</span>
              </div>
            </div>

            <Button
              onClick={handleVerifyAndPay}
              disabled={otp.length !== 6 || isLoading}
              className="w-full h-12"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Submit Request'}
            </Button>
          </div>
        </div>
      );
    }

    // Step 6: Success
    if (paymentStep === 'success') {
      const amount = getRedemptionAmount(redemptionType);
      const methodInfo = PAYMENT_METHODS.find(m => m.id === selectedMethod);

      return (
        <div className="text-center py-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-2">Payment Requested!</h3>
          <p className="text-muted-foreground mb-6">
            Your payment request of {formatMoney(amount)} via {methodInfo?.name} has been submitted successfully.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-muted-foreground mb-1">Expected processing time</p>
            <p className="font-semibold text-foreground">24-48 hours</p>
          </div>

          <Button 
            onClick={() => {
              setIsPaymentSheetOpen(false);
              resetPaymentForm();
              setPaymentStep('wallet');
            }} 
            className="w-full h-12"
          >
            Done
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <AppLayout>
      <div className="p-3 md:p-4 lg:p-8 max-w-4xl mx-auto">
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
          <div className="mb-4 md:mb-6">
            <h1 className="text-base md:text-xl font-semibold text-foreground mb-1">All Time Earnings</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Cashback + Rewards + Referrals
            </p>
          </div>

          {/* Total Amount */}
          <div className="mb-1 md:mb-2">
            <p className="text-2xl md:text-4xl lg:text-5xl font-bold text-primary">
              {formatMoney(totalEarned)}
            </p>
          </div>

          <p className="text-[10px] md:text-xs text-muted-foreground mb-4 md:mb-8">
            *Earnings show within 72 hours
          </p>

          {/* 3-Column Breakdown */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
            {/* Cashback */}
            <div className="border rounded-lg md:rounded-xl p-2 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Cashback</p>
                  <p className="text-sm md:text-xl font-bold text-foreground">{formatMoney(cashbackTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground hidden md:block">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(confirmedCashback)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-success/10 text-success border border-success/30 w-fit">
                    Confirmed
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(pendingCashback)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-warning/10 text-warning border border-warning/30 w-fit">
                    Pending
                  </span>
                </div>
                <div className="hidden md:flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidCashback)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <div className="border rounded-lg md:rounded-xl p-2 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Rewards</p>
                  <p className="text-sm md:text-xl font-bold text-foreground">{formatMoney(rewardsTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground hidden md:block">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(confirmedRewards)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-success/10 text-success border border-success/30 w-fit">
                    Confirmed
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(pendingRewards)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-warning/10 text-warning border border-warning/30 w-fit">
                    Pending
                  </span>
                </div>
                <div className="hidden md:flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidRewards)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    Paid
                  </span>
                </div>
              </div>
            </div>

            {/* Referrals */}
            <div className="border rounded-lg md:rounded-xl p-2 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div>
                  <p className="text-[10px] md:text-sm text-muted-foreground">Referrals</p>
                  <p className="text-sm md:text-xl font-bold text-foreground">{formatMoney(referralsTotal)}</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground hidden md:block">
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 md:space-y-2">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(confirmedReferrals)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-success/10 text-success border border-success/30 w-fit">
                    Confirmed
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-0.5">
                  <span className="text-[10px] md:text-sm text-muted-foreground">{formatMoney(pendingReferrals)}</span>
                  <span className="px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-xs font-medium bg-warning/10 text-warning border border-warning/30 w-fit">
                    Pending
                  </span>
                </div>
                <div className="hidden md:flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{formatMoney(paidReferrals)}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30">
                    Paid
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
              Redeem your cashback and rewards
            </SheetDescription>
          </SheetHeader>

          {/* Toggle between Request and History */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={!showPaymentHistory ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowPaymentHistory(false);
                setPaymentStep('wallet');
                resetPaymentForm();
              }}
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

          {renderPaymentSheetContent()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default Earnings;