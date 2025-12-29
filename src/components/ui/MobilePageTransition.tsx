import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';

interface MobilePageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-specific page transition with stack-based slide animations.
 * Uses horizontal slide for screen changes (forward = slide in from right, back = slide in from left).
 * Faster durations (180-220ms) for native mobile feel.
 * Respects user's "reduce motion" preference.
 */
const MobilePageTransition: React.FC<MobilePageTransitionProps> = ({ children, className }) => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(true);
  const [displayContent, setDisplayContent] = useState(children);
  const previousPath = useRef(location.pathname);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    if (location.pathname === previousPath.current) {
      setDisplayContent(children);
      return;
    }

    // Determine direction based on navigation type
    // This is a simple heuristic - going "back" to shorter paths or common back patterns
    const isBack = location.pathname.length < previousPath.current.length ||
                   location.pathname === '/' ||
                   location.key === 'default';
    
    setDirection(isBack ? 'back' : 'forward');
    previousPath.current = location.pathname;

    // Animate out, then animate in with new content
    setIsVisible(false);
    
    const timer = setTimeout(() => {
      setDisplayContent(children);
      setIsVisible(true);
    }, prefersReducedMotion ? 0 : 80);

    return () => clearTimeout(timer);
  }, [location.pathname, location.key, children, prefersReducedMotion]);

  // If user prefers reduced motion, show content immediately without animation
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const getTransformClass = () => {
    if (isVisible) {
      return 'opacity-100 translate-x-0';
    }
    // Exit animation: slide out in opposite direction
    return direction === 'forward' 
      ? 'opacity-0 -translate-x-3' 
      : 'opacity-0 translate-x-3';
  };

  return (
    <div
      className={cn(
        'transition-all duration-220 ease-out will-change-transform',
        getTransformClass(),
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

export default MobilePageTransition;
