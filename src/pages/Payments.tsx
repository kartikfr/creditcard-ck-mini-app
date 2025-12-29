import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Building2, ChevronRight, IndianRupee, ShieldCheck, Gift, Smartphone, ArrowLeft, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoginPrompt from '@/components/LoginPrompt';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  fetchEarnings, 
  sendPaymentRequestOTP, 
  verifyPaymentRequestOTP,
  submitAmazonPayment,
  submitFlipkartPayment,
  submitUPIPayment,
  submitBankPayment
} from '@/lib/api';

type WalletType = 'cashback' | 'rewards' | 'cashback_and_rewards' | null;
type PaymentMethod = 'amazon' | 'flipkart' | 'bank' | 'upi' | null;
type Step = 'overview' | 'selection' | 'method' | 'details' | 'otp' | 'success';

const Payments: React.FC = () => {
  const { toast } = useToast();
  const { user, accessToken, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  
  // Use SettingsPageLayout for desktop, AppLayout for mobile
  const Layout = isMobile ? AppLayout : SettingsPageLayout;
  
  const [step, setStep] = useState<Step>('overview');
  const [selectedWallet, setSelectedWallet] = useState<WalletType>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  
  // Payment details
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  
  // OTP flow
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Earnings data
  const [cashbackBalance, setCashbackBalance] = useState(0);
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [loadingEarnings, setLoadingEarnings] = useState(true);

  const minimumPayout = 250;

  useEffect(() => {
    const loadEarnings = async () => {
      if (!accessToken) {
        setLoadingEarnings(false);
        return;
      }
      try {
        const response = await fetchEarnings(accessToken);
        const attrs = response?.data?.attributes ?? response?.data?.[0]?.attributes;
        if (attrs) {
          setCashbackBalance(parseFloat(attrs.confirmed_cashback) || 0);
          setRewardsBalance(parseFloat(attrs.confirmed_rewards) || 0);
        }
      } catch (error) {
        console.error('Failed to load earnings:', error);
      } finally {
        setLoadingEarnings(false);
      }
    };
    loadEarnings();
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
      // Step 1: Verify OTP
      await verifyPaymentRequestOTP(accessToken, otpGuid, otp);
      
      // Step 2: Submit payment based on selected method
      const paymentType = selectedWallet as 'cashback' | 'rewards' | 'cashback_and_rewards';
      
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
          await submitBankPayment(accessToken, 'cashback', ifscCode, accountHolder, accountNumber, otpGuid);
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
    setOtp('');
    setOtpGuid('');
  };

  const isDetailsValid = () => {
    if (selectedMethod === 'amazon') {
      // Mobile must be 10 digits starting with 6-9
      return /^[6-9][0-9]{9}$/.test(mobileNumber);
    } else if (selectedMethod === 'flipkart') {
      // Valid email
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    } else if (selectedMethod === 'upi') {
      return upiId.includes('@');
    } else if (selectedMethod === 'bank') {
      return accountNumber.length >= 9 && ifscCode.length === 11 && accountHolder.length > 2;
    }
    return false;
  };

  const getMethodLabel = (method: PaymentMethod) => {
    switch (method) {
      case 'amazon': return 'Amazon Pay Balance';
      case 'flipkart': return 'Flipkart Gift Card';
      case 'bank': return 'Bank Transfer';
      case 'upi': return 'UPI';
      default: return '';
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
                <div className="flex justify-center">
                  <Button
                    onClick={() => setStep('selection')}
                    className="px-8 py-3 bg-gradient-primary hover:opacity-90"
                    disabled={cashbackBalance < minimumPayout && rewardsBalance < minimumPayout}
                  >
                    Request Payment
                  </Button>
                </div>

                {(cashbackBalance < minimumPayout && rewardsBalance < minimumPayout) && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Minimum balance of ₹{minimumPayout} required to request payment
                  </p>
                )}
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
              {cashbackBalance >= minimumPayout && (
                <button
                  onClick={() => handleWalletSelect('cashback')}
                  className="card-elevated p-6 text-left hover:border-primary transition-colors"
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
              )}

              {/* Rewards Only - Amazon & Flipkart only */}
              {rewardsBalance >= minimumPayout && (
                <button
                  onClick={() => handleWalletSelect('rewards')}
                  className="card-elevated p-6 text-left hover:border-amber-500 transition-colors"
                >
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                      <Gift className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">Rewards</p>
                      <p className="text-2xl font-bold text-amber-500 mb-2">₹{rewardsBalance.toFixed(2)}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* Cashback + Rewards - Amazon & Flipkart only */}
              {cashbackBalance >= minimumPayout && rewardsBalance >= minimumPayout && (
                <button
                  onClick={() => handleWalletSelect('cashback_and_rewards')}
                  className="card-elevated p-6 text-left hover:border-success transition-colors"
                >
                  <div className="flex flex-col gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">Cashback + Rewards</p>
                      <p className="text-2xl font-bold text-success mb-2">₹{(cashbackBalance + rewardsBalance).toFixed(2)}</p>
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Amazon</span>
                        <span className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Flipkart</span>
                      </div>
                    </div>
                  </div>
                </button>
              )}
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

        {/* Step 3: Enter Details */}
        {step === 'details' && (
          <div className="animate-fade-in">
            <button
              onClick={handleBack}
              className="text-primary text-sm mb-6 flex items-center gap-2 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="max-w-lg mx-auto">
              <div className="card-elevated p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    {selectedMethod === 'amazon' && <span className="text-xl font-bold text-[#FF9900]">A</span>}
                    {selectedMethod === 'flipkart' && <span className="text-xl font-bold text-[#2874F0]">F</span>}
                    {selectedMethod === 'bank' && <Building2 className="w-6 h-6 text-primary" />}
                    {selectedMethod === 'upi' && <Smartphone className="w-6 h-6 text-[#5F259F]" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{getMethodLabel(selectedMethod)}</p>
                    <p className="text-sm text-muted-foreground">Enter your payment details</p>
                  </div>
                </div>

                {/* Payment Amount Display */}
                <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount to be transferred</span>
                    <span className="text-xl font-bold text-success">₹{getPaymentAmount().toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your entire {getWalletLabel().toLowerCase()} balance will be transferred
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Amazon Pay - Mobile Number */}
                  {selectedMethod === 'amazon' && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Mobile Number (linked to Amazon)
                      </label>
                      <Input
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="h-12"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Amazon Pay balance will be credited to this mobile number
                      </p>
                    </div>
                  )}

                  {/* Flipkart - Email */}
                  {selectedMethod === 'flipkart' && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Address (linked to Flipkart)
                      </label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Flipkart Gift Card will be sent to this email
                      </p>
                    </div>
                  )}

                  {/* UPI ID */}
                  {selectedMethod === 'upi' && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">UPI ID</label>
                      <Input
                        type="text"
                        placeholder="yourname@paytm"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  )}

                  {/* Bank Details */}
                  {selectedMethod === 'bank' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Account Holder Name</label>
                        <Input
                          type="text"
                          placeholder="As per bank records"
                          value={accountHolder}
                          onChange={(e) => setAccountHolder(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Account Number</label>
                        <Input
                          type="text"
                          placeholder="Enter account number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                          className="h-12"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">IFSC Code</label>
                        <Input
                          type="text"
                          placeholder="e.g., HDFC0001234"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase().slice(0, 11))}
                          className="h-12"
                        />
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleSendOTP}
                    disabled={!isDetailsValid() || isLoading}
                    className="w-full h-12 bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Send OTP to Verify'}
                  </Button>
                </div>
              </div>
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
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
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
                  disabled={otp.length !== 6 || isLoading}
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
