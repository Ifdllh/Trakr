import React, { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropClassName?: string;
  containerClassName?: string;
  zIndexClass?: string;
}

export function Modal({
  isOpen = true,
  onClose,
  children,
  backdropClassName = "bg-black/50 backdrop-blur-sm",
  containerClassName = "bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]",
  zIndexClass = "z-50"
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(isOpen);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      isClosingRef.current = false;
    } else if (isMounted && !isClosingRef.current) {
      handleCloseAnimation();
    }
  }, [isOpen]);

  const handleCloseAnimation = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsMounted(false);
        isClosingRef.current = false;
        onClose();
      }
    });

    if (backdropRef.current) {
      tl.to(backdropRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0);
    }
    if (contentRef.current) {
      tl.to(contentRef.current, { opacity: 0, scale: 0.95, duration: 0.25, ease: 'power2.in' }, 0);
    }
  };

  useGSAP(() => {
    if (!isMounted) return;

    if (backdropRef.current) {
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }

    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
      );
    }
  }, [isMounted]);

  if (!isMounted) return null;

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 ${backdropClassName}`}
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          handleCloseAnimation();
        }
      }}
    >
      <div
        ref={contentRef}
        className={containerClassName}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;
