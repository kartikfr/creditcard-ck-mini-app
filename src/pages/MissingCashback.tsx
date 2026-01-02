import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ChevronLeft, Search, Calendar, Hash, Clock, CheckCircle, XCircle, Loader2, RefreshCw, IndianRupee, Upload, FileText, ArrowRight, X, User, Package } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import SettingsPageLayout from '@/components/layout/SettingsPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { fetchMissingCashbackRetailers, fetchExitClickDates, validateMissingCashback, submitMissingCashbackQueue, fetchMissingCashbackQueue, updateMissingCashbackQueue, raiseTicket } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from '@/hooks/use-mobile';
import InvoiceUpload from '@/components/InvoiceUpload';
import TicketSuccess from '@/components/TicketSuccess';
import { fileToBase64 } from '@/lib/fileUtils';

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
    store_name?: string;
    merchant_name?: string;
    image_url?: string;
    ticket_comments?: string | null;
    cashbackvalue?: string;
    ticket_status?: string | null;
    groupid?: string;
    cashback_type?: string;
    under_tracking?: string;
    status_update?: string;
    expected_resolution_date?: string;
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

// Extended step types to support new flows
type Step = 
  | 'claims' 
  | 'retailers' 
  | 'dates' 
  | 'orderId' 
  | 'orderAmount' 
  | 'additionalDetails'   // B1: New/Existing user
  | 'categorySelection'   // C1: Category selection
  | 'invoiceUpload'       // C1 (Other Category) & C2: Invoice upload
  | 'ticketSuccess'       // After ticket submission
  | 'success';

// Parse tracking_speed string (e.g., "72h", "36h", "1h 12m") to milliseconds
const parseTrackingSpeed = (speedStr: string | undefined): number => {
  if (!speedStr) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

  let totalMs = 0;
  const lowerSpeed = speedStr.toLowerCase();

  const hoursMatch = lowerSpeed.match(/(\d+)\s*h/);
  if (hoursMatch) {
    totalMs += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
  }

  const minutesMatch = lowerSpeed.match(/(\d+)\s*m(?!s)/);
  if (minutesMatch) {
    totalMs += parseInt(minutesMatch[1]) * 60 * 1000;
  }

  const daysMatch = lowerSpeed.match(/(\d+)\s*d/);
  if (daysMatch) {
    totalMs += parseInt(daysMatch[1]) * 24 * 60 * 60 * 1000;
  }
  return totalMs > 0 ? totalMs : 30 * 24 * 60 * 60 * 1000;
};

// Countdown Timer Component
const CountdownTimer: React.FC<{ targetDate: string }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

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
        hours: Math.floor(difference / (1000 * 60 * 60) % 24),
        minutes: Math.floor(difference / 1000 / 60 % 60),
        seconds: Math.floor(difference / 1000 % 60)
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

// Category options for C1 group (Amazon)
const CATEGORY_OPTIONS_C1: { label: string; value: string; description: string }[] = [
  { label: 'Mobile Recharge', value: 'Mobile Recharge', description: 'Select this if you recharged your mobile or DTH' },
  { label: 'Add money/Gift Cards/Travel/Insurance', value: 'No Cashback', description: 'These categories are not eligible for cashback' },
  { label: 'All other categories', value: 'Other Category', description: 'Select this for all other product categories' }
];

// User type options for B1 group
const USER_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Yes, I am a New User', value: 'New' },
  { label: 'No, I am an Existing User', value: 'Existing' }
];

