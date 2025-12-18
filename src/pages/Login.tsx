import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ShieldCheck, IndianRupee, Gift, Percent, User, CreditCard, Sparkles, Mail, Check, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOTP, verifyOTPAndLogin, requestSignupOTP, signupUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'signup';
type LoginStep = 'phone' | 'otp';
type SignupStep = 'phone' | 'details';

// Field touched state interface
interface FieldTouched {
  phone: boolean;
  name: boolean;
  email: boolean;
  otp: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getGuestToken, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Mode: login or signup
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login state
  const [loginStep, setLoginStep] = useState<LoginStep>('phone');
  
  // Signup state
  const [signupStep, setSignupStep] = useState<SignupStep>('phone');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  // Field touched tracking for validation indicators
  const [fieldTouched, setFieldTouched] = useState<FieldTouched>({
    phone: false,
    name: false,
    email: false,
    otp: false,
  });
  
  // Shared state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpGuid, setOtpGuid] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
    // Only allow letters and spaces, at least 2 characters
    const nameRegex = /^[A-Za-z\s]{2,}$/;
    return nameRegex.test(value.trim());
  };

  const validateOtp = (value: string): boolean => {
    return /^\d{6}$/.test(value);
  };

  // Reset state when switching modes
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setPhone('');
    setOtp('');
    setOtpGuid('');
    setFullName('');
    setEmail('');
    setLoginStep('phone');
    setSignupStep('phone');
    setCountdown(0);
    setFieldTouched({ phone: false, name: false, email: false, otp: false });
  };

  const validateEmail = (value: string): boolean => {
    if (!value) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  // Helper to get validation border class
  const getValidationBorderClass = (isValid: boolean, isTouched: boolean, hasValue: boolean): string => {
    if (!isTouched || !hasValue) return '';
    return isValid 
      ? 'border-green-500 focus-visible:ring-green-500/20' 
      : 'border-destructive focus-visible:ring-destructive/20';
  };

  // Validation indicator component
  const ValidationFeedback: React.FC<{
    isValid: boolean;
    isTouched: boolean;
    hasValue: boolean;
    validMessage: string;
    invalidMessage: string;
  }> = ({ isValid, isTouched, hasValue, validMessage, invalidMessage }) => {
    if (!isTouched || !hasValue) return null;
    
    return (
      <div className="flex items-center gap-1.5 text-xs mt-1.5">
        {isValid ? (
          <>
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-500">{validMessage}</span>
          </>
        ) : (
          <>
            <X className="w-3.5 h-3.5 text-destructive" />
            <span className="text-destructive">{invalidMessage}</span>
          </>
        )}
      </div>
    );
  };

  // Validation icon inside input
  const ValidationIcon: React.FC<{
    isValid: boolean;
    isTouched: boolean;
    hasValue: boolean;
  }> = ({ isValid, isTouched, hasValue }) => {
    if (!isTouched || !hasValue) return null;
    
    return isValid ? (
      <Check className="w-5 h-5 text-green-500" />
    ) : (
      <X className="w-5 h-5 text-destructive" />
    );
  };

  // LOGIN HANDLERS
  const handleSendLoginOTP = async () => {
    if (!validatePhone(phone)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit Indian mobile number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      const response = await requestOTP(phone, token);
      const guid = response?.data?.id;
      
      if (!guid) {
        throw new Error('Failed to get OTP GUID from response');
      }
      
      setOtpGuid(guid);
      setLoginStep('otp');
      setCountdown(30);
      
      toast({
        title: 'OTP Sent!',
        description: response.meta?.message || 'Please check your phone for the OTP',
      });
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

  const handleVerifyLoginOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (!otpGuid) {
        throw new Error('OTP GUID is missing. Please request a new OTP.');
      }
      
      const response = await verifyOTPAndLogin(phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
      
      toast({
        title: 'Welcome Back!',
        description: `Hello ${userData.first_name || 'there'}! You're now logged in.`,
      });
      
      navigate('/', { replace: true });
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description: error instanceof Error ? error.message : 'Invalid OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // SIGNUP HANDLERS
  const handleSendSignupOTP = async () => {
    if (!validatePhone(phone)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid 10-digit Indian mobile number',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      const response = await requestSignupOTP(phone, token);
      const guid = response?.data?.id;
      
      if (!guid) {
        throw new Error('Failed to get OTP GUID from response');
      }
      
      setOtpGuid(guid);
      setSignupStep('details');
      setCountdown(30);
      
      toast({
        title: 'OTP Sent!',
        description: 'Please check your phone and enter the OTP below',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Please try again';
      // Check if user already exists
      if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exist')) {
        toast({
          title: 'Account Exists',
          description: 'This number is already registered. Please login instead.',
          variant: 'destructive',
        });
        handleModeChange('login');
      } else {
        toast({
          title: 'Failed to Send OTP',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    if (!fullName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter your full name',
        variant: 'destructive',
      });
      return;
    }

    if (!validateName(fullName)) {
      toast({
        title: 'Invalid Name',
        description: 'Name should only contain letters and spaces (at least 2 characters)',
        variant: 'destructive',
      });
      return;
    }

    if (email && !validateEmail(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address (e.g., name@example.com)',
        variant: 'destructive',
      });
      return;
    }

    if (!validateOtp(otp)) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a valid 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (!otpGuid) {
        throw new Error('OTP GUID is missing. Please request a new OTP.');
      }
      
      const response = await signupUser(fullName.trim(), email.trim(), phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
      
      toast({
        title: 'Welcome!',
        description: `Account created successfully. Hello ${fullName.split(' ')[0]}!`,
      });
      
      navigate('/', { replace: true });
    } catch (error) {
      toast({
        title: 'Signup Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    if (mode === 'login') {
      await handleSendLoginOTP();
    } else {
      await handleSendSignupOTP();
    }
  };

  const handleChangeNumber = () => {
    setOtp('');
    setOtpGuid('');
    if (mode === 'login') {
      setLoginStep('phone');
    } else {
      setSignupStep('phone');
      setFullName('');
    }
  };

  // Render hero section value props based on mode
  const renderHeroContent = () => (
    <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
      <div className="flex flex-col mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-14 h-14 bg-primary-foreground/20 backdrop-blur rounded-2xl flex items-center justify-center">
            <CreditCard className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-display font-bold">Credit Card Cashback</h1>
        </div>
        <p className="text-sm text-primary-foreground/70 ml-[4.25rem]">Powered by CashKaro</p>
      </div>
      
      <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
        {mode === 'login' ? (
          <>Shop Smart,<br /><span className="text-primary-foreground/80">Earn More</span></>
        ) : (
          <>Join India's #1<br /><span className="text-primary-foreground/80">Cashback Platform</span></>
        )}
      </h2>
      
      <p className="text-lg text-primary-foreground/80 mb-10 max-w-md">
        {mode === 'login'
          ? 'Get cashback on every purchase from 1500+ stores. Shop through CashKaro and watch your savings grow!'
          : 'Earn up to ₹2000 cashback on credit cards, plus rewards on shopping from top brands!'}
      </p>

      <div className="space-y-4">
        {mode === 'signup' ? (
          <>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">₹2000 on Credit Cards</p>
                <p className="text-sm text-primary-foreground/70">50+ premium cards available</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">1 Lakh+ Happy Users</p>
                <p className="text-sm text-primary-foreground/70">Trusted by families across India</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">100% Safe & Secure</p>
                <p className="text-sm text-primary-foreground/70">Your data is always protected</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Up to 50% Cashback</p>
                <p className="text-sm text-primary-foreground/70">On top brands & stores</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Exclusive Offers</p>
                <p className="text-sm text-primary-foreground/70">Deals you won't find elsewhere</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-foreground/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">100% Safe & Secure</p>
                <p className="text-sm text-primary-foreground/70">Your data is protected</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Render login form
  const renderLoginForm = () => (
    <>
      {loginStep === 'phone' ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                +91
              </span>
              <Input
                type="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="pl-14 h-10 md:h-12 text-sm placeholder:text-xs md:placeholder:text-sm"
                disabled={isLoading}
              />
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
          </div>

          <Button
            onClick={handleSendLoginOTP}
            disabled={isLoading || phone.length !== 10}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
            ) : (
              <>
                Send OTP
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Enter OTP
            </label>
            <Input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-12 text-center text-xl tracking-[0.5em] font-mono"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={handleChangeNumber}
              className="text-primary hover:underline"
              disabled={isLoading}
            >
              Change number
            </button>
            <button
              onClick={handleResendOTP}
              disabled={countdown > 0 || isLoading}
              className={countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
          </div>

          <Button
            onClick={handleVerifyLoginOTP}
            disabled={isLoading || otp.length !== 6}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
            ) : (
              <>
                Verify & Login
                <ShieldCheck className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );

  // Render signup form
  const renderSignupForm = () => (
    <>
      {signupStep === 'phone' ? (
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                +91
              </span>
              <Input
                type="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onBlur={() => setFieldTouched(prev => ({ ...prev, phone: true }))}
                className={cn(
                  "pl-14 pr-12 h-10 md:h-12 text-sm placeholder:text-xs md:placeholder:text-sm",
                  getValidationBorderClass(validatePhone(phone), fieldTouched.phone, phone.length > 0)
                )}
                disabled={isLoading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {phone.length > 0 && fieldTouched.phone ? (
                  <ValidationIcon isValid={validatePhone(phone)} isTouched={fieldTouched.phone} hasValue={phone.length > 0} />
                ) : (
                  <Phone className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            <ValidationFeedback
              isValid={validatePhone(phone)}
              isTouched={fieldTouched.phone}
              hasValue={phone.length > 0}
              validMessage="Valid phone number"
              invalidMessage="Must start with 6-9 and be 10 digits"
            />
          </div>

          <Button
            onClick={handleSendSignupOTP}
            disabled={isLoading || !validatePhone(phone)}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
            ) : (
              <>
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            OTP sent to +91 {phone.slice(0, 2)}****{phone.slice(-2)}
          </p>
          
          {/* Name Field with Validation */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Your Name
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setFieldTouched(prev => ({ ...prev, name: true }))}
                className={cn(
                  "h-10 md:h-12 pl-10 md:pl-12 pr-10 md:pr-12 text-sm placeholder:text-xs md:placeholder:text-sm",
                  getValidationBorderClass(validateName(fullName), fieldTouched.name, fullName.length > 0)
                )}
                disabled={isLoading}
              />
              <User className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <ValidationIcon isValid={validateName(fullName)} isTouched={fieldTouched.name} hasValue={fullName.length > 0} />
              </div>
            </div>
            <ValidationFeedback
              isValid={validateName(fullName)}
              isTouched={fieldTouched.name}
              hasValue={fullName.length > 0}
              validMessage="Valid name"
              invalidMessage="Only letters and spaces (min 2 characters)"
            />
          </div>

          {/* Email Field with Validation */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Email Address <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setFieldTouched(prev => ({ ...prev, email: true }))}
                className={cn(
                  "h-10 md:h-12 pl-10 md:pl-12 pr-10 md:pr-12 text-sm placeholder:text-xs md:placeholder:text-sm",
                  email.length > 0 ? getValidationBorderClass(validateEmail(email), fieldTouched.email, email.length > 0) : ''
                )}
                disabled={isLoading}
              />
              <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
              {email.length > 0 && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <ValidationIcon isValid={validateEmail(email)} isTouched={fieldTouched.email} hasValue={email.length > 0} />
                </div>
              )}
            </div>
            {email.length > 0 && (
              <ValidationFeedback
                isValid={validateEmail(email)}
                isTouched={fieldTouched.email}
                hasValue={email.length > 0}
                validMessage="Valid email"
                invalidMessage="Please enter a valid email address"
              />
            )}
          </div>

          {/* OTP Field with Validation */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Enter OTP
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onBlur={() => setFieldTouched(prev => ({ ...prev, otp: true }))}
                className={cn(
                  "h-10 md:h-12 text-center text-lg md:text-xl tracking-[0.5em] font-mono pr-10 md:pr-12 placeholder:text-xs md:placeholder:text-sm placeholder:tracking-normal",
                  getValidationBorderClass(validateOtp(otp), fieldTouched.otp, otp.length > 0)
                )}
                disabled={isLoading}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <ValidationIcon isValid={validateOtp(otp)} isTouched={fieldTouched.otp} hasValue={otp.length > 0} />
              </div>
            </div>
            <ValidationFeedback
              isValid={validateOtp(otp)}
              isTouched={fieldTouched.otp}
              hasValue={otp.length > 0}
              validMessage="Valid OTP"
              invalidMessage={`Enter 6 digits (${otp.length}/6)`}
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={handleChangeNumber}
              className="text-primary hover:underline"
              disabled={isLoading}
            >
              Change number
            </button>
            <button
              onClick={handleResendOTP}
              disabled={countdown > 0 || isLoading}
              className={countdown > 0 ? 'text-muted-foreground' : 'text-primary hover:underline'}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
          </div>

          <Button
            onClick={handleCompleteSignup}
            disabled={isLoading || !validateOtp(otp) || !validateName(fullName) || (email.length > 0 && !validateEmail(email))}
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
            ) : (
              <>
                Create Account
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Skip Button - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]" />
        {renderHeroContent()}
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 pt-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <IndianRupee className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">CashKaro</h1>
          </div>

          <div className="card-elevated p-8">
            {/* Tabs for Login/Signup */}
            <Tabs value={mode} onValueChange={(v) => handleModeChange(v as AuthMode)} className="mb-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {mode === 'login' 
                  ? (loginStep === 'phone' ? 'Welcome Back!' : 'Verify OTP')
                  : (signupStep === 'phone' ? 'Create Your Account' : 'Almost There!')}
              </h2>
              <p className="text-muted-foreground">
                {mode === 'login'
                  ? (loginStep === 'phone' 
                      ? 'Enter your mobile number to continue' 
                      : `Enter the OTP sent to +91 ${phone}`)
                  : (signupStep === 'phone'
                      ? 'Enter your mobile number to get started'
                      : 'Enter your name and OTP to complete signup')}
              </p>
            </div>

            {mode === 'login' ? renderLoginForm() : renderSignupForm()}

            <p className="mt-6 text-xs text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <button 
                onClick={() => navigate('/terms')} 
                className="text-primary hover:underline"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button 
                onClick={() => navigate('/privacy')} 
                className="text-primary hover:underline"
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
