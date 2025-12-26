import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ChevronLeft, Search, Calendar, Hash, Clock, CheckCircle, XCircle, Loader2, RefreshCw, IndianRupee, Upload, FileText, ArrowRight, X, User, Package } from 'lucide-react';
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
  fetchMissingCashbackQueue,
  updateMissingCashbackQueue
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
    category?: string;
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
    // B2 specific
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

type Step = 'claims' | 'retailers' | 'dates' | 'orderId' | 'orderAmount' | 'additionalDetails' | 'success';

// Parse tracking_speed string (e.g., "72h", "36h", "1h 12m") to milliseconds
const parseTrackingSpeed = (speedStr: string | undefined): number => {
  if (!speedStr) return 30 * 24 * 60 * 60 * 1000; // Default 30 days
  
  let totalMs = 0;
  const lowerSpeed = speedStr.toLowerCase();
  
  // Match hours like "72h" or "1h"
  const hoursMatch = lowerSpeed.match(/(\d+)\s*h/);
  if (hoursMatch) {
    totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
  }
  
  // Match minutes like "12m"
  const minutesMatch = lowerSpeed.match(/(\d+)\s*m(?!s)/); // Exclude "ms"
  if (minutesMatch) {
    totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
  }
  
  // Match days like "7d"
  const daysMatch = lowerSpeed.match(/(\d+)\s*d/);
  if (daysMatch) {
    totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
  }
  
  return totalMs > 0 ? totalMs : 30 * 24 * 60 * 60 * 1000; // Fallback to 30 days
};

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
    return <span className="text-muted-foreground">Processing</span>;
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

