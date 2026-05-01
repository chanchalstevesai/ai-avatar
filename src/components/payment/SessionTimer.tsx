
import React, { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface SessionTimerProps {
  durationSeconds: number;
  onExpire: () => void;
  isActive: boolean;
}

const SessionTimer: React.FC<SessionTimerProps> = ({ durationSeconds, onExpire, isActive }) => {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => {
    setRemaining(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isActive || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remaining, onExpire]);

  if (!isActive) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isLow = remaining <= 15;
  const isCritical = remaining <= 5;
  const progress = (remaining / durationSeconds) * 100;

  return (
    <div className={`
      fixed top-4 right-4 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-500
      ${isCritical
        ? 'bg-red-500/15 border-red-500/40 shadow-lg shadow-red-500/10 animate-pulse'
        : isLow
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-white/5 border-white/10'
      }
    `}>
      {/* Progress ring */}
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16" cy="16" r="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-white/10"
          />
          <circle
            cx="16" cy="16" r="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${isCritical ? 'text-red-500' : isLow ? 'text-amber-400' : 'text-emerald-400'
              }`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isCritical ? (
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <Timer className={`w-3.5 h-3.5 ${isLow ? 'text-amber-400' : 'text-emerald-400'}`} />
          )}
        </div>
      </div>

      {/* Time display */}
      <div className="flex flex-col">
        <span className={`text-lg font-bold font-mono tabular-nums leading-tight ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'
          }`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
          {isCritical ? 'Ending soon!' : 'Session'}
        </span>
      </div>
    </div>
  );
};

export default SessionTimer;
