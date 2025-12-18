import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ArrowRight, ChevronRight, Clock, Calendar, X } from 'lucide-react';
import { fetchOfferDetail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import LoginModal from '@/components/LoginModal';

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
  apporders_text?: string;
}

interface StoreBannerData {
  data?: Array<{ type?: string; value?: string }>;
}

interface FAQItem {
  ques?: string;
  question?: string;
  ans?: string;
  answer?: string;
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
    faq?: FAQItem[];
    popup_steps_to_shop?: string[];
    popup_icons_image_urls?: string[];
    popup_special_terms_conditions?: string;
    full_description?: string;
  };
}

const OfferDetail: React.FC = () => {
  const { uniqueIdentifier } = useParams<{ uniqueIdentifier: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [offer, setOffer] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showHowToPopup, setShowHowToPopup] = useState(false);
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [showAllBenefits, setShowAllBenefits] = useState(false);
  const [showRewardsRates, setShowRewardsRates] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | undefined>(undefined);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [showTrackingInfo, setShowTrackingInfo] = useState(false);
  const [showConfirmationInfo, setShowConfirmationInfo] = useState(false);

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
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    
    if (offer?.attributes?.cashback_url) {
      window.open(offer.attributes.cashback_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContinueWithoutLogin = () => {
    setShowLoginDialog(false);
    if (offer?.attributes?.cashback_url) {
      window.open(offer.attributes.cashback_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Get banner images (only images, filter out lottie/video)
  const getBannerImages = () => {
    const banners = offer?.attributes?.store_banners;
    if (!banners) return [];
    
    const desktopBanners = banners.desktop?.data
      ?.filter(b => b.type === 'image')
      ?.map(b => b.value)
      .filter(Boolean) || [];
    if (desktopBanners.length > 0) return desktopBanners;
    
    const mobileBanners = banners.mobile?.data
      ?.filter(b => b.type === 'image')
      ?.map(b => b.value)
      .filter(Boolean) || [];
    if (mobileBanners.length > 0) return mobileBanners;
    
    return [];
  };

  // Extract tracking time number
  const extractNumber = (text?: string) => {
    if (!text) return null;
    const match = text.match(/\d+/);
    return match ? match[0] : null;
  };

  // Format cashback display - always show "Flat" for amount type
  const getCashbackDisplay = () => {
    const cashback = offer?.attributes?.cashback;
    if (!cashback?.amount) return null;

    const isPercent = cashback.payment_type === 'percent';
    
    if (isPercent) {
      return {
        prefix: 'Flat',
        amount: `${cashback.amount}%`,
        suffix: offer?.attributes?.cashback_type || 'Rewards'
      };
    }
    
    return {
      prefix: 'Flat',
      amount: `₹${cashback.amount}`,
      suffix: offer?.attributes?.cashback_type || 'Rewards'
    };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <Skeleton className="h-48 md:h-72 w-full rounded-2xl" />
              <div className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="h-5 w-56 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <div className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="h-5 w-40 mb-4" />
                <div className="flex gap-4">
                  <Skeleton className="flex-1 h-28 rounded-xl" />
                  <Skeleton className="flex-1 h-28 rounded-xl" />
                </div>
              </div>
            </div>
            <div className="space-y-4 md:sticky md:top-24 md:self-start">
              <div className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="w-24 h-14 rounded-lg mb-3" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </div>
              <div className="bg-card rounded-2xl border border-border p-5">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-32 mt-2" />
                <Skeleton className="h-11 w-full mt-4 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !offer) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center p-4 py-20">
          <p className="text-destructive mb-4">{error || 'Offer not found'}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const attrs = offer.attributes;
  const bannerImages = getBannerImages();
  const currentBanner = bannerImages[currentBannerIndex] || attrs.banner_image_url || attrs.image_url;
  const trackingHours = extractNumber(attrs.tracking_speed);
  const cashbackDisplay = getCashbackDisplay();
  const hasFaqs = attrs.faq && attrs.faq.length > 0;
  const descriptionText = attrs.short_description_new?.info || attrs.seo_description || '';
  const shouldTruncateDescription = descriptionText.length > 150;

  return (
    <AppLayout>
      <div className="pb-32 lg:pb-8">
        {/* Back Button */}
        <div className="max-w-6xl mx-auto px-3 md:px-6 pt-3 md:pt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mb-3 md:mb-4 -ml-2 h-8 md:h-9 text-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
            Back
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-3 md:px-6 pb-4 md:pb-6">
          <div className="grid md:grid-cols-3 gap-3 md:gap-6">
            {/* Left Column - Main Content */}
            <div className="md:col-span-2 space-y-3 md:space-y-4">
              {/* Banner Carousel */}
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800">
                {currentBanner ? (
                  <img 
                    src={currentBanner} 
                    alt={attrs.name}
                    className="w-full h-40 md:h-72 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = attrs.image_url || `https://placehold.co/800x400/1a1a2e/ffffff?text=${encodeURIComponent((attrs.name || 'Offer').slice(0, 10))}`;
                    }}
                  />
                ) : attrs.image_url ? (
                  <img 
                    src={attrs.image_url} 
                    alt={attrs.name}
                    className="w-full h-40 md:h-72 object-contain bg-muted/50 p-6 md:p-8"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/800x400/1a1a2e/ffffff?text=${encodeURIComponent((attrs.name || 'Offer').slice(0, 10))}`;
                    }}
                  />
                ) : (
                  <div className="w-full h-40 md:h-72 flex items-center justify-center bg-muted/50">
                    <span className="text-muted-foreground text-base md:text-lg">{attrs.name}</span>
                  </div>
                )}
                {/* T&Cs Apply Badge */}
                <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 bg-black/60 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                  *T&Cs Apply
                </div>
                {/* Banner Dots */}
                {bannerImages.length > 1 && (
                  <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:gap-2">
                    {bannerImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentBannerIndex(index)}
                        className={`w-6 md:w-8 h-1 rounded-full transition-colors ${
                          index === currentBannerIndex ? 'bg-white' : 'bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Card Info & Description - Mobile */}
              <div className="md:hidden bg-card rounded-xl border border-border p-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-12 bg-muted/50 rounded-lg border border-border flex items-center justify-center p-1.5 flex-shrink-0">
                    <img 
                      src={attrs.image_url} 
                      alt={attrs.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x60/f9fafb/666666?text=${encodeURIComponent((attrs.name || 'Store').slice(0, 5))}`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {attrs.rating_value && (
                        <>
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{attrs.rating_value} of 5</span>
                          {attrs.rating_count && (
                            <span className="text-xs text-muted-foreground">| {attrs.rating_count} Ratings</span>
                          )}
                        </>
                      )}
                    </div>
                    <h2 className="font-semibold text-sm mt-1">{attrs.name}</h2>
                  </div>
                </div>
                {descriptionText && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {descriptionExpanded || !shouldTruncateDescription 
                        ? descriptionText 
                        : `${descriptionText.slice(0, 150)}...`}
                      {shouldTruncateDescription && (
                        <button 
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                          className="text-primary font-medium ml-1 hover:underline"
                        >
                          {descriptionExpanded ? 'less' : 'more'}
                        </button>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Rewards Box - Mobile */}
              <div className="md:hidden bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-xl p-4 text-white">
                {cashbackDisplay && (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl md:text-3xl font-bold">{cashbackDisplay.prefix} {cashbackDisplay.amount}</span>
                      <span className="text-lg font-semibold">{cashbackDisplay.suffix}</span>
                    </div>
                    <p className="text-xs text-white/80 mt-1">
                      {attrs.cashback?.details || attrs.short_description_new?.cbinfo || 'on Credit Card Activation'}
                    </p>
                    <button 
                      onClick={() => setShowRewardsRates(true)}
                      className="mt-2 text-orange-400 text-sm font-medium flex items-center gap-1 hover:underline"
                    >
                      View Rewards Rates
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Benefits Section */}
              {attrs.benefit_card_short_description && attrs.benefit_card_short_description.length > 0 && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-5">
                  <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">{attrs.name} Benefits</h3>
                  <ul className="space-y-2 md:space-y-3">
                    {attrs.benefit_card_short_description.slice(0, 5).map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 md:gap-3">
                        <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold flex-shrink-0 ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-orange-500' :
                          index === 2 ? 'bg-red-500' :
                          index === 3 ? 'bg-cyan-500' :
                          'bg-purple-500'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-xs md:text-sm text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  {attrs.benefit_card_details && attrs.benefit_card_details.length > 0 && (
                    <button 
                      onClick={() => setShowAllBenefits(true)}
                      className="mt-3 md:mt-4 text-primary text-xs md:text-sm font-medium flex items-center gap-1 hover:underline"
                    >
                      See All Benefits
                      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* How to Get This Offer - Button */}
              <button
                onClick={() => setShowHowToPopup(true)}
                className="w-full bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span className="font-bold text-sm md:text-base">How to Get This Offer?</span>
                <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </button>

              {/* Important Timelines */}
              {(attrs.tracking_speed || attrs.expected_confirmation_days) && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-5">
                  <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">Important Timelines</h3>
                  <div className="flex gap-2 md:gap-4">
                    {trackingHours && (
                      <button 
                        onClick={() => setShowTrackingInfo(true)}
                        className="flex-1 bg-muted/30 rounded-lg md:rounded-xl p-2.5 md:p-4 border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Rewards track in</p>
                        <p className="text-xl md:text-3xl font-bold text-foreground">{trackingHours}</p>
                        <div className="flex items-center justify-between mt-0.5 md:mt-1">
                          <span className="text-xs md:text-sm text-muted-foreground">Hours</span>
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                        </div>
                      </button>
                    )}
                    {attrs.expected_confirmation_days && (
                      <button 
                        onClick={() => setShowConfirmationInfo(true)}
                        className="flex-1 bg-muted/30 rounded-lg md:rounded-xl p-2.5 md:p-4 border border-border hover:border-primary/50 transition-colors text-left"
                      >
                        <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Rewards confirm in</p>
                        <p className="text-xl md:text-3xl font-bold text-foreground">{attrs.expected_confirmation_days}</p>
                        <div className="flex items-center justify-between mt-0.5 md:mt-1">
                          <span className="text-xs md:text-sm text-muted-foreground">Days</span>
                          <ArrowRight className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Important Terms & Conditions */}
              {attrs.special_terms_conditions && attrs.special_terms_conditions.length > 0 && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-5">
                  <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">Important Terms & Conditions</h3>
                  <ul className="space-y-2 md:space-y-3">
                    {attrs.special_terms_conditions.slice(0, 4).map((term, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                        <span className="text-foreground mt-0.5">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                  {(attrs.terms_and_conditions || attrs.special_terms_conditions.length > 4) && (
                    <button 
                      onClick={() => setShowAllTerms(true)}
                      className="mt-3 md:mt-4 text-primary text-xs md:text-sm font-medium flex items-center gap-1 hover:underline"
                    >
                      View All Terms & Conditions
                      <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* FAQs Section */}
              {hasFaqs && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border overflow-hidden">
                  <div className="p-3 md:p-5 border-b border-border">
                    <h3 className="font-bold text-sm md:text-base">Frequently Asked Questions</h3>
                  </div>
                  <Accordion type="single" collapsible value={expandedFaq} onValueChange={setExpandedFaq}>
                    {attrs.faq?.map((faqItem, index) => {
                      const question = faqItem.ques || faqItem.question || '';
                      const answer = faqItem.ans || faqItem.answer || '';
                      return (
                        <AccordionItem key={index} value={`faq-${index}`} className="border-b border-border last:border-b-0">
                          <AccordionTrigger className="px-3 md:px-5 py-3 md:py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/30">
                            <span className="text-left text-xs md:text-sm font-medium">{question}</span>
                          </AccordionTrigger>
                          <AccordionContent className="px-3 md:px-5 pb-3 md:pb-4">
                            <p className="text-xs md:text-sm text-muted-foreground">{answer}</p>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              )}

              {/* Full Description */}
              {attrs.full_description && (
                <div className="bg-card rounded-xl md:rounded-2xl border border-border p-3 md:p-5">
                  <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">Full Description</h3>
                  <div 
                    className="prose prose-sm max-w-none text-xs md:text-sm text-muted-foreground [&_h2]:text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-foreground [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_p]:my-2 [&_ul]:my-2 [&_ul]:pl-4 [&_li]:my-1"
                    dangerouslySetInnerHTML={{ __html: attrs.full_description }}
                  />
                </div>
              )}

              {/* Breadcrumb & Disclaimer */}
              <div className="pt-3 md:pt-4 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
                  <button onClick={() => navigate('/')} className="hover:text-primary">Home</button>
                  <span>/</span>
                  <button onClick={() => navigate('/deals')} className="hover:text-primary">Stores</button>
                  <span>/</span>
                  <span className="text-foreground">{attrs.name}</span>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed">
                  *The coupons and offers listed on this store are subject to modification, suspension, or termination at any time without prior notice. Customers are advised to verify the availability, validity, and applicability of the offers directly with the merchant before making any purchase.
                </p>
              </div>
            </div>

            {/* Right Column - Sticky Sidebar (Desktop Only) */}
            <div className="space-y-4 md:sticky md:top-24 md:self-start hidden md:block">
              {/* Card Info */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <div className="w-20 h-14 bg-muted/50 rounded-lg border border-border flex items-center justify-center p-2 flex-shrink-0">
                    <img 
                      src={attrs.image_url} 
                      alt={attrs.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/100x60/f9fafb/666666?text=${encodeURIComponent((attrs.name || 'Store').slice(0, 5))}`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
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
                </div>
                <h2 className="font-semibold text-base mt-3">{attrs.name}</h2>
                {descriptionText && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    {descriptionExpanded || !shouldTruncateDescription 
                      ? descriptionText 
                      : `${descriptionText.slice(0, 150)}...`}
                    {shouldTruncateDescription && (
                      <button 
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="text-primary font-medium ml-1 hover:underline"
                      >
                        {descriptionExpanded ? 'less' : 'more'}
                      </button>
                    )}
                  </p>
                )}
              </div>

              {/* Rewards Box */}
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-2xl p-5 text-white">
                {cashbackDisplay && (
                  <>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-3xl font-bold">{cashbackDisplay.prefix} {cashbackDisplay.amount}</span>
                      <span className="text-xl font-semibold">{cashbackDisplay.suffix}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-1">
                      {attrs.cashback?.details || attrs.short_description_new?.cbinfo || 'on Credit Card Activation'}
                    </p>
                    <button 
                      onClick={() => setShowRewardsRates(true)}
                      className="mt-3 text-orange-400 text-sm font-medium flex items-center gap-1 hover:underline"
                    >
                      View Rewards Rates
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                <Button 
                  onClick={handleApplyNow}
                  className="w-full mt-4 h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                >
                  {attrs.cashback_button_text || `Visit ${attrs.name?.split(' ')[0] || 'Store'}`}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Fixed CTA - positioned above bottom nav */}
        <div className="fixed bottom-16 left-0 right-0 bg-card border-t border-border p-3 z-40 lg:hidden shadow-lg">
          <div className="flex items-center justify-between gap-3">
            {cashbackDisplay && (
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground">{cashbackDisplay.prefix}</span>
                  <span className="text-base font-bold text-orange-500">{cashbackDisplay.amount}</span>
                  <span className="text-xs font-semibold text-orange-500">{cashbackDisplay.suffix}</span>
                </div>
              </div>
            )}
            <Button 
              onClick={handleApplyNow}
              className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm whitespace-nowrap"
            >
              {attrs.cashback_button_text || `Visit ${attrs.name?.split(' ')[0] || 'Store'}`}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* How to Get This Offer Popup - Clean Professional Design */}
        <Dialog open={showHowToPopup} onOpenChange={setShowHowToPopup}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
              <DialogTitle className="text-base md:text-lg font-semibold">How to Get This Offer</DialogTitle>
            </DialogHeader>
            <div className="p-4 md:p-5">
              {attrs.popup_steps_to_shop && attrs.popup_steps_to_shop.length > 0 ? (
                <div className="space-y-4">
                  {attrs.popup_steps_to_shop.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
                        {attrs.popup_icons_image_urls?.[index] ? (
                          <img 
                            src={attrs.popup_icons_image_urls[index]} 
                            alt="" 
                            className="w-5 h-5 object-contain"
                          />
                        ) : (
                          <span className="text-sm font-semibold text-foreground">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm text-foreground">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : attrs.how_to_get_offer && attrs.how_to_get_offer.length > 0 ? (
                <div className="space-y-5">
                  {attrs.how_to_get_offer.map((section, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-foreground border border-border">
                          {index + 1}
                        </span>
                        <h4 className="font-medium text-sm text-foreground">{section.title}</h4>
                      </div>
                      {section.desc && section.desc.length > 0 && (
                        <div className="ml-10">
                          <ul className="space-y-1.5">
                            {section.desc.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {attrs.popup_special_terms_conditions && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Note:</span> {attrs.popup_special_terms_conditions}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Rewards Rates Popup */}
        <Dialog open={showRewardsRates} onOpenChange={setShowRewardsRates}>
          <DialogContent className="max-w-md p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border">
              <DialogTitle className="text-base md:text-lg font-semibold">Rewards Rates</DialogTitle>
            </DialogHeader>
            <div className="p-4 md:p-5 space-y-4">
              {attrs.cashback && (
                <>
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-xs text-muted-foreground mb-1">Reward Amount</p>
                    <p className="text-2xl font-bold text-foreground">
                      Flat {attrs.cashback.payment_type === 'percent' ? `${attrs.cashback.amount}%` : `₹${attrs.cashback.amount}`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{attrs.cashback_type || 'Rewards'}</p>
                  </div>
                  {attrs.cashback.details && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">Reward Details</p>
                      <p className="text-sm text-muted-foreground">{attrs.cashback.details}</p>
                    </div>
                  )}
                  {attrs.short_description_new?.cbinfo && (
                    <div>
                      <p className="text-xs font-medium text-foreground mb-2">Additional Info</p>
                      <p className="text-sm text-muted-foreground">{attrs.short_description_new.cbinfo}</p>
                    </div>
                  )}
                  {attrs.cashback.strike_out_value && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Original Value:</span>
                      <span className="text-sm line-through text-muted-foreground">₹{attrs.cashback.strike_out_value}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* See All Benefits Popup */}
        <Dialog open={showAllBenefits} onOpenChange={setShowAllBenefits}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
              <DialogTitle className="text-base md:text-lg font-semibold">{attrs.name} - All Benefits</DialogTitle>
            </DialogHeader>
            <div className="p-4 md:p-5">
              {attrs.benefit_card_details && attrs.benefit_card_details.length > 0 ? (
                <ul className="space-y-3">
                  {attrs.benefit_card_details.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : attrs.benefit_card_short_description && attrs.benefit_card_short_description.length > 0 ? (
                <ul className="space-y-3">
                  {attrs.benefit_card_short_description.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {/* Tracking Info Popup */}
        <Dialog open={showTrackingInfo} onOpenChange={setShowTrackingInfo}>
          <DialogContent className="max-w-sm p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <DialogTitle className="text-base md:text-lg font-semibold">Rewards Tracking</DialogTitle>
              </div>
            </DialogHeader>
            <div className="p-4 md:p-5">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-foreground">{trackingHours}</p>
                <p className="text-sm text-muted-foreground">Hours</p>
              </div>
              {attrs.tracking_info?.trackingtime_text && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground">{attrs.tracking_info.trackingtime_text}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Info Popup */}
        <Dialog open={showConfirmationInfo} onOpenChange={setShowConfirmationInfo}>
          <DialogContent className="max-w-sm p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <DialogTitle className="text-base md:text-lg font-semibold">Rewards Confirmation</DialogTitle>
              </div>
            </DialogHeader>
            <div className="p-4 md:p-5">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-foreground">{attrs.expected_confirmation_days}</p>
                <p className="text-sm text-muted-foreground">Days</p>
              </div>
              {attrs.tracking_info?.confirmationtime_text && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-sm text-muted-foreground">{attrs.tracking_info.confirmationtime_text}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Terms & Conditions Popup */}
        <Dialog open={showAllTerms} onOpenChange={setShowAllTerms}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="p-4 md:p-5 pb-3 border-b border-border sticky top-0 bg-card z-10">
              <DialogTitle className="text-base md:text-lg font-semibold">Terms & Conditions</DialogTitle>
            </DialogHeader>
            <div className="p-4 md:p-5 space-y-4">
              {attrs.special_terms_conditions && attrs.special_terms_conditions.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm mb-3">Important Terms</h4>
                  <ul className="space-y-2">
                    {attrs.special_terms_conditions.map((term, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-foreground mt-0.5">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {attrs.final_terms_condition && (
                <div 
                  className="prose prose-sm max-w-none text-sm text-muted-foreground [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: attrs.final_terms_condition }}
                />
              )}
              {attrs.terms_and_conditions && (
                <div 
                  className="prose prose-sm max-w-none text-sm text-muted-foreground pt-4 border-t border-border [&_li]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4 [&_strong]:text-foreground"
                  dangerouslySetInnerHTML={{ __html: attrs.terms_and_conditions }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Login Modal */}
        <LoginModal
          open={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          cashbackText={cashbackDisplay ? `${cashbackDisplay.prefix} ${cashbackDisplay.amount} ${cashbackDisplay.suffix}` : undefined}
          onContinueWithoutLogin={handleContinueWithoutLogin}
          onLoginSuccess={() => {
            if (offer?.attributes?.cashback_url) {
              window.open(offer.attributes.cashback_url, '_blank', 'noopener,noreferrer');
            }
          }}
        />
      </div>
    </AppLayout>
  );
};

export default OfferDetail;
