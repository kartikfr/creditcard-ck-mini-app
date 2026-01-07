import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Shirt, Heart, Smartphone, Plane, TrendingUp, 
  Search, Package 
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPopularRetailers, RetailerCategoryType } from '@/lib/api';
import RetailerCard, { Retailer } from '@/components/RetailerCard';
import { cn } from '@/lib/utils';

// Category tab configuration
const CATEGORIES = [
  { id: 'popular' as RetailerCategoryType, label: 'Popular', icon: Sparkles },
  { id: 'fashion' as RetailerCategoryType, label: 'Fashion', icon: Shirt },
  { id: 'beauty' as RetailerCategoryType, label: 'Beauty', icon: Heart },
  { id: 'electronics' as RetailerCategoryType, label: 'Electronics', icon: Smartphone },
  { id: 'flights' as RetailerCategoryType, label: 'Flights', icon: Plane },
  { id: 'highest-cashback' as RetailerCategoryType, label: 'Highest Cashback', icon: TrendingUp },
];

const Deals: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<RetailerCategoryType>('popular');
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayCount, setDisplayCount] = useState(20);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load retailers when category changes
  useEffect(() => {
    loadRetailers();
    setDisplayCount(20); // Reset display count on category change
  }, [activeCategory]);

  const loadRetailers = async () => {
    try {
      setIsLoading(true);
      const response = await fetchPopularRetailers(activeCategory, 1, 1000);
      console.log(`[Deals] Loaded ${response?.data?.length || 0} retailers for ${activeCategory}`);
      
      if (response?.data && Array.isArray(response.data)) {
        setRetailers(response.data);
      } else {
        setRetailers([]);
      }
    } catch (error) {
      console.error('[Deals] Error loading retailers:', error);
      setRetailers([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter retailers by search query
  const filteredRetailers = useMemo(() => {
    if (!searchQuery.trim()) return retailers;
    const query = searchQuery.toLowerCase();
    return retailers.filter(r => 
      r.attributes?.name?.toLowerCase().includes(query)
    );
  }, [retailers, searchQuery]);

  // Displayed retailers (for infinite scroll effect)
  const displayedRetailers = useMemo(() => {
    return filteredRetailers.slice(0, displayCount);
  }, [filteredRetailers, displayCount]);

  const hasMore = displayCount < filteredRetailers.length;

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      setDisplayCount(prev => Math.min(prev + 20, filteredRetailers.length));
    }
  }, [hasMore, isLoading, filteredRetailers.length]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [handleObserver]);

  // Handle retailer click - navigate to offer detail
  const handleRetailerClick = (retailer: Retailer) => {
    const uniqueId = retailer.attributes?.unique_identifier;
    if (uniqueId) {
      navigate(`/offer/${uniqueId}`);
      return;
    }
    
    // Fallback: extract from self link
    if (retailer.links?.self) {
      const match = retailer.links.self.match(/\/offers\/([^?]+)/);
      if (match) {
        navigate(`/offer/${match[1]}`);
        return;
      }
    }
    
    console.error('[Deals] No valid navigation path for retailer:', retailer);
  };

  // Loading skeleton
  const RetailerSkeleton = () => (
    <div className="bg-card rounded-xl border border-border p-3 md:p-4">
      <Skeleton className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-lg mx-auto mb-2 md:mb-3" />
      <Skeleton className="h-3 md:h-4 w-3/4 mx-auto mb-1.5 md:mb-2" />
      <Skeleton className="h-5 md:h-6 w-1/2 mx-auto" />
    </div>
  );

  return (
    <AppLayout>
      <div className="p-3 md:p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-foreground mb-1 md:mb-2">
            All Deals & Offers
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Discover top stores and earn cashback
          </p>
        </header>

        {/* Category Tabs */}
        <div className="mb-4 md:mb-6 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4 md:mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 md:h-11 text-sm"
            />
          </div>
        </div>

        {/* Results Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredRetailers.length} stores found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        {/* Retailers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <RetailerSkeleton key={i} />
            ))}
          </div>
        ) : filteredRetailers.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 md:p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium mb-1">No stores found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Try a different search term' 
                : 'No stores available in this category'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
              {displayedRetailers.map((retailer) => (
                <RetailerCard
                  key={retailer.id}
                  retailer={retailer}
                  onClick={() => handleRetailerClick(retailer)}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-6 md:py-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <RetailerSkeleton key={`loading-${i}`} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Deals;
