import React, { ReactNode } from 'react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import TopNav from './TopNav';
import MobilePageTransition from '@/components/ui/MobilePageTransition';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  children: ReactNode;
  /** Whether to disable page transition animations (useful when parent already handles transitions) */
  disableTransition?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, disableTransition = false }) => {
  const isMobile = useIsMobile();
  
  // Wrap content in mobile transition if on mobile and transitions not disabled
  const content = (isMobile && !disableTransition) ? (
    <MobilePageTransition>
      {children}
    </MobilePageTransition>
  ) : (
    children
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="pb-20 lg:pb-0 flex-1 pt-16">
        {content}
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
