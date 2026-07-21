import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { devAuth, prdAuth, getAuthEnv } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

export function useIdleTimeout(
  warningTimeoutMs: number = 1620000,
  countdownMs: number = 180000
) {
  const [isWarningPhase, setIsWarningPhase] = useState(false);
  const [timeLeft, setTimeLeft] = useState(countdownMs);

  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const handleLogout = useCallback(async () => {
    try {
      const env = getAuthEnv();
      const authObj = env === 'prd' ? prdAuth : devAuth;
      if (authObj) {
        await signOut(authObj);
        showToast(t('toast.success.logout') || 'Logged out due to inactivity', 'info');
        navigate('/login', { replace: true });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [navigate, showToast, t]);

  const startWarningPhase = useCallback(() => {
    setIsWarningPhase(true);
    setTimeLeft(countdownMs);
  }, [countdownMs]);

  const resetTimer = useCallback(() => {
    if (isWarningPhase) return; // Ignore events during warning phase

    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(startWarningPhase, warningTimeoutMs);
  }, [isWarningPhase, warningTimeoutMs, startWarningPhase]);

  const keepLoggedIn = useCallback(() => {
    setIsWarningPhase(false);
    setTimeLeft(countdownMs);
    resetTimer();
  }, [countdownMs, resetTimer]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);

  useEffect(() => {
    if (isWarningPhase) {
      countdownIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1000) {
            clearInterval(countdownIntervalRef.current!);
            handleLogout();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isWarningPhase, handleLogout]);

  return { isWarningPhase, timeLeft, keepLoggedIn, handleLogout };
}
