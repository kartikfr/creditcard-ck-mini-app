import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ChevronLeft, Search, Calendar, Hash, Clock, CheckCircle, XCircle, Loader2, RefreshCw, IndianRupee, Upload, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { 
  fetchMissingCashbackRetailers, 
  fetchExitClickDates, 
  validateMissingCashback,
  submitMissingCashbackQueue,
  fetchMissingCashbackQueue
} from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';
import { Badge } from '@/components/ui/badge';

interface Retailer {
  id: string | number;
  type: string;
  attributes: {
    store_id?: string;
    store_name?: string;
    store_logo?: string;
    total_clicks?: number;
    tracked_clicks?: number;
    report_merchant_name?: string;
    group?: string;
    tracking_speed?: string;
    image_url?: string;
  };
}

interface ExitClick {
  id: string;
  type: string;
  attributes: {
    exit_id: string;
    exit_date?: string;
    exitclick_date?: string;
    month?: string;
  };
}

interface Claim {
  id: string;
  type: string;
  attributes: {
    store_name?: string;
    merchant_name?: string;
    report_store_name?: string;
    order_id: string;
    order_amount?: string;
    amount?: string;
    status: string;
    created_at?: string;
    resolved_at?: string;
    status_text?: string;
    image_url?: string;
    store_id?: string;
    exit_id?: string;
    click_date?: string;
    details?: string;
    callback_id?: string;
    ticket_id?: string;
    cashback_id?: string;
    cashbackvalue?: number;
    user_type?: string;
    category?: string;
    groupid?: string;
    status_update?: string;
    comments?: string;
    ticket_comments?: string;
    ticket_status?: string;
    missing_txn_cashback_type?: string;
    missing_txn_cashback?: string;
  };
}

interface QueueSubmitResponse {
  data: {
    type: string;
    id: string | number;
  };
  meta?: {
    message?: string;
    cashback_id?: number;
    status?: string;
    cashbackvalue?: string;
    cashback_type?: string;
    under_tracking?: string;
  };
}

