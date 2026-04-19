'use client';

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        marginTop: '0.5rem',
        background: 'none',
        border: 'none',
        color: 'var(--text)',
        opacity: 0.35,
        cursor: 'pointer',
        fontSize: '0.8rem',
        transition: 'opacity 0.2s'
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.7'; }}
      onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '0.35'; }}
    >
      🔒 Sair da conta
    </button>
  );
}
