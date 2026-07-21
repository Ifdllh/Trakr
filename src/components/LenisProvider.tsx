import React, { useEffect } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';

function ModalTracker() {
  const lenis = useLenis();
  
  useEffect(() => {
    if (!lenis) return;
    
    const checkModals = () => {
      const modals = document.querySelectorAll('.fixed.inset-0');
      
      let hasOpenModal = false;
      for (let i = 0; i < modals.length; i++) {
        const el = modals[i] as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.opacity !== '0' && style.visibility !== 'hidden') {
          hasOpenModal = true;
          break;
        }
      }
      
      if (hasOpenModal) {
        lenis.stop();
        document.body.style.overflow = 'hidden';
      } else {
        lenis.start();
        document.body.style.overflow = '';
      }
    };

    const observer = new MutationObserver(() => {
      checkModals();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
    
    checkModals();

    return () => {
      observer.disconnect();
      document.body.style.overflow = '';
      lenis.start();
    };
  }, [lenis]);

  return null;
}

export function LenisProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.1, smoothWheel: true }}>
      <ModalTracker />
      {children}
    </ReactLenis>
  );
}
