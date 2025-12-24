import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, CheckCircle, XCircle, Loader2, RefreshCw, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { fetchOrders } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';

interface TicketData {
  cashbackid?: number;
  freshdesk_id?: number;
  status?: string;
  status_code?: number;
  question?: string;
  remarks?: string;
  query_raised_at?: string;
  has_revised?: string;
  expected_resolution_time?: string;
  query_resolved_at?: string;
  cancelled_option?: string;
  show_resolution_time?: string;
  imageurl?: string;
}

interface OrderWithTicket {
  id: string;
  type: string;
  attributes: {
    merchant_name?: string;
    merchant_image_url?: string;
    cashback_amount?: string;
    cashback_status?: string;
    order_id?: string;
    transaction_date?: string;
  };
  ticket: TicketData;
}

const YourQueries: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  
  const [queries, setQueries] = useState<OrderWithTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (accessToken) {
      loadQueries();
    }
  }, [accessToken]);

  const loadQueries = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch orders and filter for those with tickets
      const response = await fetchOrders(accessToken, 1, 100, {});
      const ordersData = response?.data || [];
      
      // Filter orders that have ticket data in relationships
      const ordersWithTickets: OrderWithTicket[] = [];
      
      for (const order of ordersData) {
        const ticketData = order.relationships?.ticket?.data?.attributes;
        if (ticketData && ticketData.status) {
          ordersWithTickets.push({
            id: order.id,
            type: order.type,
            attributes: order.attributes,
            ticket: ticketData,
          });
        }
      }
      
      setQueries(ordersWithTickets);
    } catch (err: any) {
      console.error('Failed to load queries:', err);
      const errorMsg = err.message?.toLowerCase() || '';
      if (errorMsg.includes('not found') || errorMsg.includes('no data') || errorMsg.includes('empty')) {
        setQueries([]);
      } else {
        setError(err.message || 'Failed to load queries');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
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

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'pending':
        return 'bg-warning/10 text-warning border border-warning/30';
      case 'resolved':
      case 'closed':
        return 'bg-success/10 text-success border border-success/30';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border border-muted';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="w-3 h-3" />;
      case 'rejected':
        return <XCircle className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  const filteredQueries = queries.filter(q => {
    if (statusFilter === 'all') return true;
    const status = q.ticket.status?.toLowerCase() || '';
    if (statusFilter === 'open') return status === 'open' || status === 'pending';
    if (statusFilter === 'resolved') return status === 'resolved' || status === 'closed';
    if (statusFilter === 'rejected') return status === 'rejected';
    return true;
  });

  const openCount = queries.filter(q => {
    const s = q.ticket.status?.toLowerCase();
    return s === 'open' || s === 'pending';
  }).length;

  const resolvedCount = queries.filter(q => {
    const s = q.ticket.status?.toLowerCase();
    return s === 'resolved' || s === 'closed';
  }).length;

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="Your Queries"
          description="Login to view your cashback queries and their status"
          icon={FileText}
        />
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
          <h1 className="text-xl font-display font-bold text-foreground">
            Your Queries
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{queries.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-warning">{openCount}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div className="card-elevated p-4 text-center">
            <p className="text-2xl font-bold text-success">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-elevated p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card-elevated p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-destructive">
              <XCircle className="w-full h-full" />
            </div>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadQueries} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Notepad Illustration */}
            <div className="w-32 h-32 mb-6 relative">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                {/* Spiral rings */}
                <ellipse cx="60" cy="25" rx="35" ry="8" fill="#60a5fa" opacity="0.3"/>
                {[0, 1, 2, 3, 4].map((i) => (
                  <circle key={i} cx={35 + i * 12} cy="20" r="4" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1"/>
                ))}
                {/* Notepad body */}
                <rect x="20" y="25" width="80" height="80" rx="8" fill="#60a5fa" />
                <rect x="25" y="30" width="70" height="70" rx="6" fill="#93c5fd" />
                {/* Lines on notepad */}
                <line x1="35" y1="50" x2="85" y2="50" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round"/>
                <line x1="35" y1="65" x2="75" y2="65" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round"/>
                <line x1="35" y1="80" x2="80" y2="80" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round"/>
                {/* Pencil */}
                <g transform="rotate(-45, 30, 60)">
                  <rect x="5" y="55" width="50" height="10" rx="2" fill="#f59e0b"/>
                  <polygon points="55,55 65,60 55,65" fill="#fed7aa"/>
                  <rect x="50" y="55" width="5" height="10" fill="#374151"/>
                  <polygon points="65,60 70,60 67,62" fill="#374151"/>
                </g>
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Queries Found
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Queries you raise on your tracked orders will appear here.
            </p>
            
            <Button 
              onClick={() => navigate('/orders')} 
              className="mt-6"
            >
              View Orders
            </Button>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({queries.length})</TabsTrigger>
                <TabsTrigger value="open">Open ({openCount})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({resolvedCount})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {filteredQueries.map((query) => (
                <div 
                  key={query.id} 
                  className="card-elevated p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/order/${query.id}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Store Logo */}
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                      {query.attributes.merchant_image_url ? (
                        <img
                          src={query.attributes.merchant_image_url}
                          alt={query.attributes.merchant_name || 'Store'}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary">
                          {(query.attributes.merchant_name || 'S').charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Query Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">
                            {query.attributes.merchant_name || 'Store'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Order: {query.attributes.order_id || query.id}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusColor(query.ticket.status)}`}>
                          {getStatusIcon(query.ticket.status)}
                          {query.ticket.status || 'Unknown'}
                        </span>
                      </div>

                      {/* Query Question */}
                      {query.ticket.question && (
                        <p className="text-sm text-foreground mt-2 line-clamp-2">
                          {query.ticket.question}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {query.ticket.query_raised_at && (
                          <span>Raised: {formatDate(query.ticket.query_raised_at)}</span>
                        )}
                        {query.ticket.expected_resolution_time && query.ticket.show_resolution_time === 'yes' && (
                          <span>Expected: {query.ticket.expected_resolution_time}</span>
                        )}
                        {query.ticket.query_resolved_at && (
                          <span>Resolved: {formatDate(query.ticket.query_resolved_at)}</span>
                        )}
                      </div>

                      {/* Remarks */}
                      {query.ticket.remarks && (
                        <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                          <span className="font-medium">Remarks:</span> {query.ticket.remarks}
                        </p>
                      )}

                      {/* Amount */}
                      {query.attributes.cashback_amount && (
                        <p className="text-sm font-medium text-foreground mt-2">
                          ₹{query.attributes.cashback_amount}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </div>
              ))}
            </div>

            {filteredQueries.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No queries match this filter.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default YourQueries;
