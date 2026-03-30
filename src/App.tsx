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
  { id: 'lemon', char: '🍋', value: 3, weight: 4 },
  { id: 'orange', char: '🍊', value: 5, weight: 3 },
  { id: 'plum', char: '🍇', value: 10, weight: 2 },
  { id: 'bell', char: '🔔', value: 20, weight: 1.5 },
  { id: 'bar', char: '🎰', value: 50, weight: 1 },
  { id: 'seven', char: '7️⃣', value: 100, weight: 0.5 },
];

const REEL_COUNT = 3;
const ROWS_VISIBLE = 3;
const SYMBOLS_PER_REEL = 20;
const SPIN_DURATION = 2; // seconds

const PAYLINES = [
  [0, 0, 0], // Top row
  [1, 1, 1], // Middle row
  [2, 2, 2], // Bottom row
  [0, 1, 2], // Diagonal down
  [2, 1, 0], // Diagonal up
];

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
  const [bet, setBet] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<SymbolType[][]>([[], [], []]);
  const [reelOffsets, setReelOffsets] = useState([0, 0, 0]);
  const [winAmount, setWinAmount] = useState(0);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  // Initialize reels
  useEffect(() => {
    setReels([generateReel(), generateReel(), generateReel()]);
  }, []);

  const spin = useCallback(() => {
    if (isSpinning || balance < bet) return;

    setBalance(prev => prev - bet);
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
      checkWins(newOffsets);
    }, SPIN_DURATION * 1000 + 500); // Add a small buffer
  }, [isSpinning, balance, bet, reelOffsets]);

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

    let totalWin = 0;
    const wins: number[] = [];

    PAYLINES.forEach((line, index) => {
      const s1 = visibleGrid[0][line[0]];
      const s2 = visibleGrid[1][line[1]];
      const s3 = visibleGrid[2][line[2]];

      if (s1.id === s2.id && s2.id === s3.id) {
        const win = s1.value * bet;
        totalWin += win;
        wins.push(index);
      }
    });

    if (totalWin > 0) {
      setWinAmount(totalWin);
      setBalance(prev => prev + totalWin);
      setWinningLines(wins);
    }
  };

  const handleBetChange = (amount: number) => {
    if (isSpinning) return;
    setBet(Math.max(10, Math.min(balance, amount)));
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

      {/* Main Slot Machine Area */}
      <div className="relative bg-[#1e293b] p-6 rounded-3xl border-4 border-[#334155] shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md">
        {/* Payline Indicators (Left) */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex flex-col gap-12 text-[10px] font-bold text-slate-500">
          <span>L1</span>
          <span>L2</span>
          <span>L3</span>
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
                {winningLines.map(lineIdx => (
                  <div key={lineIdx} className="absolute inset-0">
                    {/* Simplified line visualization */}
                    {lineIdx === 0 && <div className="absolute top-[16.6%] left-0 w-full h-1 bg-yellow-400 shadow-[0_0_10px_#fbbf24] animate-pulse" />}
                    {lineIdx === 1 && <div className="absolute top-[50%] left-0 w-full h-1 bg-yellow-400 shadow-[0_0_10px_#fbbf24] animate-pulse" />}
                    {lineIdx === 2 && <div className="absolute top-[83.3%] left-0 w-full h-1 bg-yellow-400 shadow-[0_0_10px_#fbbf24] animate-pulse" />}
                    {lineIdx === 3 && <div className="absolute top-0 left-0 w-full h-full border-t-4 border-yellow-400 rotate-[33deg] origin-top-left scale-x-125 opacity-50" />}
                    {lineIdx === 4 && <div className="absolute top-0 left-0 w-full h-full border-b-4 border-yellow-400 -rotate-[33deg] origin-bottom-left scale-x-125 opacity-50" />}
                  </div>
                ))}
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
                  duration: SPIN_DURATION,
                  ease: [0.45, 0.05, 0.55, 0.95],
                  delay: i * 0.2,
                }}
                className="flex flex-col"
              >
                {/* We repeat the reel multiple times to handle the infinite scroll feel */}
                {Array.from({ length: 20 }).map((_, repeatIdx) => (
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
                onClick={() => handleBetChange(bet - 10)}
                disabled={isSpinning || bet <= 10}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-mono font-bold w-12 text-center">${bet}</span>
              <button 
                onClick={() => handleBetChange(bet + 10)}
                disabled={isSpinning || bet >= balance}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#334155] hover:bg-[#475569] disabled:opacity-50 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <button
          onClick={() => setBalance(1000)}
          disabled={isSpinning || balance > 0}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition-all font-bold uppercase tracking-widest text-xs"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          onClick={spin}
          disabled={isSpinning || balance < bet}
          className={`
            relative overflow-hidden flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-lg transition-all
            ${isSpinning || balance < bet 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
              : 'bg-yellow-500 text-[#0f172a] hover:bg-yellow-400 active:scale-95 shadow-[0_10px_20px_rgba(234,179,8,0.3)]'}
          `}
        >
          {isSpinning ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <RotateCcw className="w-6 h-6" />
            </motion.div>
          ) : (
            <>
              <Play className="w-6 h-6 fill-current" />
              Spin
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
