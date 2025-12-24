import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Info, ChevronDown } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { fetchOrderDetail } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface OrderDetailData {
  id: string;
  type: string;
  attributes: {
    merchant_image_url?: string;
    merchant_name?: string;
    cashback_type?: string;
    cashback_amount?: string;
    cashback_status?: string;
    order_id?: string;
    order_amount?: string;
    referral_name?: string;
    bonus_type?: string;
    comments?: string;
    currency?: string;
    groupid?: string;
    transaction_date?: string;
    paid_date?: string;
    expected_confirmation_date?: string;
    confirm_date?: string;
    important_info?: string;
    tracking_speed?: string;
  };
  links?: {
    self?: string;
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/30',
  confirmed: 'bg-success/10 text-success border border-success/30',
  paid: 'bg-primary/10 text-primary border border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border border-destructive/30',
  requested: 'bg-blue-100 text-blue-600 border border-blue-300',
};

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showKnowMore, setShowKnowMore] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      if (!accessToken || !orderId) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchOrderDetail(accessToken, orderId);
        // Handle both array and single object response
        const orderData = Array.isArray(response.data) ? response.data[0] : response.data;
        setOrder(orderData);
      } catch (e: any) {
        setError(e.message || 'Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [accessToken, orderId]);

  const getOrderTypeLabel = () => {
    if (!order) return '';
    const attrs = order.attributes;
    const cashbackType = attrs.cashback_type?.toLowerCase();
    
    if (cashbackType === 'referral' || attrs.referral_name) {
      return 'Referral';
    }
    if (attrs.bonus_type) {
      return 'Bonus';
    }
    if (cashbackType === 'rewards') {
      return 'Rewards';
    }
    return 'Cashback';
  };

  const getStatusLabel = () => {
    if (!order) return '';
    const status = order.attributes.cashback_status?.toLowerCase() || 'pending';
    const type = getOrderTypeLabel();
    return `${type} ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd-MM-yyyy');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="card-elevated p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <div className="card-elevated p-8 text-center">
            <p className="text-muted-foreground">Order not found</p>
            <Button onClick={() => navigate('/orders')} className="mt-4">Back to Orders</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const attrs = order.attributes;
  const status = attrs.cashback_status?.toLowerCase() || 'pending';

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
          <span className="mx-2">/</span>
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/earnings')}>My Earnings</span>
          <span className="mx-2">/</span>
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/orders')}>My Order Details</span>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{orderId}</span>
        </nav>

        {/* Desktop Layout - Two columns */}
        <div className="hidden lg:grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Left Column - Store & Amount */}
          <div className="card-elevated p-6 text-center h-fit">
            {/* Store Logo */}
            <div className="w-32 h-20 mx-auto bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
              {attrs.merchant_image_url ? (
                <img
                  src={attrs.merchant_image_url}
                  alt={attrs.merchant_name || 'Store'}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {(attrs.merchant_name || 'C').charAt(0)}
                </span>
              )}
            </div>

            {/* Amount */}
            <p className="text-3xl font-bold text-foreground mb-4">
              ₹{attrs.cashback_amount || '0'}
            </p>

            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${statusColors[status]}`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'pending' ? 'bg-warning' :
                status === 'confirmed' ? 'bg-success' :
                status === 'paid' ? 'bg-primary' :
                'bg-destructive'
              }`} />
              {getStatusLabel()}
            </span>
            
            {/* Know More Dropdown */}
            <Collapsible open={showKnowMore} onOpenChange={setShowKnowMore}>
              <CollapsibleTrigger className="text-sm text-muted-foreground flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                Know More 
                <ChevronDown className={`w-4 h-4 transition-transform ${showKnowMore ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="text-left text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {attrs.comments || (
                    status === 'pending'
                      ? 'Your transaction will remain in Pending status till the return/cancellation period is over and the retailer has shared the final report with us.'
                      : status === 'confirmed'
                      ? 'Great news! Your cashback has been confirmed and will be paid out soon.'
                      : status === 'paid'
                      ? 'Your cashback has been paid to your account.'
                      : 'This transaction has been cancelled.'
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Order Info Grid */}
            <div className="card-elevated overflow-hidden">
              {/* Blue Header Bar */}
              <div className="h-2 bg-primary" />
              
              {/* Grid of Order Details */}
              <div className="grid grid-cols-2 gap-px bg-border">
                {/* Order Amount */}
                {attrs.order_amount && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Order Amount</p>
                    <p className="text-xl font-bold text-foreground">₹{attrs.order_amount}</p>
                  </div>
                )}
                
                {/* Transaction Date */}
                {attrs.transaction_date && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Transaction Date</p>
                    <p className="text-xl font-bold text-foreground">{formatDate(attrs.transaction_date)}</p>
                  </div>
                )}
                
                {/* Order ID */}
                <div className="bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                  <p className="text-xl font-bold text-foreground break-all">{order.id || 'N/A'}</p>
                </div>
                
                {/* Paid Date (for paid status) */}
                {status === 'paid' && attrs.paid_date && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Paid Date</p>
                    <p className="text-xl font-bold text-foreground">{formatDate(attrs.paid_date)}</p>
                  </div>
                )}
                
                {/* Expected Confirmation */}
                {attrs.expected_confirmation_date && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Expected Confirmation</p>
                    <p className="text-xl font-bold text-foreground">{formatDate(attrs.expected_confirmation_date)}</p>
                  </div>
                )}
                
                {/* Confirm Date (for confirmed status) */}
                {status === 'confirmed' && attrs.confirm_date && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Confirmed Date</p>
                    <p className="text-xl font-bold text-foreground">{formatDate(attrs.confirm_date)}</p>
                  </div>
                )}
                
                {/* Referral Name */}
                {attrs.referral_name && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Referral Name</p>
                    <p className="text-xl font-bold text-foreground">{attrs.referral_name}</p>
                  </div>
                )}
                
                {/* Bonus Type */}
                {attrs.bonus_type && (
                  <div className="bg-card p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-1">Bonus Type</p>
                    <p className="text-xl font-bold text-foreground">{attrs.bonus_type}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Important Information</p>
                  <p className="text-sm text-muted-foreground">
                    If you still have a query then please tap on the button below
                  </p>
                </div>
              </div>
            </div>

            {/* Raise a Query Button */}
            <Button 
              className="w-full max-w-xs mx-auto block" 
              onClick={() => navigate('/missing-cashback')}
            >
              Raise a Query
            </Button>
          </div>
        </div>

        {/* Mobile Layout - Single column */}
        <div className="lg:hidden max-w-md mx-auto">
          {/* Order Summary Card */}
          <div className="card-elevated p-6 text-center mb-6">
            {/* Store Logo */}
            <div className="w-32 h-20 mx-auto bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
              {attrs.merchant_image_url ? (
                <img
                  src={attrs.merchant_image_url}
                  alt={attrs.merchant_name || 'Store'}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {(attrs.merchant_name || 'C').charAt(0)}
                </span>
              )}
            </div>

            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${statusColors[status]}`}>
              <span className={`w-2 h-2 rounded-full ${
                status === 'pending' ? 'bg-warning' :
                status === 'confirmed' ? 'bg-success' :
                status === 'paid' ? 'bg-primary' :
                'bg-destructive'
              }`} />
              {getStatusLabel()}
            </span>

            {/* Amount */}
            <p className="text-3xl font-bold text-foreground">
              ₹{attrs.cashback_amount || '0'}
            </p>
            
            {/* Know More Dropdown */}
            <Collapsible open={showKnowMore} onOpenChange={setShowKnowMore}>
              <CollapsibleTrigger className="text-sm text-muted-foreground mt-2 flex items-center gap-1 mx-auto hover:text-foreground transition-colors">
                Know More 
                <ChevronDown className={`w-4 h-4 transition-transform ${showKnowMore ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="text-left text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {attrs.comments || (
                    status === 'pending'
                      ? 'Your transaction will remain in Pending status till the return/cancellation period is over and the retailer has shared the final report with us.'
                      : status === 'confirmed'
                      ? 'Great news! Your cashback has been confirmed and will be paid out soon.'
                      : status === 'paid'
                      ? 'Your cashback has been paid to your account.'
                      : 'This transaction has been cancelled.'
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Order Details */}
          <div className="card-elevated divide-y">
            {attrs.order_amount && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Order Amount</span>
                <span className="font-medium text-foreground">₹{attrs.order_amount}</span>
              </div>
            )}
            <div className="p-4 flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-medium text-foreground">{order.id || 'N/A'}</span>
            </div>
            {attrs.transaction_date && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Transaction Date</span>
                <span className="font-medium text-foreground">{formatDate(attrs.transaction_date)}</span>
              </div>
            )}
            {status === 'paid' && attrs.paid_date && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Paid Date</span>
                <span className="font-medium text-foreground">{formatDate(attrs.paid_date)}</span>
              </div>
            )}
            {/* Expected Confirmation */}
            {attrs.expected_confirmation_date && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Expected Confirmation</span>
                <span className="font-medium text-foreground">{formatDate(attrs.expected_confirmation_date)}</span>
              </div>
            )}
            {status === 'confirmed' && attrs.confirm_date && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Confirmed Date</span>
                <span className="font-medium text-foreground">{formatDate(attrs.confirm_date)}</span>
              </div>
            )}
            {attrs.referral_name && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Referral Name</span>
                <span className="font-medium text-foreground">{attrs.referral_name}</span>
              </div>
            )}
            {attrs.bonus_type && (
              <div className="p-4 flex justify-between">
                <span className="text-muted-foreground">Bonus Type</span>
                <span className="font-medium text-foreground">{attrs.bonus_type}</span>
              </div>
            )}
          </div>

          {/* Important Information */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground mb-1">Important Information</p>
                <p className="text-sm text-muted-foreground">
                  If you still have a query then please tap on the button below
                </p>
              </div>
            </div>
          </div>

          {/* Raise a Query Button */}
          <Button 
            className="w-full mt-6" 
            onClick={() => navigate('/missing-cashback')}
          >
            Raise a Query
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetail;
