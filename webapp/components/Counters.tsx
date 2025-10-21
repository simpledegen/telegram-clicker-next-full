'use client';
import React from 'react';
export function Counters({ me, global }: { me: number; global: number }) {
  return (
    <div className="grid gap-2">
      <div className="card"><div>Your clicks</div><div className="big">{me}</div></div>
      <div className="card"><div>Global clicks</div><div className="big">{global}</div></div>
    </div>
  );
}
