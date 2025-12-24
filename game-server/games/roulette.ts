import { Socket } from "socket.io";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { GameModule, RoomConfig, RoomState, RoomStatus } from "./types";

export class RouletteGame implements GameModule {
  gameType = "ROULETTE";

  rooms: Record<string, RoomConfig> = {
    standard: { minBet: 10, timer: 30 },
    vip: { minBet: 100, timer: 30 },
  };

  roomStates: Record<string, RoomState> = {
    standard: { status: "BETTING", timeLeft: 30, history: [], bets: [] },
    vip: { status: "BETTING", timeLeft: 30, history: [], bets: [] },
  };

  // Mapowanie prostych nazw na pełne nazwy pokoi (z prefiksem gry)
  private getFullRoomName(roomName: string): string {
    return `roulette-${roomName}`;
  }

  initialize(io: Server, prisma: PrismaClient): void {
    // Inicjalizacja może być pusta lub zawierać setup specyficzny dla roulette
    console.log(
      `[Roulette] Initialized with ${Object.keys(this.rooms).length} rooms`
    );
  }

  handleConnection(socket: Socket, io: Server, prisma: PrismaClient): void {
    // 1. Gracz dołącza do pokoju (obsługujemy tylko pokoje roulette)
    socket.on("join_room", (roomName: string) => {
      // Jeśli to pokój coinflip, ignorujemy
      if (roomName.startsWith("coinflip-")) {
        return;
      }

      // Sprawdzamy czy to pokój roulette (może być "standard", "vip" lub "roulette-standard", "roulette-vip")
      const simpleName = roomName.startsWith("roulette-")
        ? roomName.replace("roulette-", "")
        : roomName;

      // WAŻNE: Sprawdzamy czy pokój należy do tego modułu PRZED obsługą
      if (!this.rooms[simpleName]) {
        return; // To nie jest pokój roulette
      }

      const fullRoomName = this.getFullRoomName(simpleName);
      socket.join(fullRoomName);
      socket.emit("init_state", this.roomStates[simpleName]);
    });

    // 2. Gracz obstawia
    socket.on(
      "place_bet",
      async ({ room, userId, userName, amount, betType, betValue }) => {
        // WAŻNE: Jeśli to pokój coinflip, ignorujemy od razu
        if (room.startsWith("coinflip-")) {
          return;
        }

        // Sprawdzamy czy to pokój roulette
        const simpleName = room.startsWith("roulette-")
          ? room.replace("roulette-", "")
          : room;

        // Sprawdzamy czy pokój należy do tego modułu
        if (!this.rooms[simpleName]) {
          // To nie jest pokój roulette, ignorujemy
          return;
        }

        const roomState = this.roomStates[simpleName];
        const fullRoomName = this.getFullRoomName(simpleName);

        if (!roomState) {
          socket.emit("bet_rejected", { reason: "Room does not exist" });
          return;
        }

        if (roomState.status !== "BETTING") {
          socket.emit("bet_rejected", { reason: "Betting phase is closed" });
          return;
        }

        if (typeof amount !== "number" || amount <= 0) {
          socket.emit("bet_rejected", { reason: "Invalid bet amount" });
          return;
        }

        if (amount < this.rooms[simpleName].minBet - 1) {
          socket.emit("bet_rejected", { reason: "Amount below table minimum" });
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
            if (user.balance < amount)
              throw new Error("Niewystarczające środki");

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
          console.error("[Roulette] Błąd zakładu:", error.message);
          socket.emit("bet_error", error.message || "Błąd transakcji");
          return;
        }

        const bet = {
          userId,
          userName,
          amount,
          betType,
          betValue,
          createdAt: new Date(),
        };
        roomState.bets.push(bet);

        io.to(fullRoomName).emit("new_bet", bet);
        socket.emit("bet_confirmed", { amount, balance: newBalance });
        io.to(fullRoomName).emit(
          "new_activity",
          `Gracz ${userName || userId} postawił ${amount}$ na ${betType}${
            betValue ? ` ${betValue}` : ""
          }`
        );
      }
    );
  }

  gameLoop(io: Server, prisma: PrismaClient): void {
    setInterval(() => {
      Object.keys(this.rooms).forEach(async (roomName) => {
        const room = this.roomStates[roomName];
        const fullRoomName = this.getFullRoomName(roomName);

        if (room.timeLeft > 0) {
          room.timeLeft--;
          io.to(fullRoomName).emit("timer_update", room.timeLeft);
        } else {
          if (room.status === "BETTING") {
            room.status = "ROLLING";
            const result = Math.floor(Math.random() * 37); // 0-36

            io.to(fullRoomName).emit("round_result", result);

            const bets = room.bets;
            if (bets.length > 0) {
              const redNumbers = new Set([
                1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34,
                36,
              ]);

              const color =
                result === 0
                  ? "GREEN"
                  : redNumbers.has(result)
                  ? "RED"
                  : "BLACK";

              try {
                await prisma.$transaction(async (tx) => {
                  for (const bet of bets) {
                    if (!bet.userId || bet.userId === "guest") continue;

                    let payout = 0;
                    let win = false;

                    if (bet.betType === "RED" && color === "RED") {
                      win = true;
                      payout = bet.amount * 2;
                    } else if (bet.betType === "BLACK" && color === "BLACK") {
                      win = true;
                      payout = bet.amount * 2;
                    } else if (
                      bet.betType === "NUMBER" &&
                      bet.betValue !== null &&
                      Number(bet.betValue) === result
                    ) {
                      win = true;
                      payout = bet.amount * 36;
                    }

                    if (win && payout > 0) {
                      await tx.user.update({
                        where: { id: bet.userId },
                        data: { balance: { increment: payout } },
                      });
                    }

                    await tx.gameHistory.create({
                      data: {
                        userId: bet.userId,
                        gameType: "ROULETTE",
                        bet: bet.amount,
                        payout,
                        result: `NUM_${result}_COLOR_${color}`,
                      },
                    });
                  }
                });
              } catch (err: any) {
                console.error(
                  "[Roulette] Błąd rozliczania rundy:",
                  err.message || err
                );
              }
            }

            setTimeout(() => {
              room.status = "BETTING";
              room.timeLeft = this.rooms[roomName].timer;
              room.bets = [];
              io.to(fullRoomName).emit("new_round_started");
            }, 5000);
          }
        }
      });
    }, 1000);
  }
}
