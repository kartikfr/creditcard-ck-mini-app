import React, { useState } from 'react';
import { BadgeCheck, Edit3 } from 'lucide-react';
import { useEligibility } from '@/context/EligibilityContext';
import { Button } from '@/components/ui/button';
import EligibilityModal from './EligibilityModal';

interface CheckEligibilityButtonProps {
  className?: string;
}

const CheckEligibilityButton: React.FC<CheckEligibilityButtonProps> = ({ className = '' }) => {
  const { isChecked, eligibleCardIds } = useEligibility();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={isChecked ? 'outline' : 'default'}
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={`h-9 gap-2 ${className}`}
      >
        {isChecked ? (
          <>
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit Eligibility</span>
            <span className="sm:hidden">Edit</span>
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
              {eligibleCardIds.length}
            </span>
          </>
        ) : (
          <>
            <BadgeCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Check Eligibility</span>
            <span className="sm:hidden">Eligibility</span>
          </>
        )}
      </Button>

      <EligibilityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default CheckEligibilityButton;
