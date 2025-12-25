"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { HistoryDisplay } from "../components/HistoryDisplay";

// --- CONFIGURATION ---
const socket: Socket = io("http://localhost:3001", { autoConnect: false });

const BET_AMOUNTS = [5, 10, 25, 50, 100, 250, 500];

// --- TYPES ---
type Bet = {
  userId: string;
  userName?: string;
  amount: number;
  betType: "HEADS" | "TAILS";
  createdAt?: Date;
};

type GameState = {
  status: "BETTING" | "RESOLVING";
  timeLeft: number;
  history: string[];
  bets: Bet[];
};

export default function CoinFlipRoom() {
  const params = useParams();
  const roomId = params?.roomId || "standard";
  const { data: session } = useSession();

  // State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timer, setTimer] = useState(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // Betting State
  const [currentAmount, setCurrentAmount] = useState<number>(BET_AMOUNTS[0]);
  const [currentBetType, setCurrentBetType] = useState<"HEADS" | "TAILS">(
    "HEADS"
  );
  const [isPlacing, setIsPlacing] = useState(false);

  // Animation State
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [coinRotation, setCoinRotation] = useState(0);
  const coinSideRef = useRef<"HEADS" | "TAILS">("HEADS");

  useEffect(() => {
    socket.connect();
    socket.emit("join_room", `coinflip-${roomId}`);

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
      setIsFlipping(false);
    };

    const handleRoundResult = (result: "HEADS" | "TAILS") => {
      setIsFlipping(true);
      setGameState((prev) => (prev ? { ...prev, status: "RESOLVING" } : null));

      // Animate coin flip with multiple rotations
      let rotation = 0;
      const targetRotations = 5; // Number of full flips
      const totalRotation =
        targetRotations * 360 + (result === "TAILS" ? 180 : 0);

      const flipInterval = setInterval(() => {
        rotation += 15; // Faster rotation for smoother animation
        setCoinRotation(rotation);

        if (rotation >= totalRotation) {
          clearInterval(flipInterval);
          coinSideRef.current = result;
          setLastResult(result);
          setLogs((prev) => [`Result: ${result}`, ...prev]);
          setIsFlipping(false);
          setHistory((prev) => [...prev, result].slice(-20));
          setCoinRotation(result === "TAILS" ? 180 : 0);
        }
      }, 30);
    };

    const handleNewBet = (bet: Bet) => {
      setGameState((prev) =>
        prev ? { ...prev, bets: [...prev.bets, bet] } : null
      );
      const name = bet.userName || "Player";
      setLogs((prev) => [`${name}: $${bet.amount} on ${bet.betType}`, ...prev]);
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

  const handlePlaceBet = () => {
    if (!gameState || gameState.status !== "BETTING") return;

    setIsPlacing(true);
    const payload = {
      room: `coinflip-${roomId}`,
      userId: session?.user?.id || "guest",
      userName:
        session?.user?.name || session?.user?.email?.split("@")[0] || "Player",
      amount: currentAmount,
      betType: currentBetType,
    };

    socket.emit("place_bet", payload);
    setTimeout(() => setIsPlacing(false), 300);
  };

  // --- RENDER HELPERS ---
  const canBet = gameState?.status === "BETTING";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full grid lg:grid-cols-[1.2fr,1fr] gap-8 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* LEFT: THE COIN */}
        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/50">
          {/* Header Info */}
          <div className="absolute top-6 left-6 z-10">
            <h1 className="text-2xl font-bold text-emerald-400 tracking-wider">
              COIN FLIP
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
              {gameState?.status === "RESOLVING" ? "---" : `${timer}s`}
            </div>
          </div>

          {/* COIN CONTAINER */}
          <div
            className="relative mt-12 w-[320px] h-[320px] md:w-[400px] md:h-[400px] flex items-center justify-center"
            style={{ perspective: "1000px" }}
          >
            {/* Coin */}
            <div
              className="relative w-[200px] h-[200px] md:w-[250px] md:h-[250px]"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipping
                  ? `rotateY(${coinRotation}deg) rotateX(${
                      Math.sin(coinRotation * 0.0174533) * 20
                    }deg)`
                  : `rotateY(${coinSideRef.current === "TAILS" ? 180 : 0}deg)`,
                transition: isFlipping ? "none" : "transform 0.5s ease-in-out",
              }}
            >
              {/* Heads Side */}
              <div
                className={`absolute inset-0 rounded-full border-4 ${
                  coinSideRef.current === "HEADS" && !isFlipping
                    ? "bg-yellow-500 border-yellow-600"
                    : "bg-yellow-400 border-yellow-500"
                } flex items-center justify-center shadow-2xl`}
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(0deg)",
                }}
              >
                <div className="text-center">
                  <div className="text-6xl md:text-7xl mb-2">🪙</div>
                  <div className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-wider">
                    HEADS
                  </div>
                </div>
              </div>

              {/* Tails Side */}
              <div
                className={`absolute inset-0 rounded-full border-4 ${
                  coinSideRef.current === "TAILS" && !isFlipping
                    ? "bg-slate-800 border-slate-700"
                    : "bg-slate-700 border-slate-600"
                } flex items-center justify-center shadow-2xl`}
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <div className="text-center">
                  <div className="text-6xl md:text-7xl mb-2">⚫</div>
                  <div className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
                    TAILS
                  </div>
                </div>
              </div>
            </div>

            {/* Glow effect when flipping */}
            {isFlipping && (
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-3xl animate-pulse" />
            )}
          </div>

          {/* Result Display */}
          <div className="mt-8 h-12 flex items-center justify-center">
            {lastResult !== null && !isFlipping ? (
              <div className="flex flex-col items-center animate-bounce">
                <span className="text-xs text-slate-400 uppercase">Result</span>
                <span
                  className={`text-4xl font-bold ${
                    lastResult === "HEADS"
                      ? "text-yellow-500"
                      : "text-slate-300"
                  }`}
                >
                  {lastResult}
                </span>
              </div>
            ) : (
              <span className="text-sm text-slate-600 uppercase tracking-widest">
                {isFlipping ? "Flipping..." : "Place Your Bets"}
              </span>
            )}
          </div>

          {/* History Display */}
          <div className="mt-6 w-full">
            <HistoryDisplay history={history} />
          </div>
        </div>

        {/* RIGHT: BETTING BOARD */}
        <div className="p-6 md:p-8 flex flex-col bg-slate-900">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Select Chip Amount
            </h2>
            <div className="flex items-center justify-between">
              <div className="flex gap-3 flex-wrap">
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
                    Custom:
                  </h2>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={currentAmount}
                    onChange={(e) =>
                      setCurrentAmount(parseInt(e.target.value) || 0)
                    }
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

            {/* Bet Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={!canBet}
                onClick={() => setCurrentBetType("HEADS")}
                className={`py-6 rounded-xl border-2 transition-all font-bold uppercase tracking-widest ${
                  currentBetType === "HEADS"
                    ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-yellow-900/20 hover:border-yellow-900/50"
                }`}
              >
                <div className="text-3xl mb-2">🪙</div>
                <div>Heads</div>
              </button>
              <button
                disabled={!canBet}
                onClick={() => setCurrentBetType("TAILS")}
                className={`py-6 rounded-xl border-2 transition-all font-bold uppercase tracking-widest ${
                  currentBetType === "TAILS"
                    ? "bg-slate-700 border-slate-400 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                <div className="text-3xl mb-2">⚫</div>
                <div>Tails</div>
              </button>
            </div>

            {/* Action Button */}
            <button
              onClick={handlePlaceBet}
              disabled={!canBet || isPlacing}
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
