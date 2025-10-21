'use client';
import React, { useState } from 'react';

export function UsernameSheet({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  const disabled = !name.trim();

  return (
    <div className="flex w-full gap-2">
      <input
        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none
                   placeholder:text-white/40 focus:border-white/20"
        placeholder="new name"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <button
        className="rounded-xl bg-white/10 px-4 font-semibold hover:bg-white/15 active:scale-[0.98]
                   disabled:opacity-50 disabled:hover:bg-white/10"
        disabled={disabled}
        onClick={() => !disabled && onSubmit(name.trim())}
      >
        Save
      </button>
    </div>
  );
}
