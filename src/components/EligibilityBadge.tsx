import React from 'react';
import { CheckCircle } from 'lucide-react';

interface EligibilityBadgeProps {
  className?: string;
}

const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 ${className}`}>
      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      <span className="text-[10px] md:text-xs font-medium text-emerald-700 dark:text-emerald-400">
        Eligible
      </span>
    </div>
  );
};

export default EligibilityBadge;
