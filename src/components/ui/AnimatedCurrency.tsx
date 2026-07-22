import React, { useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

interface AnimatedCurrencyProps {
  value: number;
  className?: string;
}

export function AnimatedCurrency({ value, className }: AnimatedCurrencyProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useGSAP(() => {
    const proxy = { val: 0 };
    gsap.to(proxy, {
      val: value,
      duration: 1.5,
      ease: "power3.out",
      onUpdate: () => {
        setDisplayValue(Math.round(proxy.val));
      }
    });
  }, [value]);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return <span className={className}>{formatIDR(displayValue)}</span>;
}
