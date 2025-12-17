import React, { ReactNode } from 'react';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import Footer from './Footer';
import TopNav from './TopNav';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <Sidebar />
      <main className="lg:ml-64 pb-20 lg:pb-0 flex-1 pt-16">
        {children}
        <Footer />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
