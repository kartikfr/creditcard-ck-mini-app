import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Percent, Gift, Star, TrendingUp, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchDynamicPage } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Mock data for demonstration
const mockStores = [
  { id: 1, name: 'Amazon', cashback: 'Up to 6%', logo: '🛒', color: 'bg-orange-100' },
  { id: 2, name: 'Flipkart', cashback: 'Up to 5%', logo: '📦', color: 'bg-blue-100' },
  { id: 3, name: 'Myntra', cashback: 'Up to 8%', logo: '👕', color: 'bg-pink-100' },
  { id: 4, name: 'Ajio', cashback: 'Up to 10%', logo: '👗', color: 'bg-purple-100' },
  { id: 5, name: 'Nykaa', cashback: 'Up to 12%', logo: '💄', color: 'bg-rose-100' },
  { id: 6, name: 'Swiggy', cashback: 'Up to 4%', logo: '🍕', color: 'bg-amber-100' },
];

const mockDeals = [
  { id: 1, title: 'Flat 50% Off on Electronics', store: 'Amazon', image: '📱', expires: '2 days' },
  { id: 2, title: 'Buy 1 Get 1 on Fashion', store: 'Myntra', image: '👔', expires: '3 days' },
  { id: 3, title: 'Extra ₹200 Cashback', store: 'Flipkart', image: '💰', expires: '1 day' },
  { id: 4, title: 'Free Delivery + Cashback', store: 'Swiggy', image: '🛵', expires: '5 days' },
];

const mockCategories = [
  { id: 1, name: 'Fashion', icon: '👕', count: 150 },
  { id: 2, name: 'Electronics', icon: '📱', count: 85 },
  { id: 3, name: 'Food', icon: '🍔', count: 45 },
  { id: 4, name: 'Travel', icon: '✈️', count: 32 },
  { id: 5, name: 'Beauty', icon: '💄', count: 68 },
  { id: 6, name: 'Home', icon: '🏠', count: 56 },
];

const Home: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadHomepage = async () => {
      if (accessToken) {
        try {
          await fetchDynamicPage(accessToken);
        } catch (error) {
          console.error('Failed to load homepage:', error);
        }
      }
      // Simulate loading
      setTimeout(() => setIsLoading(false), 1000);
    };

    loadHomepage();
  }, [accessToken]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Hello, {user?.firstName || 'there'}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Find the best cashback offers today
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stores, deals, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl"
            />
          </div>
        </header>

        {/* Stats Banner */}
        <div className="bg-gradient-primary rounded-2xl p-6 mb-8 text-primary-foreground shadow-glow animate-fade-in">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">₹5,250</p>
              <p className="text-sm text-primary-foreground/80">Total Earnings</p>
            </div>
            <div className="border-l border-r border-primary-foreground/20">
              <p className="text-3xl font-bold">₹2,300</p>
              <p className="text-sm text-primary-foreground/80">Pending</p>
            </div>
            <div>
              <p className="text-3xl font-bold">15</p>
              <p className="text-sm text-primary-foreground/80">Orders</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { icon: Percent, label: 'Top Offers', color: 'bg-primary/10 text-primary' },
            { icon: Zap, label: 'Flash Deals', color: 'bg-accent/10 text-accent' },
            { icon: Gift, label: 'Rewards', color: 'bg-success/10 text-success' },
            { icon: Star, label: 'Favorites', color: 'bg-warning/10 text-warning' },
          ].map((action, index) => (
            <button
              key={index}
              className="card-elevated p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Trending Stores */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending Stores
            </h2>
            <button className="text-primary text-sm font-medium flex items-center hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {mockStores.map((store) => (
              <div
                key={store.id}
                className="card-elevated flex-shrink-0 w-32 p-4 text-center cursor-pointer"
              >
                <div className={`w-14 h-14 ${store.color} rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl`}>
                  {store.logo}
                </div>
                <p className="font-medium text-foreground text-sm mb-1">{store.name}</p>
                <p className="text-xs text-primary font-medium">{store.cashback}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Hot Deals */}
        <section className="mb-8 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Hot Deals
            </h2>
            <button className="text-primary text-sm font-medium flex items-center hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockDeals.map((deal) => (
              <div key={deal.id} className="card-elevated p-4 flex gap-4">
                <div className="w-20 h-20 bg-secondary rounded-xl flex items-center justify-center text-4xl flex-shrink-0">
                  {deal.image}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1 truncate">{deal.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{deal.store}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-destructive font-medium">Expires in {deal.expires}</span>
                    <button className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors">
                      Activate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="animate-slide-up" style={{ animationDelay: '400ms' }}>
          <h2 className="section-title">Browse Categories</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {mockCategories.map((category) => (
              <button
                key={category.id}
                className="card-elevated p-4 text-center hover:bg-secondary/50 transition-colors"
              >
                <div className="text-3xl mb-2">{category.icon}</div>
                <p className="font-medium text-foreground text-sm">{category.name}</p>
                <p className="text-xs text-muted-foreground">{category.count} stores</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Home;
