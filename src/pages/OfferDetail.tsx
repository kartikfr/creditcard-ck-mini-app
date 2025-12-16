import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ArrowRight, ChevronRight, X } from 'lucide-react';
import { fetchOfferDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OfferCashback {
  payment_type?: string;
  currency?: string;
  amount?: string;
  details?: string;
  strike_out_value?: number;
}

interface HowToGetOfferItem {
  title?: string;
  desc?: string[];
}

interface TrackingInfo {
  trackingtime_text?: string;
  confirmationtime_text?: string;
  apporders_text?: string | null;
}

interface StoreBannerData {
  data?: Array<{ type?: string; value?: string }>;
}

interface OfferDetailData {
  type: string;
  id: string | number;
  attributes: {
    name?: string;
    unique_identifier?: string;
    cashback_type?: string;
    offer_type?: string;
    cashback_button_text?: string;
    cashback?: OfferCashback;
    cashback_url?: string;
    image_url?: string;
    banner_image_url?: string;
    short_description?: string;
    short_description_new?: {
      info?: string;
      cbinfo?: string;
    };
    seo_h1_tag?: string;
    seo_description?: string;
    rating_value?: string;
    rating_count?: string;
    tracking_speed?: string;
    expected_confirmation_days?: number;
    final_terms_condition?: string;
    terms_and_conditions?: string;
    benefit_card_short_description?: string[];
    benefit_card_details?: string[];
    how_to_get_offer?: HowToGetOfferItem[];
    tracking_info?: TrackingInfo;
    special_terms_conditions?: string[];
    store_banners?: {
      desktop?: StoreBannerData;
      mobile?: StoreBannerData;
      tablet?: StoreBannerData;
      app?: StoreBannerData;
    };
    faq?: Array<{ question?: string; answer?: string }>;
  };
}

const OfferDetail: React.FC = () => {
  const { uniqueIdentifier } = useParams<{ uniqueIdentifier: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showHowToPopup, setShowHowToPopup] = useState(false);
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [showAllBenefits, setShowAllBenefits] = useState(false);

  useEffect(() => {
    const loadOfferDetail = async () => {
      if (!uniqueIdentifier) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchOfferDetail(uniqueIdentifier);
        console.log('[OfferDetail] API Response:', response);
        
        if (response?.data) {
          const offerData = Array.isArray(response.data) ? response.data[0] : response.data;
          setOffer(offerData);
        } else {
          setError('Offer not found');
        }
      } catch (err) {
        console.error('[OfferDetail] Error:', err);
        setError('Failed to load offer details');
      } finally {
        setLoading(false);
      }
    };

    loadOfferDetail();
  }, [uniqueIdentifier]);

  // Auto-rotate banners
  useEffect(() => {
    if (!offer?.attributes?.store_banners?.desktop?.data?.length) return;
    
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => 
        (prev + 1) % (offer.attributes.store_banners?.desktop?.data?.length || 1)
      );
    }, 4000);
    
    return () => clearInterval(interval);
  }, [offer]);

  const handleApplyNow = () => {
    if (offer?.attributes?.cashback_url) {
      window.open(offer.attributes.cashback_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Get banner images
  const getBannerImages = () => {
    const banners = offer?.attributes?.store_banners;
    if (!banners) return [];
    
    const desktopBanners = banners.desktop?.data?.map(b => b.value).filter(Boolean) || [];
    if (desktopBanners.length > 0) return desktopBanners;
    
    const mobileBanners = banners.mobile?.data?.map(b => b.value).filter(Boolean) || [];
    if (mobileBanners.length > 0) return mobileBanners;
    
    return [];
  };

  // Extract tracking time number
  const extractNumber = (text?: string) => {
    if (!text) return null;
    const match = text.match(/\d+/);
    return match ? match[0] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background">
        <div className="sticky top-0 z-10 bg-white dark:bg-card border-b border-border p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="max-w-6xl mx-auto p-4 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4">{error || 'Offer not found'}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const attrs = offer.attributes;
  const bannerImages = getBannerImages();
  const currentBanner = bannerImages[currentBannerIndex] || attrs.banner_image_url || attrs.image_url;
  const trackingHours = extractNumber(attrs.tracking_speed);
  const benefitsToShow = showAllBenefits 
    ? attrs.benefit_card_short_description 
    : attrs.benefit_card_short_description?.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-card border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center gap-3 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg truncate">{attrs.name}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-4">
            {/* Banner Carousel */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
              {currentBanner && (
                <img 
                  src={currentBanner} 
                  alt={attrs.name}
                  className="w-full h-48 md:h-72 object-cover"
                />
              )}
              {/* Banner Dots */}
              {bannerImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {bannerImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentBannerIndex(index)}
                      className={`w-8 h-1 rounded-full transition-colors ${
                        index === currentBannerIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Benefits Section */}
            {attrs.benefit_card_short_description && attrs.benefit_card_short_description.length > 0 && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-base mb-4">{attrs.name} Benefits</h3>
                <ul className="space-y-3">
                  {benefitsToShow?.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-orange-500' :
                        index === 2 ? 'bg-yellow-500' :
                        index === 3 ? 'bg-cyan-500' :
                        'bg-purple-500'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
                {attrs.benefit_card_details && attrs.benefit_card_details.length > 0 && (
                  <button 
                    onClick={() => setShowAllBenefits(!showAllBenefits)}
                    className="mt-4 text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                  >
                    {showAllBenefits ? 'Show Less' : 'See All Benefits'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* How to Get This Offer - Button to open popup */}
            <button
              onClick={() => setShowHowToPopup(true)}
              className="w-full bg-white dark:bg-card rounded-2xl border border-border p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-bold text-base">How to Get This Offer?</span>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Important Timelines */}
            {(attrs.tracking_speed || attrs.expected_confirmation_days) && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-base mb-4">Important Timelines</h3>
                <div className="flex gap-4">
                  {trackingHours && (
                    <div className="flex-1 bg-gray-50 dark:bg-muted/30 rounded-xl p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Rewards track in</p>
                      <p className="text-3xl font-bold text-primary">{trackingHours}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">Hours</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                  {attrs.expected_confirmation_days && (
                    <div className="flex-1 bg-gray-50 dark:bg-muted/30 rounded-xl p-4 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Rewards confirm in</p>
                      <p className="text-3xl font-bold text-primary">{attrs.expected_confirmation_days}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-muted-foreground">Days</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Important Terms & Conditions */}
            {attrs.special_terms_conditions && attrs.special_terms_conditions.length > 0 && (
              <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-base mb-4">Important Terms & Conditions</h3>
                <ul className="space-y-3">
                  {attrs.special_terms_conditions.map((term, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-foreground mt-1">•</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
                {attrs.terms_and_conditions && (
                  <button 
                    onClick={() => setShowAllTerms(true)}
                    className="mt-4 text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                  >
                    View All Terms & Conditions
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Sticky Sidebar */}
          <div className="space-y-4 md:sticky md:top-24 md:self-start">
            {/* Card Info */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="w-24 h-14 bg-gray-50 dark:bg-muted rounded-lg border border-border flex items-center justify-center p-2">
                  <img 
                    src={attrs.image_url} 
                    alt={attrs.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/100x60/f9fafb/666666?text=${encodeURIComponent((attrs.name || 'Card').slice(0, 5))}`;
                    }}
                  />
                </div>
                {attrs.rating_value && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{attrs.rating_value} of 5</span>
                    {attrs.rating_count && (
                      <span className="text-xs text-muted-foreground">| {attrs.rating_count} Ratings</span>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-sm">{attrs.seo_h1_tag || attrs.name}</h3>
                {attrs.short_description_new?.info && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {attrs.short_description_new.info}
                  </p>
                )}
              </div>
            </div>

            {/* Rewards Box */}
            <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
              {attrs.cashback?.amount && (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">Flat</span>
                    <span className="text-2xl font-bold text-green-600">₹{attrs.cashback.amount}</span>
                    <span className="text-lg font-semibold text-green-600">Rewards</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {attrs.cashback.details || attrs.short_description_new?.cbinfo || 'on Credit Card Activation'}
                  </p>
                  <button className="mt-3 text-primary text-sm font-medium flex items-center gap-1 hover:underline">
                    View Rewards Rates
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
              <Button 
                onClick={handleApplyNow}
                className="w-full mt-4 h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                {attrs.cashback_button_text || 'Visit Store'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-border p-4 z-20 md:hidden">
        <Button 
          onClick={handleApplyNow}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
        >
          {attrs.cashback_button_text || 'Apply Now'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* How to Get This Offer Popup */}
      <Dialog open={showHowToPopup} onOpenChange={setShowHowToPopup}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">How to Get This Offer?</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {attrs.how_to_get_offer?.map((section, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-green-500' :
                    index === 2 ? 'bg-orange-500' :
                    'bg-purple-500'
                  }`}>
                    {index + 1}
                  </span>
                  <h4 className="font-semibold text-base">{section.title}</h4>
                </div>
                {section.desc && section.desc.length > 0 && (
                  <div className="ml-11 bg-muted/50 rounded-lg p-4">
                    <ul className="space-y-2">
                      {section.desc.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2 text-sm">
                          <ChevronRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <Button 
              onClick={() => {
                setShowHowToPopup(false);
                handleApplyNow();
              }}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {attrs.cashback_button_text || 'Apply Now'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Terms & Conditions Popup */}
      <Dialog open={showAllTerms} onOpenChange={setShowAllTerms}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Terms & Conditions</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {attrs.final_terms_condition && (
              <div 
                className="prose prose-sm max-w-none text-sm text-muted-foreground [&_li]:my-1 [&_ul]:my-2"
                dangerouslySetInnerHTML={{ __html: attrs.final_terms_condition }}
              />
            )}
            {attrs.terms_and_conditions && (
              <div 
                className="prose prose-sm max-w-none text-sm text-muted-foreground mt-4 pt-4 border-t border-border [&_li]:my-1 [&_ul]:my-2 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: attrs.terms_and_conditions }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OfferDetail;
