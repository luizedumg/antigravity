"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, Check, X, AlertTriangle, Copy, ExternalLink, Mic, MicOff } from "lucide-react";
import { useRouter } from "next/navigation";

type PreviewData = {
  patientName: string;
  surgeryTemplate: { id: string; name: string; basePrice: number };
  matchedVariables: { id: string; name: string; category: string; price: number }[];
  discount: number;
  totalPrice: number;
  confidence: string;
  notes: string | null;
};

export default function SmartBudgetInput() {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<{ magicLink: string; totalPrice: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Speech Recognition setup
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = message;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim = transcript;
        }
      }
      setMessage(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        setError("Erro no microfone: " + event.error);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setError("");
  }, [isRecording, message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const handlePreview = async () => {
    if (!message.trim() || message.trim().length < 5) {
      setError("Descreva pelo menos o nome do paciente e o procedimento.");
      return;
    }

    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);

    try {
      const res = await fetch("/api/ai/smart-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", message: message.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Erro ao interpretar a mensagem.");
        return;
      }

      setPreview(data.preview);
    } catch (err: any) {
      setError("Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setConfirming(true);
    setError("");

    try {
      const res = await fetch("/api/ai/smart-budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", preview }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Erro ao gerar o orçamento.");
        return;
      }

      setResult({ magicLink: data.magicLink, totalPrice: data.totalPrice });
      setPreview(null);
      setMessage("");
      router.refresh();
    } catch (err: any) {
      setError("Falha na conexão com o servidor.");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError("");
    inputRef.current?.focus();
  };

  const handleCopyLink = () => {
    if (result) {
      navigator.clipboard.writeText(result.magicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePreview();
    }
  };

  const confidenceColor = (c: string) => {
    if (c === "high") return "#10b981";
    if (c === "medium") return "#f59e0b";
    return "#ef4444";
  };

  const confidenceLabel = (c: string) => {
    if (c === "high") return "Alta";
    if (c === "medium") return "Média";
    return "Baixa";
  };

  return (
    <div className="glass-panel" style={{ position: "relative", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Sparkles size={18} color="white" />
        </div>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: "var(--foreground)" }}>
            Orçamento Inteligente
          </h3>
          <p style={{ fontSize: "0.78rem", opacity: 0.5, margin: 0 }}>
            Descreva por texto ou áudio e a IA gera automaticamente
          </p>
        </div>
      </div>

      {/* Input Area */}
      {!preview && !result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ position: "relative" }}>
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => { setMessage(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder='Ex: "Orçamento Maria Silva, rinoplastia com costela, hospital santa marta, anestesia santa marta"'
              rows={2}
              style={{
                width: "100%", padding: "0.85rem 1rem", paddingRight: "3.5rem", borderRadius: "12px",
                border: `1px solid ${isRecording ? "#ef4444" : "var(--glass-border)"}`,
                background: "var(--background)",
                color: "var(--foreground)", fontSize: "0.92rem", resize: "none",
                fontFamily: "inherit", lineHeight: 1.5, outline: "none",
                transition: "border-color 0.3s", boxSizing: "border-box",
              }}
              onFocus={(e) => { if (!isRecording) e.target.style.borderColor = "#8b5cf6"; }}
              onBlur={(e) => { if (!isRecording) e.target.style.borderColor = "var(--glass-border)"; }}
              disabled={loading}
            />
            {/* Mic button inside textarea */}
            <button
              onClick={toggleRecording}
              disabled={loading}
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
              style={{
                position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                width: "36px", height: "36px", borderRadius: "50%", border: "none",
                background: isRecording ? "#ef4444" : "rgba(139,92,246,0.1)",
                color: isRecording ? "white" : "#8b5cf6",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
                animation: isRecording ? "pulse-mic 1.5s infinite" : "none",
              }}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Recording indicator + Send button */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {isRecording && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                fontSize: "0.82rem", color: "#ef4444", fontWeight: 500,
              }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444",
                  animation: "pulse-mic 1s infinite",
                }} />
                Ouvindo... fale o orçamento
              </div>
            )}
            <button
              onClick={handlePreview}
              disabled={loading || !message.trim()}
              style={{
                marginLeft: "auto",
                padding: "0.75rem 1.25rem", borderRadius: "12px", border: "none",
                background: loading ? "#64748b" : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                color: "white", cursor: (loading || !message.trim()) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "0.5rem",
                fontSize: "0.9rem", fontWeight: 600, transition: "all 0.2s",
                opacity: (loading || !message.trim()) ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
              {loading ? "Analisando..." : "Interpretar"}
            </button>
          </div>
        </div>
      )}

      {/* Mic animation styles */}
      <style>{`
        @keyframes pulse-mic {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
      `}</style>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "10px",
          background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)",
          color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Preview Card */}
      {preview && !result && (
        <div style={{
          marginTop: "0.5rem", padding: "1.5rem", borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(139,92,246,0.04), rgba(99,102,241,0.04))",
          border: "1px solid rgba(139,92,246,0.15)",
        }}>
          {/* Confidence badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Confirme o orçamento</h4>
            <span style={{
              fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "20px",
              background: `${confidenceColor(preview.confidence)}18`,
              color: confidenceColor(preview.confidence),
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              Confiança {confidenceLabel(preview.confidence)}
            </span>
          </div>

          {/* Patient */}
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, fontWeight: 600 }}>Paciente</span>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0.15rem 0 0" }}>{preview.patientName}</p>
          </div>

          {/* Surgery */}
          <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, fontWeight: 600 }}>Equipe Médica</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
              <p style={{ fontSize: "0.95rem", fontWeight: 500, margin: 0 }}>{preview.surgeryTemplate.name}</p>
              <span style={{ fontWeight: 600, fontSize: "0.95rem", whiteSpace: "nowrap" }}>R$ {preview.surgeryTemplate.basePrice.toLocaleString("pt-BR")}</span>
            </div>
          </div>

          {/* Variables */}
          {preview.matchedVariables.length > 0 && (
            <div style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.5, fontWeight: 600 }}>Adicionais Identificados</span>
              <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {preview.matchedVariables.map((v) => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>
                      <span style={{ fontSize: "0.7rem", opacity: 0.4, marginRight: "0.5rem" }}>{v.category}</span>
                      {v.name}
                    </span>
                    <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>R$ {v.price.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discount */}
          {preview.discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "#10b981", marginBottom: "0.75rem" }}>
              <span>Desconto</span>
              <span style={{ fontWeight: 600 }}>- R$ {preview.discount.toLocaleString("pt-BR")}</span>
            </div>
          )}

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1rem", fontWeight: 600 }}>Total Estimado</span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>
              R$ {preview.totalPrice.toLocaleString("pt-BR")}
            </span>
          </div>

          {/* Notes */}
          {preview.notes && (
            <p style={{ fontSize: "0.8rem", opacity: 0.6, fontStyle: "italic", margin: "0.5rem 0 1rem" }}>
              💡 {preview.notes}
            </p>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button
              onClick={handleCancel}
              style={{
                flex: 1, padding: "0.75rem", borderRadius: "10px",
                border: "1px solid var(--glass-border)", background: "transparent",
                color: "var(--foreground)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                fontSize: "0.9rem", fontWeight: 500, transition: "all 0.2s",
              }}
            >
              <X size={16} /> Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                flex: 2, padding: "0.75rem", borderRadius: "10px", border: "none",
                background: confirming ? "#64748b" : "linear-gradient(135deg, #10b981, #059669)",
                color: "white", cursor: confirming ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                fontSize: "0.95rem", fontWeight: 600, transition: "all 0.2s",
              }}
            >
              {confirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {confirming ? "Gerando..." : "Confirmar e Gerar Orçamento"}
            </button>
          </div>
        </div>
      )}

      {/* Success + Magic Link */}
      {result && (
        <div style={{
          marginTop: "0.5rem", padding: "1.5rem", borderRadius: "14px",
          background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)",
          textAlign: "center",
        }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%", margin: "0 auto 1rem",
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Check size={24} color="white" />
          </div>

          <h4 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Orçamento Gerado!</h4>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, margin: "0 0 1.25rem" }}>
            Total: R$ {result.totalPrice.toLocaleString("pt-BR")}
          </p>

          {/* Link box */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "var(--background)", padding: "0.6rem 0.75rem",
            borderRadius: "10px", border: "1px solid var(--glass-border)",
            marginBottom: "1rem",
          }}>
            <input
              type="text"
              readOnly
              value={result.magicLink}
              style={{
                flex: 1, border: "none", background: "transparent",
                color: "var(--foreground)", fontSize: "0.82rem",
                outline: "none", fontFamily: "monospace",
              }}
            />
            <button
              onClick={handleCopyLink}
              style={{
                padding: "0.4rem 0.75rem", borderRadius: "8px", border: "none",
                background: copied ? "#10b981" : "var(--primary)",
                color: "white", cursor: "pointer", fontSize: "0.78rem",
                fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => { setResult(null); inputRef.current?.focus(); }}
              style={{
                flex: 1, padding: "0.65rem", borderRadius: "10px",
                border: "1px solid var(--glass-border)", background: "transparent",
                color: "var(--foreground)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
              }}
            >
              Novo Orçamento
            </button>
            <a
              href={result.magicLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, padding: "0.65rem", borderRadius: "10px", border: "none",
                background: "var(--primary)", color: "white", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: 500, textDecoration: "none",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              }}
            >
              <ExternalLink size={14} /> Visualizar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
