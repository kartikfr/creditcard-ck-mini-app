import React from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketSuccessProps {
  storeName: string;
  storeImage?: string;
  orderId?: string;
  ticketId?: string;
  onContinue: () => void;
  onLearnMore?: () => void;
}

const TicketSuccess: React.FC<TicketSuccessProps> = ({
  storeName,
  storeImage,
  orderId,
  ticketId,
  onContinue,
  onLearnMore
}) => {
  return (
    <div className="animate-fade-in">
      <div className="max-w-md mx-auto text-center py-8">
        {/* Store Logo */}
        {storeImage && (
          <div className="inline-flex items-center justify-center w-20 h-12 bg-background border rounded-lg mb-6">
            <img
              src={storeImage}
              alt={storeName}
              className="max-w-full max-h-full object-contain p-2"
            />
          </div>
        )}

        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-success/10 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-foreground mb-3">
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
            className="text-sm text-primary font-medium mb-6 inline-flex items-center gap-1 hover:underline"
          >
            Learn More <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {/* Ticket/Order Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
          {ticketId && (
            <p className="text-sm">
              <span className="text-muted-foreground">Ticket ID: </span>
              <span className="font-medium text-foreground">{ticketId}</span>
            </p>
          )}
          {orderId && (
            <p className="text-sm">
              <span className="text-muted-foreground">Order ID: </span>
              <span className="font-medium text-foreground">{orderId}</span>
            </p>
          )}
          <p className="text-sm">
            <span className="text-muted-foreground">Store: </span>
            <span className="font-medium text-foreground">{storeName}</span>
          </p>
        </div>

        {/* Continue Button */}
        <Button onClick={onContinue} className="w-full h-12">
          Continue
        </Button>
      </div>
    </div>
  );
};

export default TicketSuccess;
