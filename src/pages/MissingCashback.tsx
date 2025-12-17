import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ChevronLeft, Search, Calendar, Hash, Clock, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { 
  fetchMissingCashbackRetailers, 
  fetchExitClickDates, 
  validateMissingCashback,
  fetchMissingCashbackQueue 
} from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface Retailer {
  id: string;
  type: string;
  attributes: {
    store_id: string;
    store_name: string;
    store_logo: string;
    total_clicks: number;
    tracked_clicks: number;
  };
}

interface ExitClick {
  id: string;
  type: string;
  attributes: {
    exit_id: string;
    exit_date: string;
  };
}

interface Claim {
  id: string;
  type: string;
  attributes: {
    store_name: string;
    order_id: string;
    amount?: string;
    status: string;
    created_at: string;
    resolved_at?: string;
  };
}

type Step = 'retailers' | 'dates' | 'form' | 'success';

const MissingCashback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accessToken, isAuthenticated } = useAuth();
  
  // Step management
  const [step, setStep] = useState<Step>('retailers');
  const [activeTab, setActiveTab] = useState('new');
  
  // Data states
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [exitClicks, setExitClicks] = useState<ExitClick[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  
  // Selection states
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [selectedClick, setSelectedClick] = useState<ExitClick | null>(null);
  const [orderId, setOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Loading/error states
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isLoadingExitClicks, setIsLoadingExitClicks] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retailersError, setRetailersError] = useState<string | null>(null);
  const [exitClicksError, setExitClicksError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  
  // Claims filter - API requires a specific status, default to Pending
  const [statusFilter, setStatusFilter] = useState<string>('Pending');

  // Load retailers on mount
  useEffect(() => {
    if (accessToken && activeTab === 'new') {
      loadRetailers();
    }
  }, [accessToken, activeTab]);

  // Load claims when tab changes
  useEffect(() => {
    if (accessToken && activeTab === 'claims') {
      loadClaims();
    }
  }, [accessToken, activeTab, statusFilter]);

  const loadRetailers = async () => {
    if (!accessToken) return;
    setIsLoadingRetailers(true);
    setRetailersError(null);
    
    try {
      const response = await fetchMissingCashbackRetailers(accessToken, 1, 100);
      setRetailers(response.data || []);
    } catch (error: any) {
      console.error('Failed to load retailers:', error);
      setRetailersError(error.message || 'Failed to load retailers');
    } finally {
      setIsLoadingRetailers(false);
    }
  };

  const loadExitClicks = async (storeId: string) => {
    if (!accessToken) return;
    setIsLoadingExitClicks(true);
    setExitClicksError(null);
    
    try {
      const response = await fetchExitClickDates(accessToken, storeId);
      setExitClicks(response.data || []);
    } catch (error: any) {
      console.error('Failed to load exit clicks:', error);
      setExitClicksError(error.message || 'Failed to load visit dates');
    } finally {
      setIsLoadingExitClicks(false);
    }
  };

  const loadClaims = async () => {
    if (!accessToken) return;
    setIsLoadingClaims(true);
    setClaimsError(null);
    
    try {
      const response = await fetchMissingCashbackQueue(accessToken, statusFilter, 1, 50);
      // Handle both array and empty responses
      const claimsData = response?.data;
      setClaims(Array.isArray(claimsData) ? claimsData : []);
    } catch (error: any) {
      console.error('Failed to load claims:', error);
      // If error is about no data found, treat as empty rather than error
      const errorMsg = error.message?.toLowerCase() || '';
      if (errorMsg.includes('not found') || errorMsg.includes('no data') || errorMsg.includes('empty')) {
        setClaims([]);
      } else {
        setClaimsError(error.message || 'Failed to load claims');
      }
    } finally {
      setIsLoadingClaims(false);
    }
  };

  const handleSelectRetailer = (retailer: Retailer) => {
    setSelectedRetailer(retailer);
    setStep('dates');
    loadExitClicks(retailer.attributes.store_id);
  };

  const handleSelectClick = (click: ExitClick) => {
    setSelectedClick(click);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!orderId || !selectedRetailer || !selectedClick) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the Order ID',
        variant: 'destructive',
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: 'Not Authenticated',
        description: 'Please log in to submit a claim',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    setValidationResult(null);
    
    try {
      const response = await validateMissingCashback(
        accessToken,
        selectedRetailer.attributes.store_id,
        selectedClick.attributes.exit_date,
        orderId
      );
      
      setValidationResult(response);
      setStep('success');
      
      toast({
        title: 'Claim Submitted!',
        description: 'Your missing cashback claim has been submitted for review.',
      });
    } catch (error: any) {
      console.error('Failed to submit claim:', error);
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit your claim. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'dates') {
      setStep('retailers');
      setSelectedRetailer(null);
      setExitClicks([]);
    } else if (step === 'form') {
      setStep('dates');
      setSelectedClick(null);
      setOrderId('');
    }
  };

  const handleNewClaim = () => {
    setStep('retailers');
    setSelectedRetailer(null);
    setSelectedClick(null);
    setOrderId('');
    setValidationResult(null);
    setActiveTab('new');
  };

  const filteredRetailers = retailers.filter(r => 
    r.attributes.store_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'resolved':
        return 'status-confirmed';
      case 'rejected':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Clock className="w-3 h-3 mr-1" />;
      case 'resolved':
        return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'rejected':
        return <XCircle className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <div className="card-elevated p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to submit missing cashback claims</p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Missing Cashback
            </h1>
            <p className="text-sm text-muted-foreground">
              Didn't receive your cashback? Let us help you recover it
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-2">
            <TabsTrigger value="new">New Claim</TabsTrigger>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            {/* Progress Steps */}
            {step !== 'success' && (
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
                
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search stores..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isLoadingRetailers ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="card-elevated p-4 flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : retailersError ? (
                  <div className="card-elevated p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive mb-4">{retailersError}</p>
                    <Button onClick={loadRetailers} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : filteredRetailers.length === 0 ? (
                  <div className="card-elevated p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchQuery ? 'No stores match your search' : 'No recent store visits found'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRetailers.map((retailer) => (
                      <button
                        key={retailer.id}
                        onClick={() => handleSelectRetailer(retailer)}
                        className="card-elevated p-4 flex items-center gap-4 text-left hover:border-primary transition-colors"
                      >
                        <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center overflow-hidden">
                          {retailer.attributes.store_logo ? (
                            <img 
                              src={retailer.attributes.store_logo} 
                              alt={retailer.attributes.store_name}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-2xl">🏪</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {retailer.attributes.store_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {retailer.attributes.total_clicks} clicks | {retailer.attributes.tracked_clicks} tracked
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
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
                  <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center overflow-hidden">
                    {selectedRetailer.attributes.store_logo ? (
                      <img 
                        src={selectedRetailer.attributes.store_logo} 
                        alt={selectedRetailer.attributes.store_name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-2xl">🏪</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{selectedRetailer.attributes.store_name}</p>
                    <p className="text-sm text-muted-foreground">Select your visit date</p>
                  </div>
                </div>

                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  When did you visit this store?
                </h2>

                {isLoadingExitClicks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="card-elevated p-4 flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : exitClicksError ? (
                  <div className="card-elevated p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive mb-4">{exitClicksError}</p>
                    <Button onClick={() => loadExitClicks(selectedRetailer.attributes.store_id)} variant="outline">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : exitClicks.length === 0 ? (
                  <div className="card-elevated p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No visit history found for this store</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exitClicks.map((click) => (
                      <button
                        key={click.id}
                        onClick={() => handleSelectClick(click)}
                        className="card-elevated p-4 w-full flex items-center justify-between hover:border-primary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-foreground">
                              {formatDate(click.attributes.exit_date)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click ID: {click.attributes.exit_id}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
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
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center overflow-hidden">
                      {selectedRetailer.attributes.store_logo ? (
                        <img 
                          src={selectedRetailer.attributes.store_logo} 
                          alt={selectedRetailer.attributes.store_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">🏪</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selectedRetailer.attributes.store_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Visit: {formatDate(selectedClick.attributes.exit_date)}
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

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !orderId}
                    className="w-full h-12 bg-gradient-primary hover:opacity-90"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Submit Claim'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {step === 'success' && (
              <div className="animate-fade-in">
                <div className="card-elevated p-8 text-center">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-success" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Claim Submitted!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your missing cashback claim has been submitted and is under review.
                  </p>
                  
                  {validationResult?.data?.attributes && (
                    <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                      <p className="text-sm text-muted-foreground">
                        {validationResult.data.attributes.message || 'Your claim is being processed.'}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3 justify-center">
                    <Button onClick={handleNewClaim} variant="outline">
                      Submit Another Claim
                    </Button>
                    <Button onClick={() => setActiveTab('claims')}>
                      View My Claims
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims">
            {/* Status Filter */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-foreground">Filter:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoadingClaims ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-elevated p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : claimsError ? (
              <div className="card-elevated p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive mb-4">{claimsError}</p>
                <Button onClick={loadClaims} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : claims.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No {statusFilter.toLowerCase()} claims found
                </p>
                <Button onClick={handleNewClaim} variant="outline">
                  Submit a Claim
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div key={claim.id} className="card-elevated p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-foreground">{claim.attributes.store_name}</p>
                        <p className="text-sm text-muted-foreground">Order: {claim.attributes.order_id}</p>
                      </div>
                      <span className={`status-badge ${getStatusColor(claim.attributes.status)}`}>
                        {getStatusIcon(claim.attributes.status)}
                        {claim.attributes.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      {claim.attributes.amount && (
                        <span className="text-muted-foreground">
                          Amount: <strong className="text-foreground">₹{claim.attributes.amount}</strong>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        Submitted: {formatDate(claim.attributes.created_at)}
                      </span>
                    </div>
                    
                    {claim.attributes.resolved_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Resolved: {formatDate(claim.attributes.resolved_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MissingCashback;