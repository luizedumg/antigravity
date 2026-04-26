import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = 'force-dynamic';

export default async function Home() {
  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      
      {/* LOGO */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <img 
          src="/logo.png" 
          alt="Logotipo L.E.M. Luiz Eduardo Mamede" 
          style={{ maxHeight: '110px', objectFit: 'contain' }} 
        />
      </div>

      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '900px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(45deg, var(--primary), #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Painel Administrativo
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.7, marginTop: '0.5rem' }}>
            Selecione o módulo que deseja acessar.
          </p>
        </div>

        {/* CARDS DE MÓDULOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', width: '100%' }}>
          
          {/* Card: Contratos */}
          <Link href="/admin/contratos" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel" style={{ 
              cursor: 'pointer', transition: 'all 0.3s ease', padding: '2.5rem 2rem', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem',
              minHeight: '280px', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '20px', 
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(37,99,235,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
              }}>
                📝
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contratos Cirúrgicos</h2>
                <p style={{ fontSize: '0.95rem', opacity: 0.6, lineHeight: 1.5 }}>
                  Gere, envie e gerencie contratos com assinatura digital e validade jurídica.
                </p>
              </div>
              <span className="btn-primary" style={{ width: '100%', display: 'inline-block', pointerEvents: 'none' }}>
                Acessar Contratos
              </span>
            </div>
          </Link>

          {/* Card: Orçamentos */}
          <Link href="/admin/orcamentos" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="glass-panel" style={{ 
              cursor: 'pointer', transition: 'all 0.3s ease', padding: '2.5rem 2rem', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem',
              minHeight: '280px', justifyContent: 'center',
              border: '1px solid rgba(56,189,248,0.2)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(56,189,248,0.04))',
            }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '20px', 
                background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
              }}>
                💰
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>Orçamentos Cirúrgicos</h2>
                <p style={{ fontSize: '0.95rem', opacity: 0.6, lineHeight: 1.5 }}>
                  Gere propostas premium com envio automático via WhatsApp e E-mail.
                </p>
              </div>
              <span className="btn-primary" style={{ width: '100%', display: 'inline-block', pointerEvents: 'none', background: 'linear-gradient(135deg, var(--primary), #38bdf8)' }}>
                Acessar Orçamentos
              </span>
            </div>
          </Link>

        </div>

        {/* LOGOUT */}
        <LogoutButton />
      </div>
    </main>
  );
}
