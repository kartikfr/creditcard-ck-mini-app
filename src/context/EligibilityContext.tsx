import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { checkEligibility as apiCheckEligibility } from '@/lib/api';

interface EligibilityInputs {
  pincode: string;
  monthlyIncome: number;
  employmentType: 'salaried' | 'self-employed';
}

interface EligibilityState {
  inputs: EligibilityInputs | null;
  eligibleCardIds: string[];
  isChecked: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EligibilityContextType extends EligibilityState {
  checkEligibility: (pincode: string, monthlyIncome: number, employmentType: 'salaried' | 'self-employed') => Promise<{ eligibleCardIds: string[]; totalEligible: number }>;
  clearEligibility: () => void;
  isCardEligible: (offerId: string | number) => boolean;
}

const EligibilityContext = createContext<EligibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'eligibility_data';

export const EligibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EligibilityState>({
    inputs: null,
    eligibleCardIds: [],
    isChecked: false,
    isLoading: false,
    error: null,
  });
  
  // Ref to track if an API call is in progress (prevents race conditions)
  const apiCallInProgress = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          inputs: parsed.inputs,
          eligibleCardIds: parsed.eligibleCardIds || [],
          isChecked: parsed.isChecked || false,
        }));
      }
    } catch (e) {
      console.error('[EligibilityContext] Failed to load from localStorage:', e);
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (state.isChecked) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          inputs: state.inputs,
          eligibleCardIds: state.eligibleCardIds,
          isChecked: state.isChecked,
        }));
      } catch (e) {
        console.error('[EligibilityContext] Failed to save to localStorage:', e);
      }
    }
  }, [state.inputs, state.eligibleCardIds, state.isChecked]);

  const checkEligibility = useCallback(async (
    pincode: string,
    monthlyIncome: number,
    employmentType: 'salaried' | 'self-employed'
  ): Promise<{ eligibleCardIds: string[]; totalEligible: number }> => {
    // Prevent duplicate calls using both state and ref
    if (state.isLoading || apiCallInProgress.current) {
      console.log('[EligibilityContext] Skipping duplicate API call');
      return { eligibleCardIds: state.eligibleCardIds, totalEligible: state.eligibleCardIds.length };
    }
    
    // Mark API call in progress
    apiCallInProgress.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[EligibilityContext] Calling eligibility API...');
      const result = await apiCheckEligibility(pincode, monthlyIncome, employmentType);
      
      console.log('[EligibilityContext] API returned eligible card IDs:', result.eligibleCardIds);
      
      setState(prev => ({
        ...prev,
        inputs: { pincode, monthlyIncome, employmentType },
        eligibleCardIds: result.eligibleCardIds,
        isChecked: true,
        isLoading: false,
      }));
      
      return { eligibleCardIds: result.eligibleCardIds, totalEligible: result.eligibleCardIds.length };
    } catch (error: any) {
      console.error('[EligibilityContext] API error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check eligibility',
      }));
      throw error;
    } finally {
      apiCallInProgress.current = false;
    }
  }, [state.isLoading, state.eligibleCardIds]);

  const clearEligibility = useCallback(() => {
    setState({
      inputs: null,
      eligibleCardIds: [],
      isChecked: false,
      isLoading: false,
      error: null,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[EligibilityContext] Failed to clear localStorage:', e);
    }
  }, []);

  // Check if a specific card/offer is eligible
  // Matches offer.id (from CashKaro API) with ck_store_id (from BankKaro eligibility API)
  const isCardEligible = useCallback((offerId: string | number) => {
    if (!state.isChecked || state.eligibleCardIds.length === 0) {
      return false;
    }
    const offerIdStr = String(offerId);
    const isEligible = state.eligibleCardIds.includes(offerIdStr);
    return isEligible;
  }, [state.isChecked, state.eligibleCardIds]);

  return (
    <EligibilityContext.Provider value={{
      ...state,
      checkEligibility,
      clearEligibility,
      isCardEligible,
    }}>
      {children}
    </EligibilityContext.Provider>
  );
};

export const useEligibility = () => {
  const context = useContext(EligibilityContext);
  if (context === undefined) {
    throw new Error('useEligibility must be used within an EligibilityProvider');
  }
  return context;
};
