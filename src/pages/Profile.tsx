import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Settings, HelpCircle, FileText, Shield, LogOut, ChevronRight, Bell, Mail as MailIcon, Newspaper, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProfile, logoutUser } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileData {
  id: string | number;
  type: string;
  attributes: {
    fullname?: string;
    email?: string;
    mobile_number?: string;
    enabled_newsletter?: string;
    enabled_referral_earnings_notification?: string;
  };
}

const Profile: React.FC = () => {
  const { user, accessToken, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (accessToken && isAuthenticated) {
      loadProfile();
    }
  }, [accessToken, isAuthenticated]);

  const loadProfile = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchProfile(accessToken);
      // API returns data as array, get first item
      const profileArray = response?.data;
      const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
      setProfileData(profile || null);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!accessToken) {
      logout();
      return;
    }
    
    setIsLoggingOut(true);
    try {
      await logoutUser(accessToken);
      logout();
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out',
      });
    } catch (err: any) {
      console.error('Logout error:', err);
      // Still logout locally even if API fails
      logout();
      toast({
        title: 'Logged Out',
        description: 'Session ended',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const settingsItems = [
    { icon: Bell, label: 'Notifications', value: notifications, onChange: setNotifications },
    { icon: MailIcon, label: 'Email Updates', value: emailUpdates, onChange: setEmailUpdates },
    { icon: Newspaper, label: 'Newsletter', value: newsletter, onChange: setNewsletter },
  ];

  const supportItems = [
    { icon: HelpCircle, label: 'Help Center', href: '#' },
    { icon: FileText, label: 'Terms & Conditions', href: '#' },
    { icon: Shield, label: 'Privacy Policy', href: '#' },
  ];

  // Get display values from API response or fallback to auth context
  const attrs = profileData?.attributes;
  const displayName = attrs?.fullname || user?.firstName || 'User';
  const displayEmail = attrs?.email || user?.email || 'Not provided';
  
  // Format mobile number - remove country code prefix if present
  const rawPhone = attrs?.mobile_number || user?.mobileNumber || '';
  const displayPhone = rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone || '**********';

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <div className="card-elevated p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to view your profile</p>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card-elevated p-6 mb-6">
          {isLoading ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-36" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-display font-bold text-foreground">
                    {displayName}
                  </h1>
                  <p className="text-muted-foreground">CashKaro Member</p>
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="w-5 h-5" />
                  <span>{displayEmail}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="w-5 h-5" />
                  <span>+91 {displayPhone}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <div className="card-elevated mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Settings
            </h2>
          </div>
          <div className="divide-y divide-border">
            {settingsItems.map((item) => (
              <div key={item.label} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <Switch
                  checked={item.value}
                  onCheckedChange={item.onChange}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="card-elevated mb-6">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Support
            </h2>
          </div>
          <div className="divide-y divide-border">
            {supportItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-6 py-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="destructive"
          className="w-full h-12"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </>
          )}
        </Button>

        {/* App Version */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          CashKaro Mini v1.0.0
        </p>
      </div>
    </AppLayout>
  );
};

export default Profile;
