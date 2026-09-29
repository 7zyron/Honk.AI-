import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Trophy, Zap, Volume2, VolumeX, ShieldAlert, RotateCcw } from 'lucide-react';

interface LudoMiniGameProps {
  isImageReady: boolean;
  onTimeExpired: () => void;
  targetDurationSeconds?: number;
  promptText?: string;
}

// Token definition for 1v1 Ludo
interface Token {
  id: number;
  player: 'user' | 'honk';
  position: number; // -1 = Yard/Home base, 0 to 23 = Main Track, 24 = Home Center
  stepCount: number; // Total steps moved (max 24)
}

// Play simple retro Web Audio beeps for roll, move, capture
function playWebAudioSound(type: 'roll' | 'move' | 'capture' | 'six' | 'win', soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'roll') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'six') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'capture') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.1);
      osc.frequency.setValueAtTime(659.25, now + 0.2);
      osc.frequency.setValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {
    // AudioContext silently ignored if blocked by browser policy
  }
}

// Track configuration: 20 track cells + 4 home stretch cells per player
const TRACK_LENGTH = 20;
const USER_START_POS = 0;
const HONK_START_POS = 10;
const TOTAL_HOME_STEPS = 20;

export const LudoMiniGame: React.FC<LudoMiniGameProps> = ({
  isImageReady,
  onTimeExpired,
  targetDurationSeconds = 12,
  promptText,
}) => {
  // Authoritative 12-second countdown UX timer
  const [secondsRemaining, setSecondsRemaining] = useState<number>(targetDurationSeconds);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game State
  const [tokens, setTokens] = useState<Token[]>([
    { id: 1, player: 'user', position: -1, stepCount: 0 },
    { id: 2, player: 'user', position: -1, stepCount: 0 },
    { id: 3, player: 'honk', position: -1, stepCount: 0 },
    { id: 4, player: 'honk', position: -1, stepCount: 0 },
  ]);

  const [currentTurn, setCurrentTurn] = useState<'user' | 'honk'>('user');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [gameMessage, setGameMessage] = useState<string>('Roll the dice to start!');
  const [userScore, setUserScore] = useState(0);
  const [honkScore, setHonkScore] = useState(0);
  const [isBonusTurn, setIsBonusTurn] = useState(false);

  const hasExpiredRef = useRef(false);
  const timerIntervalRef = useRef<any>(null);

  // 12-Second UX Countdown Timer Loop
  useEffect(() => {
    hasExpiredRef.current = false;
    setSecondsRemaining(targetDurationSeconds);

    const startTime = Date.now();
    const durationMs = targetDurationSeconds * 1000;

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const leftMs = Math.max(0, durationMs - elapsed);
      const secs = Math.ceil(leftMs / 1000);

      setSecondsRemaining(secs);

      if (leftMs <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        clearInterval(timerIntervalRef.current);
        onTimeExpired();
      }
    }, 100);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [targetDurationSeconds, onTimeExpired]);

  // Dice dots renderer helper
  const renderDiceFace = (val: number | null) => {
    if (!val) {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/30 to-amber-600/40 text-amber-300 font-black shadow-lg">
          <span className="text-xl">🎲</span>
        </div>
      );
    }

    const dotMap: Record<number, number[][]> = {
      1: [[1, 1]],
      2: [[0, 0], [2, 2]],
      3: [[0, 0], [1, 1], [2, 2]],
      4: [[0, 0], [0, 2], [2, 0], [2, 2]],
      5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
      6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
    };

    const dots = dotMap[val] || [];

    return (
      <div className={`relative h-12 w-12 rounded-xl border-2 border-white/30 bg-gradient-to-br ${
        currentTurn === 'user' ? 'from-emerald-500 to-teal-700 text-white shadow-emerald-500/30' : 'from-amber-500 to-orange-600 text-zinc-950 shadow-amber-500/30'
      } p-1.5 shadow-xl transition-all ${isRolling ? 'rotate-180 scale-110' : 'scale-100'}`}>
        <div className="grid grid-cols-3 grid-rows-3 h-full w-full gap-0.5">
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => {
              const hasDot = dots.some(([dr, dc]) => dr === r && dc === c);
              return (
                <div key={`${r}-${c}`} className="flex items-center justify-center">
                  {hasDot && (
                    <div className={`h-2 w-2 rounded-full ${currentTurn === 'user' ? 'bg-white shadow-sm' : 'bg-zinc-950 shadow-sm'}`} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Move token logic
  const moveToken = useCallback((tokenId: number, rolledNumber: number) => {
    setTokens((prev) => {
      const targetToken = prev.find((t) => t.id === tokenId);
      if (!targetToken) return prev;

      let nextPos = targetToken.position;
      let nextStepCount = targetToken.stepCount;

      // 1. Moving out of yard
      if (targetToken.position === -1) {
        if (rolledNumber === 6) {
          nextPos = targetToken.player === 'user' ? USER_START_POS : HONK_START_POS;
          nextStepCount = 1;
          playWebAudioSound('six', soundEnabled);
          setGameMessage(`${targetToken.player === 'user' ? 'You' : 'Honk'} moved a token out of yard!`);
        } else {
          return prev;
        }
      } else {
        // 2. Advancing along track
        nextStepCount += rolledNumber;
        if (nextStepCount > TOTAL_HOME_STEPS) {
          // Cannot overshoot home
          return prev;
        }

        nextPos = (targetToken.position + rolledNumber) % TRACK_LENGTH;
        playWebAudioSound('move', soundEnabled);
      }

      // Check for Capture (if landed on opponent's token, not at start position)
      let captured = false;
      const updated = prev.map((t) => {
        if (t.id === tokenId) {
          return { ...t, position: nextPos, stepCount: nextStepCount };
        }
        if (
          t.player !== targetToken.player &&
          t.position === nextPos &&
          nextPos !== USER_START_POS &&
          nextPos !== HONK_START_POS &&
          nextStepCount < TOTAL_HOME_STEPS
        ) {
          captured = true;
          playWebAudioSound('capture', soundEnabled);
          return { ...t, position: -1, stepCount: 0 };
        }
        return t;
      });

      if (captured) {
        setGameMessage(`💥 ${targetToken.player === 'user' ? 'You captured' : 'Honk captured'} an opponent token!`);
        if (targetToken.player === 'user') setUserScore((s) => s + 50);
        else setHonkScore((s) => s + 50);
      }

      // Check if reached home
      if (nextStepCount >= TOTAL_HOME_STEPS) {
        playWebAudioSound('win', soundEnabled);
        setGameMessage(`🏆 ${targetToken.player === 'user' ? 'Your' : "Honk's"} token reached HOME!`);
        if (targetToken.player === 'user') setUserScore((s) => s + 100);
        else setHonkScore((s) => s + 100);
      }

      return updated;
    });

    // Handle turn transition: roll of 6 gets a bonus turn!
    if (rolledNumber === 6) {
      setIsBonusTurn(true);
      setGameMessage(`${currentTurn === 'user' ? 'You' : 'Honk'} rolled a 6 — Bonus Roll!`);
    } else {
      setIsBonusTurn(false);
      setCurrentTurn((prev) => (prev === 'user' ? 'honk' : 'user'));
    }
    setDiceValue(null);
  }, [currentTurn, soundEnabled]);

  // Roll dice action
  const handleRollDice = () => {
    if (isRolling || diceValue !== null || currentTurn !== 'user') return;

    setIsRolling(true);
    playWebAudioSound('roll', soundEnabled);

    // Roll animation
    setTimeout(() => {
      const rolled = Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolled);
      setIsRolling(false);

      // Check legal moves for user
      const userTokens = tokens.filter((t) => t.player === 'user');
      const movableTokens = userTokens.filter((t) => {
        if (t.position === -1) return rolled === 6;
        return t.stepCount + rolled <= TOTAL_HOME_STEPS;
      });

      if (movableTokens.length === 0) {
        setGameMessage(`No legal moves for ${rolled}. Switching turns...`);
        setTimeout(() => {
          setDiceValue(null);
          setCurrentTurn('honk');
        }, 800);
      } else if (movableTokens.length === 1) {
        // Automatic move if only 1 token can move
        setTimeout(() => {
          moveToken(movableTokens[0].id, rolled);
        }, 400);
      } else {
        setGameMessage(`Rolled a ${rolled}! Tap one of your highlighted tokens to move.`);
      }
    }, 300);
  };

  // Honk AI Turn Execution
  useEffect(() => {
    if (currentTurn !== 'honk' || isRolling || diceValue !== null) return;

    const honkAiTimer = setTimeout(() => {
      setIsRolling(true);
      playWebAudioSound('roll', soundEnabled);

      setTimeout(() => {
        const rolled = Math.floor(Math.random() * 6) + 1;
        setDiceValue(rolled);
        setIsRolling(false);

        const honkTokens = tokens.filter((t) => t.player === 'honk');
        const movable = honkTokens.filter((t) => {
          if (t.position === -1) return rolled === 6;
          return t.stepCount + rolled <= TOTAL_HOME_STEPS;
        });

        if (movable.length === 0) {
          setGameMessage(`Honk rolled a ${rolled} (No legal moves).`);
          setTimeout(() => {
            setDiceValue(null);
            setCurrentTurn('user');
          }, 800);
          return;
        }

        // Smart move strategy: 1) Capture if possible, 2) Move out of yard on 6, 3) Advance closest to home
        let chosenToken = movable[0];

        // 1. Check capture
        const captureToken = movable.find((t) => {
          if (t.position === -1) return false;
          const targetPos = (t.position + rolled) % TRACK_LENGTH;
          return tokens.some((u) => u.player === 'user' && u.position === targetPos);
        });

        if (captureToken) {
          chosenToken = captureToken;
        } else {
          // 2. Move out of yard on 6
          const yardToken = movable.find((t) => t.position === -1);
          if (yardToken && rolled === 6) {
            chosenToken = yardToken;
          } else {
            // 3. Furthest advanced token
            chosenToken = movable.sort((a, b) => b.stepCount - a.stepCount)[0];
          }
        }

        setTimeout(() => {
          moveToken(chosenToken.id, rolled);
        }, 500);
      }, 350);
    }, 550);

    return () => clearTimeout(honkAiTimer);
  }, [currentTurn, isRolling, diceValue, tokens, moveToken, soundEnabled]);

  const userTokensInYard = tokens.filter((t) => t.player === 'user' && t.position === -1);
  const honkTokensInYard = tokens.filter((t) => t.player === 'honk' && t.position === -1);
  const userTokensInHome = tokens.filter((t) => t.player === 'user' && t.stepCount >= TOTAL_HOME_STEPS);
  const honkTokensInHome = tokens.filter((t) => t.player === 'honk' && t.stepCount >= TOTAL_HOME_STEPS);

  return (
    <div className="flex flex-col w-full rounded-2xl border border-amber-500/40 bg-zinc-950 p-3 sm:p-4 text-zinc-100 shadow-2xl relative overflow-hidden">
      {/* 1. TOP HEADER: 12-SECOND COUNTDOWN & STATUS */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-zinc-950 font-black shadow-md shadow-amber-500/20 animate-pulse">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-300">
                GENERATING IMAGE
              </span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                1V1 LUDO: YOU VS HONK
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-xs sm:max-w-md">
              {promptText ? `“${promptText}”` : 'Google Image API rendering in background...'}
            </p>
          </div>
        </div>

        {/* 12s Exact Countdown Badge */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            title={soundEnabled ? 'Mute Game Sound' : 'Enable Game Sound'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 shadow-inner">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest hidden sm:inline">
              REVEAL IN:
            </span>
            <span className="font-mono text-base sm:text-lg font-black text-amber-300 min-w-[28px] text-center">
              {secondsRemaining}s
            </span>
          </div>
        </div>
      </div>

      {/* 2. PROGRESS BAR */}
      <div className="w-full bg-zinc-900 h-1.5 rounded-full my-2.5 overflow-hidden border border-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-100 ease-linear"
          style={{ width: `${Math.max(0, 100 - (secondsRemaining / targetDurationSeconds) * 100)}%` }}
        />
      </div>

      {/* Early Image Status Notification */}
      {isImageReady && secondsRemaining > 0 && (
        <div className="mb-2.5 flex items-center justify-between rounded-xl bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold">✓ Google Image is ready &amp; cached!</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">
            Revealing when timer reaches 0s ({secondsRemaining}s remaining)
          </span>
        </div>
      )}

      {/* 3. LUDO MINI-BOARD & MATCH ARENA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center py-1">
        {/* Left Player: USER (Green/Cyan) */}
        <div className={`rounded-xl border p-2.5 transition-all ${
          currentTurn === 'user'
            ? 'border-emerald-500/60 bg-emerald-950/30 shadow-lg shadow-emerald-500/10'
            : 'border-zinc-800 bg-zinc-900/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-emerald-400 shadow-sm ring-2 ring-emerald-400/40" />
              <span className="text-xs font-bold text-zinc-100">You (Player)</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400">Score: {userScore}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Yard: {userTokensInYard.length}</span>
            <span>Home: {userTokensInHome.length}/2</span>
          </div>

          {/* User tokens in yard click target */}
          <div className="mt-2 flex items-center gap-1.5">
            {tokens
              .filter((t) => t.player === 'user')
              .map((t) => {
                const canMoveThis =
                  currentTurn === 'user' &&
                  diceValue !== null &&
                  ((t.position === -1 && diceValue === 6) ||
                    (t.position !== -1 && t.stepCount + diceValue <= TOTAL_HOME_STEPS));

                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!canMoveThis}
                    onClick={() => diceValue && moveToken(t.id, diceValue)}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                      canMoveThis
                        ? 'bg-emerald-500 text-zinc-950 animate-bounce ring-2 ring-white shadow-md'
                        : t.position === -1
                        ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60'
                    }`}
                  >
                    <span>T{t.id}</span>
                    <span>{t.position === -1 ? 'Yard' : t.stepCount >= TOTAL_HOME_STEPS ? '⭐' : `Pos ${t.position}`}</span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Center: Interactive Dice & Board Track */}
        <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-800 bg-zinc-900/80 space-y-2">
          {/* Turn Banner */}
          <div className="text-center">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${
              currentTurn === 'user' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {currentTurn === 'user' ? '👉 YOUR TURN' : "🤖 HONK'S TURN"}
            </span>
            <p className="text-[11px] text-zinc-400 mt-0.5 h-4 overflow-hidden text-ellipsis">
              {gameMessage}
            </p>
          </div>

          {/* Dice & Roll Action */}
          <div className="flex items-center gap-3">
            <div className="cursor-pointer" onClick={handleRollDice}>
              {renderDiceFace(diceValue)}
            </div>

            {currentTurn === 'user' && diceValue === null && (
              <button
                type="button"
                onClick={handleRollDice}
                disabled={isRolling}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
              >
                <Zap className="h-4 w-4 fill-zinc-950" />
                <span>ROLL DICE</span>
              </button>
            )}

            {currentTurn === 'honk' && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold animate-pulse">
                <span>Honk thinking...</span>
              </div>
            )}
          </div>

          {/* Mini Track Grid Visualization */}
          <div className="w-full pt-1">
            <div className="grid grid-cols-10 gap-1 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800">
              {Array.from({ length: TRACK_LENGTH }).map((_, idx) => {
                const userTokenHere = tokens.find((t) => t.player === 'user' && t.position === idx);
                const honkTokenHere = tokens.find((t) => t.player === 'honk' && t.position === idx);

                return (
                  <div
                    key={idx}
                    className={`h-5 rounded flex items-center justify-center text-[9px] font-mono font-bold transition-all ${
                      idx === USER_START_POS
                        ? 'border border-emerald-500/50 bg-emerald-950/40 text-emerald-400'
                        : idx === HONK_START_POS
                        ? 'border border-amber-500/50 bg-amber-950/40 text-amber-400'
                        : 'bg-zinc-900 text-zinc-600'
                    }`}
                    title={`Square ${idx}`}
                  >
                    {userTokenHere ? (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 text-[8px] font-black shadow">
                        U
                      </span>
                    ) : honkTokenHere ? (
                      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-zinc-950 text-[8px] font-black shadow">
                        H
                      </span>
                    ) : (
                      idx
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Player: HONK AI (Amber/Gold Goose) */}
        <div className={`rounded-xl border p-2.5 transition-all ${
          currentTurn === 'honk'
            ? 'border-amber-500/60 bg-amber-950/30 shadow-lg shadow-amber-500/10'
            : 'border-zinc-800 bg-zinc-900/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-400/40" />
              <span className="text-xs font-bold text-zinc-100">Honk AI (Opponent)</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-amber-400">Score: {honkScore}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Yard: {honkTokensInYard.length}</span>
            <span>Home: {honkTokensInHome.length}/2</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {tokens
              .filter((t) => t.player === 'honk')
              .map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${
                    t.position === -1
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'
                  }`}
                >
                  <span>T{t.id}</span>
                  <span>{t.position === -1 ? 'Yard' : t.stepCount >= TOTAL_HOME_STEPS ? '⭐' : `Pos ${t.position}`}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 text-center text-[10px] text-zinc-400 flex items-center justify-center gap-2">
        <span>🎲 Roll a 6 to exit yard and get a bonus roll</span>
        <span>•</span>
        <span>💥 Land on Honk to capture</span>
      </div>
    </div>
  );
};
