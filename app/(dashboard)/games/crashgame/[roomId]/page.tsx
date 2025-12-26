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
  cashedOut?: boolean;
  cashoutMultiplier?: number;
  createdAt?: Date;
};

type GameState = {
  status: "BETTING" | "RUNNING" | "CRASHED";
  multiplier: number;
  timeLeft: number;
  crashPoint: number;
  history: number[];
  bets: Bet[];
};

export default function CrashGameRoom() {
  const params = useParams();
  const roomId = params?.roomId || "standard";
  const { data: session } = useSession();

  // State
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [timer, setTimer] = useState(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(1.0);

  // Betting State
  const [currentAmount, setCurrentAmount] = useState<number>(BET_AMOUNTS[0]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [canCashout, setCanCashout] = useState(false);

  // Graph data for visualization
  const [graphData, setGraphData] = useState<{ x: number; y: number }[]>([]);
  const graphContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.connect();
    socket.emit("join_room", `crashgame-${roomId}`);

    const handleInitState = (state: GameState) => {
      setGameState(state);
      setTimer(state.timeLeft);
      setHistory(state.history || []);
      setMultiplier(state.multiplier || 1.0);
      setCrashPoint(state.crashPoint || 1.0);
      setGraphData([]);
    };

    const handleTimerUpdate = (time: number) => {
      setTimer(time);
      setGameState((prev) => (prev ? { ...prev, timeLeft: time } : null));
    };

    const handleNewRound = () => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: "BETTING",
              bets: [],
              multiplier: 1.0,
            }
          : null
      );
      setMultiplier(1.0);
      setMyBet(null);
      setCanCashout(false);
      setGraphData([]);
    };

    const handleGameStarted = (data: { crashPoint: number }) => {
      setCrashPoint(data.crashPoint);
      setGameState((prev) =>
        prev
          ? { ...prev, status: "RUNNING", crashPoint: data.crashPoint }
          : null
      );
      setGraphData([{ x: 0, y: 1.0 }]);
    };

    const handleMultiplierUpdate = (data: { multiplier: number }) => {
      const newMultiplier = data.multiplier;
      setMultiplier(newMultiplier);
      setGameState((prev) =>
        prev ? { ...prev, multiplier: newMultiplier } : null
      );

      // Update graph
      setGraphData((prev) => {
        const newData = [...prev, { x: prev.length, y: newMultiplier }];
        // Keep only last 200 points for performance
        return newData.slice(-200);
      });
    };

    const handleGameCrashed = (data: { multiplier: number }) => {
      setMultiplier(data.multiplier);
      setGameState((prev) =>
        prev
          ? { ...prev, status: "CRASHED", multiplier: data.multiplier }
          : null
      );
      setCanCashout(false);

      // Add final point to graph
      setGraphData((prev) => [...prev, { x: prev.length, y: data.multiplier }]);

      // Update history will come from init_state on next round
    };

    const handleNewBet = (bet: Bet) => {
      setGameState((prev) =>
        prev ? { ...prev, bets: [...prev.bets, bet] } : null
      );
      const name = bet.userName || "Player";
      setLogs((prev) => [`${name}: $${bet.amount}`, ...prev]);

      // If it's my bet, track it
      if (bet.userId === session?.user?.id) {
        setMyBet(bet);
      }
    };

    const handleCashedOut = (data: { multiplier: number; profit: number }) => {
      setLogs((prev) => [
        `💰 Wypłacono: ${data.profit.toFixed(
          2
        )}$ przy ${data.multiplier.toFixed(2)}x`,
        ...prev,
      ]);
      setMyBet((prev) =>
        prev
          ? {
              ...prev,
              cashedOut: true,
              cashoutMultiplier: data.multiplier,
            }
          : prev
      );
      setCanCashout(false);
    };

    const handlePlayerWon = (data: {
      userName: string;
      multiplier: number;
    }) => {
      setLogs((prev) => [
        `🎉 ${data.userName} wypłacił przy ${data.multiplier.toFixed(2)}x!`,
        ...prev,
      ]);
    };

    const handleCrashError = (data: { reason: string }) => {
      setLogs((prev) => [`❌ ${data.reason}`, ...prev]);
    };

    const handleHistoryUpdate = (newHistory: number[]) => {
      setHistory(newHistory);
    };

    socket.on("init_state", handleInitState);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("new_round_started", handleNewRound);
    socket.on("game_started", handleGameStarted);
    socket.on("multiplier_update", handleMultiplierUpdate);
    socket.on("game_crashed", handleGameCrashed);
    socket.on("new_bet", handleNewBet);
    socket.on("crash_cashed_out", handleCashedOut);
    socket.on("crash_player_won", handlePlayerWon);
    socket.on("crash_error", handleCrashError);
    socket.on("history_update", handleHistoryUpdate);

    return () => {
      socket.off("init_state", handleInitState);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("new_round_started", handleNewRound);
      socket.off("game_started", handleGameStarted);
      socket.off("multiplier_update", handleMultiplierUpdate);
      socket.off("game_crashed", handleGameCrashed);
      socket.off("new_bet", handleNewBet);
      socket.off("crash_cashed_out", handleCashedOut);
      socket.off("crash_player_won", handlePlayerWon);
      socket.off("crash_error", handleCrashError);
      socket.off("history_update", handleHistoryUpdate);
      socket.disconnect();
    };
  }, [roomId, session?.user?.id]);

  useEffect(() => {
    if (gameState?.status === "RUNNING" && myBet && !myBet.cashedOut) {
      setCanCashout(true);
    } else if (gameState?.status !== "RUNNING") {
      setCanCashout(false);
    }
  }, [gameState?.status, myBet]);

  const handlePlaceBet = () => {
    if (!gameState || gameState.status !== "BETTING") return;

    setIsPlacing(true);
    const payload = {
      room: `crashgame-${roomId}`,
      userId: session?.user?.id || "guest",
      userName:
        session?.user?.name || session?.user?.email?.split("@")[0] || "Player",
      amount: currentAmount,
    };

    socket.emit("place_bet", payload);
    setTimeout(() => setIsPlacing(false), 300);
  };

  const handleCashout = () => {
    if (!myBet || !canCashout || gameState?.status !== "RUNNING") return;

    socket.emit("crash_cashout", {
      room: `crashgame-${roomId}`,
      userId: session?.user?.id,
    });
  };

  // --- RENDER HELPERS ---
  const canBet = gameState?.status === "BETTING";
  const isRunning = gameState?.status === "RUNNING";
  const isCrashed = gameState?.status === "CRASHED";

  // Calculate graph dimensions
  const maxMultiplier = Math.max(...graphData.map((d) => d.y), crashPoint, 2.0);
  const graphHeight = 300;
  const graphWidth = 600;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full grid lg:grid-cols-[1.5fr,1fr] gap-8 bg-slate-900/50 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* LEFT: THE GRAPH */}
        <div className="relative flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800/50">
          {/* Header Info */}
          <div className="absolute top-6 left-6 z-10">
            <h1 className="text-2xl font-bold text-emerald-400 tracking-wider">
              CRASH GAME
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              ROOM: {roomId}
            </p>
          </div>

          <div className="absolute top-6 right-6 z-10 flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              {isRunning ? "Multiplier" : "Time Left"}
            </span>
            <div
              className={`text-3xl font-mono font-bold ${
                isRunning
                  ? multiplier >= crashPoint * 0.8
                    ? "text-red-500 animate-pulse"
                    : "text-emerald-400"
                  : timer < 5
                  ? "text-red-500 animate-pulse"
                  : "text-emerald-400"
              }`}
            >
              {isRunning
                ? `${multiplier.toFixed(2)}x`
                : isCrashed
                ? `Crashed at ${multiplier.toFixed(2)}x`
                : `${timer}s`}
            </div>
          </div>

          {/* GRAPH CONTAINER */}
          <div
            ref={graphContainerRef}
            className="relative mt-12 w-full h-[300px] bg-slate-950 rounded-xl border-2 border-slate-800 overflow-hidden"
          >
            {/* Grid lines */}
            <svg className="absolute inset-0 w-full h-full">
              {[1, 2, 5, 10, 20, 50, 100].map((line) => {
                if (line > maxMultiplier) return null;
                const y = graphHeight - (line / maxMultiplier) * graphHeight;
                return (
                  <g key={line}>
                    <line
                      x1={0}
                      y1={y}
                      x2={graphWidth}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.1)"
                      strokeWidth="1"
                    />
                    <text
                      x={10}
                      y={y + 5}
                      fill="rgba(148, 163, 184, 0.5)"
                      fontSize="10"
                    >
                      {line}x
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Graph line */}
            {graphData.length > 0 && (
              <svg className="absolute inset-0 w-full h-full">
                <polyline
                  points={graphData
                    .map(
                      (d, i) =>
                        `${(i / graphData.length) * graphWidth},${
                          graphHeight - (d.y / maxMultiplier) * graphHeight
                        }`
                    )
                    .join(" ")}
                  fill="none"
                  stroke={
                    isCrashed
                      ? "#ef4444"
                      : multiplier >= crashPoint * 0.8
                      ? "#f59e0b"
                      : "#10b981"
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Current multiplier indicator */}
            {isRunning && (
              <div
                className="absolute left-0 bg-emerald-500 text-slate-900 px-3 py-1 rounded-r-lg font-bold text-lg shadow-lg"
                style={{
                  top: `${
                    graphHeight -
                    (multiplier / maxMultiplier) * graphHeight -
                    20
                  }px`,
                }}
              >
                {multiplier.toFixed(2)}x
              </div>
            )}

            {/* Crash point indicator */}
            {isRunning && (
              <div
                className="absolute right-0 bg-red-500 text-white px-3 py-1 rounded-l-lg font-bold text-sm shadow-lg"
                style={{
                  top: `${
                    graphHeight -
                    (crashPoint / maxMultiplier) * graphHeight -
                    20
                  }px`,
                }}
              >
                Crash: {crashPoint.toFixed(2)}x
              </div>
            )}
          </div>

          {/* Status Display */}
          <div className="mt-6 h-12 flex items-center justify-center">
            {isCrashed ? (
              <div className="flex flex-col items-center animate-bounce">
                <span className="text-xs text-slate-400 uppercase">
                  Crashed
                </span>
                <span className="text-4xl font-bold text-red-500">
                  {multiplier.toFixed(2)}x
                </span>
              </div>
            ) : isRunning ? (
              <span className="text-sm text-emerald-400 uppercase tracking-widest animate-pulse">
                🚀 Rakieta leci...
              </span>
            ) : (
              <span className="text-sm text-slate-600 uppercase tracking-widest">
                Place Your Bets
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
              Your Bet
            </h2>

            {/* My Bet Info */}
            {myBet && (
              <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300">Amount:</span>
                  <span className="font-bold text-emerald-400">
                    ${myBet.amount}
                  </span>
                </div>
                {myBet.cashedOut && myBet.cashoutMultiplier ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">
                      Cashed out at:
                    </span>
                    <span className="font-bold text-yellow-400">
                      {myBet.cashoutMultiplier.toFixed(2)}x
                    </span>
                  </div>
                ) : isRunning ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Current:</span>
                    <span className="font-bold text-emerald-400">
                      {multiplier.toFixed(2)}x
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Action Buttons */}
            {!myBet ? (
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
            ) : (
              <button
                onClick={handleCashout}
                disabled={!canCashout || myBet.cashedOut}
                className={`w-full py-4 mt-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-xl transition-all ${
                  !canCashout || myBet.cashedOut
                    ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                    : "bg-yellow-500 text-slate-900 hover:bg-yellow-400 hover:scale-[1.02] border-t-4 border-yellow-400 active:border-t-0 active:translate-y-1 animate-pulse"
                }`}
              >
                {myBet.cashedOut
                  ? "CASHED OUT"
                  : canCashout
                  ? `CASHOUT (${multiplier.toFixed(2)}x)`
                  : "WAITING..."}
              </button>
            )}
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
