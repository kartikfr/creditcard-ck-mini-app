import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageSquareWarning, HelpCircle, FileQuestion, Headphones, MessageCircle, ChevronLeft } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface HelpOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  route: string;
}

const Help: React.FC = () => {
  const navigate = useNavigate();

  const helpOptions: HelpOption[] = [
    {
      id: 'missing-cashback',
      icon: <MessageSquareWarning className="w-8 h-8 text-foreground" />,
      title: 'My Cashback is',
      subtitle: 'Missing',
      route: '/missing-cashback',
    },
    {
      id: 'tracked-cashback',
      icon: <Search className="w-8 h-8 text-foreground" />,
      title: 'Help with',
      subtitle: 'Tracked Cashback',
      route: '/orders',
    },
    {
      id: 'faq',
      icon: <FileQuestion className="w-8 h-8 text-foreground" />,
      title: 'Frequently Asked',
      subtitle: 'Questions',
      route: '/faq',
    },
    {
      id: 'contact',
      icon: <Headphones className="w-8 h-8 text-foreground" />,
      title: 'Want to Connect',
      subtitle: 'with Us',
      route: '/feedback',
    },
    {
      id: 'feedback',
      icon: <MessageCircle className="w-8 h-8 text-foreground" />,
      title: 'Give Us',
      subtitle: 'Feedback',
      route: '/feedback',
    },
  ];

  const handleOptionClick = (route: string) => {
    navigate(route);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="px-4 py-3 border-b border-border">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/" className="text-muted-foreground hover:text-foreground">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Help</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Banner */}
        <div className="bg-primary px-6 py-12 md:py-16 relative overflow-hidden">
          <div className="max-w-4xl mx-auto relative z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10 -ml-2 mb-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              How Can
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
              We Help You?
            </h2>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute right-4 md:right-20 top-1/2 -translate-y-1/2 opacity-90">
            <div className="relative">
              <div className="w-24 h-24 md:w-40 md:h-40 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <HelpCircle className="w-12 h-12 md:w-20 md:h-20 text-primary-foreground" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 md:w-12 md:h-12 bg-accent rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 md:w-6 md:h-6 text-accent-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Help Options Grid */}
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {helpOptions.slice(0, 3).map((option) => (
              <Card
                key={option.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group"
                onClick={() => handleOptionClick(option.route)}
              >
                <div className="mb-4 group-hover:scale-110 transition-transform duration-200">
                  {option.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {option.title}
                </h3>
                {option.subtitle && (
                  <p className="text-lg font-semibold text-foreground">
                    {option.subtitle}
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* Second Row - Centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6 max-w-2xl mx-auto">
            {helpOptions.slice(3).map((option) => (
              <Card
                key={option.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group"
                onClick={() => handleOptionClick(option.route)}
              >
                <div className="mb-4 group-hover:scale-110 transition-transform duration-200">
                  {option.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {option.title}
                </h3>
                {option.subtitle && (
                  <p className="text-lg font-semibold text-foreground">
                    {option.subtitle}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Help;
