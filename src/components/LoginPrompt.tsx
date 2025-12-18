import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoginPromptProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({
  title,
  description,
  icon: Icon = LogIn,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center justify-center min-h-[60vh] p-4 ${className}`}>
      <div className="max-w-sm w-full text-center">

        {/* Icon */}
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => navigate('/login')} 
            className="w-full h-12 bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium rounded-xl"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign up or Login
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;