// Category options for different groups
// Note: C2 (Flipkart) uses Raise Ticket API flow, not PUT to queue, so not included here
const CATEGORY_OPTIONS: Record<string, string[]> = {
  'C1': ['Mobile Recharge', 'No Cashback', 'Other Category'],
  'B2': ['Electronics', 'Fashion', 'Home', 'Other Category'],
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
  
  // Retailer group info (stored when retailer is selected)
  const [selectedRetailerGroup, setSelectedRetailerGroup] = useState<string>('');
  const [selectedRetailerTrackingSpeed, setSelectedRetailerTrackingSpeed] = useState<string>('');
  
  // Queue ID for additional details update
  const [queueId, setQueueId] = useState<string | null>(null);
  
  // Additional details for B1/B2/C1/C2 groups
  const [selectedUserType, setSelectedUserType] = useState<string>(''); // For B1: "New" or "Existing"
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // For B2/C1/C2
  
  // Submission result
  const [submissionResult, setSubmissionResult] = useState<QueueSubmitResponse | null>(null);
  
  // Cashback Tracked Modal state
  const [showTrackedModal, setShowTrackedModal] = useState(false);
  const [trackedCashbackId, setTrackedCashbackId] = useState<number | null>(null);
  
  // Additional Details Modal for claims requiring more info
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);
  const [selectedClaimForDetails, setSelectedClaimForDetails] = useState<Claim | null>(null);
  
  // Loading/error states
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isLoadingExitClicks, setIsLoadingExitClicks] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
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
        setOrderIdFormatError(`Uh oh! Enter correct Order ID. It should look like ${orderIdMeta.sample_orderid || 'the sample format'}`);
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
    // Store group and tracking speed for later use
    setSelectedRetailerGroup(retailer.attributes.group || 'A');
    setSelectedRetailerTrackingSpeed(retailer.attributes.tracking_speed || '72h');
    setStep('dates');
    loadExitClicks(getRetailerId(retailer));
  };

  const handleSelectClick = (click: ExitClick) => {
    setSelectedClick(click);
    setStep('orderId');
  };

  // Check if group requires order amount input
  const groupRequiresOrderAmount = (group: string): boolean => {
    // Group D (Banking) doesn't require order amount
    return group !== 'D';
  };

  // Check if group requires additional details after submission
  // Note: C2 (Flipkart) uses a different "Raise Ticket" API flow, not PUT to queue
  const groupRequiresAdditionalDetails = (group: string): boolean => {
    return ['B1', 'B2', 'C1'].includes(group);
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
      
      // Check if group D (skip order amount)
      if (!groupRequiresOrderAmount(selectedRetailerGroup)) {
        // Submit directly with amount "0" for banking
        handleSubmitClaimDirect('0');
      } else {
        // Move to order amount step
        setStep('orderAmount');
        toast({
          title: 'Order ID Validated',
          description: 'Please enter your order amount to complete the claim.',
        });
      }
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

  // Submit claim and handle group-based flow
  const handleSubmitClaimDirect = async (amount: string) => {
    if (!selectedRetailer || !selectedClick || !accessToken) return;

    setIsSubmitting(true);
    
    try {
      const exitDate = selectedClick.attributes.exitclick_date || selectedClick.attributes.exit_date || '';
      const response = await submitMissingCashbackQueue(
        accessToken,
        getRetailerId(selectedRetailer),
        exitDate,
        orderId,
        amount
      );
      
      setSubmissionResult(response);
      
      // Store queue ID for potential additional details update
      if (response?.data?.id) {
        setQueueId(String(response.data.id));
      }
      
      // Check response status and flow:
      // 1. If cashback was tracked immediately (cashback_id exists), show tracked modal
      // 2. If status is "Resolved" (already processed), go to success - no additional details needed
      // 3. If still under_tracking="yes" AND group requires additional details, show that step
      // 4. Otherwise, normal success flow
      
      if (response?.meta?.cashback_id) {
        // Cashback tracked immediately - show tracked modal
        setTrackedCashbackId(response.meta.cashback_id);
        setShowTrackedModal(true);
      } else if (response?.meta?.status === 'Resolved') {
        // Already resolved by the system - no additional details needed
        setStep('success');
        toast({
          title: 'Claim Submitted!',
          description: 'Your missing cashback claim has been processed.',
        });
      } else if (response?.meta?.under_tracking === 'yes' || groupRequiresAdditionalDetails(selectedRetailerGroup)) {
        // Still tracking or group requires additional details
        // Only show additional details step if the group actually requires it
        if (groupRequiresAdditionalDetails(selectedRetailerGroup)) {
          setStep('additionalDetails');
        } else {
          setStep('success');
          toast({
            title: 'Claim Submitted!',
            description: 'Your missing cashback claim has been added to the queue.',
          });
        }
      } else {
        // Normal success flow for Group A and D
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

    handleSubmitClaimDirect(orderAmount);
  };

  // Submit additional details (for B1/B2/C1/C2 groups)
  const handleSubmitAdditionalDetails = async () => {
    if (!queueId || !accessToken) {
      toast({
        title: 'Error',
        description: 'Missing queue information. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingDetails(true);
    
    try {
      const details: { user_type?: string; category?: string } = {};
      
      if (selectedRetailerGroup === 'B1') {
        if (!selectedUserType) {
          toast({
            title: 'Please select',
            description: 'Are you a new or existing user?',
            variant: 'destructive',
          });
          setIsUpdatingDetails(false);
          return;
        }
        details.user_type = selectedUserType;
      } else if (['B2', 'C1', 'C2'].includes(selectedRetailerGroup)) {
        if (!selectedCategory) {
          toast({
            title: 'Please select',
            description: 'Please select a category',
            variant: 'destructive',
          });
          setIsUpdatingDetails(false);
          return;
        }
        details.category = selectedCategory;
      }

      const response = await updateMissingCashbackQueue(accessToken, queueId, details);
      
      // Update submission result with new response
      if (response) {
        setSubmissionResult(response);
      }
      
      // Check if resolved immediately
      if (response?.meta?.cashback_id) {
        setTrackedCashbackId(response.meta.cashback_id);
        setShowTrackedModal(true);
      } else {
        setStep('success');
        toast({
          title: 'Details Added!',
          description: 'Your claim has been updated with additional details.',
        });
      }
    } catch (error: any) {
      console.error('Failed to update claim details:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update claim details. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  // Handle adding details to existing claim from claims list
  const handleAddDetailsToExistingClaim = async () => {
    if (!selectedClaimForDetails || !accessToken) return;
    
    const claimQueueId = String(selectedClaimForDetails.id);
    const claimGroup = selectedClaimForDetails.attributes.groupid || '';
    
    setIsUpdatingDetails(true);
    
    try {
      const details: { user_type?: string; category?: string } = {};
      
      if (claimGroup === 'B1') {
        if (!selectedUserType) {
          toast({
            title: 'Please select',
            description: 'Are you a new or existing user?',
            variant: 'destructive',
          });
          setIsUpdatingDetails(false);
          return;
        }
        details.user_type = selectedUserType;
      } else if (['B2', 'C1', 'C2'].includes(claimGroup)) {
        if (!selectedCategory) {
          toast({
            title: 'Please select',
            description: 'Please select a category',
            variant: 'destructive',
          });
          setIsUpdatingDetails(false);
          return;
        }
        details.category = selectedCategory;
      }

      await updateMissingCashbackQueue(accessToken, claimQueueId, details);
      
      toast({
        title: 'Details Added!',
        description: 'Your claim has been updated.',
      });
      
      setShowAddDetailsModal(false);
      setSelectedClaimForDetails(null);
      setSelectedUserType('');
      setSelectedCategory('');
      
      // Reload claims
      loadClaims();
    } catch (error: any) {
      console.error('Failed to update claim details:', error);
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update claim details.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  const handleBack = () => {
    if (step === 'retailers') {
      setStep('claims');
    } else if (step === 'dates') {
      setStep('retailers');
      setSelectedRetailer(null);
      setSelectedRetailerGroup('');
      setSelectedRetailerTrackingSpeed('');
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
    } else if (step === 'additionalDetails') {
      setStep('orderAmount');
      setSelectedUserType('');
      setSelectedCategory('');
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
    setSelectedRetailerGroup('');
    setSelectedRetailerTrackingSpeed('');
    setQueueId(null);
    setSelectedUserType('');
    setSelectedCategory('');
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
    setSelectedRetailerGroup('');
    setSelectedRetailerTrackingSpeed('');
    setQueueId(null);
    setSelectedUserType('');
    setSelectedCategory('');
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

  // Calculate expected resolution date using status_update + tracking_speed from retailer
  const getExpectedResolutionDate = (claim: Claim): string | null => {
    // First check if API provides expected_resolution_date
    if (claim.attributes.expected_resolution_date) {
      return claim.attributes.expected_resolution_date;
    }
    
    // Use status_update as base time if available
    const baseTime = claim.attributes.status_update || claim.attributes.click_date;
    if (!baseTime) return null;
    
    const baseDate = new Date(baseTime);
    
    // Try to find tracking speed from the retailer data
    // For claims list, we need to estimate based on group or use a default
    // Look up from retailers list if available
    const storeId = claim.attributes.store_id;
    const matchingRetailer = retailers.find(r => 
      String(r.id) === String(storeId) || 
      r.attributes.store_id === String(storeId)
    );
    
    let trackingSpeedMs: number;
    if (matchingRetailer?.attributes.tracking_speed) {
      trackingSpeedMs = parseTrackingSpeed(matchingRetailer.attributes.tracking_speed);
    } else {
      // Default based on group
      const group = claim.attributes.groupid || '';
      switch (group) {
        case 'A':
        case 'D':
          trackingSpeedMs = 72 * 60 * 60 * 1000; // 72h
          break;
        case 'B1':
        case 'B2':
          trackingSpeedMs = 48 * 60 * 60 * 1000; // 48h
          break;
        case 'C1':
        case 'C2':
          trackingSpeedMs = 36 * 60 * 60 * 1000; // 36h
          break;
        default:
          trackingSpeedMs = 72 * 60 * 60 * 1000; // Default 72h
      }
    }
    
    const expectedDate = new Date(baseDate.getTime() + trackingSpeedMs);
    return expectedDate.toISOString();
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

  // Check if claim needs additional details
  const claimNeedsAdditionalDetails = (claim: Claim): boolean => {
    return claim.attributes.details === 'Waiting for User Additional Details';
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

  // Open add details modal for a claim
  const openAddDetailsModal = (claim: Claim) => {
    setSelectedClaimForDetails(claim);
    setSelectedUserType('');
    setSelectedCategory('');
    setShowAddDetailsModal(true);
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
            const needsDetails = claimNeedsAdditionalDetails(claim);
            
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
                  ) : needsDetails ? (
                    <>
                      {/* Needs additional details */}
                      <p className="text-sm text-foreground mb-1">
                        Additional information required for your claim
                      </p>
                      <Badge variant="outline" className="mb-2 bg-amber-100 text-amber-800 border-amber-300">
                        Needs Info
                      </Badge>
                      <button 
                        onClick={() => openAddDetailsModal(claim)}
                        className="block text-sm text-primary hover:underline mt-1"
                      >
                        Add Details →
                      </button>
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
                    {claim.attributes.ticket_id && (
                      <p>Ticket ID: {claim.attributes.ticket_id}</p>
                    )}
                    {claim.attributes.ticket_status && (
                      <Badge variant="outline" className={`text-xs ${getStatusBadgeStyle(claim.attributes.ticket_status)}`}>
                        {claim.attributes.ticket_status}
                      </Badge>
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
                  <div className="text-left">
                    <span className="font-medium text-foreground block">
                      {getRetailerName(retailer)}
                    </span>
                    <span className="text-xs text-primary">
                      Autotracks within {retailer.attributes.tracking_speed || '72h'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Render Additional Details Step (for B1/B2/C1/C2 groups)
  const renderAdditionalDetailsStep = () => {
    const storeName = selectedRetailer ? getRetailerName(selectedRetailer) : 'the store';
    const storeImage = selectedRetailer ? getRetailerImage(selectedRetailer) : '';
    
    return (
      <div className="animate-fade-in">
        {/* Store Logo */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-4">
            {storeImage ? (
              <img 
                src={storeImage} 
                alt={storeName}
                className="max-w-full max-h-full object-contain p-2"
              />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {storeName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {selectedRetailerGroup === 'B1' ? (
            <>
              {/* B1 Group: New/Existing User Question */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Great! Are you a new user on {storeName}?
                </h3>
                <p className="text-sm text-muted-foreground">
                  New users get higher cashback on their first order
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedUserType('New')}
                  className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                    selectedUserType === 'New' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className={`w-8 h-8 ${selectedUserType === 'New' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${selectedUserType === 'New' ? 'text-primary' : 'text-foreground'}`}>
                    Yes, I'm New
                  </span>
                </button>
                
                <button
                  onClick={() => setSelectedUserType('Existing')}
                  className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                    selectedUserType === 'Existing' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <User className={`w-8 h-8 ${selectedUserType === 'Existing' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${selectedUserType === 'Existing' ? 'text-primary' : 'text-foreground'}`}>
                    No, Existing
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* B2/C1/C2 Groups: Category Selection */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  What did you purchase?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the category of your order
                </p>
              </div>
              
              <div className="space-y-3">
                {(CATEGORY_OPTIONS[selectedRetailerGroup] || CATEGORY_OPTIONS['C1']).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      selectedCategory === category 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Package className={`w-5 h-5 ${selectedCategory === category ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${selectedCategory === category ? 'text-primary' : 'text-foreground'}`}>
                      {category}
                    </span>
                    {selectedCategory === category && (
                      <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          <Button
            onClick={handleSubmitAdditionalDetails}
            disabled={isUpdatingDetails || (selectedRetailerGroup === 'B1' ? !selectedUserType : !selectedCategory)}
            className="w-full h-12"
          >
            {isUpdatingDetails ? (
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
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header with Back button */}
        {step !== 'claims' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

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
            {/* Selected Retailer Logo - Centered with store name */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-background border rounded-lg">
                <div className="w-12 h-8 flex items-center justify-center">
                  {getRetailerImage(selectedRetailer) ? (
                    <img 
                      src={getRetailerImage(selectedRetailer)} 
                      alt={getRetailerName(selectedRetailer)}
                      className="max-w-full max-h-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">
                      {getRetailerName(selectedRetailer).charAt(0)}
                    </span>
                  )}
                </div>
                <span className="font-medium text-foreground">{getRetailerName(selectedRetailer)}</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center mb-8">
              Now, tell us your {getRetailerName(selectedRetailer)} order ID
            </h2>

            <div className="space-y-6 max-w-md mx-auto">
              {/* Order ID Input with floating label style */}
              <div>
                <div className="relative">
                  <Input
                    type="text"
                    id="orderId"
                    placeholder=" "
                    value={orderId}
                    onChange={(e) => handleOrderIdChange(e.target.value)}
                    className={`h-14 text-lg pt-4 peer ${orderIdFormatError ? 'border-orange-500 focus-visible:ring-orange-500' : 'border-primary'}`}
                  />
                  <label 
                    htmlFor="orderId"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 pointer-events-none
                      peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary
                      peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
                  >
                    Enter Order ID
                  </label>
                </div>
                
                {/* Sample Order ID hint - show when available */}
                {orderIdMeta?.sample_orderid && !orderIdFormatError && (
                  <p className="text-sm text-primary mt-2 text-center">
                    Order ID should look like {orderIdMeta.sample_orderid}
                  </p>
                )}
                
                {/* Show format validation error in orange */}
                {orderIdFormatError && (
                  <p className="text-sm text-orange-600 mt-2 flex items-center justify-center gap-1">
                    <span className="text-orange-500">⚠</span>
                    {orderIdFormatError}
                  </p>
                )}
              </div>

              <Button
                onClick={handleValidateOrderId}
                disabled={isValidating || !orderId}
                className="w-full h-12 bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition-colors"
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

        {/* Step 4: Enter Order Amount (skip for Group D) */}
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

        {/* Step 5: Additional Details (for B1/B2/C1/C2 groups) */}
        {step === 'additionalDetails' && renderAdditionalDetailsStep()}

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
                  {orderAmount && <p><strong>Amount:</strong> ₹{orderAmount}</p>}
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

        {/* Add Details Modal (for claims needing additional info) */}
        <Dialog open={showAddDetailsModal} onOpenChange={setShowAddDetailsModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-center">
                Additional Information Required
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {selectedClaimForDetails && (
                <>
                  {selectedClaimForDetails.attributes.groupid === 'B1' ? (
                    <>
                      <p className="text-sm text-muted-foreground text-center mb-6">
                        Are you a new or existing user on {getClaimStoreName(selectedClaimForDetails)}?
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                          onClick={() => setSelectedUserType('New')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            selectedUserType === 'New' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <User className={`w-6 h-6 ${selectedUserType === 'New' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${selectedUserType === 'New' ? 'text-primary' : 'text-foreground'}`}>
                            New User
                          </span>
                        </button>
                        
                        <button
                          onClick={() => setSelectedUserType('Existing')}
                          className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                            selectedUserType === 'Existing' 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <User className={`w-6 h-6 ${selectedUserType === 'Existing' ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-medium ${selectedUserType === 'Existing' ? 'text-primary' : 'text-foreground'}`}>
                            Existing User
                          </span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground text-center mb-6">
                        What category was your purchase from?
                      </p>
                      <div className="space-y-3 mb-6">
                        {(CATEGORY_OPTIONS[selectedClaimForDetails.attributes.groupid || 'C1'] || CATEGORY_OPTIONS['C1']).map((category) => (
                          <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                              selectedCategory === category 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Package className={`w-5 h-5 ${selectedCategory === category ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`font-medium ${selectedCategory === category ? 'text-primary' : 'text-foreground'}`}>
                              {category}
                            </span>
                            {selectedCategory === category && (
                              <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  
                  <Button
                    onClick={handleAddDetailsToExistingClaim}
                    disabled={isUpdatingDetails || (selectedClaimForDetails.attributes.groupid === 'B1' ? !selectedUserType : !selectedCategory)}
                    className="w-full h-12"
                  >
                    {isUpdatingDetails ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default MissingCashback;
