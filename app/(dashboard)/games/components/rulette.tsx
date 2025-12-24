import React from "react";
import Link from "next/link";

const Rulette = () => {
  return (
    <div className=" w-full">
      <Link href="/games/roulette" className="group">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-900/40 via-slate-950 to-black px-6 py-5 transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.5)]">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl group-hover:bg-emerald-500/20" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Live Table Game</span>
              </div>
              <h2 className="text-2xl font-bold text-emerald-300">Roulette</h2>
              <p className="mt-1 text-sm text-slate-300">
                Klasyczna europejska ruletka z dwoma poziomami stołów: Standard
                i VIP High Rollers.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <div>
                  <div className="text-slate-500 text-[11px] uppercase tracking-wide">
                    Stoły
                  </div>
                  <div className="font-semibold">Standard, VIP</div>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <div className="text-slate-500 text-[11px] uppercase tracking-wide">
                    Typ gry
                  </div>
                  <div className="font-semibold">RNG + live loop</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 text-right">
              <span className="text-[11px] uppercase tracking-wide text-slate-500">
                Status
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] text-emerald-300 border border-emerald-500/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
              <span className="mt-1 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-100 group-hover:bg-emerald-500/20">
                Przejdź do stołów
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default Rulette;
