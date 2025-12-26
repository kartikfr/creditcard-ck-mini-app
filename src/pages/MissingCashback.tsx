import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ChevronLeft, Search, Calendar, Hash, Clock, CheckCircle, XCircle, Loader2, RefreshCw, IndianRupee, Upload, FileText, ArrowRight, X } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    callback_id?: number;
    ticket_id?: string | null;
    cashback_id?: number;
    store_id?: number;
    exit_id?: string;
    click_date?: string;
    order_id: string;
    order_amount?: string;
    details?: string;
    comments?: string | null;
    status: string;
    user_type?: string;
    notification_count?: number;
    report_storename?: string;
    imageurl?: string;
    // Legacy fields
    store_name?: string;
    merchant_name?: string;
    image_url?: string;
    ticket_comments?: string | null;
    cashbackvalue?: string;
    ticket_status?: string | null;
    groupid?: string;
    cashback_type?: string;
    under_tracking?: string; // "yes" or "no"
    status_update?: string;
    expected_resolution_date?: string;
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

type Step = 'claims' | 'retailers' | 'dates' | 'orderId' | 'orderAmount' | 'success';

// Countdown Timer Component
const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (difference <= 0) {
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return <span className="text-muted-foreground">Expired</span>;
  }

  // Format as MM:SS if less than an hour, otherwise show days/hours
  if (timeLeft.days === 0 && timeLeft.hours === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded border border-destructive/20">
        <Clock className="w-3.5 h-3.5" />
        {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-destructive/10 text-destructive text-sm font-medium rounded border border-destructive/20">
      <Clock className="w-3.5 h-3.5" />
      {timeLeft.days > 0 && `${timeLeft.days}d `}
      {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
    </span>
  );
};

const MissingCashback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accessToken, isAuthenticated } = useAuth();
  
  // Step management - now starts at 'claims' view
  const [step, setStep] = useState<Step>('claims');
  
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
  
  // Cashback Tracked Modal state
  const [showTrackedModal, setShowTrackedModal] = useState(false);
  const [trackedCashbackId, setTrackedCashbackId] = useState<number | null>(null);
  
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

  // Load claims on mount (default view)
  useEffect(() => {
    if (accessToken && step === 'claims') {
      loadClaims();
    }
  }, [accessToken, step, claimStatusFilter]);

  // Load retailers when entering new claim flow
  useEffect(() => {
    if (accessToken && step === 'retailers') {
      loadRetailers();
    }
  }, [accessToken, step]);

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

  // Get expected prefix from sample order ID
  const getOrderIdPrefix = (): string => {
    if (!orderIdMeta?.sample_orderid) return '';
    // Extract first 2-3 characters as prefix hint
    return orderIdMeta.sample_orderid.substring(0, 2);
  };

  const handleOrderIdChange = (value: string) => {
    setOrderId(value);
    
    if (value && orderIdMeta?.orderid_format && Object.keys(orderIdMeta.orderid_format).length > 0) {
      const isValid = validateOrderIdFormat(value);
      if (!isValid) {
        const prefix = getOrderIdPrefix();
        setOrderIdFormatError(`Uh oh! Enter correct Order ID. ${prefix ? `It should start with ${prefix}` : `It should look like ${orderIdMeta.sample_orderid}`}`);
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
      
      // Check if cashback was already tracked (under_tracking: "no" means already tracked)
      if (response?.meta?.under_tracking === 'no' && response?.meta?.cashback_id) {
        // Show "Cashback Tracked" modal
        setTrackedCashbackId(response.meta.cashback_id);
        setShowTrackedModal(true);
      } else {
        // Normal success flow
        setStep('success');
        toast({
          title: 'Claim Submitted!',
          description: 'Your missing cashback claim has been added to the queue.',
        });
      }
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
    if (step === 'retailers') {
      setStep('claims');
    } else if (step === 'dates') {
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
    setShowTrackedModal(false);
    setTrackedCashbackId(null);
  };

  const handleViewClaims = () => {
    setStep('claims');
    setSelectedRetailer(null);
    setSelectedClick(null);
    setOrderId('');
    setOrderAmount('');
    setOrderIdMeta(null);
    setOrderIdFormatError(null);
    setSubmissionResult(null);
    setShowTrackedModal(false);
    setTrackedCashbackId(null);
  };

  const handleViewTrackedDetails = () => {
    setShowTrackedModal(false);
    if (trackedCashbackId) {
      navigate(`/order/${trackedCashbackId}`);
    }
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

  const formatExpectedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
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

  // Calculate expected resolution date (30 days from click_date) if not provided
  const getExpectedResolutionDate = (claim: Claim): string | null => {
    if (claim.attributes.expected_resolution_date) {
      return claim.attributes.expected_resolution_date;
    }
    // If click_date exists, add 30 days as default tracking period
    if (claim.attributes.click_date) {
      const clickDate = new Date(claim.attributes.click_date);
      clickDate.setDate(clickDate.getDate() + 30);
      return clickDate.toISOString();
    }
    return null;
  };

  // Check if claim is still under tracking (within tracking period)
  const isUnderTracking = (claim: Claim): boolean => {
    // If API explicitly says under_tracking
    if (claim.attributes.under_tracking === 'yes') return true;
    if (claim.attributes.under_tracking === 'no') return false;
    
    // Otherwise calculate based on expected resolution date
    const expectedDate = getExpectedResolutionDate(claim);
    if (!expectedDate) return false;
    
    return new Date(expectedDate).getTime() > Date.now();
  };

  // Get claim image URL (handle both field names)
  const getClaimImageUrl = (claim: Claim): string | undefined => {
    return claim.attributes.imageurl || claim.attributes.image_url;
  };

  // Get claim store name (handle both field names)
  const getClaimStoreName = (claim: Claim): string => {
    return claim.attributes.report_storename || claim.attributes.store_name || claim.attributes.merchant_name || 'Store';
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

  // Render Claims View (Landing page)
  const renderClaimsView = () => (
    <div className="animate-fade-in">
      {/* Have more cashback to track? Banner - Desktop */}
      <div className="hidden md:flex bg-primary rounded-xl p-4 md:p-6 mb-6 items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-primary-foreground">
          Have more cashback to track?
        </h2>
        <Button
          onClick={handleNewClaim}
          variant="outline"
          className="bg-background text-primary border-0 hover:bg-background/90"
        >
          Click here <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Mobile Banner */}
      <div className="flex md:hidden bg-primary rounded-xl p-4 mb-4 items-center justify-between">
        <span className="text-sm font-medium text-primary-foreground">
          Have more cashback<br />to track?
        </span>
        <Button
          onClick={handleNewClaim}
          size="sm"
          variant="outline"
          className="bg-background text-primary border-0 hover:bg-background/90 text-xs px-3"
        >
          Click here <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-border">
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
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                isActive 
                  ? 'text-foreground border-foreground' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {key}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  isActive ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Claims List */}
      {isLoadingClaims ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border pb-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-16 h-16 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : claimsError ? (
        <div className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{claimsError}</p>
          <Button onClick={loadClaims} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : claims.length === 0 ? (
        <div className="p-8 text-center">
          {/* Empty state based on filter */}
          {claimStatusFilter === 'Closed' ? (
            <>
              <div className="w-24 h-24 mx-auto mb-4 bg-muted/50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                Successfully tracked Cashbacks will show up here
              </p>
            </>
          ) : claimStatusFilter === 'In Review' ? (
            <>
              <div className="w-24 h-24 mx-auto mb-4 bg-muted/50 rounded-lg flex items-center justify-center">
                <Clock className="w-12 h-12 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                Cashbacks being tracked show up here
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No {claimStatusFilter.toLowerCase()} claims found
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {claims.map((claim) => {
            const underTracking = isUnderTracking(claim);
            const expectedDate = getExpectedResolutionDate(claim);
            const storeName = getClaimStoreName(claim);
            const storeImage = getClaimImageUrl(claim);
            const isClosed = claimStatusFilter === 'Closed';
            
            return (
              <div key={claim.id} className="py-4 flex items-start gap-4">
                {/* Store Logo */}
                <div className="w-16 h-10 bg-background rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {storeImage ? (
                    <img 
                      src={storeImage} 
                      alt={storeName}
                      className="max-w-full max-h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {storeName.charAt(0)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Status message based on tracking status */}
                  {isClosed ? (
                    <>
                      {/* Closed/Resolved claim - show cashback added message */}
                      <p className="text-sm text-foreground mb-1">
                        Hurray! Cashback of ₹{claim.attributes.cashbackvalue || '0'} is added to your CashKaro Account
                      </p>
                    </>
                  ) : underTracking && expectedDate ? (
                    <>
                      {/* Under tracking - show timer */}
                      <p className="text-sm text-foreground mb-1">
                        Your missing Cashback ticket is under review.
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Expect update in</span>
                        <CountdownTimer targetDate={expectedDate} />
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Not under tracking anymore */}
                      <p className="text-sm text-foreground mb-1">
                        Your missing Cashback ticket is under review.
                      </p>
                      {expectedDate && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Expected by</span>
                          <span className="text-sm text-muted-foreground">
                            {formatExpectedDate(expectedDate)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Order details */}
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    <p>Order ID: {claim.attributes.order_id}</p>
                    {claim.attributes.order_amount && (
                      <p>Order Amount: ₹{claim.attributes.order_amount}</p>
                    )}
                  </div>
                  
                  {/* View Details link for Closed claims */}
                  {isClosed && claim.attributes.cashback_id && (
                    <button 
                      onClick={() => navigate(`/order/${claim.attributes.cashback_id}`)}
                      className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* Chevron for navigation */}
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render Retailer Selection (Step 1 of new claim flow)
  const renderRetailersView = () => (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
          Where did you shop?
        </h2>
        <p className="text-sm text-muted-foreground">
          These are the retailers you have visited via CashKaro in last 30 days
        </p>
      </div>

      {isLoadingRetailers ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card-elevated p-4 text-center">
              <Skeleton className="w-16 h-16 mx-auto mb-3 rounded" />
              <Skeleton className="h-4 w-20 mx-auto" />
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
        <>
          {/* Desktop: Grid layout */}
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredRetailers.map((retailer) => (
              <button
                key={retailer.id}
                onClick={() => handleSelectRetailer(retailer)}
                className="card-elevated p-4 text-center hover:border-primary transition-colors"
              >
                <div className="w-20 h-12 mx-auto mb-3 flex items-center justify-center">
                  {getRetailerImage(retailer) ? (
                    <img 
                      src={getRetailerImage(retailer)} 
                      alt={getRetailerName(retailer)}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground">
                      {getRetailerName(retailer).charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-sm text-primary">
                  Autotracks within {retailer.attributes.tracking_speed || '72h'}
                </span>
              </button>
            ))}
          </div>

          {/* Mobile: List layout */}
          <div className="md:hidden divide-y divide-border">
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
                <span className="text-sm text-primary">
                  Autotracks within {retailer.attributes.tracking_speed || '72h'}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => step === 'claims' ? navigate(-1) : handleBack()} 
            className="shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">
              {step === 'claims' && 'Missing Cashback'}
              {step === 'retailers' && 'Did you shop?'}
              {step === 'dates' && 'Select your shopping date'}
              {step === 'orderId' && `Now, tell us your ${selectedRetailer ? getRetailerName(selectedRetailer) : 'Merchant'} Order ID`}
              {step === 'orderAmount' && `Now, tell us your ${selectedRetailer ? getRetailerName(selectedRetailer) : 'Merchant'} Order Amount`}
              {step === 'success' && (submissionResult?.meta?.cashback_id ? 'Cashback Added!' : 'Claim Submitted')}
            </h1>
            {step === 'orderId' && orderIdMeta?.sample_orderid && (
              <p className="text-sm text-muted-foreground">
                Order ID starts with {getOrderIdPrefix()}...
              </p>
            )}
          </div>
        </div>

        {/* Claims View (Landing) */}
        {step === 'claims' && renderClaimsView()}

        {/* Retailer Selection */}
        {step === 'retailers' && renderRetailersView()}

        {/* Step 2: Select Visit Date */}
        {step === 'dates' && selectedRetailer && (
          <div className="animate-fade-in">
            {/* Selected Retailer Badge */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-4">
                {getRetailerImage(selectedRetailer) ? (
                  <img 
                    src={getRetailerImage(selectedRetailer)} 
                    alt={getRetailerName(selectedRetailer)}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">
                    {getRetailerName(selectedRetailer).charAt(0)}
                  </span>
                )}
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
            {/* Selected Retailer Logo - Centered */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg">
                {getRetailerImage(selectedRetailer) ? (
                  <img 
                    src={getRetailerImage(selectedRetailer)} 
                    alt={getRetailerName(selectedRetailer)}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">
                    {getRetailerName(selectedRetailer).charAt(0)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Enter Order ID
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder={orderIdMeta?.sample_orderid ? `e.g., ${orderIdMeta.sample_orderid}` : "Enter your order ID"}
                    value={orderId}
                    onChange={(e) => handleOrderIdChange(e.target.value)}
                    className={`h-14 text-lg pr-10 ${orderIdFormatError ? 'border-orange-500 focus-visible:ring-orange-500' : ''}`}
                  />
                  {/* Orange indicator bar on right when error */}
                  {orderIdFormatError && (
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-orange-500 rounded-r-md" />
                  )}
                </div>
                {/* Show format validation error in orange */}
                {orderIdFormatError && (
                  <p className="text-sm text-orange-600 mt-2 flex items-start gap-1">
                    <span className="text-orange-500">⚠</span>
                    {orderIdFormatError}
                  </p>
                )}
              </div>

              <Button
                onClick={handleValidateOrderId}
                disabled={isValidating || !orderId}
                className="w-full h-12"
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
            {/* Selected Retailer Logo - Centered */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg">
                {getRetailerImage(selectedRetailer) ? (
                  <img 
                    src={getRetailerImage(selectedRetailer)} 
                    alt={getRetailerName(selectedRetailer)}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">
                    {getRetailerName(selectedRetailer).charAt(0)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
              <div>
                <p className="text-sm text-muted-foreground mb-4 text-center">
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
            <div className="card-elevated p-8 text-center max-w-md mx-auto">
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
                <Button onClick={handleViewClaims}>
                  View My Claims
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cashback Tracked Modal */}
        <Dialog open={showTrackedModal} onOpenChange={setShowTrackedModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-center">
                Cashback Tracked
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-6">
                Hi, no need to raise a ticket. Cashback has already been tracked for your clicks on this date.
              </p>
              <Button 
                onClick={handleViewTrackedDetails}
                className="w-full h-12"
              >
                View Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default MissingCashback;
