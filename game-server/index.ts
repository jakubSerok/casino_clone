import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import http from "http";
import { RouletteGame } from "./games/roulette";
import { CoinFlipGame } from "./games/coinflip";
import { GameModule } from "./games/types";

const prisma = new PrismaClient();
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // W produkcji ustaw tu domenę Next.js
    methods: ["GET", "POST"],
  },
});

// Rejestracja wszystkich gier
const games: GameModule[] = [new RouletteGame(), new CoinFlipGame()];

// Mapowanie nazw gier do modułów
const gameMap: Record<string, GameModule> = {};
games.forEach((game) => {
  gameMap[game.gameType.toLowerCase()] = game;
});

// Inicjalizacja wszystkich gier
games.forEach((game) => {
  game.initialize(io, prisma);
  if (game.gameLoop) {
    game.gameLoop(io, prisma);
  }
});

// Obsługa połączeń socket - używamy głównego namespace
io.on("connection", (socket) => {
  console.log("Gracz połączony:", socket.id);

  // Przekieruj eventy do odpowiedniego modułu gry
  // Każdy moduł sprawdza czy event jest dla niego
  games.forEach((game) => {
    game.handleConnection(socket, io, prisma);
  });
});

server.listen(3001, () => {
  console.log("Game Server (Socket.io) działa na porcie 3001");
  console.log(`Zarejestrowane gry: ${games.map((g) => g.gameType).join(", ")}`);
});
