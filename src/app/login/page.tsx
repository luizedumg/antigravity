'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Senha incorreta. Tente novamente.');
        setPassword('');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    }

    setLoading(false);
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--background)'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        padding: '3rem 2.5rem'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '2rem' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ maxHeight: '80px', objectFit: 'contain', marginBottom: '1rem' }} 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <h1 style={{
            fontSize: '1.8rem',
            background: 'linear-gradient(45deg, var(--primary), #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            Área Restrita
          </h1>
          <p style={{ opacity: 0.6, fontSize: '0.95rem' }}>
            Central de Contratos Médicos
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Digite a senha de acesso"
              autoFocus
              style={{
                textAlign: 'center',
                fontSize: '1.1rem',
                padding: '1rem',
                letterSpacing: '0.15em'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: 'var(--danger)',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
              animation: 'fadeIn 0.3s'
            }}>
              🔒 {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem'
            }}
          >
            {loading ? '🔄 Verificando...' : '🔓 Entrar'}
          </button>
        </form>

        <p style={{ marginTop: '2rem', fontSize: '0.8rem', opacity: 0.35 }}>
          Acesso exclusivo para administradores
        </p>
      </div>
    </main>
  );
}
