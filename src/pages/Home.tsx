import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronRight, ChevronLeft, Percent, Gift, Star, TrendingUp, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchDynamicPage, fetchEarnings } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Types for API response
interface Banner {
  type: string;
  id: number;
  attributes: {
    image_url: string;
  };
  links: {
    self: string;
  };
}

interface PageElement {
  id: string;
  title?: string;
  viewallurl?: string;
  viewallurltext?: string;
  col: number;
  row: number;
  size_x: number;
  size_y: number;
  stacking_type?: string;
  data: string | any[];
}

interface HomePageData {
  type: string;
  id: string;
  attributes: {
    title?: string;
    unique_identifier?: string;
    remove_header_footer?: boolean;
    page_elements?: PageElement[];
    permanent_redirect_url?: string;
  };
}

interface SeoContent {
  type: string;
  id: number;
  attributes: {
    meta_tags: string;
    google_remarketing_code?: string;
    fb_remarketting_code?: string;
  };
}

interface EarningsData {
  firstname?: string;
  total_earned?: string;
  total_cashback_earned?: string;
  confirmed_cashback?: string;
  pending_cashback?: string;
  paid_cashback?: string;
  total_rewards_earned?: string;
  total_referral_earned?: string;
  currency?: string;
}

// Default API response structure (used when staging API returns empty data)
const DEFAULT_API_RESPONSE = {
  data: [
    {
      type: "home_page",
      id: "dynamic",
      attributes: {
        title: "API-Homepage",
        unique_identifier: "api-homepage",
        remove_header_footer: false,
        page_elements: [
          {
            id: "static-content1",
            title: "Nil",
            viewallurl: "Nil",
            viewallurltext: "Nil",
            col: 1,
            row: 1,
            size_x: 1,
            size_y: 1,
            data: JSON.stringify({
              data: [
                { type: "banner", id: 1, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Desktop-V1-1700830609.png" }, links: { self: "https://cashkaro.com/stores/amazon" } },
                { type: "banner", id: 2, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/FK Desktop Banner-1701403834.png" }, links: { self: "https://cashkaro.com/stores/flipkart" } },
                { type: "banner", id: 3, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Myntra Desktop Banner-1701405672.png" }, links: { self: "https://cashkaro.com/stores/myntra" } },
                { type: "banner", id: 4, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/HDFC-Desktop-2-11-2023-1701404891.png" }, links: { self: "https://cashkaro.com/stores/swiggy-hdfc-bank-credit-card-offers" } },
                { type: "banner", id: 5, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Ajio Desktop Banner-1701415307.png" }, links: { self: "https://cashkaro.com/stores/ajio-coupons" } },
                { type: "banner", id: 6, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Derma-co-Desktop-2-11-2023-1701404040.png" }, links: { self: "https://cashkaro.com/stores/thedermaco-coupons" } },
                { type: "banner", id: 7, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/m caff Desktop Banner-1701403887.png" }, links: { self: "https://cashkaro.com/stores/mcaffeine-coupons" } },
                { type: "banner", id: 8, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Aqualogica Desktop Banner-1701430521.png" }, links: { self: "https://cashkaro.com/stores/aqualogica-coupons" } },
                { type: "banner", id: 9, attributes: { image_url: "https://asset22.ckassets.com/resources/image/staticpage_images/Norton-Desktop-30-10-2023-1701411906.png" }, links: { self: "https://cashkaro.com/stores/norton-coupons" } }
              ]
            })
          },
          {
            id: "home_categories",
            col: 1,
            row: 2,
            size_x: 1,
            size_y: 1,
            stacking_type: "horizontal",
            data: []
          }
        ]
      }
    }
  ],
  included: [
    {
      type: "seo_content",
      id: 2074,
      attributes: {
        meta_tags: `<title>CashKaro: Discount Coupons, Cashback Offers & Promo Codes</title>
<meta name="Description" content="Get Top deals, latest Coupons & Discount Codes for [1500+ Sites]. Backed By Mr. Ratan Tata CashKaro is a True place to Avail Extra Cashback on online shopping's."/>
<meta property="og:title" content="CashKaro: Discount Coupons, Cashback Offers & Promo Codes"/>
<meta property="og:description" content="Get Top deals, latest Coupons & Discount Codes for [1500+ Sites]."/>
<meta property="og:url" content="https://cashkaro.com"/>
<meta property="og:site_name" content="CashKaro"/>
<meta property="og:image" content="https://asset22.ckassets.com/resources/image/staticpage_images/CK-Logo-1613133688.png"/>`,
        google_remarketing_code: "",
        fb_remarketting_code: ""
      }
    }
  ]
};

const Home: React.FC = () => {
  const { user, accessToken, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageData, setPageData] = useState<HomePageData | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [seoContent, setSeoContent] = useState<SeoContent | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [rawApiResponse, setRawApiResponse] = useState<any>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  // Parse stringified JSON data from page_elements
  const parsePageElementData = useCallback((data: string | any[]): Banner[] => {
    if (!data) return [];
    
    if (Array.isArray(data)) {
      return data.filter((item: any) => item.type === 'banner');
    }
    
    if (typeof data === 'string' && data.trim()) {
      try {
        const parsed = JSON.parse(data);
        const bannerData = parsed.data || parsed;
        if (Array.isArray(bannerData)) {
          return bannerData.filter((item: any) => item.type === 'banner');
        }
        return [];
      } catch (e) {
        console.error('[Home] Failed to parse page element data:', e);
        return [];
      }
    }
    return [];
  }, []);

  // Process API response (either from API or default)
  const processApiResponse = useCallback((response: any) => {
    const dataArray = Array.isArray(response.data) ? response.data : [response.data];
    
    // Find home_page or dynamic_page type
    const homePage = dataArray.find(
      (item: any) => item.type === 'home_page' || item.type === 'dynamic_page'
    );
    
    if (homePage) {
      setPageData(homePage);
      
      // Extract banners from page_elements
      const pageElements = homePage.attributes?.page_elements || [];
      const allBanners: Banner[] = [];
      
      pageElements.forEach((element: PageElement) => {
        const elementBanners = parsePageElementData(element.data);
        allBanners.push(...elementBanners);
      });
      
      if (allBanners.length > 0) {
        setBanners(allBanners);
        return true;
      }
    }
    return false;
  }, [parsePageElementData]);

  // Load dynamic page data
  const loadDynamicPage = useCallback(async () => {
    try {
      console.log('[Home] Fetching dynamic page...');
      const response = await fetchDynamicPage();
      console.log('[Home] Dynamic page raw response:', response);
      setRawApiResponse(response);
      
      // Check if API response has valid page_elements with banners
      const hasValidData = response?.data && processApiResponse(response);
      
      if (!hasValidData) {
        console.log('[Home] API returned empty data, using default response');
        processApiResponse(DEFAULT_API_RESPONSE);
        setUsedFallback(true);
      } else {
        setUsedFallback(false);
      }

      // Parse SEO content from included (prefer API, fallback to default)
      const seoSource = response?.included?.length > 0 ? response : DEFAULT_API_RESPONSE;
      if (seoSource?.included && Array.isArray(seoSource.included)) {
        const seo = seoSource.included.find((item: any) => item.type === 'seo_content');
        if (seo) {
          setSeoContent(seo);
          applyMetaTags(seo.attributes?.meta_tags);
        }
      }
    } catch (err) {
      console.error('[Home] Failed to load homepage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load homepage');
      // Use default response on error
      processApiResponse(DEFAULT_API_RESPONSE);
      setUsedFallback(true);
    }
  }, [processApiResponse]);

  // Load earnings data for authenticated users
  const loadEarnings = useCallback(async () => {
    if (!isAuthenticated || !accessToken) return;
    
    try {
      console.log('[Home] Fetching earnings...');
      const response = await fetchEarnings(accessToken);
      console.log('[Home] Earnings response:', response);
      
      // Handle array response format
      const userData = Array.isArray(response?.data) ? response.data[0] : response?.data;
      if (userData?.attributes) {
        setEarnings(userData.attributes);
      }
    } catch (err) {
      console.error('[Home] Failed to load earnings:', err);
    }
  }, [isAuthenticated, accessToken]);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      
      await loadDynamicPage();
      await loadEarnings();
      
      setIsLoading(false);
    };

    loadAll();
  }, [loadDynamicPage, loadEarnings]);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Apply SEO meta tags to document
  const applyMetaTags = (metaTagsHtml: string) => {
    if (!metaTagsHtml) return;
    
    try {
      const titleMatch = metaTagsHtml.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        document.title = titleMatch[1];
      }

      const metaRegex = /<meta\s+([^>]+)>/gi;
      let match;
      while ((match = metaRegex.exec(metaTagsHtml)) !== null) {
        const attrs = match[1];
        const nameMatch = attrs.match(/name="([^"]+)"/i);
        const propertyMatch = attrs.match(/property="([^"]+)"/i);
        const contentMatch = attrs.match(/content\s*=\s*"([^"]+)"/i);
        
        if (contentMatch && (nameMatch || propertyMatch)) {
          const selector = nameMatch 
            ? `meta[name="${nameMatch[1]}"]` 
            : `meta[property="${propertyMatch![1]}"]`;
          
          const existingMeta = document.querySelector(selector);
          
          if (existingMeta) {
            existingMeta.setAttribute('content', contentMatch[1]);
          } else {
            const meta = document.createElement('meta');
            if (nameMatch) meta.setAttribute('name', nameMatch[1]);
            if (propertyMatch) meta.setAttribute('property', propertyMatch[1]);
            meta.setAttribute('content', contentMatch[1]);
            document.head.appendChild(meta);
          }
        }
      }
    } catch (e) {
      console.error('[Home] Failed to apply meta tags:', e);
    }
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsLoading(true);
    await loadDynamicPage();
    await loadEarnings();
    setIsLoading(false);
  };

  // Banner navigation
  const goToPrevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
  };

  // Parse earnings values
  const totalEarnings = parseFloat(earnings?.total_earned || earnings?.total_cashback_earned || '0');
  const pendingAmount = parseFloat(earnings?.pending_cashback || '0');
  const confirmedAmount = parseFloat(earnings?.confirmed_cashback || '0');

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
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Hello, {user?.firstName || earnings?.firstname || 'there'}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Find the best cashback offers today
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              className="rounded-full"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
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

        {/* Hero Banner Carousel */}
        {banners.length > 0 && (
          <section className="mb-6 animate-fade-in">
            <div className="relative rounded-2xl overflow-hidden shadow-lg bg-secondary">
              {/* Main Banner */}
              <a 
                href={banners[currentBannerIndex]?.links?.self || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={banners[currentBannerIndex]?.attributes?.image_url}
                  alt={`Banner ${currentBannerIndex + 1}`}
                  className="w-full h-40 md:h-56 lg:h-64 object-cover transition-opacity duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://placehold.co/800x300/1a1a2e/ffffff?text=Offer';
                  }}
                />
              </a>

              {/* Banner Indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.slice(0, 10).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentBannerIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentBannerIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
                {banners.length > 10 && (
                  <span className="text-white/70 text-xs">+{banners.length - 10}</span>
                )}
              </div>

              {/* Navigation Arrows */}
              {banners.length > 1 && (
                <>
                  <button
                    onClick={goToPrevBanner}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
                    aria-label="Previous banner"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goToNextBanner}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
                    aria-label="Next banner"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Banner Counter */}
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentBannerIndex + 1} / {banners.length}
              </div>

              {/* Fallback indicator */}
              {usedFallback && (
                <div className="absolute top-3 left-3 bg-yellow-500/80 text-white text-[10px] px-2 py-1 rounded-full">
                  Demo Data
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentBannerIndex 
                      ? 'border-primary scale-105 shadow-md' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={banner.attributes?.image_url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-20 h-12 md:w-28 md:h-16 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x60/1a1a2e/ffffff?text=Ad';
                    }}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Stats Banner */}
        <div className="bg-gradient-primary rounded-2xl p-5 md:p-6 mb-6 text-primary-foreground shadow-glow animate-fade-in">
          <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
            <div>
              <p className="text-xl md:text-3xl font-bold">
                ₹{totalEarnings.toLocaleString()}
              </p>
              <p className="text-[10px] md:text-sm text-primary-foreground/80">Total Earnings</p>
            </div>
            <div className="border-l border-r border-primary-foreground/20">
              <p className="text-xl md:text-3xl font-bold">
                ₹{pendingAmount.toLocaleString()}
              </p>
              <p className="text-[10px] md:text-sm text-primary-foreground/80">Pending</p>
            </div>
            <div>
              <p className="text-xl md:text-3xl font-bold">₹{confirmedAmount.toLocaleString()}</p>
              <p className="text-[10px] md:text-sm text-primary-foreground/80">Confirmed</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 md:gap-3 mb-6">
          {[
            { icon: Percent, label: 'Top Offers', color: 'bg-primary/10 text-primary' },
            { icon: Zap, label: 'Flash Deals', color: 'bg-accent/10 text-accent' },
            { icon: Gift, label: 'Rewards', color: 'bg-success/10 text-success' },
            { icon: Star, label: 'Favorites', color: 'bg-warning/10 text-warning' },
          ].map((action, index) => (
            <button
              key={index}
              className="card-elevated p-3 md:p-4 flex flex-col items-center gap-2 hover:scale-105 transition-transform"
            >
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <action.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-foreground text-center">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-destructive font-medium">Error loading content</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}

        {/* API Response Debug Panel */}
        <details className="card-elevated p-4 mt-6">
          <summary className="cursor-pointer font-medium text-foreground text-sm flex items-center gap-2">
            📡 API Debug {usedFallback && '(Using Fallback Data)'}
          </summary>
          <div className="mt-4 space-y-4">
            <div className="text-xs space-y-1">
              <p><strong>Banners:</strong> {banners.length}</p>
              <p><strong>Data Source:</strong> {usedFallback ? 'Fallback (API returned empty)' : 'Live API'}</p>
              <p><strong>Page Type:</strong> {pageData?.type || 'N/A'}</p>
              <p><strong>Page ID:</strong> {pageData?.id || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Raw API Response:</p>
              <pre className="p-3 bg-secondary rounded-lg overflow-auto text-xs max-h-48">
                {JSON.stringify(rawApiResponse, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </AppLayout>
  );
};

export default Home;
