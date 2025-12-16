import React, { useState } from 'react';
import { Wallet, CreditCard, Building2, ChevronRight, Clock, CheckCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Mock payment history
const mockPaymentHistory = [
  { id: 1, month: 'December', year: 2024, amount: 1500, status: 'completed', date: '2024-12-01' },
  { id: 2, month: 'November', year: 2024, amount: 2000, status: 'completed', date: '2024-11-15' },
  { id: 3, month: 'October', year: 2024, amount: 1250, status: 'completed', date: '2024-10-20' },
];

type PaymentMethod = 'upi' | 'bank' | null;
type Step = 'method' | 'details' | 'otp' | 'confirm';

const Payments: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('request');
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(null);
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const availableBalance = 2950.25;
  const minimumPayout = 250;

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep('details');
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep('otp');
    setCountdown(30);
    
    toast({
      title: 'OTP Sent',
      description: `OTP sent to +91 ${user?.mobileNumber}`,
    });

    // Countdown timer
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
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    
    toast({
      title: 'Payment Request Submitted!',
      description: `₹${amount} will be transferred within 24-48 hours`,
    });

    // Reset form
    setStep('method');
    setSelectedMethod(null);
    setAmount('');
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolder('');
    setOtp('');
    setActiveTab('history');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('method');
      setSelectedMethod(null);
    } else if (step === 'otp') {
      setStep('details');
    }
  };

  const isDetailsValid = () => {
    const amountNum = parseFloat(amount);
    if (!amount || amountNum < minimumPayout || amountNum > availableBalance) return false;
    
    if (selectedMethod === 'upi') {
      return upiId.includes('@');
    } else if (selectedMethod === 'bank') {
      return accountNumber.length >= 9 && ifscCode.length === 11 && accountHolder.length > 2;
    }
    return false;
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            Payments
          </h1>
          <p className="text-muted-foreground">Request payouts and view payment history</p>
        </header>

        {/* Balance Card */}
        <div className="card-elevated p-6 mb-8 bg-gradient-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm mb-1">Available Balance</p>
              <p className="text-4xl font-bold">₹{availableBalance.toFixed(2)}</p>
              <p className="text-sm text-primary-foreground/70 mt-2">
                Minimum payout: ₹{minimumPayout}
              </p>
            </div>
            <div className="w-16 h-16 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-2">
            <TabsTrigger value="request">Request Payment</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="request">
            {/* Step 1: Select Payment Method */}
            {step === 'method' && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Select Payment Method
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleMethodSelect('upi')}
                    className="card-elevated p-6 text-left hover:border-primary"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">UPI</p>
                        <p className="text-sm text-muted-foreground">
                          Instant transfer to your UPI ID
                        </p>
                        <p className="text-xs text-primary mt-2">Min: ₹250 | Processing: 24-48 hrs</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>

                  <button
                    onClick={() => handleMethodSelect('bank')}
                    className="card-elevated p-6 text-left hover:border-primary"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground mb-1">Bank Transfer</p>
                        <p className="text-sm text-muted-foreground">
                          Direct transfer to bank account
                        </p>
                        <p className="text-xs text-primary mt-2">Min: ₹500 | Processing: 3-5 days</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter Details */}
            {step === 'details' && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="text-primary text-sm mb-4 flex items-center hover:underline"
                >
                  ← Back to methods
                </button>

                <div className="card-elevated p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      {selectedMethod === 'upi' ? (
                        <CreditCard className="w-6 h-6 text-primary" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {selectedMethod === 'upi' ? 'UPI Payment' : 'Bank Transfer'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Enter your payment details
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Amount */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4" />
                        Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          ₹
                        </span>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-12 pl-8"
                          max={availableBalance}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available: ₹{availableBalance.toFixed(2)}
                      </p>
                    </div>

                    {selectedMethod === 'upi' ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          UPI ID
                        </label>
                        <Input
                          type="text"
                          placeholder="yourname@paytm"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="h-12"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            Account Holder Name
                          </label>
                          <Input
                            type="text"
                            placeholder="As per bank records"
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            className="h-12"
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
                            className="h-12"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">
                            IFSC Code
                          </label>
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
            )}

            {/* Step 3: Verify OTP */}
            {step === 'otp' && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="text-primary text-sm mb-4 flex items-center hover:underline"
                >
                  ← Back
                </button>

                <div className="card-elevated p-6 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Verify OTP
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Enter the OTP sent to +91 {user?.mobileNumber}
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
                      disabled={countdown > 0}
                      className={`text-sm ${
                        countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'
                      }`}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                    </button>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
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
                    className="w-full h-12 bg-gradient-primary hover:opacity-90"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Verify & Submit Request'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {mockPaymentHistory.length === 0 ? (
                <div className="card-elevated p-8 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No payment history yet</p>
                </div>
              ) : (
                mockPaymentHistory.map((payment) => (
                  <div key={payment.id} className="card-elevated p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-success" />
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Payments;
