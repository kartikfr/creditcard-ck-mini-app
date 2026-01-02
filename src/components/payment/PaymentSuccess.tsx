import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export type PaymentMethodType = 'amazon' | 'flipkart' | 'bank' | 'upi';

interface PaymentSuccessProps {
  method: PaymentMethodType;
  amount: number;
  onContinue?: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  amount,
  onContinue,
}) => {
  const navigate = useNavigate();

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col items-center text-center py-8 px-4">
      {/* Celebration Image */}
      <div className="mb-6">
        <div className="w-32 h-32 mx-auto relative">
          {/* Celebration illustration using emojis/icons */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl">🎉</div>
          </div>
          {/* Confetti decorations */}
          <div className="absolute top-0 left-2 text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>✨</div>
          <div className="absolute top-2 right-0 text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
          <div className="absolute bottom-2 left-0 text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>💫</div>
          <div className="absolute bottom-0 right-2 text-2xl animate-bounce" style={{ animationDelay: '0.4s' }}>🌟</div>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-foreground mb-3">
        Your Withdrawal of ₹{amount.toFixed(0)} is Initiated!
      </h2>

      {/* Success message */}
      <p className="text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
        We are processing your payment and will update you once it is ready. Usually takes 5-7 business days. Have a great day.
      </p>

      {/* CTA Button */}
      <Button
        onClick={handleContinue}
        className="w-full max-w-xs h-12 bg-gradient-primary hover:opacity-90 font-semibold"
      >
        Continue Shopping
      </Button>
    </div>
  );
};

export default PaymentSuccess;
