/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useAnimation, AnimatePresence } from 'motion/react';
import { Coins, Play, RotateCcw, Trophy, Info, Volume2, VolumeX } from 'lucide-react';

// --- Constants & Types ---

const SYMBOLS = [
  { id: 'cherry', char: '🍒', value: 2, weight: 5 },
  { id: 'watermelon', char: '🍉', value: 3, weight: 4 },
  { id: 'kiwi', char: '🥝', value: 5, weight: 3 },
  { id: 'plum', char: '🍇', value: 10, weight: 2 },
  { id: 'bell', char: '🔔', value: 20, weight: 1.5 },
  { id: 'bar', char: '🎰', value: 50, weight: 1 },
  { id: 'seven', char: '7️⃣', value: 100, weight: 0.5 },
];

const REEL_COUNT = 3;
const ROWS_VISIBLE = 3;
const SYMBOLS_PER_REEL = 20;
const SPIN_DURATION = 2; // seconds

const BET_STEPS = [1, 2, 5, 10, 20];

const PAYLINES = [
  [0, 0, 0], // Top row
  [1, 1, 1], // Middle row
  [2, 2, 2], // Bottom row
  [0, 1, 2], // Diagonal down
  [2, 1, 0], // Diagonal up
];

const THEORETICAL_RTP = (() => {
  const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  const expectedReturnPerPayline = SYMBOLS.reduce((sum, s) => {
    const prob = s.weight / totalWeight;
    return sum + (Math.pow(prob, 3) * s.value);
  }, 0);
  return expectedReturnPerPayline * PAYLINES.length * 100;
})();

type SymbolType = typeof SYMBOLS[0];

// --- Utilities ---

const getRandomSymbol = () => {
  const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const symbol of SYMBOLS) {
    if (random < symbol.weight) return symbol;
    random -= symbol.weight;
  }
  return SYMBOLS[0];
};

const generateReel = () => {
  return Array.from({ length: SYMBOLS_PER_REEL }, () => getRandomSymbol());
};

// --- Components ---

