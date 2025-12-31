import React, { useState, useEffect } from 'react';
import { Phone, Mail, Building2, Smartphone, User, Hash, MapPin, Landmark, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TermsCheckbox from './TermsCheckbox';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export type PaymentMethodType = 'amazon' | 'flipkart' | 'bank' | 'upi';

interface ValidationState {
  isValid: boolean;
  isTouched: boolean;
  message?: string;
}

interface PaymentDetailsFormProps {
  method: PaymentMethodType;
  amount: number;
  walletLabel: string;
  isLoading: boolean;
  onSubmit: (data: PaymentFormData) => void;
}

export interface PaymentFormData {
  mobileNumber: string;
  confirmMobileNumber: string;
  email: string;
  confirmEmail: string;
  upiId: string;
  confirmUpiId: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branch: string;
  termsAccepted: boolean;
}

const PaymentDetailsForm: React.FC<PaymentDetailsFormProps> = ({
  method,
  amount,
  walletLabel,
  isLoading,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    mobileNumber: '',
    confirmMobileNumber: '',
    email: '',
    confirmEmail: '',
    upiId: '',
    confirmUpiId: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: '',
    branch: '',
    termsAccepted: false,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const updateField = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Validation helpers
  const validateMobile = (value: string): ValidationState => {
    const isTouched = touched.mobileNumber ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (!/^[6-9]\d{9}$/.test(value)) {
      return { isValid: false, isTouched, message: 'Enter valid 10-digit mobile number starting with 6-9' };
    }
    return { isValid: true, isTouched };
  };

  const validateConfirmMobile = (value: string): ValidationState => {
    const isTouched = touched.confirmMobileNumber ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value !== formData.mobileNumber) {
      return { isValid: false, isTouched, message: 'Mobile numbers don\'t match' };
    }
    return { isValid: true, isTouched };
  };

  const validateEmail = (value: string): ValidationState => {
    const isTouched = touched.email ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length < 5 || value.length > 50) {
      return { isValid: false, isTouched, message: 'Enter valid email address (5-50 characters)' };
    }
    return { isValid: true, isTouched };
  };

  const validateConfirmEmail = (value: string): ValidationState => {
    const isTouched = touched.confirmEmail ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value !== formData.email) {
      return { isValid: false, isTouched, message: 'Email addresses don\'t match' };
    }
    return { isValid: true, isTouched };
  };

  const validateUpi = (value: string): ValidationState => {
    const isTouched = touched.upiId ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (!value.includes('@') || value.length < 5) {
      return { isValid: false, isTouched, message: 'Enter valid UPI ID (e.g., name@upi)' };
    }
    return { isValid: true, isTouched };
  };

  const validateConfirmUpi = (value: string): ValidationState => {
    const isTouched = touched.confirmUpiId ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value !== formData.upiId) {
      return { isValid: false, isTouched, message: 'UPI IDs don\'t match' };
    }
    return { isValid: true, isTouched };
  };

  const validateAccountNumber = (value: string): ValidationState => {
    const isTouched = touched.accountNumber ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value.length < 9 || value.length > 18) {
      return { isValid: false, isTouched, message: 'Enter valid bank account number (9-18 digits)' };
    }
    return { isValid: true, isTouched };
  };

  const validateConfirmAccountNumber = (value: string): ValidationState => {
    const isTouched = touched.confirmAccountNumber ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value !== formData.accountNumber) {
      return { isValid: false, isTouched, message: 'Account numbers don\'t match' };
    }
    return { isValid: true, isTouched };
  };

  const validateIfsc = (value: string): ValidationState => {
    const isTouched = touched.ifscCode ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
      return { isValid: false, isTouched, message: 'Enter valid IFSC code (e.g., HDFC0001234)' };
    }
    return { isValid: true, isTouched };
  };

  const validateRequired = (value: string, field: string, minLength: number = 3): ValidationState => {
    const isTouched = touched[field] ?? false;
    if (!value) return { isValid: false, isTouched, message: '' };
    if (value.length < minLength) {
      return { isValid: false, isTouched, message: `Enter valid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}` };
    }
    return { isValid: true, isTouched };
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    if (!formData.termsAccepted) return false;

    switch (method) {
      case 'amazon':
        return validateMobile(formData.mobileNumber).isValid &&
               validateConfirmMobile(formData.confirmMobileNumber).isValid &&
               validateEmail(formData.email).isValid &&
               validateConfirmEmail(formData.confirmEmail).isValid;
      case 'flipkart':
        return validateEmail(formData.email).isValid &&
               validateConfirmEmail(formData.confirmEmail).isValid;
      case 'upi':
        return validateUpi(formData.upiId).isValid;
      case 'bank':
        return validateIfsc(formData.ifscCode).isValid &&
               validateRequired(formData.bankName, 'bankName').isValid &&
               validateRequired(formData.accountHolderName, 'accountHolderName').isValid &&
               validateAccountNumber(formData.accountNumber).isValid;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      onSubmit(formData);
    }
  };

  // Input with validation styling
  const renderInput = (
    field: keyof PaymentFormData,
    label: string,
    placeholder: string,
    icon: React.ReactNode,
    validation: ValidationState,
    type: string = 'text',
    transform?: (value: string) => string,
    note?: string
  ) => {
    const hasValue = !!(formData[field] as string);
    const showError = validation.isTouched && hasValue && !validation.isValid;
    const showSuccess = validation.isTouched && hasValue && validation.isValid;

    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div className="relative">
          <Input
            type={type}
            placeholder={placeholder}
            value={formData[field] as string}
            onChange={(e) => {
              const value = transform ? transform(e.target.value) : e.target.value;
              updateField(field, value);
            }}
            onBlur={() => markTouched(field)}
            className={cn(
              'h-12 pr-10',
              showError && 'border-destructive focus-visible:ring-destructive',
              showSuccess && 'border-success focus-visible:ring-success'
            )}
          />
          {hasValue && validation.isTouched && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {validation.isValid ? (
                <Check className="w-5 h-5 text-success" />
              ) : (
                <X className="w-5 h-5 text-destructive" />
              )}
            </div>
          )}
        </div>
        {showError && validation.message && (
          <p className="text-xs text-destructive">{validation.message}</p>
        )}
        {note && !showError && (
          <p className="text-xs text-muted-foreground">{note}</p>
        )}
      </div>
    );
  };

  const getMethodTitle = () => {
    switch (method) {
      case 'amazon': return 'Amazon Pay Balance';
      case 'flipkart': return 'Flipkart Gift Card';
      case 'bank': return 'Bank Transfer (IMPS/RTGS)';
      case 'upi': return 'UPI Transfer';
      default: return 'Payment';
    }
  };

  return (
    <div className="space-y-6">
      {/* Amount Header */}
      <div className="bg-gradient-primary text-primary-foreground rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/80 text-sm">{walletLabel}</p>
            <p className="text-2xl font-bold">₹{amount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground/80 text-xs">Payment Method</p>
            <p className="font-medium">{getMethodTitle()}</p>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Amazon Pay - Mobile + Email with confirmations */}
        {method === 'amazon' && (
          <>
            {renderInput(
              'mobileNumber',
              'Mobile Number',
              'Enter 10-digit mobile number',
              <Phone className="w-4 h-4" />,
              validateMobile(formData.mobileNumber),
              'tel',
              (v) => v.replace(/\D/g, '').slice(0, 10)
            )}
            {renderInput(
              'confirmMobileNumber',
              'Confirm Mobile Number',
              'Re-enter mobile number',
              <Phone className="w-4 h-4" />,
              validateConfirmMobile(formData.confirmMobileNumber),
              'tel',
              (v) => v.replace(/\D/g, '').slice(0, 10)
            )}
            {renderInput(
              'email',
              'Email Address',
              'Enter your email address',
              <Mail className="w-4 h-4" />,
              validateEmail(formData.email),
              'email'
            )}
            {renderInput(
              'confirmEmail',
              'Confirm Email Address',
              'Re-enter your email address',
              <Mail className="w-4 h-4" />,
              validateConfirmEmail(formData.confirmEmail),
              'email'
            )}
          </>
        )}

        {/* Flipkart - Email with confirmation */}
        {method === 'flipkart' && (
          <>
            {renderInput(
              'email',
              'Email Address',
              'Enter your email address',
              <Mail className="w-4 h-4" />,
              validateEmail(formData.email),
              'email',
              undefined,
              'Flipkart Gift Card will be sent to this email'
            )}
            {renderInput(
              'confirmEmail',
              'Confirm Email Address',
              'Re-enter your email address',
              <Mail className="w-4 h-4" />,
              validateConfirmEmail(formData.confirmEmail),
              'email'
            )}
          </>
        )}

        {/* UPI - Single UPI ID field only */}
        {method === 'upi' && (
          <>
            {renderInput(
              'upiId',
              'Enter UPI ID',
              'Enter UPI ID',
              <Smartphone className="w-4 h-4" />,
              validateUpi(formData.upiId)
            )}
          </>
        )}

        {/* Bank Transfer - IFSC, Bank Name, Account Holder, Account Number */}
        {method === 'bank' && (
          <>
            {renderInput(
              'ifscCode',
              'IFSC Code',
              'e.g., HDFC0001234',
              <Landmark className="w-4 h-4" />,
              validateIfsc(formData.ifscCode),
              'text',
              (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
            )}
            {renderInput(
              'bankName',
              'Bank Name',
              'Enter bank name',
              <Building2 className="w-4 h-4" />,
              validateRequired(formData.bankName, 'bankName')
            )}
            {renderInput(
              'accountHolderName',
              'Account Holder Name',
              'As per bank records',
              <User className="w-4 h-4" />,
              validateRequired(formData.accountHolderName, 'accountHolderName')
            )}
            {renderInput(
              'accountNumber',
              'Account Number',
              'Enter account number',
              <Hash className="w-4 h-4" />,
              validateAccountNumber(formData.accountNumber),
              'text',
              (v) => v.replace(/\D/g, '').slice(0, 18)
            )}
          </>
        )}
      </div>

      {/* Terms Checkbox */}
      <TermsCheckbox
        checked={formData.termsAccepted}
        onCheckedChange={(checked) => updateField('termsAccepted', checked)}
      />

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={!isFormValid() || isLoading}
        className="w-full h-12 bg-gradient-primary hover:opacity-90"
      >
        {isLoading ? <LoadingSpinner size="sm" /> : 'Get Paid'}
      </Button>
    </div>
  );
};

export default PaymentDetailsForm;
