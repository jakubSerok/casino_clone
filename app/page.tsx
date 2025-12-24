import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center text-white">
      <div className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Online Casino</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Witaj w kasynie
        </h1>
        <p className="text-sm md:text-base text-slate-400 mb-8">
          Zarządzaj swoim kontem, doładuj saldo i wejdź do gier na żywo. Zacznij od wyboru gry w panelu gier.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/games"
            className="px-6 py-3 rounded-full bg-emerald-500 text-black font-semibold text-sm uppercase tracking-wide shadow-[0_0_30px_rgba(16,185,129,0.8)] hover:shadow-[0_0_40px_rgba(16,185,129,1)] hover:-translate-y-0.5 transition"
          >
            Przejdź do gier
          </Link>
          <Link
            href="/profile"
            className="px-5 py-3 rounded-full border border-slate-700 text-slate-200 text-sm hover:border-emerald-500 hover:text-emerald-200 transition"
          >
            Zobacz profil i saldo
          </Link>
        </div>
      </div>
    </div>
  );
}
