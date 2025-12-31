import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOTP, verifyOTPAndLogin, requestSignupOTP, signupUser, fetchOTPFromGenerator } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type Step = 'phone' | 'otp' | 'name';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getGuestToken, isAuthenticated } = useAuth();
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
    const nameRegex = /^[A-Za-z\s]{2,}$/;
    return nameRegex.test(value.trim());
  };

  const maskPhone = (phoneNum: string) => {
    if (phoneNum.length !== 10) return phoneNum;
    return `${phoneNum.slice(0, 2)}XXXXX${phoneNum.slice(-2)}`;
  };

  // Try login first, if fails try signup
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
          
          // Fetch and display OTP for testing
          const generatedOTP = await fetchOTPFromGenerator(phone);
          if (generatedOTP) {
            toast({
              title: 'OTP Generated',
              description: `Your OTP is: ${generatedOTP}`,
              duration: 10000,
            });
          }
          return;
        }
      } catch (loginError) {
        // If login OTP fails, user might not exist - try signup
        const errorMsg = loginError instanceof Error ? loginError.message : '';
        if (errorMsg.toLowerCase().includes('not') || errorMsg.toLowerCase().includes('exist') || errorMsg.toLowerCase().includes('invalid')) {
          // Try signup OTP
          try {
            const signupResponse = await requestSignupOTP(phone, token);
            const guid = signupResponse?.data?.id;
            
            if (guid) {
              setOtpGuid(guid);
              setIsNewUser(true);
              setStep('otp');
              setCountdown(30);
              
              // Fetch and display OTP for testing
              const generatedOTP = await fetchOTPFromGenerator(phone);
              if (generatedOTP) {
                toast({
                  title: 'OTP Generated',
                  description: `Your OTP is: ${generatedOTP}`,
                  duration: 10000,
                });
              }
              return;
            }
          } catch (signupError) {
            const signupErrorMsg = signupError instanceof Error ? signupError.message : '';
            if (signupErrorMsg.toLowerCase().includes('already') || signupErrorMsg.toLowerCase().includes('exist')) {
              // User exists but login failed - show original error
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
      // For new users, go to name step
      setStep('name');
      return;
    }

    // For existing users, verify and login directly
    setIsLoading(true);
    try {
      const token = await getGuestToken();
      
      if (!otpGuid) {
        throw new Error('OTP GUID is missing. Please request a new OTP.');
      }
      
      const response = await verifyOTPAndLogin(phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
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

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  };

  const handleCompleteSignup = async () => {
    if (!fullName.trim() || !validateName(fullName)) {
      toast({
        title: 'Name Required',
        description: 'Please enter your name (letters only)',
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
        throw new Error('OTP GUID is missing. Please request a new OTP.');
      }
      
      const response = await signupUser(fullName.trim(), email.trim(), phone, otpGuid, otp, token);
      const userData = response.data.attributes;
      login(userData);
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
      
      // Fetch and display new OTP for testing
      const generatedOTP = await fetchOTPFromGenerator(phone);
      if (generatedOTP) {
        toast({
          title: 'New OTP Generated',
          description: `Your OTP is: ${generatedOTP}`,
          duration: 10000,
        });
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

  const handleBack = () => {
    if (step === 'phone') {
      navigate('/');
    } else if (step === 'otp') {
      handleEditNumber();
    } else if (step === 'name') {
      setStep('otp');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={handleBack}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col px-6 pt-4 pb-8 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground leading-tight">Credit Card Cashback</h1>
            <p className="text-[10px] text-muted-foreground">Powered by CashKaro</p>
          </div>
        </div>

        {/* Step: Phone */}
        {step === 'phone' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Sign up or Login
              </h2>
              <p className="text-muted-foreground text-sm">
                We will send an OTP to verify
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
                <div className="flex items-center px-4 bg-muted/30 border-r border-border">
                  <span className="text-sm text-foreground font-medium">+91</span>
                </div>
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="border-0 h-12 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleSendOTP}
                disabled={isLoading || !validatePhone(phone)}
                className={`w-full h-12 font-medium rounded-xl transition-all duration-300 ${
                  validatePhone(phone)
                    ? 'bg-success hover:bg-success/90 text-success-foreground'
                    : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                }`}
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Continue'
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By continuing you agree to{' '}
              <button onClick={() => navigate('/terms')} className="text-primary hover:underline">
                Terms & Conditions
              </button>{' '}
              and{' '}
              <button onClick={() => navigate('/privacy')} className="text-primary hover:underline">
                Privacy Policy
              </button>
            </p>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Enter 6 digit code
              </h2>
              <p className="text-muted-foreground text-sm">
                Code sent to +91 {maskPhone(phone)}{' '}
                <button 
                  onClick={handleEditNumber}
                  className="text-primary hover:underline font-medium"
                >
                  Edit number
                </button>
              </p>
            </div>

            <div className="space-y-4">
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={setOtp}
                disabled={isLoading}
              >
                <InputOTPGroup className="gap-2 w-full justify-center">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index}
                      index={index} 
                      className="w-11 h-12 sm:w-12 sm:h-14 text-lg rounded-lg border-border first:rounded-l-lg last:rounded-r-lg first:border-l"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              <p className="text-center text-sm text-muted-foreground">
                Haven't received the OTP?{' '}
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
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Name (for new users) */}
        {step === 'name' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Welcome! Almost done
              </h2>
              <p className="text-muted-foreground text-sm">
                Please provide your details to complete setup
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Your name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl text-base"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl text-base"
                  disabled={isLoading}
                />
              </div>

              <Button
                onClick={handleCompleteSignup}
                disabled={isLoading || !fullName.trim() || !validateName(fullName) || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" className="border-primary-foreground border-t-transparent" />
                ) : (
                  'Complete Signup'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
