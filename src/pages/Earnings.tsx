import React, { useState } from 'react';
import { TrendingUp, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Filter, Search } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Mock data
const mockTransactions = [
  {
    id: 1,
    store: 'Amazon',
    orderId: 'AMZ123456789',
    amount: 150.0,
    status: 'confirmed',
    transactionDate: '2024-12-10',
    confirmationDate: '2024-12-15',
  },
  {
    id: 2,
    store: 'Flipkart',
    orderId: 'FLK987654321',
    amount: 250.5,
    status: 'pending',
    transactionDate: '2024-12-12',
    expectedConfirmation: '2024-12-27',
  },
  {
    id: 3,
    store: 'Myntra',
    orderId: 'MYN456789123',
    amount: 89.0,
    status: 'confirmed',
    transactionDate: '2024-12-08',
    confirmationDate: '2024-12-14',
  },
  {
    id: 4,
    store: 'Nykaa',
    orderId: 'NYK789123456',
    amount: 75.25,
    status: 'pending',
    transactionDate: '2024-12-14',
    expectedConfirmation: '2024-12-29',
  },
  {
    id: 5,
    store: 'Ajio',
    orderId: 'AJI321654987',
    amount: 120.0,
    status: 'cancelled',
    transactionDate: '2024-12-05',
    cancelledDate: '2024-12-10',
  },
];

const statusColors: Record<string, string> = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  cancelled: 'status-cancelled',
  paid: 'bg-primary/10 text-primary',
};

const Earnings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredTransactions = mockTransactions.filter((txn) => {
    const matchesSearch =
      txn.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || txn.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const totalConfirmed = mockTransactions
    .filter((t) => t.status === 'confirmed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPending = mockTransactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground mb-2">
            My Earnings
          </h1>
          <p className="text-muted-foreground">Track all your cashback and rewards</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Earnings */}
          <div className="card-elevated p-6 bg-gradient-primary text-primary-foreground">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Total Earnings</p>
                <p className="text-3xl font-bold">₹5,250.75</p>
              </div>
              <div className="w-10 h-10 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center text-sm text-primary-foreground/80">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              <span>+12.5% from last month</span>
            </div>
          </div>

          {/* Confirmed */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-success">₹{totalConfirmed.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-success" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              Request Payment
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Pending */}
          <div className="card-elevated p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Pending</p>
                <p className="text-3xl font-bold text-warning">₹{totalPending.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Usually confirmed within 30-60 days
            </p>
          </div>
        </div>

        {/* Transactions */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
            
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full md:w-auto mb-4 grid grid-cols-4 md:flex">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="card-elevated p-8 text-center">
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="card-elevated p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center text-xl font-bold text-primary">
                      {txn.store.charAt(0)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{txn.store}</p>
                        <span className={`status-badge ${statusColors[txn.status]}`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        Order: {txn.orderId}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {txn.transactionDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.status === 'cancelled' 
                          ? 'text-muted-foreground line-through' 
                          : txn.status === 'confirmed' 
                            ? 'text-success' 
                            : 'text-foreground'
                      }`}>
                        ₹{txn.amount.toFixed(2)}
                      </p>
                      <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </AppLayout>
  );
};

export default Earnings;
