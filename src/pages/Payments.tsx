import React, { useState, useEffect } from 'react';
import { Wallet, Building2, Gift, Smartphone, ArrowLeft, ShieldCheck, Clock, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  sendPaymentRequestOTP,
  verifyPaymentRequestOTP,
  submitAmazonPayment,
  submitFlipkartPayment,
  submitUPIPayment,
  submitBankPayment,
  fetchPaymentRequests,
} from '@/lib/api';

type WalletType = 'cashback' | 'rewards' | 'cashback_and_rewards' | null;
type PaymentMethod = 'amazon' | 'flipkart' | 'bank' | 'upi' | null;
type Step = 'overview' | 'selection' | 'method' | 'details' | 'otp' | 'success';

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
  
  // Earnings data
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  
  // Payment requests
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestItem[]>([]);
  const [loadingPaymentRequests, setLoadingPaymentRequests] = useState(false);
  
  // Payment method IDs from API - dynamically fetched
  const [paymentMethodIds, setPaymentMethodIds] = useState<Record<string, number>>({
    amazon: 12,
    flipkart: 13,
    upi: 20,
    bank: 18,
  });
  

  useEffect(() => {
    const loadData = async () => {
      if (!accessToken) {
        setLoadingEarnings(false);
        return;
      }
      setLoadingPaymentRequests(true);
      try {
        // Fetch earnings, payment info, and payment requests in parallel
        const [earningsRes, paymentInfoRes, paymentRequestsRes] = await Promise.all([
          fetchEarnings(accessToken),
          fetchPaymentInfo(accessToken).catch(err => {
            console.error('[Payments] Failed to fetch payment info:', err);
            return null;
          }),
          fetchPaymentRequests(accessToken).catch(err => {
            console.error('[Payments] Failed to fetch payment requests:', err);
            return null;
          }),
        ]);
        
        const attrs = earningsRes?.data?.attributes ?? earningsRes?.data?.[0]?.attributes;
        if (attrs) {
          setCashbackBalance(parseFloat(attrs.confirmed_cashback) || 0);
          setRewardsBalance(parseFloat(attrs.confirmed_rewards) || 0);
        }
        
        // Parse payment method IDs from response
        if (paymentInfoRes) {
          console.log('[Payments] Payment info response:', paymentInfoRes);
          const ids = extractPaymentMethodIds(paymentInfoRes);
          console.log('[Payments] Extracted payment method IDs:', ids);
          setPaymentMethodIds(ids);
        }
        
        // Parse payment requests from response
        if (paymentRequestsRes?.data) {
          console.log('[Payments] Payment requests response:', paymentRequestsRes);
          const requests = Array.isArray(paymentRequestsRes.data) 
            ? paymentRequestsRes.data 
            : [paymentRequestsRes.data];
          setPaymentRequests(requests);
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

  const handleWalletSelect = (wallet: WalletType) => {
    setSelectedWallet(wallet);
    setStep('method');
  };

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('details');
  };

  const handleSendOTP = async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    // Clear previous OTP when sending/resending
    setOtp('');
    
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
      <div className="w-full max-w-5xl lg:max-w-none">
        {/* Breadcrumb */}
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

        {/* Step 1: Overview with Cashback & Rewards Cards */}
        {step === 'overview' && (
          <div className="animate-fade-in">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
              Request Payment
            </h1>
            <p className="text-muted-foreground mb-8">Choose your wallet type and payment method</p>

            {loadingEarnings ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Two Cards Side by Side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Cashback Card */}
                  <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Cashback available for payment</p>
                        <p className="text-3xl font-bold text-foreground">₹{cashbackBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can withdraw via UPI / Bank transfer or redeem as Amazon Pay Balance / Flipkart Gift Card.
                    </p>
                  </div>

                  {/* Rewards Card */}
                  <div className="bg-secondary/30 rounded-2xl p-6 border border-border">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <Gift className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">Rewards available for payment</p>
                        <p className="text-3xl font-bold text-foreground">₹{rewardsBalance.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You can redeem Rewards as Amazon Pay Balance or Flipkart Gift Card.
                    </p>
                  </div>
                </div>

                {/* Request Payment Button */}
                <div className="flex justify-center gap-4 mb-8">
                  <Button
                    onClick={() => setStep('selection')}
                    className="px-8 py-3 bg-gradient-primary hover:opacity-90"
                    disabled={cashbackBalance <= 0 && rewardsBalance <= 0}
                  >
                    Request Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/payment-history')}
                    className="px-8 py-3"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Payment History
                  </Button>
                </div>

                {/* Recent Payment Requests Section */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Recent Payment Requests</h2>
                    {paymentRequests.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate('/payment-history')}
                        className="text-primary"
                      >
                        View All
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                  
                  {loadingPaymentRequests ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-6 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : paymentRequests.length === 0 ? (
                    <div className="p-8 text-center border rounded-xl bg-muted/30">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground font-medium">No payment requests yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Your payment requests will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentRequests.slice(0, 5).map((request) => {
                        const attrs = request.attributes;
                        const amount = parseFloat(attrs.total_amount || '0');
                        const month = attrs.month || '';
                        const year = attrs.year || '';
                        const cashoutId = attrs.cashout_id;
                        
                        return (
                          <button
                            key={request.id}
                            onClick={() => cashoutId && navigate(`/payment-history/${cashoutId}`)}
                            className="w-full p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">
                                  {month} {year}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {attrs.status || 'Processed'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                  ₹{amount.toFixed(2)}
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

              </>
            )}
          </div>
        )}

        {/* Step 1.5: Select Wallet Type - 3 Options */}
        {step === 'selection' && (
          <div className="animate-fade-in">
            <button
              onClick={() => setStep('overview')}
              className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-xl font-semibold text-foreground mb-6">
              Select Wallet Type
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cashback Only - All 4 methods */}
              <button
                onClick={() => handleWalletSelect('cashback')}
                disabled={cashbackBalance <= 0}
                className={
                  "card-elevated p-6 text-left transition-colors " +
                  (cashbackBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary")
                }
                aria-disabled={cashbackBalance <= 0}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Cashback</p>
                    <p className="text-2xl font-bold text-primary mb-2">₹{cashbackBalance.toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Bank</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">UPI</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Rewards Only - Amazon & Flipkart only */}
              <button
                onClick={() => handleWalletSelect('rewards')}
                disabled={rewardsBalance <= 0}
                className={
                  "card-elevated p-6 text-left transition-colors " +
                  (rewardsBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary")
                }
                aria-disabled={rewardsBalance <= 0}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Rewards</p>
                    <p className="text-2xl font-bold text-primary mb-2">₹{rewardsBalance.toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Cashback + Rewards - Amazon & Flipkart only */}
              <button
                onClick={() => handleWalletSelect('cashback_and_rewards')}
                disabled={cashbackBalance + rewardsBalance <= 0}
                className={
                  "card-elevated p-6 text-left transition-colors " +
                  (cashbackBalance + rewardsBalance <= 0
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:border-primary")
                }
                aria-disabled={cashbackBalance + rewardsBalance <= 0}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Cashback + Rewards</p>
                    <p className="text-2xl font-bold text-primary mb-2">₹{(cashbackBalance + rewardsBalance).toFixed(2)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                      <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Payment Method */}
        {step === 'method' && (
          <div className="animate-fade-in">
            <button
              onClick={handleBack}
              className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Blue Header */}
            <div className="bg-gradient-primary text-primary-foreground rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                  {selectedWallet === 'cashback' && <Wallet className="w-7 h-7" />}
                  {selectedWallet === 'rewards' && <Gift className="w-7 h-7" />}
                  {selectedWallet === 'cashback_and_rewards' && <Wallet className="w-7 h-7" />}
                </div>
                <div>
                  <p className="text-primary-foreground/80 text-sm">
                    Request {getWalletLabel()}
                  </p>
                  <p className="text-3xl font-bold">
                    ₹{getPaymentAmount().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <h2 className="text-lg font-semibold text-foreground mb-4">
              Choose Your Payment Method
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Amazon Pay - Always available */}
              <button
                onClick={() => handleMethodSelect('amazon')}
                className="card-elevated p-5 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 bg-[#FF9900]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#FF9900]/20 transition-colors">
                  <span className="text-2xl font-bold text-[#FF9900]">A</span>
                </div>
                <p className="font-medium text-foreground text-sm">Amazon Pay Balance</p>
              </button>

              {/* Flipkart - Always available */}
              <button
                onClick={() => handleMethodSelect('flipkart')}
                className="card-elevated p-5 text-center hover:border-primary transition-colors group"
              >
                <div className="w-14 h-14 bg-[#2874F0]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#2874F0]/20 transition-colors">
                  <span className="text-2xl font-bold text-[#2874F0]">F</span>
                </div>
                <p className="font-medium text-foreground text-sm">Flipkart Gift Card</p>
              </button>

              {/* Bank Transfer - Only for Cashback */}
              {selectedWallet === 'cashback' && (
                <button
                  onClick={() => handleMethodSelect('bank')}
                  className="card-elevated p-5 text-center hover:border-primary transition-colors group"
                >
                  <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-7 h-7 text-primary" />
                  </div>
                  <p className="font-medium text-foreground text-sm">Bank Transfer</p>
                </button>
              )}

              {/* UPI - Only for Cashback */}
              {selectedWallet === 'cashback' && (
                <button
                  onClick={() => handleMethodSelect('upi')}
                  className="card-elevated p-5 text-center hover:border-primary transition-colors group"
                >
                  <div className="w-14 h-14 bg-[#5F259F]/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[#5F259F]/20 transition-colors">
                    <Smartphone className="w-7 h-7 text-[#5F259F]" />
                  </div>
                  <p className="font-medium text-foreground text-sm">UPI</p>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Enter Details - Same component for Mobile & Desktop */}
        {step === 'details' && (
          <div className="animate-fade-in">
            <button
              onClick={handleBack}
              className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="max-w-md mx-auto">
              {selectedMethod && (
                <PaymentDetailsForm
                  method={selectedMethod as PaymentMethodType}
                  amount={getPaymentAmount()}
                  walletLabel={`${getWalletLabel()} available for payment`}
                  isLoading={isLoading}
                  onSubmit={(data: PaymentFormData) => {
                    // Keep state for OTP + submit step
                    setMobileNumber(data.mobileNumber);
                    setEmail(data.email);
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

        {/* Step 4: Verify OTP */}
        {step === 'otp' && (
          <div className="animate-fade-in">
            <button
              onClick={handleBack}
              className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="max-w-lg mx-auto">
              <div className="card-elevated p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                
                <h2 className="text-lg font-semibold text-foreground mb-2">Verify OTP</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Enter the OTP sent to your registered mobile and email
                </p>

                <Input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    const digits = (pasted || '').replace(/\D/g, '').slice(0, 6);
                    if (digits) {
                      e.preventDefault();
                      setOtp(digits);
                    }
                  }}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-12 text-center text-xl tracking-[0.5em] font-mono mb-4"
                />

                <div className="mb-6">
                  <button
                    onClick={handleSendOTP}
                    disabled={countdown > 0 || isLoading}
                    className={`text-sm ${countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>

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

                <Button
                  onClick={handleVerifyAndPay}
                  disabled={otp.trim().length !== 6 || !/^\d{6}$/.test(otp.trim()) || isLoading}
                  className="w-full h-12 bg-gradient-primary hover:opacity-90"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 'success' && (
          <div className="animate-fade-in">
            <div className="max-w-lg mx-auto">
              <div className="card-elevated p-8 text-center">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-10 h-10 text-success" />
                </div>
                
                <h2 className="text-2xl font-semibold text-foreground mb-2">Payment Request Submitted!</h2>
                <p className="text-muted-foreground mb-6">
                  Your payment of ₹{getPaymentAmount().toFixed(2)} via {getMethodLabel(selectedMethod)} has been submitted successfully.
                </p>

                <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Wallet</span>
                    <span className="font-medium">{getWalletLabel()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium text-success">₹{getPaymentAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{getMethodLabel(selectedMethod)}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                  Your payment will be processed within 24-48 hours. You will receive a notification once it's done.
                </p>

                <Button
                  onClick={resetForm}
                  className="w-full h-12 bg-gradient-primary hover:opacity-90"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Payments;