type Step = 'retailers' | 'dates' | 'orderId' | 'orderAmount' | 'success';

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
  
  // Meta info from exit clicks API for order ID validation
  const [orderIdMeta, setOrderIdMeta] = useState<{
    sample_orderid?: string;
    orderid_hint_message?: string;
    orderid_format?: Record<string, string>;
    report_merchant_name?: string;
  } | null>(null);
  
  // Selection states
  const [selectedRetailer, setSelectedRetailer] = useState<Retailer | null>(null);
  const [selectedClick, setSelectedClick] = useState<ExitClick | null>(null);
  const [orderId, setOrderId] = useState('');
  const [orderAmount, setOrderAmount] = useState('');
  const [orderIdFormatError, setOrderIdFormatError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Submission result
  const [submissionResult, setSubmissionResult] = useState<QueueSubmitResponse | null>(null);
  
  // Loading/error states
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isLoadingExitClicks, setIsLoadingExitClicks] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retailersError, setRetailersError] = useState<string | null>(null);
  const [exitClicksError, setExitClicksError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  
  // Claims filter tabs & counts
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('In Review');
  const [claimCounts, setClaimCounts] = useState<{pending: number; resolved: number; others: number}>({
    pending: 0,
    resolved: 0,
    others: 0,
  });

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
  }, [accessToken, activeTab, claimStatusFilter]);

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
    setOrderIdMeta(null);
    
    try {
      const response = await fetchExitClickDates(accessToken, storeId);
      setExitClicks(response.data || []);
      
      // Store meta info for order ID validation
      if (response.meta) {
        setOrderIdMeta({
          sample_orderid: response.meta.sample_orderid,
          orderid_hint_message: response.meta.orderid_hint_message,
          orderid_format: response.meta.orderid_format,
          report_merchant_name: response.meta.report_merchant_name,
        });
      }
    } catch (error: any) {
      console.error('Failed to load exit clicks:', error);
      setExitClicksError(error.message || 'Failed to load visit dates');
    } finally {
      setIsLoadingExitClicks(false);
    }
  };

  // Validate order ID format against regex patterns
  const validateOrderIdFormat = (value: string): boolean => {
    if (!orderIdMeta?.orderid_format || Object.keys(orderIdMeta.orderid_format).length === 0) {
      return true; // No format specified, consider valid
    }
    
    // Check against each regex pattern
    for (const [, regexStr] of Object.entries(orderIdMeta.orderid_format)) {
      try {
        // Parse regex string like "/^40[0-9]{1,1}-[0-9]{7,7}-[0-9]{7,7}$/i"
        const match = regexStr.match(/^\/(.+)\/([gimsuy]*)$/);
        if (match) {
          const pattern = new RegExp(match[1], match[2]);
          if (pattern.test(value)) {
            return true;
          }
        }
      } catch (e) {
        console.warn('Invalid regex pattern:', regexStr, e);
      }
    }
    return false;
  };

  const handleOrderIdChange = (value: string) => {
    setOrderId(value);
    
    if (value && orderIdMeta?.orderid_format && Object.keys(orderIdMeta.orderid_format).length > 0) {
      const isValid = validateOrderIdFormat(value);
      if (!isValid) {
        setOrderIdFormatError(`Order ID should look like ${orderIdMeta.sample_orderid || 'the expected format'}`);
      } else {
        setOrderIdFormatError(null);
      }
    } else {
      setOrderIdFormatError(null);
    }
  };

  const getStatusFilterValue = (filter: string): string => {
    switch (filter) {
      case 'In Review': return 'Pending';
      case 'Closed': return 'Resolved';
      case 'Others': return 'Rejected';
      default: return 'Pending';
    }
  };

  const loadClaims = async () => {
    if (!accessToken) return;
    setIsLoadingClaims(true);
    setClaimsError(null);
    
    try {
      const apiStatus = getStatusFilterValue(claimStatusFilter);
      const response = await fetchMissingCashbackQueue(accessToken, apiStatus, 1, 50);
      const claimsData = response?.data;
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      
      // Update counts from meta
      if (response?.meta) {
        setClaimCounts({
          pending: response.meta.pending || 0,
          resolved: response.meta.resolved || 0,
          others: response.meta.others || 0,
        });
      }
    } catch (error: any) {
      console.error('Failed to load claims:', error);
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
    loadExitClicks(getRetailerId(retailer));
  };

  const handleSelectClick = (click: ExitClick) => {
    setSelectedClick(click);
    setStep('orderId');
  };

  const handleValidateOrderId = async () => {
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

    setIsValidating(true);
    
    try {
      const exitDate = selectedClick.attributes.exitclick_date || selectedClick.attributes.exit_date || '';
      await validateMissingCashback(
        accessToken,
        getRetailerId(selectedRetailer),
        exitDate,
        orderId
      );
      
      // Validation passed, move to order amount step
      setStep('orderAmount');
      
      toast({
        title: 'Order ID Validated',
        description: 'Please enter your order amount to complete the claim.',
      });
    } catch (error: any) {
      console.error('Failed to validate order:', error);
      toast({
        title: 'Validation Failed',
        description: error.message || 'Failed to validate your order. Please check the Order ID.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!orderAmount || !selectedRetailer || !selectedClick) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in the Order Amount',
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
    
    try {
      const exitDate = selectedClick.attributes.exitclick_date || selectedClick.attributes.exit_date || '';
      const response = await submitMissingCashbackQueue(
        accessToken,
        getRetailerId(selectedRetailer),
        exitDate,
        orderId,
        orderAmount
      );
      
      setSubmissionResult(response);
      setStep('success');
      
      // Show appropriate message based on response
      const successMessage = response?.meta?.cashback_id 
        ? `Cashback of ₹${response.meta.cashbackvalue || '0'} has been added to your account!`
        : 'Your missing cashback claim has been added to the queue.';
        
      toast({
        title: 'Claim Submitted!',
        description: successMessage,
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

  // Handle additional details submission for B1/C1 groups

  const handleBack = () => {
    if (step === 'dates') {
      setStep('retailers');
      setSelectedRetailer(null);
      setExitClicks([]);
      setOrderIdMeta(null);
    } else if (step === 'orderId') {
      setStep('dates');
      setSelectedClick(null);
      setOrderId('');
      setOrderIdFormatError(null);
    } else if (step === 'orderAmount') {
      setStep('orderId');
      setOrderAmount('');
    }
  };

  const handleNewClaim = () => {
    setStep('retailers');
    setSelectedRetailer(null);
    setSelectedClick(null);
    setOrderId('');
    setOrderAmount('');
    setOrderIdMeta(null);
    setOrderIdFormatError(null);
    setSubmissionResult(null);
    setActiveTab('new');
  };

  const getRetailerName = (retailer: Retailer) => 
    retailer.attributes.store_name || retailer.attributes.report_merchant_name || 'Unknown Store';
  
  const getRetailerImage = (retailer: Retailer) => 
    retailer.attributes.store_logo || retailer.attributes.image_url || '';
  
  const getRetailerId = (retailer: Retailer) => 
    retailer.attributes.store_id || String(retailer.id);

  const filteredRetailers = retailers.filter(r => {
    const name = getRetailerName(r);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.getDate().toString();
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
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

  const getMonthFromDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { month: 'long' });
    } catch {
      return '';
    }
  };

  // Group exit clicks by month
  const groupedExitClicks = exitClicks.reduce((acc, click) => {
    const exitDate = click.attributes.exitclick_date || click.attributes.exit_date || '';
    const month = click.attributes.month || getMonthFromDate(exitDate);
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(click);
    return acc;
  }, {} as Record<string, ExitClick[]>);

  const getStatusBadgeStyle = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'pending' || lowerStatus === 'in review') {
      return 'bg-amber-500 text-white';
    }
    if (lowerStatus === 'resolved' || lowerStatus === 'closed') {
      return 'bg-emerald-500 text-white';
    }
    if (lowerStatus === 'rejected') {
      return 'bg-red-500 text-white';
    }
    return 'bg-muted text-muted-foreground';
  };

  const getClaimStatusText = (status: string) => {
    const lowerStatus = status?.toLowerCase();
    if (lowerStatus === 'pending') return 'NEED DETAILS';
    if (lowerStatus === 'resolved') return 'CLOSED';
    if (lowerStatus === 'rejected') return 'REJECTED';
    return status?.toUpperCase() || 'UNKNOWN';
  };

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="File Missing Cashback"
          description="Login to submit missing cashback claims and track their status"
          icon={AlertCircle}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => step !== 'retailers' ? handleBack() : navigate(-1)} className="shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              {step === 'retailers' && 'Did you shop?'}
              {step === 'dates' && 'Select your shopping date'}
              {step === 'orderId' && `Now, tell us your ${selectedRetailer ? getRetailerName(selectedRetailer) : ''} order ID`}
              {step === 'orderAmount' && `Now, tell us your ${selectedRetailer ? getRetailerName(selectedRetailer) : ''} Order Amount`}
              {step === 'success' && (submissionResult?.meta?.cashback_id ? 'Cashback Added!' : 'Claim Submitted')}
            </h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6 grid grid-cols-2">
            <TabsTrigger value="new">New Claim</TabsTrigger>
            <TabsTrigger value="claims">My Claims</TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            {/* Step 1: Select Retailer */}
            {step === 'retailers' && (
              <div className="animate-fade-in">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Where did you shop?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    These are the retailers you have visited via CashKaro in last 30 days
                  </p>
                </div>
                
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
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-4 flex items-center justify-between border-b">
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-12 h-12 rounded" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-32" />
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
                  <div className="divide-y divide-border">
                    {filteredRetailers.map((retailer) => (
                      <button
                        key={retailer.id}
                        onClick={() => handleSelectRetailer(retailer)}
                        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center overflow-hidden">
                            {getRetailerImage(retailer) ? (
                              <img 
                                src={getRetailerImage(retailer)} 
                                alt={getRetailerName(retailer)}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-muted-foreground">
                                {getRetailerName(retailer).charAt(0)}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {getRetailerName(retailer)}
                          </span>
                        </div>
                        <span className="text-sm text-amber-600">
                          Autotracks within {retailer.attributes.tracking_speed || '72h'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Select Visit Date */}
            {step === 'dates' && selectedRetailer && (
              <div className="animate-fade-in">
                {/* Selected Retailer Badge */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="w-6 h-6 bg-white rounded overflow-hidden">
                      {getRetailerImage(selectedRetailer) ? (
                        <img 
                          src={getRetailerImage(selectedRetailer)} 
                          alt={getRetailerName(selectedRetailer)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs">{getRetailerName(selectedRetailer).charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-amber-700">
                      {getRetailerName(selectedRetailer)}
                    </span>
                  </div>
                </div>

                {isLoadingExitClicks ? (
                  <div className="space-y-6">
                    <Skeleton className="h-6 w-24 mx-auto" />
                    <div className="flex flex-wrap gap-3 justify-center">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="w-12 h-12 rounded-full" />
                      ))}
                    </div>
                  </div>
                ) : exitClicksError ? (
                  <div className="card-elevated p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <p className="text-destructive mb-4">{exitClicksError}</p>
                    <Button onClick={() => loadExitClicks(getRetailerId(selectedRetailer))} variant="outline">
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
                  <div className="space-y-8">
                    {Object.entries(groupedExitClicks).map(([month, clicks]) => (
                      <div key={month} className="text-center">
                        {/* Month Header */}
                        <div className="mb-4">
                          <div className="inline-block">
                            <div className="w-16 h-0.5 bg-muted mx-auto mb-2" />
                            <span className="text-sm font-medium text-foreground">{month}</span>
                          </div>
                        </div>
                        
                        {/* Date Circles */}
                        <div className="flex flex-wrap gap-4 justify-center">
                          {clicks.map((click) => {
                            const exitDate = click.attributes.exitclick_date || click.attributes.exit_date || '';
                            const dayNum = formatDate(exitDate);
                            const isSelected = selectedClick?.id === click.id;
                            
                            return (
                              <button
                                key={click.id}
                                onClick={() => handleSelectClick(click)}
                                className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg font-semibold transition-colors ${
                                  isSelected 
                                    ? 'border-primary bg-primary text-primary-foreground' 
                                    : 'border-primary text-primary hover:bg-primary/10'
                                }`}
                              >
                                {dayNum}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-center text-sm text-muted-foreground">
                      These are the dates you visited {getRetailerName(selectedRetailer)} via CashKaro
                    </p>
                    
                    {selectedClick && (
                      <Button
                        onClick={() => setStep('orderId')}
                        className="w-full h-12"
                      >
                        Continue
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Enter Order ID */}
            {step === 'orderId' && selectedRetailer && selectedClick && (
              <div className="animate-fade-in">
                {/* Selected Retailer Badge */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="w-6 h-6 bg-white rounded overflow-hidden">
                      {getRetailerImage(selectedRetailer) ? (
                        <img 
                          src={getRetailerImage(selectedRetailer)} 
                          alt={getRetailerName(selectedRetailer)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs">{getRetailerName(selectedRetailer).charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-amber-700">
                      {getRetailerName(selectedRetailer)}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Enter Order ID
                    </label>
                    <Input
                      type="text"
                      placeholder={orderIdMeta?.sample_orderid ? `e.g., ${orderIdMeta.sample_orderid}` : "Enter your order ID"}
                      value={orderId}
                      onChange={(e) => handleOrderIdChange(e.target.value)}
                      className={`h-14 text-lg ${orderIdFormatError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {/* Show sample order ID hint */}
                    {orderIdMeta?.sample_orderid && (
                      <p className="text-xs text-primary mt-2">
                        Order ID should look like {orderIdMeta.sample_orderid}
                      </p>
                    )}
                    {/* Show hint message if available */}
                    {orderIdMeta?.orderid_hint_message && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {orderIdMeta.orderid_hint_message}
                      </p>
                    )}
                    {/* Show format validation error */}
                    {orderIdFormatError && (
                      <p className="text-xs text-destructive mt-1">
                        {orderIdFormatError}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleValidateOrderId}
                    disabled={isValidating || !orderId || !!orderIdFormatError}
                    className="w-full h-12"
                    variant={orderId && !orderIdFormatError ? 'default' : 'secondary'}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Enter Order Amount */}
            {step === 'orderAmount' && selectedRetailer && selectedClick && (
              <div className="animate-fade-in">
                {/* Selected Retailer Badge */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="w-6 h-6 bg-white rounded overflow-hidden">
                      {getRetailerImage(selectedRetailer) ? (
                        <img 
                          src={getRetailerImage(selectedRetailer)} 
                          alt={getRetailerName(selectedRetailer)}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs">{getRetailerName(selectedRetailer).charAt(0)}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-amber-700">
                      {getRetailerName(selectedRetailer)}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter amount you paid after discounts
                    </p>
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Enter Order Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 5999"
                      value={orderAmount}
                      onChange={(e) => setOrderAmount(e.target.value)}
                      className="h-14 text-lg"
                    />
                  </div>

                  <Button
                    onClick={handleSubmitClaim}
                    disabled={isSubmitting || !orderAmount}
                    className="w-full h-12"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Continue'
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
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    {submissionResult?.meta?.cashback_id ? 'Cashback Added!' : 'Claim Submitted!'}
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    {submissionResult?.meta?.cashback_id 
                      ? `₹${submissionResult.meta.cashbackvalue || '0'} ${submissionResult.meta.cashback_type || 'Cashback'} has been added to your account.`
                      : 'Your missing cashback claim has been added to the review queue.'
                    }
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                    <div className="space-y-2 text-sm">
                      <p><strong>Store:</strong> {selectedRetailer && getRetailerName(selectedRetailer)}</p>
                      <p><strong>Order ID:</strong> {orderId}</p>
                      <p><strong>Amount:</strong> ₹{orderAmount}</p>
                      {submissionResult?.meta?.under_tracking === 'no' && (
                        <p className="text-success"><strong>Status:</strong> Cashback resolved immediately</p>
                      )}
                    </div>
                  </div>
                  
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
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">Missing Cashback</h2>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { key: 'In Review', count: claimCounts.pending },
                { key: 'Closed', count: claimCounts.resolved },
                { key: 'Others', count: claimCounts.others },
              ].map(({ key, count }) => {
                const isActive = claimStatusFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setClaimStatusFilter(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {key}
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        isActive ? 'bg-primary-foreground/20' : 'bg-foreground/10'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isLoadingClaims ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-elevated p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="w-10 h-10 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-24 mb-2" />
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
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
                  No {claimStatusFilter.toLowerCase()} claims found
                </p>
                <Button onClick={handleNewClaim} variant="outline">
                  Submit a Claim
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div key={claim.id} className="card-elevated p-4">
                    <div className="flex items-start gap-3">
                      {/* Store Logo */}
                      <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                        {claim.attributes.image_url ? (
                          <img 
                            src={claim.attributes.image_url} 
                            alt={claim.attributes.store_name || claim.attributes.merchant_name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Store name and status badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="font-medium text-foreground">
                            {claim.attributes.store_name || claim.attributes.merchant_name || claim.attributes.report_store_name}
                          </span>
                          <Badge className={`${getStatusBadgeStyle(claim.attributes.status)} text-xs`}>
                            {getClaimStatusText(claim.attributes.status)}
                          </Badge>
                        </div>
                        
                        {/* Details/Status text */}
                        <p className="text-sm text-primary mb-2">
                          {claim.attributes.details || claim.attributes.status_text || 'Waiting for auto tracking'}
                        </p>
                        
                        {/* Order details */}
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Order ID: {claim.attributes.order_id}</p>
                          {(claim.attributes.order_amount || claim.attributes.amount) && (
                            <p>Order Amount: ₹{claim.attributes.order_amount || claim.attributes.amount}</p>
                          )}
                          {claim.attributes.click_date && (
                            <p>Visit Date: {formatFullDate(claim.attributes.click_date)}</p>
                          )}
                          {claim.attributes.cashbackvalue && claim.attributes.cashbackvalue > 0 && (
                            <p className="text-success font-medium">
                              Cashback Added: ₹{claim.attributes.cashbackvalue}
                            </p>
                          )}
                          {claim.attributes.ticket_status && (
                            <p>Ticket Status: {claim.attributes.ticket_status}</p>
                          )}
                          {claim.attributes.ticket_comments && (
                            <p className="text-xs italic mt-1">"{claim.attributes.ticket_comments}"</p>
                          )}
                        </div>
                        
                        {/* Upload Screenshot link - only for pending claims needing details */}
                        {claim.attributes.status?.toLowerCase() === 'pending' && 
                         claim.attributes.details?.toLowerCase().includes('waiting') && (
                          <button className="flex items-center gap-1.5 text-primary text-sm mt-3 hover:underline">
                            <Upload className="w-4 h-4" />
                            Upload Screenshot →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Have more cashback to track? CTA */}
            <div className="mt-6">
              <button 
                onClick={handleNewClaim}
                className="w-full p-4 bg-muted rounded-lg flex items-center justify-between hover:bg-muted/80 transition-colors"
              >
                <span className="font-medium text-foreground">Have more cashback to track?</span>
                <ChevronRight className="w-5 h-5 text-primary" />
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default MissingCashback;