const MissingCashback: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { accessToken, isAuthenticated, user } = useAuth();
  const isMobile = useIsMobile();
  
  const Layout = isMobile ? AppLayout : SettingsPageLayout;

  // Step management
  const [step, setStep] = useState<Step>('claims');

  // Data states
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [exitClicks, setExitClicks] = useState<ExitClick[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  // Meta info from exit clicks API
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

  // Retailer group info
  const [selectedRetailerGroup, setSelectedRetailerGroup] = useState<string>('');
  const [selectedRetailerTrackingSpeed, setSelectedRetailerTrackingSpeed] = useState<string>('');

  // Queue ID for additional details update
  const [queueId, setQueueId] = useState<string | null>(null);

  // Additional details for B1/C1/C2 groups
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Invoice upload states
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploadingTicket, setIsUploadingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ ticketId?: string } | null>(null);

  // Submission result
  const [submissionResult, setSubmissionResult] = useState<QueueSubmitResponse | null>(null);

  // Modal states
  const [showTrackedModal, setShowTrackedModal] = useState(false);
  const [trackedCashbackId, setTrackedCashbackId] = useState<number | null>(null);
  const [isTrackedModalSuccess, setIsTrackedModalSuccess] = useState(false); // true = submission succeeded, false = already tracked error
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);
  const [selectedClaimForDetails, setSelectedClaimForDetails] = useState<Claim | null>(null);
  const [showQueueAlreadyAddedModal, setShowQueueAlreadyAddedModal] = useState(false);
  const [showB1ConfirmationSheet, setShowB1ConfirmationSheet] = useState(false);
  const [pendingUserType, setPendingUserType] = useState<string>('');
  const [showValidationErrorModal, setShowValidationErrorModal] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState<string>('');
  const [validationErrorShouldRedirect, setValidationErrorShouldRedirect] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState<string>('');
  const [infoModalMessage, setInfoModalMessage] = useState<string>('');
  const [infoModalVariant, setInfoModalVariant] = useState<'success' | 'error' | 'info'>('info');

  // Loading states
  const [isLoadingRetailers, setIsLoadingRetailers] = useState(false);
  const [isLoadingExitClicks, setIsLoadingExitClicks] = useState(false);
  const [isLoadingClaims, setIsLoadingClaims] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
  const [retailersError, setRetailersError] = useState<string | null>(null);
  const [exitClicksError, setExitClicksError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  // Claims filter
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>('In Review');
  const [claimCounts, setClaimCounts] = useState<{
    pending: number;
    resolved: number;
    others: number;
  }>({
    pending: 0,
    resolved: 0,
    others: 0
  });

  // Load claims on mount
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
      if (response.meta) {
        setOrderIdMeta({
          sample_orderid: response.meta.sample_orderid,
          orderid_hint_message: response.meta.orderid_hint_message,
          orderid_format: response.meta.orderid_format,
          report_merchant_name: response.meta.report_merchant_name
        });
      }
    } catch (error: any) {
      console.error('Failed to load exit clicks:', error);
      setExitClicksError(error.message || 'Failed to load visit dates');
    } finally {
      setIsLoadingExitClicks(false);
    }
  };

  const validateOrderIdFormat = (value: string): boolean => {
    if (!orderIdMeta?.orderid_format || Object.keys(orderIdMeta.orderid_format).length === 0) {
      return true;
    }
    for (const [, regexStr] of Object.entries(orderIdMeta.orderid_format)) {
      try {
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

  const getOrderIdPrefix = (): string => {
    if (!orderIdMeta?.sample_orderid) return '';
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
      case 'In Review':
        return 'Pending';
      case 'Closed':
        return 'Resolved';
      case 'Others':
        return 'Rejected';
      default:
        return 'Pending';
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
      if (response?.meta) {
        setClaimCounts({
          pending: response.meta.pending || 0,
          resolved: response.meta.resolved || 0,
          others: response.meta.others || 0
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
    const group = retailer.attributes.group || '';
    const trackingSpeed = retailer.attributes.tracking_speed || '72h';
    console.log('[MissingCashback] Selected retailer:', {
      id: retailer.id,
      name: retailer.attributes.store_name || retailer.attributes.report_merchant_name,
      group: group,
      trackingSpeed: trackingSpeed
    });
    setSelectedRetailerGroup(group);
    setSelectedRetailerTrackingSpeed(trackingSpeed);
    setStep('dates');
    loadExitClicks(getRetailerId(retailer));
  };

  const handleSelectClick = (click: ExitClick) => {
    setSelectedClick(click);
    setStep('orderId');
  };

  const groupRequiresOrderAmount = (group: string): boolean => {
    return group !== 'D';
  };

  // Check if group requires additional details after submission
  // B1: user_type, C1: category, C2: invoice upload
  const groupRequiresAdditionalDetails = (group: string): boolean => {
    return ['B1', 'C1', 'C2'].includes(group);
  };

  type QueueAdditionalDetails = {
    user_type?: string;
    category?: string;
  };

  const getAdditionalDetailsForGroup = (group: string): {
    details: QueueAdditionalDetails;
    error?: string;
  } => {
    if (group === 'B1') {
      if (!selectedUserType) return { details: {}, error: 'Please select New or Existing user type.' };
      console.log('[AddDetails] B1 group - sending user_type:', selectedUserType);
      return { details: { user_type: selectedUserType } };
    }
    if (group === 'C1') {
      if (!selectedCategory) return { details: {}, error: 'Please select a category.' };
      console.log('[AddDetails] C1 group - sending category:', selectedCategory);
      return { details: { category: selectedCategory } };
    }
    return { details: {} };
  };

  const handleValidateOrderId = async () => {
    if (!orderId || !selectedRetailer || !selectedClick) {
      setInfoModalTitle('Missing Information');
      setInfoModalMessage('Please fill in the Order ID');
      setInfoModalVariant('error');
      setShowInfoModal(true);
      return;
    }
    if (!accessToken) {
      setInfoModalTitle('Not Authenticated');
      setInfoModalMessage('Please log in to submit a claim');
      setInfoModalVariant('error');
      setShowInfoModal(true);
      return;
    }
    setIsValidating(true);
    try {
      const exitDate = selectedClick.attributes.exitclick_date || selectedClick.attributes.exit_date || '';
      await validateMissingCashback(accessToken, getRetailerId(selectedRetailer), exitDate, orderId);

      if (!groupRequiresOrderAmount(selectedRetailerGroup)) {
        handleSubmitClaimDirect('0');
      } else {
        setStep('orderAmount');
        setInfoModalTitle('Order ID Validated');
        setInfoModalMessage('Please enter your order amount to complete the claim.');
        setInfoModalVariant('success');
        setShowInfoModal(true);
      }
    } catch (error: any) {
      console.error('Failed to validate order:', error);
      const errorMessage = error.message?.toLowerCase() || '';
      if (errorMessage.includes('already') && (errorMessage.includes('queue') || errorMessage.includes('added') || errorMessage.includes('tracked'))) {
        setShowQueueAlreadyAddedModal(true);
      } else {
        // For other validation errors, check if they should redirect
        const shouldRedirect = errorMessage.includes('ticket') || errorMessage.includes('exists');
        setValidationErrorMessage(error.message || 'Failed to validate your order. Please check the Order ID.');
        setValidationErrorShouldRedirect(shouldRedirect);
        setShowValidationErrorModal(true);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Submit claim and handle group-based flow
  // Flow: After successful submitMissingCashbackQueue, check response to determine next step
  // - If cashback_id exists OR status is "Resolved": Show success (cashback was found/tracked)
  // - If under_tracking is "yes": Show auto-tracking message
  // - If status is "Pending" and B1/C1/C2: Show additional details UI
  // - Otherwise: Show generic success
  const handleSubmitClaimDirect = async (amount: string) => {
    if (!selectedRetailer || !selectedClick || !accessToken) return;
    setIsSubmitting(true);
    try {
      const exitDate = selectedClick.attributes.exitclick_date || selectedClick.attributes.exit_date || '';
      const response = await submitMissingCashbackQueue(accessToken, getRetailerId(selectedRetailer), exitDate, orderId, amount);
      setSubmissionResult(response);
      
      console.log('[MissingCashback] Queue submission response:', JSON.stringify(response, null, 2));

      if (response?.data?.id) {
        setQueueId(String(response.data.id));
      }

      const meta = response?.meta || {};
      const hasCashbackId = !!meta.cashback_id;
      const isResolved = meta.status === 'Resolved';
      const isUnderTracking = meta.under_tracking === 'yes';
      const isPending = meta.status === 'Pending';
      const requiresAdditionalDetails = groupRequiresAdditionalDetails(selectedRetailerGroup);
      
      // CASE 1: Cashback was found and tracked - this is SUCCESS
      if (hasCashbackId) {
        console.log('[MissingCashback] Cashback found - ID:', meta.cashback_id, 'Value:', meta.cashbackvalue);
        setTrackedCashbackId(meta.cashback_id);
        setIsTrackedModalSuccess(true); // Mark as success - cashback was found after submission
        setShowTrackedModal(true);
        return;
      }
      
      // CASE 2: Status is Resolved (without cashback_id) - still a success
      if (isResolved) {
        console.log('[MissingCashback] Status resolved - showing success');
        setStep('success');
        setInfoModalTitle('Claim Submitted!');
        setInfoModalMessage('Your missing cashback claim has been processed.');
        setInfoModalVariant('success');
        setShowInfoModal(true);
        return;
      }
      
      // CASE 3: Under auto-tracking - success, will be processed automatically
      if (isUnderTracking) {
        console.log('[MissingCashback] Under auto-tracking');
        setStep('success');
        setInfoModalTitle('Claim Submitted!');
        setInfoModalMessage('Your claim is under auto-tracking. We will update you once it\'s processed.');
        setInfoModalVariant('success');
        setShowInfoModal(true);
        return;
      }
      
      // CASE 4: Pending status for B1/C1/C2 - needs additional details
      if (isPending && requiresAdditionalDetails) {
        console.log('[MissingCashback] Pending with additional details needed for group:', selectedRetailerGroup);
        if (selectedRetailerGroup === 'B1') {
          setStep('additionalDetails');
        } else if (selectedRetailerGroup === 'C1') {
          setStep('categorySelection');
        } else if (selectedRetailerGroup === 'C2') {
          setStep('invoiceUpload');
        }
        return;
      }
      
      // CASE 5: Default success for other cases (Group A, B2, D, or unknown)
      console.log('[MissingCashback] Default success flow');
      setStep('success');
      setInfoModalTitle('Claim Submitted!');
      setInfoModalMessage('Your missing cashback claim has been added to the queue.');
      setInfoModalVariant('success');
      setShowInfoModal(true);
      
    } catch (error: any) {
      console.error('[MissingCashback] Failed to submit claim:', error);
      // Show error and redirect to claims page
      setValidationErrorMessage(error.message || 'Failed to submit your claim. Please try again.');
      setValidationErrorShouldRedirect(true);
      setShowValidationErrorModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClaim = async () => {
    if (!orderAmount || !selectedRetailer || !selectedClick) {
      setInfoModalTitle('Missing Information');
      setInfoModalMessage('Please fill in the Order Amount');
      setInfoModalVariant('error');
      setShowInfoModal(true);
      return;
    }
    if (!accessToken) {
      setInfoModalTitle('Not Authenticated');
      setInfoModalMessage('Please log in to submit a claim');
      setInfoModalVariant('error');
      setShowInfoModal(true);
      return;
    }
    handleSubmitClaimDirect(orderAmount);
  };

  // Submit additional details for B1 (user_type)
  const handleSubmitAdditionalDetails = async () => {
    if (!queueId || !accessToken) {
      setValidationErrorMessage('Missing queue information. Please try again.');
      setShowValidationErrorModal(true);
      return;
    }
    const { details, error } = getAdditionalDetailsForGroup(selectedRetailerGroup);
    if (error) {
      setValidationErrorMessage(error);
      setShowValidationErrorModal(true);
      return;
    }
    setIsUpdatingDetails(true);
    try {
      const response = await updateMissingCashbackQueue(accessToken, queueId, details);
      if (response) {
        setSubmissionResult(response);
      }
      if (response?.meta?.cashback_id) {
        setTrackedCashbackId(response.meta.cashback_id);
        setIsTrackedModalSuccess(true);
        setShowTrackedModal(true);
      } else {
        setStep('success');
        setInfoModalTitle('Details Added!');
        setInfoModalMessage('Your claim has been updated with additional details.');
        setInfoModalVariant('success');
        setShowInfoModal(true);
      }
    } catch (error: any) {
      console.error('Failed to update claim details:', error);
      const errorMsg = error.message?.toLowerCase() || '';
      const shouldRedirect = errorMsg.includes('already') || 
                             errorMsg.includes('tracked') || 
                             errorMsg.includes('ticket') ||
                             errorMsg.includes('exists');
      setValidationErrorMessage(error.message || 'Failed to update claim details. Please try again.');
      setValidationErrorShouldRedirect(shouldRedirect);
      setShowValidationErrorModal(true);
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  // Handle C1 category selection
  const handleC1CategorySubmit = async () => {
    if (!queueId || !accessToken || !selectedCategory) {
      setValidationErrorMessage('Please select a category.');
      setShowValidationErrorModal(true);
      return;
    }

    // If "Other Category" is selected, proceed to invoice upload
    if (selectedCategory === 'Other Category') {
      setStep('invoiceUpload');
      return;
    }

    // For other categories, submit via PUT API
    setIsUpdatingDetails(true);
    try {
      const response = await updateMissingCashbackQueue(accessToken, queueId, { category: selectedCategory });
      if (response?.meta?.cashback_id) {
        setTrackedCashbackId(response.meta.cashback_id);
        setIsTrackedModalSuccess(true);
        setShowTrackedModal(true);
      } else {
        setStep('success');
        setInfoModalTitle('Details Added!');
        setInfoModalMessage('Your claim has been updated.');
        setInfoModalVariant('success');
        setShowInfoModal(true);
      }
    } catch (error: any) {
      console.error('Failed to update C1 category:', error);
      const errorMsg = error.message?.toLowerCase() || '';
      const shouldRedirect = errorMsg.includes('already') || 
                             errorMsg.includes('tracked') || 
                             errorMsg.includes('ticket') ||
                             errorMsg.includes('exists');
      setValidationErrorMessage(error.message || 'Failed to update claim. Please try again.');
      setValidationErrorShouldRedirect(shouldRedirect);
      setShowValidationErrorModal(true);
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  // Handle invoice upload and ticket submission (for C1 "Other Category" and C2)
  const handleInvoiceSubmit = async () => {
    if (!accessToken) {
      setValidationErrorMessage('Please login to continue.');
      setShowValidationErrorModal(true);
      return;
    }

    if (uploadedFiles.length === 0) {
      setValidationErrorMessage('Please upload at least one invoice screenshot.');
      setShowValidationErrorModal(true);
      return;
    }

    // Context can come either from the "new claim" flow (selectedClick/selectedRetailer)
    // or from "Add Details" on an existing claim (selectedClaimForDetails).
    const claimCtx = selectedClaimForDetails;

    const exitDateRaw =
      claimCtx?.attributes.click_date ||
      selectedClick?.attributes.exitclick_date ||
      selectedClick?.attributes.exit_date ||
      '';
    const exitDate = exitDateRaw ? exitDateRaw.slice(0, 10) : '';

    const exitId =
      claimCtx?.attributes.exit_id ||
      selectedClick?.attributes.exit_id ||
      selectedClick?.id ||
      '';

    const storeId =
      (claimCtx?.attributes.store_id ? String(claimCtx.attributes.store_id) : '') ||
      (selectedRetailer ? getRetailerId(selectedRetailer) : '');

    const txnOrderId = claimCtx?.attributes.order_id || orderId;
    const txnOrderAmountStr = claimCtx?.attributes.order_amount || orderAmount;

    const effectiveQueueId = claimCtx ? String(claimCtx.id) : queueId;

    if (!exitDate || !exitId || !storeId || !txnOrderId) {
      setValidationErrorMessage('Unable to prepare ticket request for this claim. Please try again.');
      setShowValidationErrorModal(true);
      return;
    }

    setIsUploadingTicket(true);
    try {
      // Convert files to base64 - use 'ticket_attachment' as the field name (matches curl)
      const fileData = await Promise.all(
        uploadedFiles.map(async (file) => ({
          name: 'ticket_attachment',
          data: await fileToBase64(file),
          filename: file.name,
          contentType: file.type,
        }))
      );

      const totalPaid = Number.parseFloat(String(txnOrderAmountStr || '0')) || 0;

      // Prepare ticket data - transaction_details is REQUIRED by the API
      const ticketData: {
        transaction_id: string;
        transaction_details: string;
        total_amount_paid?: number;
        missing_txn_queue_id?: number;
        query_type?: string;
        query_sub_type?: string;
      } = {
        transaction_id: txnOrderId,
        transaction_details: txnOrderId, // Auto-fill with order ID as per API requirement
        missing_txn_queue_id: effectiveQueueId ? Number.parseInt(effectiveQueueId, 10) : undefined,
        query_type: selectedRetailerGroup === 'C1' ? 'Other Category' : 'Missing Cashback',
        query_sub_type: 'Missing Cashback',
      };
      
      // Only add total_amount_paid if it's a valid positive number
      if (totalPaid > 0) {
        ticketData.total_amount_paid = totalPaid;
      }

      console.log('[InvoiceUpload] Raising ticket:', {
        exitDate,
        storeId,
        exitId,
        ticketData,
        filesCount: fileData.length,
      });

      const response = await raiseTicket(accessToken, exitDate, storeId, exitId, ticketData, fileData);

      console.log('[InvoiceUpload] Ticket response:', response);

      // Extract ticket ID from response
      const ticketId = response?.data?.id || response?.data?.attributes?.ticket_id;
      setTicketResult({ ticketId: ticketId ? String(ticketId) : undefined });
      setStep('ticketSuccess');
      setShowAddDetailsModal(false);
    } catch (error: any) {
      console.error('Failed to submit ticket:', error);
      const errorMsg = error.message?.toLowerCase() || '';
      const shouldRedirect = errorMsg.includes('already') || 
                             errorMsg.includes('tracked') || 
                             errorMsg.includes('ticket') ||
                             errorMsg.includes('exists');
      setValidationErrorMessage(error.message || 'Failed to upload invoice. Please try again.');
      setValidationErrorShouldRedirect(shouldRedirect);
      setShowValidationErrorModal(true);
      // Close modals
      setShowAddDetailsModal(false);
    } finally {
      setIsUploadingTicket(false);
    }
  };

  // Handle B1 user type selection - show confirmation first
  const handleB1UserTypeSelection = (userType: string) => {
    console.log('[AddDetails] B1 user type selected:', userType);
    setPendingUserType(userType);
    setShowB1ConfirmationSheet(true);
  };

  // Handle B1 confirmation - actually submit the PUT request
  const handleB1ConfirmSubmit = async () => {
    if (!selectedClaimForDetails || !accessToken || !pendingUserType) return;
    const claimQueueId = String(selectedClaimForDetails.id);
    console.log('[AddDetails] B1 confirmation - submitting:', { queueId: claimQueueId, user_type: pendingUserType });
    setIsUpdatingDetails(true);
    setShowB1ConfirmationSheet(false);
    try {
      const response = await updateMissingCashbackQueue(accessToken, claimQueueId, { user_type: pendingUserType });
      console.log('[AddDetails] B1 update response:', response);
      setInfoModalTitle('Details Added!');
      setInfoModalMessage('Your claim has been updated.');
      setInfoModalVariant('success');
      setShowInfoModal(true);
      setShowAddDetailsModal(false);
      setSelectedClaimForDetails(null);
      setSelectedUserType('');
      setPendingUserType('');
      loadClaims();
    } catch (error: any) {
      console.error('[AddDetails] Failed to update B1 claim:', error);
      const errorMsg = error.message?.toLowerCase() || '';
      // Check if this is a "already tracked" type error - redirect after showing
      const shouldRedirect = errorMsg.includes('already') || 
                             errorMsg.includes('tracked') || 
                             errorMsg.includes('ticket') ||
                             errorMsg.includes('exists');
      setValidationErrorMessage(error.message || 'Failed to update claim details.');
      setValidationErrorShouldRedirect(shouldRedirect);
      setShowValidationErrorModal(true);
      // Close the add details modal
      setShowAddDetailsModal(false);
      setSelectedClaimForDetails(null);
      setShowB1ConfirmationSheet(false);
      setPendingUserType('');
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  // Handle adding details to existing claim from claims list
  const handleAddDetailsToExistingClaim = async () => {
    if (!selectedClaimForDetails || !accessToken) return;
    const claimQueueId = String(selectedClaimForDetails.id);
    const claimGroup = selectedClaimForDetails.attributes.groupid || '';
    console.log('[AddDetails] Submitting for group:', claimGroup);

    // B1 is handled separately
    if (claimGroup === 'B1') {
      return;
    }

    // C1 with "Other Category" or C2 needs invoice upload - redirect to invoice upload flow
    if ((claimGroup === 'C1' && selectedCategory === 'Other Category') || claimGroup === 'C2') {
      // Set up context for invoice upload
      setQueueId(claimQueueId);
      setSelectedRetailerGroup(claimGroup);
      setShowAddDetailsModal(false);
      setStep('invoiceUpload');
      return;
    }

    setIsUpdatingDetails(true);
    try {
      const { details, error } = getAdditionalDetailsForGroup(claimGroup);
      if (error) {
        setValidationErrorMessage(error);
        setShowValidationErrorModal(true);
        setIsUpdatingDetails(false);
        return;
      }
      console.log('[AddDetails] Sending PUT request:', { queueId: claimQueueId, details });
      const response = await updateMissingCashbackQueue(accessToken, claimQueueId, details);
      console.log('[AddDetails] Response:', response);
      setInfoModalTitle('Details Added!');
      setInfoModalMessage('Your claim has been updated.');
      setInfoModalVariant('success');
      setShowInfoModal(true);
      setShowAddDetailsModal(false);
      setSelectedClaimForDetails(null);
      setSelectedUserType('');
      setSelectedCategory('');
      loadClaims();
    } catch (error: any) {
      console.error('[AddDetails] Failed to update claim details:', error);
      const errorMsg = error.message?.toLowerCase() || '';
      // Check if this is a "already tracked" type error - redirect after showing
      const shouldRedirect = errorMsg.includes('already') || 
                             errorMsg.includes('tracked') || 
                             errorMsg.includes('ticket') ||
                             errorMsg.includes('exists');
      setValidationErrorMessage(error.message || 'Failed to update claim details.');
      setValidationErrorShouldRedirect(shouldRedirect);
      setShowValidationErrorModal(true);
      // Close the add details modal
      setShowAddDetailsModal(false);
      setSelectedClaimForDetails(null);
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
    } else if (step === 'categorySelection') {
      setStep('orderAmount');
      setSelectedCategory('');
    } else if (step === 'invoiceUpload') {
      // Go back based on group
      if (selectedRetailerGroup === 'C1') {
        setStep('categorySelection');
      } else {
        setStep('orderAmount');
      }
      setUploadedFiles([]);
    }
  };

  const handleNewClaim = () => {
    setStep('retailers');
    resetClaimState();
  };

  const handleViewClaims = () => {
    setStep('claims');
    resetClaimState();
  };

  const resetClaimState = () => {
    setSelectedRetailer(null);
    setSelectedClick(null);
    setOrderId('');
    setOrderAmount('');
    setOrderIdMeta(null);
    setOrderIdFormatError(null);
    setSubmissionResult(null);
    setShowTrackedModal(false);
    setTrackedCashbackId(null);
    setIsTrackedModalSuccess(false);
    setSelectedRetailerGroup('');
    setSelectedRetailerTrackingSpeed('');
    setQueueId(null);
    setSelectedUserType('');
    setSelectedCategory('');
    setUploadedFiles([]);
    setTicketResult(null);
  };

  const handleViewTrackedDetails = () => {
    setShowTrackedModal(false);
    if (trackedCashbackId) {
      navigate(`/order/${trackedCashbackId}`);
    }
  };

  const getRetailerName = (retailer: Retailer) => retailer.attributes.store_name || retailer.attributes.report_merchant_name || 'Unknown Store';
  const getRetailerImage = (retailer: Retailer) => retailer.attributes.store_logo || retailer.attributes.image_url || '';
  const getRetailerId = (retailer: Retailer) => retailer.attributes.store_id || String(retailer.id);

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

  const getTrackingTargetDate = (claim: Claim): string | null => {
    // If API provides an explicit resolution date, trust it.
    if (claim.attributes.expected_resolution_date) {
      return claim.attributes.expected_resolution_date;
    }

    // In practice, when under_tracking="yes", `status_update` is often already the "tracking ends at" timestamp.
    if (claim.attributes.under_tracking === 'yes' && claim.attributes.status_update) {
      return claim.attributes.status_update;
    }

    // Otherwise compute end = click_date + tracking_speed.
    const clickDateStr = claim.attributes.click_date;
    if (!clickDateStr) return null;

    const clickDate = new Date(clickDateStr);
    const storeId = claim.attributes.store_id;
    const matchingRetailer = retailers.find(
      (r) => String(r.id) === String(storeId) || r.attributes.store_id === String(storeId)
    );

    let trackingSpeedMs: number;
    if (matchingRetailer?.attributes.tracking_speed) {
      trackingSpeedMs = parseTrackingSpeed(matchingRetailer.attributes.tracking_speed);
    } else {
      // Fallback per group (kept conservative)
      const group = claim.attributes.groupid || '';
      switch (group) {
        case 'B1':
        case 'B2':
          trackingSpeedMs = 48 * 60 * 60 * 1000;
          break;
        case 'C1':
        case 'C2':
          trackingSpeedMs = 36 * 60 * 60 * 1000;
          break;
        case 'A':
        case 'D':
        default:
          trackingSpeedMs = 72 * 60 * 60 * 1000;
      }
    }

    return new Date(clickDate.getTime() + trackingSpeedMs).toISOString();
  };

  const isUnderTracking = (claim: Claim): boolean => {
    if (claim.attributes.under_tracking === 'yes') return true;
    if (claim.attributes.under_tracking === 'no') return false;

    const target = getTrackingTargetDate(claim);
    if (!target) return false;
    return new Date(target).getTime() > Date.now();
  };

  // Check if claim needs additional details
  const claimNeedsAdditionalDetails = (claim: Claim): boolean => {
    const groupId = claim.attributes.groupid || '';
    const details = (claim.attributes.details || '').toLowerCase();

    // Only show "Add Details" for B1, C1, and C2 groups.
    if (!['B1', 'C1', 'C2'].includes(groupId)) return false;

    // Must be past tracking.
    if (isUnderTracking(claim)) return false;

    // Only when waiting for user input.
    return (
      details.includes('waiting') ||
      details.includes('additional') ||
      details.includes('user') ||
      details.includes('invoice')
    );
  };

  const openAddDetailsModal = (claim: Claim) => {
    setSelectedClaimForDetails(claim);
    setSelectedRetailerGroup(claim.attributes.groupid || '');
    setQueueId(String(claim.id));
    setOrderId(claim.attributes.order_id || '');
    setOrderAmount(claim.attributes.order_amount || '');
    setSelectedUserType('');
    setSelectedCategory('');
    setUploadedFiles([]);
    setShowB1ConfirmationSheet(false);
    setShowAddDetailsModal(true);
  };

  const getClaimStoreName = (claim: Claim) => {
    return claim.attributes.report_storename || claim.attributes.store_name || claim.attributes.merchant_name || 'Unknown Store';
  };

  const getClaimImageUrl = (claim: Claim) => {
    return claim.attributes.imageurl || claim.attributes.image_url || '';
  };

  const getStatusBadgeStyle = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('resolved') || lowerStatus.includes('tracked')) {
      return 'bg-success/10 text-success border-success/20';
    }
    if (lowerStatus.includes('rejected') || lowerStatus.includes('denied')) {
      return 'bg-destructive/10 text-destructive border-destructive/20';
    }
    return 'bg-primary/10 text-primary border-primary/20';
  };

  // Render loading state
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="Login to View Missing Cashback"
          description="Please login to track your missing cashback claims"
        />
      </AppLayout>
    );
  }

  // Render Claims View
  const renderClaimsView = () => (
    <div className="animate-fade-in">
      {/* Have more cashback to track? Banner - Desktop */}
      <div className="hidden md:flex bg-primary rounded-xl p-4 md:p-6 mb-6 items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-primary-foreground">
          Have more cashback to track?
        </h2>
        <Button onClick={handleNewClaim} variant="outline" className="bg-background text-primary border-0 hover:bg-background/90">
          Click here <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Mobile Banner */}
      <div className="flex md:hidden bg-primary rounded-xl p-4 mb-4 items-center justify-between">
        <span className="text-sm font-medium text-primary-foreground">
          Have more cashback<br />to track?
        </span>
        <Button onClick={handleNewClaim} size="sm" variant="outline" className="bg-background text-primary border-0 hover:bg-background/90 text-xs px-3">
          Click here <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b border-border">
        {[
          { key: 'In Review', count: claimCounts.pending },
          { key: 'Closed', count: claimCounts.resolved },
          { key: 'Others', count: claimCounts.others }
        ].map(({ key, count }) => {
          const isActive = claimStatusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setClaimStatusFilter(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-[1px] ${
                isActive ? 'text-foreground border-foreground' : 'text-muted-foreground border-transparent hover:text-foreground'
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
          {[1, 2, 3].map(i => (
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
          {claims.map(claim => {
            const underTracking = isUnderTracking(claim);
            const trackingTargetDate = getTrackingTargetDate(claim);
            const storeName = getClaimStoreName(claim);
            const storeImage = getClaimImageUrl(claim);
            const isClosed = claimStatusFilter === 'Closed';
            const needsDetails = claimNeedsAdditionalDetails(claim);

            return (
              <div key={claim.id} className="py-4 flex items-start gap-4">
                <div className="w-16 h-10 bg-background rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {storeImage ? (
                    <img src={storeImage} alt={storeName} className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <span className="text-lg font-semibold text-muted-foreground">
                      {storeName.charAt(0)}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {isClosed ? (
                    <p className="text-sm text-foreground mb-1">
                      Hurray! Cashback of ₹{claim.attributes.cashbackvalue || '0'} is added to your CashKaro Account
                    </p>
                  ) : needsDetails ? (
                    <>
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
                  ) : underTracking && trackingTargetDate ? (
                    <>
                      <p className="text-sm text-foreground mb-1">
                        Your missing Cashback ticket is under review.
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-muted-foreground">Expect update in</span>
                        <CountdownTimer targetDate={trackingTargetDate} />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-foreground mb-1">
                        Your missing Cashback ticket is under review.
                      </p>
                      {trackingTargetDate && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-muted-foreground">Expected by</span>
                          <span className="text-sm text-muted-foreground">
                            {formatExpectedDate(trackingTargetDate)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    <p>Order ID: {claim.attributes.order_id}</p>
                    {claim.attributes.order_amount && <p>Order Amount: ₹{claim.attributes.order_amount}</p>}
                    {claim.attributes.ticket_id && <p>Ticket ID: {claim.attributes.ticket_id}</p>}
                    {claim.attributes.ticket_status && (
                      <Badge variant="outline" className={`text-xs ${getStatusBadgeStyle(claim.attributes.ticket_status)}`}>
                        {claim.attributes.ticket_status}
                      </Badge>
                    )}
                  </div>
                  
                  {isClosed && claim.attributes.cashback_id && (
                    <button
                      onClick={() => navigate(`/order/${claim.attributes.cashback_id}`)}
                      className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render Retailer Selection
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
          {[1, 2, 3, 4, 5, 6].map(i => (
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
            {filteredRetailers.map(retailer => (
              <button
                key={retailer.id}
                onClick={() => handleSelectRetailer(retailer)}
                className="card-elevated p-4 text-center hover:border-primary transition-colors"
              >
                <div className="w-20 h-12 mx-auto mb-3 flex items-center justify-center">
                  {getRetailerImage(retailer) ? (
                    <img src={getRetailerImage(retailer)} alt={getRetailerName(retailer)} className="max-w-full max-h-full object-contain" />
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
            {filteredRetailers.map(retailer => (
              <button
                key={retailer.id}
                onClick={() => handleSelectRetailer(retailer)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center overflow-hidden">
                    {getRetailerImage(retailer) ? (
                      <img src={getRetailerImage(retailer)} alt={getRetailerName(retailer)} className="w-full h-full object-contain" />
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

  // Render Additional Details Step (B1: New/Existing user)
  const renderAdditionalDetailsStep = () => {
    const storeName = selectedRetailer ? getRetailerName(selectedRetailer) : 'the store';
    const storeImage = selectedRetailer ? getRetailerImage(selectedRetailer) : '';

    return (
      <div className="animate-fade-in">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-4">
            {storeImage ? (
              <img src={storeImage} alt={storeName} className="max-w-full max-h-full object-contain p-2" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {storeName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Great! Are you a new user on {storeName}?
            </h3>
            <p className="text-sm text-muted-foreground">
              {storeName} gives different Cashbacks to new and existing users.
            </p>
          </div>
          
          <div className="space-y-3">
            {USER_TYPE_OPTIONS.map(option => (
              <button 
                key={option.value} 
                onClick={() => setSelectedUserType(option.value)} 
                className={`w-full p-4 rounded-xl border-2 flex items-center justify-center transition-all ${
                  selectedUserType === option.value 
                    ? 'border-primary bg-primary text-primary-foreground' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          <Button
            onClick={handleSubmitAdditionalDetails}
            disabled={isUpdatingDetails || !selectedUserType}
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

  // Render Category Selection Step (C1: Amazon)
  const renderCategorySelectionStep = () => {
    const storeName = selectedRetailer ? getRetailerName(selectedRetailer) : 'the store';
    const storeImage = selectedRetailer ? getRetailerImage(selectedRetailer) : '';

    return (
      <div className="animate-fade-in">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-4">
            {storeImage ? (
              <img src={storeImage} alt={storeName} className="max-w-full max-h-full object-contain p-2" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">
                {storeName.charAt(0)}
              </span>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tell us your product category
            </h3>
            <p className="text-sm text-muted-foreground">
              Select categories from the list below
            </p>
          </div>
          
          <div className="space-y-3">
            {CATEGORY_OPTIONS_C1.map(category => (
              <div key={category.value}>
                <button 
                  onClick={() => setSelectedCategory(category.value)} 
                  className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    selectedCategory === category.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedCategory === category.value 
                      ? 'border-primary' 
                      : 'border-muted-foreground'
                  }`}>
                    {selectedCategory === category.value && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedCategory === category.value ? 'text-primary' : 'text-foreground'
                  }`}>
                    {category.label}
                  </span>
                </button>
                <p className="text-xs text-muted-foreground mt-1 ml-8">
                  {category.description}
                </p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleC1CategorySubmit}
            disabled={isUpdatingDetails || !selectedCategory}
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

  // Render Invoice Upload Step (C1 "Other Category" & C2)
  const renderInvoiceUploadStep = () => {
    const storeName = selectedClaimForDetails
      ? getClaimStoreName(selectedClaimForDetails)
      : selectedRetailer
        ? getRetailerName(selectedRetailer)
        : 'the store';

    const storeImage = selectedClaimForDetails
      ? getClaimImageUrl(selectedClaimForDetails)
      : selectedRetailer
        ? getRetailerImage(selectedRetailer)
        : '';

    return (
      <InvoiceUpload
        files={uploadedFiles}
        onFilesChange={setUploadedFiles}
        storeName={storeName}
        storeImage={storeImage}
        onContinue={handleInvoiceSubmit}
        onBack={handleBack}
        isUploading={isUploadingTicket}
        helpTitle={`Where to Find Invoice in ${storeName} App`}
      />
    );
  };

  // Render Ticket Success Step
  const renderTicketSuccessStep = () => {
    return (
      <TicketSuccess
        onContinue={handleViewClaims}
      />
    );
  };

  return (
    <Layout>
      <div className="w-full max-w-4xl lg:max-w-none">
        {/* Header with Back button */}
        {step !== 'claims' && step !== 'success' && step !== 'ticketSuccess' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        )}

        {/* Claims View */}
        {step === 'claims' && renderClaimsView()}

        {/* Retailer Selection */}
        {step === 'retailers' && renderRetailersView()}

        {/* Date Selection */}
        {step === 'dates' && selectedRetailer && (
          <div className="animate-fade-in">
            <div className="mb-6 text-center">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                When did you shop?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the date when you visited {getRetailerName(selectedRetailer)}
              </p>
            </div>

            {isLoadingExitClicks ? (
              <div className="flex gap-3 flex-wrap justify-center">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="w-16 h-16 rounded-lg" />
                ))}
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
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent visits found for this store</p>
              </div>
            ) : (
              <div className="flex gap-3 flex-wrap justify-center">
                {exitClicks.map(click => {
                  const date = click.attributes.exitclick_date || click.attributes.exit_date || '';
                  const month = click.attributes.month || getMonthFromDate(date);
                  return (
                    <button
                      key={click.id}
                      onClick={() => handleSelectClick(click)}
                      className="card-elevated p-3 text-center hover:border-primary transition-colors min-w-[70px]"
                    >
                      <div className="text-2xl font-bold text-foreground">
                        {formatDate(date)}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        {month.substring(0, 3)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Order ID Input */}
        {step === 'orderId' && selectedRetailer && selectedClick && (
          <div className="animate-fade-in">
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
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                Enter your Order ID
              </h2>
              {orderIdMeta?.orderid_hint_message && (
                <p className="text-sm text-muted-foreground mb-2">
                  {orderIdMeta.orderid_hint_message}
                </p>
              )}
              {orderIdMeta?.sample_orderid && (
                <p className="text-xs text-muted-foreground">
                  Example: {orderIdMeta.sample_orderid}
                </p>
              )}
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={orderId}
                  onChange={(e) => handleOrderIdChange(e.target.value)}
                  placeholder="Enter Order ID"
                  className="pl-10 h-12"
                />
              </div>

              {orderIdFormatError && (
                <p className="text-sm text-destructive">{orderIdFormatError}</p>
              )}

              <Button
                onClick={handleValidateOrderId}
                disabled={!orderId || isValidating || !!orderIdFormatError}
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

        {/* Order Amount Input */}
        {step === 'orderAmount' && selectedRetailer && (
          <div className="animate-fade-in">
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
              <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                Enter your Order Amount
              </h2>
              <p className="text-sm text-muted-foreground">
                Order ID: {orderId}
              </p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="number"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="Enter Order Amount"
                  className="pl-10 h-12"
                  min="0"
                />
              </div>

              <Button
                onClick={handleSubmitClaim}
                disabled={!orderAmount || isSubmitting}
                className="w-full h-12"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Claim'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Additional Details (B1) */}
        {step === 'additionalDetails' && renderAdditionalDetailsStep()}

        {/* Category Selection (C1) */}
        {step === 'categorySelection' && renderCategorySelectionStep()}

        {/* Invoice Upload (C1 Other Category & C2) */}
        {step === 'invoiceUpload' && renderInvoiceUploadStep()}

        {/* Ticket Success */}
        {step === 'ticketSuccess' && renderTicketSuccessStep()}

        {/* Success Step */}
        {step === 'success' && (
          <div className="animate-fade-in">
            <div className="max-w-md mx-auto text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Claim Submitted!
              </h2>
              
              <p className="text-muted-foreground mb-6">
                {submissionResult?.meta?.cashback_id
                  ? `₹${submissionResult.meta.cashbackvalue || '0'} ${submissionResult.meta.cashback_type || 'Cashback'} has been added to your account.`
                  : 'Your missing cashback claim has been added to the review queue.'}
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
            <div className="text-center py-2">
              {selectedRetailer && (
                <div className="w-24 h-12 mx-auto mb-4 flex items-center justify-center border rounded-lg bg-background p-2">
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
              )}
              
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {isTrackedModalSuccess ? 'Cashback Found!' : 'Cashback Tracked'}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                {isTrackedModalSuccess 
                  ? `Great news${user?.firstName ? ` ${user.firstName}` : ''}! We found your cashback and it has been successfully tracked. You can view the details below.`
                  : `Hi${user?.firstName ? ` ${user.firstName}` : ''}, no need to raise a ticket. Cashback has already been tracked for your clicks on this date.`
                }
              </p>
              
              {orderId && (
                <div className="bg-muted/50 border rounded-full px-4 py-3 mb-6 inline-block">
                  <span className="text-sm text-muted-foreground">Order ID: </span>
                  <span className="text-sm font-medium text-foreground">{orderId}</span>
                </div>
              )}
              
              <Button onClick={handleViewTrackedDetails} className="w-full h-12">
                View Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Details Modal */}
        <Dialog
          open={showAddDetailsModal}
          onOpenChange={(open) => {
            setShowAddDetailsModal(open);
            if (!open) {
              setShowB1ConfirmationSheet(false);
              setPendingUserType('');
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <div className="py-2">
              {selectedClaimForDetails && (
                <>
                  {/* B1 Group - New/Existing User Flow */}
                  {selectedClaimForDetails.attributes.groupid === 'B1' && !showB1ConfirmationSheet ? (
                    <div className="text-center">
                      <div className="w-28 h-16 mx-auto mb-6 flex items-center justify-center border rounded-xl bg-background p-3">
                        {getClaimImageUrl(selectedClaimForDetails) ? (
                          <img
                            src={getClaimImageUrl(selectedClaimForDetails)}
                            alt={getClaimStoreName(selectedClaimForDetails)}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {getClaimStoreName(selectedClaimForDetails).charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-lg font-semibold text-foreground mb-2">
                        Great! Are you a new user on {getClaimStoreName(selectedClaimForDetails)}?
                      </h2>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {getClaimStoreName(selectedClaimForDetails)} gives different Cashbacks to new and existing users.
                      </p>
                      
                      <button className="text-sm text-primary font-medium mb-8 inline-flex items-center gap-1 hover:underline">
                        Learn More <ArrowRight className="w-3 h-3" />
                      </button>
                      
                      <Button
                        onClick={() => handleB1UserTypeSelection('New')}
                        className="w-full h-12 mb-4"
                        disabled={isUpdatingDetails}
                      >
                        {isUpdatingDetails ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Yes, I am a New User'
                        )}
                      </Button>
                      
                      <button
                        onClick={() => handleB1UserTypeSelection('Existing')}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isUpdatingDetails}
                      >
                        No, I am an Existing User
                      </button>
                    </div>
                  ) : selectedClaimForDetails.attributes.groupid === 'B1' && showB1ConfirmationSheet ? (
                    <div className="text-center">
                      <div className="w-28 h-16 mx-auto mb-6 flex items-center justify-center border rounded-xl bg-background p-3">
                        {getClaimImageUrl(selectedClaimForDetails) ? (
                          <img
                            src={getClaimImageUrl(selectedClaimForDetails)}
                            alt={getClaimStoreName(selectedClaimForDetails)}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {getClaimStoreName(selectedClaimForDetails).charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-lg font-semibold text-foreground mb-3">
                        {pendingUserType === 'New' ? 'New' : 'Existing'} user cashback
                      </h2>
                      
                      <p className="text-sm text-muted-foreground mb-8">
                        Once {getClaimStoreName(selectedClaimForDetails)} confirms you as a {pendingUserType === 'New' ? 'new' : 'existing'} user, your cashback may increase or decrease.
                      </p>
                      
                      <Button
                        onClick={handleB1ConfirmSubmit}
                        className="w-full h-12"
                        disabled={isUpdatingDetails}
                      >
                        {isUpdatingDetails ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Okay'
                        )}
                      </Button>
                      
                      <button
                        onClick={() => {
                          setShowB1ConfirmationSheet(false);
                          setPendingUserType('');
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
                        disabled={isUpdatingDetails}
                      >
                        Go Back
                      </button>
                    </div>
                  ) : selectedClaimForDetails.attributes.groupid === 'C2' ? (
                    /* C2 Group - Direct to Invoice Upload */
                    <div className="text-center">
                      <div className="w-28 h-16 mx-auto mb-6 flex items-center justify-center border rounded-xl bg-background p-3">
                        {getClaimImageUrl(selectedClaimForDetails) ? (
                          <img
                            src={getClaimImageUrl(selectedClaimForDetails)}
                            alt={getClaimStoreName(selectedClaimForDetails)}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-muted-foreground">
                            {getClaimStoreName(selectedClaimForDetails).charAt(0)}
                          </span>
                        )}
                      </div>
                      
                      <h2 className="text-lg font-semibold text-foreground mb-3">
                        Upload Invoice Screenshot
                      </h2>
                      
                      <p className="text-sm text-muted-foreground mb-6">
                        Please upload a screenshot of your invoice to proceed with your claim.
                      </p>
                      
                      <Button
                        onClick={() => {
                          setQueueId(String(selectedClaimForDetails.id));
                          setSelectedRetailerGroup('C2');
                          setShowAddDetailsModal(false);
                          setStep('invoiceUpload');
                        }}
                        className="w-full h-12"
                      >
                        Upload Invoice
                      </Button>
                    </div>
                  ) : (
                    /* C1 Group - Category Selection Flow */
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-center">
                          Tell us your product category
                        </DialogTitle>
                      </DialogHeader>
                      <div className="pt-4">
                        <p className="text-sm text-muted-foreground text-center mb-6">
                          Select categories from the list below
                        </p>
                        <div className="space-y-3 mb-6">
                          {CATEGORY_OPTIONS_C1.map(category => (
                            <div key={category.value}>
                              <button
                                onClick={() => setSelectedCategory(category.value)}
                                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                                  selectedCategory === category.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selectedCategory === category.value
                                      ? 'border-primary'
                                      : 'border-muted-foreground'
                                  }`}
                                >
                                  {selectedCategory === category.value && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                                  )}
                                </div>
                                <span
                                  className={`font-medium ${
                                    selectedCategory === category.value ? 'text-primary' : 'text-foreground'
                                  }`}
                                >
                                  {category.label}
                                </span>
                              </button>
                              <p className="text-xs text-muted-foreground mt-1 ml-8">
                                {category.description}
                              </p>
                            </div>
                          ))}
                        </div>
                        
                        <Button
                          onClick={handleAddDetailsToExistingClaim}
                          disabled={isUpdatingDetails || !selectedCategory}
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
                    </>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Queue Already Added Modal */}
        <Dialog open={showQueueAlreadyAddedModal} onOpenChange={setShowQueueAlreadyAddedModal}>
          <DialogContent className="sm:max-w-md">
            <div className="text-center py-2">
              {selectedRetailer && (
                <div className="w-24 h-12 mx-auto mb-4 flex items-center justify-center border rounded-lg bg-background p-2">
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
              )}
              
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Cashback Tracked
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Hi{user?.firstName ? ` ${user.firstName}` : ''}, no need to raise a ticket. Cashback has already been tracked for your clicks on this date.
              </p>
              
              {orderId && (
                <div className="bg-muted/50 border rounded-full px-4 py-3 mb-6 inline-block">
                  <span className="text-sm text-muted-foreground">Order ID: </span>
                  <span className="text-sm font-medium text-foreground">{orderId}</span>
                </div>
              )}
              
              <Button
                onClick={() => {
                  setShowQueueAlreadyAddedModal(false);
                  handleViewClaims();
                }}
                className="w-full h-12"
              >
                View Details
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Validation Error Modal */}
        <Dialog 
          open={showValidationErrorModal} 
          onOpenChange={(open) => {
            if (!open && validationErrorShouldRedirect) {
              // Reset states and redirect to claims page
              resetClaimState();
              setStep('claims');
              loadClaims();
            }
            setShowValidationErrorModal(open);
            if (!open) {
              setValidationErrorShouldRedirect(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="sr-only">Validation Error</DialogTitle>
            </DialogHeader>
            <div className="text-center py-2">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {validationErrorShouldRedirect ? 'Already Tracked' : 'Unable to Process'}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                {validationErrorMessage}
              </p>
              
              {orderId && (
                <div className="bg-muted/50 border rounded-full px-4 py-3 mb-6 inline-block">
                  <span className="text-sm text-muted-foreground">Order ID: </span>
                  <span className="text-sm font-medium text-foreground">{orderId}</span>
                </div>
              )}
              
              <Button 
                onClick={() => {
                  setShowValidationErrorModal(false);
                  if (validationErrorShouldRedirect) {
                    resetClaimState();
                    setStep('claims');
                    loadClaims();
                    setValidationErrorShouldRedirect(false);
                  }
                }} 
                className="w-full h-12"
              >
                {validationErrorShouldRedirect ? 'View My Claims' : 'Okay'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info/Success Modal */}
        <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="sr-only">
                {infoModalVariant === 'success' ? 'Success' : infoModalVariant === 'error' ? 'Error' : 'Information'}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-2">
              <div
                className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full ${
                  infoModalVariant === 'success'
                    ? 'bg-success/10'
                    : infoModalVariant === 'error'
                    ? 'bg-destructive/10'
                    : 'bg-primary/10'
                }`}
              >
                {infoModalVariant === 'success' ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : infoModalVariant === 'error' ? (
                  <XCircle className="w-8 h-8 text-destructive" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-primary" />
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {infoModalTitle}
              </h2>
              
              <p className="text-muted-foreground mb-6">
                {infoModalMessage}
              </p>
              
              <Button onClick={() => setShowInfoModal(false)} className="w-full h-12">
                Okay
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MissingCashback;
