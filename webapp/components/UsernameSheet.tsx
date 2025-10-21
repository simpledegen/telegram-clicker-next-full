'use client';
import React, { useState } from 'react';
export function UsernameSheet({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="card">
      <div className="title">Change username</div>
      <div className="row">
        <input placeholder="new name" value={name} onChange={e => setName(e.target.value)} />
        <button onClick={() => name.trim() && onSubmit(name.trim())}>Save</button>
      </div>
    </div>
  );
}
