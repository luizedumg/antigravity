"use client";

import { useState } from "react";
import { EyeOff, Eye, Lock } from "lucide-react";

export default function GlobalValueCard({ totalValue }: { totalValue: number }) {
  const [unlocked, setUnlocked] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (unlocked) {
      setUnlocked(false);
      return;
    }
    setPrompting(true);
  };

  const submitPin = () => {
    if (pin === "1981") {
      setUnlocked(true);
      setPrompting(false);
      setPin("");
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="metric-card" style={{ position: 'relative' }}>
      <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
        {unlocked ? '💰' : <Lock size={20} />}
      </div>
      
      <div className="metric-info" style={{ flex: 1 }}>
        {prompting ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="password"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPin()}
              className="input-field"
              autoFocus
              style={{ padding: '0.4rem 0.5rem', fontSize: '1rem', width: '80px', letterSpacing: '0.2em', textAlign: 'center', borderColor: error ? 'var(--danger)' : '' }}
            />
            <button onClick={submitPin} className="btn-success" style={{ padding: '0.4rem 0.8rem', minHeight: 'auto', fontSize: '0.8rem' }}>OK</button>
            <button onClick={() => { setPrompting(false); setError(false); }} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', minHeight: 'auto', fontSize: '0.8rem' }}>X</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={handleUnlock}>
            <span className="metric-value" style={{ fontSize: '1.4rem' }}>
              {unlocked ? `R$ ${totalValue.toLocaleString('pt-BR')}` : 'R$ ••••••••'}
            </span>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', opacity: 0.5, cursor: 'pointer', padding: '0.2rem' }}
              title="Revelar valor"
            >
              {unlocked ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        )}
        <span className="metric-label">Valor Estimado Global</span>
      </div>
    </div>
  );
}
