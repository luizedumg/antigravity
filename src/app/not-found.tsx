import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", background: "var(--background, #fafafa)", textAlign: "center" }}>
      <div style={{ maxWidth: "440px", width: "100%" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔎</div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--primary, #2563eb)" }}>
          Página não encontrada
        </h1>
        <p style={{ opacity: 0.75, lineHeight: 1.6, marginBottom: "2rem" }}>
          Este link não está disponível ou pode ter expirado. Se você recebeu este
          link do consultório, entre em contato conosco pelo WhatsApp que geramos um
          novo para você.
        </p>
        <a
          href="https://wa.me/5534997346139"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#25D366", color: "white", padding: "0.85rem 1.6rem", borderRadius: "50px", fontWeight: 600, textDecoration: "none" }}
        >
          💬 Falar com o consultório
        </a>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/" style={{ fontSize: "0.9rem", opacity: 0.6, color: "inherit" }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
