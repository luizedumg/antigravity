"use client";

import { useState } from "react";
import { Plus, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function WebhookTestCard({ webhookUrl }: { webhookUrl: string }) {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const handleTest = async () => {
    if (!webhookUrl) {
      setStatus("error");
      return;
    }

    setStatus("testing");
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPingTest: true, patientName: "Teste Conexão" }),
        // Adicionando um timeout se possível, ou apenas aguardando a resposta
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => setStatus("idle"), 3000); // volta ao normal depois de 3 seg
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <div 
      onClick={handleTest}
      className="metric-card" 
      style={{ 
        background: status === "success" ? '#10b981' : status === "error" ? '#ef4444' : 'var(--primary)', 
        color: 'white', 
        position: 'relative', 
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s'
      }}
      title="Clique para testar a conexão com o n8n"
    >
      <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.2 }}>
        {status === "testing" ? <Loader2 size={100} className="animate-spin" /> : 
         status === "success" ? <CheckCircle size={100} /> :
         status === "error" ? <XCircle size={100} /> :
         <Plus size={100} />}
      </div>
      <div className="metric-info" style={{ position: 'relative', zIndex: 1 }}>
        <span className="metric-value" style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>
          {status === "testing" ? "Testando..." : 
           status === "success" ? "Conectado!" :
           status === "error" ? "Falha na Conexão" :
           "Funil Integrado"}
        </span>
        <span className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {status === "testing" ? "Aguarde a resposta" : 
           status === "success" ? "N8N respondeu (200 OK)" :
           status === "error" ? "Verifique a URL no .env" :
           "Clique para testar Webhook"}
        </span>
      </div>
    </div>
  );
}
