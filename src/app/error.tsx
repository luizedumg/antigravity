"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--background, #fafafa)", textAlign: "center" }}>
      <div style={{ maxWidth: "440px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--danger, #ef4444)" }}>
          Algo deu errado
        </h1>
        <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: "2rem" }}>
          Tivemos um problema ao carregar esta página. Tente novamente em instantes —
          se persistir, fale com o consultório pelo WhatsApp.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{ background: "var(--primary, #2563eb)", color: "white", padding: "0.85rem 1.6rem", borderRadius: "50px", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Tentar novamente
          </button>
          <a
            href="https://wa.me/5534997346139"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(37,211,102,0.12)", color: "#059669", padding: "0.85rem 1.6rem", borderRadius: "50px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(37,211,102,0.35)" }}
          >
            💬 Falar com o consultório
          </a>
        </div>
      </div>
    </main>
  );
}
