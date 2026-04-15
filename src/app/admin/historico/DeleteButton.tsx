'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DeleteButton({ contractId, deleteAction }: { contractId: string, deleteAction: (id: string) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    const pin = window.prompt("Para excluir este contrato (e evitar perdas acidentais de dados de pacientes), digite a senha de segurança (0405):");
    
    if (pin === '0405') {
      setLoading(true);
      await deleteAction(contractId);
      router.refresh(); // atualiza a página servidor
    } else if (pin !== null) {
      alert("Senha incorreta. A exclusão foi cancelada.");
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading} className="btn-danger">
      {loading ? 'Excluindo...' : '✖ Cancelar / Excluir'}
    </button>
  );
}
