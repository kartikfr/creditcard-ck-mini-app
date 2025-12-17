import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, ChevronRight, Grid3X3, List, Package, ArrowLeft, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CategoryBreadcrumb, { BreadcrumbItem } from '@/components/CategoryBreadcrumb';
import OfferCard from '@/components/OfferCard';
import { 
  fetchCategoryBySlug, 
  fetchCategoryOffersBySlug,
  fetchOffersByUrl
} from '@/lib/api';

interface SubCategory {
  id: string;
  type: string;
  attributes: {
    name: string;
    unique_identifier: string;
    image_url?: string;
    new_image_url?: string;
    offer_count?: number;
    description?: string;
  };
  links?: {
    self?: string;
    products?: string;
    offers?: string;
  };
  sub_categories?: SubCategory[];
}

interface CategoryData {
  id: string;
  type: string;
  attributes: {
    name: string;
    unique_identifier: string;
    image_url?: string;
    new_image_url?: string;
    offer_count?: number;
    description?: string;
  };
  links?: {
    self?: string;
    products?: string;
    offers?: string;
  };
  sub_categories?: SubCategory[];
}

interface Offer {
  id: string;
  type: string;
  attributes: {
    name: string;
    unique_identifier: string;
    image_url?: string;
    cashback?: {
      amount?: string;
      currency?: string;
    };
    short_description?: string;
    ribbon_text?: string;
  };
}

