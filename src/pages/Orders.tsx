import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Filter, AlertCircle, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/context/AuthContext';
import { fetchOrders } from '@/lib/api';
import { format, subMonths } from 'date-fns';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LoginPrompt from '@/components/LoginPrompt';
import { ShoppingBag } from 'lucide-react';
interface Order {
  id: string;
  type: string;
  attributes: {
    merchant_image_url?: string;
    cashback_type?: string;
    cashback_amount?: string;
    cashback_status?: string;
    order_id?: string;
    referral_name?: string;
    bonus_type?: string;
    comments?: string;
    currency?: string;
    groupid?: string;
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

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();

  // Filter state
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [cashbackTypeFilters, setCashbackTypeFilters] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  
  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Collapsible state
  const [statusOpen, setStatusOpen] = useState(true);
  const [datesOpen, setDatesOpen] = useState(true);
  const [cashbackOpen, setCashbackOpen] = useState(true);
  const [dateRangeOpen, setDateRangeOpen] = useState(true);
  
  // Mobile filter sheet state
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  
  // Count active filters
  const activeFilterCount = statusFilters.length + cashbackTypeFilters.length + (dateFilter ? 1 : 0);

  const pageSize = 10;

  // Load orders with current filters
  const loadOrders = useCallback(async (page: number, append: boolean = false) => {
    if (!accessToken) return;
    
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const filters = {
        status: statusFilters.length > 0 ? statusFilters.join(',') : undefined,
        cashbacktype: cashbackTypeFilters.length > 0 ? cashbackTypeFilters.join(',') : 'cashback,rewards',
        fromdate: fromDate ? format(fromDate, 'yyyy-MM-dd') : undefined,
        todate: toDate ? format(toDate, 'yyyy-MM-dd') : undefined,
      };

      console.log('Fetching orders with filters:', filters, 'page:', page);
      const response = await fetchOrders(accessToken, page, pageSize, filters);
      console.log('Orders response:', response);
      
      const newOrders = response.data || [];
      const total = response.meta?.total_records || 0;
      
      if (append) {
        setOrders(prev => [...prev, ...newOrders]);
      } else {
        setOrders(newOrders);
      }
      
      setTotalRecords(total);
      setHasMore(page * pageSize < total);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [accessToken, statusFilters, cashbackTypeFilters, fromDate, toDate]);

  // Initial load and filter changes
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    loadOrders(1, false);
  }, [accessToken, statusFilters, cashbackTypeFilters, fromDate, toDate, retryKey, loadOrders]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          loadOrders(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore, currentPage, loadOrders]);

  const handleRetry = () => setRetryKey(prev => prev + 1);

  const handleApplyFilters = () => {
    // Reset state - the useEffect will handle loading
    setCurrentPage(1);
    setOrders([]);
    setHasMore(true);
  };

  const handleResetFilters = () => {
    setStatusFilters([]);
    setDateFilter('');
    setCashbackTypeFilters([]);
    setFromDate(subMonths(new Date(), 3));
    setToDate(new Date());
    setCurrentPage(1);
    setOrders([]);
    setHasMore(true);
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

  const getOrderSubtitle = (order: Order) => {
    const attrs = order.attributes;
    if (attrs.referral_name) {
      return `Referral Name: ${attrs.referral_name}`;
    }
    if (attrs.bonus_type) {
      return `${attrs.bonus_type}`;
    }
    if (attrs.order_id) {
      return `Order ID: ${attrs.order_id}`;
    }
    return '';
  };

  // Filter content component (reused in sidebar and sheet)
  const FilterContent = ({ inSheet = false }: { inSheet?: boolean }) => (
    <>
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
        <Button onClick={() => { handleApplyFilters(); if (inSheet) setFilterSheetOpen(false); }} className="flex-1" size="sm">
          Apply
        </Button>
        <Button onClick={handleResetFilters} variant="outline" className="flex-1" size="sm">
          Reset
        </Button>
      </div>
    </>
  );

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="View Your Orders"
          description="Login to track your orders and cashback status"
          icon={ShoppingBag}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-3 md:p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Back Button & Breadcrumb */}
        <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-8 w-8 md:h-10 md:w-10">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <nav className="text-xs md:text-sm text-muted-foreground truncate">
            <span className="cursor-pointer hover:text-foreground" onClick={() => navigate('/')}>Home</span>
            <span className="mx-1 md:mx-2">/</span>
            <span className="hidden sm:inline cursor-pointer hover:text-foreground" onClick={() => navigate('/earnings')}>Earnings</span>
            <span className="hidden sm:inline mx-1 md:mx-2">/</span>
            <span className="text-foreground font-medium">Orders</span>
          </nav>
        </div>

        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-4">
          <Button 
            variant="outline" 
            onClick={() => setFilterSheetOpen(true)}
            className="w-full justify-between h-10"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </span>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </SheetTitle>
            </SheetHeader>
            <FilterContent inSheet />
          </SheetContent>
        </Sheet>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Desktop Filters Sidebar - Hidden on mobile */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="card-elevated p-4">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h2>
              <FilterContent />
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
                <Button onClick={handleRetry} className="mt-4">Retry</Button>
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
                        {order.attributes.merchant_image_url ? (
                          <img
                            src={order.attributes.merchant_image_url}
                            alt="Store"
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            C
                          </span>
                        )}
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[order.attributes.cashback_status?.toLowerCase() || 'pending']}`}>
                            {order.attributes.cashback_status || 'Pending'}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground">
                          {getOrderTypeLabel(order)}: ₹{order.attributes.cashback_amount || '0'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {getOrderSubtitle(order)}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="h-10" />
            
            {/* Loading More Indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* End of list info */}
            {!isLoading && orders.length > 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Showing {orders.length} of {totalRecords} orders
                {!hasMore && orders.length === totalRecords && ' • All orders loaded'}
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
