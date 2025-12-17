import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Filter, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/context/AuthContext';
import { fetchOrders } from '@/lib/api';
import { format, subMonths } from 'date-fns';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Order {
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
  };
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border border-warning/30',
  confirmed: 'bg-success/10 text-success border border-success/30',
  paid: 'bg-primary/10 text-primary border border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border border-destructive/30',
  requested: 'bg-blue-100 text-blue-600 border border-blue-300',
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  // Filter state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [cashbackTypeFilters, setCashbackTypeFilters] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Collapsible state
  const [statusOpen, setStatusOpen] = useState(true);
  const [datesOpen, setDatesOpen] = useState(true);
  const [cashbackOpen, setCashbackOpen] = useState(true);
  const [dateRangeOpen, setDateRangeOpen] = useState(true);

  const loadOrders = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const filters = {
        status: statusFilters.join(',') || undefined,
        cashbacktype: cashbackTypeFilters.length > 0 ? cashbackTypeFilters.join(',') : 'cashback,rewards',
        fromdate: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
        todate: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
      };

      const response = await fetchOrders(accessToken, currentPage, 10, filters);
      setOrders(response.data || []);
      setTotalRecords(response.meta?.total_records || 0);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [accessToken, currentPage]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadOrders();
  };

  const handleResetFilters = () => {
    setStatusFilters([]);
    setDateFilter('');
    setCashbackTypeFilters([]);
    setFromDate(subMonths(new Date(), 3));
    setToDate(new Date());
    setCurrentPage(1);
    loadOrders();
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilters(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleCashbackTypeFilter = (type: string) => {
    setCashbackTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleDateFilter = (filter: string) => {
    setDateFilter(prev => prev === filter ? '' : filter);
    // Update date range based on selection
    const now = new Date();
    switch (filter) {
      case 'this_month':
        setFromDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setToDate(now);
        break;
      case 'last_month':
        setFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        setToDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'last_3_months':
        setFromDate(subMonths(now, 3));
        setToDate(now);
        break;
      case 'last_6_months':
        setFromDate(subMonths(now, 6));
        setToDate(now);
        break;
    }
  };

  const getOrderTypeLabel = (order: Order) => {
    const attrs = order.attributes;
    if (attrs.cashback_type === 'referral' || attrs.referral_name) {
      return 'Referral';
    }
    if (attrs.cashback_type === 'bonus' || attrs.bonus_type) {
      return 'Bonus';
    }
    return 'Cashback';
  };

  const getOrderSubtitle = (order: Order) => {
    const attrs = order.attributes;
    if (attrs.referral_name) {
      return `Referral Name: ${attrs.referral_name}`;
    }
    if (attrs.bonus_type) {
      return `Bonus Type: ${attrs.bonus_type}`;
    }
    if (attrs.order_id) {
      return `Order ID: ${attrs.order_id}`;
    }
    return '';
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6">
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
          <span className="mx-2">/</span>
          <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/earnings')}>My Earnings</span>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">My Order Details</span>
        </nav>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 shrink-0">
            <div className="card-elevated p-4">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h2>

              {/* Status Filter */}
              <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium">
                  Status
                  <ChevronRight className={`w-4 h-4 transition-transform ${statusOpen ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">Show only</p>
                  {['pending', 'confirmed', 'paid', 'requested', 'cancelled'].map(status => (
                    <label key={status} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={statusFilters.includes(status)}
                        onCheckedChange={() => toggleStatusFilter(status)}
                      />
                      <span className="capitalize">{status}</span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Dates Filter */}
              <Collapsible open={datesOpen} onOpenChange={setDatesOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t">
                  Dates
                  <ChevronRight className={`w-4 h-4 transition-transform ${datesOpen ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">Select transactions of</p>
                  {[
                    { value: 'this_month', label: 'This month' },
                    { value: 'last_month', label: 'Last month' },
                    { value: 'last_3_months', label: 'Last 3 months' },
                    { value: 'last_6_months', label: 'Last 6 months' },
                  ].map(option => (
                    <label key={option.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={dateFilter === option.value}
                        onCheckedChange={() => toggleDateFilter(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Cashback/Rewards Filter */}
              <Collapsible open={cashbackOpen} onOpenChange={setCashbackOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t">
                  Cashback/Rewards
                  <ChevronRight className={`w-4 h-4 transition-transform ${cashbackOpen ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pb-4">
                  <p className="text-xs text-muted-foreground mb-2">Show only</p>
                  {['cashback', 'rewards'].map(type => (
                    <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={cashbackTypeFilters.includes(type)}
                        onCheckedChange={() => toggleCashbackTypeFilter(type)}
                      />
                      <span className="capitalize">{type}</span>
                    </label>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Date Range Filter */}
              <Collapsible open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium border-t">
                  Date Range
                  <ChevronRight className={`w-4 h-4 transition-transform ${dateRangeOpen ? 'rotate-90' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pb-4">
                  <p className="text-xs text-muted-foreground">Select date range</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-primary mb-1">From</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-xs justify-start">
                            {fromDate ? format(fromDate, 'dd/MM/yy') : 'Select Date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={fromDate}
                            onSelect={setFromDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <p className="text-xs text-primary mb-1">Till</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full text-xs justify-start">
                            {toDate ? format(toDate, 'dd/MM/yy') : 'Select Date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={toDate}
                            onSelect={setToDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Apply/Reset Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleApplyFilters} className="flex-1" size="sm">
                  Apply
                </Button>
                <Button onClick={handleResetFilters} variant="outline" className="flex-1" size="sm">
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="flex-1">
            {/* Help Banner */}
            <div className="bg-muted/50 p-3 rounded-lg mb-4 text-sm text-muted-foreground">
              Please tap on the order you need help with
            </div>

            {/* Missing Order Banner */}
            <div
              className="card-elevated p-4 mb-4 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate('/missing-cashback')}
            >
              <div>
                <p className="font-semibold text-foreground">Don't See Your Order Here?</p>
                <p className="text-sm text-muted-foreground">Check Status</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="card-elevated p-6 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive">{error}</p>
                <Button onClick={loadOrders} className="mt-4">Retry</Button>
              </div>
            )}

            {/* Orders */}
            {!isLoading && !error && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="card-elevated p-8 text-center">
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <div
                      key={order.id}
                      className="card-elevated p-4 flex items-center gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/order/${order.id}`)}
                    >
                      {/* Store Logo */}
                      <div className="w-16 h-16 bg-background border rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                        {order.attributes.store_logo ? (
                          <img
                            src={order.attributes.store_logo}
                            alt={order.attributes.store_name || 'Store'}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {(order.attributes.store_name || 'C').charAt(0)}
                          </span>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">
                          {getOrderTypeLabel(order)}: ₹{order.attributes.amount || '0'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {getOrderSubtitle(order)}
                        </p>
                        {order.attributes.note && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Note: {order.attributes.note}
                          </p>
                        )}
                      </div>

                      {/* Status & Arrow */}
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusColors[order.attributes.status?.toLowerCase() || 'pending']}`}>
                          {order.attributes.status || 'Pending'}
                        </span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pagination info */}
            {!isLoading && orders.length > 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing {orders.length} of {totalRecords} orders
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
