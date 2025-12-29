import React from 'react';
import { Check } from 'lucide-react';

interface EligibilityBadgeProps {
  className?: string;
}

const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-0.5 md:gap-1 px-1 py-0.5 md:px-1.5 rounded-full bg-primary/10 border border-primary/20 ${className}`}>
      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" strokeWidth={2.5} />
      <span className="text-[8px] md:text-[10px] font-medium text-primary whitespace-nowrap">
        Eligible
      </span>
    </div>
  );
};

export default EligibilityBadge;