import React, { useState } from 'react';
import { BadgeCheck, Settings2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useEligibility } from '@/context/EligibilityContext';
import { Button } from '@/components/ui/button';
import EligibilityModal from './EligibilityModal';

interface CheckEligibilityButtonProps {
  className?: string;
}

const CheckEligibilityButton: React.FC<CheckEligibilityButtonProps> = ({ className = '' }) => {
  const { isChecked, eligibleCardIds, inputs } = useEligibility();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {isChecked ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className={`group flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/30 transition-all ${className}`}
        >
          {/* Eligible Count Badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {eligibleCardIds.length} Eligible
            </span>
          </div>
          
          {/* Eligibility Info */}
          <div className="hidden sm:flex flex-col items-start text-left">
            <span className="text-[10px] text-muted-foreground leading-tight">
              ₹{inputs?.monthlyIncome?.toLocaleString() || '0'}/mo • {inputs?.pincode || 'N/A'}
            </span>
          </div>
          
          {/* Edit Button */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Edit</span>
          </div>
        </button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className={`h-9 gap-2 bg-gradient-primary hover:opacity-90 ${className}`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Check Your Eligibility</span>
          <span className="sm:hidden">Check Eligibility</span>
        </Button>
      )}

      <EligibilityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default CheckEligibilityButton;
