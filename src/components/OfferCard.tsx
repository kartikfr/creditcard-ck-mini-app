import React from 'react';

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
}

const OfferCard: React.FC<OfferCardProps> = ({ offer }) => {
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

  return (
    <a
      href={attrs.cashback_url || offer.links?.self || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-gradient-to-b from-rose-50 to-white dark:from-rose-950/20 dark:to-card rounded-xl border border-rose-100 dark:border-rose-900/30 overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] group"
    >
      {/* Ribbon Badge */}
      {ribbonText && (
        <div className="bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 text-[10px] md:text-xs font-medium text-center py-1.5 px-2">
          {ribbonText}
        </div>
      )}
      
      {/* Logo/Image */}
      <div className="flex items-center justify-center p-4 md:p-6 min-h-[80px] md:min-h-[100px]">
        <img
          src={attrs.image_url}
          alt={displayName}
          className="max-h-12 md:max-h-16 max-w-full object-contain group-hover:scale-105 transition-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://placehold.co/150x60/f9fafb/666666?text=Logo';
          }}
        />
      </div>
      
      {/* Card Name */}
      <p className="text-center text-xs md:text-sm font-medium text-muted-foreground px-2 pb-2 line-clamp-1 uppercase tracking-wide">
        {displayName.replace(/card/gi, '').trim()} CARD
      </p>
      
      {/* Cashback Button */}
      {cashbackText && (
        <div className="px-3 pb-4">
          <div className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm font-semibold text-center py-2 px-3 rounded-lg transition-colors">
            {cashbackText}
          </div>
        </div>
      )}
    </a>
  );
};

export default OfferCard;
