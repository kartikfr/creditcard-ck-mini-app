import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import SettingsSidebar from '@/components/layout/SettingsSidebar';

interface SettingsPageLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for settings/profile pages that includes:
 * - Desktop: Sidebar navigation on the left
 * - Mobile: Regular layout (no sidebar)
 */
const SettingsPageLayout: React.FC<SettingsPageLayoutProps> = ({ children }) => {
  return (
    <AppLayout>
      <div className="flex gap-6 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Desktop Sidebar - hidden on mobile */}
        <SettingsSidebar />
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </AppLayout>
  );
};

export default SettingsPageLayout;
