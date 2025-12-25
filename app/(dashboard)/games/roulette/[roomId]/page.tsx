"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { HistoryDisplay } from "../components/HistoryDisplay"
// --- CONFIGURATION ---
const socket: Socket = io("http://localhost:3001", { autoConnect: false });

// European Roulette Order (The correct sequence on the wheel)
const WHEEL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const BET_AMOUNTS = [10, 50, 100, 250, 500];

// Helper to determine color
const getNumberColor = (num: number) => {
  if (num === 0) return "green";
  const redNums = [
    1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
  ];
  return redNums.includes(num) ? "red" : "black";
};

// --- TYPES ---
type Bet = {
  userId: string;
  userName?: string;
  amount: number;
  betType: "RED" | "BLACK" | "NUMBER";
  betValue: string | null;
};

type GameState = {
  status: "BETTING" | "ROLLING";
  timeLeft: number;
  history: number[];
  bets: Bet[];
};

export default function RouletteRoom() {
  const params = useParams();
  const roomId = params?.roomId || "standard";
  const { data: session } = useSession();

  // State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timer, setTimer] = useState(30);
  const [logs, setLogs] = useState<string[]>([]);
  const [history,setHistory] = useState<number[]>([])
  // Betting State
  const [currentAmount, setCurrentAmount] = useState<number>(BET_AMOUNTS[0]);
  const [currentBetType, setCurrentBetType] = useState<
    "RED" | "BLACK" | "NUMBER"
  >("RED");
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);

  // Animation State
  const [wheelRotation, setWheelRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const currentRotationRef = useRef(0);

  useEffect(() => {
    socket.connect();
    // Dodajemy prefiks gry do nazwy pokoju
    socket.emit("join_room", `roulette-${roomId}`);

    const handleInitState = (state: GameState) => {
      setGameState(state);
      setTimer(state.timeLeft);
      setHistory(state.history || []);

    };

    const handleTimerUpdate = (time: number) => setTimer(time);

    const handleNewRound = () => {
      setGameState((prev) =>
        prev ? { ...prev, status: "BETTING", bets: [] } : null
      );
      setLastResult(null);
      setIsSpinning(false);
      // Ref is already synced in handleRoundResult after animation completes
      // No need to sync again here
    };

    const handleRoundResult = (result: number) => {
      const newRotation = handleSpin(result);
      setGameState((prev) => (prev ? { ...prev, status: "ROLLING" } : null));

      setTimeout(() => {
        setLastResult(result);
        setLogs((prev) => [`Winning Number: ${result}`, ...prev]);
        setIsSpinning(false);
         setHistory(prev => [...prev, result].slice(-10));
        // Sync ref after animation completes (use the calculated rotation)
        currentRotationRef.current = newRotation;
      }, 3000);
    };

    const handleNewBet = (bet: Bet) => {
      setGameState((prev) =>
        prev ? { ...prev, bets: [...prev.bets, bet] } : null
      );
      const name = bet.userName || "Player";
      setLogs((prev) => [
        `${name}: $${bet.amount} on ${bet.betType} ${bet.betValue || ""}`,
        ...prev,
      ]);
    };

    socket.on("init_state", handleInitState);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("new_round_started", handleNewRound);
    socket.on("round_result", handleRoundResult);
    socket.on("new_bet", handleNewBet);

    return () => {
      socket.off("init_state", handleInitState);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("new_round_started", handleNewRound);
      socket.off("round_result", handleRoundResult);
      socket.off("new_bet", handleNewBet);
      socket.disconnect();
    };
  }, [roomId]);

  // --- ANIMATION LOGIC ---
  const handleSpin = (winningNumber: number): number => {
    setIsSpinning(true);

    // 1. Find index of the winning number in our wheel array
    const winningIndex = WHEEL_NUMBERS.indexOf(winningNumber);
    if (winningIndex === -1) {
      console.error("Invalid winning number:", winningNumber);
      setIsSpinning(false);
      return currentRotationRef.current;
    }

    // 2. Calculate degrees per segment (360 / 37)
    const segmentAngle = 360 / 37;

    // 3. Calculate target rotation
    // Each number is positioned at: index * segmentAngle degrees from top (clockwise)
    // When we rotate the wheel clockwise, all numbers move clockwise by the same amount
    // To align a number at position X to the top (0deg), we need to rotate by (360 - X) degrees

    // Get current rotation from ref
    const currentRotation = currentRotationRef.current;

    // Normalize current rotation to 0-360 range
    const currentNormalized = ((currentRotation % 360) + 360) % 360;

    // The winning number's initial position (before any rotation)
    const winningNumberPosition = winningIndex * segmentAngle;

    // After current rotation, the winning number is at:
    const currentWinningPosition =
      (winningNumberPosition + currentNormalized) % 360;

    // To move it to top (0deg), we need to rotate by:
    const offsetToTop = (360 - currentWinningPosition) % 360;

    // Add multiple full spins (5 spins = 5 * 360 degrees) for visual effect
    const randomSpins = 5 * 360;

    // Calculate new rotation: current + spins + offset to align winning number
    const newRotation = currentRotation + randomSpins + offsetToTop;

    // Update ref immediately for next calculation
    currentRotationRef.current = newRotation;

    setWheelRotation(newRotation);
    return newRotation;
  };

  const handlePlaceBet = () => {
    if (!gameState || gameState.status !== "BETTING") return;

    setIsPlacing(true);
    const payload = {
      room: `roulette-${roomId}`, // Dodajemy prefiks gry
      userId: session?.user?.id || "guest",
      userName:
        session?.user?.name || session?.user?.email?.split("@")[0] || "Player",
      amount: currentAmount,
      betType: currentBetType,
      betValue: currentBetType === "NUMBER" ? String(currentNumber) : null,
    };

    socket.emit("place_bet", payload);
    setTimeout(() => setIsPlacing(false), 300);
  };

  // --- RENDER HELPERS ---
  const canBet = gameState?.status === "BETTING";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full grid lg:grid-cols-[1.2fr,1fr] gap-8 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* LEFT: THE WHEEL */}
        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/50">
          {/* Header Info */}
          <div className="absolute top-6 left-6 z-10">
            <h1 className="text-2xl font-bold text-emerald-400 tracking-wider">
              ROULETTE
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              ROOM: {roomId}
            </p>
          </div>

          <div className="absolute top-6 right-6 z-10 flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              Time Left
            </span>
            <div
              className={`text-3xl font-mono font-bold ${
                timer < 5 ? "text-red-500 animate-pulse" : "text-emerald-400"
              }`}
            >
              {gameState?.status === "ROLLING" ? "---" : `${timer}s`}
            </div>
          </div>

          {/* WHEEL CONTAINER */}
          <div className="relative mt-12 w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
            {/* Pointer (Triangle) */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-yellow-400 drop-shadow-lg" />

            {/* Rotating Wheel */}
            <div
              className="w-full h-full rounded-full border-[12px] border-slate-800 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative transition-transform ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              style={{
                transform: `rotate(${wheelRotation}deg)`,
                transitionDuration: isSpinning ? "3000ms" : "0ms",
              }}
            >
              {WHEEL_NUMBERS.map((num, i) => {
                const angle = (360 / 37) * i;
                const color = getNumberColor(num);
                return (
                  <div
                    key={num}
                    className="absolute top-0 left-1/2 h-1/2 w-[28px] md:w-[34px] -ml-[14px] md:-ml-[17px] origin-bottom pt-2 text-center"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    {/* The Slice Background */}
                    <div
                      className={`absolute inset-0 -z-10 h-[50%] ${
                        color === "green"
                          ? "bg-emerald-600"
                          : color === "red"
                          ? "bg-red-600"
                          : "bg-slate-800"
                      }`}
                      style={{
                        clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                      }}
                    />
                    {/* The Number */}
                    <span className="text-xs md:text-sm font-bold text-white drop-shadow-md block mt-1">
                      {num}
                    </span>
                  </div>
                );
              })}

              {/* Inner Circle / Hub */}
              <div className="absolute inset-0 m-auto w-1/3 h-1/3 rounded-full bg-slate-950 border-4 border-slate-700 flex items-center justify-center shadow-inner z-10">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          {/* Result Display */}
          <div className="mt-8 h-12 flex items-center justify-center">
            {lastResult !== null && !isSpinning ? (
              <div className="flex flex-col items-center animate-bounce">
                <span className="text-xs text-slate-400 uppercase">Result</span>
                <span
                  className={`text-4xl font-bold ${
                    getNumberColor(lastResult) === "red"
                      ? "text-red-500"
                      : getNumberColor(lastResult) === "black"
                      ? "text-slate-200"
                      : "text-emerald-500"
                  }`}
                >
                  {lastResult}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-600 uppercase tracking-widest">
                {isSpinning ? "Spinning..." : "Place Your Bets"}
              </span>
            )}
          </div>
        </div>
