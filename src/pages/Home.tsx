import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, RefreshCw, Loader2, Shield, Star, Lock, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEligibility } from '@/context/EligibilityContext';
import { fetchDynamicPage, fetchEarnings, fetchCategoryOffers } from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import OfferCard, { Offer } from '@/components/OfferCard';
import CheckEligibilityButton from '@/components/CheckEligibilityButton';
import aboutRatanTata from '@/assets/about-ratan-tata.png';
import aboutCashbackPaid from '@/assets/about-cashback-paid.png';
import aboutTopApp from '@/assets/about-top-app.png';

// Key for storing credit card offer identifiers
const CREDIT_CARD_OFFERS_KEY = 'credit_card_offer_ids';


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
  const navigate = useNavigate();
  const { user, accessToken, isAuthenticated } = useAuth();
  const { isCardEligible, isChecked: eligibilityChecked } = useEligibility();
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
  const [categoryOffers, setCategoryOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [visibleOffers, setVisibleOffers] = useState<number>(8);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const OFFERS_PER_LOAD = 8;

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

  // Load category offers (all at once, lazy render on scroll)
  const loadCategoryOffers = useCallback(async () => {
    try {
      setOffersLoading(true);
      console.log('[Home] Fetching category offers...');
      const response = await fetchCategoryOffers('home-categories-exclusive/banking-finance-offers', 1, 100);
      console.log('[Home] Category offers response:', response);
      
      // Parse offers from response data array
      if (response?.data && Array.isArray(response.data)) {
        setCategoryOffers(response.data);
        setVisibleOffers(OFFERS_PER_LOAD); // Reset visible count
        
        // Store credit card offer IDs for use in OfferDetail page
        const creditCardOfferIds = response.data.map((offer: Offer) => ({
          id: String(offer.id),
          uniqueIdentifier: offer.attributes?.unique_identifier || ''
        }));
        try {
          localStorage.setItem(CREDIT_CARD_OFFERS_KEY, JSON.stringify(creditCardOfferIds));
        } catch (e) {
          console.error('[Home] Failed to store credit card offer IDs:', e);
        }
      }
    } catch (err) {
      console.error('[Home] Failed to load category offers:', err);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  // Load more offers when user scrolls to bottom
  const loadMoreOffers = useCallback(() => {
    if (loadingMore || visibleOffers >= categoryOffers.length) return;
    
    setLoadingMore(true);
    // Simulate a small delay for smooth UX
    setTimeout(() => {
      setVisibleOffers((prev) => Math.min(prev + OFFERS_PER_LOAD, categoryOffers.length));
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, visibleOffers, categoryOffers.length]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && visibleOffers < categoryOffers.length) {
          loadMoreOffers();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMoreOffers, loadingMore, visibleOffers, categoryOffers.length]);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      
      await loadDynamicPage();
      await loadEarnings();
      await loadCategoryOffers();
      
      setIsLoading(false);
    };

    loadAll();
  }, [loadDynamicPage, loadEarnings, loadCategoryOffers]);

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
    await loadCategoryOffers();
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
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">

        {/* Compact Value Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-col gap-2">
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-display font-semibold text-foreground mb-1">
                India's Trusted Credit Card Cashback Platform
              </h1>
              <p className="text-sm text-muted-foreground">
                Powered by CashKaro — Earn up to ₹2,000 cashback on 50+ premium cards
              </p>
            </div>
            {/* Mobile Check Eligibility - visible only on mobile */}
            <div className="sm:hidden">
              <CheckEligibilityButton />
            </div>
          </div>
          
          {/* Trust Strip - Icons Only */}
          <div className="flex items-center gap-4 md:gap-6 mt-5 pt-4 border-t border-border">
            <div className="trust-badge">
              <Shield className="trust-badge-icon" />
              <span className="text-[10px] md:text-xs">Bank-Level Security</span>
            </div>
            <div className="trust-badge">
              <Star className="trust-badge-icon" />
              <span className="text-[10px] md:text-xs">4.8 Rating</span>
            </div>
            <div className="trust-badge">
              <Lock className="trust-badge-icon" />
              <span className="text-[10px] md:text-xs">100% Safe</span>
            </div>
            <div className="trust-badge hidden sm:flex">
              <Users className="trust-badge-icon" />
              <span className="text-[10px] md:text-xs">1L+ Users</span>
            </div>
          </div>
        </header>

        {/* COMMENTED OUT: Hero Banner Carousel - Uncomment to enable */}
        {/* 
        {banners.length > 0 && (
          <section className="mb-6 animate-fade-in">
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-4 transition-transform duration-500 ease-out"
                style={{ 
                  transform: `translateX(-${currentBannerIndex * (window.innerWidth < 768 ? 296 : window.innerWidth < 1024 ? 376 : 436)}px)` 
                }}
              >
                {banners.map((banner, index) => (
                  <a
                    key={banner.id || index}
                    href={banner.links?.self || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <div className="w-[280px] md:w-[360px] lg:w-[420px] h-[180px] md:h-[220px] lg:h-[260px] rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                      <img
                        src={banner.attributes?.image_url}
                        alt={`Banner ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'true';
                            target.src = 'https://placehold.co/420x260/1a1a2e/ffffff?text=Offer';
                          }
                        }}
                      />
                    </div>
                  </a>
                ))}
              </div>

              {banners.length > 1 && (
                <button
                  onClick={goToNextBanner}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/95 hover:bg-background shadow-lg rounded-full flex items-center justify-center text-foreground transition-colors z-10"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {banners.length > 1 && currentBannerIndex > 0 && (
                <button
                  onClick={goToPrevBanner}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/95 hover:bg-background shadow-lg rounded-full flex items-center justify-center text-foreground transition-colors z-10"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {usedFallback && (
                <div className="absolute top-3 left-3 bg-yellow-500/80 text-white text-[10px] px-2 py-1 rounded-full z-10">
                  Demo Data
                </div>
              )}
            </div>
          </section>
        )}
        */}

        {/* Credit Card Offers Section - Primary Focus */}
        {categoryOffers.length > 0 && (
          <section className="mb-10 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-lg font-display font-semibold text-foreground">
                Credit Card Offers
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({categoryOffers.length})
                </span>
              </h2>
              <div className="hidden md:block">
                <CheckEligibilityButton />
              </div>
            </div>
            
            {/* Offers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {categoryOffers.slice(0, visibleOffers).map((offer) => (
                <OfferCard 
                  key={offer.id} 
                  offer={offer} 
                  isEligible={eligibilityChecked && isCardEligible(offer.id)}
                />
              ))}
            </div>

            {/* Load More Sentinel */}
            {visibleOffers < categoryOffers.length && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                {loadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Showing {visibleOffers} of {categoryOffers.length}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Offers Loading State */}
        {offersLoading && (
          <div className="mb-10">
            <div className="h-5 w-40 bg-muted rounded animate-pulse mb-5" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="card-premium p-4">
                  <div className="h-14 bg-muted rounded-lg animate-pulse mb-3" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse mx-auto mb-3" />
                  <div className="h-12 bg-muted rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How Cashback Works Section */}
        <section className="py-8 mb-6 border-t border-border animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-foreground">
              How Cashback Works
            </h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/know-more')}
              className="text-primary text-sm h-8"
            >
              Know More
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {/* Steps Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { step: '01', title: 'Choose a Card', desc: 'Browse through 50+ premium credit cards from top banks' },
              { step: '02', title: 'Apply via Us', desc: 'Click apply and get redirected to official bank website' },
              { step: '03', title: 'Get Approved', desc: 'Complete bank verification and receive your card' },
              { step: '04', title: 'Get Cashback', desc: 'Cashback credited to your account, withdraw via UPI' },
            ].map((item) => (
              <div key={item.step} className="bg-secondary/30 rounded-xl p-4 md:p-5 text-center">
                <div className="text-2xl md:text-3xl font-display font-bold text-primary/30 mb-2">
                  {item.step}
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Us Section */}
        <section className="py-8 border-t border-border">
          <h2 className="text-lg font-display font-semibold text-foreground text-center mb-6">
            About Us
          </h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div 
              className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md opacity-0 animate-fade-in"
              style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
              <img 
                src={aboutTopApp} 
                alt="Top Credit Card Cashback App and Website" 
                className="w-full h-auto object-cover"
              />
            </div>
            <div 
              className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md opacity-0 animate-fade-in"
              style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
            >
              <img 
                src={aboutCashbackPaid} 
                alt="₹1000 Cr+ Cash back Paid - Powered by CashKaro" 
                className="w-full h-auto object-cover"
              />
            </div>
            <div 
              className="rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md opacity-0 animate-fade-in"
              style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
            >
              <img 
                src={aboutRatanTata} 
                alt="Trusted by Late Mr. Ratan Tata - Loved by Millions" 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-destructive font-medium">Error loading content</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Home;