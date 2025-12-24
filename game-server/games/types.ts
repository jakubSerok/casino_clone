import { Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";

// Typy dla stanu pokoju
export type RoomStatus = "BETTING" | "ROLLING" | "RESOLVING";

export interface RoomConfig {
  minBet: number;
  timer: number;
}

export interface RoomState {
  status: RoomStatus;
  timeLeft: number;
  history: any[];
  bets: any[];
}

// Interfejs dla modułu gry
export interface GameModule {
  gameType: string;
  rooms: Record<string, RoomConfig>;
  roomStates: Record<string, RoomState>;

  // Inicjalizacja modułu
  initialize(io: any, prisma: PrismaClient): void;

  // Obsługa połączenia socket
  handleConnection(socket: Socket, io: any, prisma: PrismaClient): void;

  // Główna pętla gry (opcjonalna, jeśli gra ma własny timer)
  gameLoop?(io: any, prisma: PrismaClient): void;
}
