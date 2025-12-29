import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition component that wraps page content with smooth fade + slide animations.
 * Respects user's "reduce motion" preference for accessibility.
 * Uses GPU-friendly transforms (translate, opacity) for 60fps performance.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayContent, setDisplayContent] = useState(children);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  useEffect(() => {
    // Reset animation on route change
    setIsVisible(false);
    
    // Small delay to ensure the exit animation completes before new content appears
    const timer = setTimeout(() => {
      setDisplayContent(children);
      setIsVisible(true);
    }, prefersReducedMotion ? 0 : 50);

    return () => clearTimeout(timer);
  }, [location.pathname, children, prefersReducedMotion]);

  // If user prefers reduced motion, show content immediately without animation
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        'transition-all duration-250 ease-out will-change-transform',
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2',
        className
      )}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {displayContent}
    </div>
  );
};

export default PageTransition;
