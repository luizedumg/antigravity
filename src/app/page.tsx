import Link from "next/link";
import { getDashboardMetrics } from "@/actions/historico";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const metrics = await getDashboardMetrics();

  return (
    <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* LOGO AREA - Centralizada acima do painel principal */}
      <div style={{ marginTop: '5vh', marginBottom: '1rem', textAlign: 'center' }}>
         <img 
            src="/logo.png" 
            alt="Logotipo L.E.M. Luiz Eduardo Mamede" 
            style={{ maxHeight: '110px', objectFit: 'contain' }} 
         />
      </div>

      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '1000px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(45deg, var(--primary), #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Central de Contratos Médicos
          </h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
            Gerencie, gere e envie contratos para assinatura com validade jurídica de forma automatizada.
          </p>
        </div>

        {/* ══════ MÉTRICAS EM TEMPO REAL ══════ */}
        <div className="metrics-grid" style={{ width: '100%' }}>
          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>📄</div>
            <div className="metric-info">
              <span className="metric-value">{metrics.total}</span>
              <span className="metric-label">Total de Contratos</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>⏳</div>
            <div className="metric-info">
              <span className="metric-value">{metrics.pendentes}</span>
              <span className="metric-label">Pendentes</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>👁️</div>
            <div className="metric-info">
              <span className="metric-value">{metrics.visualizados}</span>
              <span className="metric-label">Aguardando Assinatura</span>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>✅</div>
            <div className="metric-info">
              <span className="metric-value">{metrics.assinados}</span>
              <span className="metric-label">Assinados</span>
            </div>
          </div>
        </div>

        {/* ══════ CARDS DE AÇÃO ══════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', width: '100%' }}>
          
          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s ease', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Novo Link / Paciente</h2>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>Gere um formulário Wizard para encaminhar ao WhatsApp do paciente e recolher os dados.</p>
            </div>
            <Link href="/admin/novo" className="btn-primary" style={{ width: '100%', display: 'inline-block' }}>
              Gerar Link
            </Link>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s ease', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Histórico</h2>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>Visualize contratos gerados, assinaturas pendentes e filtros por cirurgia.</p>
            </div>
            <Link href="/admin/historico" className="btn-primary" style={{ width: '100%', display: 'inline-block' }}>
              Ver Contratos
            </Link>
          </div>

          <div className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.3s ease', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>Modelos de Cirurgia</h2>
              <p style={{ marginBottom: '1.5rem', fontSize: '0.95rem', opacity: 0.8 }}>Configure as perguntas dinâmicas e o template .docx para cada tipo de cirurgia.</p>
            </div>
            <Link href="/admin/templates" className="btn-primary" style={{ width: '100%', display: 'inline-block' }}>
              Configurar Templates
            </Link>
          </div>

        </div>

        {/* ══════ RODAPÉ COM TEMPLATE COUNT ══════ */}
        <div style={{ opacity: 0.6, fontSize: '0.85rem', marginTop: '1rem' }}>
          {metrics.templates} modelo(s) de cirurgia cadastrado(s)
        </div>

        {/* ══════ LOGOUT ══════ */}
        <LogoutButton />
      </div>
    </main>
  );
}
