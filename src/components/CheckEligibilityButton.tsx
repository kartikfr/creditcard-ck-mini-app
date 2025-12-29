import React, { useState } from 'react';
import { Settings2, Check } from 'lucide-react';
import { useEligibility } from '@/context/EligibilityContext';
import { Button } from '@/components/ui/button';
import EligibilityModal from './EligibilityModal';

interface CheckEligibilityButtonProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const CheckEligibilityButton: React.FC<CheckEligibilityButtonProps> = ({ 
  className = '',
  variant = 'default'
}) => {
  const { isChecked } = useEligibility();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isChecked) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all duration-200 ${className}`}
        >
          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-medium text-foreground">Eligibility Set</span>
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
        </button>

        <EligibilityModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={`h-9 gap-2 ${className}`}
      >
        <span>Check Eligibility</span>
      </Button>

      <EligibilityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default CheckEligibilityButton;