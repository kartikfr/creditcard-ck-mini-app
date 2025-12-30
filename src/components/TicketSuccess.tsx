import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketSuccessProps {
  onContinue: () => void;
  onLearnMore?: () => void;
}

const TicketSuccess: React.FC<TicketSuccessProps> = ({
  onContinue,
  onLearnMore
}) => {
  return (
    <div className="animate-fade-in">
      <div className="max-w-md mx-auto text-center py-8 px-4">
        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-3">
          Please Allow Us 8 to 10 Business Days to Respond
        </h2>

        {/* Description */}
        <p className="text-muted-foreground mb-4">
          Thanks for raising the ticket
        </p>

        {/* Learn More Link */}
        {onLearnMore && (
          <button
            onClick={onLearnMore}
            className="text-sm text-primary font-medium mb-8 inline-flex items-center gap-1 hover:underline"
          >
            Learn More <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Continue Button */}
        <Button onClick={onContinue} className="w-full max-w-xs h-12 mx-auto">
          Continue
        </Button>
      </div>
    </div>
  );
};

export default TicketSuccess;
