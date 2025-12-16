import React, { useState } from 'react';
import { User, Mail, Phone, Calendar, Gift, Copy, Share2, Settings, HelpCircle, FileText, Shield, LogOut, ChevronRight, Bell, Mail as MailIcon, Newspaper, Check } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  const referralCode = 'CASHKARO' + (user?.userId || '123');
  const totalReferrals = 5;
  const memberSince = 'January 2023';

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    toast({
      title: 'Copied!',
      description: 'Referral code copied to clipboard',
    });
  };

  const handleShare = async () => {
    const shareText = `Join CashKaro and earn cashback on all your shopping! Use my referral code: ${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join CashKaro',
          text: shareText,
          url: 'https://cashkaro.com',
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: 'Link Copied!',
        description: 'Share link copied to clipboard',
      });
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out',
    });
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

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {user?.firstName || 'User'}
              </h1>
              <p className="text-muted-foreground">Member since {memberSince}</p>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span>{user?.email || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Phone className="w-5 h-5" />
              <span>+91 {user?.mobileNumber || '**********'}</span>
            </div>
          </div>
        </div>

        {/* Referral Section */}
        <div className="card-elevated p-6 mb-6 bg-gradient-primary text-primary-foreground">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Refer & Earn</h2>
              <p className="text-primary-foreground/80 text-sm">
                Earn ₹100 for every friend who joins!
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-primary-foreground/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-primary-foreground/80 mb-1">Your Referral Code</p>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold font-mono tracking-wider">{referralCode}</span>
              <button
                onClick={handleCopyReferral}
                className="p-2 bg-primary-foreground/20 rounded-lg hover:bg-primary-foreground/30 transition-colors"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-2xl font-bold">{totalReferrals}</p>
              <p className="text-sm text-primary-foreground/80">Successful Referrals</p>
            </div>
            <Button
              onClick={handleShare}
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
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
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
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
