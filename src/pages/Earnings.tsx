import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, ChevronRight, Calendar, ArrowUpRight, Filter, Search, Wallet, CreditCard, Building2, Clock, CheckCircle, IndianRupee, ShieldCheck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { fetchEarnings } from '@/lib/api';

// Mock data
const mockTransactions = [
  {
    id: 1,
    store: 'Amazon',
    orderId: 'AMZ123456789',
    amount: 150.0,
    status: 'confirmed',
    transactionDate: '2024-12-10',
    confirmationDate: '2024-12-15',
  },
  {
    id: 2,
    store: 'Flipkart',
    orderId: 'FLK987654321',
    amount: 250.5,
    status: 'pending',
    transactionDate: '2024-12-12',
    expectedConfirmation: '2024-12-27',
  },
  {
    id: 3,
    store: 'Myntra',
    orderId: 'MYN456789123',
    amount: 89.0,
    status: 'confirmed',
    transactionDate: '2024-12-08',
    confirmationDate: '2024-12-14',
  },
  {
    id: 4,
    store: 'Nykaa',
    orderId: 'NYK789123456',
    amount: 75.25,
    status: 'pending',
    transactionDate: '2024-12-14',
    expectedConfirmation: '2024-12-29',
  },
  {
    id: 5,
    store: 'Ajio',
    orderId: 'AJI321654987',
    amount: 120.0,
    status: 'cancelled',
    transactionDate: '2024-12-05',
    cancelledDate: '2024-12-10',
  },
];

// Mock payment history
const mockPaymentHistory = [
  { id: 1, month: 'December', year: 2024, amount: 1500, status: 'completed', date: '2024-12-01' },
  { id: 2, month: 'November', year: 2024, amount: 2000, status: 'completed', date: '2024-11-15' },
  { id: 3, month: 'October', year: 2024, amount: 1250, status: 'completed', date: '2024-10-20' },
];

const statusColors: Record<string, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  cancelled: 'status-cancelled',
  paid: 'bg-primary/10 text-primary',
};

type PaymentMethod = 'upi' | 'bank' | null;
type PaymentStep = 'method' | 'details' | 'otp' | 'confirm';

const Earnings: React.FC = () => {
  const { toast } = useToast();
  const { user, accessToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  // Earnings API state
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [earningsError, setEarningsError] = useState<string | null>(null);
  const [totalEarned, setTotalEarned] = useState<number | null>(null);
  const [totalConfirmedApi, setTotalConfirmedApi] = useState<number | null>(null);
  const [totalPendingApi, setTotalPendingApi] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!accessToken) return;
      setIsLoadingEarnings(true);
      setEarningsError(null);
      try {
        // This will hit /users/earnings exactly as requested
        const res = await fetchEarnings(accessToken);
        const attrs = res?.data?.attributes ?? res?.data?.[0]?.attributes;

        const parseMoney = (v: any): number | null => {
          if (typeof v === 'number') return v;
          if (typeof v === 'string') {
            const n = Number(v.replace(/,/g, ''));
            return Number.isFinite(n) ? n : null;
          }
          return null;
        };

        setTotalEarned(parseMoney(attrs?.total_earned));
        setTotalConfirmedApi(parseMoney(attrs?.total_confirmed));
        setTotalPendingApi(parseMoney(attrs?.total_pending));
      } catch (e: any) {
        setEarningsError(String(e?.message || 'Failed to load earnings'));
      } finally {
        setIsLoadingEarnings(false);
      }
    };

    run();
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

  const availableBalance = 2950.25;
  const minimumPayout = 250;

  const filteredTransactions = mockTransactions.filter((txn) => {
    const matchesSearch =
      txn.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || txn.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const totalConfirmed = mockTransactions
    .filter((t) => t.status === 'confirmed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPending = mockTransactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

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
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            My Earnings
          </h1>
          <p className="text-muted-foreground">Track all your cashback and rewards</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Earnings */}
          <div className="card-elevated p-6 bg-gradient-primary text-primary-foreground">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Total Earned</p>
                <p className="text-3xl font-bold">
                  {isLoadingEarnings ? '—' : `₹${(totalEarned ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            {earningsError ? (
              <p className="text-sm text-primary-foreground/80">{earningsError}</p>
            ) : (
              <div className="flex items-center text-sm text-primary-foreground/80">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                <span>Live from your account</span>
              </div>
            )}
          </div>

          {/* Confirmed */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-success">
                  ₹{(totalConfirmedApi ?? totalConfirmed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-success" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleOpenPayment}>
              Request Payment
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Pending */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Pending</p>
                <p className="text-3xl font-bold text-warning">
                  ₹{(totalPendingApi ?? totalPending).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Usually confirmed within 30-60 days
            </p>
          </div>
        </div>

        {/* Transactions */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full md:w-auto mb-4 grid grid-cols-4 md:flex">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="card-elevated p-8 text-center">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="card-elevated p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-xl font-bold text-primary">
                      {txn.store.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{txn.store}</p>
                        <span className={`status-badge ${statusColors[txn.status]}`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        Order: {txn.orderId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {txn.transactionDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.status === 'cancelled' 
                          ? 'text-muted-foreground line-through' 
                          : txn.status === 'confirmed' 
                            ? 'text-success' 
                            : 'text-foreground'
                      }`}>
                        ₹{txn.amount.toFixed(2)}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </section>
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
                  Minimum payout: ₹{minimumPayout}
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
