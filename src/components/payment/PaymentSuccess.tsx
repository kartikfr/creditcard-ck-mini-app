import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export type PaymentMethodType = 'amazon' | 'flipkart' | 'bank' | 'upi';

interface PaymentSuccessProps {
  method: PaymentMethodType;
  amount: number;
  onContinue?: () => void;
}

const getMethodLabel = (method: PaymentMethodType) => {
  switch (method) {
    case 'amazon':
      return 'Amazon Pay Balance';
    case 'flipkart':
      return 'Flipkart Gift Card';
    case 'bank':
      return 'Bank Transfer';
    case 'upi':
      return 'UPI';
    default:
      return '';
  }
};

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({
  method,
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
      {/* Money Celebration Illustration */}
      <div className="mb-6 relative w-40 h-40">
        <svg viewBox="0 0 120 100" className="w-full h-full">
          {/* Money bills stack */}
          <rect x="25" y="35" width="70" height="40" rx="4" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5"/>
          <rect x="30" y="40" width="60" height="30" rx="2" fill="#dcfce7"/>
          <circle cx="60" cy="55" r="8" fill="#22c55e"/>
          <text x="60" y="59" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">₹</text>
          
          {/* Second bill behind */}
          <rect x="20" y="30" width="70" height="40" rx="4" fill="#4ade80" stroke="#22c55e" strokeWidth="1" opacity="0.7"/>
          
          {/* Coins */}
          <circle cx="85" cy="70" r="10" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5"/>
          <circle cx="85" cy="70" r="5" fill="#fcd34d"/>
          <circle cx="90" cy="62" r="8" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1"/>
          
          {/* Confetti */}
          <rect x="15" y="15" width="6" height="6" fill="#f472b6" transform="rotate(15 15 15)"/>
          <rect x="100" y="20" width="5" height="5" fill="#60a5fa" transform="rotate(-20 100 20)"/>
          <circle cx="25" cy="60" r="3" fill="#a78bfa"/>
          <circle cx="95" cy="40" r="3" fill="#34d399"/>
          <rect x="50" y="10" width="4" height="8" fill="#fbbf24" transform="rotate(25 50 10)"/>
          <rect x="75" y="85" width="5" height="5" fill="#f472b6" transform="rotate(-15 75 85)"/>
          <circle cx="35" cy="80" r="2.5" fill="#60a5fa"/>
          <rect x="10" y="45" width="4" height="4" fill="#34d399" transform="rotate(30 10 45)"/>
          <circle cx="105" cy="55" r="2" fill="#fbbf24"/>
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-lg font-bold text-foreground mb-3">
        {getMethodLabel(method)} Payment Initiated
      </h2>

      {/* Success message */}
      <p className="text-muted-foreground mb-8 max-w-xs text-sm leading-relaxed">
        We have initiated your payment of ₹{amount.toFixed(0)}. It will be added to your {getMethodLabel(method)} within 5 minutes. In rare cases it may take upto 72 hours. We will notify you once the payment is done.
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
