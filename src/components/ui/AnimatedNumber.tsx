import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface AnimatedNumberProps {
  value: number;
  formatter: (val: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, formatter, className }: AnimatedNumberProps) {
  const numberRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!numberRef.current) return;
    
    const proxy = { val: 0 };
    gsap.to(proxy, {
      val: value,
      duration: 1.5,
      ease: "power3.out",
      onUpdate: () => {
        if (numberRef.current) {
          numberRef.current.innerText = formatter(proxy.val);
        }
      }
    });
  }, [value, formatter]);

  return <span ref={numberRef} className={className}>{formatter(0)}</span>;
}
