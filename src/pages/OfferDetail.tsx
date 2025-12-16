import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Clock, CheckCircle, Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { fetchOfferDetail } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface OfferCashback {
  payment_type?: string;
  currency?: string;
  amount?: string;
  details?: string;
  strike_out_value?: number;
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
    benefit_card_short_description?: string;
    benefit_card_details?: string;
    how_to_get_offer?: Array<{
      title?: string;
      description?: string;
    }>;
    tracking_info?: string;
    store_banners?: {
      desktop?: { image_url?: string }[];
      mobile?: { image_url?: string }[];
    };
  };
}

const OfferDetail: React.FC = () => {
  const { uniqueIdentifier } = useParams<{ uniqueIdentifier: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<OfferDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    benefits: false,
    terms: false,
    howTo: true,
  });

  useEffect(() => {
    const loadOfferDetail = async () => {
      if (!uniqueIdentifier) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetchOfferDetail(uniqueIdentifier);
        console.log('[OfferDetail] API Response:', response);
        
        if (response?.data) {
          // Handle both array and single object response
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCashbackText = () => {
    if (!offer?.attributes?.cashback) return null;
    const { payment_type, currency, amount, strike_out_value } = offer.attributes.cashback;
    
    if (payment_type === 'currency' && amount) {
      return {
        amount: `₹${amount}`,
        strikeOut: strike_out_value && strike_out_value > 0 ? `₹${strike_out_value}` : null,
        label: offer.attributes.cashback.details || offer.attributes.cashback_type || 'Rewards'
      };
    }
    
    if (payment_type === 'percent' && amount) {
      return {
        amount: `${amount}%`,
        strikeOut: null,
        label: offer.attributes.cashback_type || 'Cashback'
      };
    }
    
    return null;
  };

  const handleApplyNow = () => {
    if (offer?.attributes?.cashback_url) {
      window.open(offer.attributes.cashback_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Parse HTML description to extract key points
  const parseDescription = (html?: string) => {
    if (!html) return [];
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const points: string[] = [];
    
    // Extract text from spans with ☛ markers
    const text = temp.textContent || '';
    const matches = text.split('☛').filter(Boolean);
    matches.forEach(m => {
      const cleaned = m.trim();
      if (cleaned) points.push(cleaned);
    });
    
    return points;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4">{error || 'Offer not found'}</p>
        <Button onClick={() => navigate(-1)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const attrs = offer.attributes;
  const cashbackInfo = getCashbackText();
  const descriptionPoints = parseDescription(attrs.short_description);
  const bannerImage = attrs.banner_image_url || attrs.store_banners?.desktop?.[0]?.image_url || attrs.image_url;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-lg truncate">{attrs.name}</h1>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        {bannerImage && (
          <div className="w-full h-48 md:h-64 bg-gradient-to-b from-primary/10 to-background">
            <img 
              src={bannerImage} 
              alt={attrs.name}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
          {/* Card Header */}
          <div className="p-4 flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white border border-border flex items-center justify-center flex-shrink-0">
              <img 
                src={attrs.image_url} 
                alt={attrs.name}
                className="max-w-12 max-h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/100x60/f9fafb/666666?text=${encodeURIComponent((attrs.name || 'Card').slice(0, 5))}`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg">{attrs.name}</h2>
              {attrs.rating_value && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{attrs.rating_value}</span>
                  {attrs.rating_count && (
                    <span className="text-xs text-muted-foreground">({attrs.rating_count} reviews)</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cashback Highlight */}
          {cashbackInfo && (
            <div className="px-4 pb-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-baseline gap-2">
                  {cashbackInfo.strikeOut && (
                    <span className="text-muted-foreground line-through text-sm">{cashbackInfo.strikeOut}</span>
                  )}
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{cashbackInfo.amount}</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">{cashbackInfo.label}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Benefits */}
      {descriptionPoints.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Key Benefits
            </h3>
            <ul className="space-y-2">
              {descriptionPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">☛</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Important Timelines */}
      {(attrs.tracking_speed || attrs.expected_confirmation_days) && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Important Timelines
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {attrs.tracking_speed && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Tracking Time</p>
                  <p className="font-semibold">{attrs.tracking_speed}</p>
                </div>
              )}
              {attrs.expected_confirmation_days && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Confirmation</p>
                  <p className="font-semibold">{attrs.expected_confirmation_days} Days</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* How to Get This Offer */}
      {attrs.how_to_get_offer && attrs.how_to_get_offer.length > 0 && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleSection('howTo')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                How to Get This Offer
              </h3>
              {expandedSections.howTo ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {expandedSections.howTo && (
              <div className="px-4 pb-4 space-y-4">
                {attrs.how_to_get_offer.map((step, index) => (
                  <div key={index} className="bg-muted/30 rounded-lg p-3">
                    <h4 className="font-medium text-sm text-primary">{step.title}</h4>
                    {step.description && (
                      <div 
                        className="text-sm mt-1 text-muted-foreground prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: step.description }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Benefits */}
      {(attrs.benefit_card_short_description || attrs.benefit_card_details) && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleSection('benefits')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold">Card Benefits</h3>
              {expandedSections.benefits ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {expandedSections.benefits && (
              <div className="px-4 pb-4">
                {attrs.benefit_card_short_description && (
                  <div 
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: attrs.benefit_card_short_description }}
                  />
                )}
                {attrs.benefit_card_details && (
                  <div 
                    className="prose prose-sm max-w-none text-sm mt-3 pt-3 border-t border-border"
                    dangerouslySetInnerHTML={{ __html: attrs.benefit_card_details }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terms & Conditions */}
      {(attrs.final_terms_condition || attrs.terms_and_conditions) && (
        <div className="px-4 mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => toggleSection('terms')}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold">Terms & Conditions</h3>
              {expandedSections.terms ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {expandedSections.terms && (
              <div className="px-4 pb-4">
                {attrs.final_terms_condition && (
                  <div 
                    className="prose prose-sm max-w-none text-sm text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: attrs.final_terms_condition }}
                  />
                )}
                {attrs.terms_and_conditions && (
                  <div 
                    className="prose prose-sm max-w-none text-sm text-muted-foreground mt-3 pt-3 border-t border-border"
                    dangerouslySetInnerHTML={{ __html: attrs.terms_and_conditions }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {attrs.tracking_info && (
        <div className="px-4 mt-4 mb-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Tracking Information</h3>
            <div 
              className="prose prose-sm max-w-none text-sm text-amber-700 dark:text-amber-300"
              dangerouslySetInnerHTML={{ __html: attrs.tracking_info }}
            />
          </div>
        </div>
      )}

      {/* Fixed CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-20">
        <Button 
          onClick={handleApplyNow}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {attrs.cashback_button_text || 'Apply Now'}
          <ExternalLink className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default OfferDetail;
