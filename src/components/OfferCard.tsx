import React from 'react';
import { useNavigate } from 'react-router-dom';
import EligibilityBadge from './EligibilityBadge';

interface OfferCashback {
  payment_type?: string;
  currency?: string;
  amount?: string;
  strike_out_value?: number;
}

interface OfferAttributes {
  name?: string;
  cashback_type?: string;
  offer_type?: string;
  cashback_button_text?: string;
  cashback?: OfferCashback;
  short_description?: string;
  cashback_ribbon_text?: string;
  unique_identifier?: string;
  cashback_url?: string;
  image_url?: string;
  title?: string;
  store_name?: string;
}

export interface Offer {
  type: string;
  id: string | number;
  attributes: OfferAttributes;
  links?: {
    self?: string;
  };
}

interface OfferCardProps {
  offer: Offer;
  isEligible?: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, isEligible = false }) => {
  const navigate = useNavigate();
  const attrs = offer.attributes;
  
  // Format cashback display text
  const getCashbackText = () => {
    if (!attrs.cashback) return null;
    
    const { payment_type, currency, amount, strike_out_value } = attrs.cashback;
    
    if (payment_type === 'currency' && amount) {
      const prefix = strike_out_value && parseFloat(amount) > strike_out_value ? 'Flat' : 'Upto';
      return `${prefix} ₹${amount} ${attrs.cashback_type || 'Rewards'}`;
    }
    
    if (payment_type === 'percent' && amount) {
      return `${amount}% ${attrs.cashback_type || 'Cashback'}`;
    }
    
    return attrs.cashback_type ? `${attrs.cashback_type}` : null;
  };

  const cashbackText = getCashbackText();
  const displayName = attrs.name || attrs.title || attrs.store_name || 'Special Offer';
  const ribbonText = attrs.cashback_ribbon_text || attrs.offer_type || '';
  
  // Get image URL with fallback
  const imageUrl = attrs.image_url || `https://placehold.co/150x60/f9fafb/666666?text=${encodeURIComponent(displayName.slice(0, 10))}`;

  // Navigate to internal offer detail page using unique_identifier
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (attrs.unique_identifier) {
      navigate(`/offer/${attrs.unique_identifier}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="relative block bg-gradient-to-b from-rose-50 to-white dark:from-rose-950/20 dark:to-card rounded-lg md:rounded-xl border border-rose-100 dark:border-rose-900/30 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] group cursor-pointer"
    >
      {/* Ribbon Badge with Eligibility */}
      <div className="flex items-center justify-between bg-rose-100 dark:bg-rose-900/40 py-1 md:py-1.5 px-1.5 md:px-2 min-h-[24px] md:min-h-[28px]">
        <span className="text-rose-600 dark:text-rose-300 text-[9px] md:text-xs font-medium line-clamp-1 flex-1">
          {ribbonText || '\u00A0'}
        </span>
        {isEligible && <EligibilityBadge className="ml-1 flex-shrink-0" />}
      </div>
      
      {/* Logo/Image */}
      <div className="flex items-center justify-center p-3 md:p-6 min-h-[60px] md:min-h-[100px] bg-white dark:bg-card">
        <img
          src={imageUrl}
          alt={displayName}
          className="max-h-10 md:max-h-16 max-w-full object-contain group-hover:scale-105 transition-transform"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('placehold.co')) {
              target.src = `https://placehold.co/150x60/f9fafb/666666?text=${encodeURIComponent(displayName.slice(0, 10))}`;
            }
          }}
        />
      </div>
      
      {/* Card Name */}
      <p className="text-center text-[10px] md:text-sm font-medium text-muted-foreground px-1.5 md:px-2 pb-1.5 md:pb-2 line-clamp-1 uppercase tracking-wide">
        {displayName.replace(/card/gi, '').trim()} CARD
      </p>
      
      {/* Cashback Button */}
      {cashbackText && (
        <div className="px-2 md:px-3 pb-2.5 md:pb-4">
          <div className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] md:text-sm font-semibold text-center py-1.5 md:py-2 px-2 md:px-3 rounded-md md:rounded-lg transition-colors">
            {cashbackText}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferCard;
