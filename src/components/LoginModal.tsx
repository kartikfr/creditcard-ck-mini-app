import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOTP, verifyOTPAndLogin, requestSignupOTP, signupUser, fetchOTPFromGenerator } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Step = 'phone' | 'otp' | 'name';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashbackText?: string;
  onContinueWithoutLogin?: () => void;
  onLoginSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  open,
  onOpenChange,
  cashbackText,
  onContinueWithoutLogin,
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const { login, getGuestToken } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setOtp('');
      setOtpGuid('');
      setFullName('');
      setEmail('');
      setIsNewUser(false);
      setCountdown(0);
    }
  }, [open]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const validatePhone = (value: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value);
  };

  const validateName = (value: string): boolean => {
    const nameRegex = /^[A-Za-z\s]{2,}$/;
    return nameRegex.test(value.trim());
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const maskPhone = (phoneNum: string) => {
    if (phoneNum.length !== 10) return phoneNum;
    return `${phoneNum.slice(0, 2)}XXXXX${phoneNum.slice(-2)}`;
  };

  const handleSendOTP = async () => {
    if (!validatePhone(phone)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit mobile number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      // Try login OTP first
      try {
        const response = await requestOTP(phone, token);
        const guid = response?.data?.id;
        
        if (guid) {
          setOtpGuid(guid);
          setIsNewUser(false);
          setStep('otp');
          setCountdown(30);
          
          // Fetch and auto-fill OTP for testing
          const generatedOTP = await fetchOTPFromGenerator(phone);
          if (generatedOTP) {
            setOtp(generatedOTP);
          }
          return;
        }
      } catch (loginError) {
        const errorMsg = loginError instanceof Error ? loginError.message : '';
        if (errorMsg.toLowerCase().includes('not') || errorMsg.toLowerCase().includes('exist') || errorMsg.toLowerCase().includes('invalid')) {
          try {
            const signupResponse = await requestSignupOTP(phone, token);
            const guid = signupResponse?.data?.id;
            
            if (guid) {
              setOtpGuid(guid);
              setIsNewUser(true);
              setStep('otp');
              setCountdown(30);
              
              // Fetch and auto-fill OTP for testing
              const generatedOTP = await fetchOTPFromGenerator(phone);
              if (generatedOTP) {
                setOtp(generatedOTP);
              }
              return;
            }
          } catch (signupError) {
            const signupErrorMsg = signupError instanceof Error ? signupError.message : '';
            if (signupErrorMsg.toLowerCase().includes('already') || signupErrorMsg.toLowerCase().includes('exist')) {
              throw loginError;
            }
            throw signupError;
          }
        }
        throw loginError;
      }
    } catch (error) {
      toast({
        title: 'Failed to Send OTP',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    if (isNewUser) {
      setStep('name');
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (!otpGuid) {
        throw new Error('Please request a new OTP.');
      }
      
      const response = await verifyOTPAndLogin(phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
      onOpenChange(false);
      onLoginSuccess?.();
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!fullName.trim() || !validateName(fullName)) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      toast({
        title: 'Email Required',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (!otpGuid) {
        throw new Error('Please request a new OTP.');
      }
      
      const response = await signupUser(fullName.trim(), email.trim(), phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
      onOpenChange(false);
      onLoginSuccess?.();
    } catch (error) {
      toast({
        title: 'Signup Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (isNewUser) {
        const response = await requestSignupOTP(phone, token);
        setOtpGuid(response?.data?.id || '');
      } else {
        const response = await requestOTP(phone, token);
        setOtpGuid(response?.data?.id || '');
      }
      
      setCountdown(30);
      setOtp('');
      
      // Fetch and auto-fill new OTP for testing
      const generatedOTP = await fetchOTPFromGenerator(phone);
      if (generatedOTP) {
        setOtp(generatedOTP);
      }
    } catch (error) {
      toast({
        title: 'Failed to Resend',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNumber = () => {
    setStep('phone');
    setOtp('');
    setOtpGuid('');
    setFullName('');
    setIsNewUser(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="p-6 pt-8">
          {/* Contextual message */}
          {cashbackText && step === 'phone' && (
            <p className="text-primary text-sm font-medium mb-4 text-center">
              1 step away from earning {cashbackText}
            </p>
          )}

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">Credit Card Cashback</span>
          </div>

          {/* Step: Phone */}
          {step === 'phone' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-foreground mb-1">
                  Sign up or Login
                </h2>
                <p className="text-muted-foreground text-sm">
                  We will send an OTP to verify
                </p>
              </div>

              <div className="flex border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <div className="flex items-center px-3 bg-muted/30 border-r border-border">
                  <span className="text-sm text-foreground font-medium">+91</span>
                </div>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="border-0 h-11 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || !validatePhone(phone)}
                className={`w-full h-11 font-medium rounded-xl transition-colors ${
                  validatePhone(phone) 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
              >
                {isLoading ? <LoadingSpinner size="sm" /> : 'Continue'}
              </Button>

              {onContinueWithoutLogin && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenChange(false);
                      onContinueWithoutLogin();
                    }}
                    className="w-full text-sm text-primary hover:underline font-medium"
                  >
                    Continue without account & Lose Cashback
                  </button>
                </>
              )}

              <p className="text-[10px] text-center text-muted-foreground">
                By continuing you agree to Terms & Privacy Policy
              </p>
            </div>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-foreground mb-1">
                  Enter 6 digit code
                </h2>
                <p className="text-muted-foreground text-sm">
                  Code sent to +91 {maskPhone(phone)}{' '}
                  <button 
                    onClick={handleEditNumber}
                    className="text-primary hover:underline font-medium"
                  >
                    Edit
                  </button>
                </p>
              </div>

              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                disabled={isLoading}
              >
                <InputOTPGroup className="gap-1.5 w-full justify-center">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index}
                      index={index} 
                      className="w-10 h-11 text-base rounded-lg border-border first:rounded-l-lg last:rounded-r-lg first:border-l"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <p className="text-center text-xs text-muted-foreground">
                Haven't received?{' '}
                {countdown > 0 ? (
                  <span>Resend in {countdown}s</span>
                ) : (
                  <button 
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-primary hover:underline font-medium"
                  >
                    Resend
                  </button>
                )}
              </p>

              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
                className="w-full h-11 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          )}

          {/* Step: Name */}
          {step === 'name' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-display font-bold text-foreground mb-1">
                  Welcome! Almost done
                </h2>
                <p className="text-muted-foreground text-sm">
                  Please provide your details
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Your name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl text-base"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl text-base"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleCompleteSignup}
                disabled={isLoading || !fullName.trim() || !validateName(fullName) || !email.trim() || !validateEmail(email)}
                className="w-full h-11 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
                ) : (
                  'Complete Signup'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;
