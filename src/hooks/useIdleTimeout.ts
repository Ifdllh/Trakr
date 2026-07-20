import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { devAuth, prdAuth, getAuthEnv } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';

export function useIdleTimeout(timeoutMs: number = 900000) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const handleLogout = async () => {
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
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(handleLogout, timeoutMs);
    };

    // Setup events
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Initialize the timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutMs, navigate, showToast, t]);
}
