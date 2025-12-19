import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { fetchProfile } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import LoginPrompt from '@/components/LoginPrompt';
import { User } from 'lucide-react';

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

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [referralNotification, setReferralNotification] = useState(false);

  useEffect(() => {
    if (accessToken && isAuthenticated) {
      loadProfile();
    }
  }, [accessToken, isAuthenticated]);

  const loadProfile = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    
    try {
      const profileRes = await fetchProfile(accessToken);
      const profileArray = profileRes?.data;
      const profile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
      setProfileData(profile || null);
      
      // Set switch state from profile
      if (profile?.attributes?.enabled_referral_earnings_notification === 'yes') {
        setReferralNotification(true);
      }
    } catch (err: any) {
      console.error('Failed to load profile data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = () => {
    toast({
      title: 'Coming Soon',
      description: 'Profile editing will be available soon',
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: 'Contact Support',
      description: 'Please contact support to delete your account',
      variant: 'destructive',
    });
  };

  const attrs = profileData?.attributes;
  const displayName = attrs?.fullname || user?.firstName || '';
  const displayEmail = attrs?.email || '';
  const displayPhone = attrs?.mobile_number ? String(attrs.mobile_number) : '';

  // Mask phone number for display
  const maskedPhone = displayPhone.length === 10 
    ? `${displayPhone.slice(0, 2)}XXXXX${displayPhone.slice(-2)}`
    : displayPhone;

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <LoginPrompt 
          title="Account Settings"
          description="Login to view and manage your account settings"
          icon={User}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="shrink-0 h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Account Settings</h1>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4 mb-8">
          {/* Full Name */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Full name</label>
            <div className="relative">
              {isLoading ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <span className="text-foreground font-medium">{displayName || 'Not set'}</span>
                  <Pencil className="w-4 h-4 text-primary cursor-pointer hover:text-primary/80" />
                </div>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Email</label>
            <div className="relative">
              {isLoading ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <span className="text-foreground font-medium">{displayEmail || 'Not set'}</span>
                  <Pencil className="w-4 h-4 text-primary cursor-pointer hover:text-primary/80" />
                </div>
              )}
            </div>
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">Mobile Number</label>
            <div className="relative">
              {isLoading ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : (
                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <span className="text-foreground font-medium">{maskedPhone || 'Not set'}</span>
                  <Pencil className="w-4 h-4 text-primary cursor-pointer hover:text-primary/80" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Referral Notification Toggle */}
        <div className="flex items-center justify-between py-4 border-t border-border">
          <span className="text-sm text-foreground">Receive email when I get referral earnings</span>
          <Switch 
            checked={referralNotification}
            onCheckedChange={setReferralNotification}
          />
        </div>

        {/* Delete Account */}
        <button
          onClick={handleDeleteAccount}
          className="text-destructive text-sm font-medium hover:underline mt-6"
        >
          Delete Account
        </button>

        {/* Save Button - Fixed at bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:border-0 md:p-0 md:mt-8">
          <Button
            onClick={handleSaveChanges}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl"
          >
            Save Changes
          </Button>
        </div>

        {/* Spacer for fixed button on mobile */}
        <div className="h-20 md:hidden" />
      </div>
    </AppLayout>
  );
};

export default AccountSettings;
