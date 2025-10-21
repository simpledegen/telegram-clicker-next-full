'use client';
import React from 'react';
export function Leaderboard({ top }: { top?: { userId: number; total: number; username?: string }[] }) {
  const list = Array.isArray(top) ? top : [];
  return (
    <div className="card">
      <div className="title">Top 20</div>
      <ol>
        {list.length === 0 && <li>—</li>}
        {list.map((t, i) => (
          <li key={t.userId}><span>#{i + 1}</span> <strong>{t.username || `user_${t.userId}`}</strong> — {t.total}</li>
        ))}
      </ol>
    </div>
  );
}
