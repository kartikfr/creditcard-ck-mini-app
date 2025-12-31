import React from 'react';
import { Wallet, Gift, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WalletType = 'cashback' | 'rewards' | 'cashback_and_rewards';

interface WalletOption {
  type: WalletType;
  label: string;
  amount: number;
  icon: React.ReactNode;
  color: string;
  methods: string[];
  enabled: boolean;
}

interface PaymentTypeSelectorProps {
  cashbackBalance: number;
  rewardsBalance: number;
  minimumPayout: number;
  onSelect: (type: WalletType) => void;
}

const PaymentTypeSelector: React.FC<PaymentTypeSelectorProps> = ({
  cashbackBalance,
  rewardsBalance,
  minimumPayout,
  onSelect,
}) => {
  const effectiveMinimumPayout = minimumPayout > 0 ? minimumPayout : 0.01;
  const cashbackEligible = cashbackBalance >= effectiveMinimumPayout;
  const rewardsEligible = rewardsBalance >= effectiveMinimumPayout;

  const options: WalletOption[] = [
    {
      type: 'cashback',
      label: 'Cashback Only',
      amount: cashbackBalance,
      icon: <Wallet className="w-6 h-6" />,
      color: 'hsl(var(--primary))',
      methods: ['Amazon', 'Flipkart', 'Bank', 'UPI'],
      enabled: cashbackEligible,
    },
    {
      type: 'rewards',
      label: 'Rewards Only',
      amount: rewardsBalance,
      icon: <Gift className="w-6 h-6" />,
      color: '#F59E0B',
      methods: ['Amazon', 'Flipkart'],
      enabled: rewardsEligible,
    },
    {
      type: 'cashback_and_rewards',
      label: 'Cashback + Rewards',
      amount: cashbackBalance + rewardsBalance,
      icon: <Wallet className="w-6 h-6" />,
      color: 'hsl(var(--success))',
      methods: ['Amazon', 'Flipkart'],
      enabled: cashbackEligible && rewardsEligible,
    },
  ];

  const availableOptions = options.filter(opt => opt.enabled);

  if (availableOptions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No balance available for withdrawal
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {availableOptions.map((option) => (
        <button
          key={option.type}
          onClick={() => onSelect(option.type)}
          className="w-full card-elevated p-5 text-left hover:border-primary transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${option.color}15`, color: option.color }}
            >
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-foreground">{option.label}</p>
                <p 
                  className="text-lg font-bold"
                  style={{ color: option.color }}
                >
                  ₹{option.amount.toFixed(2)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {option.methods.map((method) => (
                  <span 
                    key={method}
                    className="px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      ))}
    </div>
  );
};

export default PaymentTypeSelector;
