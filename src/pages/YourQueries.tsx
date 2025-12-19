import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, CheckCircle, XCircle, Loader2, RefreshCw, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { fetchMissingCashbackQueue } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';

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

const YourQueries: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuth();
  
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');

  useEffect(() => {
    if (accessToken) {
      loadClaims();
    }
  }, [accessToken, statusFilter]);

  const loadClaims = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchMissingCashbackQueue(accessToken, statusFilter, 1, 50);
      const claimsData = response?.data;
      setClaims(Array.isArray(claimsData) ? claimsData : []);
    } catch (err: any) {
      console.error('Failed to load claims:', err);
      const errorMsg = err.message?.toLowerCase() || '';
      if (errorMsg.includes('not found') || errorMsg.includes('no data') || errorMsg.includes('empty')) {
        setClaims([]);
      } else {
        setError(err.message || 'Failed to load claims');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

        {/* Section Header */}
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Your Recent Queries
        </h2>

        {isLoading ? (
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
        ) : error ? (
          <div className="card-elevated p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-destructive">
              <XCircle className="w-full h-full" />
            </div>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadClaims} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : claims.length === 0 ? (
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
              Sorry, No Queries Found in your Account
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              The queries you raise on your tracked Cashback/Rewards are shown here.
            </p>
            
            <Button 
              onClick={() => navigate('/missing-cashback')} 
              className="mt-6"
            >
              Raise a Query
            </Button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default YourQueries;
