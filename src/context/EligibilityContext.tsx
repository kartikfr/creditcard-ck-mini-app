import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
    // Prevent duplicate calls while loading
    if (state.isLoading) {
      return { eligibleCardIds: state.eligibleCardIds, totalEligible: state.eligibleCardIds.length };
    }
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await apiCheckEligibility(pincode, monthlyIncome, employmentType);
      
      setState(prev => ({
        ...prev,
        inputs: { pincode, monthlyIncome, employmentType },
        eligibleCardIds: result.eligibleCardIds,
        isChecked: true,
        isLoading: false,
      }));
      
      return { eligibleCardIds: result.eligibleCardIds, totalEligible: result.eligibleCardIds.length };
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to check eligibility',
      }));
      throw error;
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

  const isCardEligible = useCallback((offerId: string | number) => {
    if (!state.isChecked || state.eligibleCardIds.length === 0) return false;
    return state.eligibleCardIds.includes(String(offerId));
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
