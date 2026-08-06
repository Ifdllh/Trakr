import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface PageTransitionProps {
  children: React.ReactNode;
  pageKey?: string;
  className?: string;
}

export function PageTransition({ children, pageKey, className = "w-full h-full" }: PageTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current) return;
    
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
        clearProps: 'transform'
      }
    );
  }, { scope: containerRef, dependencies: [pageKey] });

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export default PageTransition;
