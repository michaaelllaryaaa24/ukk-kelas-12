import { useEffect, useRef, useState } from 'react';
import { Coffee, Pause, Play, RotateCcw, Timer, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '../context/useContexts';
import {
  isSoundEnabled,
  isTimerTickEnabled,
  playTimerCompleteSound,
  playTimerTickSound,
  setSoundEnabled,
  setTimerTickEnabled,
  unlockAudioContext,
} from '../utils/sound';

const MODE_CONFIG = {
  focus: { label: 'Mode Fokus', minutes: 25 },
  break: { label: 'Istirahat', minutes: 5 },
};

export default function FocusTimerWidget({ tasks = [], compact = false }) {
  const { showToast } = useToast();
  const [mode, setMode] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(MODE_CONFIG.focus.minutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [tickEnabled, setTickEnabled] = useState(() => isTimerTickEnabled());
  const [globalSoundOn, setGlobalSoundOn] = useState(() => isSoundEnabled());
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const intervalRef = useRef(null);
  const secondsRef = useRef(MODE_CONFIG.focus.minutes * 60);
  const modeRef = useRef('focus');
  const tickEnabledRef = useRef(tickEnabled);

  const activeTasks = tasks.filter((task) => task.status !== 'completed');

  useEffect(() => {
    const syncGlobalSound = (event) => {
      if (typeof event?.detail === 'boolean') {
        setGlobalSoundOn(event.detail);
      } else {
        setGlobalSoundOn(isSoundEnabled());
      }
    };
    window.addEventListener('taskflow:sound-changed', syncGlobalSound);
    return () => window.removeEventListener('taskflow:sound-changed', syncGlobalSound);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      const nextSeconds = secondsRef.current - 1;
      if (nextSeconds <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        playTimerCompleteSound();

        const finishedMode = modeRef.current;
        const nextMode = finishedMode === 'focus' ? 'break' : 'focus';
        const nextDuration = MODE_CONFIG[nextMode].minutes * 60;

        modeRef.current = nextMode;
        secondsRef.current = nextDuration;
        setIsRunning(false);
        setMode(nextMode);
        setSecondsLeft(nextDuration);

        showToast(
          finishedMode === 'focus'
            ? 'Sesi fokus 25 menit selesai. Waktunya istirahat sejenak.'
            : 'Waktu istirahat selesai. Siap melanjutkan tugas berikutnya.',
          'info'
        );
        return;
      }

      secondsRef.current = nextSeconds;
      setSecondsLeft(nextSeconds);
      if (tickEnabledRef.current) {
        playTimerTickSound(nextSeconds % 2 === 1);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, showToast]);

  const handleToggleRunning = () => {
    const next = !isRunning;
    if (next) {
      unlockAudioContext();
      if (tickEnabledRef.current) {
        playTimerTickSound(secondsRef.current % 2 === 1);
      }
    }
    setIsRunning(next);
  };

  const handleToggleTick = () => {
    if (!globalSoundOn) {
      setSoundEnabled(true);
      setGlobalSoundOn(true);
      tickEnabledRef.current = true;
      setTickEnabled(true);
      setTimerTickEnabled(true);
      unlockAudioContext();
      playTimerTickSound(false);
      showToast('Suara detik dan notifikasi timer diaktifkan.', 'info');
      return;
    }

    const next = !tickEnabled;
    tickEnabledRef.current = next;
    setTickEnabled(next);
    setTimerTickEnabled(next);
    if (next) {
      unlockAudioContext();
      playTimerTickSound(false);
    }
  };

  const switchMode = (nextMode) => {
    const nextDuration = MODE_CONFIG[nextMode].minutes * 60;
    modeRef.current = nextMode;
    secondsRef.current = nextDuration;
    setIsRunning(false);
    setMode(nextMode);
    setSecondsLeft(nextDuration);
  };

  const resetTimer = () => {
    const resetDuration = MODE_CONFIG[modeRef.current].minutes * 60;
    secondsRef.current = resetDuration;
    setIsRunning(false);
    setSecondsLeft(resetDuration);
  };

  const totalDuration = MODE_CONFIG[mode].minutes * 60;
  const progressPercent = Math.round(((totalDuration - secondsLeft) / totalDuration) * 100);
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');

  const focusedTask = activeTasks.find((t) => String(t.id) === String(selectedTaskId));

  return (
    <div
      className={`rounded-2xl border border-[#E6E0D4] bg-white dark:border-[#242B3D] dark:bg-[#161B26] ${compact ? 'p-4' : 'p-5'
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7D6EA] text-[#141518] dark:border dark:border-[#2D4268] dark:bg-[#1A253B] dark:text-[#93C5FD]">
            <Timer className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold tracking-wide text-[#141518] dark:text-[#F1F5F9]">
            Timer Fokus
          </span>
        </div>

        <div className="inline-flex rounded-full border border-[#E6E0D4] bg-[#FAF7F0] p-0.5 dark:border-[#242B3D] dark:bg-[#10141E]">
          <button
            type="button"
            onClick={() => switchMode('focus')}
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${mode === 'focus'
                ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
              }`}
          >
            Fokus
          </button>
          <button
            type="button"
            onClick={() => switchMode('break')}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${mode === 'break'
                ? 'bg-[#141518] text-white dark:bg-[#93C5FD] dark:text-[#0F131D]'
                : 'text-[#71717A] hover:text-[#141518] dark:text-[#9DA7BD] dark:hover:text-white'
              }`}
          >
            <Coffee className="h-3 w-3" />
            Jeda
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="font-mono text-3xl font-bold tracking-tight text-[#141518] dark:text-[#F8FAFC]">
          {mins}:{secs}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleRunning}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#141518] px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#93C5FD] dark:text-[#0F131D]"
          >
            {isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? 'Jeda' : 'Mulai'}
          </button>
          <button
            type="button"
            onClick={handleToggleTick}
            title={
              tickEnabled && globalSoundOn
                ? 'Suara detik berjalan aktif (klik untuk bisukan detik)'
                : 'Suara detik nonaktif (klik untuk aktifkan)'
            }
            aria-label="Toggle suara detik timer"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${tickEnabled && globalSoundOn
                ? 'border-[#E6E0D4] bg-[#FAF7F0] text-[#141518] hover:bg-[#EFECE4] dark:border-[#2C4066] dark:bg-[#1A253B] dark:text-[#93C5FD] dark:hover:bg-[#223254]'
                : 'border-[#E6E0D4] bg-[#FAF7F0] text-[#71717A] hover:bg-[#EFECE4] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#6B768F] dark:hover:bg-[#1F2636]'
              }`}
          >
            {tickEnabled && globalSoundOn ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={resetTimer}
            title="Atur ulang timer"
            aria-label="Atur ulang timer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E6E0D4] bg-[#FAF7F0] text-[#52525B] transition-colors hover:bg-[#EFECE4] hover:text-[#141518] dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#9DA7BD] dark:hover:bg-[#1F2636] dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE4] dark:bg-[#212838]">
        <div
          className="h-full rounded-full bg-[#141518] transition-all duration-500 dark:bg-[#93C5FD]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mt-3.5">
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full truncate rounded-xl border border-[#E6E0D4] bg-[#FAF7F0] px-3 py-2 text-xs text-[#141518] focus:border-[#141518] focus:outline-none dark:border-[#242B3D] dark:bg-[#10141E] dark:text-[#F1F5F9] dark:focus:border-[#60A5FA]"
          aria-label="Pilih tugas yang sedang dikerjakan"
        >
          <option value="">Tautkan ke tugas aktif (opsional)...</option>
          {activeTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
        {focusedTask && !compact && (
          <p className="mt-1.5 truncate text-[11px] text-[#71717A] dark:text-[#9DA7BD]">
            Fokus aktif: <span className="font-semibold text-[#141518] dark:text-[#F1F5F9]">{focusedTask.title}</span>
          </p>
        )}
      </div>
    </div>
  );
}
