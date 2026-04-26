'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteButton({ contractId, deleteAction }: { contractId: string, deleteAction: (id: string, pin: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const pin = window.prompt("Para excluir este contrato, digite o PIN de segurança:");
    
    if (pin) {
      setLoading(true);
      try {
        await deleteAction(contractId, pin);
        router.refresh();
      } catch (e: any) {
        alert(e.message || "PIN incorreto. A exclusão foi cancelada.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-danger">
      {loading ? 'Excluindo...' : '✖ Cancelar / Excluir'}
    </button>
  );
}
