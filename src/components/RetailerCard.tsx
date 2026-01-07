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
  
  // Format cashback display
  const getCashbackDisplay = () => {
    if (attributes.cashback_ribbon_text) {
      return attributes.cashback_ribbon_text;
    }
    if (attributes.cashback?.amount) {
      const amount = attributes.cashback.amount;
      const type = attributes.cashback.payment_type;
      if (type === 'percent') {
        return `${amount}% Cashback`;
      }
      return `₹${amount} Cashback`;
    }
    return null;
  };

  const cashbackDisplay = getCashbackDisplay();

  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-xl p-3 md:p-4 text-center",
        "hover:border-primary hover:shadow-md transition-all duration-200",
        "group focus:outline-none focus:ring-2 focus:ring-primary/50",
        "flex flex-col items-center",
        className
      )}
    >
      {/* Logo Container */}
      <div className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-lg md:rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden mb-2 md:mb-3">
        {attributes.image_url ? (
          <img
            src={attributes.image_url}
            alt={attributes.name}
            className="w-full h-full object-contain p-1"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="text-lg md:text-xl lg:text-2xl font-bold text-primary">${attributes.name?.charAt(0) || 'R'}</span>`;
              }
            }}
          />
        ) : (
          <span className="text-lg md:text-xl lg:text-2xl font-bold text-primary">
            {attributes.name?.charAt(0) || 'R'}
          </span>
        )}
      </div>

      {/* Store Name */}
      <p className="font-medium text-foreground text-xs md:text-sm line-clamp-2 mb-1.5 md:mb-2 group-hover:text-primary transition-colors min-h-[2rem] md:min-h-[2.5rem]">
        {attributes.name}
      </p>

      {/* Cashback Badge */}
      {cashbackDisplay && (
        <span className="inline-block bg-primary/10 text-primary text-[10px] md:text-xs font-semibold px-2 py-0.5 md:py-1 rounded-full">
          {cashbackDisplay}
        </span>
      )}
    </button>
  );
};

export default RetailerCard;
