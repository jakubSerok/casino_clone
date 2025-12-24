import { Socket } from "socket.io";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { GameModule, RoomConfig, RoomState, RoomStatus } from "./types";

export class CoinFlipGame implements GameModule {
  gameType = "COINFLIP";

  rooms: Record<string, RoomConfig> = {
    standard: { minBet: 5, timer: 15 },
    vip: { minBet: 50, timer: 15 },
  };

  roomStates: Record<string, RoomState> = {
    standard: { status: "BETTING", timeLeft: 15, history: [], bets: [] },
    vip: { status: "BETTING", timeLeft: 15, history: [], bets: [] },
  };

  // Mapowanie prostych nazw na pełne nazwy pokoi (z prefiksem gry)
  private getFullRoomName(roomName: string): string {
    return `coinflip-${roomName}`;
  }

  initialize(io: Server, prisma: PrismaClient): void {
    console.log(
      `[CoinFlip] Initialized with ${Object.keys(this.rooms).length} rooms`
    );
  }

  handleConnection(socket: Socket, io: Server, prisma: PrismaClient): void {
    // Gracz dołącza do pokoju (obsługujemy tylko pokoje coinflip)
    socket.on("join_room", (roomName: string) => {
      // Jeśli to pokój roulette, ignorujemy
      if (roomName.startsWith("roulette-")) {
        return; // To nie jest pokój coinflip
      }

      // Sprawdzamy czy to pokój coinflip (może być "coinflip-standard", "coinflip-vip" lub z prefiksem)
      const simpleName = roomName.startsWith("coinflip-")
        ? roomName.replace("coinflip-", "")
        : roomName;

      // WAŻNE: Sprawdzamy czy pokój należy do tego modułu PRZED obsługą
      if (!this.rooms[simpleName]) {
        return; // To nie jest pokój coinflip
      }

      const fullRoomName = this.getFullRoomName(simpleName);
      socket.join(fullRoomName);
      socket.emit("init_state", this.roomStates[simpleName]);
    });

    // Gracz obstawia (HEADS lub TAILS)
    socket.on(
      "place_bet",
      async ({ room, userId, userName, amount, betType }) => {
        // WAŻNE: Jeśli to pokój roulette, ignorujemy od razu
        if (room.startsWith("roulette-")) {
          return;
        }

        // Sprawdzamy czy to pokój coinflip
        const simpleName = room.startsWith("coinflip-")
          ? room.replace("coinflip-", "")
          : room;

        // Sprawdzamy czy pokój należy do tego modułu
        if (!this.rooms[simpleName]) {
          // To nie jest pokój coinflip, ignorujemy
          return;
        }

        // Dodatkowe sprawdzenie: jeśli betType to RED/BLACK/NUMBER, to to nie jest coinflip
        if (betType === "RED" || betType === "BLACK" || betType === "NUMBER") {
          return; // To jest zakład roulette, nie coinflip
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

        if (amount < this.rooms[simpleName].minBet) {
          socket.emit("bet_rejected", { reason: "Amount below table minimum" });
          return;
        }

        if (!userId || userId === "guest") {
          socket.emit("bet_rejected", { reason: "Musisz być zalogowany" });
          return;
        }

        if (betType !== "HEADS" && betType !== "TAILS") {
          socket.emit("bet_rejected", {
            reason: "Invalid bet type. Use HEADS or TAILS",
          });
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
          console.error("[CoinFlip] Błąd zakładu:", error.message);
          socket.emit("bet_error", error.message || "Błąd transakcji");
          return;
        }

        const bet = {
          userId,
          userName,
          amount,
          betType,
          createdAt: new Date(),
        };
        roomState.bets.push(bet);

        io.to(fullRoomName).emit("new_bet", bet);
        socket.emit("bet_confirmed", { amount, balance: newBalance });
        io.to(fullRoomName).emit(
          "new_activity",
          `Gracz ${userName || userId} postawił ${amount}$ na ${betType}`
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
            room.status = "RESOLVING";
            // Losowanie: 0 = HEADS, 1 = TAILS
            const result = Math.random() < 0.5 ? "HEADS" : "TAILS";

            io.to(fullRoomName).emit("round_result", result);

            const bets = room.bets;
            if (bets.length > 0) {
              try {
                await prisma.$transaction(async (tx) => {
                  for (const bet of bets) {
                    if (!bet.userId || bet.userId === "guest") continue;

                    let payout = 0;
                    let win = false;

                    if (bet.betType === result) {
                      win = true;
                      payout = bet.amount * 2; // 1:1 + stawka
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
                        gameType: "COINFLIP",
                        bet: bet.amount,
                        payout,
                        result: result,
                      },
                    });
                  }
                });
              } catch (err: any) {
                console.error(
                  "[CoinFlip] Błąd rozliczania rundy:",
                  err.message || err
                );
              }
            }

            setTimeout(() => {
              room.status = "BETTING";
              room.timeLeft = this.rooms[roomName].timer;
              room.bets = [];
              io.to(fullRoomName).emit("new_round_started");
            }, 3000);
          }
        }
      });
    }, 1000);
  }
}