<div className="grid grid-cols-1 gap-6 p-4">
  {/* Your existing wheel and controls */}
  
  {/* Add this new history display */}
  <HistoryDisplay history={history} />
</div>

        {/* RIGHT: BETTING BOARD */}
        <div className="p-6 md:p-8 flex flex-col bg-slate-900">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Select Chip Amount
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {BET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCurrentAmount(amt)}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center font-bold text-xs md:text-sm shadow-lg transition-all ${
                      currentAmount === amt
                        ? "border-yellow-400 bg-yellow-500/20 text-yellow-400 scale-110"
                        : "border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-400 hover:text-white"
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                    Custom Amount:
                  </h2>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(parseInt(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-600 rounded p-2 text-center text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Place Bet
            </h2>

            {/* Color Bets */}
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={!canBet}
                onClick={() => {
                  setCurrentBetType("RED");
                  setCurrentNumber(null);
                }}
                className={`py-4 rounded-xl border-2 transition-all font-bold uppercase tracking-widest ${
                  currentBetType === "RED"
                    ? "bg-red-600/20 border-red-500 text-red-500"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-red-900/20 hover:border-red-900/50"
                }`}
              >
                Red
              </button>
              <button
                disabled={!canBet}
                onClick={() => {
                  setCurrentBetType("BLACK");
                  setCurrentNumber(null);
                }}
                className={`py-4 rounded-xl border-2 transition-all font-bold uppercase tracking-widest ${
                  currentBetType === "BLACK"
                    ? "bg-slate-700 border-slate-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Black
              </button>
            </div>

            {/* Number Input */}
            <div
              className={`transition-all duration-300 ${
                currentBetType === "NUMBER" ? "opacity-100" : "opacity-60"
              }`}
            >
              <div
                onClick={() => setCurrentBetType("NUMBER")}
                className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between ${
                  currentBetType === "NUMBER"
                    ? "border-emerald-500 bg-emerald-900/10"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <span className="text-sm font-bold text-slate-300">
                  Specific Number
                </span>
                <input
                  type="number"
                  min={0}
                  max={36}
                  disabled={!canBet}
                  value={currentNumber ?? ""}
                  onChange={(e) => {
                    setCurrentBetType("NUMBER");
                    setCurrentNumber(
                      e.target.value === "" ? null : parseInt(e.target.value)
                    );
                  }}
                  placeholder="0-36"
                  className="w-20 bg-slate-950 border border-slate-600 rounded p-2 text-center text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handlePlaceBet}
              disabled={
                !canBet ||
                isPlacing ||
                (currentBetType === "NUMBER" && currentNumber === null)
              }
              className={`w-full py-4 mt-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-xl transition-all ${
                !canBet
                  ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-500 text-slate-900 hover:bg-emerald-400 hover:scale-[1.02] border-t-4 border-emerald-400 active:border-t-0 active:translate-y-1"
              }`}
            >
              {isPlacing
                ? "Placing..."
                : canBet
                ? "PLACE BET"
                : "WAIT FOR NEXT ROUND"}
            </button>
          </div>

          {/* Mini Logs */}
          <div className="mt-auto pt-6">
            <h3 className="text-xs text-slate-500 uppercase font-bold mb-2">
              Live Activity
            </h3>
            <div className="bg-slate-950/50 rounded-lg p-3 h-32 overflow-y-auto space-y-2 border border-slate-800/50 scrollbar-thin scrollbar-thumb-slate-700">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className="text-xs font-mono text-slate-400 border-l-2 border-slate-700 pl-2"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
