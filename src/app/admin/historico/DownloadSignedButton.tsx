'use client';

import { useState } from 'react';
import { checkZapsignDocumentStatus } from '@/actions/zapsign';

export default function DownloadSignedButton({ contractId, initialStatus }: { contractId: string, initialStatus: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    const res = await checkZapsignDocumentStatus(contractId);
    if (res && res.signedFileUrl) {
      window.open(res.signedFileUrl, '_blank');
      // Recarrega a página levemente para atualizar o badge de status para verde na frente
      window.location.reload();
    } else {
      alert('O documento ainda não foi totalmente assinado pelas partes.');
    }
    setLoading(false);
  };

  return (
    <button 
      onClick={handleCheck} 
      disabled={loading} 
      className="btn-primary" 
      style={{ 
        padding: '0.5rem 1rem', 
        background: initialStatus === 'ASSINADO' ? 'var(--success)' : 'var(--warning)',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}
    >
      {loading ? 'Buscando...' : (initialStatus === 'ASSINADO' ? 'Baixar PDF Oficial' : 'Verificar Assinaturas / Baixar')}
    </button>
  );
}
