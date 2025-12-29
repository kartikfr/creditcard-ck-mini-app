import React from 'react';
import { Check } from 'lucide-react';

interface EligibilityBadgeProps {
  className?: string;
}

const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 ${className}`}>
      <Check className="w-3 h-3 text-primary" strokeWidth={2.5} />
      <span className="text-[10px] font-medium text-primary">
        Eligible
      </span>
    </div>
  );
};

export default EligibilityBadge;