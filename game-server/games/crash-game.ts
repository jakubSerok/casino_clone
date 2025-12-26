import { Socket } from "socket.io";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { GameModule, RoomConfig, RoomState } from "./types";

interface CrashGameState {
  status: "BETTING" | "RUNNING" | "CRASHED";
  multiplier: number;
  timeLeft: number;
  crashPoint: number;
  history: any[];
  bets: any[];
  gameStarted?: boolean; // Flag to prevent multiple game starts
}

interface CrashBet {
  userId: string;
  userName?: string;
  amount: number;
  cashedOut: boolean;
  cashoutMultiplier?: number;
  createdAt: Date;
}

export class CrashGame implements GameModule {
  gameType = "CRASHGAME";
  rooms: Record<string, RoomConfig> = {
    standard: { minBet: 5, timer: 15 },
    vip: { minBet: 50, timer: 15 },
  };
  roomStates: Record<string, RoomState> = {
    standard: {
      status: "BETTING",
      timeLeft: 15,
      history: [],
      bets: [],
      multiplier: 1.0,
      crashPoint: 1.0,
      gameStarted: false,
    } as any,
    vip: {
      status: "BETTING",
      timeLeft: 15,
      history: [],
      bets: [],
      multiplier: 1.0,
      crashPoint: 1.0,
      gameStarted: false,
    } as any,
  };

  private getFullRoomName(roomName: string): string {
    return `crashgame-${roomName}`;
  }

  private generateCrashPoint(): number {
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    if (h % 33 === 0) return 1.0;

    const crashPoint = Math.floor((100 * e - h) / (e - h)) / 100;
    return Math.max(1.0, Math.min(crashPoint, 1000.0)); // Cap at 1000x
  }

  initialize(io: Server, prisma: PrismaClient): void {
    console.log(
      `[CrashGame] Initialized with ${Object.keys(this.rooms).length} rooms`
    );
  }

