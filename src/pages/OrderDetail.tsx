import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Info } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { fetchOrderDetail } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface OrderDetail {
  id: string;
  type: string;
  attributes: {
    store_name?: string;
    store_logo?: string;
    cashback_type?: string;
    amount?: string;
    status?: string;
    order_id?: string;
    referral_name?: string;
    bonus_type?: string;
    note?: string;
    transaction_date?: string;
    expected_confirmation_date?: string;
    confirmation_date?: string;
    important_info?: string;
    status_message?: string;
    tracking_info?: string;
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

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (attrs.cashback_type === 'referral' || attrs.referral_name) {
      return 'Referral';
    }
    if (attrs.cashback_type === 'bonus' || attrs.bonus_type) {
      return 'Bonus';
    }
    return 'Cashback';
  };

  const getStatusLabel = () => {
    if (!order) return '';
    const status = order.attributes.status?.toLowerCase() || 'pending';
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
  const status = attrs.status?.toLowerCase() || 'pending';

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

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Order Summary */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="card-elevated p-6 text-center">
              {/* Store Logo */}
              <div className="w-24 h-24 mx-auto bg-background border rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                {attrs.store_logo ? (
                  <img
                    src={attrs.store_logo}
                    alt={attrs.store_name || 'Store'}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {(attrs.store_name || 'C').charAt(0)}
                  </span>
                )}
              </div>

              {/* Amount */}
              <p className="text-3xl font-bold text-foreground mb-3">
                ₹{attrs.amount || '0'}
              </p>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[status]}`}>
                <span className={`w-2 h-2 rounded-full ${
                  status === 'pending' ? 'bg-warning' :
                  status === 'confirmed' ? 'bg-success' :
                  status === 'paid' ? 'bg-primary' :
                  'bg-destructive'
                }`} />
                {getStatusLabel()}
              </span>

              {/* Status Message */}
              <div className="mt-6 text-left">
                <p className="font-semibold text-foreground mb-2">Hey, You've Done It!</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {attrs.status_message || (
                    status === 'pending'
                      ? 'Your transaction will remain in Pending status till the return/cancellation period is over and the retailer has shared the final report with us. Please check your expected confirmation date.'
                      : status === 'confirmed'
                      ? 'Great news! Your cashback has been confirmed and will be paid out soon.'
                      : status === 'paid'
                      ? 'Your cashback has been paid to your account.'
                      : 'This transaction has been cancelled.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="flex-1">
            {/* Info Bar */}
            <div className="bg-warning/10 border-t-4 border-warning rounded-lg overflow-hidden mb-6">
              <div className="grid grid-cols-2 divide-x divide-warning/20">
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {attrs.referral_name ? 'Referral Name' : attrs.order_id ? 'Order ID' : 'Transaction ID'}
                  </p>
                  <p className="font-semibold text-foreground">
                    {attrs.referral_name || attrs.order_id || order.id}
                  </p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Expected Confirmation</p>
                  <p className="font-semibold text-foreground">
                    {formatDate(attrs.expected_confirmation_date || attrs.confirmation_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground mb-1">Important Information</p>
                  <p className="text-sm text-muted-foreground">
                    {attrs.important_info || (
                      attrs.referral_name
                        ? "Your Referral Cashback will get confirmed once your Referral's Cashback is Confirmed."
                        : 'Your cashback will be confirmed after the return/cancellation period ends.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            {(attrs.transaction_date || attrs.tracking_info || attrs.bonus_type || attrs.note) && (
              <div className="card-elevated p-4 mt-6">
                <h3 className="font-semibold text-foreground mb-4">Additional Details</h3>
                <div className="space-y-3 text-sm">
                  {attrs.transaction_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction Date</span>
                      <span className="text-foreground">{formatDate(attrs.transaction_date)}</span>
                    </div>
                  )}
                  {attrs.bonus_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bonus Type</span>
                      <span className="text-foreground">{attrs.bonus_type}</span>
                    </div>
                  )}
                  {attrs.note && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Note</span>
                      <span className="text-foreground">{attrs.note}</span>
                    </div>
                  )}
                  {attrs.tracking_info && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tracking Info</span>
                      <span className="text-foreground">{attrs.tracking_info}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetail;
