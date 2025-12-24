import Link from "next/link";

export default function RouletteLobby() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header / game type section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-400 mb-2">Live Table Game</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-3">
              <span>Roulette</span>
              <span className="inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Real‑time rooms
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-xl">
              Wybierz typ stołu i dołącz do pokoju. Zakłady od niskich stawek po VIP High Rollers,
              zsynchronizowane z serwerem gier w czasie rzeczywistym.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-xs text-slate-400">Status gry</div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-slate-950/80 px-4 py-2 shadow-[0_0_22px_rgba(16,185,129,0.6)]">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-emerald-200">Serwer gier online</span>
            </div>
            <p className="text-[11px] text-slate-500">Połączony z Socket.io na porcie 3001</p>
          </div>
        </div>

        {/* Rooms grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Standard room */}
          <Link href="/games/roulette/standard" className="group">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-5 transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Standard table</span>
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-300">Standard</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Idealny na start, spokojne tempo rozgrywki i niskie limity zakładów.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <div>
                      <div className="text-slate-500 text-[11px] uppercase tracking-wide">Min. zakład</div>
                      <div className="font-semibold text-emerald-300">$10</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div>
                      <div className="text-slate-500 text-[11px] uppercase tracking-wide">Poziom ryzyka</div>
                      <div className="font-semibold">Niski – Średni</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                  <span className="text-[11px] uppercase tracking-wide text-slate-500">Aktywne stoły</span>
                  <span className="text-lg font-semibold text-emerald-300">1</span>
                  <span className="mt-1 inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-100">
                    Wejdź do pokoju
                  </span>
                </div>
              </div>
            </div>
          </Link>

          {/* VIP room */}
          <Link href="/games/roulette/vip" className="group">
            <div className="relative overflow-hidden rounded-2xl border border-yellow-700/70 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 px-6 py-5 transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-[0_0_40px_rgba(250,204,21,0.5)]">
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-yellow-400/10 blur-3xl group-hover:bg-yellow-400/20" />

              <div className="absolute right-4 top-4 rounded-full bg-yellow-500 text-black px-3 py-1 text-[10px] font-extrabold tracking-wide shadow-md">
                VIP ONLY
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/15 px-3 py-1 text-[11px] font-semibold text-yellow-200 mb-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />
                    <span>High rollers area</span>
                  </div>
                  <h2 className="text-2xl font-bold text-yellow-300">High Rollers</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Dla graczy szukających mocnych emocji, wysokich limitów i intensywnego tempa.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-200">
                    <div>
                      <div className="text-slate-400 text-[11px] uppercase tracking-wide">Min. zakład</div>
                      <div className="font-semibold text-yellow-300">$100</div>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div>
                      <div className="text-slate-400 text-[11px] uppercase tracking-wide">Poziom ryzyka</div>
                      <div className="font-semibold">Wysoki</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">Aktywne stoły</span>
                  <span className="text-lg font-semibold text-yellow-200">1</span>
                  <span className="mt-1 inline-flex items-center rounded-full bg-slate-950/80 px-3 py-1 text-[11px] text-slate-200 group-hover:bg-yellow-400/20 group-hover:text-yellow-50">
                    Wejdź do pokoju VIP
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}