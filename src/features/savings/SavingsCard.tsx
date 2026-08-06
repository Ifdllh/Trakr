import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SavingsGoal } from '@/types';
import { Target, Calendar, CheckCircle2, MoreVertical, Sparkles, Edit2, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedCurrency } from '@/components/ui/AnimatedCurrency';

interface SavingsCardProps {
  goal: SavingsGoal;
  onEdit: (goal: SavingsGoal) => void;
  onTopup: (goal: SavingsGoal) => void;
  onAchieve?: (goal: SavingsGoal) => void;
  onCancel?: (goal: SavingsGoal) => void;
}

export function SavingsCard({ goal, onEdit, onTopup, onAchieve, onCancel }: SavingsCardProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const progressPercent = useMemo(() => {
    if (goal.targetAmount <= 0) return 0;
    const p = (goal.currentAmount / goal.targetAmount) * 100;
    return Math.min(Math.round(p), 100);
  }, [goal.currentAmount, goal.targetAmount]);

  const isAchieved = progressPercent >= 100 || (goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount);
  const isCompleted = goal.status === 'completed';

  const pacingData = useMemo(() => {
    if (!goal.deadlineDate) return null;
    const deadline = new Date(goal.deadlineDate);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = diffDays > 0 ? diffDays : 0;

    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

    if (daysRemaining > 60) {
      const months = Math.ceil(daysRemaining / 30);
      const monthlyNeeded = !isCompleted && !isAchieved ? Math.ceil(remainingAmount / (daysRemaining / 30)) : null;
      return {
        timeCount: `~${months}`,
        timeUnit: t('savings.months_left', 'months left'),
        pacingAmount: monthlyNeeded,
        pacingUnitKey: 'savings.month',
        pacingDefaultUnit: 'month'
      };
    } else if (daysRemaining > 14) {
      const weeks = Math.ceil(daysRemaining / 7);
      const weeklyNeeded = !isCompleted && !isAchieved ? Math.ceil(remainingAmount / (daysRemaining / 7)) : null;
      return {
        timeCount: `~${weeks}`,
        timeUnit: t('savings.weeks_left', 'weeks left'),
        pacingAmount: weeklyNeeded,
        pacingUnitKey: 'savings.week',
        pacingDefaultUnit: 'week'
      };
    } else {
      const dailyNeeded = !isCompleted && !isAchieved && daysRemaining > 0 ? Math.ceil(remainingAmount / daysRemaining) : null;
      return {
        timeCount: `${daysRemaining}`,
        timeUnit: t('savings.days_left', 'days left'),
        pacingAmount: dailyNeeded,
        pacingUnitKey: 'savings.day',
        pacingDefaultUnit: 'day'
      };
    }
  }, [goal.deadlineDate, goal.targetAmount, goal.currentAmount, isCompleted, isAchieved, t]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4 font-sans relative">
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-4">
          <h3 className="font-bold text-slate-800 text-lg mb-1">{goal.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs tracking-wider text-neutral-500 uppercase font-semibold">
              <Target size={14} className="text-indigo-400" />
              {t('savings.target', 'Target')}: <strong className="text-slate-700 tabular-nums font-bold"><AnimatedCurrency value={goal.targetAmount} /></strong>
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 relative" ref={menuRef}>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border border-emerald-100">
              <CheckCircle2 size={12} />
              {t('savings.completed', 'Completed')}
            </span>
          ) : (
            <>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Options"
              >
                <MoreVertical size={16} />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 font-sans animate-fade-in">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onEdit(goal);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl w-full text-left transition-colors"
                  >
                    <Edit2 size={14} className="text-slate-500" />
                    {t('savings.edit', 'Ubah Target')}
                  </button>
                  {onCancel && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onCancel(goal);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl w-full text-left transition-colors"
                    >
                      <Ban size={14} className="text-red-500" />
                      {t('savings.cancel_goal', 'Batalkan & Tarik Dana')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wider text-neutral-500 uppercase font-bold mb-0.5">{t('savings.current', 'Current')}</span>
            <span className="text-xl font-bold text-indigo-950 tabular-nums leading-none">
              <AnimatedCurrency value={goal.currentAmount} />
            </span>
          </div>
          <span className="text-sm font-bold text-indigo-600 tabular-nums">{progressPercent}%</span>
        </div>

        <div className="w-full h-3 bg-indigo-50 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${isAchieved ? 'bg-emerald-500' : 'bg-indigo-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-end justify-between mt-2 pt-4 border-t border-gray-100">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 font-medium">
            <Calendar size={14} className="text-neutral-400 shrink-0" />
            {pacingData ? (
              <span>
                <strong className="text-neutral-700 tabular-nums">{pacingData.timeCount}</strong> {pacingData.timeUnit}
              </span>
            ) : (
              <span>{t('savings.no_deadline', 'No deadline')}</span>
            )}
          </div>
          {pacingData?.pacingAmount !== null && pacingData?.pacingAmount !== undefined && (
            <div className="text-xs text-neutral-400 font-normal pl-5">
              {t('savings.requires', 'Requires')} <strong className="text-neutral-500 font-semibold tabular-nums"><AnimatedCurrency value={pacingData.pacingAmount} /></strong>/{t(pacingData.pacingUnitKey, pacingData.pacingDefaultUnit)}
            </div>
          )}
        </div>

        {/* Conditional Action Button */}
        {isCompleted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <CheckCircle2 size={14} />
            {t('savings.completed', 'Completed')}
          </span>
        ) : isAchieved ? (
          <button
            onClick={() => onAchieve && onAchieve(goal)}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm shadow-emerald-500/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Sparkles size={14} />
            {t('savings.achieve_goal', '🎉 Achieve Goal')}
          </button>
        ) : (
          <button
            onClick={() => onTopup(goal)}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {t('savings.topup', 'Top-up')}
          </button>
        )}
      </div>
    </div>
  );
}
