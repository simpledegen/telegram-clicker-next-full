'use client';
import React, { useEffect, useState } from 'react';
import { fetchMe, doClick, changeName } from '@/lib/api';
import { Counters } from '@/components/Counters';
import { Leaderboard } from '@/components/Leaderboard';
import { UsernameSheet } from '@/components/UsernameSheet';

export default function Page() {
  const [mine, setMine] = useState(0);
  const [global, setGlobal] = useState(0);
  const [top, setTop] = useState<{ userId: number; total: number; username?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    tg?.expand?.();
    tg?.ready?.();
    refresh();
  }, []);

  async function refresh() {
    const data = await fetchMe();
    setMine(data.me); setGlobal(data.global); setTop(data.top);
  }

  async function onClick() {
    setMine((m) => m + 1);
    setGlobal((g) => g + 1);

    if (busy) return;
    setBusy(true);

    try {
      const r = await doClick();
      if (typeof r?.me === 'number') setMine(r.me);
      if (typeof r?.global === 'number') setGlobal(r.global);
    } catch {
      await refresh();
    } finally {
      setTimeout(() => setBusy(false), 120);
    }
  }

  async function onChangeName(n: string) {
    await changeName(n); await refresh();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
  <header className="mb-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-extrabold tracking-tight">⚡ Clicker</h1>
      <span className="chip">real-time</span>
    </div>
  </header>

  {/* Counters */}
  <section className="grid grid-cols-2 gap-3">
    <div className="glass p-4">
      <div className="text-xs/5 opacity-70">Your clicks</div>
      <div className="mt-1 text-3xl font-black tabular-nums">{mine}</div>
    </div>
    <div className="glass p-4">
      <div className="text-xs/5 opacity-70">Global clicks</div>
      <div className="mt-1 text-3xl font-black tabular-nums">{global}</div>
    </div>
  </section>

  {/* Big action */}
<div className="mt-4 flex justify-center">
  <button
    className={[
      // bază
      "inline-flex items-center justify-center w-full max-w-xs rounded-2xl py-5 text-xl font-extrabold",
      "bg-blue-500 text-black shadow-lg transition-all duration-200",
      // animație implicită (plutire/bounce)
      "motion-safe:animate-bounce",
      // stare hover: oprește bounce-ul și fă un mic wiggle + glow
      "hover:animate-none hover:-translate-y-0.5 hover:rotate-1 hover:shadow-2xl hover:brightness-110",
      // stare active: feedback tactil
      "active:scale-95 active:rotate-0",
      // disabled
      "disabled:opacity-60 disabled:cursor-not-allowed",
    ].join(" ")}
    disabled={busy}
    onClick={onClick}
    aria-busy={busy}
    aria-label="Click to increase score"
  >
    {busy ? "…" : "CLICK"}
  </button>
</div>
  {/* Leaderboard */}
  <section className="mt-4 glass p-4">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider opacity-80">Top 20</h2>
      <span className="text-[10px] opacity-60">updated live</span>
    </div>
    <div className="max-h-72 overflow-auto pr-1">
      <ol className="space-y-1 text-sm">
        {top.length === 0 ? (
          <li className="opacity-60">—</li>
        ) : (
          top.map((t, i) => (
            <li
              key={t.userId}
              className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold">
                  {i + 1}
                </span>
                <strong className="font-medium">
                  {t.username || `user_${t.userId}`}
                </strong>
              </div>
              <span className="tabular-nums font-semibold">{t.total}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  </section>

  {/* Change username */}
  <section className="mt-4 glass p-4">
    <div className="mb-2 text-sm font-semibold uppercase tracking-wider opacity-80">
      Change username
    </div>
    <div className="flex gap-2 border border-2 border-black/10 p-3 rounded-xl">
      <UsernameSheet onSubmit={onChangeName} />
    </div>
  </section>

  <p className="mt-4 text-center text-xs opacity-60">
    Updates adapt to load; tap <span className="font-semibold">Refresh</span> in chat if needed.
  </p>
</div>

  );
}