  handleConnection(socket: Socket, io: Server, prisma: PrismaClient): void {
    socket.on("join_room", (roomName: string) => {
      if (
        roomName.startsWith("roulette-") ||
        roomName.startsWith("coinflip-")
      ) {
        return;
      }

      const simpleName = roomName.startsWith("crashgame-")
        ? roomName.replace("crashgame-", "")
        : roomName;

      if (!this.rooms[simpleName]) {
        return;
      }

      const fullRoomName = this.getFullRoomName(simpleName);
      socket.join(fullRoomName);
      const state = this.roomStates[simpleName] as CrashGameState;
      if (!state.multiplier) {
        (state as any).multiplier = 1.0;
        (state as any).crashPoint = 1.0;
      }
      if (state.gameStarted === undefined) {
        (state as any).gameStarted = false;
      }
      socket.emit("init_state", state);
    });

    socket.on(
      "crash_cashout",
      async (data: { room: string; userId: string }) => {
        const simpleName = data.room.startsWith("crashgame-")
          ? data.room.replace("crashgame-", "")
          : data.room;

        if (!this.rooms[simpleName]) {
          return;
        }

        const roomState = this.roomStates[simpleName] as CrashGameState;
        const fullRoomName = this.getFullRoomName(simpleName);

        if (!roomState) {
          socket.emit("crash_error", { reason: "Room does not exist" });
          return;
        }

        if (roomState.status !== "RUNNING") {
          socket.emit("crash_error", {
            reason: "Za późno! Rakieta wybuchła.",
          });
          return;
        }

        const bets = roomState.bets as CrashBet[];
        const bet = bets.find((b) => b.userId === data.userId && !b.cashedOut);

        if (!bet) {
          socket.emit("crash_error", {
            reason: "Nie masz aktywnego zakładu",
          });
          return;
        }

        const currentMultiplier = roomState.multiplier;
        const winAmount = bet.amount * currentMultiplier;

        bet.cashedOut = true;
        bet.cashoutMultiplier = currentMultiplier;

        try {
          await prisma.user.update({
            where: { id: data.userId },
            data: { balance: { increment: winAmount } },
          });

          await prisma.transaction.create({
            data: {
              userId: data.userId,
              amount: winAmount,
              type: "WIN",
              status: "COMPLETED",
            },
          });

          socket.emit("crash_cashed_out", {
            multiplier: currentMultiplier,
            profit: winAmount,
          });

          io.to(fullRoomName).emit("crash_player_won", {
            userName: bet.userName || "Player",
            multiplier: currentMultiplier,
          });
        } catch (error: any) {
          console.error("[CrashGame] Błąd wypłaty:", error.message);
          socket.emit("crash_error", {
            reason: error.message || "Błąd transakcji",
          });
        }
      }
    );

    socket.on("place_bet", async ({ room, userId, userName, amount }) => {
      if (room.startsWith("roulette-") || room.startsWith("coinflip-")) {
        return;
      }

      const simpleName = room.startsWith("crashgame-")
        ? room.replace("crashgame-", "")
        : room;

      if (!this.rooms[simpleName]) {
        return;
      }

      const roomState = this.roomStates[simpleName] as CrashGameState;
      const fullRoomName = this.getFullRoomName(simpleName);

      if (!roomState) {
        socket.emit("bet_rejected", { reason: "Room does not exist" });
        return;
      }

      if (roomState.status !== "BETTING") {
        socket.emit("bet_rejected", {
          reason: "Betting phase is closed",
        });
        return;
      }

      if (typeof amount !== "number" || amount <= 0) {
        socket.emit("bet_rejected", { reason: "Invalid bet amount" });
        return;
      }

      if (amount < this.rooms[simpleName].minBet) {
        socket.emit("bet_rejected", {
          reason: "Amount below table minimum",
        });
        return;
      }

      if (!userId || userId === "guest") {
        socket.emit("bet_rejected", { reason: "Musisz być zalogowany" });
        return;
      }

      let newBalance: number | null = null;

      try {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });

          if (!user) throw new Error("Użytkownik nie istnieje");
          if (user.balance < amount) throw new Error("Niewystarczające środki");

          const updated = await tx.user.update({
            where: { id: userId },
            data: { balance: { decrement: amount } },
            select: { balance: true },
          });
          newBalance = updated.balance;

          await tx.transaction.create({
            data: {
              userId,
              amount,
              type: "BET",
              status: "COMPLETED",
            },
          });
        });
      } catch (error: any) {
        console.error("[CrashGame] Błąd zakładu:", error.message);
        socket.emit("bet_error", error.message || "Błąd transakcji");
        return;
      }

      const bet: CrashBet = {
        userId,
        userName,
        amount,
        cashedOut: false,
        createdAt: new Date(),
      };

      (roomState.bets as CrashBet[]).push(bet);
      io.to(fullRoomName).emit("new_bet", bet);
      socket.emit("bet_confirmed", { amount, balance: newBalance });
      io.to(fullRoomName).emit(
        "new_activity",
        `Gracz ${userName || userId} postawił ${amount}$`
      );
    });
  }

  gameLoop(io: Server, prisma: PrismaClient): void {
    setInterval(() => {
      Object.keys(this.rooms).forEach((roomName) => {
        const roomState = this.roomStates[roomName] as CrashGameState;
        const fullRoomName = this.getFullRoomName(roomName);

        // Timer countdown during betting phase
        if (roomState.status === "BETTING") {
          if (roomState.timeLeft > 0) {
            roomState.timeLeft--;
            io.to(fullRoomName).emit("timer_update", roomState.timeLeft);
          } else if (roomState.timeLeft <= 0 && !roomState.gameStarted) {
            // Start the game only if not already started
            roomState.gameStarted = true;
            roomState.status = "RUNNING";
            roomState.multiplier = 1.0;
            roomState.crashPoint = this.generateCrashPoint();

            io.to(fullRoomName).emit("game_started", {
              crashPoint: roomState.crashPoint,
            });

            // Start multiplier animation
            const startTime = Date.now();
            const gameInterval = setInterval(async () => {
                const timeElapsed = (Date.now() - startTime) / 1000;
                roomState.multiplier = parseFloat(
                  Math.pow(Math.E, 0.06 * timeElapsed).toFixed(2)
                );

                io.to(fullRoomName).emit("multiplier_update", {
                  multiplier: roomState.multiplier,
                });

                // Check if crashed
                if (roomState.multiplier >= roomState.crashPoint) {
                  clearInterval(gameInterval);
                  roomState.status = "CRASHED";
                  roomState.multiplier = roomState.crashPoint;

                  io.to(fullRoomName).emit("game_crashed", {
                    multiplier: roomState.crashPoint,
                  });

                  // Settle bets - players who didn't cash out lose
                  const bets = roomState.bets as CrashBet[];
                  const uncashedBets = bets.filter((b) => !b.cashedOut);

                  if (uncashedBets.length > 0) {
                    try {
                      await prisma.gameHistory.createMany({
                        data: uncashedBets.map((bet) => ({
                          userId: bet.userId,
                          gameType: "CRASHGAME",
                          bet: bet.amount,
                          payout: 0,
                          result: roomState.crashPoint.toFixed(2),
                        })),
                      });
                    } catch (error: any) {
                      console.error(
                        "[CrashGame] Błąd zapisu historii:",
                        error.message
                      );
                    }
                  }

                  // Add to history
                  const historyArray = roomState.history as number[];
                  historyArray.push(roomState.crashPoint);
                  if (historyArray.length > 20) {
                    historyArray.shift();
                  }
                  roomState.history = historyArray;

                  // Emit history update
                  io.to(fullRoomName).emit("history_update", historyArray);

                  // Reset for next round
                  setTimeout(() => {
                    roomState.status = "BETTING";
                    roomState.multiplier = 1.0;
                    roomState.crashPoint = 1.0;
                    roomState.timeLeft = this.rooms[roomName].timer;
                    roomState.bets = [];
                    roomState.gameStarted = false;
                    io.to(fullRoomName).emit("new_round_started");
                  }, 3000);
                }
              }, 50); // Update every 50ms for smooth animation
          }
        }
      });
    }, 1000); // Check every second
  }
}
