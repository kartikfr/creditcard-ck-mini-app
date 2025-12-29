import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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
  
  // Format cashback display
  const getCashbackAmount = () => {
    if (!attrs.cashback) return null;
    
    const { payment_type, amount } = attrs.cashback;
    
    if (payment_type === 'currency' && amount) {
      return `₹${amount}`;
    }
    
    if (payment_type === 'percent' && amount) {
      return `${amount}%`;
    }
    
    return null;
  };

  const cashbackAmount = getCashbackAmount();
  const displayName = attrs.name || attrs.title || attrs.store_name || 'Credit Card';
  
  // Clean card name - remove redundant "card" suffix
  const cleanName = displayName.replace(/\s*card\s*$/i, '').trim();
  
  // Get image URL with fallback
  const imageUrl = attrs.image_url || `https://placehold.co/200x80/fafafa/999999?text=${encodeURIComponent(cleanName.slice(0, 12))}`;

  // Navigate to internal offer detail page
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (attrs.unique_identifier) {
      navigate(`/offer/${attrs.unique_identifier}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary/30"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Eligibility Badge - Top Right - positioned to not overlap logo */}
      {isEligible && (
        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10">
          <EligibilityBadge />
        </div>
      )}
      
      {/* Card Image - with padding to avoid badge overlap */}
      <div className="flex items-center justify-center p-4 md:p-6 bg-card min-h-[72px] md:min-h-[100px]">
        <img
          src={imageUrl}
          alt={displayName}
          className="max-h-10 md:max-h-14 max-w-[70%] md:max-w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (!target.src.includes('placehold.co')) {
              target.src = `https://placehold.co/200x80/fafafa/999999?text=${encodeURIComponent(cleanName.slice(0, 12))}`;
            }
          }}
        />
      </div>
      
      {/* Card Details */}
      <div className="px-3 md:px-4 pb-3 md:pb-4 pt-0">
        {/* Card Name */}
        <p className="text-xs md:text-sm font-medium text-foreground mb-2 line-clamp-1 text-center">
          {cleanName}
        </p>
        
        {/* Rewards Amount - Primary Focus */}
        {cashbackAmount && (
          <div className="flex items-center justify-between bg-secondary/80 rounded-lg px-3 py-2 group-hover:bg-primary/10 transition-colors duration-200">
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-foreground">
                FLAT {cashbackAmount} Rewards
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferCard;