import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, Percent, Gift, Star, TrendingUp, Zap, ExternalLink, Tag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchDynamicPage, fetchEarnings } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Types for API response
interface DynamicPageSection {
  id: string;
  type: string;
  attributes: {
    title?: string;
    subtitle?: string;
    section_type?: string;
    permanent_redirect_url?: string;
    stores?: Store[];
    deals?: Deal[];
    categories?: Category[];
    banners?: Banner[];
    [key: string]: any;
  };
}

interface Store {
  id: number | string;
  name: string;
  logo_url?: string;
  cashback_text?: string;
  cashback_percent?: string;
  store_url?: string;
}

interface Deal {
  id: number | string;
  title: string;
  description?: string;
  store_name?: string;
  image_url?: string;
  expiry_date?: string;
  deal_url?: string;
  cashback_text?: string;
}

interface Category {
  id: number | string;
  name: string;
  icon_url?: string;
  store_count?: number;
}

interface Banner {
  id: number | string;
  image_url?: string;
  title?: string;
  link_url?: string;
}

interface EarningsData {
  total_earnings?: number;
  pending_amount?: number;
  confirmed_amount?: number;
  total_orders?: number;
}

const Home: React.FC = () => {
  const { user, accessToken, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicData, setDynamicData] = useState<DynamicPageSection[]>([]);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  useEffect(() => {
    const loadHomepage = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[Home] Fetching dynamic page...');
        const response = await fetchDynamicPage();
        console.log('[Home] Dynamic page response:', JSON.stringify(response, null, 2));
        setRawResponse(response);
        
        // Parse the response - handle both array and object formats
        if (response?.data) {
          if (Array.isArray(response.data)) {
            setDynamicData(response.data);
          } else {
            setDynamicData([response.data]);
          }
        }

        // Also try to parse included data if present
        if (response?.included) {
          console.log('[Home] Included data:', response.included);
        }
      } catch (err) {
        console.error('[Home] Failed to load homepage:', err);
        setError(err instanceof Error ? err.message : 'Failed to load homepage');
      }

      // Fetch earnings if user is authenticated
      if (isAuthenticated && accessToken) {
        try {
          console.log('[Home] Fetching earnings...');
          const earningsResponse = await fetchEarnings(accessToken);
          console.log('[Home] Earnings response:', JSON.stringify(earningsResponse, null, 2));
          
          if (earningsResponse?.data?.attributes) {
            setEarnings(earningsResponse.data.attributes);
          }
        } catch (err) {
          console.error('[Home] Failed to load earnings:', err);
        }
      }

      setIsLoading(false);
    };

    loadHomepage();
  }, [isAuthenticated, accessToken]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  // Helper to render store cards
  const renderStores = (stores: Store[]) => (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
      {stores.map((store) => (
        <a
          key={store.id}
          href={store.store_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="card-elevated flex-shrink-0 w-32 p-4 text-center cursor-pointer hover:scale-105 transition-transform"
        >
          {store.logo_url ? (
            <img 
              src={store.logo_url} 
              alt={store.name}
              className="w-14 h-14 rounded-xl mx-auto mb-3 object-contain bg-secondary"
            />
          ) : (
            <div className="w-14 h-14 bg-primary/10 rounded-xl mx-auto mb-3 flex items-center justify-center text-xl font-bold text-primary">
              {store.name?.charAt(0) || '?'}
            </div>
          )}
          <p className="font-medium text-foreground text-sm mb-1 truncate">{store.name}</p>
          <p className="text-xs text-primary font-medium">{store.cashback_text || store.cashback_percent || 'Cashback'}</p>
        </a>
      ))}
    </div>
  );

  // Helper to render deal cards
  const renderDeals = (deals: Deal[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {deals.map((deal) => (
        <a
          key={deal.id}
          href={deal.deal_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="card-elevated p-4 flex gap-4 hover:scale-[1.02] transition-transform"
        >
          {deal.image_url ? (
            <img 
              src={deal.image_url} 
              alt={deal.title}
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1 truncate">{deal.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{deal.store_name}</p>
            <div className="flex items-center justify-between">
              {deal.expiry_date && (
                <span className="text-xs text-destructive font-medium">Expires: {deal.expiry_date}</span>
              )}
              {deal.cashback_text && (
                <span className="text-xs text-primary font-medium">{deal.cashback_text}</span>
              )}
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </a>
      ))}
    </div>
  );

  // Helper to render categories
  const renderCategories = (categories: Category[]) => (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {categories.map((category) => (
        <button
          key={category.id}
          className="card-elevated p-4 text-center hover:bg-secondary/50 transition-colors"
        >
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="w-8 h-8 mx-auto mb-2"
            />
          ) : (
            <div className="text-3xl mb-2">📦</div>
          )}
          <p className="font-medium text-foreground text-sm">{category.name}</p>
          {category.store_count && (
            <p className="text-xs text-muted-foreground">{category.store_count} stores</p>
          )}
        </button>
      ))}
    </div>
  );

  // Helper to render banners
  const renderBanners = (banners: Banner[]) => (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.link_url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded-xl overflow-hidden"
        >
          {banner.image_url ? (
            <img 
              src={banner.image_url} 
              alt={banner.title || 'Banner'}
              className="h-32 md:h-48 w-auto object-cover"
            />
          ) : (
            <div className="h-32 md:h-48 w-64 bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
              {banner.title || 'Offer'}
            </div>
          )}
        </a>
      ))}
    </div>
  );

  // Render a dynamic section based on its type
  const renderSection = (section: DynamicPageSection, index: number) => {
    const { attributes } = section;
    const sectionType = attributes?.section_type || section.type;

    // Skip if no meaningful content
    if (!attributes || Object.keys(attributes).length === 0) {
      return null;
    }

    return (
      <section key={section.id || index} className="mb-8 animate-slide-up" style={{ animationDelay: `${index * 100}ms` }}>
        {attributes.title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              {sectionType === 'stores' && <TrendingUp className="w-5 h-5 text-primary" />}
              {sectionType === 'deals' && <Zap className="w-5 h-5 text-accent" />}
              {sectionType === 'categories' && <Tag className="w-5 h-5 text-primary" />}
              {attributes.title}
            </h2>
            <button className="text-primary text-sm font-medium flex items-center hover:underline">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {attributes.stores && attributes.stores.length > 0 && renderStores(attributes.stores)}
        {attributes.deals && attributes.deals.length > 0 && renderDeals(attributes.deals)}
        {attributes.categories && attributes.categories.length > 0 && renderCategories(attributes.categories)}
        {attributes.banners && attributes.banners.length > 0 && renderBanners(attributes.banners)}
      </section>
    );
  };

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

        {/* Stats Banner - Show real earnings if available */}
        <div className="bg-gradient-primary rounded-2xl p-6 mb-8 text-primary-foreground shadow-glow animate-fade-in">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">
                ₹{earnings?.total_earnings?.toLocaleString() || earnings?.confirmed_amount?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-primary-foreground/80">Total Earnings</p>
            </div>
            <div className="border-l border-r border-primary-foreground/20">
              <p className="text-3xl font-bold">
                ₹{earnings?.pending_amount?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-primary-foreground/80">Pending</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{earnings?.total_orders || 0}</p>
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

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-8">
            <p className="text-destructive font-medium">Error loading content</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        )}

        {/* Dynamic Sections from API */}
        {dynamicData.map((section, index) => renderSection(section, index))}

        {/* Raw API Response Debug (visible in dev) */}
        <section className="mb-8 animate-slide-up">
          <details className="card-elevated p-4">
            <summary className="cursor-pointer font-medium text-foreground">
              📡 API Response Debug
            </summary>
            <pre className="mt-4 p-4 bg-secondary rounded-lg overflow-auto text-xs max-h-96">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </details>
        </section>

        {/* Show message if no dynamic content */}
        {dynamicData.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No content available from API</p>
            <p className="text-sm text-muted-foreground mt-2">Check the API Response Debug section above for raw data</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Home;