export default function App() {
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(BET_STEPS[0]);
  const [totalBet, setTotalBet] = useState(0);
  const [totalWin, setTotalWin] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isAutoSpin, setIsAutoSpin] = useState(false);
  const [reels, setReels] = useState<SymbolType[][]>([[], [], []]);
  const [reelOffsets, setReelOffsets] = useState([0, 0, 0]);
  const [winAmount, setWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // Initialize reels
  useEffect(() => {
    setReels([generateReel(), generateReel(), generateReel()]);
  }, []);

  const spin = useCallback(() => {
    if (isSpinning || balance < bet) return;

    setBalance(prev => prev - bet);
    setTotalBet(prev => prev + bet);
    setIsSpinning(true);
    setWinAmount(0);
    setWinningLines([]);

    // Generate new random offsets for each reel
    // We want to move at least a few full rotations
    const newOffsets = reelOffsets.map(offset => {
      const minRotation = SYMBOLS_PER_REEL * 2;
      const extra = Math.floor(Math.random() * SYMBOLS_PER_REEL);
      return offset + minRotation + extra;
    });

    setReelOffsets(newOffsets);

    // Wait for animation to finish
    setTimeout(() => {
      setIsSpinning(false);
      // Seamlessly reset offsets to a small range (0-19) to prevent boundary issues
      const normalizedOffsets = newOffsets.map(o => o % SYMBOLS_PER_REEL);
      setReelOffsets(normalizedOffsets);
      checkWins(newOffsets);
    }, SPIN_DURATION * 1000 + 100); 
  }, [isSpinning, balance, bet, reelOffsets]);

  // Auto Spin logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoSpin && !isSpinning && balance >= bet) {
      timer = setTimeout(() => {
        spin();
      }, 500); // 0.5 second delay between auto spins
    } else if (isAutoSpin && balance < bet) {
      setIsAutoSpin(false);
    }
    return () => clearTimeout(timer);
  }, [isAutoSpin, isSpinning, balance, bet, spin]);

  const checkWins = (offsets: number[]) => {
    const visibleGrid: SymbolType[][] = [];
    
    // Determine which symbols are visible at the stop positions
    for (let i = 0; i < REEL_COUNT; i++) {
      const stopIndex = offsets[i] % SYMBOLS_PER_REEL;
      const reel = reels[i];
      const column = [
        reel[(stopIndex) % SYMBOLS_PER_REEL],
        reel[(stopIndex + 1) % SYMBOLS_PER_REEL],
        reel[(stopIndex + 2) % SYMBOLS_PER_REEL],
      ];
      visibleGrid.push(column);
    }

    let totalWinAmount = 0;
    const wins: number[] = [];

    PAYLINES.forEach((line, index) => {
      const s1 = visibleGrid[0][line[0]];
      const s2 = visibleGrid[1][line[1]];
      const s3 = visibleGrid[2][line[2]];

      if (s1.id === s2.id && s2.id === s3.id) {
        const win = s1.value * bet;
        totalWinAmount += win;
        wins.push(index);
      }
    });

    setWinningLines(wins);
    if (totalWinAmount > 0) {
      setWinAmount(totalWinAmount);
      setBalance(prev => prev + totalWinAmount);
      setTotalWin(prev => prev + totalWinAmount);
    }
  };

  const handleBetStep = (direction: 'up' | 'down') => {
    if (isSpinning || isAutoSpin) return;
    const currentIndex = BET_STEPS.indexOf(bet);
    if (direction === 'up' && currentIndex < BET_STEPS.length - 1) {
      const nextBet = BET_STEPS[currentIndex + 1];
      if (nextBet <= balance) setBet(nextBet);
    } else if (direction === 'down' && currentIndex > 0) {
      setBet(BET_STEPS[currentIndex - 1]);
    }
  };

  const handleSpinClick = () => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isAutoSpin) {
      setIsAutoSpin(false);
      return;
    }
    spin();
  };

  const handlePointerDown = () => {
    if (isAutoSpin) return;
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsAutoSpin(true);
      spin();
    }, 800); // 800ms for long press
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-yellow-500/30 flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            <Trophy className="w-6 h-6 text-[#0f172a]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase italic">Fruit Slots</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Combined Stats Bar */}
      <div className="w-full max-w-md mb-6 flex flex-col gap-3 bg-[#1e293b]/60 p-4 rounded-2xl border border-[#334155] backdrop-blur-md shadow-lg">
        <div className="flex justify-between items-center">
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">總押注 (Total Bet)</span>
          <span className="text-sm font-mono font-bold text-slate-200">${totalBet.toLocaleString()}</span>
        </div>
        <div className="h-px bg-slate-700/30 w-full" />
        <div className="flex justify-between items-center">
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">目前 RTP (Actual)</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {totalBet > 0 ? ((totalWin / totalBet) * 100).toFixed(2) : "0.00"}%
          </span>
        </div>
        <div className="h-px bg-slate-700/30 w-full" />
        <div className="flex justify-between items-center">
          <span className="text-[11px] uppercase tracking-widest text-indigo-400 font-bold">設計理論 RTP (Theoretical)</span>
          <span className="text-sm font-mono font-bold text-indigo-300">
            {THEORETICAL_RTP.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main Slot Machine Area */}
      <div className="relative bg-[#1e293b] p-6 rounded-3xl border-4 border-[#334155] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md">
        {/* Payline Indicators (Left) */}
        <div className="absolute -left-10 top-[36px] h-[300px] flex flex-col text-[10px] font-black text-slate-500">
          <div className="h-[100px] flex items-center justify-center">L1</div>
          <div className="h-[100px] flex items-center justify-center">L2</div>
          <div className="h-[100px] flex items-center justify-center">L3</div>
        </div>

        {/* Reels Container */}
        <div className="grid grid-cols-3 gap-3 bg-[#0f172a] p-3 rounded-xl overflow-hidden relative border-2 border-[#334155]">
          {/* Glass Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
          
          {/* Winning Line Overlay */}
          <AnimatePresence>
            {winningLines.length > 0 && !isSpinning && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 pointer-events-none"
              >
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {winningLines.map(lineIdx => {
                    const line = PAYLINES[lineIdx];
                    // Calculate points for the SVG polyline
                    // Using percentages based on grid layout with gaps
                    const xCenters = [18.7, 50, 81.3];
                    const yCenters = [19.1, 50, 80.9];
                    
                    const points = line.map((rowIdx, reelIdx) => {
                      const x = xCenters[reelIdx];
                      const y = yCenters[rowIdx];
                      return `${x} ${y}`;
                    }).join(', ');

                    return (
                      <motion.polyline
                        key={lineIdx}
                        points={points}
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="drop-shadow-[0_0_10px_#fbbf24]"
                        style={{ filter: 'drop-shadow(0 0 10px #fbbf24)' }}
                      />
                    );
                  })}
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {reels.map((reel, i) => (
            <div key={i} className="relative h-[300px] overflow-hidden bg-[#1e293b] rounded-lg">
              <motion.div
                animate={{
                  y: -reelOffsets[i] * 100, // Each symbol is 100px high
                }}
                transition={{
                  duration: isSpinning ? SPIN_DURATION : 0,
                  ease: [0.45, 0.05, 0.55, 0.95],
                  delay: isSpinning ? i * 0.1 : 0,
                }}
                className="flex flex-col"
              >
                {/* We repeat the reel multiple times to handle the scroll feel. 
                    3 times is enough if we reset offsets after each spin. */}
                {Array.from({ length: 10 }).map((_, repeatIdx) => (
                  <React.Fragment key={repeatIdx}>
                    {reel.map((symbol, symIdx) => (
                      <div 
                        key={`${repeatIdx}-${symIdx}`}
                        className="h-[100px] flex items-center justify-center text-5xl select-none"
                      >
                        {symbol.char}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </motion.div>
            </div>
          ))}
        </div>

        {/* Win Display */}
        <div className="mt-6 h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {winAmount > 0 && !isSpinning ? (
              <motion.div
                key="win"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="text-3xl font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)] flex items-center gap-2"
              >
                WIN: +${winAmount}
              </motion.div>
            ) : (
              <motion.div
                key="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 font-medium uppercase tracking-widest text-sm"
              >
                {isSpinning ? "Spinning..." : "Good Luck!"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-md mt-8 grid grid-cols-2 gap-4">
        {/* Balance & Bet */}
        <div className="col-span-2 flex justify-between items-end bg-[#1e293b] p-4 rounded-2xl border border-[#334155]">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Balance</span>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold text-emerald-400">
              <Coins className="w-5 h-5" />
              ${balance.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Bet Amount</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => handleBetStep('down')}
                disabled={isSpinning || bet === BET_STEPS[0]}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-mono font-bold w-12 text-center">${bet}</span>
              <button 
                onClick={() => handleBetStep('up')}
                disabled={isSpinning || bet === BET_STEPS[BET_STEPS.length - 1] || BET_STEPS[BET_STEPS.indexOf(bet) + 1] > balance}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => {
            setBalance(1000);
            setTotalBet(0);
            setTotalWin(0);
          }}
          disabled={isSpinning || balance > 0}
          className="flex items-center justify-center gap-2 h-20 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition-all font-bold uppercase tracking-widest text-xs"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={handleSpinClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          disabled={(isSpinning && !isAutoSpin) || (balance < bet && !isAutoSpin)}
          className={`
            relative overflow-hidden flex flex-col items-center justify-center gap-1 h-20 rounded-2xl font-black uppercase tracking-widest transition-all
            ${(isSpinning && !isAutoSpin) || (balance < bet && !isAutoSpin)
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
              : isAutoSpin 
                ? 'bg-red-500 text-white hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-yellow-500 text-[#0f172a] hover:bg-yellow-400 shadow-[0_10px_20px_rgba(234,179,8,0.3)]'}
          `}
        >
          {isSpinning && !isAutoSpin ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <RotateCcw className="w-6 h-6" />
              </motion.div>
              <span className="text-[10px]">SPINNING</span>
            </>
          ) : (
            <>
              {isAutoSpin ? (
                <>
                  <RotateCcw className="w-6 h-6 animate-spin" />
                  <span className="text-[10px]">STOP AUTO</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6 fill-current" />
                  <span className="text-lg">Spin</span>
                </>
              )}
            </>
          )}
        </button>
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowInfo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1e293b] p-8 rounded-3xl max-w-sm w-full border border-[#334155] shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Info className="w-6 h-6 text-yellow-500" />
                遊戲說明
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                  <span className="text-slate-400">賠付線</span>
                  <span className="font-bold">5 條 (橫向 3, 對角 2)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {SYMBOLS.sort((a, b) => b.value - a.value).map(s => (
                    <div key={s.id} className="flex items-center gap-3 bg-[#0f172a] p-2 rounded-xl">
                      <span className="text-2xl">{s.char}</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-500">x3</span>
                        <span className="font-bold text-yellow-500">x{s.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="w-full mt-8 py-3 bg-yellow-500 text-[#0f172a] font-bold rounded-xl hover:bg-yellow-400 transition-colors"
              >
                知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-500/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
