import React from 'react';
import { cn } from '@/lib/utils';

export interface Retailer {
  id: string;
  type: string;
  attributes: {
    name: string;
    image_url?: string;
    cashback?: {
      payment_type?: string;
      amount?: string;
    };
    cashback_ribbon_text?: string;
    unique_identifier?: string;
    cashback_type?: string;
    offer_type?: string;
  };
  links?: {
    self?: string;
  };
}

interface RetailerCardProps {
  retailer: Retailer;
  onClick: () => void;
  className?: string;
}

const RetailerCard: React.FC<RetailerCardProps> = ({ retailer, onClick, className }) => {
  const { attributes } = retailer;
  
  // Get offer ribbon text (promo/discount text shown at top)
  const getRibbonText = () => {
    // Use ribbon text if available
    if (attributes.cashback_ribbon_text) {
      return attributes.cashback_ribbon_text;
    }
    return null;
  };

  // Format cashback button text
  const getCashbackDisplay = () => {
    const cashbackType = attributes.cashback_type || 'Cashback';
    
    if (attributes.cashback?.amount) {
      const amount = attributes.cashback.amount;
      const type = attributes.cashback.payment_type;
      if (type === 'percent') {
        return `Upto ${amount}% ${cashbackType}`;
      }
      return `Flat ₹${amount} ${cashbackType}`;
    }
    return null;
  };

  const ribbonText = getRibbonText();
  const cashbackDisplay = getCashbackDisplay();

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden",
        "hover:border-primary hover:shadow-lg transition-all duration-200",
        "group focus:outline-none focus:ring-2 focus:ring-primary/50",
        "flex flex-col h-full",
        className
      )}
    >
      {/* Offer Ribbon at Top */}
      <div className="bg-pink-50 dark:bg-pink-950/30 px-2 py-1.5 md:py-2 text-center min-h-[28px] md:min-h-[32px] flex items-center justify-center">
        {ribbonText ? (
          <span className="text-[10px] md:text-xs font-medium text-pink-600 dark:text-pink-400 line-clamp-1">
            {ribbonText}
          </span>
        ) : (
          <span className="text-[10px] md:text-xs text-transparent">-</span>
        )}
      </div>

      {/* Logo Container */}
      <div className="flex-1 flex items-center justify-center p-3 md:p-4 min-h-[70px] md:min-h-[90px]">
        {attributes.image_url ? (
          <img
            src={attributes.image_url}
            alt={attributes.name}
            className="max-w-[80px] md:max-w-[100px] max-h-[50px] md:max-h-[60px] object-contain"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-xl md:text-2xl font-bold text-primary">${attributes.name?.charAt(0) || 'R'}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-xl md:text-2xl font-bold text-primary">
            {attributes.name?.charAt(0) || 'R'}
          </span>
        )}
      </div>

      {/* Cashback Button */}
      <div className="px-2 md:px-3 pb-2 md:pb-3">
        <div className={cn(
          "w-full py-1.5 md:py-2 px-2 md:px-3 rounded-lg text-center text-[10px] md:text-xs font-semibold",
          "bg-primary text-primary-foreground",
          "group-hover:bg-primary/90 transition-colors"
        )}>
          {cashbackDisplay || `Visit ${attributes.name?.split(' ')[0] || 'Store'}`}
        </div>
      </div>
    </button>
  );
};

export default RetailerCard;
