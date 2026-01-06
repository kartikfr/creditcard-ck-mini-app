import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Building2, Gift, Smartphone, ArrowLeft, ShieldCheck, Clock, ChevronRight, X, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import thresholdSavingsImg from '@/assets/threshold-savings.png';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoginPrompt from '@/components/LoginPrompt';
import { useIsMobile } from '@/hooks/use-mobile';
import PaymentDetailsForm, { PaymentFormData, PaymentMethodType } from '@/components/payment/PaymentDetailsForm';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchEarnings,
  fetchPaymentInfo,
  extractPaymentMethodIds,
  extractPaymentData,
  sendPaymentRequestOTP,
  verifyPaymentRequestOTP,
  submitAmazonPayment,
  submitFlipkartPayment,
  submitUPIPayment,
  submitBankPayment,
  fetchPaymentRequests,
  fetchProfile,
  APIError,
} from '@/lib/api';

type WalletType = 'cashback' | 'rewards' | 'cashback_and_rewards' | null;
type PaymentMethod = 'amazon' | 'flipkart' | 'bank' | 'upi' | null;
type Step = 'overview' | 'threshold' | 'selection' | 'method' | 'details' | 'otp' | 'success';

interface PaymentRequestItem {
  id: string | number;
  type: string;
  attributes: {
    cashout_id?: number;
    month?: string;
    year?: number;
    total_amount?: string;
    status?: string;
    payment_method?: string;
    created_at?: string;
  };
}

const Payments: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, accessToken, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  // Use SettingsPageLayout for desktop, AppLayout for mobile
  const Layout = isMobile ? AppLayout : SettingsPageLayout;
  
  const [step, setStep] = useState<Step>('overview');
  const [selectedWallet, setSelectedWallet] = useState<WalletType>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  
  // Payment details (populated by PaymentDetailsForm on submit)
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');

  // Terms & Conditions
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // OTP flow
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Earnings/Payment data
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [paymentThreshold, setPaymentThreshold] = useState(250);
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  
  // Payment requests
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  
  // Profile email for Amazon payment
  const [profileEmail, setProfileEmail] = useState<string>('');
  
  // Payment method IDs from API - dynamically fetched
  const [paymentMethodIds, setPaymentMethodIds] = useState<Record<string, number>>({
    amazon: 12,
    flipkart: 13,
    upi: 20,
    bank: 18,
  });
  
  // Payment Processing Modal state (for pending payment error)
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState<string | null>(null);
  
  // Threshold Modal state (for desktop) - shows when total earnings < payment_threshold
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  
  // OTP input refs for individual boxes
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);


  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) {
        setLoadingEarnings(false);
        return;
      }
      setLoadingPaymentRequests(true);
      try {
        // Fetch payment info, payment requests, and profile in parallel
        // Payment info now provides cashback_earnings, rewards_earnings, payment_threshold
        const [paymentInfoRes, paymentRequestsRes, profileRes] = await Promise.all([
          fetchPaymentInfo(accessToken).catch(err => {
            console.error('[Payments] Failed to fetch payment info:', err);
            return null;
          }),
          fetchPaymentRequests(accessToken).catch(err => {
            console.error('[Payments] Failed to fetch payment requests:', err);
            return null;
          }),
          fetchProfile(accessToken).catch(err => {
            console.error('[Payments] Failed to fetch profile:', err);
            return null;
          }),
        ]);
        
        // Extract payment data from Payment API (primary source for balances)
        if (paymentInfoRes) {
          console.log('[Payments] Payment info response:', paymentInfoRes);
          
          // Extract earnings, threshold, currency from Payment API
          const paymentData = extractPaymentData(paymentInfoRes);
          console.log('[Payments] Extracted payment data:', paymentData);
          
          setCashbackBalance(paymentData.cashbackEarnings);
          setRewardsBalance(paymentData.rewardsEarnings);
          setPaymentThreshold(paymentData.paymentThreshold);
          setCurrencyCode(paymentData.currencyCode);
          
          // Extract payment method IDs
          const ids = extractPaymentMethodIds(paymentInfoRes);
          console.log('[Payments] Extracted payment method IDs:', ids);
          setPaymentMethodIds(ids);
        } else {
          // Fallback to earnings API if payment info fails
          console.log('[Payments] Payment info failed, falling back to earnings API');
          try {
            const earningsRes = await fetchEarnings(accessToken);
            const attrs = earningsRes?.data?.attributes ?? earningsRes?.data?.[0]?.attributes;
            if (attrs) {
              setCashbackBalance(parseFloat(attrs.confirmed_cashback) || 0);
              setRewardsBalance(parseFloat(attrs.confirmed_rewards) || 0);
              setPaymentThreshold(parseFloat(attrs.payment_threshold) || 250);
            }
          } catch (earningsErr) {
            console.error('[Payments] Fallback earnings API also failed:', earningsErr);
          }
        }
        
        // Parse payment requests from response
        if (paymentRequestsRes?.data) {
          console.log('[Payments] Payment requests response:', paymentRequestsRes);
          const requests = Array.isArray(paymentRequestsRes.data) 
            ? paymentRequestsRes.data 
            : [paymentRequestsRes.data];
          setPaymentRequests(requests);
        }
        
        // Parse profile email for Amazon payment
        if (profileRes?.data) {
          const profileArray = profileRes.data;
          const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
          const email = profile?.attributes?.email || '';
          console.log('[Payments] Profile email:', email);
          setProfileEmail(email);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoadingEarnings(false);
        setLoadingPaymentRequests(false);
      }
    };
    loadData();
  }, [accessToken]);

  const handleRequestPayment = () => {
    const totalEarnings = cashbackBalance + rewardsBalance;
    if (totalEarnings < paymentThreshold) {
      // Below threshold - show threshold popup (desktop) or threshold step (mobile)
      if (isMobile) {
        setStep('threshold');
      } else {
        setShowThresholdModal(true);
      }
    } else {
      // Above threshold - proceed to selection
      setStep('selection');
    }
  };

  const handleWalletSelect = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    setStep('method');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('details');
  };
  
  // OTP individual box handlers
  const handleOtpDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setOtp(newDigits.join(''));
    
    // Auto-focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      // Move to previous input on backspace when current is empty
      otpInputRefs.current[index - 1]?.focus();
    }
  };
  
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const digits = pasted.split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      setOtp(newDigits.join(''));
      // Focus last filled or last box
      const lastIndex = Math.min(digits.length, 5);
      otpInputRefs.current[lastIndex]?.focus();
    }
  };
  
  const getMaskedPhone = () => {
    const phone = user?.mobileNumber || '';
    if (phone.length >= 10) {
      return phone.slice(0, 3) + 'XXXX' + phone.slice(-3);
    }
    return phone;
  };

  const handleSendOTP = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    // Clear previous OTP when sending/resending
    setOtp('');
    setOtpDigits(['', '', '', '', '', '']);
    
    try {
      const response = await sendPaymentRequestOTP(accessToken);
      const guid = response?.data?.attribute?.otp_guid;
      
      if (!guid) {
        throw new Error('Failed to get OTP GUID from response');
      }
      
      setOtpGuid(guid);
      setStep('otp');
      setCountdown(30);
      
      const sentTo = response?.data?.attribute?.sent_to_mobile || user?.mobileNumber;
      toast({
        title: 'OTP Sent',
        description: `OTP sent to +91 ${sentTo}`,
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
      console.error('Failed to send OTP:', error);
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
    const trimmedOtp = otp.trim();
    
    if (trimmedOtp.length !== 6 || !/^\d{6}$/.test(trimmedOtp)) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }
    
    if (!accessToken || !otpGuid) {
      toast({
        title: 'Session Error',
        description: 'Please request a new OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Verify OTP
      const verifyResponse = await verifyPaymentRequestOTP(accessToken, otpGuid, trimmedOtp);
      
      // Check if OTP verification was successful
      if (verifyResponse?.error || (verifyResponse?.data?.errors && verifyResponse.data.errors.length > 0)) {
        const errorDetail = verifyResponse?.data?.errors?.[0]?.detail || 'OTP verification failed';
        throw new Error(errorDetail);
      }
      
      // Step 2: Submit payment based on selected method
      const paymentType = selectedWallet as 'cashback' | 'rewards' | 'cashback_and_rewards';
      
      switch (selectedMethod) {
        case 'amazon':
          await submitAmazonPayment(accessToken, paymentType, mobileNumber, otpGuid, paymentMethodIds.amazon);
          break;
        case 'flipkart':
          await submitFlipkartPayment(accessToken, paymentType, email, otpGuid, paymentMethodIds.flipkart);
          break;
        case 'upi':
          await submitUPIPayment(accessToken, paymentType, upiId, otpGuid, paymentMethodIds.upi);
          break;
        case 'bank':
          await submitBankPayment(accessToken, paymentType, ifscCode, accountHolder, accountNumber, otpGuid, paymentMethodIds.bank);
          break;
      }
      
      setStep('success');
      toast({
        title: 'Payment Request Submitted!',
        description: 'Your payment will be processed within 24-48 hours',
      });
    } catch (error: any) {
      console.error('Payment failed:', error);
      
      // Check if this is a "payment already pending" error (code 5002)
      if (error instanceof APIError && error.code === '5002') {
        // Reset form and show processing modal
        resetForm();
        
        // Set the pending amount from meta
        const pendingAmount = error.meta?.requested_earnings || null;
        setPendingPaymentAmount(pendingAmount);
        setShowProcessingModal(true);
        return;
      }
      
      toast({
        title: 'Payment Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'selection') {
      setStep('overview');
    } else if (step === 'method') {
      setStep('selection');
      setSelectedWallet(null);
    } else if (step === 'details') {
      setStep('method');
      setSelectedMethod(null);
    } else if (step === 'otp') {
      setStep('details');
    }
  };

  const resetForm = () => {
    setStep('overview');
    setSelectedWallet(null);
    setSelectedMethod(null);
    setMobileNumber('');
    setEmail('');
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolder('');
    setBankName('');
    setOtp('');
    setOtpGuid('');
    setTermsAccepted(false);
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'amazon':
        return 'Amazon Pay Balance';
      case 'flipkart':
        return 'Flipkart Gift Card';
      case 'bank':
        return 'Bank Transfer';
      case 'upi':
        return 'UPI';
      default:
        return '';
    }
  };

  const getPaymentAmount = () => {
    switch (selectedWallet) {
      case 'cashback': return cashbackBalance;
      case 'rewards': return rewardsBalance;
      case 'cashback_and_rewards': return cashbackBalance + rewardsBalance;
      default: return 0;
    }
  };

  const getWalletLabel = () => {
    switch (selectedWallet) {
      case 'cashback': return 'Cashback';
      case 'rewards': return 'Rewards';
      case 'cashback_and_rewards': return 'Cashback + Rewards';
      default: return '';
    }
  };

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <LoginPrompt 
            title="Request Payment"
            description="Login to request payments and view your payment history"
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-5xl lg:max-w-none pb-20 md:pb-0">
        {/* Mobile: Simplified Breadcrumb - just shows current step */}
        {isMobile ? (
          <div className="flex items-center gap-3 mb-4">
            {step !== 'overview' && step !== 'success' && (
              <button
                onClick={handleBack}
                className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-lg font-semibold text-foreground">
              {step === 'overview' && 'Request Payment'}
              {step === 'selection' && 'Select Wallet'}
              {step === 'method' && `Request ${getWalletLabel()}`}
              {step === 'details' && getMethodLabel(selectedMethod)}
              {step === 'otp' && 'Verify OTP'}
              {step === 'success' && 'Payment Requested'}
            </h1>
          </div>
        ) : (
          /* Desktop: Full Breadcrumb */
          <nav className="text-sm text-muted-foreground mb-6">
            <ol className="flex items-center gap-2">
              <li><Link to="/" className="hover:text-primary">Home</Link></li>
              <li>/</li>
              <li><Link to="/earnings" className="hover:text-primary">My Earnings</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">
                {step === 'overview' && 'Request Payment'}
                {step === 'selection' && 'Select Wallet'}
                {step === 'method' && `Request ${getWalletLabel()}`}
                {step === 'details' && getMethodLabel(selectedMethod)}
                {step === 'otp' && 'Verify OTP'}
                {step === 'success' && 'Success'}
              </li>
            </ol>
          </nav>
        )}

        {/* Step 1: Overview with Cashback & Rewards Cards */}
        {step === 'overview' && (
          <div className="animate-fade-in">
            {!isMobile && (
              <>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
                  Request Payment
                </h1>
                <p className="text-muted-foreground mb-8">Choose your wallet type and payment method</p>
              </>
            )}

            {loadingEarnings ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Cards - Stacked on mobile, side-by-side on desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
                  {/* Cashback Card */}
                  <div className="bg-secondary/30 rounded-2xl p-4 md:p-6 border border-border">
                    <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">Cashback available for payment</p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">₹{cashbackBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      You can withdraw via UPI / Bank transfer or redeem as Amazon Pay Balance / Flipkart Gift Card.
                    </p>
                  </div>

                  {/* Rewards Card */}
                  <div className="bg-secondary/30 rounded-2xl p-4 md:p-6 border border-border">
                    <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <Gift className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm text-muted-foreground mb-1">Rewards available for payment</p>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">₹{rewardsBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      You can redeem Rewards as Amazon Pay Balance or Flipkart Gift Card.
                    </p>
                  </div>
                </div>

                {/* Request Payment Button - Full width on mobile */}
                <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-4 mb-6 md:mb-8">
                  <Button
                    onClick={handleRequestPayment}
                    className="w-full md:w-auto px-8 py-3 h-12 bg-gradient-primary hover:opacity-90"
                    disabled={cashbackBalance <= 0 && rewardsBalance <= 0}
                  >
                    Request Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/payment-history')}
                    className="w-full md:w-auto px-8 py-3 h-12"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Payment History
                  </Button>
                </div>

              </>
            )}
          </div>
        )}

        {/* Threshold Step (Mobile only) - Not enough balance */}
        {step === 'threshold' && isMobile && (
          <div className="animate-fade-in flex flex-col items-center text-center py-8">
            {/* Threshold Savings Illustration */}
            <div className="mb-6">
              <img 
                src={thresholdSavingsImg} 
                alt="Keep saving to reach threshold" 
                className="w-48 h-auto mx-auto"
              />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-4">
              Show Shopping Some Love
            </h2>

            <p className="text-muted-foreground mb-8 px-4">
              You have only ₹{(cashbackBalance + rewardsBalance).toFixed(0)} as confirmed Cashback / Rewards. Reach ₹{paymentThreshold} to withdraw.
            </p>

            <Button
              onClick={() => navigate('/')}
              className="w-full max-w-xs h-12 bg-gradient-primary hover:opacity-90 font-semibold"
            >
              See Best Deals
            </Button>
          </div>
        )}

        {/* Step 1.5: Select Wallet Type - 3 Options */}
        {step === 'selection' && (
          <div className="animate-fade-in">
            {!isMobile && (
              <button
                onClick={() => setStep('overview')}
                className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6">
              Select Wallet Type
            </h2>

            {/* Full-width stacked cards on mobile, 3 columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {/* Cashback Only - All 4 methods */}
              <button
                onClick={() => handleWalletSelect('cashback')}
                disabled={cashbackBalance <= 0}
                className={
                  "card-elevated p-4 md:p-6 text-left transition-colors w-full " +
                  (cashbackBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary active:scale-[0.98]")
                }
                aria-disabled={cashbackBalance <= 0}
              >
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-0.5 md:mb-1">Cashback</p>
                    <p className="text-xl md:text-2xl font-bold text-primary mb-1 md:mb-2">₹{cashbackBalance.toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Bank</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">UPI</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 md:hidden" />
                </div>
              </button>

              {/* Rewards Only - Amazon & Flipkart only */}
              <button
                onClick={() => handleWalletSelect('rewards')}
                disabled={rewardsBalance <= 0}
                className={
                  "card-elevated p-4 md:p-6 text-left transition-colors w-full " +
                  (rewardsBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary active:scale-[0.98]")
                }
                aria-disabled={rewardsBalance <= 0}
              >
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3">
                  <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Gift className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-0.5 md:mb-1">Rewards</p>
                    <p className="text-xl md:text-2xl font-bold text-amber-500 mb-1 md:mb-2">₹{rewardsBalance.toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 md:hidden" />
                </div>
              </button>

              {/* Cashback + Rewards - Amazon & Flipkart only */}
              <button
                onClick={() => handleWalletSelect('cashback_and_rewards')}
                disabled={cashbackBalance + rewardsBalance <= 0}
                className={
                  "card-elevated p-4 md:p-6 text-left transition-colors w-full " +
                  (cashbackBalance + rewardsBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary active:scale-[0.98]")
                }
                aria-disabled={cashbackBalance + rewardsBalance <= 0}
              >
                <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-3">
                  <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center shrink-0">
                    <Wallet className="w-6 h-6 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground mb-0.5 md:mb-1">Cashback + Rewards</p>
                    <p className="text-xl md:text-2xl font-bold text-success mb-1 md:mb-2">₹{(cashbackBalance + rewardsBalance).toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 md:hidden" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Payment Method */}
        {step === 'method' && (
          <div className="animate-fade-in">
            {!isMobile && (
              <button
                onClick={handleBack}
                className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            {/* Blue Header */}
            <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-foreground/20 rounded-xl flex items-center justify-center shrink-0">
                  {selectedWallet === 'cashback' && <Wallet className="w-6 h-6 md:w-7 md:h-7" />}
                  {selectedWallet === 'rewards' && <Gift className="w-6 h-6 md:w-7 md:h-7" />}
                  {selectedWallet === 'cashback_and_rewards' && <Wallet className="w-6 h-6 md:w-7 md:h-7" />}
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-xs md:text-sm">
                    Request {getWalletLabel()}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold">
                    ₹{getPaymentAmount().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">
              Choose Your Payment Method
            </h2>

            {/* 2 columns on mobile, 4 columns on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Amazon Pay - Always available */}
              <button
                onClick={() => handleMethodSelect('amazon')}
                className="card-elevated p-4 md:p-5 text-center hover:border-primary transition-colors group active:scale-[0.98]"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#FF9900]/10 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#FF9900]/20 transition-colors">
                  <span className="text-xl md:text-2xl font-bold text-[#FF9900]">A</span>
                </div>
                <p className="font-medium text-foreground text-xs md:text-sm">Amazon Pay Balance</p>
              </button>

              {/* Flipkart - Always available */}
              <button
                onClick={() => handleMethodSelect('flipkart')}
                className="card-elevated p-4 md:p-5 text-center hover:border-primary transition-colors group active:scale-[0.98]"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#2874F0]/10 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#2874F0]/20 transition-colors">
                  <span className="text-xl md:text-2xl font-bold text-[#2874F0]">F</span>
                </div>
                <p className="font-medium text-foreground text-xs md:text-sm">Flipkart Gift Card</p>
              </button>

              {/* Bank Transfer - Only for Cashback */}
              {selectedWallet === 'cashback' && (
                <button
                  onClick={() => handleMethodSelect('bank')}
                  className="card-elevated p-4 md:p-5 text-center hover:border-primary transition-colors group active:scale-[0.98]"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-xs md:text-sm">Bank Transfer</p>
                </button>
              )}

              {/* UPI - Only for Cashback */}
              {selectedWallet === 'cashback' && (
                <button
                  onClick={() => handleMethodSelect('upi')}
                  className="card-elevated p-4 md:p-5 text-center hover:border-primary transition-colors group active:scale-[0.98]"
                >
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-[#5F259F]/10 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3 group-hover:bg-[#5F259F]/20 transition-colors">
                    <Smartphone className="w-6 h-6 md:w-7 md:h-7 text-[#5F259F]" />
                  </div>
                  <p className="font-medium text-foreground text-xs md:text-sm">UPI</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Enter Details - Same component for Mobile & Desktop */}
        {step === 'details' && (
          <div className="animate-fade-in">
            {!isMobile && (
              <button
                onClick={handleBack}
                className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            <div className="max-w-md mx-auto">
              {selectedMethod && (
                <PaymentDetailsForm
                  method={selectedMethod as PaymentMethodType}
                  amount={getPaymentAmount()}
                  walletLabel={`${getWalletLabel()} available for payment`}
                  isLoading={isLoading}
                  userEmail={profileEmail}
                  onSubmit={(data: PaymentFormData) => {
                    // Keep state for OTP + submit step
                    setMobileNumber(data.mobileNumber);
                    // For Amazon, use profile email from API; for others, use form email
                    setEmail(selectedMethod === 'amazon' ? profileEmail : data.email);
                    setUpiId(data.upiId);
                    setAccountNumber(data.accountNumber);
                    setIfscCode(data.ifscCode);
                    setAccountHolder(data.accountHolderName);
                    setBankName(data.bankName);
                    setTermsAccepted(data.termsAccepted);

                    // Proceed to OTP (same for mobile + desktop)
                    handleSendOTP();
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Step 4: Verify OTP - Redesigned */}
        {step === 'otp' && (
          <div className="animate-fade-in">
            {!isMobile && (
              <button
                onClick={handleBack}
                className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}

            <div className="max-w-md mx-auto">
              {/* Desktop: Card layout, Mobile: Plain layout */}
              <div className={isMobile ? "" : "card-elevated p-6"}>
                <h2 className="text-lg font-bold text-foreground mb-2">Enter OTP</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  OTP sent to {getMaskedPhone()}
                </p>

                {/* 6 Individual OTP Boxes */}
                <div className="flex justify-center gap-2 md:gap-3 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => { otpInputRefs.current[index] = el; }}
                      type="tel"
                      inputMode="numeric"
                      maxLength={1}
                      value={otpDigits[index]}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className="w-11 h-12 md:w-12 md:h-14 text-center text-xl font-semibold border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  ))}
                </div>

                {/* Resend Link */}
                <div className="mb-6">
                  <span className="text-sm text-muted-foreground">Haven't received the OTP? </span>
                  <button
                    onClick={handleSendOTP}
                    disabled={countdown > 0 || isLoading}
                    className={`text-sm font-medium ${countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend'}
                  </button>
                </div>

                {/* Payment Summary */}
                <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm font-medium text-foreground mb-2">Payment Summary</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-medium">{getWalletLabel()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">₹{getPaymentAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{getMethodLabel(selectedMethod)}</span>
                  </div>
                </div>

                {/* Verify Button */}
                <Button
                  onClick={handleVerifyAndPay}
                  disabled={otp.length !== 6 || !/^\d{6}$/.test(otp) || isLoading}
                  className="w-full h-12 bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-60"
                  variant="secondary"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Verify OTP'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="animate-fade-in">
            <div className="max-w-lg mx-auto">
              <div className="card-elevated p-6 md:p-8">
                {/* Money Celebration Illustration */}
                <div className="flex flex-col items-center text-center">
                  <div className="mb-5 md:mb-6 relative w-32 h-32 md:w-40 md:h-40">
                    {/* Money stack illustration */}
                    <svg viewBox="0 0 120 100" className="w-full h-full">
                      {/* Money bills stack */}
                      <rect x="25" y="35" width="70" height="40" rx="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5"/>
                      <rect x="30" y="40" width="60" height="30" rx="2" fill="#dcfce7"/>
                      <circle cx="60" cy="55" r="8" fill="#22c55e"/>
                      <text x="60" y="59" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">₹</text>
                      
                      {/* Second bill behind */}
                      <rect x="20" y="30" width="70" height="40" rx="4" fill="#4ade80" stroke="#22c55e" strokeWidth="1" opacity="0.7"/>
                      
                      {/* Coins */}
                      <circle cx="85" cy="70" r="10" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"/>
                      <circle cx="85" cy="70" r="5" fill="#fcd34d"/>
                      <circle cx="90" cy="62" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
                      
                      {/* Confetti */}
                      <rect x="15" y="15" width="6" height="6" fill="#f472b6" transform="rotate(15 15 15)"/>
                      <rect x="100" y="20" width="5" height="5" fill="#60a5fa" transform="rotate(-20 100 20)"/>
                      <circle cx="25" cy="60" r="3" fill="#a78bfa"/>
                      <circle cx="95" cy="40" r="3" fill="#34d399"/>
                      <rect x="50" y="10" width="4" height="8" fill="#fbbf24" transform="rotate(25 50 10)"/>
                      <rect x="75" y="85" width="5" height="5" fill="#f472b6" transform="rotate(-15 75 85)"/>
                      <circle cx="35" cy="80" r="2.5" fill="#60a5fa"/>
                      <rect x="10" y="45" width="4" height="4" fill="#34d399" transform="rotate(30 10 45)"/>
                      <circle cx="105" cy="55" r="2" fill="#fbbf24"/>
                    </svg>
                  </div>

                  <h2 className="text-base md:text-lg font-bold text-foreground mb-3">
                    {getMethodLabel(selectedMethod)} Payment Initiated
                  </h2>

                  <p className="text-muted-foreground mb-6 md:mb-8 max-w-xs text-xs md:text-sm leading-relaxed">
                    We have initiated your payment of ₹{getPaymentAmount().toFixed(0)}. It will be added to your {getMethodLabel(selectedMethod)} within 5 minutes. In rare cases it may take upto 72 hours. We will notify you once the payment is done.
                  </p>

                  <Button
                    onClick={() => {
                      resetForm();
                      navigate('/');
                    }}
                    className="w-full max-w-xs h-12 bg-gradient-primary hover:opacity-90 font-semibold"
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Processing Modal - shown when payment is already pending */}
      <Dialog open={showProcessingModal} onOpenChange={setShowProcessingModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setShowProcessingModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6 pt-8 text-center">
              {/* Wallet Icon with Timer Badge */}
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center transform rotate-6 relative">
                  <Wallet className="w-12 h-12 text-white transform -rotate-6" />
                  {/* Money notes effect */}
                  <div className="absolute -top-2 -right-2 w-8 h-10 bg-green-400 rounded-sm transform rotate-12 opacity-80"></div>
                  <div className="absolute -top-3 right-1 w-6 h-8 bg-green-300 rounded-sm transform rotate-6 opacity-60"></div>
                  {/* Checkmark badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full border-2 border-teal-500 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-teal-500" />
                  </div>
                </div>
                {/* Curved arrow */}
                <div className="absolute -top-2 -right-6 text-orange-400 text-2xl">↗</div>
              </div>

              {/* Timer Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-600 rounded-full mb-4 font-medium text-sm">
                <Clock className="w-4 h-4" />
                5 Min to 72 Hrs
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-foreground mb-3">
                Payment Is Processing
              </h2>

              {/* Description */}
              <p className="text-muted-foreground mb-6">
                We've already got your payment request of{' '}
                <span className="font-semibold text-foreground">
                  ₹{pendingPaymentAmount ? parseFloat(pendingPaymentAmount).toLocaleString('en-IN') : '0'}
                </span>
                , which will be done within 5 min to 72 hours.
              </p>

              {/* Note */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Note - </span>
                  You can request another payment after this is completed :)
                </p>
              </div>

              {/* Action Button */}
              <Button 
                onClick={() => {
                  setShowProcessingModal(false);
                  navigate('/');
                }}
                className="w-full h-12 font-semibold"
              >
                Browse More Deals
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Threshold Modal (Desktop only) - Not enough balance */}
      <Dialog open={showThresholdModal} onOpenChange={setShowThresholdModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <div className="relative">
            {/* Close button */}
            <button
              onClick={() => setShowThresholdModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-6 pt-8 text-center">
              <div className="border-b border-border pb-4 mb-6 -mx-6 -mt-8 pt-4">
                <h2 className="text-lg font-semibold text-foreground">Request Payment</h2>
              </div>

              {/* Threshold Savings Illustration */}
              <div className="mb-6">
                <img 
                  src={thresholdSavingsImg} 
                  alt="Keep saving to reach threshold" 
                  className="w-40 h-auto mx-auto"
                />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-foreground mb-4">
                Show Shopping Some Love
              </h2>

              {/* Description */}
              <p className="text-muted-foreground mb-8">
                You have only ₹{(cashbackBalance + rewardsBalance).toFixed(0)} as confirmed Cashback / Rewards. Reach ₹{paymentThreshold} to withdraw.
              </p>

              {/* Action Button */}
              <Button 
                onClick={() => {
                  setShowThresholdModal(false);
                  navigate('/');
                }}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 font-semibold"
              >
                See Best Deals
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Payments;