const CategoryDetail: React.FC = () => {
  const { '*': slugPath } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [hasMoreOffers, setHasMoreOffers] = useState(true);
  const [offerPage, setOfferPage] = useState(1);
  const [contentType, setContentType] = useState<'subcategories' | 'offers' | 'mixed'>('subcategories');
  const [offersUrl, setOffersUrl] = useState<string | null>(null);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Build breadcrumbs from slug path
  useEffect(() => {
    if (slugPath) {
      const parts = slugPath.split('/');
      const crumbs: BreadcrumbItem[] = parts.map((part) => ({
        name: part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        slug: part,
      }));
      setBreadcrumbs(crumbs);
    }
  }, [slugPath]);

  // Load category data
  useEffect(() => {
    if (slugPath) {
      loadCategory();
    }
  }, [slugPath]);

  const loadCategory = async () => {
    if (!slugPath) return;
    
    setIsLoading(true);
    setError(null);
    setOffers([]);
    setOfferPage(1);
    setHasMoreOffers(true);
    setCategory(null);
    setOffersUrl(null);
    
    try {
      const response = await fetchCategoryBySlug(slugPath);
      console.log('[CategoryDetail] Category response:', response);
      
      if (response?.data) {
        const categoryData = Array.isArray(response.data) ? response.data[0] : response.data;
        setCategory(categoryData);
        
        // Update breadcrumb name if available
        if (categoryData?.attributes?.name) {
          setBreadcrumbs(prev => {
            const newCrumbs = [...prev];
            if (newCrumbs.length > 0) {
              newCrumbs[newCrumbs.length - 1].name = categoryData.attributes.name;
            }
            return newCrumbs;
          });
        }
        
        // Determine content type based on response structure
        // Check for sub_categories in relationships or directly in data
        const subCats = categoryData?.sub_categories || 
                        categoryData?.relationships?.sub_categories?.data || [];
        const hasSubcategories = subCats && subCats.length > 0;
        const categoryOffersUrl = categoryData?.links?.offers ?? null;
        const hasOffers = !!categoryOffersUrl;

        setOffersUrl(categoryOffersUrl);

        // Update category with properly resolved subcategories
        if (hasSubcategories) {
          setCategory({
            ...categoryData,
            sub_categories: subCats
          });
        }

        if (hasSubcategories && hasOffers) {
          setContentType('mixed');
          loadOffers(1, categoryOffersUrl);
        } else if (hasSubcategories) {
          setContentType('subcategories');
        } else {
          setContentType('offers');
          loadOffers(1, categoryOffersUrl);
        }
      } else {
        setError('Category not found');
      }
    } catch (error: any) {
      console.error('[CategoryDetail] Error loading category:', error);
      const errorMessage = error?.message || 'Failed to load category';
      // Parse error message for user-friendly display
      if (errorMessage.includes('Invalid Category')) {
        setError('This category is not available or has been removed.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadOffers = useCallback(async (page: number = 1, urlOverride?: string | null) => {
    if (!slugPath || isLoadingOffers) return;

    setIsLoadingOffers(true);

    try {
      // Prefer the API-provided offers link when available (contains correct hierarchy path)
      const urlToUse = typeof urlOverride === 'string' ? urlOverride : offersUrl;

      const response = urlToUse
        ? await fetchOffersByUrl(urlToUse, page, 20)
        : await fetchCategoryOffersBySlug(slugPath, page, 20);

      console.log('[CategoryDetail] Offers response:', response);

      if (response?.data && Array.isArray(response.data)) {
        if (page === 1) {
          setOffers(response.data);
        } else {
          setOffers(prev => [...prev, ...response.data]);
        }

        setHasMoreOffers(response.data.length >= 20);
      } else {
        if (page === 1) setOffers([]);
        setHasMoreOffers(false);
      }
    } catch (error: any) {
      console.error('[CategoryDetail] Error loading offers:', error);
      const msg = String(error?.message || '');
      if (msg.includes('Invalid Category')) {
        setError('This category is not available or has been removed.');
      }
      setHasMoreOffers(false);
    } finally {
      setIsLoadingOffers(false);
    }
  }, [slugPath, isLoadingOffers, offersUrl]);

  // Infinite scroll for offers
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMoreOffers && !isLoadingOffers && contentType !== 'subcategories') {
      const nextPage = offerPage + 1;
      setOfferPage(nextPage);
      loadOffers(nextPage);
    }
  }, [hasMoreOffers, isLoadingOffers, offerPage, contentType, loadOffers]);

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
    
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  const handleSubcategoryClick = (subcat: SubCategory) => {
    // Priority 1: Use links.self if available (most reliable)
    if (subcat.links?.self) {
      const match = subcat.links.self.match(/\/categories\/([^?]+)/);
      if (match) {
        console.log('[CategoryDetail] Using links.self for navigation:', match[1]);
        navigate(`/category/${match[1]}`);
        return;
      }
    }
    
    // Priority 2: Use unique_identifier directly (flat navigation)
    const subcatSlug = subcat.attributes.unique_identifier;
    if (subcatSlug) {
      console.log('[CategoryDetail] Using unique_identifier for navigation:', subcatSlug);
      navigate(`/category/${subcatSlug}`);
      return;
    }
    
    console.error('[CategoryDetail] No valid navigation path for subcategory:', subcat);
  };

  const handleOfferClick = (offer: Offer) => {
    navigate(`/offer/${offer.attributes.unique_identifier}`);
  };

  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card-elevated p-4">
            <Skeleton className="w-16 h-16 rounded-xl mx-auto mb-3" />
            <Skeleton className="h-4 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-3 w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Breadcrumbs */}
        <CategoryBreadcrumb items={breadcrumbs} />

        {isLoading ? (
          <LoadingSkeleton />
        ) : category ? (
          <>
            {/* Category Header */}
            <header className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                {category.attributes?.image_url && (
                  <div className="w-16 h-16 rounded-xl bg-primary/10 overflow-hidden">
                    <img
                      src={category.attributes.image_url}
                      alt={category.attributes.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                    {category.attributes?.name}
                  </h1>
                  {category.attributes?.offer_count !== undefined && (
                    <p className="text-muted-foreground">
                      {category.attributes.offer_count} offers available
                    </p>
                  )}
                </div>
              </div>
              {category.attributes?.description && (
                <p className="text-muted-foreground">{category.attributes.description}</p>
              )}
            </header>

            {/* View Toggle for subcategories */}
            {(contentType === 'subcategories' || contentType === 'mixed') && category.sub_categories && category.sub_categories.length > 0 && (
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">Subcategories</h2>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className="h-9 w-9"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className="h-9 w-9"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Subcategories Grid/List */}
            {(contentType === 'subcategories' || contentType === 'mixed') && category.sub_categories && category.sub_categories.length > 0 && (
              <div className={`mb-8 ${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-3'}`}>
                {category.sub_categories.map((subcat) => (
                  viewMode === 'grid' ? (
                    <button
                      key={subcat.id}
                      onClick={() => handleSubcategoryClick(subcat)}
                      className="card-elevated p-4 text-center hover:border-primary transition-all duration-200 group"
                    >
                      <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                        {subcat.attributes?.image_url ? (
                          <img
                            src={subcat.attributes.image_url}
                            alt={subcat.attributes.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-primary">
                            {subcat.attributes?.name?.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-foreground text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {subcat.attributes?.name}
                      </p>
                      {subcat.attributes?.offer_count !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {subcat.attributes.offer_count} offers
                        </p>
                      )}
                    </button>
                  ) : (
                    <button
                      key={subcat.id}
                      onClick={() => handleSubcategoryClick(subcat)}
                      className="card-elevated p-4 w-full flex items-center gap-4 text-left hover:border-primary transition-all duration-200 group"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {subcat.attributes?.image_url ? (
                          <img
                            src={subcat.attributes.image_url}
                            alt={subcat.attributes.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-primary">
                            {subcat.attributes?.name?.charAt(0) || 'C'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {subcat.attributes?.name}
                        </p>
                        {subcat.attributes?.offer_count !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            {subcat.attributes.offer_count} offers available
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  )
                ))}
              </div>
            )}

            {/* Offers Section */}
            {(contentType === 'offers' || contentType === 'mixed') && (
              <>
                {contentType === 'mixed' && offers.length > 0 && (
                  <h2 className="text-lg font-semibold text-foreground mb-4">Offers</h2>
                )}
                
                {offers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {offers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer as any} />
                    ))}
                  </div>
                ) : contentType === 'offers' && !isLoadingOffers ? (
                  <div className="card-elevated p-8 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No offers available in this category</p>
                  </div>
                ) : null}

                {/* Loading More Indicator */}
                {isLoadingOffers && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="card-elevated p-4">
                        <Skeleton className="w-full h-32 rounded-lg mb-3" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="h-4" />
              </>
            )}
          </>
        ) : error ? (
          <div className="card-elevated p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Unable to Load Category</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Go Back
              </Button>
              <Button
                onClick={() => navigate('/deals')}
              >
                Browse All Categories
              </Button>
            </div>
          </div>
        ) : (
          <div className="card-elevated p-8 text-center">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Category not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/deals')}
              className="mt-4"
            >
              Browse All Categories
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CategoryDetail;
