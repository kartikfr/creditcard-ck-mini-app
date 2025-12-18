import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useEligibility } from '@/context/EligibilityContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EligibilityModal: React.FC<EligibilityModalProps> = ({ isOpen, onClose }) => {
  const { inputs, isChecked, isLoading, checkEligibility, clearEligibility } = useEligibility();
  const { toast } = useToast();
  
  const [pincode, setPincode] = useState(inputs?.pincode || '');
  const [monthlyIncome, setMonthlyIncome] = useState(inputs?.monthlyIncome?.toString() || '');
  const [employmentType, setEmploymentType] = useState<'salaried' | 'self-employed'>(
    inputs?.employmentType || 'salaried'
  );

  // Sync form state with context inputs when modal opens
  useEffect(() => {
    if (isOpen && inputs) {
      setPincode(inputs.pincode || '');
      setMonthlyIncome(inputs.monthlyIncome?.toString() || '');
      setEmploymentType(inputs.employmentType || 'salaried');
    }
  }, [isOpen, inputs]);

  // Validation
  const isPincodeValid = /^\d{6}$/.test(pincode);
  const isIncomeValid = monthlyIncome && parseInt(monthlyIncome) > 0;
  const isFormValid = isPincodeValid && isIncomeValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    if (!isFormValid) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter valid pincode and monthly income.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await checkEligibility(pincode, parseInt(monthlyIncome), employmentType);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to check eligibility. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    clearEligibility();
    setPincode('');
    setMonthlyIncome('');
    setEmploymentType('salaried');
    toast({
      title: 'Eligibility Cleared',
      description: 'You can check eligibility again with new details.',
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-semibold">Check Your Eligibility</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 pb-6">
          {/* Pincode */}
          <div className="space-y-2">
            <Label htmlFor="pincode" className="text-sm font-medium">
              Enter Pincode
            </Label>
            <Input
              id="pincode"
              type="text"
              placeholder="e.g., 110001"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`h-11 ${pincode && !isPincodeValid ? 'border-destructive' : ''}`}
            />
            {pincode && !isPincodeValid && (
              <p className="text-xs text-destructive">Enter a valid 6-digit pincode</p>
            )}
          </div>

          {/* Monthly Income */}
          <div className="space-y-2">
            <Label htmlFor="income" className="text-sm font-medium">
              Enter Monthly Salary (₹)
            </Label>
            <Input
              id="income"
              type="text"
              placeholder="e.g., 50000"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value.replace(/\D/g, ''))}
              className="h-11"
            />
          </div>

          {/* Employment Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Employment Type</Label>
            <RadioGroup
              value={employmentType}
              onValueChange={(v) => setEmploymentType(v as 'salaried' | 'self-employed')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="salaried" id="salaried" />
                <Label htmlFor="salaried" className="font-normal cursor-pointer">Salaried</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="self-employed" id="self-employed" />
                <Label htmlFor="self-employed" className="font-normal cursor-pointer">Self Employed</Label>
              </div>
            </RadioGroup>
          </div>


          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isChecked ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1 h-11"
                >
                  Clear & Re-check
                </Button>
                <Button
                  type="submit"
                  disabled={!isFormValid || isLoading}
                  className="flex-1 h-11"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    'Update Eligibility'
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full h-11"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Eligibility'
                )}
              </Button>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default EligibilityModal;
