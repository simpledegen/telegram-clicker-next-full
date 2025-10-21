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
    // UI optimist: afișăm instant clickul
    setMine((m) => m + 1);
    setGlobal((g) => g + 1);

    // nu mai blocăm complet butonul; îl „răcim” 120ms ca anti-spam
    if (busy) return;
    setBusy(true);

    try {
      const r = await doClick();
      // aliniază cu serverul (în caz că s-a desincronizat)
      if (typeof r?.me === 'number') setMine(r.me);
      if (typeof r?.global === 'number') setGlobal(r.global);
    } catch {
      // dacă a eșuat, doar facem un refresh ca fallback
      await refresh();
    } finally {
      // răcire scurtă ca să poți apăsa des, dar nu flood complet
      setTimeout(() => setBusy(false), 120);
    }
  }

  async function onChangeName(n: string) {
    await changeName(n); await refresh();
  }

  return (
    <div className="wrap">
      <h1>Clicker</h1>
      <Counters me={mine} global={global} />
      <button className="bigbtn" disabled={busy} onClick={onClick}>{busy ? '…' : 'CLICK'}</button>
      <Leaderboard top={top} />
      <UsernameSheet onSubmit={onChangeName} />
      <p className="muted">Updates adapt to load; tap Refresh in chat if needed.</p>
    </div>
  );
}
