import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import http from "http";
import { RouletteGame } from "./games/roulette";
import { CoinFlipGame } from "./games/coinflip";
import { CrashGame } from "./games/crash-game";
import { GameModule } from "./games/types";

const prisma = new PrismaClient();
const server = http.createServer();

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://casino-clone.vercel.app"
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Rejestracja wszystkich gier
const games: GameModule[] = [
  new RouletteGame(),
  new CoinFlipGame(),
  new CrashGame(),
];

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
