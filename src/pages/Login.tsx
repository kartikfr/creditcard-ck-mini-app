import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ShieldCheck, IndianRupee, Gift, Percent } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { requestOTP, verifyOTPAndLogin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type LoginStep = 'phone' | 'otp';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getGuestToken, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<LoginStep>('phone');
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

  const handleSendOTP = async () => {
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
      
      setOtpGuid(response.data.attributes.otp_guid);
      setStep('otp');
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

  const handleVerifyOTP = async () => {
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
      const response = await verifyOTPAndLogin(phone, otpGuid, otp, token);
      
      const userData = response.data.attributes;
      login(userData);
      
      toast({
        title: 'Welcome!',
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

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    await handleSendOTP();
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.05),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-primary-foreground/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <IndianRupee className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-display font-bold">CashKaro</h1>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-display font-bold mb-6 leading-tight">
            Shop Smart,<br />
            <span className="text-primary-foreground/80">Earn More</span>
          </h2>
          
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-md">
            Get cashback on every purchase from 1500+ stores. Shop through CashKaro and watch your savings grow!
          </p>

          <div className="space-y-4">
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
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
              <IndianRupee className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">CashKaro</h1>
          </div>

          <div className="card-elevated p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {step === 'phone' ? 'Welcome Back!' : 'Verify OTP'}
              </h2>
              <p className="text-muted-foreground">
                {step === 'phone'
                  ? 'Enter your mobile number to continue'
                  : `Enter the OTP sent to +91 ${phone}`}
              </p>
            </div>

            {step === 'phone' ? (
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
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="pl-14 h-12"
                      disabled={isLoading}
                    />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <Button
                  onClick={handleSendOTP}
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
                    onClick={() => {
                      setStep('phone');
                      setOtp('');
                    }}
                    className="text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Change number
                  </button>
                  <button
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || isLoading}
                    className={`${
                      countdown > 0
                        ? 'text-muted-foreground'
                        : 'text-primary hover:underline'
                    }`}
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>

                <Button
                  onClick={handleVerifyOTP}
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

            <p className="mt-6 text-xs text-center text-muted-foreground">
              By continuing, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
