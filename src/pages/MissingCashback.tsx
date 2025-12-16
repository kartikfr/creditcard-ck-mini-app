import React, { useState } from 'react';
import { AlertCircle, ChevronRight, Search, Calendar, Hash, IndianRupee, Clock, CheckCircle, XCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// Mock retailers data
const mockRetailers = [
  { id: '100', name: 'Amazon', logo: '🛒', clicks: 3, tracked: 1 },
  { id: '101', name: 'Flipkart', logo: '📦', clicks: 2, tracked: 0 },
  { id: '102', name: 'Myntra', logo: '👕', clicks: 1, tracked: 1 },
  { id: '103', name: 'Nykaa', logo: '💄', clicks: 2, tracked: 0 },
];

// Mock exit clicks
const mockExitClicks: Record<string, Array<{ date: string; id: string }>> = {
  '100': [
    { date: '2024-12-14', id: 'STGCHKR2970223' },
    { date: '2024-12-12', id: 'STGCHKR2970224' },
    { date: '2024-12-10', id: 'STGCHKR2970225' },
  ],
  '101': [
    { date: '2024-12-13', id: 'STGCHKR2970226' },
    { date: '2024-12-11', id: 'STGCHKR2970227' },
  ],
};

// Mock claims
const mockClaims = [
  {
    id: 1,
    store: 'Amazon',
    orderId: '962-1198956-0957613',
    amount: 2500,
    status: 'pending',
    submittedDate: '2024-12-15',
  },
  {
    id: 2,
    store: 'Flipkart',
    orderId: 'OD12345678901',
    amount: 1800,
    status: 'resolved',
    submittedDate: '2024-12-10',
    resolvedDate: '2024-12-14',
  },
];

type Step = 'retailers' | 'dates' | 'form' | 'claims';

const MissingCashback: React.FC = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('retailers');
  const [selectedRetailer, setSelectedRetailer] = useState<typeof mockRetailers[0] | null>(null);
  const [selectedClick, setSelectedClick] = useState<{ date: string; id: string } | null>(null);
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

  const handleSelectRetailer = (retailer: typeof mockRetailers[0]) => {
    setSelectedRetailer(retailer);
    setStep('dates');
  };

  const handleSelectClick = (click: { date: string; id: string }) => {
    setSelectedClick(click);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!orderId || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast({
      title: 'Claim Submitted!',
      description: 'Your missing cashback claim has been submitted successfully.',
    });

    // Reset form
    setStep('claims');
    setSelectedRetailer(null);
    setSelectedClick(null);
    setOrderId('');
    setAmount('');
    setIsSubmitting(false);
    setActiveTab('claims');
  };

  const handleBack = () => {
    if (step === 'dates') {
      setStep('retailers');
      setSelectedRetailer(null);
    } else if (step === 'form') {
      setStep('dates');
      setSelectedClick(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            Missing Cashback
          </h1>
          <p className="text-muted-foreground">
            Didn't receive your cashback? Let us help you recover it
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-2">
            <TabsTrigger value="new">New Claim</TabsTrigger>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            {/* Progress Steps */}
            {step !== 'claims' && (
              <div className="flex items-center justify-center gap-2 mb-8">
                {['retailers', 'dates', 'form'].map((s, i) => (
                  <React.Fragment key={s}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step === s
                          ? 'bg-primary text-primary-foreground'
                          : ['retailers', 'dates', 'form'].indexOf(step) > i
                          ? 'bg-success text-success-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < 2 && (
                      <div
                        className={`w-12 h-1 rounded ${
                          ['retailers', 'dates', 'form'].indexOf(step) > i
                            ? 'bg-success'
                            : 'bg-muted'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Step 1: Select Retailer */}
            {step === 'retailers' && (
              <div className="animate-fade-in">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Select the store where your cashback is missing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {mockRetailers.map((retailer) => (
                    <button
                      key={retailer.id}
                      onClick={() => handleSelectRetailer(retailer)}
                      className="card-elevated p-4 flex items-center gap-4 text-left hover:border-primary"
                    >
                      <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-2xl">
                        {retailer.logo}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{retailer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {retailer.clicks} clicks | {retailer.tracked} tracked
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Visit Date */}
            {step === 'dates' && selectedRetailer && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="text-primary text-sm mb-4 flex items-center hover:underline"
                >
                  ← Back to retailers
                </button>
                
                <div className="card-elevated p-4 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-2xl">
                    {selectedRetailer.logo}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{selectedRetailer.name}</p>
                    <p className="text-sm text-muted-foreground">Select your visit date</p>
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  When did you visit this store?
                </h2>

                <div className="space-y-3">
                  {(mockExitClicks[selectedRetailer.id] || []).map((click) => (
                    <button
                      key={click.id}
                      onClick={() => handleSelectClick(click)}
                      className="card-elevated p-4 w-full flex items-center justify-between hover:border-primary"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">{click.date}</p>
                          <p className="text-sm text-muted-foreground">Click ID: {click.id}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Enter Order Details */}
            {step === 'form' && selectedRetailer && selectedClick && (
              <div className="animate-fade-in">
                <button
                  onClick={handleBack}
                  className="text-primary text-sm mb-4 flex items-center hover:underline"
                >
                  ← Back to dates
                </button>

                <div className="card-elevated p-4 mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-2xl">
                      {selectedRetailer.logo}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedRetailer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Visit: {selectedClick.date}
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Enter your order details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Order ID
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., 962-1198956-0957613"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      💡 Find this in your order confirmation email
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4" />
                      Transaction Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        placeholder="Enter order amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="h-12 pl-8"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !orderId || !amount}
                    className="w-full h-12 bg-gradient-primary hover:opacity-90"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims">
            <div className="space-y-4">
              {mockClaims.length === 0 ? (
                <div className="card-elevated p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No claims submitted yet</p>
                  <Button
                    onClick={() => {
                      setActiveTab('new');
                      setStep('retailers');
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Submit a Claim
                  </Button>
                </div>
              ) : (
                mockClaims.map((claim) => (
                  <div key={claim.id} className="card-elevated p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{claim.store}</p>
                        <p className="text-sm text-muted-foreground">Order: {claim.orderId}</p>
                      </div>
                      <span
                        className={`status-badge ${
                          claim.status === 'pending' ? 'status-pending' : 'status-confirmed'
                        }`}
                      >
                        {claim.status === 'pending' ? (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Under Review
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Amount: <strong className="text-foreground">₹{claim.amount}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Submitted: {claim.submittedDate}
                      </span>
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

export default MissingCashback;
