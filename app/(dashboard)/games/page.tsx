import Link from "next/link";
import Rulette from "./components/rulette";

export default function GamesPage() {
  return (
    <div className="flex flex-col gap-4 items-center p-4 w-full">
      <div className="mb-8 flex items-baseline justify-between gap-4 w-full">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Choose a game</h1>
          <p className="text-sm md:text-base text-slate-400">
            Pick one of the available games.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs md:text-sm text-slate-300 hover:text-emerald-300 border border-slate-700 rounded-full px-3 py-1"
        >
          Back to dashboard
        </Link>
      </div>

      <div className="grid gap-6  grid-cols-1 md:grid-cols-2">
        <Rulette />
      </div>
    </div>
  );
}
